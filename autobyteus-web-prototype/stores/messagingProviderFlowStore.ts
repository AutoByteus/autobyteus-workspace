import { defineStore } from 'pinia';
import { useMessagingChannelBindingSetupStore } from '~/stores/messagingChannelBindingSetupStore';
import { useMessagingProviderScopeStore } from '~/stores/messagingProviderScopeStore';
import { useMessagingVerificationStore } from '~/stores/messagingVerificationStore';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { MessagingProvider, SetupStepState } from '~/types/messaging';
import {
  providerRequiresPersonalSession,
  providerSessionLabel,
  providerTransport,
  resolveBindingScope,
} from '~/utils/messagingSetupScope';

function t(key: string, params?: Record<string, string | number>): string {
  return localizationRuntime.translate(key, params);
}

export const useMessagingProviderFlowStore = defineStore('messagingProviderFlowStore', {
  state: () => ({}),

  getters: {
    currentProvider(): MessagingProvider {
      const providerScopeStore = useMessagingProviderScopeStore();
      return providerScopeStore.selectedProvider;
    },

    stepStates(): SetupStepState[] {
      return this.stepStatesForProvider(this.currentProvider);
    },
  },

  actions: {
    providerStepOrder(provider: MessagingProvider): SetupStepState['key'][] {
      if (providerRequiresPersonalSession(provider)) {
        return ['personal_session', 'binding', 'verification'];
      }
      return ['binding', 'verification'];
    },

    stepStatesForProvider(provider: MessagingProvider): SetupStepState[] {
      const gatewayStore = useGatewaySessionSetupStore();
      const bindingStore = useMessagingChannelBindingSetupStore();
      const providerScopeStore = useMessagingProviderScopeStore();
      const verificationStore = useMessagingVerificationStore();
      const verificationState = verificationStore.verificationByProvider[provider];

      const requiresPersonalSession = providerRequiresPersonalSession(provider);
      const resolvedTransport = providerTransport(provider);
      const gatewaySnapshot = gatewayStore.getReadinessSnapshot();
      const bindingSnapshot = bindingStore.getReadinessSnapshotForScope(
        resolveBindingScope({
          provider,
          requiresPersonalSession,
          resolvedTransport,
          discordAccountId: providerScopeStore.discordAccountId,
          telegramAccountId: providerScopeStore.telegramAccountId,
          sessionAccountLabel: gatewayStore.session?.accountLabel || null,
        }),
      );

      const steps: SetupStepState[] = [];

      let personalSessionReady = true;
      if (requiresPersonalSession) {
        const sessionProviderMatches = gatewayStore.sessionProvider === provider;
        const sessionBlockedReason = gatewaySnapshot.personalSessionBlockedReason;

        let sessionStep: SetupStepState;
        if (!gatewaySnapshot.gatewayReady) {
          sessionStep = {
            key: 'personal_session',
            status: 'PENDING',
            detail: t('settings.messaging.flow.startGatewayRuntimeFirst'),
          };
          personalSessionReady = false;
        } else if (!sessionProviderMatches) {
          sessionStep = {
            key: 'personal_session',
            status: 'PENDING',
            detail: t('settings.messaging.flow.startPersonalSessionStep', {
              provider: providerSessionLabel(provider),
            }),
          };
          personalSessionReady = false;
        } else if (gatewaySnapshot.personalSessionReady) {
          sessionStep = {
            key: 'personal_session',
            status: 'READY',
          };
          personalSessionReady = true;
        } else if (sessionBlockedReason) {
          sessionStep = {
            key: 'personal_session',
            status: 'BLOCKED',
            detail: sessionBlockedReason,
          };
          personalSessionReady = false;
        } else {
          sessionStep = {
            key: 'personal_session',
            status: 'PENDING',
          };
          personalSessionReady = false;
        }

        steps.push(sessionStep);
      }

      const bindingPrerequisitesReady = gatewaySnapshot.gatewayReady && personalSessionReady;
      let bindingStep: SetupStepState;

      if (!gatewaySnapshot.gatewayReady) {
        bindingStep = {
          key: 'binding',
          status: 'PENDING',
          detail: t('settings.messaging.flow.startGatewayRuntimeFirst'),
        };
      } else if (!personalSessionReady) {
        bindingStep = {
          key: 'binding',
          status: 'PENDING',
          detail: t('settings.messaging.flow.completeSessionStepFirst'),
        };
      } else {
        bindingStep = {
          key: 'binding',
          status: !bindingSnapshot.capabilityEnabled
            ? 'BLOCKED'
            : bindingSnapshot.hasBindings
              ? 'READY'
              : bindingSnapshot.bindingError
                ? 'BLOCKED'
                : 'PENDING',
          detail:
            bindingSnapshot.capabilityBlockedReason ||
            bindingSnapshot.bindingError ||
            (!bindingSnapshot.hasBindings
              ? t('settings.messaging.flow.noBindingFoundForSelectedProviderScope')
              : undefined),
        };
      }
      steps.push(bindingStep);

      const verificationPrerequisitesReady =
        bindingPrerequisitesReady && bindingStep.status === 'READY';

      let verificationStep: SetupStepState;
      if (!verificationPrerequisitesReady) {
        verificationStep = {
          key: 'verification',
          status: 'PENDING',
          detail: t('settings.messaging.flow.completePreviousStepsFirst'),
        };
      } else {
        verificationStep = {
          key: 'verification',
          status: verificationState.verificationResult?.ready
            ? 'DONE'
            : verificationState.verificationResult && !verificationState.verificationResult.ready
              ? 'BLOCKED'
              : verificationState.verificationError
                ? 'BLOCKED'
                : 'PENDING',
          detail:
            verificationState.verificationError ||
            (verificationState.verificationResult && !verificationState.verificationResult.ready
              ? t('settings.messaging.flow.blockersFound', {
                  count: verificationState.verificationResult.blockers.length,
                })
              : undefined),
        };
      }
      steps.push(verificationStep);

      return steps;
    },
  },
});
