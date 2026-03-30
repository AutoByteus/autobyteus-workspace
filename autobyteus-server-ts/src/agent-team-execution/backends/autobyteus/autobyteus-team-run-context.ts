import type { TeamMemberRuntimeContext, TeamRunContext } from "../../domain/team-run-context.js";

export type AutoByteusTeamMemberContextInput = {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  nativeAgentId: string | null;
};

export class AutoByteusTeamMemberContext implements TeamMemberRuntimeContext {
  readonly memberName: string;
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  nativeAgentId: string | null;

  constructor(input: AutoByteusTeamMemberContextInput) {
    this.memberName = input.memberName;
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.nativeAgentId = input.nativeAgentId;
  }

  getPlatformAgentRunId(): string | null {
    return this.nativeAgentId;
  }
}

export type AutoByteusTeamRunContextInput = {
  coordinatorMemberRouteKey: string | null;
  memberContexts: AutoByteusTeamMemberContext[];
};

export class AutoByteusTeamRunContext {
  readonly coordinatorMemberRouteKey: string | null;
  readonly memberContexts: AutoByteusTeamMemberContext[];

  constructor(input: AutoByteusTeamRunContextInput) {
    this.coordinatorMemberRouteKey = input.coordinatorMemberRouteKey;
    this.memberContexts = [...input.memberContexts];
  }
}

export type AutoByteusTeamRunContextEnvelope = TeamRunContext<AutoByteusTeamRunContext>;
