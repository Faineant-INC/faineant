import { z } from "zod";

export const refundRequestSchema = z.object({
  amountInCents: z.number().int().positive().max(1_000_000).optional(),
  reason: z.string().trim().min(1).max(500).optional(),
});

export type RefundRequestInput = z.infer<typeof refundRequestSchema>;

export const earningsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type EarningsQueryInput = z.infer<typeof earningsQuerySchema>;
