import { z } from 'zod';

export const ProviderNativeToolCallContextSchema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('gemini'),
    modelContent: z.record(z.string(), z.unknown()).optional(),
    functionCallPart: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    provider: z.literal('anthropic'),
    toolUseBlock: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    provider: z.literal('mistral'),
    toolCall: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    provider: z.literal('ollama'),
    toolCall: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    provider: z.literal('openai_responses'),
    functionCallItem: z.record(z.string(), z.unknown()).optional(),
    responseOutputItems: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
]);

export type ProviderNativeToolCallContext = z.infer<typeof ProviderNativeToolCallContextSchema>;
