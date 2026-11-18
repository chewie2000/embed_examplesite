import { currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildTiming, getSchedule, setScheduleEntry, validateRecipients } from '@/lib/export-schedules';
import { deleteWorkbookSchedule, updateWorkbookSchedule } from '@/lib/sigma-exports';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = { 'Cache-Control': 'no-store' };

// The only way to reach a schedule is through the signed-in user's own record,
// so a schedule id belonging to anyone else simply is not found.
async function loadOwned(params) {
  const user = await currentUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { id } = await params;
  const schedule = getSchedule(user, id);
  if (!schedule) return { response: NextResponse.json({ error: 'Schedule not found.' }, { status: 404 }) };
  return { user, schedule };
}

/**
 * PATCH /api/sigma/export-schedules/:id
 * Any of: { paused: boolean } | { recipients } | { frequency, time, weekday?, monthDay?, timezone }
 */
export async function PATCH(request, { params }) {
  const owned = await loadOwned(params);
  if (owned.response) return owned.response;
  const { user, schedule } = owned;
  const email = user.publicMetadata?.sigmaEmail || user.emailAddresses[0]?.emailAddress;
  const body = await request.json().catch(() => ({}));

  try {
    const sigmaPatch = {};
    const next = {};

    if (body.paused !== undefined) {
      sigmaPatch.paused = Boolean(body.paused);
      next.paused = Boolean(body.paused);
    }
    if (body.recipients !== undefined) {
      next.recipients = validateRecipients(body.recipients, email);
      sigmaPatch.recipients = next.recipients;
    }
    if (body.frequency !== undefined) {
      const timing = buildTiming(body);
      Object.assign(next, {
        frequency: timing.frequency, time: timing.time, weekday: timing.weekday,
        monthDay: timing.monthDay, timezone: timing.timezone, cron: timing.cron,
      });
      sigmaPatch.cron = timing.cron;
      sigmaPatch.timezone = timing.timezone;
    }
    if (Object.keys(sigmaPatch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    await updateWorkbookSchedule(schedule.workbookId, schedule.id, sigmaPatch);
    const updated = { ...schedule, ...next };
    await setScheduleEntry(user.id, schedule.id, updated);
    return NextResponse.json({ schedule: updated }, { headers: NO_STORE });
  } catch (error) {
    console.error('[/api/sigma/export-schedules/:id] PATCH', error.message);
    return NextResponse.json({ error: error.message }, { status: error.status || 502 });
  }
}

/** DELETE /api/sigma/export-schedules/:id — removes it in Sigma, then from our record. */
export async function DELETE(_request, { params }) {
  const owned = await loadOwned(params);
  if (owned.response) return owned.response;
  const { user, schedule } = owned;

  try {
    await deleteWorkbookSchedule(schedule.workbookId, schedule.id);
    await setScheduleEntry(user.id, schedule.id, null);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (error) {
    console.error('[/api/sigma/export-schedules/:id] DELETE', error.message);
    return NextResponse.json({ error: error.message }, { status: error.status || 502 });
  }
}
