import { LegalPage, LegalSection } from '@/components/legal/LegalPage';

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund Policy">
      <LegalSection title="1. 14-Day Money-Back Guarantee (SaaS Plans)">
        <p>
          For recurring monthly/annual subscription plans purchased directly on Sovereign, we offer a hassle-free 14-day money-back guarantee if you are not completely satisfied with our service.
        </p>
        <p>
          Direct checkout is processed by LemonSqueezy as Merchant of Record. Approved refunds are returned to the original payment method. After the 14-day window, subscription charges are generally non-refundable, but you may cancel to stop future renewals.
        </p>
      </LegalSection>

      <LegalSection title="2. AppSumo Lifetime Deals">
        <p>
          Lifetime Deal licenses purchased via AppSumo are covered by AppSumo&apos;s standard 60-day money-back guarantee policy. Refund requests for AppSumo purchases must be initiated through your AppSumo account panel.
        </p>
        <p>
          Sovereign cannot process an AppSumo refund internally. After AppSumo approves a refund, access associated with that code may be revoked.
        </p>
      </LegalSection>

      <LegalSection title="3. How to Request a Refund">
        <p>
          To request a refund for direct billing, please contact our support team at{' '}
          <a className="text-primary hover:underline" href="mailto:support@sovereign.app">support@sovereign.app</a>{' '}
          with your order details and account email address. Include the LemonSqueezy order ID if available.
        </p>
      </LegalSection>

      <LegalSection title="4. What Is Not Refundable">
        <ul className="list-disc pl-5 space-y-1">
          <li>Renewals requested more than 14 days after the charge, except where required by law.</li>
          <li>Abuse, fraud, chargeback-in-progress accounts, or terms-of-service violations.</li>
          <li>Third-party marketplace purchases other than AppSumo (those marketplaces set their own refund rules).</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Cancellations">
        <p>
          Cancel a recurring plan from your billing portal or by emailing support before the renewal date. Cancellation stops future charges; it does not automatically refund the current period unless you qualify under section 1.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
