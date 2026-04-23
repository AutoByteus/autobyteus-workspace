import type { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { TeamMemberRuntimeContext, TeamRunContext } from "../../domain/team-run-context.js";

export type MixedTeamMemberContextInput = {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
  runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;
};

export class MixedTeamMemberContext implements TeamMemberRuntimeContext {
  readonly memberName: string;
  readonly memberRouteKey: string;
  readonly memberRunId: string;
  readonly runtimeKind: RuntimeKind;
  platformAgentRunId: string | null;

  constructor(input: MixedTeamMemberContextInput) {
    this.memberName = input.memberName;
    this.memberRouteKey = input.memberRouteKey;
    this.memberRunId = input.memberRunId;
    this.runtimeKind = input.runtimeKind;
    this.platformAgentRunId = input.platformAgentRunId;
  }

  getPlatformAgentRunId(): string | null {
    return this.platformAgentRunId;
  }
}

export type MixedTeamRunContextInput = {
  coordinatorMemberRouteKey: string | null;
  memberContexts: MixedTeamMemberContext[];
};

export class MixedTeamRunContext {
  readonly coordinatorMemberRouteKey: string | null;
  readonly memberContexts: MixedTeamMemberContext[];

  constructor(input: MixedTeamRunContextInput) {
    this.coordinatorMemberRouteKey = input.coordinatorMemberRouteKey;
    this.memberContexts = [...input.memberContexts];
  }
}

export type MixedTeamRunContextEnvelope = TeamRunContext<MixedTeamRunContext>;
