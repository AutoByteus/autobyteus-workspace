import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SetupVerificationCard from '../SetupVerificationCard.vue';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useMessagingVerificationStore } from '~/stores/messagingVerificationStore';

describe('SetupVerificationCard', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  it('renders verification checks and rerun action for target configuration blockers', async () => {
    const verificationStore = useMessagingVerificationStore();
    verificationStore.verificationByProvider.DISCORD.verificationChecks = [
      {
        key: 'gateway',
        label: 'Gateway connectivity',
        status: 'PASSED',
      },
      {
        key: 'launch_preset',
        label: 'Binding target configuration',
        status: 'FAILED',
        detail: 'Binding for peer peer-1 is missing a complete launch preset.',
      },
    ];
    verificationStore.verificationByProvider.DISCORD.verificationResult = {
      ready: false,
      checks: verificationStore.verificationByProvider.DISCORD.verificationChecks,
      blockers: [
        {
          code: 'LAUNCH_PRESET_NOT_READY',
          step: 'binding',
          message: 'Binding for peer peer-1 is missing a complete launch preset.',
          actions: [{ type: 'RERUN_VERIFICATION', label: 'Re-run Verification' }],
        },
      ],
      checkedAt: '2026-02-11T00:00:00.000Z',
    };

    const wrapper = mount(SetupVerificationCard, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="verification-check-launch_preset"]').text()).toContain('FAILED');
    expect(wrapper.get('[data-testid="verification-action-RERUN_VERIFICATION"]').exists()).toBe(true);
  });

  it('re-runs verification when action is clicked', async () => {
    const verificationStore = useMessagingVerificationStore();
    verificationStore.verificationByProvider.DISCORD.verificationChecks = [];
    verificationStore.verificationByProvider.DISCORD.verificationResult = {
      ready: false,
      checks: [],
      blockers: [
        {
          code: 'VERIFICATION_ERROR',
          step: 'verification',
          message: 'Verification failed',
          actions: [{ type: 'RERUN_VERIFICATION', label: 'Re-run Verification' }],
        },
      ],
      checkedAt: '2026-02-11T00:00:00.000Z',
    };
    const runSpy = vi
      .spyOn(verificationStore, 'runSetupVerification')
      .mockResolvedValue(verificationStore.verificationByProvider.DISCORD.verificationResult!);

    const wrapper = mount(SetupVerificationCard, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="verification-action-RERUN_VERIFICATION"]').trigger('click');

    expect(runSpy).toHaveBeenCalledTimes(1);
  });

  it('emits open-step from verification check and blocker controls', async () => {
    const providerScopeStore = useMessagingProviderScopeStore();
    providerScopeStore.initialize({
      whatsappBusinessEnabled: false,
      wechatModes: [],
      defaultWeChatMode: null,
      wechatPersonalEnabled: false,
      wecomAppEnabled: false,
      discordEnabled: true,
      discordAccountId: 'discord-acct-1',
      telegramEnabled: false,
      telegramAccountId: null,
    });
    providerScopeStore.setSelectedProvider('DISCORD');

    const verificationStore = useMessagingVerificationStore();
    verificationStore.verificationByProvider.DISCORD.verificationChecks = [
      {
        key: 'gateway',
        label: 'Gateway connectivity',
        status: 'FAILED',
      },
    ];
    verificationStore.verificationByProvider.DISCORD.verificationResult = {
      ready: false,
      checks: verificationStore.verificationByProvider.DISCORD.verificationChecks,
      blockers: [
        {
          code: 'BINDING_NOT_READY',
          step: 'binding',
          message: 'Binding missing.',
        },
      ],
      checkedAt: '2026-02-11T00:00:00.000Z',
    };

    const wrapper = mount(SetupVerificationCard, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="verification-open-step-gateway"]').trigger('click');
    await wrapper.get('[data-testid="verification-open-step-blocker-BINDING_NOT_READY"]').trigger('click');

    expect(wrapper.emitted('open-step')).toEqual([['gateway'], ['binding']]);
  });

  it('does not emit open-step when provider section can be focused directly', async () => {
    const verificationStore = useMessagingVerificationStore();
    verificationStore.verificationByProvider.DISCORD.verificationChecks = [
      {
        key: 'provider',
        label: 'Provider configuration',
        status: 'FAILED',
      },
    ];

    const scrollIntoView = vi.fn();
    const element = document.createElement('div');
    element.id = 'managed-provider-config-section';
    element.scrollIntoView = scrollIntoView;
    document.body.appendChild(element);

    const wrapper = mount(SetupVerificationCard, {
      global: {
        plugins: [pinia],
      },
    });
    await flushPromises();

    await wrapper.get('[data-testid="verification-open-step-provider"]').trigger('click');

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('open-step')).toBeFalsy();

    element.remove();
  });
});
