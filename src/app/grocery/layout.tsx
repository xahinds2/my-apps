import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grocery',
  description: 'Track grocery prices across Zepto and Instamart in Pune.',
};

export default function GroceryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
