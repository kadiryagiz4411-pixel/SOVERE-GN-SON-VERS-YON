import { LegalPage, LegalSection } from '@/components/legal/LegalPage';
import { singlePassLabel, subscriptionPriceList } from '@/config/money';

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy">
      <LegalSection title="1. Digital services">
        <p>
          Sovereign sells digital services: generated proposals, CV optimizations, workspace access, and related software features. Once a generation or pass is delivered, the service has been performed. Nothing physical is shipped.
        </p>
      </LegalSection>

      <LegalSection title={`2. ${singlePassLabel()}`}>
        <p>
          The {singlePassLabel()} is a one-time digital purchase that grants one (1) pass credit for a single CV optimization or proposal generation. It is not a subscription and does not auto-renew.
        </p>
        <p>
          Because the pass is consumed when you run that generation, Single Pass purchases are generally non-refundable once the credit has been granted or used. except where required by law, or if checkout charged you and fulfillment failed (no credit appeared on your account after you signed in with the same email).
        </p>
        <p>
          Unused Single Pass credits that never attached to an account (for example, a guest checkout that was never claimed) may be reviewed case-by-case if you email support within 14 days with the order ID.
        </p>
      </LegalSection>

      <LegalSection title="3. 14-Day Money-Back Guarantee (Subscriptions)">
        <p>
          For recurring monthly/annual subscription plans purchased directly on Sovereign ({subscriptionPriceList()}), we offer a 14-day money-back guarantee if you are not completely satisfied.
        </p>
        <p>
          Direct checkout is processed by Polar or Lemon Squeezy as payment processor / Merchant of Record. Approved refunds are returned to the original payment method. After the 14-day window, subscription charges are generally non-refundable, but you may cancel to stop future renewals.
        </p>
      </LegalSection>

      <LegalSection title="4. AppSumo Lifetime Deals">
        <p>
          Lifetime Deal licenses purchased via AppSumo are covered by AppSumo&apos;s standard 60-day money-back guarantee policy. Refund requests for AppSumo purchases must be initiated through your AppSumo account panel.
        </p>
        <p>
          Sovereign cannot process an AppSumo refund internally. After AppSumo approves a refund, access associated with that code may be revoked.
        </p>
      </LegalSection>

      <LegalSection title="5. How to Request a Refund">
        <p>
          To request a refund for direct billing, please contact our support team at{' '}
          <a className="text-primary hover:underline" href="mailto:support@sovereign.app">support@sovereign.app</a>{' '}
          with your order details and account email address. Include the Polar or Lemon Squeezy order ID if available.
        </p>
      </LegalSection>

      <LegalSection title="6. What Is Not Refundable">
        <ul className="list-disc pl-5 space-y-1">
          <li>{singlePassLabel()} after the credit has been granted or consumed, except where required by law or fulfillment failed.</li>
          <li>Renewals requested more than 14 days after the charge, except where required by law.</li>
          <li>Abuse, fraud, chargeback-in-progress accounts, or terms-of-service violations.</li>
          <li>Third-party marketplace purchases other than AppSumo (those marketplaces set their own refund rules).</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Cancellations">
        <p>
          Cancel a recurring plan from your billing portal or by emailing support before the renewal date. Cancellation stops future charges; it does not automatically refund the current period unless you qualify under the 14-day subscription guarantee.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
