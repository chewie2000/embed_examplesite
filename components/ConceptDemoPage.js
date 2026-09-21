// Exported so other pieces of chrome (e.g. the /dashboard use-case gallery
// cards) that show the same badge concept can reuse this exact styling
// instead of re-deriving it.
export const BADGE_TONE = {
  info: 'border-brand-500/25 bg-brand-50 text-brand-600',
  beta: 'border-amber-300 bg-amber-50 text-amber-700',
  live: 'border-mint-border/40 bg-mint-400/10 text-mint-ink',
};

/**
 * Shared layout for every "concept demo" page — a realistic-looking page that
 * demonstrates one Sigma embed capability, rather than a bare embed dropped on
 * a blank page. Used both for standalone routes (e.g. /interested) and for
 * every use-case route under /dashboard (e.g. LegacyExampleView).
 *
 * Deliberately does NOT render page chrome (top nav, footer, sidebar) — that
 * varies per call site (a public page vs. the logged-in dashboard). This is
 * just the "what is this, what does it prove, where can I read more" body.
 */
export default function ConceptDemoPage({ badge, title, description, docs = [], children }) {
  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <div className="max-w-2xl shrink-0">
        {badge && (
          <div
            className={`inline-flex items-center gap-2 border text-xs font-medium px-3 py-1.5 rounded-full mb-4 ${
              BADGE_TONE[badge.tone] ?? BADGE_TONE.info
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {badge.text}
          </div>
        )}
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl tracking-tight text-ink-primary mb-3">
          {title}
        </h1>
        {description && (
          <p className="text-ink-secondary leading-relaxed text-sm">{description}</p>
        )}
      </div>

      <div className="flex-1 min-h-0">{children}</div>

      {docs.length > 0 && (
        <div className="border-t border-black/[0.06] pt-4 shrink-0">
          <p className="text-[11px] font-semibold text-ink-secondary uppercase tracking-widest mb-2">
            Related docs
          </p>
          <ul className="flex flex-wrap gap-2">
            {docs.map((doc) => (
              <li key={doc.href}>
                <a
                  href={doc.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 border border-brand-500/20 hover:border-brand-500/40 bg-brand-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {doc.label}
                  <span aria-hidden>↗</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
