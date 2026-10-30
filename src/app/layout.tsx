import type { Metadata, Viewport } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Toaster } from 'react-hot-toast';
import { ClerkProvider } from '@clerk/nextjs';
import { QueryProvider } from '@/components/providers/query';
import { ThemeProvider } from '@/components/providers/theme';

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
 * here rather than per page. Values point at the tokens in globals.css, so
 * they follow light and dark.
 */
const clerkAppearance = {
  variables: {
    colorPrimary: 'var(--primary)',
    colorPrimaryForeground: 'var(--primary-foreground)',
    colorBackground: 'var(--card)',
    colorForeground: 'var(--foreground)',
    colorMutedForeground: 'var(--muted-foreground)',
    colorMuted: 'var(--muted)',
    colorInput: 'var(--card)',
    colorInputForeground: 'var(--foreground)',
    colorNeutral: 'var(--foreground)',
    colorBorder: 'var(--border)',
    colorRing: 'var(--ring)',
    colorDanger: 'var(--destructive)',
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f6f2' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0f19' },
  ],
  colorScheme: 'light dark',
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
        // next-themes sets the class before hydration.
        suppressHydrationWarning
        className={`${inter.variable} ${geistMono.variable}`}
      >
        <body className='bg-background text-foreground font-sans antialiased'>
          <ThemeProvider>
            <QueryProvider>
              <Toaster
                toastOptions={{
                  style: {
                    background: 'var(--popover)',
                    color: 'var(--popover-foreground)',
                    border: '1px solid var(--border)',
                  },
                }}
              />
              <Header />
              {children}
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
