import LegacySidebar from '@/components/LegacySidebar';
import UseCaseMain from '@/components/UseCaseMain';

/**
 * Legacy Examples owns its own left panel — the example switcher and the
 * Content Browser tree — because those were part of what the original demo
 * was demonstrating, not generic app furniture. Everything under
 * /dashboard/legacy (both examples and any workbook opened from the tree)
 * gets it; the use-case gallery does not.
 */
export default function LegacyLayout({ children }) {
  return (
    <>
      <LegacySidebar />
      <UseCaseMain>{children}</UseCaseMain>
    </>
  );
}
