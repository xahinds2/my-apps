import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Anonymous public chat. No account needed.',
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
