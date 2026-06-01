const WORDMARK_URL = "https://faineantapp.com/brand/faineant-wordmark-black.png";

export interface RenderedEmail { subject: string; html: string; text: string; }

const escapeHtml = (v: string): string =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

function shell(eyebrow: string, headline: string, body: string): string {
  return `<div style="background:#f3ede1;padding:48px;max-width:680px;margin:0 auto;">
  <div style="text-align:center;padding-bottom:32px;border-bottom:1px solid #d8d2c4;">
    <img src="${WORDMARK_URL}" height="32" alt="FAINEANT" /></div>
  <div style="padding:48px 0;">
    <span style="font-family:Inter,sans-serif;font-size:11px;letter-spacing:0.32em;text-transform:uppercase;color:#7a6f5e;">${eyebrow}</span>
    <h1 style="font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:42px;letter-spacing:-0.04em;line-height:0.98;color:#0e0d0c;margin:24px 0;">${headline}</h1>
    ${body}</div>
  <div style="background:#ede4d4;padding:24px 48px;font-family:Geist Mono,monospace;font-size:10px;color:#5a5240;text-align:center;letter-spacing:0.04em;">© FAINEANT · CHICAGO · 2026<br>NOTHING URGENT</div>
</div>`;
}
const para = (t: string) =>
  `<p style="font-family:'Cormorant Garamond',serif;font-style:italic;font-size:18px;line-height:1.5;color:#3d352c;">${t}</p>`;

export function bookingConfirmationEmail(v: {
  reservationId: string; firstName: string; practitionerName: string;
  neighbourhood: string; whenHumanised: string;
}): RenderedEmail {
  const e = {
    reservationId: escapeHtml(v.reservationId), firstName: escapeHtml(v.firstName),
    practitionerName: escapeHtml(v.practitionerName), neighbourhood: escapeHtml(v.neighbourhood),
    whenHumanised: escapeHtml(v.whenHumanised),
  };
  return {
    subject: "It's booked. Don't get up early.",
    html: shell(`Reservation confirmed · ${e.reservationId}`,
      `It's <em style="font-family:'Cormorant Garamond',serif;font-weight:300;font-style:italic;color:#7a6f5e;">booked.</em><br>Don't get up early.`,
      `${para(`${e.firstName} — ${e.practitionerName} will be at your ${e.neighbourhood} door ${e.whenHumanised}. She brings everything but the chair.`)}${para("Cancellation is free until midnight tonight, then you owe nothing if you let her know two hours before.")}`),
    text: `${v.firstName} — your reservation (${v.reservationId}) is confirmed. ${v.practitionerName} will be at your ${v.neighbourhood} door ${v.whenHumanised}.\n\n— Faineant · Chicago · Nothing urgent.`,
  };
}

export function cancellationEmail(v: {
  firstName: string; reservationId: string; practitionerName: string;
}): RenderedEmail {
  const e = { firstName: escapeHtml(v.firstName), reservationId: escapeHtml(v.reservationId), practitionerName: escapeHtml(v.practitionerName) };
  return {
    subject: "No need to leave today either.",
    html: shell(`Reservation cancelled · ${e.reservationId}`,
      `No need to leave<br><em style="font-family:'Cormorant Garamond',serif;font-weight:300;font-style:italic;color:#7a6f5e;">today either.</em>`,
      `${para(`${e.firstName} — your reservation with ${e.practitionerName} (${e.reservationId}) has been cancelled. Nothing further is owed.`)}${para("When you are ready again, she will be too. The door stays the same.")}`),
    text: `${v.firstName} — your reservation with ${v.practitionerName} (${v.reservationId}) has been cancelled. Nothing further is owed.\n\n— Faineant · Chicago · Nothing urgent.`,
  };
}

export function welcomeEmail(v: { firstName: string }): RenderedEmail {
  const e = { firstName: escapeHtml(v.firstName) };
  return {
    subject: "An hour of nothing awaits.",
    html: shell("Welcome to FAINEANT",
      `An hour of <em style="font-family:'Cormorant Garamond',serif;font-weight:300;font-style:italic;color:#7a6f5e;">nothing</em><br>awaits.`,
      `${para(`${e.firstName} — welcome. Faineant is the part of your day where the practitioner comes to you and the rest of the world can wait.`)}${para("Browse when you feel like it. Book when you mean it. We will not rush you.")}`),
    text: `${v.firstName} — welcome to Faineant. The practitioner comes to you; the rest of the world can wait.\n\n— Faineant · Chicago · Nothing urgent.`,
  };
}
