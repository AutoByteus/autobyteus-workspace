import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { TeamBackendKind } from "./team-backend-kind.js";
import type { TeamRunAgentTeamNode, TeamRunApplicationBinding } from "./team-run-config.js";
import type { MixedTeamRunContext } from "../backends/mixed/mixed-team-run-context.js";
import {
  normalizeTeamRunPhysicalScope,
  type TeamRunPhysicalScope,
} from "./team-run-physical-scope.js";

export interface TeamAgentMemberRuntimeContext {
  readonly kind: "agent";
  readonly address: import("../../agent-collaboration/domain/agent-team-address.js").AgentTeamAddress;
  readonly agentRunId: string;
  getPlatformAgentRunId(): string | null;
}

export interface TeamSubTeamMemberRuntimeContext {
  readonly kind: "agent_team";
  readonly address: import("../../agent-collaboration/domain/agent-team-address.js").AgentTeamAddress;
  readonly teamDefinitionId: string;
  readonly teamRunId: string;
  childRuntimeContext: RuntimeTeamRunContext | null;
  getPlatformAgentRunId(): null;
}

export type TeamMemberRuntimeContext = TeamAgentMemberRuntimeContext | TeamSubTeamMemberRuntimeContext;
export type RuntimeTeamRunContext = MixedTeamRunContext | null;

export class TeamRunContext<TRuntimeContext = RuntimeTeamRunContext> {
  readonly physicalScope: TeamRunPhysicalScope;
  readonly teamRunId: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly teamNode: TeamRunAgentTeamNode;
  readonly handoffs: readonly CollaborationHandoff[];
  readonly applicationBinding: TeamRunApplicationBinding | null;
  readonly runtimeContext: TRuntimeContext;

  constructor(input: {
    physicalScope: TeamRunPhysicalScope;
    teamRunId: string;
    teamBackendKind: TeamBackendKind;
    teamNode: TeamRunAgentTeamNode;
    handoffs?: readonly CollaborationHandoff[] | null;
    applicationBinding?: TeamRunApplicationBinding | null;
    runtimeContext: TRuntimeContext;
  }) {
    this.physicalScope = normalizeTeamRunPhysicalScope(input.physicalScope);
    this.teamRunId = required(input.teamRunId, "teamRunId");
    const containingTeamRunId = this.physicalScope.ancestorTeamRunIds.at(-1)
      ?? this.physicalScope.rootTeamRunId;
    if (containingTeamRunId !== this.teamRunId) {
      throw new Error(
        `Physical scope contains TeamRun '${containingTeamRunId}', not '${this.teamRunId}'.`,
      );
    }
    if (input.teamNode.teamRunId !== this.teamRunId) {
      throw new Error(`Team node '${input.teamNode.address}' does not own TeamRun '${this.teamRunId}'.`);
    }
    this.teamBackendKind = input.teamBackendKind;
    this.teamNode = input.teamNode;
    this.handoffs = Object.freeze([...(input.handoffs ?? [])]);
    this.applicationBinding = input.applicationBinding
      ? Object.freeze({ ...input.applicationBinding })
      : null;
    this.runtimeContext = input.runtimeContext;
  }

  get rootTeamRunId() { return this.physicalScope.rootTeamRunId; }
  get teamAddress() { return this.teamNode.address; }
}

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

export const getRuntimeMemberContexts = (
  runtimeContext: RuntimeTeamRunContext | null | undefined,
): TeamMemberRuntimeContext[] => runtimeContext ? [...runtimeContext.memberContexts] : [];

export const resolveRuntimeAgentContext = (
  teamContext: TeamRunContext<unknown> | null | undefined,
  agentRunId: string,
): TeamAgentMemberRuntimeContext | null => {
  if (!teamContext) return null;
  return getRuntimeMemberContexts(teamContext.runtimeContext as RuntimeTeamRunContext).find(
    (context): context is TeamAgentMemberRuntimeContext => context.kind === "agent" && context.agentRunId === agentRunId,
  ) ?? null;
};
