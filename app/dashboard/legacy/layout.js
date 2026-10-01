import LegacySidebar from '@/components/LegacySidebar';
import UseCaseMain from '@/components/UseCaseMain';

// Legacy Examples' own left panel (example switcher + Content Browser) —
// scoped to this use case, not global dashboard chrome.
export default function LegacyLayout({ children }) {
  return (
    <>
      <LegacySidebar />
      <UseCaseMain>{children}</UseCaseMain>
    </>
  );
}
