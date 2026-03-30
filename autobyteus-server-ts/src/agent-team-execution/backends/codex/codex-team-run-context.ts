import type { AgentRunConfig } from "../../../agent-execution/domain/agent-run-config.js";
import type { TeamMemberRuntimeContext, TeamRunContext } from "../../domain/team-run-context.js";

export type CodexTeamMemberContextInput = {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  agentRunConfig: AgentRunConfig;
  threadId: string | null;
};

export class CodexTeamMemberContext implements TeamMemberRuntimeContext {
  readonly memberName: string;
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly agentRunConfig: AgentRunConfig;
  threadId: string | null;

  constructor(input: CodexTeamMemberContextInput) {
    this.memberName = input.memberName;
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.agentRunConfig = input.agentRunConfig;
    this.threadId = input.threadId;
  }

  getPlatformAgentRunId(): string | null {
    return this.threadId;
  }
}

export type CodexTeamRunContextInput = {
  coordinatorMemberRouteKey: string | null;
  memberContexts: CodexTeamMemberContext[];
};

export class CodexTeamRunContext {
  readonly coordinatorMemberRouteKey: string | null;
  readonly memberContexts: CodexTeamMemberContext[];

  constructor(input: CodexTeamRunContextInput) {
    this.coordinatorMemberRouteKey = input.coordinatorMemberRouteKey;
    this.memberContexts = [...input.memberContexts];
  }
}

export type CodexTeamRunContextEnvelope = TeamRunContext<CodexTeamRunContext>;
