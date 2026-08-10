import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import {
  CustomLlmProviderStore,
  CustomLlmProviderStoreError,
} from '../../../../src/llm-management/llm-providers/stores/custom-llm-provider-store.js';

const tempDirs: string[] = [];
const createStore = async (): Promise<{ dir: string; store: CustomLlmProviderStore }> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'custom-provider-store-'));
  tempDirs.push(dir);
  return { dir, store: new CustomLlmProviderStore(dir) };
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('CustomLlmProviderStore readable identity', () => {
  it('derives and persists a readable V3 provider ID under the store lock', async () => {
    const { dir, store } = await createStore();
    const created = await store.createProvider({
      name: 'Alibaba Cloud Token Plan',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://example.test/v1',
    });

    expect(created.id).toBe('provider_alibaba_cloud_token_plan');
    await expect(store.listProviders()).resolves.toEqual([created]);
    expect(JSON.parse(await fs.readFile(
      path.join(dir, 'llm', 'custom-llm-providers.json'),
      'utf8',
    ))).toMatchObject({ version: 3, providers: [{ id: created.id }] });
  });

  it('commits exactly one of two concurrent same-name creates', async () => {
    const { store } = await createStore();
    const input = {
      name: 'Alibaba Cloud',
      providerType: LLMProvider.OPENAI_COMPATIBLE as const,
      baseUrl: 'https://example.test/v1',
    };
    const results = await Promise.allSettled([
      store.createProvider(input),
      store.createProvider({ ...input, name: '  alibaba   cloud  ' }),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(({ status }) => status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(CustomLlmProviderStoreError);
    expect(rejected.reason.code).toBe('CUSTOM_PROVIDER_NAME_CONFLICT');
    await expect(store.listProviders()).resolves.toHaveLength(1);
  });

  it('rejects deterministic slug collisions and non-derivable names without suffixes', async () => {
    const { store } = await createStore();
    await store.createProvider({
      name: 'Acme.Cloud',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://example.test/v1',
    });
    await expect(store.createProvider({
      name: 'Acme Cloud',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://example.test/v2',
    })).rejects.toMatchObject({ code: 'CUSTOM_PROVIDER_ID_CONFLICT' });
    await expect(store.createProvider({
      name: '---',
      providerType: LLMProvider.OPENAI_COMPATIBLE,
      baseUrl: 'https://example.test/v3',
    })).rejects.toMatchObject({ code: 'CUSTOM_PROVIDER_NAME_INVALID' });
  });
});
