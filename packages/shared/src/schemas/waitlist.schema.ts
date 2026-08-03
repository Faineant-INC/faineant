import { z } from "zod";
import { MARKETING_CONSENT_VERSION } from "../constants/marketing";

export const waitlistSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  source: z.string().max(64).optional(),
  referrer: z.string().max(512).optional(),
  marketingConsent: z.boolean().refine((value) => value, {
    message: "Choose the email marketing consent box to join the list.",
  }),
  consentVersion: z.literal(MARKETING_CONSENT_VERSION),
  // Honeypot: bots fill this; real users never see it. Must be empty.
  website: z.string().max(0).optional(),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
