import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type ChannelBindingTargetType = "AGENT" | "TEAM";

export type ChannelBindingLaunchPreset = {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  runtimeKind: RuntimeKind;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  llmConfig: Record<string, unknown> | null;
};

export type ChannelBindingTeamLaunchPreset = {
  workspaceRootPath: string;
  llmModelIdentifier: string;
  runtimeKind: RuntimeKind;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  llmConfig: Record<string, unknown> | null;
};

export type ChannelBinding = {
  id: string;
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: ChannelBindingTargetType;
  agentDefinitionId: string | null;
  launchPreset: ChannelBindingLaunchPreset | null;
  agentRunId: string | null;
  teamDefinitionId: string | null;
  teamLaunchPreset: ChannelBindingTeamLaunchPreset | null;
  teamRunId: string | null;
  targetNodeName: string | null;
  allowTransportFallback: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelBindingLookup = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
};

export type ChannelBindingProviderDefaultLookup = {
  provider: ExternalChannelProvider;
  accountId: string;
  peerId: string;
  threadId: string | null;
};

export type UpsertChannelBindingInput = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: ChannelBindingTargetType;
  agentDefinitionId?: string | null;
  launchPreset?: ChannelBindingLaunchPreset | null;
  agentRunId?: string | null;
  teamDefinitionId?: string | null;
  teamLaunchPreset?: ChannelBindingTeamLaunchPreset | null;
  teamRunId?: string | null;
  targetNodeName?: string | null;
  allowTransportFallback?: boolean;
};

export type ResolvedBinding = {
  binding: ChannelBinding;
  usedTransportFallback: boolean;
};

export type ChannelDispatchTarget = {
  agentRunId: string | null;
  teamRunId: string | null;
};

export type ChannelSourceRoute = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
};

export type ChannelOutputRoute = ChannelSourceRoute;

export type ChannelSourceContext = ChannelSourceRoute & {
  externalMessageId: string;
  receivedAt: Date;
};

export type ChannelIngressReceiptState =
  | "PENDING"
  | "DISPATCHING"
  | "ACCEPTED"
  | "UNBOUND";

export type ChannelIngressReceiptKey = ChannelSourceRoute & {
  externalMessageId: string;
};

export type ChannelMessageReceipt = ChannelSourceContext &
  ChannelDispatchTarget & {
    ingressState: ChannelIngressReceiptState;
    dispatchAcceptedAt: Date | null;
    turnId: string | null;
    dispatchLeaseToken: string | null;
    dispatchLeaseExpiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };

export type ChannelPendingIngressReceiptInput = ChannelIngressReceiptKey & {
  receivedAt: Date;
};

export type ChannelClaimIngressDispatchInput = ChannelIngressReceiptKey & {
  receivedAt: Date;
  claimedAt: Date;
  leaseDurationMs: number;
};

export type ChannelAcceptedIngressReceiptInput = ChannelIngressReceiptKey &
  ChannelDispatchTarget & {
    receivedAt: Date;
    dispatchLeaseToken: string;
    dispatchAcceptedAt: Date;
    turnId: string;
  };

export type ChannelUnboundIngressReceiptInput = ChannelIngressReceiptKey & {
  receivedAt: Date;
};

export type ChannelStandaloneRunOutputTarget = {
  targetType: "AGENT";
  agentRunId: string;
};

export type ChannelTeamRunOutputTarget = {
  targetType: "TEAM";
  teamRunId: string;
  entryMemberRunId: string | null;
  entryMemberName: string | null;
};

export type ChannelRunOutputTarget =
  | ChannelStandaloneRunOutputTarget
  | ChannelTeamRunOutputTarget;

export type ChannelRunOutputDeliveryStatus =
  | "OBSERVING"
  | "REPLY_FINALIZED"
  | "PUBLISH_PENDING"
  | "PUBLISHED"
  | "UNBOUND"
  | "FAILED";

export type ChannelRunOutputDeliveryRecord = {
  deliveryKey: string;
  bindingId: string;
  route: ChannelOutputRoute;
  target: ChannelRunOutputTarget;
  turnId: string;
  correlationMessageId: string | null;
  callbackIdempotencyKey: string | null;
  status: ChannelRunOutputDeliveryStatus;
  replyTextFinal: string | null;
  lastError: string | null;
  observedAt: Date;
  finalizedAt: Date | null;
  publishRequestedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelRunOutputObservedTurnInput = {
  deliveryKey: string;
  bindingId: string;
  route: ChannelOutputRoute;
  target: ChannelRunOutputTarget;
  turnId: string;
  correlationMessageId: string | null;
  observedAt: Date;
};

export type ChannelRunOutputReplyFinalizedInput = {
  deliveryKey: string;
  replyTextFinal: string;
  finalizedAt: Date;
};

export type ChannelRunOutputPublishPendingInput = {
  deliveryKey: string;
  callbackIdempotencyKey: string;
  publishRequestedAt: Date;
};

export type ChannelRunOutputPublishedInput = {
  deliveryKey: string;
  publishedAt: Date;
};

export type ChannelRunOutputTerminalInput = {
  deliveryKey: string;
  status: "UNBOUND" | "FAILED";
  lastError: string | null;
  updatedAt: Date;
};

export type ChannelDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED";

export type ChannelDeliveryEvent = {
  id: string;
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  correlationMessageId: string | null;
  callbackIdempotencyKey: string;
  status: ChannelDeliveryStatus;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type UpsertChannelDeliveryEventInput = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  correlationMessageId?: string | null;
  callbackIdempotencyKey: string;
  status: ChannelDeliveryStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};
