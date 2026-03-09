import { defineStore } from 'pinia';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import type {
  ExternalChannelBindingModel,
  MessagingProvider,
  SetupBlocker,
  SetupVerificationCheck,
  SetupVerificationResult,
  VerificationCheckKey,
} from '~/types/messaging';
import {
  MESSAGING_PROVIDERS,
  providerRequiresPersonalSession,
  providerSessionLabel,
  providerTransport,
  resolveBindingScope,
} from '~/utils/messagingSetupScope';

interface ProviderVerificationState {
  verificationResult: SetupVerificationResult | null;
  verificationChecks: SetupVerificationCheck[];
  isVerifying: boolean;
  verificationError: string | null;
}

interface MessagingVerificationState {
  verificationByProvider: Record<MessagingProvider, ProviderVerificationState>;
}

function nowIsoString(): string {
  return new Date().toISOString();
}

function buildDefaultVerificationChecks(provider: MessagingProvider): SetupVerificationCheck[] {
  const requiresSession = providerRequiresPersonalSession(provider);

  return [
    { key: 'gateway', label: 'Gateway connectivity', status: 'PENDING' },
    {
      key: 'provider',
      label: requiresSession
        ? 'Provider configuration (not required)'
        : 'Provider configuration',
      status: 'PENDING',
    },
    {
      key: 'session',
      label: requiresSession ? 'Session readiness' : 'Session readiness (not required)',
      status: 'PENDING',
    },
    { key: 'binding', label: 'Scoped channel binding', status: 'PENDING' },
    { key: 'launch_preset', label: 'Binding launch preset', status: 'PENDING' },
  ];
}

function createProviderVerificationState(provider: MessagingProvider): ProviderVerificationState {
  return {
    verificationResult: null,
    verificationChecks: buildDefaultVerificationChecks(provider),
    isVerifying: false,
    verificationError: null,
  };
}

function createVerificationStateByProvider(): Record<MessagingProvider, ProviderVerificationState> {
  return {
    WHATSAPP: createProviderVerificationState('WHATSAPP'),
    WECHAT: createProviderVerificationState('WECHAT'),
    WECOM: createProviderVerificationState('WECOM'),
    DISCORD: createProviderVerificationState('DISCORD'),
    TELEGRAM: createProviderVerificationState('TELEGRAM'),
  };
}

function resolveBindingWithInvalidLaunchPreset(
  bindings: ExternalChannelBindingModel[],
): ExternalChannelBindingModel | null {
  for (const binding of bindings) {
    const preset = binding.launchPreset;
    if (
      !binding.targetAgentDefinitionId?.trim() ||
      !preset ||
      !preset.workspaceRootPath.trim() ||
      !preset.llmModelIdentifier.trim() ||
      !preset.runtimeKind.trim()
    ) {
      return binding;
    }
  }
  return null;
}

function providerVerificationLabel(provider: MessagingProvider): string {
  switch (provider) {
    case 'WHATSAPP':
      return 'WhatsApp Business';
    case 'WECOM':
      return 'WeCom App';
    case 'DISCORD':
      return 'Discord Bot';
    case 'TELEGRAM':
      return 'Telegram Bot';
    case 'WECHAT':
      return 'WeChat Personal';
    default:
      return provider;
  }
}

export const useMessagingVerificationStore = defineStore('messagingVerificationStore', {
  state: (): MessagingVerificationState => ({
    verificationByProvider: createVerificationStateByProvider(),
  }),

  getters: {
    currentProvider(): MessagingProvider {
      const providerScopeStore = useMessagingProviderScopeStore();
      return providerScopeStore.selectedProvider;
    },

    verificationResult(): SetupVerificationResult | null {
      return this.verificationByProvider[this.currentProvider].verificationResult;
    },

    verificationChecks(): SetupVerificationCheck[] {
      return this.verificationByProvider[this.currentProvider].verificationChecks;
    },

    isVerifying(): boolean {
      return this.verificationByProvider[this.currentProvider].isVerifying;
    },

    verificationError(): string | null {
      return this.verificationByProvider[this.currentProvider].verificationError;
    },
  },

  actions: {
    resetVerificationChecks(provider?: MessagingProvider) {
      const providerKey = provider ?? this.currentProvider;
      this.verificationByProvider[providerKey].verificationChecks =
        buildDefaultVerificationChecks(providerKey);
      this.verificationByProvider[providerKey].verificationError = null;
    },

    setVerificationCheckStatusForProvider(
      provider: MessagingProvider,
      key: VerificationCheckKey,
      status: SetupVerificationCheck['status'],
      detail?: string,
    ) {
      const currentTime = nowIsoString();
      const existing = this.verificationByProvider[provider].verificationChecks.find(
        (item) => item.key === key,
      );
      if (!existing) {
        return;
      }
      existing.status = status;
      existing.detail = detail;
      if (status === 'RUNNING') {
        existing.startedAt = currentTime;
        existing.completedAt = undefined;
        return;
      }
      if (!existing.startedAt) {
        existing.startedAt = currentTime;
      }
      existing.completedAt = currentTime;
    },

    setVerificationResultForProvider(provider: MessagingProvider, result: SetupVerificationResult) {
      this.verificationByProvider[provider].verificationResult = result;
      this.verificationByProvider[provider].verificationChecks = result.checks.map((check) => ({
        ...check,
      }));
    },

    clearVerificationResultForProvider(provider: MessagingProvider) {
      this.verificationByProvider[provider].verificationResult = null;
      this.verificationByProvider[provider].verificationError = null;
      this.verificationByProvider[provider].verificationChecks = buildDefaultVerificationChecks(provider);
    },

    async runSetupVerification(provider?: MessagingProvider): Promise<SetupVerificationResult> {
      const providerKey = provider ?? this.currentProvider;
      const verificationState = this.verificationByProvider[providerKey];
      verificationState.isVerifying = true;
      verificationState.verificationError = null;
      this.resetVerificationChecks(providerKey);

      try {
        const gatewayStore = useGatewaySessionSetupStore();
        const bindingStore = useMessagingChannelBindingSetupStore();
        const providerScopeStore = useMessagingProviderScopeStore();
        const blockers: SetupBlocker[] = [];
        const requiresPersonalSession = providerRequiresPersonalSession(providerKey);

        const bindingScope = resolveBindingScope({
          provider: providerKey,
          requiresPersonalSession,
          resolvedTransport: providerTransport(providerKey),
          discordAccountId: providerScopeStore.discordAccountId,
          telegramAccountId: providerScopeStore.telegramAccountId,
          sessionAccountLabel: gatewayStore.session?.accountLabel || null,
        });

        this.setVerificationCheckStatusForProvider(providerKey, 'gateway', 'RUNNING');
        await gatewayStore.refreshRuntimeReliabilityStatus({ silent: true });
        const gatewaySnapshot = gatewayStore.getReadinessSnapshot();
        if (gatewaySnapshot.gatewayReady) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'gateway',
            'PASSED',
            'Gateway is reachable.',
          );
        } else {
          const message = gatewaySnapshot.gatewayBlockedReason || 'Gateway validation is required.';
          this.setVerificationCheckStatusForProvider(providerKey, 'gateway', 'FAILED', message);
          blockers.push({
            code:
              gatewaySnapshot.runtimeReliabilityState === 'CRITICAL_LOCK_LOST'
                ? 'GATEWAY_RUNTIME_CRITICAL'
                : 'GATEWAY_UNREACHABLE',
            step: 'gateway',
            message,
            actions: [{ type: 'RERUN_VERIFICATION', label: 'Re-run Verification' }],
          });
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'provider', 'RUNNING');
        if (requiresPersonalSession) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'provider',
            'SKIPPED',
            'Provider configuration is handled through the personal session flow.',
          );
        } else {
          const providerStatus = gatewayStore.providerStatusByProvider[providerKey];
          const providerLabel = providerVerificationLabel(providerKey);
          const accountId = providerStatus?.accountId?.trim();

          if (providerStatus?.effectivelyEnabled) {
            this.setVerificationCheckStatusForProvider(
              providerKey,
              'provider',
              'PASSED',
              accountId
                ? `${providerLabel} is configured for account ${accountId}.`
                : `${providerLabel} is configured and enabled.`,
            );
          } else {
            const providerMessage =
              providerStatus?.blockedReason ||
              (providerStatus?.configured
                ? `${providerLabel} is saved but still disabled.`
                : `Save ${providerLabel} configuration above before verification.`);

            this.setVerificationCheckStatusForProvider(
              providerKey,
              'provider',
              'FAILED',
              providerMessage,
            );
            blockers.push({
              code: 'PROVIDER_NOT_READY',
              step: 'gateway',
              message: providerMessage,
              actions: [{ type: 'RERUN_VERIFICATION', label: 'Re-run Verification' }],
            });
          }
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'session', 'RUNNING');
        if (!requiresPersonalSession) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'session',
            'SKIPPED',
            'Session check is not required for selected provider.',
          );
        } else if (gatewayStore.sessionProvider !== providerKey) {
          const message = `Start a ${providerSessionLabel(providerKey)} personal session before verification.`;
          this.setVerificationCheckStatusForProvider(providerKey, 'session', 'FAILED', message);
          blockers.push({
            code: 'SESSION_NOT_READY',
            step: 'personal_session',
            message,
            actions: [{ type: 'RERUN_VERIFICATION', label: 'Re-run Verification' }],
          });
        } else if (gatewaySnapshot.personalSessionReady) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'session',
            'PASSED',
            'Personal session is active.',
          );
        } else {
          const sessionReason =
            gatewaySnapshot.personalSessionBlockedReason ||
            'Start and activate a personal session before verification.';
          const isPersonalModeIssue = sessionReason.toLowerCase().includes('personal mode');
          this.setVerificationCheckStatusForProvider(providerKey, 'session', 'FAILED', sessionReason);
          blockers.push({
            code: isPersonalModeIssue ? 'PERSONAL_MODE_DISABLED' : 'SESSION_NOT_READY',
            step: 'personal_session',
            message: sessionReason,
            actions: [{ type: 'RERUN_VERIFICATION', label: 'Re-run Verification' }],
          });
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'binding', 'RUNNING');
        const bindingSnapshot = bindingStore.getReadinessSnapshotForScope(bindingScope);
        const scopedBindings = bindingStore.bindingsForScope(bindingScope);
        if (!bindingSnapshot.capabilityEnabled) {
          const message =
            bindingSnapshot.capabilityBlockedReason ||
            'Server binding setup APIs are currently unavailable.';
          this.setVerificationCheckStatusForProvider(providerKey, 'binding', 'FAILED', message);
          blockers.push({
            code: 'SERVER_BINDING_API_UNAVAILABLE',
            step: 'binding',
            message,
          });
        } else if (!bindingSnapshot.hasBindings) {
          const message =
            bindingSnapshot.bindingError || 'At least one binding is required for selected provider.';
          this.setVerificationCheckStatusForProvider(providerKey, 'binding', 'FAILED', message);
          blockers.push({
            code: 'BINDING_NOT_READY',
            step: 'binding',
            message,
          });
        } else {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'binding',
            'PASSED',
            `${bindingSnapshot.bindingsInScope} binding(s) found for selected scope.`,
          );
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'launch_preset', 'RUNNING');
        if (!bindingSnapshot.capabilityEnabled || !bindingSnapshot.hasBindings) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'launch_preset',
            'SKIPPED',
            'Launch preset check skipped because binding prerequisites are not ready.',
          );
        } else {
          const invalidBinding = resolveBindingWithInvalidLaunchPreset(scopedBindings);
          if (!invalidBinding) {
            this.setVerificationCheckStatusForProvider(
              providerKey,
              'launch_preset',
              'PASSED',
              'Binding stores a complete launch preset. Runtime will auto-start on first inbound message.',
            );
          } else {
            const agentDefinitionId = invalidBinding.targetAgentDefinitionId?.trim() || '(missing)';
            const message = `Binding for peer ${invalidBinding.peerId} is missing a complete launch preset for agent definition ${agentDefinitionId}.`;
            this.setVerificationCheckStatusForProvider(
              providerKey,
              'launch_preset',
              'FAILED',
              message,
            );
            blockers.push({
              code: 'LAUNCH_PRESET_NOT_READY',
              step: 'binding',
              message,
              actions: [{ type: 'RERUN_VERIFICATION', label: 'Re-run Verification' }],
            });
          }
        }

        const result: SetupVerificationResult = {
          ready: blockers.length === 0,
          blockers,
          checks: verificationState.verificationChecks.map((check) => ({ ...check })),
          checkedAt: nowIsoString(),
        };

        verificationState.verificationResult = result;
        return result;
      } catch (error) {
        verificationState.verificationError =
          error instanceof Error ? error.message : 'Setup verification failed';

        const result: SetupVerificationResult = {
          ready: false,
          blockers: [
            {
              code: 'VERIFICATION_ERROR',
              step: 'verification',
              message: verificationState.verificationError,
            },
          ],
          checks: verificationState.verificationChecks.map((check) => ({ ...check })),
          checkedAt: nowIsoString(),
        };

        verificationState.verificationResult = result;
        return result;
      } finally {
        verificationState.isVerifying = false;
      }
    },

    resetAllProviderVerificationStates() {
      for (const provider of MESSAGING_PROVIDERS) {
        this.clearVerificationResultForProvider(provider);
      }
    },
  },
});
