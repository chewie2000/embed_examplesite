import { redirect } from 'next/navigation';

// Placeholder until the use-case gallery (embed_examplesite-0so.6) lands as
// the real /dashboard landing page. For now, land on the first legacy
// example — same default behavior as before the routing restructure.
export default function DashboardIndexPage() {
  redirect('/dashboard/legacy/internal-user');
}
