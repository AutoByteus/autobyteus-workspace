import { defineStore } from 'pinia';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
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

function t(key: string, params?: Record<string, string | number>): string {
  return localizationRuntime.translate(key, params);
}

function buildDefaultVerificationChecks(provider: MessagingProvider): SetupVerificationCheck[] {
  const requiresSession = providerRequiresPersonalSession(provider);

  return [
    { key: 'gateway', label: t('settings.messaging.verification.check.gateway'), status: 'PENDING' },
    {
      key: 'provider',
      label: requiresSession
        ? t('settings.messaging.verification.check.providerOptional')
        : t('settings.messaging.verification.check.providerRequired'),
      status: 'PENDING',
    },
    {
      key: 'session',
      label: requiresSession
        ? t('settings.messaging.verification.check.sessionRequired')
        : t('settings.messaging.verification.check.sessionOptional'),
      status: 'PENDING',
    },
    { key: 'binding', label: t('settings.messaging.verification.check.binding'), status: 'PENDING' },
    {
      key: 'launch_preset',
      label: t('settings.messaging.verification.check.launchPreset'),
      status: 'PENDING',
    },
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

function resolveBindingWithInvalidTargetConfiguration(
  bindings: ExternalChannelBindingModel[],
): ExternalChannelBindingModel | null {
  for (const binding of bindings) {
    if (binding.targetType === 'TEAM') {
      const preset = binding.teamLaunchPreset;
      if (
        !binding.targetTeamDefinitionId?.trim() ||
        !preset ||
        !preset.workspaceRootPath.trim() ||
        !preset.llmModelIdentifier.trim() ||
        !preset.runtimeKind.trim()
      ) {
        return binding;
      }
      continue;
    }

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
      return t('settings.messaging.providers.whatsappBusiness');
    case 'WECOM':
      return t('settings.messaging.providers.wecomApp');
    case 'DISCORD':
      return t('settings.messaging.providers.discordBot');
    case 'TELEGRAM':
      return t('settings.messaging.providers.telegramBot');
    case 'WECHAT':
      return t('settings.messaging.providers.wechatPersonal');
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
            t('settings.messaging.verification.gatewayReachable'),
          );
        } else {
          const message =
            gatewaySnapshot.gatewayBlockedReason ||
            t('settings.messaging.verification.gatewayValidationRequired');
          this.setVerificationCheckStatusForProvider(providerKey, 'gateway', 'FAILED', message);
          blockers.push({
            code:
              gatewaySnapshot.runtimeReliabilityState === 'CRITICAL_LOCK_LOST'
                ? 'GATEWAY_RUNTIME_CRITICAL'
                : 'GATEWAY_UNREACHABLE',
            step: 'gateway',
            message,
            actions: [{ type: 'RERUN_VERIFICATION', label: t('settings.messaging.verification.rerunVerification') }],
          });
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'provider', 'RUNNING');
        if (requiresPersonalSession) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'provider',
            'SKIPPED',
            t('settings.messaging.verification.providerHandledBySession'),
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
                ? t('settings.messaging.verification.providerConfiguredForAccount', {
                    provider: providerLabel,
                    accountId,
                  })
                : t('settings.messaging.verification.providerConfiguredAndEnabled', {
                    provider: providerLabel,
                  }),
            );
          } else {
            const providerMessage =
              providerStatus?.blockedReason ||
              (providerStatus?.configured
                ? t('settings.messaging.verification.providerSavedButDisabled', {
                    provider: providerLabel,
                  })
                : t('settings.messaging.verification.providerSaveBeforeVerification', {
                    provider: providerLabel,
                  }));

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
              actions: [{ type: 'RERUN_VERIFICATION', label: t('settings.messaging.verification.rerunVerification') }],
            });
          }
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'session', 'RUNNING');
        if (!requiresPersonalSession) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'session',
            'SKIPPED',
            t('settings.messaging.verification.sessionCheckNotRequired'),
          );
        } else if (gatewayStore.sessionProvider !== providerKey) {
          const message = t('settings.messaging.verification.startSessionBeforeVerification', {
            provider: providerSessionLabel(providerKey),
          });
          this.setVerificationCheckStatusForProvider(providerKey, 'session', 'FAILED', message);
          blockers.push({
            code: 'SESSION_NOT_READY',
            step: 'personal_session',
            message,
            actions: [{ type: 'RERUN_VERIFICATION', label: t('settings.messaging.verification.rerunVerification') }],
          });
        } else if (gatewaySnapshot.personalSessionReady) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'session',
            'PASSED',
            t('settings.messaging.verification.personalSessionActive'),
          );
        } else {
          const sessionReason =
            gatewaySnapshot.personalSessionBlockedReason ||
            t('settings.messaging.verification.startAndActivateSessionBeforeVerification');
          const isPersonalModeIssue = sessionReason.toLowerCase().includes('personal mode');
          this.setVerificationCheckStatusForProvider(providerKey, 'session', 'FAILED', sessionReason);
          blockers.push({
            code: isPersonalModeIssue ? 'PERSONAL_MODE_DISABLED' : 'SESSION_NOT_READY',
            step: 'personal_session',
            message: sessionReason,
            actions: [{ type: 'RERUN_VERIFICATION', label: t('settings.messaging.verification.rerunVerification') }],
          });
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'binding', 'RUNNING');
        const bindingSnapshot = bindingStore.getReadinessSnapshotForScope(bindingScope);
        const scopedBindings = bindingStore.bindingsForScope(bindingScope);
        if (!bindingSnapshot.capabilityEnabled) {
          const message =
            bindingSnapshot.capabilityBlockedReason ||
            t('settings.messaging.verification.bindingApiUnavailable');
          this.setVerificationCheckStatusForProvider(providerKey, 'binding', 'FAILED', message);
          blockers.push({
            code: 'SERVER_BINDING_API_UNAVAILABLE',
            step: 'binding',
            message,
          });
        } else if (!bindingSnapshot.hasBindings) {
          const message =
            bindingSnapshot.bindingError || t('settings.messaging.verification.bindingRequired');
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
            t('settings.messaging.verification.bindingsFound', {
              count: bindingSnapshot.bindingsInScope,
            }),
          );
        }

        this.setVerificationCheckStatusForProvider(providerKey, 'launch_preset', 'RUNNING');
        if (!bindingSnapshot.capabilityEnabled || !bindingSnapshot.hasBindings) {
          this.setVerificationCheckStatusForProvider(
            providerKey,
            'launch_preset',
            'SKIPPED',
            t('settings.messaging.verification.launchPresetSkipped'),
          );
        } else {
          const invalidBinding = resolveBindingWithInvalidTargetConfiguration(scopedBindings);
          if (!invalidBinding) {
            this.setVerificationCheckStatusForProvider(
              providerKey,
              'launch_preset',
              'PASSED',
              t('settings.messaging.verification.completeTargetConfiguration'),
            );
          } else {
            const message =
              invalidBinding.targetType === 'TEAM'
                ? t('settings.messaging.verification.teamBindingMissingTarget', {
                    peerId: invalidBinding.peerId,
                  })
                : t('settings.messaging.verification.agentBindingMissingPreset', {
                    peerId: invalidBinding.peerId,
                    agentDefinitionId:
                      invalidBinding.targetAgentDefinitionId?.trim() || '(missing)',
                  });
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
              actions: [{ type: 'RERUN_VERIFICATION', label: t('settings.messaging.verification.rerunVerification') }],
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
          error instanceof Error ? error.message : t('settings.messaging.verification.setupVerificationFailed');

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
