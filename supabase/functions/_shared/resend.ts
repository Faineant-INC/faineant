import type { RenderedEmail } from "./email-templates.ts";

export async function sendEmail(
  apiKey: string, from: string, to: string, rendered: RenderedEmail, idempotencyKey: string,
): Promise<{ id?: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from, to, subject: rendered.subject, html: rendered.html, text: rendered.text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
  return await res.json();
}
