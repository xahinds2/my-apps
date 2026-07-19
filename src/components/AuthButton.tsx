'use client';

import { useAuth, UserButton, SignInButton } from '@clerk/nextjs';

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AuthButtonInner() {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return <UserButton />;
  return (
    <SignInButton mode="redirect">
      <button className="text-xs text-[#666] hover:text-white transition px-3 py-1.5 border border-[#333] rounded-lg">
        Sign In
      </button>
    </SignInButton>
  );
}

export default function AuthButton() {
  if (!hasClerk) return null;
  return <AuthButtonInner />;
}
