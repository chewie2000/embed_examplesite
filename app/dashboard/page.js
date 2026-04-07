import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  const email = user.emailAddresses[0]?.emailAddress;
  const name = user.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : email;

  return <DashboardShell user={{ email, name }} />;
}
