/**
 * FAINEANT transactional email templates.
 *
 * Voice: light surface (bone-100 ground, smoke-900 ink), wordmark image header,
 * Bricolage Grotesque headings + Cormorant Garamond italic accents,
 * Geist Mono footer. Per brand spec §3.1.
 *
 * NOTE: No email transport (nodemailer/sendgrid/resend/etc.) is wired up in
 * this codebase yet. These exports are structured data ready to feed whatever
 * sender we add later. Do not import these into routes until a transport
 * exists.
 */

export interface EmailFromAddress {
  /** Display name. Mixed case — never all-caps. */
  readonly name: 'Faineant';
  /** Sending address. */
  readonly email: 'noreply@faineant.co';
}

export const FAINEANT_FROM: EmailFromAddress = {
  name: 'Faineant',
  email: 'noreply@faineant.co',
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  from: EmailFromAddress;
}

const WORDMARK_URL = 'https://faineant.co/brand/faineant-wordmark-black.png';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

interface ShellOptions {
  eyebrow: string;
  headline: string;
  body: string;
}

function renderShell({ eyebrow, headline, body }: ShellOptions): string {
  return `<div style="background:#f3ede1; padding:48px; max-width:680px; margin:0 auto;">
  <div style="text-align:center; padding-bottom:32px; border-bottom:1px solid #d8d2c4;">
    <img src="${WORDMARK_URL}" height="32" alt="FAINEANT" />
  </div>
  <div style="padding:48px 0;">
    <span style="font-family:Inter,sans-serif; font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:#7a6f5e;">
      ${eyebrow}
    </span>
    <h1 style="font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:42px; letter-spacing:-0.04em; line-height:0.98; color:#0e0d0c; margin:24px 0;">
      ${headline}
    </h1>
    ${body}
  </div>
  <div style="background:#ede4d4; padding:24px 48px; font-family:Geist Mono,monospace; font-size:10px; color:#5a5240; text-align:center; letter-spacing:0.04em;">
    © FAINEANT · CHICAGO · 2026<br>NOTHING URGENT
  </div>
</div>`;
}

function paragraph(text: string): string {
  return `<p style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:18px; line-height:1.5; color:#3d352c;">
      ${text}
    </p>`;
}

// ─── Booking confirmation ───────────────────────────────────────────────────

export interface BookingConfirmationVars {
  reservationId: string;
  firstName: string;
  practitionerName: string;
  neighbourhood: string;
  whenHumanised: string;
}

export function bookingConfirmationEmail(vars: BookingConfirmationVars): RenderedEmail {
  const v = {
    reservationId: escapeHtml(vars.reservationId),
    firstName: escapeHtml(vars.firstName),
    practitionerName: escapeHtml(vars.practitionerName),
    neighbourhood: escapeHtml(vars.neighbourhood),
    whenHumanised: escapeHtml(vars.whenHumanised),
  };

  const headline = `It's <em style="font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#7a6f5e;">booked.</em><br>
      Don't get up early.`;

  const body = `${paragraph(
    `${v.firstName} — ${v.practitionerName} will be at your ${v.neighbourhood} door ${v.whenHumanised}. She brings everything but the chair.`,
  )}
    ${paragraph(
      'Cancellation is free until midnight tonight, then you owe nothing if you let her know two hours before.',
    )}`;

  return {
    subject: "It's booked. Don't get up early.",
    html: renderShell({
      eyebrow: `Reservation confirmed · ${v.reservationId}`,
      headline,
      body,
    }),
    text: `${vars.firstName} — your reservation (${vars.reservationId}) is confirmed. ${vars.practitionerName} will be at your ${vars.neighbourhood} door ${vars.whenHumanised}. She brings everything but the chair. Cancellation is free until midnight tonight, then you owe nothing if you let her know two hours before.\n\n— Faineant · Chicago · Nothing urgent.`,
    from: FAINEANT_FROM,
  };
}

// ─── Welcome ────────────────────────────────────────────────────────────────

export interface WelcomeVars {
  firstName: string;
}

export function welcomeEmail(vars: WelcomeVars): RenderedEmail {
  const v = { firstName: escapeHtml(vars.firstName) };

  const headline = `An hour of <em style="font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#7a6f5e;">nothing</em><br>
      awaits.`;

  const body = `${paragraph(
    `${v.firstName} — welcome. Faineant is the part of your day where the practitioner comes to you and the rest of the world can wait.`,
  )}
    ${paragraph(
      'Browse when you feel like it. Book when you mean it. We will not rush you.',
    )}`;

  return {
    subject: 'An hour of nothing awaits.',
    html: renderShell({
      eyebrow: 'Welcome to FAINEANT',
      headline,
      body,
    }),
    text: `${vars.firstName} — welcome to Faineant. The practitioner comes to you; the rest of the world can wait. Browse when you feel like it. Book when you mean it.\n\n— Faineant · Chicago · Nothing urgent.`,
    from: FAINEANT_FROM,
  };
}

// ─── Cancellation ───────────────────────────────────────────────────────────

export interface CancellationVars {
  firstName: string;
  reservationId: string;
  practitionerName: string;
}

export function cancellationEmail(vars: CancellationVars): RenderedEmail {
  const v = {
    firstName: escapeHtml(vars.firstName),
    reservationId: escapeHtml(vars.reservationId),
    practitionerName: escapeHtml(vars.practitionerName),
  };

  const headline = `No need to leave<br>
      <em style="font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#7a6f5e;">today either.</em>`;

  const body = `${paragraph(
    `${v.firstName} — your reservation with ${v.practitionerName} (${v.reservationId}) has been cancelled. Nothing further is owed.`,
  )}
    ${paragraph(
      'When you are ready again, she will be too. The door stays the same.',
    )}`;

  return {
    subject: 'No need to leave today either.',
    html: renderShell({
      eyebrow: `Reservation cancelled · ${v.reservationId}`,
      headline,
      body,
    }),
    text: `${vars.firstName} — your reservation with ${vars.practitionerName} (${vars.reservationId}) has been cancelled. Nothing further is owed. When you are ready again, she will be too.\n\n— Faineant · Chicago · Nothing urgent.`,
    from: FAINEANT_FROM,
  };
}

// ─── Password reset ─────────────────────────────────────────────────────────

export interface PasswordResetVars {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function passwordResetEmail(vars: PasswordResetVars): RenderedEmail {
  const v = {
    firstName: escapeHtml(vars.firstName),
    resetUrl: escapeHtml(vars.resetUrl),
    expiresInMinutes: vars.expiresInMinutes,
  };

  const headline = `A new <em style="font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#7a6f5e;">password,</em><br>
      at your leisure.`;

  const body = `${paragraph(
    `${v.firstName} — someone (presumably you) asked to reset the password on your Faineant account.`,
  )}
    <p style="font-family:Inter,sans-serif; font-size:14px; line-height:1.6; color:#3d352c; margin:24px 0;">
      <a href="${v.resetUrl}" style="display:inline-block; background:#0e0d0c; color:#f3ede1; padding:14px 28px; text-decoration:none; font-family:Inter,sans-serif; font-size:11px; letter-spacing:0.32em; text-transform:uppercase;">
        Choose a new password
      </a>
    </p>
    ${paragraph(
      `The link rests for ${v.expiresInMinutes} minutes. If you did not ask, ignore this — nothing changes.`,
    )}`;

  return {
    subject: 'A new password, at your leisure.',
    html: renderShell({
      eyebrow: 'Password reset',
      headline,
      body,
    }),
    text: `${vars.firstName} — someone (presumably you) asked to reset the password on your Faineant account. Open this link to choose a new one: ${vars.resetUrl}\n\nThe link rests for ${vars.expiresInMinutes} minutes. If you did not ask, ignore this — nothing changes.\n\n— Faineant · Chicago · Nothing urgent.`,
    from: FAINEANT_FROM,
  };
}

// ─── Email verification ─────────────────────────────────────────────────────

export interface EmailVerificationVars {
  firstName: string;
  verifyUrl: string;
  expiresInHours: number;
}

export function emailVerificationEmail(vars: EmailVerificationVars): RenderedEmail {
  const v = {
    firstName: escapeHtml(vars.firstName),
    verifyUrl: escapeHtml(vars.verifyUrl),
    expiresInHours: vars.expiresInHours,
  };

  const headline = `Confirm the <em style="font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#7a6f5e;">address.</em><br>
      That is all.`;

  const body = `${paragraph(
    `${v.firstName} — one quiet step. Confirm this is your address so the only mail you ever get from us is the kind you asked for.`,
  )}
    <p style="font-family:Inter,sans-serif; font-size:14px; line-height:1.6; color:#3d352c; margin:24px 0;">
      <a href="${v.verifyUrl}" style="display:inline-block; background:#0e0d0c; color:#f3ede1; padding:14px 28px; text-decoration:none; font-family:Inter,sans-serif; font-size:11px; letter-spacing:0.32em; text-transform:uppercase;">
        Confirm address
      </a>
    </p>
    ${paragraph(
      `The link rests for ${v.expiresInHours} hours. If this was not you, ignore it — nothing happens.`,
    )}`;

  return {
    subject: 'Confirm the address. That is all.',
    html: renderShell({
      eyebrow: 'Verify your email',
      headline,
      body,
    }),
    text: `${vars.firstName} — confirm this is your address so the only mail you ever get from us is the kind you asked for. Open this link: ${vars.verifyUrl}\n\nThe link rests for ${vars.expiresInHours} hours. If this was not you, ignore it.\n\n— Faineant · Chicago · Nothing urgent.`,
    from: FAINEANT_FROM,
  };
}

export const faineantEmailTemplates = {
  bookingConfirmation: bookingConfirmationEmail,
  welcome: welcomeEmail,
  cancellation: cancellationEmail,
  passwordReset: passwordResetEmail,
  emailVerification: emailVerificationEmail,
} as const;
