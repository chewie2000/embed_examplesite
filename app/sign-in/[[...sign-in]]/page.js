import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <SignIn />
    </div>
  );
}
