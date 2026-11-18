import { clerkClient } from '@clerk/nextjs/server';

/**
 * Per-user record of the scheduled exports created through the Export
 * Manager, persisted in Clerk privateMetadata.exportSchedules:
 *   { [scheduleId]: entry }
 *
 * Why we keep our own record: in Sigma every schedule created with the
 * service token is owned by the API credential, and the list endpoint does
 * not return recipients (Sigma ticket SIG-71058). So this is the source of
 * truth for "whose schedule is this" and "who gets it". Because it lives in
 * the signed-in user's own metadata, one user can never see or touch
 * another's schedules.
 *
 * Same storage trick as lib/bookmarks.js (and the same caveat): Clerk
 * deep-merges metadata updates, so each write sends a single-key delta, and
 * `null` removes a key. Clerk caps a user's metadata at ~8KB total, shared
 * with bookmarks — hence MAX_SCHEDULES_PER_USER.
 */

export const MAX_SCHEDULES_PER_USER = 10;
export const MAX_RECIPIENTS = 5;
export const SCHEDULE_FORMATS = ['pdf', 'csv', 'xlsx'];
export const FREQUENCIES = ['daily', 'weekly', 'monthly'];

export function getSchedulesMap(user) {
  return user?.privateMetadata?.exportSchedules ?? {};
}

export function listSchedules(user) {
  return Object.values(getSchedulesMap(user)).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function getSchedule(user, id) {
  return getSchedulesMap(user)[id] ?? null;
}

/** Upserts (entry given) or removes (entry null) one schedule. */
export async function setScheduleEntry(userId, id, entry) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: { exportSchedules: { [id]: entry ?? null } },
  });
}

// ── Validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domains recipients may be on. Defaults to the signed-in user's own domain. */
function allowedDomains(userEmail) {
  const configured = (process.env.EXPORT_ALLOWED_RECIPIENT_DOMAINS || '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length) return configured;
  const own = (userEmail || '').split('@')[1];
  return own ? [own.toLowerCase()] : [];
}

/**
 * Turns the recipients input (array or comma/space separated string) into a
 * clean, deduplicated list, or throws a user-facing error.
 */
export function validateRecipients(input, userEmail) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(/[\s,;]+/);
  const list = [...new Set(raw.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  if (list.length === 0) throw userError('Add at least one recipient email.');
  if (list.length > MAX_RECIPIENTS) throw userError(`At most ${MAX_RECIPIENTS} recipients per schedule.`);
  const domains = allowedDomains(userEmail);
  for (const email of list) {
    if (!EMAIL_RE.test(email)) throw userError(`"${email}" is not a valid email address.`);
    if (!domains.includes(email.split('@')[1])) {
      throw userError(`"${email}" is not on an allowed domain (${domains.join(', ') || 'none configured'}).`);
    }
  }
  return list;
}

function userError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

/**
 * Validates the timing fields and builds the 5-field cron string Sigma wants.
 * Monthly is limited to days 1-28 so every month has that day.
 *
 * @returns {{ cron: string, timezone: string, frequency: string, time: string, weekday: number|null, monthDay: number|null }}
 */
export function buildTiming({ frequency, time, weekday, monthDay, timezone }) {
  if (!FREQUENCIES.includes(frequency)) throw userError('Choose daily, weekly or monthly.');
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time ?? ''));
  if (!m) throw userError('Time must be HH:MM (24-hour).');
  const [hh, mm] = [Number(m[1]), Number(m[2])];

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw userError('Unknown timezone.');
  }

  let cron;
  let wd = null;
  let md = null;
  if (frequency === 'daily') {
    cron = `${mm} ${hh} * * *`;
  } else if (frequency === 'weekly') {
    wd = Number(weekday);
    if (!Number.isInteger(wd) || wd < 0 || wd > 6) throw userError('Choose a day of the week.');
    cron = `${mm} ${hh} * * ${wd}`;
  } else {
    md = Number(monthDay);
    if (!Number.isInteger(md) || md < 1 || md > 28) throw userError('Day of month must be 1-28.');
    cron = `${mm} ${hh} ${md} * *`;
  }
  return { cron, timezone, frequency, time: `${m[1]}:${m[2]}`, weekday: wd, monthDay: md };
}

export function validateName(name) {
  const n = String(name ?? '').trim();
  if (!n) throw userError('Give the schedule a name.');
  if (n.length > 80) throw userError('Schedule name is too long (80 characters max).');
  return n;
}

export function validateFormat(format, allowed) {
  const f = String(format ?? '').toLowerCase();
  if (!allowed.includes(f)) throw userError(`Format must be one of: ${allowed.join(', ')}.`);
  return f;
}
