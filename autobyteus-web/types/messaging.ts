export type MessagingProvider = 'WHATSAPP' | 'WECOM' | 'WECHAT' | 'DISCORD' | 'TELEGRAM';
export type PersonalSessionProvider = 'WHATSAPP' | 'WECHAT';

export type MessagingTransport = 'BUSINESS_API' | 'PERSONAL_SESSION';

export type ExternalChannelBindingTargetType = 'AGENT' | 'TEAM';

export type GatewayStepStatus = 'UNKNOWN' | 'READY' | 'BLOCKED';

export type PersonalSessionStatus = 'PENDING_QR' | 'ACTIVE' | 'DEGRADED' | 'STOPPED';

export type SessionStatusAutoSyncState = 'idle' | 'running' | 'paused' | 'stopped';

export type SetupStepKey = 'gateway' | 'personal_session' | 'binding' | 'verification';

export type SetupStepStateStatus = 'PENDING' | 'READY' | 'BLOCKED' | 'DONE';

export type VerificationCheckKey = 'gateway' | 'session' | 'binding' | 'target_runtime';

export type VerificationCheckStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';

export interface SetupVerificationCheck {
  key: VerificationCheckKey;
  label: string;
  status: VerificationCheckStatus;
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

export type SetupBlockerActionType =
  | 'OPEN_AGENT_RUNTIME'
  | 'OPEN_TEAM_RUNTIME'
  | 'RERUN_VERIFICATION'
  | 'REFRESH_TARGETS';

export interface SetupBlockerAction {
  type: SetupBlockerActionType;
  label: string;
  targetId?: string;
}

export interface ExternalChannelBindingModel {
  id: string;
  provider: MessagingProvider;
  transport: MessagingTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: ExternalChannelBindingTargetType;
  targetId: string;
  updatedAt: string;
}

export interface ExternalChannelBindingDraft {
  provider: MessagingProvider;
  transport: MessagingTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: ExternalChannelBindingTargetType;
  targetId: string;
}

export interface ExternalChannelBindingTargetOption {
  targetType: ExternalChannelBindingTargetType;
  targetId: string;
  displayName: string;
  status: string;
}

export interface ExternalChannelCapabilityModel {
  bindingCrudEnabled: boolean;
  reason?: string;
  acceptedProviderTransportPairs?: string[];
}

export type WeChatSetupMode = 'WECOM_APP_BRIDGE' | 'DIRECT_PERSONAL_SESSION';

export interface GatewayCapabilitiesModel {
  wechatModes: WeChatSetupMode[];
  defaultWeChatMode: WeChatSetupMode | null;
  wecomAppEnabled: boolean;
  wechatPersonalEnabled: boolean;
  discordEnabled: boolean;
  discordAccountId: string | null;
  telegramEnabled: boolean;
  telegramAccountId: string | null;
}

export type GatewayWeComAccountMode = 'APP' | 'LEGACY';

export interface GatewayWeComAccountModel {
  accountId: string;
  label: string;
  mode: GatewayWeComAccountMode;
}

export interface GatewayWeComAccountListModel {
  items: GatewayWeComAccountModel[];
}

export interface GatewayHealthModel {
  status: 'ok' | 'degraded' | 'error';
  version?: string;
  timestamp?: string;
}

export interface GatewayPersonalSessionQrModel {
  code: string;
  expiresAt: string;
}

export interface GatewayPersonalSessionModel {
  sessionId: string;
  accountLabel: string;
  status: PersonalSessionStatus;
  qr?: GatewayPersonalSessionQrModel;
}

export type GatewayPeerType = 'USER' | 'GROUP';

export interface GatewayPeerCandidate {
  peerId: string;
  peerType: GatewayPeerType;
  threadId: string | null;
  displayName: string | null;
  lastMessageAt: string;
}

export interface GatewayPeerCandidatesModel {
  sessionId: string;
  accountLabel: string;
  status: PersonalSessionStatus;
  updatedAt: string;
  items: GatewayPeerCandidate[];
}

export interface GatewayDiscordPeerCandidatesModel {
  accountId: string;
  updatedAt: string;
  items: GatewayPeerCandidate[];
}

export interface GatewayTelegramPeerCandidatesModel {
  accountId: string;
  updatedAt: string;
  items: GatewayPeerCandidate[];
}

export type GatewayRuntimeReliabilityState = 'HEALTHY' | 'CRITICAL_LOCK_LOST';

export interface GatewayRuntimeReliabilityStatusModel {
  runtime: {
    state: GatewayRuntimeReliabilityState;
    criticalCode: string | null;
    updatedAt: string;
    workers: {
      inboundForwarder: {
        running: boolean;
        lastError: string | null;
        lastErrorAt: string | null;
      };
      outboundSender: {
        running: boolean;
        lastError: string | null;
        lastErrorAt: string | null;
      };
    };
    locks: {
      inbox: {
        ownerId: string | null;
        held: boolean;
        lost: boolean;
        lastHeartbeatAt: string | null;
        lastError: string | null;
      };
      outbox: {
        ownerId: string | null;
        held: boolean;
        lost: boolean;
        lastHeartbeatAt: string | null;
        lastError: string | null;
      };
    };
  };
  queue: {
    inboundDeadLetterCount: number;
    inboundCompletedUnboundCount: number;
    outboundDeadLetterCount: number;
  };
}

export interface SetupStepState {
  key: SetupStepKey;
  status: SetupStepStateStatus;
  detail?: string;
}

export interface SetupBlocker {
  code:
    | 'GATEWAY_UNREACHABLE'
    | 'GATEWAY_RUNTIME_CRITICAL'
    | 'PERSONAL_MODE_DISABLED'
    | 'SESSION_NOT_READY'
    | 'SERVER_BINDING_API_UNAVAILABLE'
    | 'BINDING_NOT_READY'
    | 'TARGET_RUNTIME_NOT_ACTIVE'
    | 'TARGET_OPTIONS_UNAVAILABLE'
    | 'VERIFICATION_ERROR';
  step: SetupStepKey;
  message: string;
  actions?: SetupBlockerAction[];
}

export interface SetupVerificationResult {
  ready: boolean;
  blockers: SetupBlocker[];
  checks: SetupVerificationCheck[];
  checkedAt: string;
}

export interface BindingScopeInput {
  provider: MessagingProvider;
  transport: MessagingTransport;
  accountId?: string | null;
}

export interface GatewayReadinessSnapshot {
  gatewayReady: boolean;
  gatewayBlockedReason: string | null;
  runtimeReliabilityState: GatewayRuntimeReliabilityState | null;
  runtimeReliabilityCriticalReason: string | null;
  personalSessionReady: boolean;
  personalSessionBlockedReason: string | null;
}

export interface BindingReadinessSnapshot {
  capabilityEnabled: boolean;
  capabilityBlockedReason: string | null;
  hasBindings: boolean;
  bindingError: string | null;
  bindingsInScope: number;
}
