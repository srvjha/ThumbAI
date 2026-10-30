import type { Metadata, Viewport } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/components/providers/query';

// One family for the whole interface. The optical-size axis tightens Inter's
// letterforms at display sizes, so headlines need no second typeface.
const inter = Inter({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-inter',
  display: 'swap',
});

// Numbers (credits, prices, dimensions) stay monospaced so columns align.
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thumbai.app';

/**
 * Clerk renders its own components, so it needs telling about the theme once
 * here rather than per page. Values track the tokens in globals.css.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: '#3e63dd',
    colorPrimaryForeground: '#ffffff',
    colorBackground: '#ffffff',
    colorForeground: '#12172b',
    colorMutedForeground: '#5c6275',
    colorInput: '#ffffff',
    colorInputForeground: '#12172b',
    colorNeutral: '#12172b',
    colorBorder: '#e4e1d8',
    colorDanger: '#d93f3f',
    borderRadius: '0.75rem',
    fontFamily: 'var(--font-inter)',
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
  themeColor: '#3e63dd',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang='en'
        className={`${inter.variable} ${geistMono.variable}`}
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
