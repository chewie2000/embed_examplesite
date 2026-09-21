'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useDashboardChrome } from '@/lib/dashboard-context';
import { BADGE_TONE } from '@/components/ConceptDemoPage';
import { USE_CASES } from '@/lib/use-cases';

/**
 * The /dashboard landing page — a gallery of use cases to pick from and talk
 * a customer through, rather than dropping straight into the first example
 * (embed_examplesite-0so.6). Each card previews the same badge/title/summary
 * metadata its target page shows in full via ConceptDemoPage.
 */
export default function UseCaseGalleryPage() {
  const { setPageTitle } = useDashboardChrome();

  useEffect(() => {
    setPageTitle('Use Cases');
  }, [setPageTitle]);

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="max-w-2xl shrink-0">
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl tracking-tight text-ink-primary mb-3">
          Choose a use case
        </h1>
        <p className="text-ink-secondary leading-relaxed text-sm">
          Each card below demonstrates one Sigma embedding capability. Pick one to explore it live —
          you can switch between use cases at any time from the sidebar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {USE_CASES.map((useCase) => (
          <Link
            key={useCase.slug}
            href={useCase.href}
            className="group flex flex-col gap-3 rounded-2xl border border-black/[0.06] shadow-card bg-white p-5 hover:border-brand-500/30 hover:shadow-elevated transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-500 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white transition-colors">
                {useCase.icon}
              </div>
              {useCase.badge && (
                <span
                  className={`inline-flex items-center gap-1.5 border text-[10px] font-medium px-2 py-1 rounded-full ${
                    BADGE_TONE[useCase.badge.tone] ?? BADGE_TONE.info
                  }`}
                >
                  {useCase.badge.text}
                </span>
              )}
            </div>
            <h2 className="text-sm font-semibold text-ink-primary">{useCase.title}</h2>
            <p className="text-xs text-ink-secondary leading-relaxed">{useCase.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
