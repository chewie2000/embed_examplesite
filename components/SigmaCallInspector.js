'use client';

import { useState } from 'react';

const METHOD_TONE = {
  GET: 'bg-brand-50 text-brand-600 border-brand-500/25',
  POST: 'bg-amber-50 text-amber-700 border-amber-300',
  SSE: 'bg-mint-400/10 text-mint-ink border-mint-border/40',
};

const STEP_NAMES = { 1: 'Authenticate', 2: 'Discover agents', 3: 'Run the agent', 4: 'Read the stream' };

const statusTone = (status) => (!status ? 'text-ink-secondary' : status < 300 ? 'text-mint-ink' : 'text-red-600');

/**
 * The Sigma REST calls the server actually made for this page, newest last.
 * Entries are recorded server-side (lib/sigma-trace.js) with secrets masked.
 */
export default function SigmaCallInspector({ calls, highlightStep, onClear }) {
  const [open, setOpen] = useState(() => new Set());
  const toggle = (seq) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(seq)) next.delete(seq); else next.add(seq);
    return next;
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-black/[0.06]">
        <div>
          <p className="text-sm font-medium text-ink-primary">Sigma calls</p>
          <p className="text-[11px] text-ink-secondary">What the server just sent to Sigma. Secrets are masked.</p>
        </div>
        <button type="button" onClick={onClear} disabled={!calls.length} className="text-xs rounded-lg border border-black/[0.1] px-2.5 py-1 disabled:opacity-40">Clear</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1.5">
        {calls.length === 0 && (
          <p className="px-2 py-3 text-xs text-ink-secondary leading-relaxed">No calls yet. Send a question and each request to Sigma appears here.</p>
        )}
        {calls.map((c) => {
          const isOpen = open.has(c.seq);
          return (
            <div key={c.seq} className={'rounded-lg border ' + (highlightStep && c.step === highlightStep ? 'border-brand-500/50 bg-brand-50/40' : 'border-black/[0.06]')}>
              <button type="button" onClick={() => toggle(c.seq)} className="w-full text-left px-2.5 py-2">
                <span className="flex items-center gap-2">
                  <span className="text-[10px] text-ink-secondary tabular-nums">{c.seq}</span>
                  <span className={'text-[10px] font-semibold border rounded px-1.5 py-0.5 ' + (METHOD_TONE[c.method] ?? 'bg-black/[0.04] text-ink-secondary border-black/[0.08]')}>{c.method}</span>
                  {c.status != null && <span className={'text-[11px] font-medium tabular-nums ' + statusTone(c.status)}>{c.status}</span>}
                  {c.ms != null && <span className="text-[11px] text-ink-secondary tabular-nums">{c.ms} ms</span>}
                  {c.step && <span className="ml-auto text-[10px] text-ink-secondary">Step {c.step} · {STEP_NAMES[c.step]}</span>}
                </span>
                <span className="block mt-1 text-xs font-medium text-ink-primary">{c.label}</span>
                <span className="block text-[11px] text-ink-secondary font-mono break-all">{c.path}</span>
              </button>
              {isOpen && (
                <div className="px-2.5 pb-2.5 space-y-2">
                  {c.note && <p className="text-[11px] text-ink-secondary leading-relaxed">{c.note}</p>}
                  {c.request && <Block title="Request" value={c.request} />}
                  {c.response && <Block title="Response" value={c.response} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Block({ title, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-secondary mb-0.5">{title}</p>
      <pre className="text-[11px] leading-snug bg-black/[0.03] rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
