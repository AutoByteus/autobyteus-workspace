import { AgentInputUserMessage } from "autobyteus-ts";
import type { InterAgentMessageRequestEvent } from "autobyteus-ts/agent-team/events/agent-team-events.js";

export type TeamLike = {
  postMessage?: (
    message: AgentInputUserMessage,
    targetMemberName?: string | null,
  ) => Promise<void>;
  postToolExecutionApproval?: (
    agentName: string,
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ) => Promise<void>;
  stop?: (timeout?: number) => Promise<void>;
  runtime?: {
    context?: {
      teamManager?: {
        dispatchInterAgentMessage?: (event: InterAgentMessageRequestEvent) => Promise<void>;
        setTeamRoutingPort?: (port: unknown) => void;
      };
    };
  };
};

export type ResolveBoundRuntimeTeamResult = {
  team: TeamLike;
  teamDefinitionId: string;
};

export type ResolveBoundRuntimeTeam = (input: {
  teamRunId: string;
}) => ResolveBoundRuntimeTeamResult;

export const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};
