import FolderExplorerSidebar from '@/components/FolderExplorerSidebar';
import UseCaseMain from '@/components/UseCaseMain';

// Folder Explorer's own left panel (the Content Browser tree) — scoped to
// this use case, not global dashboard chrome.
export default function FolderExplorerLayout({ children }) {
  return (
    <>
      <FolderExplorerSidebar />
      <UseCaseMain>{children}</UseCaseMain>
    </>
  );
}
