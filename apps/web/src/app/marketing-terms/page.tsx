import type { Metadata } from "next";
import { LegalPage } from "@/app/_components/legal-page";

export const metadata: Metadata = {
  title: "Marketing Email Terms",
  description: "Terms for Faineant marketing email subscriptions.",
};

export default function MarketingTermsPage() {
  return (
    <LegalPage
      eyebrow="Legal · Email"
      title="Marketing Email Terms."
      intro="A quiet list still deserves clear terms. These terms apply when you affirmatively choose to receive Faineant marketing emails."
    >
      <section>
        <h2>Your choice</h2>
        <p>
          By selecting the marketing consent box and submitting your email address, you ask
          Faineant, Inc. to send marketing email to that address about launches, in-home services,
          events, and offers. Consent is voluntary and is not a condition of purchasing or using a
          Faineant service.
        </p>
      </section>

      <section>
        <h2>Frequency and charges</h2>
        <p>
          Email frequency varies. Faineant does not charge for marketing email, although your email
          or internet provider may apply its usual data or access charges. Offers may have separate
          eligibility, availability, and expiration terms stated in the message.
        </p>
      </section>

      <section>
        <h2>Withdrawing consent</h2>
        <p>
          You may withdraw consent at any time through the unsubscribe link in any marketing email.
          We will stop marketing email to that address and retain a limited suppression record to
          honor your choice. Unsubscribing from marketing does not stop transactional or service
          messages you request, such as account, booking, payment, safety, or support notices.
        </p>
      </section>

      <section>
        <h2>Identity and privacy</h2>
        <p>
          Messages identify Faineant as the sender, describe their commercial nature, include our
          valid postal address, and provide an unsubscribe method. Our{" "}
          <a href="/privacy">Privacy Notice</a> explains how we handle your email and consent
          record. Questions may be sent to{" "}
          <a href="mailto:privacy@faineantapp.com">privacy@faineantapp.com</a>.
        </p>
      </section>

      <p className="font-mono text-mono uppercase tracking-[0.2em] text-taupe-300">
        Effective August 3, 2026 · Faineant, Inc. · Chicago, Illinois
      </p>
    </LegalPage>
  );
}
