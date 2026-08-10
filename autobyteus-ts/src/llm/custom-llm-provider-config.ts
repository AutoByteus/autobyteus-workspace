import { z } from 'zod';
import { LLMProvider } from './providers.js';
import {
  buildCustomProviderId,
  normalizeProviderName,
} from './custom-llm-provider-identity.js';

export const customLlmProviderRecordSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  providerType: z.literal(LLMProvider.OPENAI_COMPATIBLE),
  baseUrl: z.string().trim().min(1),
}).strict();

export type CustomLlmProviderRecord = z.infer<typeof customLlmProviderRecordSchema>;

export const customLlmProviderConfigFileSchema = z.object({
  version: z.literal(3),
  providers: z.array(customLlmProviderRecordSchema),
}).strict().superRefine((file, context) => {
  const canonicalNames = new Set<string>();
  const providerIds = new Set<string>();
  for (const [index, provider] of file.providers.entries()) {
    let expectedId: string;
    try {
      expectedId = buildCustomProviderId(provider.name);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providers', index, 'name'],
        message: 'CUSTOM_PROVIDER_NAME_INVALID',
      });
      continue;
    }
    if (provider.id !== expectedId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providers', index, 'id'],
        message: 'CUSTOM_PROVIDER_ID_MISMATCH',
      });
    }
    const canonicalName = normalizeProviderName(provider.name);
    if (canonicalNames.has(canonicalName)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providers', index, 'name'],
        message: 'CUSTOM_PROVIDER_NAME_CONFLICT',
      });
    }
    if (providerIds.has(provider.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providers', index, 'id'],
        message: 'CUSTOM_PROVIDER_ID_CONFLICT',
      });
    }
    canonicalNames.add(canonicalName);
    providerIds.add(provider.id);
  }
});

export type CustomLlmProviderConfigFile = z.infer<typeof customLlmProviderConfigFileSchema>;

export const DEFAULT_CUSTOM_LLM_PROVIDER_CONFIG_FILE: CustomLlmProviderConfigFile = {
  version: 3,
  providers: [],
};

export const parseCustomLlmProviderConfigFile = (
  value: unknown,
): CustomLlmProviderConfigFile => customLlmProviderConfigFileSchema.parse(value);
