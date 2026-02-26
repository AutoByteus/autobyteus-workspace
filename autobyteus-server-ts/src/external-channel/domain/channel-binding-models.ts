import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";

export type ChannelBindingTargetType = "AGENT" | "TEAM";

export type ChannelBinding = {
  id: string;
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: ChannelBindingTargetType;
  agentRunId: string | null;
  teamRunId: string | null;
  targetMemberName: string | null;
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

export type UpsertChannelBindingInput = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
  targetType: ChannelBindingTargetType;
  agentRunId?: string | null;
  teamRunId?: string | null;
  targetMemberName?: string | null;
};

export type ChannelDispatchTarget = {
  agentRunId: string | null;
  teamRunId: string | null;
};

export type ChannelBindingTargetOption = {
  targetType: ChannelBindingTargetType;
  targetId: string;
  displayName: string;
  status: string;
};

export type ChannelSourceRoute = {
  provider: ExternalChannelProvider;
  transport: ExternalChannelTransport;
  accountId: string;
  peerId: string;
  threadId: string | null;
};
