import type { Metadata } from "next";
import { LegalPage } from "@/app/_components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description: "How Faineant handles marketing-email information and consent.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal · Privacy"
      title="Privacy Notice."
      intro="This notice explains the information Faineant, Inc. uses when you join our marketing email list, why we use it, and how you can ask us to stop."
    >
      <section>
        <h2>Information we collect</h2>
        <p>
          When you join the list, we collect the email address you provide and a record of your
          consent, including when and where you opted in and the disclosure version you accepted.
          For security and abuse prevention, we also process limited technical information such as
          your browser user agent, referring page, and a one-way cryptographic hash of the network
          address used for the request. We do not store the raw network address in the marketing
          list.
        </p>
      </section>

      <section>
        <h2>How and why we use it</h2>
        <ul>
          <li>To send the welcome email you requested.</li>
          <li>
            To send occasional marketing emails about Faineant launches, services, events, and
            offers.
          </li>
          <li>To maintain consent and suppression records and honor unsubscribe requests.</li>
          <li>
            To protect the form and email system from fraud, abuse, and automated submissions.
          </li>
        </ul>
        <p className="mt-3">
          Where consent is the applicable legal basis, you may withdraw it at any time without
          affecting processing that occurred before withdrawal.
        </p>
      </section>

      <section>
        <h2>Service providers and disclosure</h2>
        <p>
          We use Supabase to store consent records, Resend to deliver email, and Vercel to operate
          the website. These providers process information for us under their own security and data
          protection commitments. We do not sell or rent marketing email addresses. We may disclose
          information when required by law or to protect the rights and security of Faineant and its
          users.
        </p>
      </section>

      <section>
        <h2>Retention and your choices</h2>
        <p>
          We retain an active subscription while you remain subscribed. If you unsubscribe, we keep
          a limited suppression record so we can respect that request and demonstrate compliance.
          Every marketing email includes an unsubscribe link. You may also ask to access, correct,
          or delete information where applicable by emailing{" "}
          <a href="mailto:privacy@faineantapp.com">privacy@faineantapp.com</a>. Some suppression or
          compliance records may need to be retained after a deletion request.
        </p>
      </section>

      <section>
        <h2>Children, transfers, and changes</h2>
        <p>
          The marketing list is not directed to children under 18. Our providers may process data in
          the United States and other locations where they operate. We may update this notice as the
          service or law changes; material changes to the marketing purpose will not be treated as
          new consent without an appropriate notice or fresh choice.
        </p>
      </section>

      <p className="font-mono text-mono uppercase tracking-[0.2em] text-taupe-300">
        Effective August 3, 2026 · Faineant, Inc. · Chicago, Illinois
      </p>
    </LegalPage>
  );
}
