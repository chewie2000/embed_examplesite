import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
      <SignUp />
    </div>
  );
}
