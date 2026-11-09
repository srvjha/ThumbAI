import type { Metadata } from 'next';
import {
  CONTACT_EMAIL,
  LegalPage,
  Section,
} from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What ThumbAI collects, why, who processes it, and how to have it deleted.',
};

/** Services that process data for ThumbAI, and what each one sees. */
const PROCESSORS = [
  {
    name: 'Clerk',
    role: 'Sign-in and account management: your name, email and profile photo.',
  },
  {
    name: 'Vercel',
    role: 'Hosting. Sees request data such as IP address while serving the site.',
  },
  {
    name: 'Neon',
    role: 'Database hosting for account, order, generation and analytics records.',
  },
  {
    name: 'Fal',
    role: 'Runs the image models (including OpenAI and Google models) and stores uploaded photos and generated images.',
  },
  {
    name: 'OpenAI',
    role: 'Turns your request into a design prompt, and screens prompts for abuse.',
  },
  {
    name: 'Dodo Payments',
    role: 'Checkout and payment processing as merchant of record. Your card details go to them, never to us.',
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title='Privacy Policy'
      intro={
        <p>
          ThumbAI is operated by Saurav Jha, based in India. This page explains
          what we collect when you use thumbai.srvjha.in, why, and what you can
          ask us to do with it. We do not sell your data or use it for
          advertising.
        </p>
      }
    >
      <Section title='What we collect'>
        <ul>
          <li>
            <strong>Account details.</strong> Your name, email address and
            profile photo, from the sign-in provider you choose (email or a
            social login).
          </li>
          <li>
            <strong>What you create.</strong> Your prompts, the photos you
            upload, blog URLs you give us (we fetch and read that page to design
            the cover), the generated images, and your chat edits.
          </li>
          <li>
            <strong>Purchases.</strong> Which pack you bought, the amount,
            currency, status and payment reference. Card and billing details are
            handled by Dodo Payments and are not stored by us.
          </li>
          <li>
            <strong>Usage analytics.</strong> Pages you visit, the site that
            referred you and any campaign tags, your device type, browser and
            operating system, and an approximate location (country, region,
            city) derived from your connection. We do not store your IP address
            for analytics.
          </li>
          <li>
            <strong>Abuse prevention.</strong> At signup we store a one-way hash
            of your IP address and a normalised form of your email, to stop the
            same person claiming free credits repeatedly. When a request is
            flagged by our safety checks, we keep the kind of problem together
            with the prompt and any image links, including for requests we
            block, so a person can review it.
          </li>
        </ul>
      </Section>

      <Section title='Why we use it'>
        <ul>
          <li>
            To run the service: generate and store your images, keep your
            history and credit balance.
          </li>
          <li>To process payments and keep the records tax law requires.</li>
          <li>To prevent abuse, fraud and misuse of free credits.</li>
          <li>
            To understand which pages and features are used, so we can improve
            them.
          </li>
          <li>
            To check that generations match what was asked for. The ThumbAI
            team may read your prompts and look at the results to find and fix
            quality problems.
          </li>
          <li>To answer you when you contact us.</li>
        </ul>
        <p>We do not use your photos or generated images to train AI models.</p>
      </Section>

      <Section title='Cookies'>
        <p>
          We use cookies that are needed to keep you signed in (set by Clerk),
          and one first-party cookie,{' '}
          <code className='font-mono text-sm'>tai_vid</code>, that counts visits
          from the same browser for our own analytics. We do not use advertising
          or third-party tracking cookies.
        </p>
      </Section>

      <Section title='Who processes it'>
        <p>
          We use these services to run ThumbAI. They only receive what they need
          for their part, and some are located outside your country, including
          in the United States.
        </p>
        <ul>
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}:</strong> {p.role}
            </li>
          ))}
        </ul>
      </Section>

      <Section title='How long we keep it'>
        <p>
          Account data, uploads and generated images are kept while your account
          exists, so your library stays available. Order and payment records are
          kept as long as tax and accounting rules require, even after an
          account is deleted. Analytics records are kept for as long as they are
          useful for spotting trends.
        </p>
      </Section>

      <Section title='Your choices and rights'>
        <p>
          You can ask us to show you the data we hold about you, correct it,
          export it, or delete it. Email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your
          account&apos;s address and we will act on it within 30 days.
        </p>
        <p>
          When we delete an account, your name, email and profile photo are
          erased, and on request your uploads and generated images are removed
          too. We keep the order records required for tax, and a normalised form
          of your email so the free signup credits cannot be claimed again.
        </p>
        <p>
          Depending on where you live (for example under the GDPR in the EU and
          UK, or India&apos;s DPDP Act), you may also have the right to object
          to processing or to complain to your data protection authority.
        </p>
      </Section>

      <Section title='Security'>
        <p>
          Data is sent over HTTPS and stored with established cloud providers.
          Access to production data is limited to the operator. No system is
          perfectly secure, and we will tell affected users promptly if a breach
          puts their data at risk.
        </p>
      </Section>

      <Section title='Children'>
        <p>
          ThumbAI is not meant for children under 13, and we do not knowingly
          collect their data. If you think a child has an account, contact us
          and we will delete it.
        </p>
      </Section>

      <Section title='Changes'>
        <p>
          If we change this policy in a way that matters, we will update the
          date at the top and, for significant changes, tell you on the site or
          by email.
        </p>
      </Section>
    </LegalPage>
  );
}
