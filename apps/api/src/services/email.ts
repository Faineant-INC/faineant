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

export interface SendEmailOptions {
  /**
   * Resend idempotency key. Lets the same logical send be retried safely —
   * Resend de-dupes identical keys for 24h. Format: `<event-type>/<entity-id>`.
   */
  idempotencyKey?: string;
}

/** Max retries after the initial attempt for transient provider errors. */
const MAX_RETRIES = 3;
/** Base backoff in ms; doubles each attempt (250, 500, 1000...). */
const BACKOFF_BASE_MS = 250;

/**
 * Resend error names that are worth retrying. Validation/permission failures
 * are permanent and must not be retried.
 */
const TRANSIENT_ERROR_NAMES = new Set([
  "rate_limit_exceeded",
  "internal_server_error",
  "application_error",
]);

let cachedClient: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(env.RESEND_API_KEY);
  return cachedClient;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(
  rendered: RenderedEmail,
  to: string,
  options?: SendEmailOptions,
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

  const payload = {
    from,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  };
  const sendOptions = options?.idempotencyKey
    ? { idempotencyKey: options.idempotencyKey }
    : undefined;

  for (let attempt = 0; ; attempt++) {
    const response = await client.emails.send(payload, sendOptions);

    if (!response.error) {
      return { delivered: true, id: response.data?.id };
    }

    const transient = TRANSIENT_ERROR_NAMES.has(response.error.name);
    if (!transient || attempt >= MAX_RETRIES) {
      throw new Error(`Resend error: ${response.error.message}`);
    }

    await sleep(BACKOFF_BASE_MS * 2 ** attempt);
  }
}

/**
 * Reset the cached client. Test-only.
 */
export function __resetEmailClientForTests(): void {
  cachedClient = null;
}
