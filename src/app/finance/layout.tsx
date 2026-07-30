import type { Metadata } from 'next';
import AuthButton from '@/components/AuthButton';
import FinanceNav from '@/components/FinanceNav';
import { BarChart2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Finance',
  description: 'Plan your monthly budget with clarity. Track income, set category allocations, and stay on top of your finances.',
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#080808]">
      <header className="sticky top-0 z-40 w-full border-b border-[#e5e5e5] dark:border-[#1a1a1a] bg-white/90 dark:bg-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
                <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-[#0a0a0a] dark:text-white">Finance</span>
            </div>
            <FinanceNav />
          </div>
          <AuthButton />
        </div>
      </header>
      {children}
    </div>
  );
}
