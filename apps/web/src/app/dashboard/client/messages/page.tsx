"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  listConversations,
  type ConversationSummary,
} from "@/lib/data-client";
import { useAuth } from "@/lib/auth";

function messageTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ClientMessagesPage() {
  const { accessToken } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    listConversations()
      .then(setConversations)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Messages are unavailable."),
      )
      .finally(() => setLoading(false));
  }, [accessToken]);

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

      {error ? (
        <p role="alert" className="border border-oxblood-500/60 px-5 py-4 text-oxblood-400">
          {error}
        </p>
      ) : loading ? (
        <p className="border border-smoke-700 px-5 py-12 text-center font-mono text-mono uppercase tracking-[0.24em] text-taupe-300">
          Opening the inbox…
        </p>
      ) : conversations.length === 0 ? (
        <section className="flex flex-col items-center text-center py-24 px-6 border border-smoke-700 bg-smoke-900">
          <MessageSquare className="h-16 w-16 text-smoke-700" strokeWidth={1} aria-hidden="true" />
          <h3 className="mt-8 font-display text-[1.75rem] leading-tight text-bone-100">
            No messages{" "}
            <em className="font-editorial italic font-light text-champagne-400">yet.</em>
          </h3>
          <p className="mt-4 font-editorial italic text-body-lg text-bone-200 max-w-[420px] leading-snug">
            A conversation appears after you or a practitioner sends the first note.
          </p>
        </section>
      ) : (
        <section className="border-t border-l border-smoke-700">
          {conversations.map((conversation) => {
            const name =
              `${conversation.otherParticipant.firstName} ${conversation.otherParticipant.lastName}`.trim() ||
              "Faineant member";
            return (
              <article
                key={conversation.id}
                className="grid grid-cols-1 sm:grid-cols-[minmax(160px,0.7fr)_1fr_auto] gap-3 sm:gap-6 border-r border-b border-smoke-700 bg-smoke-900 px-5 py-6"
              >
                <h3 className="font-display text-[1.15rem] text-bone-100">{name}</h3>
                <p className="font-editorial italic text-body-lg text-bone-200 line-clamp-2">
                  {conversation.lastMessage?.text ?? "Conversation opened."}
                </p>
                <time className="font-mono text-mono uppercase tracking-[0.12em] text-taupe-300 sm:text-right">
                  {conversation.lastMessage
                    ? messageTime(conversation.lastMessage.createdAt)
                    : "No messages"}
                </time>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
