import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMessagingChannelBindingOptionsStore } from '~/stores/messagingChannelBindingOptionsStore';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useMessagingVerificationStore } from '~/stores/messagingVerificationStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';

describe('messagingVerificationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('runSetupVerification returns ready=true when all prerequisites pass', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const optionsStore = useMessagingChannelBindingOptionsStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.setSessionProvider('WHATSAPP');
    gatewayStore.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'ACTIVE',
    };
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-1',
        provider: 'WHATSAPP',
        transport: 'PERSONAL_SESSION',
        accountId: 'Home',
        peerId: 'peer-1',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];
    optionsStore.targetOptions = [
      {
        targetType: 'AGENT',
        targetId: 'agent-1',
        displayName: 'Agent One',
        status: 'RUNNING',
      },
    ];
    vi.spyOn(optionsStore, 'loadTargetOptions').mockResolvedValue(optionsStore.targetOptions);

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(true);
    expect(result.blockers).toHaveLength(0);
  });

  it('runSetupVerification reports binding capability blocker when disabled', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.setSessionProvider('WHATSAPP');
    gatewayStore.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'ACTIVE',
    };

    bindingStore.capabilities.bindingCrudEnabled = false;
    bindingStore.capabilities.reason = 'Binding API unavailable';

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'SERVER_BINDING_API_UNAVAILABLE')).toBe(true);
  });

  it('runSetupVerification reports session blocker when personal session not active', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.setSessionProvider('WHATSAPP');
    gatewayStore.session = null;
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-1',
        provider: 'WHATSAPP',
        transport: 'PERSONAL_SESSION',
        accountId: 'acc-1',
        peerId: 'peer-1',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'SESSION_NOT_READY')).toBe(true);
  });

  it('keeps verification state isolated per provider', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const optionsStore = useMessagingChannelBindingOptionsStore();
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
    gatewayStore.setSessionProvider('WHATSAPP');
    gatewayStore.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'ACTIVE',
    };
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-whatsapp',
        provider: 'WHATSAPP',
        transport: 'PERSONAL_SESSION',
        accountId: 'Home',
        peerId: 'peer-1',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];
    optionsStore.targetOptions = [
      {
        targetType: 'AGENT',
        targetId: 'agent-1',
        displayName: 'Agent One',
        status: 'RUNNING',
      },
    ];
    vi.spyOn(optionsStore, 'loadTargetOptions').mockResolvedValue(optionsStore.targetOptions);

    providerScopeStore.setSelectedProvider('WHATSAPP');
    await verificationStore.runSetupVerification();
    expect(verificationStore.verificationResult?.ready).toBe(true);

    providerScopeStore.setSelectedProvider('DISCORD');
    expect(verificationStore.verificationResult).toBeNull();
    expect(verificationStore.verificationChecks.every((check) => check.status === 'PENDING')).toBe(
      true,
    );
  });

  it('reports runtime blocker with remediation actions when scoped target is inactive', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const optionsStore = useMessagingChannelBindingOptionsStore();
    const bindingStore = useMessagingChannelBindingSetupStore();
    const verificationStore = useMessagingVerificationStore();

    gatewayStore.gatewayStatus = 'READY';
    gatewayStore.setSessionProvider('WHATSAPP');
    gatewayStore.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'ACTIVE',
    };
    bindingStore.capabilities.bindingCrudEnabled = true;
    bindingStore.bindings = [
      {
        id: 'binding-1',
        provider: 'WHATSAPP',
        transport: 'PERSONAL_SESSION',
        accountId: 'Home',
        peerId: 'peer-1',
        threadId: null,
        targetType: 'AGENT',
        targetId: 'agent-1',
        updatedAt: '2026-02-09T12:00:00.000Z',
      },
    ];
    optionsStore.targetOptions = [
      {
        targetType: 'AGENT',
        targetId: 'agent-1',
        displayName: 'Agent One',
        status: 'STOPPED',
      },
    ];
    vi.spyOn(optionsStore, 'loadTargetOptions').mockResolvedValue(optionsStore.targetOptions);

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    const runtimeBlocker = result.blockers.find((item) => item.code === 'TARGET_RUNTIME_NOT_ACTIVE');
    expect(runtimeBlocker).toBeTruthy();
    expect(runtimeBlocker?.actions?.some((action) => action.type === 'OPEN_AGENT_RUNTIME')).toBe(
      true,
    );
    expect(result.checks.find((check) => check.key === 'target_runtime')?.status).toBe('FAILED');
  });

  it('reports gateway runtime critical blocker when reliability state is CRITICAL_LOCK_LOST', async () => {
    const gatewayStore = useGatewaySessionSetupStore();
    const verificationStore = useMessagingVerificationStore();
    const bindingStore = useMessagingChannelBindingSetupStore();

    gatewayStore.gatewayStatus = 'READY';
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
    vi.spyOn(gatewayStore, 'refreshRuntimeReliabilityStatus').mockResolvedValue(
      gatewayStore.runtimeReliabilityStatus,
    );

    bindingStore.capabilities.bindingCrudEnabled = true;

    const result = await verificationStore.runSetupVerification();

    expect(result.ready).toBe(false);
    expect(result.blockers.some((item) => item.code === 'GATEWAY_RUNTIME_CRITICAL')).toBe(true);
    expect(result.checks.find((check) => check.key === 'gateway')?.status).toBe('FAILED');
  });
});
