import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useMessagingVerificationStore } from '~/stores/messagingVerificationStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

function createBinding(overrides: Partial<ReturnType<typeof buildBinding>> = {}) {
  return {
    ...buildBinding(),
    ...overrides,
  };
}

function buildBinding() {
  return {
    id: 'binding-1',
    provider: 'WHATSAPP' as const,
    transport: 'BUSINESS_API' as const,
    accountId: 'whatsapp-business',
    peerId: 'peer-1',
    threadId: null,
    targetType: 'AGENT' as const,
    targetAgentDefinitionId: 'agent-definition-1',
    targetTeamDefinitionId: null,
    launchPreset: {
      workspaceRootPath: '/tmp/workspace',
      llmModelIdentifier: 'gpt-test',
      runtimeKind: 'AUTOBYTEUS',
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY' as const,
      llmConfig: null,
    },
    teamLaunchPreset: null,
    teamRunId: null,
    updatedAt: '2026-02-09T12:00:00.000Z',
  };
}

describe('messagingVerificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function stubGatewayHealthRefresh() {
    const gatewayStore = useGatewaySessionSetupStore();
    return vi
      .spyOn(gatewayStore, 'refreshRuntimeReliabilityStatus')
      .mockResolvedValue(gatewayStore.runtimeReliabilityStatus);
  }

  it('runSetupVerification returns ready=true when all prerequisites pass', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      WHATSAPP: {
        provider: 'WHATSAPP',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: null,
      },
    };
    stubGatewayHealthRefresh();
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [createBinding()];

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
    expect(result.checks.find((check) => check.key === 'launch_preset')?.status).toBe('PASSED');
  });

  it('runSetupVerification reports binding capability blocker when disabled', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      WHATSAPP: {
        provider: 'WHATSAPP',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: null,
      },
    };
    stubGatewayHealthRefresh();

    bindingStore.capabilities.bindingCrudEnabled = false;
    bindingStore.capabilities.reason = 'Binding API unavailable';

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'SERVER_BINDING_API_UNAVAILABLE')).toBe(true);
  });

  it('runSetupVerification reports session blocker when WeChat session is not active', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    const verificationStore = useMessagingVerificationStore();

    providerScopeStore.initialize({
      wechatModes: ['DIRECT_PERSONAL_SESSION'],
      defaultWeChatMode: 'DIRECT_PERSONAL_SESSION',
      wechatPersonalEnabled: true,
      wecomAppEnabled: true,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: false,
      telegramAccountId: null,
    });
    providerScopeStore.setSelectedProvider('WECHAT');

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      WECHAT: {
        provider: 'WECHAT',
        supported: false,
        selectedTransport: 'PERSONAL_SESSION',
        configured: false,
        effectivelyEnabled: false,
        blockedReason: null,
        accountId: null,
      },
    } as never;
    stubGatewayHealthRefresh();
    gatewayStore.setSessionProvider('WHATSAPP');
    gatewayStore.session = null;
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      createBinding({
        provider: 'WECHAT',
        transport: 'PERSONAL_SESSION',
        accountId: 'wechat-account',
      }),
    ];

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'SESSION_NOT_READY')).toBe(true);
  });

  it('keeps verification state isolated per provider', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    const verificationStore = useMessagingVerificationStore();

    providerScopeStore.initialize({
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wechatPersonalEnabled: false,
      wecomAppEnabled: true,
      discordEnabled: true,
      discordAccountId: 'discord-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      WHATSAPP: {
        provider: 'WHATSAPP',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: null,
      },
      DISCORD: {
        provider: 'DISCORD',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: 'discord-1',
      },
    };
    stubGatewayHealthRefresh();
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [createBinding()];

    providerScopeStore.setSelectedProvider('WHATSAPP');
    await verificationStore.runSetupVerification();
    expect(verificationStore.verificationResult?.ready).toBe(true);

    providerScopeStore.setSelectedProvider('DISCORD');
    expect(verificationStore.verificationResult).toBeNull();
    expect(verificationStore.verificationChecks.every((check) => check.status === 'PENDING')).toBe(
      true,
    );
  });

  it('reports launch preset blocker when a scoped binding is incomplete', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      WHATSAPP: {
        provider: 'WHATSAPP',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: null,
      },
    };
    stubGatewayHealthRefresh();
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      createBinding({
        targetAgentDefinitionId: null,
        targetTeamDefinitionId: null,
        launchPreset: null,
        teamLaunchPreset: null,
      }),
    ];

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'LAUNCH_PRESET_NOT_READY')).toBe(true);
    expect(result.checks.find((check) => check.key === 'launch_preset')?.status).toBe('FAILED');
  });

  it('passes target configuration verification for TEAM bindings with a team launch preset', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      TELEGRAM: {
        provider: 'TELEGRAM',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: 'telegram-acct-1',
      },
    };
    stubGatewayHealthRefresh();
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      createBinding({
        provider: 'TELEGRAM',
        transport: 'BUSINESS_API',
        accountId: 'telegram-acct-1',
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
      }),
    ];

    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.initialize({
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: true,
      telegramAccountId: 'telegram-acct-1',
    });
    providerScopeStore.setSelectedProvider('TELEGRAM');

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(true);
    expect(result.checks.find((check) => check.key === 'launch_preset')?.status).toBe('PASSED');
  });

  it('reports gateway runtime critical blocker when reliability state is CRITICAL_LOCK_LOST', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const verificationStore = useMessagingVerificationStore();
    const bindingStore = useMessagingChannelBindingSetupStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      WHATSAPP: {
        provider: 'WHATSAPP',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: true,
        effectivelyEnabled: true,
        blockedReason: null,
        accountId: null,
      },
    };
    gatewayStore.runtimeReliabilityStatus = {
      runtime: {
        state: 'CRITICAL_LOCK_LOST',
        criticalCode: 'CRITICAL_LOCK_LOST',
        updatedAt: '2026-02-12T00:00:00.000Z',
        workers: {
          inboundForwarder: { running: false, lastError: 'lock lost', lastErrorAt: null },
          outboundSender: { running: false, lastError: 'lock lost', lastErrorAt: null },
        },
        locks: {
          inbox: {
            ownerId: 'owner-inbox',
            held: false,
            lost: true,
            lastHeartbeatAt: null,
            lastError: 'lock lost',
          },
          outbox: {
            ownerId: 'owner-outbox',
            held: false,
            lost: true,
            lastHeartbeatAt: null,
            lastError: 'lock lost',
          },
        },
      },
      queue: {
        inboundDeadLetterCount: 0,
        inboundCompletedUnboundCount: 0,
        outboundDeadLetterCount: 0,
      },
    };
    stubGatewayHealthRefresh();
    bindingStore.capabilities.bindingCrudEnabled = true;

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'GATEWAY_RUNTIME_CRITICAL')).toBe(true);
    expect(result.checks.find((check) => check.key === 'gateway')?.status).toBe('FAILED');
  });

  it('fails verification when Telegram provider configuration is not ready', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const providerScopeStore = useMessagingProviderScopeStore();
    const verificationStore = useMessagingVerificationStore();

    providerScopeStore.initialize({
      wechatModes: ['WECOM_APP_BRIDGE'],
      defaultWeChatMode: 'WECOM_APP_BRIDGE',
      wechatPersonalEnabled: false,
      wecomAppEnabled: true,
      discordEnabled: false,
      discordAccountId: null,
      telegramEnabled: true,
      telegramAccountId: 'telegram-main',
    });
    providerScopeStore.setSelectedProvider('TELEGRAM');

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.providerStatusByProvider = {
      TELEGRAM: {
        provider: 'TELEGRAM',
        supported: true,
        selectedTransport: 'BUSINESS_API',
        configured: false,
        effectivelyEnabled: false,
        blockedReason: 'Telegram bot token and account id are required.',
        accountId: null,
      },
    };
    stubGatewayHealthRefresh();
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      createBinding({
        provider: 'TELEGRAM',
        accountId: 'telegram-main',
      }),
    ];

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'PROVIDER_NOT_READY')).toBe(true);
    expect(result.checks.find((check) => check.key === 'provider')?.status).toBe('FAILED');
  });
});
