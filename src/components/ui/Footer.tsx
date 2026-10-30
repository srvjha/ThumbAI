import Image from 'next/image';
import Link from 'next/link';
import { Linkedin, Mail, Twitter } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

const CONTACT_EMAIL = 'jhasaurav0209001@gmail.com';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Text to image', href: '/studio/text-to-image' },
      { label: 'Image to image', href: '/studio/image-to-image' },
      { label: 'Blog cover', href: '/studio/blog-cover' },
      { label: 'Samples', href: '/#samples' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Library', href: '/dashboard' },
      { label: 'Analytics', href: '/dashboard/analytics' },
      { label: 'Credits & billing', href: '/billing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Pricing', href: '/pricing' },
      { label: 'Contact', href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
];

const SOCIALS = [
  { label: 'ThumbAI on X', href: 'https://x.com/J_srv001', icon: Twitter },
  {
    label: 'ThumbAI on LinkedIn',
    href: 'https://linkedin.com/in/srvjha02',
    icon: Linkedin,
  },
  { label: 'Email us', href: `mailto:${CONTACT_EMAIL}`, icon: Mail },
];

/**
 * Navigation sits on plain paper; the engraving starts beneath it and runs to
 * the bottom edge. Its empty sky slides under the columns, so there is no seam.
 */
export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='relative isolate overflow-hidden bg-background'>
      <div className='mx-auto max-w-6xl px-4 pt-20 sm:px-6 md:pt-28 lg:px-8'>
        <div className='grid gap-12 md:grid-cols-[1.3fr_2fr]'>
          <div>
            <Logo />
            <p className='mt-4 max-w-xs leading-relaxed'>
              Thumbnails, Shorts covers and blog headers, made from a line of
              text, a photo or a link.
            </p>
            <ul className='mt-6 flex gap-2'>
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <li key={href}>
                  <a
                    href={href}
                    aria-label={label}
                    {...(href.startsWith('http')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className='inline-flex size-9 items-center justify-center rounded-lg bg-card text-foreground transition-colors hover:bg-accent hover:text-brand'
                  >
                    <Icon className='size-4' />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav
            aria-label='Footer'
            className='grid grid-cols-2 gap-10 sm:grid-cols-3'
          >
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className='text-sm text-muted-foreground'>{col.title}</h2>
                <ul className='mt-4 space-y-3'>
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className='text-foreground transition-colors hover:text-brand'
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p className='mt-14 text-sm text-muted-foreground'>
          &copy; {currentYear} ThumbAI. All rights reserved.
        </p>
      </div>

      {/* The art's top quarter is blank paper, pulled up under the text. */}
      <div
        aria-hidden
        className='relative -z-10 -mt-[6vw] aspect-[2200/890] min-h-56 w-full'
      >
        <Image
          src='/art/footer-engraving.webp'
          alt=''
          fill
          sizes='100vw'
          className='object-cover object-bottom'
        />
      </div>
    </footer>
  );
};
