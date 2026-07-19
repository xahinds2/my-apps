'use client';

import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative px-4 overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

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
              colorPrimary: '#6366f1',
              colorBackground: '#0f172a',
              colorInputBackground: '#1e293b',
              colorInputText: '#f8fafc',
              colorText: '#f8fafc',
              colorTextSecondary: '#94a3b8',
            },
            elements: {
              card: 'border border-white/5 bg-slate-900/40 backdrop-blur-xl shadow-2xl rounded-2xl p-6',
              headerTitle: 'text-white font-extrabold text-xl',
              headerSubtitle: 'text-slate-400 text-xs',
              socialButtonsBlockButton: 'bg-slate-800 hover:bg-slate-700/80 border border-white/5 text-white text-xs font-semibold rounded-lg transition duration-200',
              formButtonPrimary: 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs py-2 px-4 rounded-lg transition duration-200 shadow-md',
              footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-semibold',
              formFieldInput: 'bg-slate-900/60 border border-white/10 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm',
              formFieldLabel: 'text-slate-300 text-xs font-semibold',
              dividerLine: 'bg-white/10',
              dividerText: 'text-slate-500 text-[10px]',
            }
          }}
        />
      </div>
    </div>
  );
}
