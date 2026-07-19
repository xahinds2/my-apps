import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'quick-shop',
  description: 'A personal wishlist app — write what you want, search products, shortlist and buy.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const mainLayout = (
    <html lang="en" className="scroll-smooth no-scrollbar">
      <body className="antialiased text-slate-100">
        {children}
      </body>
    </html>
  );

  // Wrap in ClerkProvider only if Clerk credentials are found in the environment to avoid runtime crashes
  if (publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        {mainLayout}
      </ClerkProvider>
    );
  }

  return mainLayout;
}

