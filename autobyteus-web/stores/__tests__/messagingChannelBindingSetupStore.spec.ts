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
    targetTeamDefinitionId: '',
    launchPreset: {
      workspaceRootPath: '/tmp/workspace',
      llmModelIdentifier: 'gpt-test',
      runtimeKind: 'AUTOBYTEUS',
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY' as const,
      llmConfig: null,
    },
    teamLaunchPreset: {
      workspaceRootPath: '/tmp/team-workspace',
      llmModelIdentifier: 'gpt-team',
      runtimeKind: 'AUTOBYTEUS',
      autoExecuteTools: false,
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
        targetTeamDefinitionId: '',
        launchPreset: {
          workspaceRootPath: '',
          llmModelIdentifier: '',
          runtimeKind: '',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
        },
        teamLaunchPreset: {
          workspaceRootPath: '',
          llmModelIdentifier: '',
          runtimeKind: '',
          autoExecuteTools: false,
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

  it('requires TEAM bindings to select a team definition and preset', async () => {
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
        targetTeamDefinitionId: '',
        teamLaunchPreset: {
          workspaceRootPath: '',
          llmModelIdentifier: '',
          runtimeKind: '',
          autoExecuteTools: false,
          llmConfig: null,
        },
      }),
    ).rejects.toThrow('Binding validation failed');

    expect(store.fieldErrors.targetTeamDefinitionId).toBe('Team definition is required');
    expect(store.fieldErrors.workspaceRootPath).toBe('Workspace path is required');
    expect(store.fieldErrors.llmModelIdentifier).toBe('LLM model is required');
    expect(store.fieldErrors.runtimeKind).toBe('Runtime is required');
  });

  it('loads team definition options', async () => {
    const apolloMock = createApolloMock();
    apolloMock.query.mockResolvedValue({
      data: {
        externalChannelTeamDefinitionOptions: [
          {
            teamDefinitionId: 'team-definition-1',
            teamDefinitionName: 'Software Team',
            description: 'Release coordination team',
            coordinatorMemberName: 'lead',
            memberCount: 3,
          },
        ],
      },
      errors: [],
    });
    vi.mocked(getApolloClient).mockReturnValue(apolloMock as any);

    const store = useMessagingChannelBindingSetupStore();
    store.capabilities = {
      bindingCrudEnabled: true,
      reason: null,
      acceptedProviderTransportPairs: ['TELEGRAM:BUSINESS_API'],
    };

    const options = await store.loadTeamDefinitionOptions();

    expect(options).toHaveLength(1);
    expect(options[0]?.teamDefinitionName).toBe('Software Team');
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
          targetTeamDefinitionId: null,
          launchPreset: {
            workspaceRootPath: '/tmp/workspace',
            llmModelIdentifier: 'gpt-test',
            runtimeKind: 'AUTOBYTEUS',
            autoExecuteTools: false,
            skillAccessMode: 'PRELOADED_ONLY',
            llmConfig: null,
          },
          teamLaunchPreset: null,
          teamRunId: null,
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
    expect(binding.targetTeamDefinitionId).toBeNull();
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
            targetTeamDefinitionId: null,
            launchPreset: {
              workspaceRootPath: '/tmp/workspace',
              llmModelIdentifier: 'gpt-test',
              runtimeKind: 'AUTOBYTEUS',
              autoExecuteTools: false,
              skillAccessMode: 'PRELOADED_ONLY',
              llmConfig: null,
            },
            teamLaunchPreset: null,
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

  it('upserts TEAM binding and omits the launch preset payload', async () => {
    const apolloMock = createApolloMock();
    apolloMock.mutate.mockResolvedValue({
      data: {
        upsertExternalChannelBinding: {
          id: 'binding-team-1',
          provider: 'TELEGRAM',
          transport: 'BUSINESS_API',
          accountId: 'telegram-acct-1',
          peerId: '100200300',
          threadId: null,
          targetType: 'TEAM',
          targetAgentDefinitionId: null,
          targetTeamDefinitionId: 'team-definition-1',
          launchPreset: null,
          teamLaunchPreset: {
            workspaceRootPath: '/tmp/team-workspace',
            llmModelIdentifier: 'gpt-team',
            runtimeKind: 'AUTOBYTEUS',
            autoExecuteTools: false,
            llmConfig: null,
          },
          teamRunId: null,
          updatedAt: '2026-03-10T10:00:00.000Z',
        },
      },
      errors: [],
    });
    vi.mocked(getApolloClient).mockReturnValue(apolloMock as any);

    const store = useMessagingChannelBindingSetupStore();
    store.capabilities = {
      bindingCrudEnabled: true,
      reason: null,
      acceptedProviderTransportPairs: ['TELEGRAM:BUSINESS_API'],
    };

    const binding = await store.upsertBinding({
      ...createDraft(),
      provider: 'TELEGRAM',
      transport: 'BUSINESS_API',
      accountId: 'telegram-acct-1',
      peerId: '100200300',
      targetType: 'TEAM',
      targetAgentDefinitionId: '',
      targetTeamDefinitionId: 'team-definition-1',
      teamLaunchPreset: {
        workspaceRootPath: '/tmp/team-workspace',
        llmModelIdentifier: 'gpt-team',
        runtimeKind: 'AUTOBYTEUS',
        autoExecuteTools: false,
        llmConfig: null,
      },
    });

    expect(binding.targetType).toBe('TEAM');
    expect(binding.targetTeamDefinitionId).toBe('team-definition-1');
    expect(binding.launchPreset).toBeNull();
    expect(binding.teamLaunchPreset?.llmModelIdentifier).toBe('gpt-team');
    expect(apolloMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: {
            provider: 'TELEGRAM',
            transport: 'BUSINESS_API',
            accountId: 'telegram-acct-1',
            peerId: '100200300',
            threadId: null,
            targetType: 'TEAM',
            targetAgentDefinitionId: null,
            targetTeamDefinitionId: 'team-definition-1',
            launchPreset: null,
            teamLaunchPreset: {
              workspaceRootPath: '/tmp/team-workspace',
              llmModelIdentifier: 'gpt-team',
              runtimeKind: 'AUTOBYTEUS',
              autoExecuteTools: false,
              llmConfig: null,
            },
          },
        },
      }),
    );
  });
});
