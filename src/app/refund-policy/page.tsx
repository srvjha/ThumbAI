import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CONTACT_EMAIL,
  LegalPage,
  Section,
} from '@/components/legal/LegalPage';
import { formatMoney, FREE_PLAN, PLANS } from '@/config/plans';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'ThumbAI credit packs are non-refundable. How failed generations and billing errors are handled.',
};

const packs = Object.values(PLANS)
  .map((p) => `${p.name} (${p.credits} credits, ${formatMoney(p.priceCents)})`)
  .join(' and ');

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title='Refund Policy'
      intro={
        <p>
          All purchases on ThumbAI are final. Credit packs are non-refundable,
          so please try the free credits before you buy.
        </p>
      }
    >
      <Section title='What you buy'>
        <p>
          Credits are sold in one-time packs: {packs}. Prices are in US dollars.
          Nothing renews, and you are never charged again unless you buy another
          pack. Credits are added to your account the moment payment is
          confirmed, and they do not expire.
        </p>
      </Section>

      <Section title='No refunds'>
        <p>
          Because credits are digital and delivered instantly, we do not offer
          refunds on credit packs, whether the credits are used or unused, and
          we do not exchange credits for cash.
        </p>
        <p>
          Every new account gets {FREE_PLAN.credits} free credits so you can
          judge the results before paying. By completing a purchase, you ask for
          the credits to be delivered immediately and accept that, where the law
          gives you a right to cancel a digital purchase, that right ends once
          the credits are delivered.
        </p>
      </Section>

      <Section title='Failed generations get their credits back'>
        <p>
          If a generation or edit fails on our side, the credits it used are
          returned to your balance automatically. You do not need to contact us.
          This returns credits, not money.
        </p>
      </Section>

      <Section title='Billing errors'>
        <p>
          If you were charged twice for the same purchase, charged without
          receiving the credits, or charged without authorising the payment,
          email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the
          address on your ThumbAI account with the date of the charge. You can
          find your purchases on your <Link href='/billing'>billing page</Link>.
          We will add the missing credits or refund the duplicate or
          unauthorised charge.
        </p>
        <p>
          Payments are processed by Dodo Payments, our merchant of record, so
          your bank statement may show Dodo Payments rather than ThumbAI.
        </p>
      </Section>

      <Section title='Chargebacks'>
        <p>
          Please contact us before disputing a charge with your bank. A billing
          error is usually fixed faster that way, and an account may be
          suspended while a dispute is open.
        </p>
      </Section>

      <Section title='Your legal rights'>
        <p>
          Nothing in this policy limits rights you have under consumer law where
          you live that cannot be waived.
        </p>
      </Section>
    </LegalPage>
  );
}
