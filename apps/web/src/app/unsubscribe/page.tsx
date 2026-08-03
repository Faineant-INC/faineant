import type { Metadata } from "next";
import { LegalPage } from "@/app/_components/legal-page";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Stop Faineant marketing emails.",
  referrer: "no-referrer",
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <LegalPage
      eyebrow="The list · Your choice"
      title="Hear less."
      intro="There is no hard feeling in a quiet inbox. Confirm below and Faineant marketing email will stop."
    >
      <UnsubscribeForm token={token} />
    </LegalPage>
  );
}
