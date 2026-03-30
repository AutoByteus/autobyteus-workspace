import type { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import type { TeamMemberRuntimeContext, TeamRunContext } from "../../domain/team-run-context.js";

export type ClaudeTeamMemberContextInput = {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  agentRunConfig: AgentRunConfig;
  sessionId: string | null;
};

export class ClaudeTeamMemberContext implements TeamMemberRuntimeContext {
  readonly memberName: string;
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly agentRunConfig: AgentRunConfig;
  sessionId: string | null;

  constructor(input: ClaudeTeamMemberContextInput) {
    this.memberName = input.memberName;
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.agentRunConfig = input.agentRunConfig;
    this.sessionId = input.sessionId;
  }

  getPlatformAgentRunId(): string | null {
    return this.sessionId;
  }
}

export type ClaudeTeamRunContextInput = {
  coordinatorMemberRouteKey: string | null;
  memberContexts: ClaudeTeamMemberContext[];
};

export class ClaudeTeamRunContext {
  readonly coordinatorMemberRouteKey: string | null;
  readonly memberContexts: ClaudeTeamMemberContext[];

  constructor(input: ClaudeTeamRunContextInput) {
    this.coordinatorMemberRouteKey = input.coordinatorMemberRouteKey;
    this.memberContexts = [...input.memberContexts];
  }
}

export type ClaudeTeamRunContextEnvelope = TeamRunContext<ClaudeTeamRunContext>;
