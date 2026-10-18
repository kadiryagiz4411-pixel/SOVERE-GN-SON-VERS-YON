import { Link } from 'react-router-dom';
import { LegalPage, LegalSection } from '@/components/legal/LegalPage';

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service">
      <LegalSection title="1. Acceptance of Terms">
        <p>
          By accessing or using Sovereign, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
        </p>
      </LegalSection>

      <LegalSection title="2. User Responsibilities & Acceptable Use">
        <p>
          You agree not to use Sovereign to process unlawful, defamatory, or fraudulent content. Automated operations, candidate rankings, and proposals generated via our software are intended to assist decision-making and must not be used for malicious spamming.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>You must have a lawful basis to upload resumes and candidate data (including employer instructions and applicable privacy law).</li>
          <li>You will not run unauthorized mass scraping, credential stuffing, or platform abuse against Upwork, LinkedIn, Indeed, or any third-party site.</li>
          <li>The Chrome extension may be used only on pages you are permitted to view and only on your explicit click.</li>
          <li>You remain responsible for every message, proposal, or ranking you send or rely on.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Subscriptions & Billing">
        <p>
          Subscriptions and lifetime access deals are processed securely by LemonSqueezy, our Merchant of Record. Recurring billing plans renew automatically unless cancelled prior to the renewal date.
        </p>
        <p>
          AppSumo lifetime licenses, if purchased, are redeemed through Sovereign’s redeem flow and remain subject to AppSumo’s marketplace terms. Refunds are described in our{' '}
          <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="4. Intellectual Property">
        <p>
          Sovereign owns the platform, branding, and software. You retain ownership of resumes and job text you upload. Subject to these terms, we grant you a limited license to use generated evaluations and proposals for your own recruiting or job-search workflow. You may not resell the service, scrape our APIs, or reverse engineer the product.
        </p>
      </LegalSection>

      <LegalSection title="5. AI Outputs — No Professional Advice">
        <p>
          Evaluations, ATS scores, rankings, and cover letters are assistive outputs. They are not legal, hiring, or employment advice and do not guarantee interviews, placements, or income. Final decisions belong to you.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitation of Liability">
        <p>
          The service is provided “as is.” To the maximum extent permitted by law, Sovereign and its operators are not liable for indirect, incidental, special, consequential, or lost-profit damages, or for decisions made using AI rankings. Our aggregate liability for a claim is limited to the fees you paid to us for the service in the three months before the claim (or, for AppSumo licenses, the amount AppSumo remitted for your seat, if any).
        </p>
      </LegalSection>

      <LegalSection title="7. Suspension & Termination">
        <p>
          We may suspend or terminate accounts that violate these terms, create security risk, or abuse credits, APIs, or third-party platforms. You may stop using the service and request account deletion at any time.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes">
        <p>
          We may update these terms. Material changes will be posted on this page with a new “Last Updated” date. Continued use after that date constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Legal questions: <a className="text-primary hover:underline" href="mailto:legal@sovereign.app">legal@sovereign.app</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
