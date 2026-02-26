import { z } from 'zod';

export const TokenUsageSchema = z.object({
  prompt_tokens: z.number().int(),
  completion_tokens: z.number().int(),
  total_tokens: z.number().int(),
  prompt_cost: z.number().optional().nullable(),
  completion_cost: z.number().optional().nullable(),
  total_cost: z.number().optional().nullable(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;
