import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), available: vi.fn(), create: vi.fn(), secretResolver: vi.fn(), gemini: vi.fn() }));
vi.mock('autobyteus-ts', () => ({ LLMFactory: { createLLM: mocks.create, requiresGeminiRuntimeResolver: mocks.gemini } }));
vi.mock('../../../../src/config/app-config-provider.js', () => ({ appConfigProvider: { config: { get: mocks.get, setDurably: mocks.set } } }));
vi.mock('../../../../src/llm-management/services/model-availability-service.js', () => ({ getModelAvailabilityService: () => ({ ensureModelAvailable: mocks.available }) }));
vi.mock('../../../../src/secret-management/resolution/secret-management-provider-api-key-resolver.js', () => ({ createLlmProviderApiKeyResolver: mocks.secretResolver }));
vi.mock('../../../../src/llm-management/services/gemini-runtime-resolver-adapter.js', () => ({ createGeminiRuntimeResolver: vi.fn() }));
import { createCompactionLlm } from '../../../../src/agent-execution/compaction/compaction-llm-factory.js';
import { COMPACTION_MODEL_SETTINGS_KEY } from '../../../../src/config/compaction-model-settings.js';
beforeEach(() => vi.resetAllMocks());
describe('current parent compaction construction', () => {
  it('defaults without saving and obtains a fresh existing credential resolver for each actual parent', async () => {
    const first = vi.fn(), second = vi.fn();
    mocks.secretResolver.mockReturnValueOnce(first).mockReturnValueOnce(second);
    await createCompactionLlm({ parentModelIdentifier: 'parent-openai' });
    await createCompactionLlm({ parentModelIdentifier: 'parent-anthropic' });
    expect(mocks.get.mock.calls).toEqual([[COMPACTION_MODEL_SETTINGS_KEY], [COMPACTION_MODEL_SETTINGS_KEY]]);
    expect(mocks.available.mock.calls).toEqual([['parent-openai', 'LLM'], ['parent-anthropic', 'LLM']]);
    expect(mocks.create.mock.calls).toEqual([
      ['parent-openai', expect.any(Function), first, undefined], ['parent-anthropic', expect.any(Function), second, undefined],
    ]);
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it('leaves malformed current settings as a scoped use error, not a default write or legacy lookup', async () => {
    mocks.get.mockReturnValue('{malformed');
    await expect(createCompactionLlm({ parentModelIdentifier: 'parent' })).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.get).toHaveBeenCalledExactlyOnceWith(COMPACTION_MODEL_SETTINGS_KEY);
  });
});
