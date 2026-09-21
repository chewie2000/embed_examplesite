import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { DashboardProvider } from '@/lib/dashboard-context';
import DashboardChrome from '@/components/DashboardChrome';

export default async function DashboardLayout({ children }) {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const email = user.emailAddresses[0]?.emailAddress;
  const name = user.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : email;

  return (
    <DashboardProvider>
      <DashboardChrome user={{ email, name, imageUrl: user.imageUrl }}>
        {children}
      </DashboardChrome>
    </DashboardProvider>
  );
}
