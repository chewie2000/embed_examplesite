import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getBookmarkEntry } from '@/lib/bookmarks';
import {
  MAX_SCHEDULES_PER_USER, SCHEDULE_FORMATS,
  buildTiming, getSchedulesMap, listSchedules, setScheduleEntry,
  validateFormat, validateName, validateRecipients,
} from '@/lib/export-schedules';
import { assertWorkbookAccess, createWorkbookSchedule, deleteWorkbookSchedule } from '@/lib/sigma-exports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store' };

/**
 * GET /api/sigma/export-schedules
 * The signed-in user's own scheduled exports, from OUR record (Sigma's list
 * does not return recipients). Identity is never taken from the client.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ schedules: listSchedules(user) }, { headers: NO_STORE });
}

/**
 * POST /api/sigma/export-schedules
 * { workbookId, workbookUrlId?, workbookName, name, format, recipients,
 *   frequency, time, weekday?, monthDay?, timezone, useBookmark? }
 *
 * Creates the schedule in Sigma with the service token, then records it under
 * the signed-in user. NOTE: Sigma will email the recipients on this schedule.
 */
export async function POST(request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const email = user.publicMetadata?.sigmaEmail || user.emailAddresses[0]?.emailAddress;

  const body = await request.json().catch(() => ({}));

  try {
    if (Object.keys(getSchedulesMap(user)).length >= MAX_SCHEDULES_PER_USER) {
      return NextResponse.json({ error: `You can have at most ${MAX_SCHEDULES_PER_USER} scheduled exports. Delete one first.` }, { status: 400 });
    }
    const name = validateName(body.name);
    const format = validateFormat(body.format, SCHEDULE_FORMATS);
    const recipients = validateRecipients(body.recipients, email);
    const timing = buildTiming(body);
    if (!body.workbookId) return NextResponse.json({ error: 'Pick a workbook.' }, { status: 400 });

    const { workbook } = await assertWorkbookAccess(email, body.workbookId);

    // Optional: capture the user's saved bookmark (their saved filter state).
    const bookmark = body.useBookmark && workbook.urlId ? getBookmarkEntry(user, workbook.urlId) : null;

    const scheduleId = await createWorkbookSchedule({
      workbookId: workbook.id, name, format, recipients,
      cron: timing.cron, timezone: timing.timezone, bookmarkId: bookmark?.id,
    });

    const entry = {
      id: scheduleId,
      workbookId: workbook.id,
      workbookName: workbook.name,
      name, format, recipients,
      frequency: timing.frequency, time: timing.time, weekday: timing.weekday, monthDay: timing.monthDay,
      timezone: timing.timezone, cron: timing.cron,
      bookmarkId: bookmark?.id ?? null,
      paused: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await setScheduleEntry(user.id, scheduleId, entry);
    } catch (storeError) {
      // Don't leave a live schedule we can't show or manage.
      await deleteWorkbookSchedule(workbook.id, scheduleId).catch(() => {});
      throw storeError;
    }

    return NextResponse.json({ schedule: entry }, { status: 201, headers: NO_STORE });
  } catch (error) {
    console.error('[/api/sigma/export-schedules] POST', error.message);
    return NextResponse.json({ error: error.message }, { status: error.status || 502 });
  }
}
