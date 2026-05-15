/**
 * Email transport.
 *
 * Single entry point: `sendEmail(rendered, to)`. Templates come from
 * `email-templates.ts` — this module is only responsible for getting bytes onto
 * the wire via Resend.
 *
 * Behaviour in absence of `RESEND_API_KEY` (e.g. local dev without secrets, or
 * `NODE_ENV=test`): the call no-ops with a `console.info` line instead of
 * throwing. This keeps tests hermetic and lets contributors run the API
 * locally without provisioning Resend.
 */

import { Resend } from "resend";
import { env } from "../config/env";
import type { RenderedEmail } from "./email-templates";

export interface SendEmailResult {
  /** True when an actual provider call was made (vs. logged/no-op). */
  delivered: boolean;
  /** Resend message id when available. */
  id?: string;
}

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

export async function sendEmail(
  rendered: RenderedEmail,
  to: string,
): Promise<SendEmailResult> {
  const client = getClient();
  const from = `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`;

  if (!client || env.NODE_ENV === "test") {
    if (env.NODE_ENV !== "test") {
      console.info(
        `[email] (no transport) would send "${rendered.subject}" to ${to}`,
      );
    }
    return { delivered: false };
  }

  const response = await client.emails.send({
    from,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (response.error) {
    throw new Error(`Resend error: ${response.error.message}`);
  }

  return { delivered: true, id: response.data?.id };
}

/**
 * Reset the cached client. Test-only.
 */
export function __resetEmailClientForTests(): void {
  cachedClient = null;
}
