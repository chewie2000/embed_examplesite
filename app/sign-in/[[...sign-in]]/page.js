import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#6366f1',
            colorBackground: '#09090b',
            colorInputBackground: '#ffffff08',
            colorInputText: '#f4f4f5',
            colorText: '#f4f4f5',
            colorTextSecondary: '#71717a',
            colorNeutral: '#3f3f46',
            borderRadius: '0.75rem',
            fontFamily: 'Inter, sans-serif',
          },
          elements: {
            card: 'bg-white/[0.03] border border-white/[0.07] shadow-2xl backdrop-blur-sm',
            headerTitle: 'text-white',
            headerSubtitle: 'text-zinc-400',
            socialButtonsBlockButton: 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300',
            dividerLine: 'bg-white/[0.06]',
            dividerText: 'text-zinc-600',
            formFieldLabel: 'text-zinc-400',
            formFieldInput: 'bg-white/[0.04] border-white/[0.08] text-white',
            footerActionLink: 'text-indigo-400 hover:text-indigo-300',
          },
        }}
      />
    </div>
  );
}
