'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative px-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a] pointer-events-none" />

      {/* Back link */}
      <div className="z-10 mb-8 self-start w-full max-w-md">
        <Link href="/home" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition duration-200">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Clerk Sign In */}
      <div className="z-10 w-full max-w-md flex justify-center">
        <SignIn
          path="/sign-in"
          appearance={{
            variables: {
              colorPrimary: '#ffffff',
              colorBackground: '#000000',
              colorInputBackground: '#111111',
              colorInputText: '#ffffff',
              colorText: '#ffffff',
              colorTextSecondary: '#888888',
            },
            elements: {
              card: 'border border-[#333] bg-[#111] shadow-none rounded-xl',
              headerTitle: 'text-white font-bold text-xl',
              headerSubtitle: 'text-[#888] text-xs',
              socialButtonsBlockButton: 'bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-xs font-medium rounded-lg transition',
              formButtonPrimary: 'bg-white hover:bg-[#e0e0e0] text-black font-semibold text-xs rounded-lg transition',
              footerActionLink: 'text-white hover:text-[#ccc] font-semibold',
              formFieldInput: 'bg-[#111] border border-[#333] text-white focus:border-white/40 rounded-lg text-sm',
              formFieldLabel: 'text-[#888] text-xs font-medium',
              dividerLine: 'bg-[#333]',
              dividerText: 'text-[#555] text-[10px]',
            }
          }}
        />
      </div>
    </div>
  );
}
