'use client';

import { useState } from 'react';

/**
 * A small "i" trigger that opens a popover with enablement copy — how a
 * piece of this page's functionality is actually achieved, from a
 * feature-set perspective, for someone demoing it to a customer.
 *
 * Deliberately a click-toggle popover rather than a hover tooltip: the copy
 * runs to a full paragraph, which doesn't survive a hover-out.
 */
export default function InfoButton({ title, children, align = 'left' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`About: ${title}`}
        aria-expanded={open}
        className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-semibold transition-colors ${
          open
            ? 'border-brand-500 text-brand-600 bg-brand-50'
            : 'border-black/[0.15] text-ink-secondary hover:text-brand-600 hover:border-brand-500/40'
        }`}
      >
        i
      </button>

      {open && (
        <>
          {/* Click-outside catcher */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className={`absolute z-50 top-0 ${align === 'left' ? 'left-full ml-2' : 'right-full mr-2'} w-72 rounded-xl border border-black/[0.08] shadow-elevated bg-white p-3.5`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-xs font-semibold text-ink-primary leading-snug">{title}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="shrink-0 text-ink-secondary hover:text-ink-primary"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-[11px] text-ink-secondary leading-relaxed">{children}</div>
          </div>
        </>
      )}
    </div>
  );
}
