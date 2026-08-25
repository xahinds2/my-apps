'use client';

import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const HIDDEN_ON = ['/chat'];

export default function ThemeToggleWrapper() {
  const pathname = usePathname();
  if (HIDDEN_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;
  return <ThemeToggle />;
}
