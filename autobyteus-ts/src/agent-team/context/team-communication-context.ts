import type { InterAgentMessageRequestEvent } from "../events/agent-team-events.js";

export type TeamCommunicationMember = {
  memberName: string;
  memberRunId?: string | null;
  agentId?: string | null;
  role?: string | null;
  description?: string | null;
};

export type TeamCommunicationContext = {
  members: TeamCommunicationMember[];
  dispatchInterAgentMessageRequest: (
    event: InterAgentMessageRequestEvent,
  ) => Promise<void>;
  resolveMemberNameByAgentId: (agentId: string) => string | null;
};

type CommunicationContextCarrier = {
  communicationContext?: TeamCommunicationContext | null;
};

const isFunction = (value: unknown): value is (...args: any[]) => any =>
  typeof value === 'function';

const isCommunicationMember = (value: unknown): value is TeamCommunicationMember =>
  Boolean(value) &&
  typeof value === 'object' &&
  typeof (value as { memberName?: unknown }).memberName === 'string';

export const isTeamCommunicationContext = (
  value: unknown,
): value is TeamCommunicationContext =>
  Boolean(value) &&
  typeof value === 'object' &&
  Array.isArray((value as { members?: unknown }).members) &&
  (value as { members: unknown[] }).members.every(isCommunicationMember) &&
  isFunction((value as { dispatchInterAgentMessageRequest?: unknown }).dispatchInterAgentMessageRequest) &&
  isFunction((value as { resolveMemberNameByAgentId?: unknown }).resolveMemberNameByAgentId);

export const resolveTeamCommunicationContext = (
  value: unknown,
): TeamCommunicationContext | null => {
  if (isTeamCommunicationContext(value)) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    isTeamCommunicationContext((value as CommunicationContextCarrier).communicationContext)
  ) {
    return (value as CommunicationContextCarrier).communicationContext ?? null;
  }
  return null;
};
