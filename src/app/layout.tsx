import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/components/providers/query';

export const metadata: Metadata = {
  title: 'AI Thumbnail Generator',
  description: 'Design Your Youtube Thumbnail',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang='en'>
        <body className={` dark bg-neutral-950`}>
          <QueryProvider>
            <Toaster />
            <Header />
            {children}
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
