import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CONTACT_EMAIL,
  LegalPage,
  Section,
} from '@/components/legal/LegalPage';
import { FREE_PLAN } from '@/config/plans';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms for using ThumbAI, the AI thumbnail and cover image generator.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title='Terms of Service'
      intro={
        <p>
          These terms cover your use of ThumbAI at thumbai.srvjha.in. ThumbAI is
          operated by Saurav Jha, an individual based in India
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using
          the service, you agree to them.
        </p>
      }
    >
      <Section title='The service'>
        <p>
          ThumbAI generates YouTube thumbnails, Shorts covers and blog cover
          images with AI, from a text description, photos you upload, or a blog
          URL you provide. You can refine images by chatting and download them.
        </p>
        <p>
          AI output varies. We do not guarantee that a given image will be
          accurate, free of errors, or suited to a particular purpose, and
          features or the underlying models may change over time.
        </p>
      </Section>

      <Section title='Your account'>
        <ul>
          <li>
            You must be at least 13 years old, and old enough to agree to these
            terms where you live. If you are under 18, a parent or guardian must
            agree to them for you.
          </li>
          <li>
            You are responsible for activity on your account. Keep your sign-in
            details secure.
          </li>
          <li>
            One free signup allowance per person. Creating accounts to collect
            extra free credits is not allowed.
          </li>
        </ul>
      </Section>

      <Section title='Credits and payment'>
        <ul>
          <li>
            New accounts get {FREE_PLAN.credits} free credits. Further credits
            are sold in one-time packs, priced in US dollars on the{' '}
            <Link href='/pricing'>pricing page</Link>. There is no subscription.
          </li>
          <li>
            Each image uses credits according to the model behind it, as shown
            on the pricing page. Credits do not expire, have no cash value, and
            cannot be transferred or resold.
          </li>
          <li>
            Payments are processed by Dodo Payments, which acts as merchant of
            record and handles sales tax and VAT. Their terms also apply to the
            payment.
          </li>
          <li>
            All purchases are final and non-refundable, except for billing
            errors as described in our{' '}
            <Link href='/refund-policy'>Refund Policy</Link>.
          </li>
        </ul>
      </Section>

      <Section title='Your content'>
        <p>
          You keep the rights to what you upload (photos, text, links) and,
          between you and us, to the images you generate. You may use generated
          images for any lawful purpose, including commercially.
        </p>
        <p>
          You give us permission to store and process your content only as
          needed to run the service: to generate and edit images, show you your
          history, keep the service safe, and fix problems. We do not use your
          uploads or images to advertise ThumbAI without asking you.
        </p>
        <p>
          You confirm that you have the rights to what you upload, including the
          consent of any recognisable person in your photos.
        </p>
      </Section>

      <Section title='Acceptable use'>
        <p>Do not use ThumbAI to create or upload:</p>
        <ul>
          <li>
            sexual content involving minors, or any sexual content of real
            people;
          </li>
          <li>
            images of a real person made to deceive, harass or defame them;
          </li>
          <li>
            content that infringes someone else&apos;s copyright, trademark or
            other rights;
          </li>
          <li>hate, harassment, threats, or content promoting violence;</li>
          <li>anything illegal where you or we are.</li>
        </ul>
        <p>
          Also do not try to break, overload, reverse-engineer or get around the
          service&apos;s limits, or extract its prompts or code. Prompts are
          screened automatically for abuse.
        </p>
      </Section>

      <Section title='Suspension and ending your account'>
        <p>
          We may suspend or close accounts that break these terms. Where the
          breach is not serious, we will try to tell you first. Credits on an
          account closed for abuse are not refunded.
        </p>
        <p>
          You can stop using ThumbAI at any time. To delete your account, email
          us from its address; the <Link href='/privacy'>Privacy Policy</Link>{' '}
          explains what is removed and what is kept.
        </p>
      </Section>

      <Section title='Liability'>
        <p>
          ThumbAI is provided &ldquo;as is&rdquo;. To the extent the law allows,
          we are not liable for indirect or consequential losses, such as lost
          views, revenue or data. Our total liability to you for any claim is
          limited to the amount you paid us in the 12 months before it. Nothing
          here limits rights you have under consumer law that cannot be
          excluded.
        </p>
      </Section>

      <Section title='Changes'>
        <p>
          We may update these terms. If a change matters, we will say so on the
          site or by email before it takes effect. Continuing to use ThumbAI
          after that means you accept the new terms.
        </p>
      </Section>

      <Section title='Law'>
        <p>
          These terms are governed by the laws of India, and the courts of India
          have jurisdiction, unless consumer law where you live says otherwise.
        </p>
      </Section>

      <Section title='Contact'>
        <p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </LegalPage>
  );
}
