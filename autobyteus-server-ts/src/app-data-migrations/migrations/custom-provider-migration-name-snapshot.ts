import fs from 'node:fs/promises';
import path from 'node:path';
import {
  normalizeProviderName,
  parseCustomLlmProviderConfigFile,
} from 'autobyteus-ts';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import { normalizeOpenAICompatibleEndpointBaseUrl } from 'autobyteus-ts/llm/openai-compatible-endpoint-discovery.js';
import { z } from 'zod';
import { appConfigProvider } from '../../config/app-config-provider.js';

const historicalRecordSchema = z.object({
  id: z.string().regex(/^provider_[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1),
  providerType: z.literal(LLMProvider.OPENAI_COMPATIBLE),
  baseUrl: z.string().trim().min(1),
}).strict();

export const customProviderV2MigrationFileSchema = z.object({
  version: z.literal(2),
  providers: z.array(historicalRecordSchema),
}).strict().superRefine((file, context) => {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const [index, provider] of file.providers.entries()) {
    try {
      normalizeOpenAICompatibleEndpointBaseUrl(provider.baseUrl);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providers', index, 'baseUrl'],
        message: 'CUSTOM_PROVIDER_V2_BASE_URL_INVALID',
      });
    }
    const canonicalName = normalizeProviderName(provider.name);
    if (ids.has(provider.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providers', index, 'id'],
        message: 'CUSTOM_PROVIDER_V2_DUPLICATE_ID',
      });
    }
    if (names.has(canonicalName)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['providers', index, 'name'],
        message: 'CUSTOM_PROVIDER_V2_DUPLICATE_NAME',
      });
    }
    ids.add(provider.id);
    names.add(canonicalName);
  }
});

export type CustomProviderV2MigrationFile = z.infer<typeof customProviderV2MigrationFileSchema>;
export type CustomProviderMigrationNameSnapshot = { id: string; name: string };

export class CustomProviderMigrationNameSnapshotReader {
  private readonly filePath: string;

  constructor(appDataDir: string = appConfigProvider.config.getAppDataDir()) {
    this.filePath = path.join(appDataDir, 'llm', 'custom-llm-providers.json');
  }

  async read(): Promise<CustomProviderMigrationNameSnapshot[]> {
    let rawText: string;
    try {
      rawText = await fs.readFile(this.filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new Error('CUSTOM_PROVIDER_MIGRATION_NAME_SNAPSHOT_INVALID');
    }

    try {
      const raw = JSON.parse(rawText) as { version?: unknown };
      const parsed = raw?.version === 2
        ? customProviderV2MigrationFileSchema.parse(raw)
        : parseCustomLlmProviderConfigFile(raw);
      return parsed.providers.map(({ id, name }) => ({ id, name }));
    } catch {
      throw new Error('CUSTOM_PROVIDER_MIGRATION_NAME_SNAPSHOT_INVALID');
    }
  }
}
