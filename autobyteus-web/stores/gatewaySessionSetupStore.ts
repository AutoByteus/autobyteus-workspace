import { defineStore } from 'pinia';
import {
  DISABLE_MANAGED_MESSAGING_GATEWAY,
  ENABLE_MANAGED_MESSAGING_GATEWAY,
  SAVE_MANAGED_MESSAGING_GATEWAY_PROVIDER_CONFIG,
  UPDATE_MANAGED_MESSAGING_GATEWAY,
} from '~/graphql/mutations/managedMessagingGatewayMutations';
import {
  MANAGED_MESSAGING_GATEWAY_PEER_CANDIDATES,
  MANAGED_MESSAGING_GATEWAY_STATUS,
  MANAGED_MESSAGING_GATEWAY_WECOM_ACCOUNTS,
} from '~/graphql/queries/managedMessagingGatewayQueries';
import {
  createDefaultManagedProviderConfig,
  deriveManagedGatewayStepStatus,
  normalizeManagedGatewayError,
  normalizeManagedStatus,
  normalizeProviderConfig,
} from '~/stores/gatewaySessionSetup/managedGatewayStatus';
import type {
  GatewayDiscordPeerCandidatesModel,
  GatewayHealthModel,
  GatewayPersonalSessionModel,
  GatewayPersonalSessionQrModel,
  GatewayReadinessSnapshot,
  GatewayRuntimeReliabilityStatusModel,
  GatewayStepStatus,
  GatewayTelegramPeerCandidatesModel,
  GatewayWeComAccountModel,
  ManagedMessagingGatewayProviderConfigModel,
  ManagedMessagingGatewayProviderStatusModel,
  ManagedMessagingGatewayStatusModel,
  PersonalSessionProvider,
  SessionStatusAutoSyncState,
} from '~/types/messaging';
import { getApolloClient } from '~/utils/apolloClient';

interface GatewaySessionSetupState {
  gatewayStatus: GatewayStepStatus;
  gatewayError: string | null;
  gatewayHealth: GatewayHealthModel | null;
  runtimeReliabilityStatus: GatewayRuntimeReliabilityStatusModel | null;
  runtimeReliabilityError: string | null;
  isGatewayChecking: boolean;
  isGatewayMutating: boolean;
  isProviderConfigSaving: boolean;
  managedStatus: ManagedMessagingGatewayStatusModel | null;
  providerConfig: ManagedMessagingGatewayProviderConfigModel;
  providerStatusByProvider: Partial<
    Record<string, ManagedMessagingGatewayProviderStatusModel>
  >;
  isSessionLoading: boolean;
  sessionError: string | null;
  personalModeBlockedReason: string | null;
  qrExpiredAt: string | null;
  sessionProvider: PersonalSessionProvider;
  session: GatewayPersonalSessionModel | null;
  sessionStatusAutoSyncState: SessionStatusAutoSyncState;
  sessionStatusAutoSyncReason: string | null;
  sessionStatusAutoSyncSessionId: string | null;
  sessionStatusAutoSyncStartedAtMs: number | null;
  sessionStatusAutoSyncConsecutiveErrors: number;
  sessionStatusAutoSyncTimer: ReturnType<typeof setTimeout> | null;
}

export const useGatewaySessionSetupStore = defineStore('gatewaySessionSetupStore', {
  state: (): GatewaySessionSetupState => ({
    gatewayStatus: 'UNKNOWN',
    gatewayError: null,
    gatewayHealth: null,
    runtimeReliabilityStatus: null,
    runtimeReliabilityError: null,
    isGatewayChecking: false,
    isGatewayMutating: false,
    isProviderConfigSaving: false,
    managedStatus: null,
    providerConfig: createDefaultManagedProviderConfig(),
    providerStatusByProvider: {},
    isSessionLoading: false,
    sessionError: null,
    personalModeBlockedReason: null,
    qrExpiredAt: null,
    sessionProvider: 'WHATSAPP',
    session: null,
    sessionStatusAutoSyncState: 'idle',
    sessionStatusAutoSyncReason: null,
    sessionStatusAutoSyncSessionId: null,
    sessionStatusAutoSyncStartedAtMs: null,
    sessionStatusAutoSyncConsecutiveErrors: 0,
    sessionStatusAutoSyncTimer: null,
  }),

  getters: {
    gatewayReady: (state) => state.gatewayStatus === 'READY',
    personalSessionReady: () => false,
    sessionProviderLabel: (state) =>
      state.sessionProvider === 'WECHAT' ? 'WeChat' : 'WhatsApp',
  },

  actions: {
    clearSessionStatusSyncTimer() {
      if (this.sessionStatusAutoSyncTimer) {
        clearTimeout(this.sessionStatusAutoSyncTimer);
      }
      this.sessionStatusAutoSyncTimer = null;
    },

    stopSessionStatusAutoSync(reason = 'manual') {
      this.clearSessionStatusSyncTimer();
      this.sessionStatusAutoSyncReason = reason;
      this.sessionStatusAutoSyncState = reason === 'view_unmounted' ? 'stopped' : 'idle';
      this.sessionStatusAutoSyncSessionId = null;
      this.sessionStatusAutoSyncStartedAtMs = null;
      this.sessionStatusAutoSyncConsecutiveErrors = 0;
    },

    startSessionStatusAutoSync() {
      this.clearSessionStatusSyncTimer();
      this.sessionStatusAutoSyncState = 'idle';
      this.sessionStatusAutoSyncReason = 'unsupported';
    },

    async runSessionStatusSyncTick() {
      this.stopSessionStatusAutoSync('unsupported');
    },

    initializeFromConfig() {
      this.gatewayError = null;
    },

    setSessionProvider(provider: PersonalSessionProvider) {
      this.sessionProvider = provider;
    },

    async refreshManagedGatewayStatus(options?: { silent?: boolean }) {
      const runSilently = options?.silent === true;
      this.isGatewayChecking = true;
      if (!runSilently) {
        this.gatewayError = null;
      }

      try {
        const client = getApolloClient();
        const { data, errors } = await client.query({
          query: MANAGED_MESSAGING_GATEWAY_STATUS,
          fetchPolicy: 'network-only',
        });
        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }

        const status = normalizeManagedStatus(data?.managedMessagingGatewayStatus);
        this.applyManagedStatus(status);
        return status;
      } catch (error) {
        const message = normalizeManagedGatewayError(error);
        this.gatewayStatus = 'BLOCKED';
        this.gatewayError = message;
        if (!runSilently) {
          throw error;
        }
        return null;
      } finally {
        this.isGatewayChecking = false;
      }
    },

    async validateGatewayConnection() {
      return this.refreshManagedGatewayStatus();
    },

    async enableManagedGateway() {
      return this.runManagedMutation('enable', ENABLE_MANAGED_MESSAGING_GATEWAY, 'enableManagedMessagingGateway');
    },

    async disableManagedGateway() {
      return this.runManagedMutation('disable', DISABLE_MANAGED_MESSAGING_GATEWAY, 'disableManagedMessagingGateway');
    },

    async updateManagedGateway() {
      return this.runManagedMutation('update', UPDATE_MANAGED_MESSAGING_GATEWAY, 'updateManagedMessagingGateway');
    },

    async saveManagedGatewayProviderConfig(
      input?: Partial<ManagedMessagingGatewayProviderConfigModel>,
    ) {
      const nextConfig = normalizeProviderConfig({
        ...this.providerConfig,
        ...(input || {}),
      });
      this.isProviderConfigSaving = true;
      this.gatewayError = null;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate({
          mutation: SAVE_MANAGED_MESSAGING_GATEWAY_PROVIDER_CONFIG,
          variables: {
            input: nextConfig,
          },
        });
        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }

        const status = normalizeManagedStatus(
          data?.saveManagedMessagingGatewayProviderConfig,
        );
        this.applyManagedStatus(status);
        return status;
      } catch (error) {
        this.gatewayError = normalizeManagedGatewayError(error);
        throw error;
      } finally {
        this.isProviderConfigSaving = false;
      }
    },

    async refreshRuntimeReliabilityStatus(options?: { silent?: boolean }) {
      const runSilently = options?.silent === true;
      try {
        const status = await this.refreshManagedGatewayStatus({ silent: true });
        this.runtimeReliabilityStatus = status?.runtimeReliabilityStatus ?? null;
        this.runtimeReliabilityError = null;
        return this.runtimeReliabilityStatus;
      } catch (error) {
        this.runtimeReliabilityStatus = null;
        this.runtimeReliabilityError = normalizeManagedGatewayError(error);
        if (!runSilently) {
          throw error;
        }
        return null;
      }
    },

    async loadWeComAccounts(): Promise<GatewayWeComAccountModel[]> {
      try {
        const client = getApolloClient();
        const { data, errors } = await client.query({
          query: MANAGED_MESSAGING_GATEWAY_WECOM_ACCOUNTS,
          fetchPolicy: 'network-only',
        });
        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }
        const items = Array.isArray(data?.managedMessagingGatewayWeComAccounts)
          ? data.managedMessagingGatewayWeComAccounts
          : [];
        return items.map((item: Record<string, unknown>) => ({
          accountId: String(item.accountId ?? ''),
          label: String(item.label ?? ''),
          mode: item.mode === 'LEGACY' ? 'LEGACY' : 'APP',
        }));
      } catch (error) {
        this.gatewayError = normalizeManagedGatewayError(error);
        throw error;
      }
    },

    async loadPeerCandidates(
      provider: 'DISCORD' | 'TELEGRAM',
      options?: { includeGroups?: boolean; limit?: number },
    ): Promise<GatewayDiscordPeerCandidatesModel | GatewayTelegramPeerCandidatesModel> {
      try {
        const client = getApolloClient();
        const { data, errors } = await client.query({
          query: MANAGED_MESSAGING_GATEWAY_PEER_CANDIDATES,
          variables: {
            provider,
            includeGroups: options?.includeGroups ?? true,
            limit: options?.limit ?? 50,
          },
          fetchPolicy: 'network-only',
        });
        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }

        const response = data?.managedMessagingGatewayPeerCandidates;
        const normalized = {
          accountId:
            typeof response?.accountId === 'string' ? response.accountId : '',
          updatedAt:
            typeof response?.updatedAt === 'string'
              ? response.updatedAt
              : new Date().toISOString(),
          items: Array.isArray(response?.items)
            ? response.items.map((item: Record<string, unknown>) => ({
                peerId: String(item.peerId ?? ''),
                peerType: item.peerType === 'GROUP' ? 'GROUP' : 'USER',
                threadId:
                  typeof item.threadId === 'string' ? item.threadId : null,
                displayName:
                  typeof item.displayName === 'string' ? item.displayName : null,
                lastMessageAt: String(item.lastMessageAt ?? new Date().toISOString()),
              }))
            : [],
        };

        return normalized;
      } catch (error) {
        this.gatewayError = normalizeManagedGatewayError(error);
        throw error;
      }
    },

    async startPersonalSession(_accountLabel: string) {
      throw new Error('Personal sessions are not supported in the managed messaging flow.');
    },

    async attachToExistingSession(_sessionId: string): Promise<GatewayPersonalSessionModel> {
      throw new Error('Personal sessions are not supported in the managed messaging flow.');
    },

    async fetchPersonalSessionQr(_sessionId?: string): Promise<GatewayPersonalSessionQrModel | null> {
      throw new Error('Personal sessions are not supported in the managed messaging flow.');
    },

    async fetchPersonalSessionStatus(_sessionId?: string) {
      throw new Error('Personal sessions are not supported in the managed messaging flow.');
    },

    async stopPersonalSession() {
      throw new Error('Personal sessions are not supported in the managed messaging flow.');
    },

    getReadinessSnapshot(): GatewayReadinessSnapshot {
      const runtimeState = this.runtimeReliabilityStatus?.runtime.state ?? null;
      const runtimeCriticalReason =
        runtimeState === 'CRITICAL_LOCK_LOST'
          ? 'Managed messaging reliability lock ownership was lost. Restart the gateway to recover.'
          : null;
      const blockedReason =
        this.gatewayStatus === 'BLOCKED' ? this.gatewayError : runtimeCriticalReason;
      return {
        gatewayReady: this.gatewayStatus === 'READY' && !runtimeCriticalReason,
        gatewayBlockedReason: blockedReason,
        runtimeReliabilityState: runtimeState,
        runtimeReliabilityCriticalReason: runtimeCriticalReason,
        personalSessionReady: false,
        personalSessionBlockedReason: null,
      };
    },

    applyManagedStatus(status: ManagedMessagingGatewayStatusModel) {
      this.managedStatus = status;
      this.providerConfig = normalizeProviderConfig(status.providerConfig);
      this.providerStatusByProvider = status.providerStatusByProvider;
      this.runtimeReliabilityStatus = status.runtimeReliabilityStatus;
      this.runtimeReliabilityError =
        status.runtimeRunning || !status.enabled
          ? null
          : 'Managed messaging runtime is not running.';
      this.gatewayHealth = {
        status: status.runtimeRunning
          ? 'ok'
          : status.enabled
            ? 'degraded'
            : 'error',
        version: status.activeVersion ?? undefined,
        timestamp: new Date().toISOString(),
      };
      this.gatewayStatus = deriveManagedGatewayStepStatus(status);
      this.gatewayError =
        this.gatewayStatus === 'BLOCKED'
          ? status.lastError || status.message || 'Managed messaging is blocked.'
          : null;
      this.session = null;
      this.sessionError = null;
      this.personalModeBlockedReason = null;
      this.qrExpiredAt = null;
    },

    async runManagedMutation(
      _operation: 'enable' | 'disable' | 'update',
      mutation: unknown,
      responseKey:
        | 'enableManagedMessagingGateway'
        | 'disableManagedMessagingGateway'
        | 'updateManagedMessagingGateway',
    ) {
      this.isGatewayMutating = true;
      this.gatewayError = null;

      try {
        const client = getApolloClient();
        const { data, errors } = await client.mutate({
          mutation,
        });
        if (errors && errors.length > 0) {
          throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '));
        }
        const status = normalizeManagedStatus(data?.[responseKey]);
        this.applyManagedStatus(status);
        return status;
      } catch (error) {
        this.gatewayError = normalizeManagedGatewayError(error);
        throw error;
      } finally {
        this.isGatewayMutating = false;
      }
    },
  },
});
