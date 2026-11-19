/**
 * Sigma REST API calls for the Export Manager use case (server-side only):
 * one-off workbook exports and scheduled exports.
 *
 * Modelled on the working implementation in TJ's plugs-dashboard-prod
 * (server.js: /api/workbooks/:id/export and /api/bookmarks/:id/schedule).
 * Findings that shaped this file are recorded on beads issue
 * embed_examplesite-7mg.
 *
 * Every call here uses the SERVICE token from lib/sigma-api.js, never an
 * impersonated one. Who the export runs as is passed in the request body
 * (`exportAs: <memberId>`), so Sigma applies THAT member's permissions and
 * row-level security. Schedules, by contrast, are owned by the API credential
 * in Sigma, so per-user ownership and recipients are tracked on our side
 * (lib/export-schedules.js), not read back from Sigma.
 */

import { apiGetAll, getApiBase, getApiToken, resolveMemberByEmail } from '@/lib/sigma-api';

async function sigmaFetch(method, path, body) {
  const token = await getApiToken();
  return fetch(`${getApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

// Like sigmaFetch, but parses JSON and throws Sigma's own error text.
async function sigmaJson(method, path, body) {
  const res = await sigmaFetch(method, path, body);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Sigma API ${method} ${path} failed (${res.status}): ${data.message || data.code || 'unknown error'}` +
        (data.requestId ? ` [requestId: ${data.requestId}]` : '')
    );
  }
  return data;
}

/**
 * Confirms the signed-in user can actually reach this workbook before the
 * service token acts on it. The service token can touch ANY workbook, so
 * without this check a client could schedule or export someone else's.
 *
 * @returns {Promise<{ memberId: string, workbook: object }>}
 */
export async function assertWorkbookAccess(email, workbookId) {
  const member = await resolveMemberByEmail(email);
  if (!member) {
    const err = new Error('Your Sigma user was not found. Open an embedded workbook once so it is provisioned, then try again.');
    err.status = 404;
    throw err;
  }
  const files = await apiGetAll(`/members/${member.memberId}/files`);
  const workbook = files.find((f) => f.type === 'workbook' && !f.isArchived && f.id === workbookId);
  if (!workbook) {
    const err = new Error('You do not have access to that workbook.');
    err.status = 403;
    throw err;
  }
  return { memberId: member.memberId, workbook };
}

// ── One-off export ──────────────────────────────────────────────────────────

export const EXPORT_FORMATS = ['pdf', 'png', 'csv', 'xlsx'];

function exportFormatObject(format) {
  switch (format) {
    case 'png': return { type: 'png', pixelWidth: 1920, pixelHeight: 1080 };
    case 'csv': return { type: 'csv' };
    case 'xlsx': return { type: 'xlsx' };
    default: return { type: 'pdf', layout: 'landscape' };
  }
}

/** Starts an export of the whole workbook as `memberId`. Returns the queryId. */
export async function startWorkbookExport({ workbookId, memberId, format, bookmarkId }) {
  const data = await sigmaJson('POST', `/workbooks/${encodeURIComponent(workbookId)}/export`, {
    format: exportFormatObject(format),
    exportAs: memberId,
    ...(bookmarkId ? { bookmarkId } : {}),
  });
  if (!data.queryId) throw new Error('Sigma started the export but returned no queryId.');
  return data.queryId;
}

/**
 * Tries to download an export. The same endpoint is both the status check and
 * the download: until the file is ready it returns an empty body / not-ready
 * error, so callers poll this.
 *
 * @returns {Promise<{ state: 'ready', buffer: Buffer, contentType: string, filename: string }
 *   | { state: 'processing' } | { state: 'error', message: string }>}
 */
export async function fetchExportFile(queryId) {
  const res = await sigmaFetch('GET', `/query/${encodeURIComponent(queryId)}/download`);
  const buffer = Buffer.from(await res.arrayBuffer());

  if (res.status === 200 && buffer.length > 0) {
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i);
    let filename = match ? decodeURIComponent(match[1]) : `export_${queryId}`;
    if (!filename.includes('.')) {
      if (contentType.includes('pdf')) filename += '.pdf';
      else if (contentType.includes('png')) filename += '.png';
      else if (contentType.includes('csv')) filename += '.csv';
      else if (contentType.includes('sheet') || contentType.includes('excel')) filename += '.xlsx';
    }
    return { state: 'ready', buffer, contentType, filename };
  }

  if ([200, 202, 204, 404].includes(res.status)) return { state: 'processing' };

  let message = `Export failed (status ${res.status}).`;
  try { message = JSON.parse(buffer.toString('utf8')).message || message; } catch { /* keep default */ }
  if (/processing|not ready|pending/i.test(message)) return { state: 'processing' };
  return { state: 'error', message };
}

// ── Scheduled export ────────────────────────────────────────────────────────

/**
 * Creates a scheduled export on the workbook. `cron` is a 5-field cron string
 * evaluated in `timezone`. Returns Sigma's scheduledNotificationId.
 *
 * NOTE: this makes Sigma send real email to `recipients` on the schedule.
 */
export async function createWorkbookSchedule({
  workbookId, name, cron, timezone, format, recipients, bookmarkId,
}) {
  const data = await sigmaJson('POST', `/workbooks/${encodeURIComponent(workbookId)}/schedules`, {
    name,
    type: 'export',
    schedule: { cronSpec: cron, timezone },
    target: recipients.map((email) => ({ email })),
    configV2: {
      includeLink: false,
      runAsRecipient: false,
      exportAttachments: [{
        formatOptions: {
          type: format.toUpperCase(),
          ...(format === 'pdf' ? { layout: 'portrait' } : { rowLimit: 10000 }),
        },
        workbookExportSource: { type: 'all' },
      }],
      conditionOptions: { type: 'always' },
      ...(bookmarkId ? { workbookVariant: { bookmarkId } } : {}),
      title: `Scheduled export: ${name}`,
      messageBody: `Your scheduled export "${name}" is attached.`,
      workbookId,
    },
  });
  const id = data.scheduledNotificationId || data.scheduleId || data.id;
  if (!id) throw new Error('Sigma created the schedule but returned no id.');
  return id;
}

/**
 * Updates a schedule. Any of: `paused` (boolean), `cron` + `timezone`,
 * `recipients`. Pause/resume is `suspensionAction` in Sigma's PATCH body.
 */
export async function updateWorkbookSchedule(workbookId, scheduleId, { paused, cron, timezone, recipients }) {
  const patch = {};
  if (paused !== undefined) patch.suspensionAction = paused ? 'pause' : 'resume';
  if (cron) patch.schedule = { cronSpec: cron, timezone };
  if (recipients) patch.target = recipients.map((email) => ({ email }));
  return sigmaJson('PATCH', `/workbooks/${encodeURIComponent(workbookId)}/schedules/${encodeURIComponent(scheduleId)}`, patch);
}

/**
 * Live state of a workbook's schedules from Sigma (v2.1 list, paginated).
 * Sigma does NOT return last-run status or recipients here — only these
 * fields — so this is a status check, not a run history.
 *
 * @returns {Promise<Map<string, { status: 'active'|'paused'|'suspended', disabledAt: string|null, schedulerActivityAt: string|null }>>}
 */
export async function getWorkbookScheduleStates(workbookId) {
  const states = new Map();
  let page = '';
  for (let i = 0; i < 5; i += 1) {
    const path = `/workbooks/${encodeURIComponent(workbookId)}/schedules?limit=100${page ? `&page=${encodeURIComponent(page)}` : ''}`;
    const token = await getApiToken();
    const res = await fetch(`${getApiBase().replace(/\/v2$/, '/v2.1')}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Sigma API GET schedules failed (${res.status}): ${data.message || data.code || 'unknown error'}`);
    for (const e of data.entries ?? []) {
      states.set(e.scheduledNotificationId, {
        // isSuspended = Sigma auto-paused it after repeated failures; disabledAt = paused by a user.
        status: e.isSuspended ? 'suspended' : e.disabledAt ? 'paused' : 'active',
        disabledAt: e.disabledAt ?? null,
        // Sigma's scheduler stamps updatedAt each time it acts on a schedule (observed to line up
        // with the cron time). Only meaningful when the scheduler itself made the last update.
        schedulerActivityAt: e.updatedBy === 'SigmaSchedulerRobot' ? e.updatedAt ?? null : null,
      });
    }
    if (!data.nextPage) break;
    page = String(data.nextPage);
  }
  return states;
}

export async function deleteWorkbookSchedule(workbookId, scheduleId) {
  const res = await sigmaFetch('DELETE', `/workbooks/${encodeURIComponent(workbookId)}/schedules/${encodeURIComponent(scheduleId)}`);
  // 404 = already gone in Sigma (e.g. deleted in the Sigma UI): treat as deleted.
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Sigma API DELETE schedule failed (${res.status}): ${data.message || data.code || 'unknown error'}`);
  }
}
