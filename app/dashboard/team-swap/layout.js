import TeamSwapSidebar from '@/components/TeamSwapSidebar';
import UseCaseMain from '@/components/UseCaseMain';

export default function TeamSwapLayout({ children }) {
  return (
    <>
      <TeamSwapSidebar />
      <UseCaseMain>{children}</UseCaseMain>
    </>
  );
}
