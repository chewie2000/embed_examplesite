import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/session';
import DashboardShell from '@/components/DashboardShell';

/**
 * Dashboard page — server component.
 *
 * Reads and verifies the session cookie server-side, then passes
 * the decoded user to the client DashboardShell.
 *
 * Middleware (middleware.js) already blocks unauthenticated requests,
 * so this is a belt-and-suspenders check.
 */
export default async function DashboardPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) redirect('/login');

  let session;
  try {
    session = await verifySession(token);
  } catch {
    redirect('/login');
  }

  const user = {
    email: session.email,
    name: session.name,
    accountType: session.accountType,
    teams: session.teams,
  };

  return <DashboardShell user={user} />;
}
