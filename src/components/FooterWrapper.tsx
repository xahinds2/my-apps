'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

const HIDDEN_ON = ['/chat'];

export default function FooterWrapper() {
  const pathname = usePathname();
  if (HIDDEN_ON.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;
  return <Footer />;
}
