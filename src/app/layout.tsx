import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Analytics } from '@vercel/analytics/next';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata: Metadata = {
  title: 'Sahin\'s Apps',
  description: 'A personal suite of minimal tools — Manifest, cards, health, finance, and travel.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const mainLayout = (
    <html lang="en" className={`${geist.variable} scroll-smooth no-scrollbar`} suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>
        <ThemeProvider>
          {children}
          <ThemeToggle />
          <Analytics />
        </ThemeProvider>
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

