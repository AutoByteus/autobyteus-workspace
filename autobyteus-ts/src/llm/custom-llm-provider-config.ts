import { z } from 'zod';
import { LLMProvider } from './providers.js';

export const customLlmProviderRecordSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  providerType: z.literal(LLMProvider.OPENAI_COMPATIBLE),
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
});

export type CustomLlmProviderRecord = z.infer<typeof customLlmProviderRecordSchema>;

export const customLlmProviderConfigFileSchema = z.object({
  version: z.literal(1),
  providers: z.array(customLlmProviderRecordSchema),
});

export type CustomLlmProviderConfigFile = z.infer<typeof customLlmProviderConfigFileSchema>;

export const DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE: CustomLlmProviderConfigFile = {
  version: 1,
  providers: [],
};

export const parseCustomLlmProviderConfigFile = (
  value: unknown,
): CustomLlmProviderConfigFile => customLlmProviderConfigFileSchema.parse(value);
