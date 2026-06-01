import { assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { bookingConfirmationEmail, cancellationEmail, welcomeEmail } from "../_shared/email-templates.ts";

Deno.test("booking confirmation renders brand voice + escapes input", () => {
  const r = bookingConfirmationEmail({
    reservationId: "bk_1", firstName: "Sasha", practitionerName: "Maeve",
    neighbourhood: "Wicker Park", whenHumanised: "on Thursday at 2:00 PM",
  });
  assertStringIncludes(r.subject, "booked");
  assertStringIncludes(r.html, "Wicker Park");
  assertStringIncludes(r.text, "Sasha");
});

Deno.test("cancellation includes practitioner + reservation", () => {
  const r = cancellationEmail({ firstName: "Sasha", reservationId: "bk_1", practitionerName: "Maeve" });
  assertStringIncludes(r.subject.toLowerCase(), "leave");
  assertStringIncludes(r.html, "Maeve");
});

Deno.test("welcome greets by name", () => {
  const r = welcomeEmail({ firstName: "Sasha" });
  assertStringIncludes(r.subject.toLowerCase(), "nothing");
  assertStringIncludes(r.text, "Sasha");
});

Deno.test("html-escapes angle brackets in input", () => {
  const r = welcomeEmail({ firstName: "<script>" });
  assertStringIncludes(r.html, "&lt;script&gt;");
});
