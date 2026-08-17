import {
  cloneTeamMemberExecutionIdentity,
  type TeamMemberExecutionIdentity,
} from "./team-member-execution-identity.js";

export type TeamAgentPlatformBinding = Readonly<{
  execution: TeamMemberExecutionIdentity;
  platformAgentRunId: string;
}>;

export type TeamAgentPlatformBindingErrorCode =
  | "TEAM_AGENT_CONTINUATION_BINDING_MISSING"
  | "TEAM_AGENT_CONTINUATION_STATE_UNREADABLE"
  | "TEAM_AGENT_PLATFORM_BINDING_CONFLICT"
  | "TEAM_AGENT_PLATFORM_BINDING_COMMIT_FAILED";

export class TeamAgentPlatformBindingError extends Error {
  constructor(
    readonly code: TeamAgentPlatformBindingErrorCode,
    message: string,
    options: { cause?: unknown; indeterminate?: boolean } = {},
  ) {
    super(message);
    this.name = "TeamAgentPlatformBindingError";
    this.indeterminate = options.indeterminate ?? false;
    if (options.cause !== undefined) this.cause = options.cause;
  }
  readonly indeterminate: boolean;
}

export interface TeamAgentPlatformBindingAcceptor {
  accept(binding: TeamAgentPlatformBinding): Promise<void>;
}

export const createTeamAgentPlatformBinding = (input: {
  execution: TeamMemberExecutionIdentity;
  platformAgentRunId: string;
}): TeamAgentPlatformBinding => {
  const platformAgentRunId = input.platformAgentRunId.trim();
  if (!platformAgentRunId) throw new Error("platformAgentRunId is required.");
  return Object.freeze({
    execution: cloneTeamMemberExecutionIdentity(input.execution),
    platformAgentRunId,
  });
};
