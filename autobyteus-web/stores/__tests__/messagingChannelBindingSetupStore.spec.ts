import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(),
}));

function createApolloMock() {
  return {
    query: vi.fn(),
    mutate: vi.fn(),
  };
}

function createDraft() {
  return {
    provider: 'WHATSAPP' as const,
    transport: 'PERSONAL_SESSION' as const,
    accountId: 'acc-1',
    peerId: 'peer-1',
    threadId: null,
    targetType: 'AGENT' as const,
    targetAgentDefinitionId: 'agent-definition-1',
    launchPreset: {
      workspaceRootPath: '/tmp/workspace',
      llmModelIdentifier: 'gpt-test',
      runtimeKind: 'AUTOBYTEUS',
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY' as const,
      llmConfig: null,
    },
  };
}

describe('messagingChannelBindingSetupStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads capabilities and sets enabled state', async () => {
    const apolloMock = createApolloMock();
    apolloMock.query.mockResolvedValue({
      data: {
        externalChannelCapabilities: {
          bindingCrudEnabled: true,
          reason: null,
          acceptedProviderTransportPairs: [
            'WHATSAPP:BUSINESS_API',
            'WHATSAPP:PERSONAL_SESSION',
            'WECOM:BUSINESS_API',
            'WECHAT:PERSONAL_SESSION',
            'DISCORD:BUSINESS_API',
            'TELEGRAM:BUSINESS_API',
          ],
        },
      },
      errors: [],
    });
    vi.mocked(getApolloClient).mockReturnValue(apolloMock as any);

    const store = useMessagingChannelBindingSetupStore();
    const capabilities = await store.loadCapabilities();

    expect(capabilities.bindingCrudEnabled).toBe(true);
    expect(store.capabilityBlocked).toBe(false);
  });

  it('validates the definition-bound launch preset before upsert', async () => {
    const store = useMessagingChannelBindingSetupStore();
    store.capabilities = {
      bindingCrudEnabled: true,
      reason: null,
      acceptedProviderTransportPairs: ['WECOM:BUSINESS_API'],
    };

    await expect(
      store.upsertBinding({
        provider: 'WECOM',
        transport: 'BUSINESS_API',
        accountId: '',
        peerId: '',
        threadId: null,
        targetType: 'AGENT',
        targetAgentDefinitionId: '',
        launchPreset: {
          workspaceRootPath: '',
          llmModelIdentifier: '',
          runtimeKind: '',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
        },
      }),
    ).rejects.toThrow('Binding validation failed');

    expect(store.fieldErrors.accountId).toBe('Account ID is required');
    expect(store.fieldErrors.peerId).toBe('Peer ID is required');
    expect(store.fieldErrors.targetAgentDefinitionId).toBe('Agent definition is required');
    expect(store.fieldErrors.workspaceRootPath).toBe('Workspace path is required');
    expect(store.fieldErrors.llmModelIdentifier).toBe('LLM model is required');
    expect(store.fieldErrors.runtimeKind).toBe('Runtime is required');
  });

  it('blocks TELEGRAM TEAM targets before mutation request', async () => {
    const store = useMessagingChannelBindingSetupStore();
    store.capabilities = {
      bindingCrudEnabled: true,
      reason: null,
      acceptedProviderTransportPairs: ['TELEGRAM:BUSINESS_API'],
    };

    await expect(
      store.upsertBinding({
        ...createDraft(),
        provider: 'TELEGRAM',
        transport: 'BUSINESS_API',
        accountId: 'telegram-acct-1',
        peerId: '100200300',
        targetType: 'TEAM',
      }),
    ).rejects.toThrow('Binding validation failed');

    expect(store.fieldErrors.targetType).toBe(
      'Messaging bindings currently support AGENT targets only.',
    );
  });

  it('upserts binding and updates list with launch preset payload', async () => {
    const apolloMock = createApolloMock();
    apolloMock.mutate.mockResolvedValue({
      data: {
        upsertExternalChannelBinding: {
          id: 'binding-1',
          provider: 'WHATSAPP',
          transport: 'PERSONAL_SESSION',
          accountId: 'acc-1',
          peerId: 'peer-1',
          threadId: null,
          targetType: 'AGENT',
          targetAgentDefinitionId: 'agent-definition-1',
          launchPreset: {
            workspaceRootPath: '/tmp/workspace',
            llmModelIdentifier: 'gpt-test',
            runtimeKind: 'AUTOBYTEUS',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
          },
          updatedAt: '2026-02-09T10:00:00.000Z',
        },
      },
      errors: [],
    });
    vi.mocked(getApolloClient).mockReturnValue(apolloMock as any);

    const store = useMessagingChannelBindingSetupStore();
    store.capabilities = {
      bindingCrudEnabled: true,
      reason: null,
      acceptedProviderTransportPairs: ['WHATSAPP:PERSONAL_SESSION'],
    };

    const binding = await store.upsertBinding(createDraft());

    expect(binding.id).toBe('binding-1');
    expect(binding.targetAgentDefinitionId).toBe('agent-definition-1');
    expect(binding.launchPreset?.llmModelIdentifier).toBe('gpt-test');
    expect(store.bindings).toHaveLength(1);
    expect(apolloMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: {
            provider: 'WHATSAPP',
            transport: 'PERSONAL_SESSION',
            accountId: 'acc-1',
            peerId: 'peer-1',
            threadId: null,
            targetType: 'AGENT',
            targetAgentDefinitionId: 'agent-definition-1',
            launchPreset: {
              workspaceRootPath: '/tmp/workspace',
              llmModelIdentifier: 'gpt-test',
              runtimeKind: 'AUTOBYTEUS',
              autoExecuteTools: false,
              skillAccessMode: 'PRELOADED_ONLY',
              llmConfig: null,
            },
          },
        },
      }),
    );
  });

  it('maps server validation issues to the new targetAgentDefinitionId field', async () => {
    const apolloMock = createApolloMock();
    apolloMock.mutate.mockResolvedValue({
      data: null,
      errors: [
        {
          message: 'Selected agent definition does not exist.',
          extensions: {
            code: 'TARGET_AGENT_DEFINITION_NOT_FOUND',
            field: 'targetAgentDefinitionId',
            detail: 'Agent definition was not found.',
          },
        },
      ],
    });
    vi.mocked(getApolloClient).mockReturnValue(apolloMock as any);

    const store = useMessagingChannelBindingSetupStore();
    store.capabilities = {
      bindingCrudEnabled: true,
      reason: null,
      acceptedProviderTransportPairs: ['WHATSAPP:PERSONAL_SESSION'],
    };

    await expect(store.upsertBinding(createDraft())).rejects.toThrow(
      'Agent definition was not found.',
    );
    expect(store.fieldErrors.targetAgentDefinitionId).toBe('Agent definition was not found.');
  });
});
