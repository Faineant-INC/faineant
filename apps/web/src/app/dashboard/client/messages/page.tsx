"use client";

import { MessageSquare } from "lucide-react";

export default function ClientMessagesPage() {
  // TODO(impl): wire to /messages/conversations once messaging UX is rebranded.
  // Until then, the editorial empty state is the page.
  return (
    <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-5 border-b border-smoke-700">
        <h2 className="font-display text-[clamp(1.75rem,5vw,2.625rem)] leading-none text-bone-100">
          Your{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            messages.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 md:max-w-[340px] md:text-right leading-snug">
          A quieter inbox, by design.
        </p>
      </header>

      <section className="flex flex-col items-center text-center py-24 px-6 border border-smoke-700 bg-smoke-900">
        <MessageSquare
          className="h-16 w-16 text-smoke-700"
          strokeWidth={1}
          aria-hidden="true"
        />
        <h3 className="mt-8 font-display text-[1.75rem] leading-tight text-bone-100">
          No messages{" "}
          <em className="font-editorial italic font-light text-champagne-400">
            yet.
          </em>
        </h3>
        <p className="mt-4 font-editorial italic text-body-lg text-bone-200 max-w-[420px] leading-snug">
          Most clients don&rsquo;t need them &mdash; practitioners arrive on
          time.
        </p>
      </section>
    </div>
  );
}
