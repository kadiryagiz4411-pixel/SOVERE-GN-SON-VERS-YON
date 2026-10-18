import { LegalPage, LegalSection } from '@/components/legal/LegalPage';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSection title="1. Information We Collect">
        <p>
          Sovereign ("we", "our", "us") collects information necessary to provide AI-driven candidate evaluation, resume parsing, and proposal generation services. This includes user account details, uploaded resume documents, text snippets from job postings, and analytical interaction data.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account data: email address, authentication identifiers, and profile settings.</li>
          <li>Uploaded resumes, CVs, and related career documents you choose to submit.</li>
          <li>Job posting text, application drafts, and evaluation inputs you provide.</li>
          <li>Optional Bring-Your-Own-Key (BYOK) settings stored in your browser, not on our servers.</li>
          <li>Billing identifiers sent to LemonSqueezy (our Merchant of Record) to process payments.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Document & Data Processing">
        <p>
          Uploaded resumes and scraped job posting texts are processed strictly to calculate compatibility scores and generate rational evaluation metrics. We do not sell, rent, or share candidate documents or proprietary hiring data with third-party data brokers.
        </p>
        <p>
          The optional Chrome extension is click-only: it reads the active tab when you press Analyze and does not continuously scrape or poll pages in the background.
        </p>
      </LegalSection>

      <LegalSection title="3. Third-Party Integrations">
        <p>
          We integrate with secure service providers including Supabase for encrypted database hosting, OpenAI for structured analytical evaluations, and LemonSqueezy for billing and subscription processing. AppSumo may process lifetime-deal redemptions when you purchase through that marketplace.
        </p>
      </LegalSection>

      <LegalSection title="4. Storage, Security & Row Level Security">
        <p>
          Application data is stored in Supabase Postgres with Row Level Security (RLS) enabled so authenticated users can access only their own records (and authorized organization members where a team workspace exists). Service-role access is limited to server-side billing, webhooks, and administrative operations.
        </p>
        <p>
          We use HTTPS in transit, access-controlled hosting, and least-privilege API keys. No security program can guarantee absolute protection; you should not upload data you are not authorized to process.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies & Session Management">
        <p>
          We use strictly necessary cookies and local storage for session management (Supabase Auth) and billing authentication (returning from LemonSqueezy checkout). We do not use advertising cookies or sell cookie identifiers.
        </p>
      </LegalSection>

      <LegalSection title="6. GDPR, KVKK & Your Rights">
        <p>
          If you are in the EEA/UK or Türkiye, you may request access, correction, deletion, restriction, portability, or objection to processing of personal data, and you may lodge a complaint with a supervisory authority (including KVKK in Türkiye). Legal bases include contract performance, legitimate interests in operating a secure SaaS product, and consent where required.
        </p>
        <p>
          To exercise these rights, email privacy@sovereign.app from your account address. We will respond within a reasonable period required by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <p>
          We retain account and uploaded content while your subscription or license is active and for a limited period afterward to fulfill legal, billing, and anti-abuse obligations. You may delete documents and close your account; residual backups are purged on a rolling schedule.
        </p>
      </LegalSection>

      <LegalSection title="8. International Transfers">
        <p>
          Processors may store or process data in the United States or other jurisdictions. Where required, we rely on appropriate safeguards such as Standard Contractual Clauses with those processors.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          Sovereign is not directed to children under 16. We do not knowingly collect personal data from children.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          Privacy inquiries: <a className="text-primary hover:underline" href="mailto:privacy@sovereign.app">privacy@sovereign.app</a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
