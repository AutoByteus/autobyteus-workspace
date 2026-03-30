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

export type ChannelIdempotencyDecision = {
  duplicate: boolean;
  key: string;
  firstSeenAt: Date | null;
  expiresAt: Date | null;
};

export type ChannelDispatchTarget = {
  agentRunId: string | null;
  teamRunId: string | null;
};

export type ChannelSourceContext = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  externalMessageId: string;
  receivedAt: Date;
  turnId?: string | null;
};

export type ChannelIngressReceiptInput = ChannelSourceContext &
  ChannelDispatchTarget;

export type ChannelSourceRoute = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
};

export type ChannelTurnReceiptBindingInput = ChannelSourceRoute &
  ChannelDispatchTarget & {
    externalMessageId: string;
    turnId: string;
    receivedAt: Date;
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
