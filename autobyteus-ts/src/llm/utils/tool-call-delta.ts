import { z } from 'zod';

export const ToolCallDeltaSchema = z.object({
  index: z.number().int(),
  call_id: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  arguments_delta: z.string().optional().nullable(),
});

export type ToolCallDelta = z.infer<typeof ToolCallDeltaSchema>;
