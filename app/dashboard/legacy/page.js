import { redirect } from 'next/navigation';

// /dashboard/legacy is a valid entry point into the use case — land on the
// first example, with the sidebar available to switch from there.
export default function LegacyIndexPage() {
  redirect('/dashboard/legacy/internal-user');
}
