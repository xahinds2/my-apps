'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, LineChart } from 'lucide-react';

const TABS = [
  { href: '/finance',           label: 'Planner',   icon: LayoutGrid },
  { href: '/finance/analytics', label: 'Analytics', icon: LineChart   },
];

export default function FinanceNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active
                ? 'bg-[#0a0a0a] text-white dark:bg-white dark:text-black'
                : 'text-[#777] dark:text-[#555] hover:text-[#111] hover:bg-[#eee] dark:hover:text-white dark:hover:bg-[#1a1a1a]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
