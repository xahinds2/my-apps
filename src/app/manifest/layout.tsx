import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manifest',
  description: 'Keep the things you want in one place and jump back to them when you are ready.',
  manifest: '/manifest/manifest.webmanifest',
  icons: {
    icon: '/manifest/icon.svg',
  },
};

export default function ManifestLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}