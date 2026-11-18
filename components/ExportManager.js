'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SCHEDULE_FORMATS = [['pdf', 'PDF'], ['csv', 'CSV'], ['xlsx', 'Excel']];
const EXPORT_FORMATS = [['pdf', 'PDF'], ['png', 'PNG'], ['csv', 'CSV'], ['xlsx', 'Excel']];

const browserTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
};

function flattenWorkbooks(nodes, out = []) {
  for (const node of nodes ?? []) {
    if (node.type === 'workbook') out.push({ id: node.id, urlId: node.urlId, name: node.name });
    if (Array.isArray(node.children)) flattenWorkbooks(node.children, out);
  }
  return out;
}

function describeTiming(s) {
  const at = `${s.time} ${s.timezone}`;
  if (s.frequency === 'weekly') return `Weekly on ${WEEKDAYS[s.weekday] ?? '?'} at ${at}`;
  if (s.frequency === 'monthly') return `Monthly on day ${s.monthDay} at ${at}`;
  return `Daily at ${at}`;
}

async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/**
 * Export Manager — create and manage exports of Sigma workbooks.
 *
 *  - "Schedule exports": create / pause / resume / delete scheduled email
 *    exports. Sigma owns the schedules; this app keeps the per-user record
 *    (who owns it, who receives it) because Sigma's list endpoint omits it.
 *  - "Export now": one-off export downloaded straight to the browser.
 *
 * Everything runs through server routes (app/api/sigma/export*), which act
 * with the service token and identify the user from their Clerk session.
 */
export default function ExportManager() {
  const [tab, setTab] = useState('schedule');
  const [workbooks, setWorkbooks] = useState({ loading: true, error: null, list: [] });
  const [workbookId, setWorkbookId] = useState('');
  const [schedules, setSchedules] = useState({ loading: true, error: null, list: [] });

  useEffect(() => {
    let cancelled = false;
    api('/api/sigma/tree')
      .then((data) => {
        if (cancelled) return;
        const list = flattenWorkbooks(data.tree).sort((a, b) => a.name.localeCompare(b.name));
        setWorkbooks({ loading: false, error: null, list });
        setWorkbookId((cur) => cur || list[0]?.id || '');
      })
      .catch((e) => { if (!cancelled) setWorkbooks({ loading: false, error: e.message, list: [] }); });
    return () => { cancelled = true; };
  }, []);

  const loadSchedules = useCallback(() => {
    api('/api/sigma/export-schedules')
      .then((data) => setSchedules({ loading: false, error: null, list: data.schedules ?? [] }))
      .catch((e) => setSchedules({ loading: false, error: e.message, list: [] }));
  }, []);
  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const workbook = useMemo(() => workbooks.list.find((w) => w.id === workbookId) ?? null, [workbooks.list, workbookId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-black/[0.06] shadow-card bg-white p-4 flex flex-wrap items-center gap-3">
        <label htmlFor="em-workbook" className="text-xs text-ink-secondary">Workbook</label>
        {workbooks.loading ? <span className="text-sm text-ink-secondary">Finding the workbooks you can access…</span>
          : workbooks.error ? <span className="text-sm text-red-700">{workbooks.error}</span>
          : workbooks.list.length === 0 ? <span className="text-sm text-ink-secondary">No workbooks found for your user. Open an embedded workbook once so your user is provisioned, then ask for access to one.</span>
          : (
            <select
              id="em-workbook"
              value={workbookId}
              onChange={(e) => setWorkbookId(e.target.value)}
              className="text-sm rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 max-w-full"
            >
              {workbooks.list.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
      </div>

      <div role="tablist" className="flex items-center gap-1 border-b border-black/[0.06]">
        <Tab active={tab === 'schedule'} onClick={() => setTab('schedule')}>Schedule exports</Tab>
        <Tab active={tab === 'now'} onClick={() => setTab('now')}>Export now</Tab>
      </div>

      {tab === 'schedule' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CreateSchedule workbook={workbook} count={schedules.list.length} onCreated={loadSchedules} />
          <ManageSchedules state={schedules} onChanged={loadSchedules} />
        </div>
      ) : (
        <ExportNow workbook={workbook} />
      )}
    </div>
  );
}

// ── Create ──────────────────────────────────────────────────────────────────

function CreateSchedule({ workbook, count, onCreated }) {
  const [form, setForm] = useState({
    name: '', format: 'pdf', recipients: '', frequency: 'daily', time: '09:00',
    weekday: 1, monthDay: 1, timezone: 'UTC', useBookmark: false,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { tone: 'ok'|'error', text }
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => { set({ timezone: browserTimezone() }); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!workbook) return;
    setBusy(true);
    setMessage(null);
    try {
      await api('/api/sigma/export-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workbookId: workbook.id, workbookName: workbook.name }),
      });
      setMessage({ tone: 'ok', text: 'Schedule created.' });
      set({ name: '', recipients: '' });
      onCreated();
    } catch (error) {
      setMessage({ tone: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-black/[0.06] shadow-card bg-white p-4 flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-primary">New scheduled export</h2>
      <p className="text-xs text-ink-secondary leading-relaxed">
        Sigma emails the whole workbook to the recipients on this schedule. Recipients are limited to your own email domain unless the site is configured otherwise.
      </p>

      <Field label="Name">
        <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} placeholder="Weekly sales summary" className={INPUT} required />
      </Field>

      <Field label="Format">
        <Segmented value={form.format} options={SCHEDULE_FORMATS} onChange={(format) => set({ format })} />
      </Field>

      <Field label="Frequency">
        <Segmented value={form.frequency} options={[['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]} onChange={(frequency) => set({ frequency })} />
      </Field>

      <div className="flex flex-wrap gap-3">
        {form.frequency === 'weekly' && (
          <Field label="Day">
            <select value={form.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })} className={INPUT}>
              {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </Field>
        )}
        {form.frequency === 'monthly' && (
          <Field label="Day of month">
            <select value={form.monthDay} onChange={(e) => set({ monthDay: Number(e.target.value) })} className={INPUT}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        )}
        <Field label={`Time (${form.timezone})`}>
          <input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} className={INPUT} required />
        </Field>
      </div>

      <Field label="Recipients (comma separated, max 5)">
        <input value={form.recipients} onChange={(e) => set({ recipients: e.target.value })} placeholder="you@company.com, teammate@company.com" className={INPUT} required />
      </Field>

      <label className="flex items-center gap-2 text-xs text-ink-secondary">
        <input type="checkbox" checked={form.useBookmark} onChange={(e) => set({ useBookmark: e.target.checked })} />
        Use my saved bookmark for this workbook (if I have one)
      </label>

      {message && <p className={'text-xs ' + (message.tone === 'error' ? 'text-red-700' : 'text-mint-ink')}>{message.text}</p>}

      <button
        type="submit"
        disabled={busy || !workbook}
        className="self-start text-sm rounded-lg bg-ink-primary text-white px-4 py-2 disabled:opacity-40"
      >
        {busy ? 'Creating…' : 'Create schedule'}
      </button>
      <p className="text-[11px] text-ink-secondary">{count} of 10 schedules used.</p>
    </form>
  );
}

// ── Manage ──────────────────────────────────────────────────────────────────

function ManageSchedules({ state, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  async function act(id, run) {
    setBusyId(id);
    setError(null);
    try { await run(); onChanged(); } catch (e) { setError(e.message); } finally { setBusyId(null); }
  }

  const togglePause = (s) => act(s.id, () => api(`/api/sigma/export-schedules/${s.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paused: !s.paused }),
  }));
  const remove = (s) => act(s.id, () => api(`/api/sigma/export-schedules/${s.id}`, { method: 'DELETE' }));

  return (
    <div className="rounded-xl border border-black/[0.06] shadow-card bg-white p-4 flex flex-col gap-3">
      <h2 className="text-sm font-medium text-ink-primary">Your scheduled exports</h2>
      {state.loading && <p className="text-sm text-ink-secondary">Loading…</p>}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
      {!state.loading && !state.error && state.list.length === 0 && (
        <p className="text-sm text-ink-secondary">No scheduled exports yet.</p>
      )}
      <ul className="flex flex-col gap-2">
        {state.list.map((s) => (
          <li key={s.id} className="rounded-lg border border-black/[0.06] p-3 flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-primary truncate">{s.name}</p>
                <p className="text-xs text-ink-secondary truncate">{s.workbookName} · {s.format.toUpperCase()}</p>
              </div>
              <span className={'shrink-0 text-[11px] rounded-full border px-2 py-0.5 ' + (s.paused ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-mint-border/40 bg-mint-400/10 text-mint-ink')}>
                {s.paused ? 'Paused' : 'Active'}
              </span>
            </div>
            <p className="text-xs text-ink-secondary">{describeTiming(s)}</p>
            <p className="text-xs text-ink-secondary break-words">To: {s.recipients.join(', ')}</p>
            <div className="flex gap-2 pt-1">
              <button type="button" disabled={busyId === s.id} onClick={() => togglePause(s)} className={SMALL_BTN}>
                {s.paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" disabled={busyId === s.id} onClick={() => remove(s)} className={SMALL_BTN + ' text-red-700'}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Export now ──────────────────────────────────────────────────────────────

function ExportNow({ workbook }) {
  const [format, setFormat] = useState('pdf');
  const [useBookmark, setUseBookmark] = useState(false);
  const [status, setStatus] = useState({ tone: null, text: '' });
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!workbook) return;
    setBusy(true);
    setStatus({ tone: 'info', text: 'Starting export…' });
    try {
      const { queryId } = await api('/api/sigma/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workbookId: workbook.id, format, useBookmark }),
      });

      // Poll until the file is ready (about 2 minutes at most).
      for (let attempt = 0; attempt < 60; attempt++) {
        setStatus({ tone: 'info', text: 'Sigma is generating your file…' });
        const res = await fetch(`/api/sigma/export/${queryId}`);
        if (res.status === 202) { await new Promise((r) => setTimeout(r, 2000)); continue; }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Export failed (${res.status})`);
        }
        const blob = await res.blob();
        const disposition = res.headers.get('content-disposition') || '';
        const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || `export.${format}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setStatus({ tone: 'ok', text: `Downloaded ${filename}.` });
        return;
      }
      throw new Error('The export took too long. Try again.');
    } catch (error) {
      setStatus({ tone: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/[0.06] shadow-card bg-white p-4 flex flex-col gap-3 max-w-xl">
      <h2 className="text-sm font-medium text-ink-primary">Export now</h2>
      <p className="text-xs text-ink-secondary leading-relaxed">
        Runs the export as you, so the file reflects your own access and row-level security, then downloads it here.
      </p>
      <Field label="Format">
        <Segmented value={format} options={EXPORT_FORMATS} onChange={setFormat} />
      </Field>
      <label className="flex items-center gap-2 text-xs text-ink-secondary">
        <input type="checkbox" checked={useBookmark} onChange={(e) => setUseBookmark(e.target.checked)} />
        Use my saved bookmark for this workbook (if I have one)
      </label>
      {status.text && (
        <p className={'text-xs ' + (status.tone === 'error' ? 'text-red-700' : status.tone === 'ok' ? 'text-mint-ink' : 'text-ink-secondary')}>{status.text}</p>
      )}
      <button type="button" onClick={run} disabled={busy || !workbook} className="self-start text-sm rounded-lg bg-ink-primary text-white px-4 py-2 disabled:opacity-40">
        {busy ? 'Working…' : 'Export'}
      </button>
    </div>
  );
}

// ── Small pieces ────────────────────────────────────────────────────────────

const INPUT = 'text-sm rounded-lg border border-black/[0.1] bg-white px-3 py-1.5 w-full';
const SMALL_BTN = 'text-xs rounded-lg border border-black/[0.1] px-2.5 py-1 hover:border-black/[0.25] disabled:opacity-40';

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs text-ink-secondary">{label}</span>
      {children}
    </div>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-black/[0.1] overflow-hidden self-start">
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={'px-3 py-1.5 text-sm ' + (value === val ? 'bg-ink-primary text-white' : 'bg-white text-ink-secondary hover:text-ink-primary')}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={'px-3 py-2 text-sm -mb-px border-b-2 ' + (active ? 'border-ink-primary text-ink-primary font-medium' : 'border-transparent text-ink-secondary hover:text-ink-primary')}
    >
      {children}
    </button>
  );
}
