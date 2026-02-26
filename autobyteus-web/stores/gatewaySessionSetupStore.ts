import { defineStore } from 'pinia';
import {
  GatewayClientError,
} from '~/services/messagingGatewayClient';
import { createGatewayClient } from '~/services/gatewayClientFactory';
import {
  createPersonalSessionSyncPolicy,
  shouldContinuePolling,
} from '~/services/sessionSync/personalSessionStatusSyncPolicy';
import {
  normalizeGatewayErrorMessage,
  persistGatewayConfig,
  readPersistedGatewayConfig,
} from '~/stores/gatewaySessionSetup/config-health';
import { mergeSessionWithStatusAwareQr } from '~/stores/gatewaySessionSetup/personal-session-lifecycle';
import {
  detachTimer,
  nextAutoSyncStateForReason,
} from '~/stores/gatewaySessionSetup/session-auto-sync';
import type {
  PersonalSessionProvider,
  GatewayHealthModel,
  GatewayRuntimeReliabilityStatusModel,
  GatewayPersonalSessionModel,
  GatewayPersonalSessionQrModel,
  GatewayReadinessSnapshot,
  SessionStatusAutoSyncState,
  GatewayStepStatus,
} from '~/types/messaging';

interface GatewaySessionSetupState {
  gatewayBaseUrl: string;
  gatewayAdminToken: string;
  gatewayStatus: GatewayStepStatus;
  gatewayError: string | null;
  gatewayHealth: GatewayHealthModel | null;
  runtimeReliabilityStatus: GatewayRuntimeReliabilityStatusModel | null;
  runtimeReliabilityError: string | null;
  isGatewayChecking: boolean;
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
    gatewayBaseUrl: '',
    gatewayAdminToken: '',
    gatewayStatus: 'UNKNOWN',
    gatewayError: null,
    gatewayHealth: null,
    runtimeReliabilityStatus: null,
    runtimeReliabilityError: null,
    isGatewayChecking: false,
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
    personalSessionReady: (state) => state.session?.status === 'ACTIVE',
    sessionProviderLabel: (state) =>
      state.sessionProvider === 'WECHAT' ? 'WeChat' : 'WhatsApp',
  },

  actions: {
    clearSessionStatusSyncTimer() {
      if (!this.sessionStatusAutoSyncTimer) {
        return;
      }
      clearTimeout(this.sessionStatusAutoSyncTimer);
      this.sessionStatusAutoSyncTimer = null;
    },

    scheduleSessionStatusSyncTick(delayMs: number) {
      this.clearSessionStatusSyncTimer();
      this.sessionStatusAutoSyncTimer = setTimeout(() => {
        void this.runSessionStatusSyncTick();
      }, delayMs);
      detachTimer(this.sessionStatusAutoSyncTimer);
    },

    stopSessionStatusAutoSync(reason = 'manual') {
      this.clearSessionStatusSyncTimer();
      this.sessionStatusAutoSyncReason = reason;
      this.sessionStatusAutoSyncState = nextAutoSyncStateForReason(reason);
      this.sessionStatusAutoSyncSessionId = null;
      this.sessionStatusAutoSyncStartedAtMs = null;
      this.sessionStatusAutoSyncConsecutiveErrors = 0;

      if (reason === 'retry_budget_exhausted') {
        this.sessionError =
          'Automatic status sync paused after repeated errors. Use Refresh Status to continue.';
      } else if (reason === 'timeout') {
        this.sessionError = 'Automatic status sync timed out. Use Refresh Status to continue.';
      }
    },

    startSessionStatusAutoSync(sessionId?: string) {
      const resolvedSessionId = sessionId || this.session?.sessionId;
      if (!resolvedSessionId) {
        return;
      }

      this.clearSessionStatusSyncTimer();
      this.sessionStatusAutoSyncState = 'running';
      this.sessionStatusAutoSyncReason = null;
      this.sessionStatusAutoSyncSessionId = resolvedSessionId;
      this.sessionStatusAutoSyncStartedAtMs = Date.now();
      this.sessionStatusAutoSyncConsecutiveErrors = 0;

      const currentStatus =
        this.session && this.session.sessionId === resolvedSessionId ? this.session.status : null;
      if (currentStatus === 'ACTIVE' || currentStatus === 'STOPPED') {
        this.stopSessionStatusAutoSync(currentStatus.toLowerCase());
        return;
      }

      const policy = createPersonalSessionSyncPolicy();
      this.scheduleSessionStatusSyncTick(policy.baseIntervalMs);
    },

    async runSessionStatusSyncTick() {
      if (
        this.sessionStatusAutoSyncState !== 'running' ||
        !this.sessionStatusAutoSyncSessionId ||
        !this.sessionStatusAutoSyncStartedAtMs
      ) {
        return;
      }

      const policy = createPersonalSessionSyncPolicy();
      const sessionId = this.sessionStatusAutoSyncSessionId;

      try {
        const session = await this.fetchPersonalSessionStatus(sessionId, { silent: true });
        this.sessionStatusAutoSyncConsecutiveErrors = 0;

        const elapsedMs = Date.now() - this.sessionStatusAutoSyncStartedAtMs;
        const decision = shouldContinuePolling(policy, {
          status: session.status,
          elapsedMs,
          consecutiveErrors: this.sessionStatusAutoSyncConsecutiveErrors,
        });

        if (!decision.shouldContinue) {
          this.stopSessionStatusAutoSync(decision.reason || 'stopped');
          return;
        }

        this.scheduleSessionStatusSyncTick(decision.nextDelayMs);
      } catch (error) {
        if (error instanceof GatewayClientError && error.statusCode === 404) {
          this.stopSessionStatusAutoSync('session_not_found');
          return;
        }

        this.sessionStatusAutoSyncConsecutiveErrors += 1;
        const elapsedMs = Date.now() - this.sessionStatusAutoSyncStartedAtMs;
        const decision = shouldContinuePolling(policy, {
          elapsedMs,
          consecutiveErrors: this.sessionStatusAutoSyncConsecutiveErrors,
        });

        if (!decision.shouldContinue) {
          this.stopSessionStatusAutoSync(decision.reason || 'retry_budget_exhausted');
          return;
        }

        this.scheduleSessionStatusSyncTick(decision.nextDelayMs);
      }
    },

    initializeFromConfig() {
      const persistedConfig = readPersistedGatewayConfig();

      try {
        const runtimeConfig = useRuntimeConfig();
        const runtimeBaseUrl =
          typeof runtimeConfig.public.messageGatewayBaseUrl === 'string'
            ? runtimeConfig.public.messageGatewayBaseUrl
            : '';
        const runtimeAdminToken =
          typeof runtimeConfig.public.messageGatewayAdminToken === 'string'
            ? runtimeConfig.public.messageGatewayAdminToken
            : '';

        // Runtime config should seed initial values only.
        // Do not clobber values entered by the user in the current UI session.
        if (!this.gatewayBaseUrl) {
          this.gatewayBaseUrl = persistedConfig?.baseUrl || runtimeBaseUrl;
        }
        if (!this.gatewayAdminToken) {
          this.gatewayAdminToken = persistedConfig?.adminToken || runtimeAdminToken;
        }
      } catch {
        // Keep defaults for non-Nuxt unit test environments and still allow local persistence.
        if (!this.gatewayBaseUrl && persistedConfig?.baseUrl) {
          this.gatewayBaseUrl = persistedConfig.baseUrl;
        }
        if (!this.gatewayAdminToken && persistedConfig?.adminToken) {
          this.gatewayAdminToken = persistedConfig.adminToken;
        }
      }
    },

    setGatewayConfig(input: { baseUrl?: string; adminToken?: string }) {
      const nextBaseUrl =
        typeof input.baseUrl === 'string' ? input.baseUrl : this.gatewayBaseUrl;
      const nextAdminToken =
        typeof input.adminToken === 'string' ? input.adminToken : this.gatewayAdminToken;
      const changed =
        nextBaseUrl !== this.gatewayBaseUrl || nextAdminToken !== this.gatewayAdminToken;

      if (typeof input.baseUrl === 'string') {
        this.gatewayBaseUrl = input.baseUrl;
      }
      if (typeof input.adminToken === 'string') {
        this.gatewayAdminToken = input.adminToken;
      }

      if (changed) {
        this.gatewayStatus = 'UNKNOWN';
        this.gatewayError = null;
        this.gatewayHealth = null;
      }

      persistGatewayConfig({
        baseUrl: this.gatewayBaseUrl,
        adminToken: this.gatewayAdminToken,
      });
    },

    setSessionProvider(provider: PersonalSessionProvider) {
      if (provider === this.sessionProvider) {
        return;
      }

      this.stopSessionStatusAutoSync('provider_switched');
      this.sessionProvider = provider;
      this.session = null;
      this.sessionError = null;
      this.personalModeBlockedReason = null;
      this.qrExpiredAt = null;
    },

    createClient() {
      return createGatewayClient({
        baseUrl: this.gatewayBaseUrl,
        adminToken: this.gatewayAdminToken || undefined,
      });
    },

    async validateGatewayConnection(input?: { baseUrl?: string; adminToken?: string }) {
      if (input) {
        this.setGatewayConfig(input);
      }

      this.isGatewayChecking = true;
      this.gatewayError = null;

      try {
        const health = await this.createClient().getHealth();
        this.gatewayHealth = health;
        this.gatewayStatus = health.status === 'error' ? 'BLOCKED' : 'READY';
        if (this.gatewayStatus === 'BLOCKED') {
          this.gatewayError = 'Gateway reported unhealthy status.';
          this.runtimeReliabilityStatus = null;
          this.runtimeReliabilityError = null;
        } else {
          await this.refreshRuntimeReliabilityStatus({ silent: true });
        }
        return health;
      } catch (error) {
        this.gatewayStatus = 'BLOCKED';
        this.gatewayError = normalizeGatewayErrorMessage(error);
        this.runtimeReliabilityStatus = null;
        this.runtimeReliabilityError = null;
        throw error;
      } finally {
        this.isGatewayChecking = false;
      }
    },

    async refreshRuntimeReliabilityStatus(options?: { silent?: boolean }) {
      const runSilently = options?.silent === true;
      if (!runSilently) {
        this.runtimeReliabilityError = null;
      }

      try {
        const status = await this.createClient().getRuntimeReliabilityStatus();
        this.runtimeReliabilityStatus = status;
        this.runtimeReliabilityError = null;
        return status;
      } catch (error) {
        this.runtimeReliabilityStatus = null;
        this.runtimeReliabilityError = normalizeGatewayErrorMessage(error);
        if (!runSilently) {
          throw error;
        }
        return null;
      }
    },

    async startPersonalSession(accountLabel: string) {
      this.isSessionLoading = true;
      this.sessionError = null;
      this.personalModeBlockedReason = null;
      this.qrExpiredAt = null;
      const provider = this.sessionProvider;

      try {
        const client = this.createClient();
        const session =
          provider === 'WECHAT'
            ? await client.startWeChatPersonalSession(accountLabel)
            : await client.startWhatsAppPersonalSession(accountLabel);
        this.session = session;
        await this.fetchPersonalSessionQr(session.sessionId);
        this.startSessionStatusAutoSync(session.sessionId);
        return this.session;
      } catch (error) {
        if (error instanceof GatewayClientError) {
          if (error.statusCode === 403) {
            this.personalModeBlockedReason = error.message;
          }

          if (error.statusCode === 409 && error.code === 'SESSION_ALREADY_RUNNING') {
            const existingSessionId = error.details?.sessionId;
            if (existingSessionId) {
              const attachedSession = await this.attachToExistingSession(existingSessionId);
              this.personalModeBlockedReason = null;
              this.sessionError = null;
              return attachedSession;
            }

            this.personalModeBlockedReason =
              'A personal session is already running, but gateway did not return its session id.';
          }
        }
        this.sessionError = normalizeGatewayErrorMessage(error);
        throw error;
      } finally {
        this.isSessionLoading = false;
      }
    },

    async attachToExistingSession(sessionId: string): Promise<GatewayPersonalSessionModel> {
      const session = await this.fetchPersonalSessionStatus(sessionId);
      await this.fetchPersonalSessionQr(sessionId);
      this.startSessionStatusAutoSync(sessionId);
      return this.session || session;
    },

    async fetchPersonalSessionQr(sessionId?: string): Promise<GatewayPersonalSessionQrModel | null> {
      const resolvedSessionId = sessionId || this.session?.sessionId;
      if (!resolvedSessionId) {
        throw new Error('No active session id');
      }

      try {
        const client = this.createClient();
        const qr =
          this.sessionProvider === 'WECHAT'
            ? await client.getWeChatPersonalQr(resolvedSessionId)
            : await client.getWhatsAppPersonalQr(resolvedSessionId);
        if (!this.session || this.session.sessionId !== resolvedSessionId) {
          return qr;
        }

        this.session = {
          ...this.session,
          qr,
          status: this.session.status === 'STOPPED' ? 'PENDING_QR' : this.session.status,
        };
        this.qrExpiredAt = null;
        this.sessionError = null;
        return qr;
      } catch (error) {
        if (error instanceof GatewayClientError) {
          if (error.statusCode === 409 && error.code === 'SESSION_QR_NOT_READY') {
            if (this.session && this.session.sessionId === resolvedSessionId) {
              this.session = {
                ...this.session,
                status: 'PENDING_QR',
                qr: undefined,
              };
            }
            this.sessionError = 'QR code is not ready yet. Please retry in a few seconds.';
            return null;
          }

          if (error.statusCode === 410 && error.code === 'SESSION_QR_EXPIRED') {
            this.qrExpiredAt = new Date().toISOString();
            if (this.session && this.session.sessionId === resolvedSessionId) {
              const nextSession: GatewayPersonalSessionModel = {
                ...this.session,
              };
              delete nextSession.qr;
              this.session = nextSession;
            }
          }
        }
        this.sessionError = normalizeGatewayErrorMessage(error);
        throw error;
      }
    },

    async fetchPersonalSessionStatus(sessionId?: string, options?: { silent?: boolean }) {
      const resolvedSessionId = sessionId || this.session?.sessionId;
      if (!resolvedSessionId) {
        throw new Error('No active session id');
      }

      if (!options?.silent) {
        this.isSessionLoading = true;
        this.sessionError = null;
      }

      try {
        const client = this.createClient();
        const session =
          this.sessionProvider === 'WECHAT'
            ? await client.getWeChatPersonalStatus(resolvedSessionId)
            : await client.getWhatsAppPersonalStatus(resolvedSessionId);
        this.session = mergeSessionWithStatusAwareQr(session, this.session);

        if (
          this.sessionStatusAutoSyncSessionId === resolvedSessionId &&
          (session.status === 'ACTIVE' || session.status === 'STOPPED')
        ) {
          this.stopSessionStatusAutoSync(session.status.toLowerCase());
        }

        if (
          !options?.silent &&
          (this.sessionStatusAutoSyncState === 'paused' || this.sessionStatusAutoSyncState === 'stopped') &&
          (session.status === 'PENDING_QR' || session.status === 'DEGRADED')
        ) {
          this.startSessionStatusAutoSync(resolvedSessionId);
        }

        return session;
      } catch (error) {
        if (error instanceof GatewayClientError && error.statusCode === 404) {
          this.session = null;
          if (this.sessionStatusAutoSyncSessionId === resolvedSessionId) {
            this.stopSessionStatusAutoSync('session_not_found');
          }
        }
        this.sessionError = normalizeGatewayErrorMessage(error);
        throw error;
      } finally {
        if (!options?.silent) {
          this.isSessionLoading = false;
        }
      }
    },

    async stopPersonalSession(sessionId?: string) {
      const resolvedSessionId = sessionId || this.session?.sessionId;
      if (!resolvedSessionId) {
        this.stopSessionStatusAutoSync('session_stopped');
        return { success: true };
      }

      this.isSessionLoading = true;
      this.sessionError = null;
      let stopReason = 'session_stopped';

      try {
        const client = this.createClient();
        const response =
          this.sessionProvider === 'WECHAT'
            ? await client.stopWeChatPersonalSession(resolvedSessionId)
            : await client.stopWhatsAppPersonalSession(resolvedSessionId);
        this.session = null;
        this.qrExpiredAt = null;
        this.personalModeBlockedReason = null;
        return response;
      } catch (error) {
        this.sessionError = normalizeGatewayErrorMessage(error);
        stopReason = 'stop_failed';
        throw error;
      } finally {
        this.stopSessionStatusAutoSync(stopReason);
        this.isSessionLoading = false;
      }
    },

    getReadinessSnapshot(): GatewayReadinessSnapshot {
      const runtimeState = this.runtimeReliabilityStatus?.runtime.state ?? null;
      const runtimeCriticalReason =
        runtimeState === 'CRITICAL_LOCK_LOST'
          ? 'Gateway reliability lock ownership was lost. Restart gateway to recover.'
          : null;
      const blockedReason =
        this.gatewayStatus === 'BLOCKED' ? this.gatewayError : runtimeCriticalReason;
      return {
        gatewayReady: this.gatewayStatus === 'READY' && !runtimeCriticalReason,
        gatewayBlockedReason: blockedReason,
        runtimeReliabilityState: runtimeState,
        runtimeReliabilityCriticalReason: runtimeCriticalReason,
        personalSessionReady: this.session?.status === 'ACTIVE',
        personalSessionBlockedReason: this.personalModeBlockedReason,
      };
    },
  },
});
