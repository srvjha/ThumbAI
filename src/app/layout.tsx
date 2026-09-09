import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/components/providers/query';

// globals.css already expects --font-geist-sans / --font-geist-mono; nothing
// ever defined them, so every screen fell back to the browser default sans.
const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thumbai.app';

/**
 * Clerk renders its own components, so it needs telling about the theme once
 * here rather than per page. Without this the sign-in card and the header
 * avatar menu came out in Clerk's default light styling against a dark app.
 * Values track the tokens in globals.css.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: '#2563eb',
    colorBackground: '#0a0a0a',
    colorText: '#fafafa',
    colorTextSecondary: '#a3a3a3',
    colorInputBackground: '#171717',
    colorInputText: '#fafafa',
    colorDanger: '#f87171',
    borderRadius: '0.625rem',
  },
} as const;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ThumbAI — AI thumbnail generator',
    template: '%s · ThumbAI',
  },
  description:
    'Generate YouTube thumbnails and blog cover images from a prompt, an image, or a blog URL.',
  applicationName: 'ThumbAI',
  openGraph: {
    type: 'website',
    siteName: 'ThumbAI',
    title: 'ThumbAI — AI thumbnail generator',
    description:
      'Generate YouTube thumbnails and blog cover images from a prompt, an image, or a blog URL.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ThumbAI — AI thumbnail generator',
    description:
      'Generate YouTube thumbnails and blog cover images from a prompt, an image, or a blog URL.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      {/* `dark` belongs on <html> so the root element is themed too, not just
          body's descendants. */}
      <html
        lang='en'
        className={`dark ${geistSans.variable} ${geistMono.variable}`}
      >
        <body className='bg-background text-foreground font-sans antialiased'>
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
