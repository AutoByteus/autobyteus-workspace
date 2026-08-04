import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { MixedTeamRunContext } from "../backends/mixed/mixed-team-run-context.js";
import type { TeamRunConfig } from "./team-run-config.js";
import type { TeamBackendKind } from "./team-backend-kind.js";
import { TeamRunTreeIndex } from "../services/team-run-tree-index.js";

export interface TeamAgentMemberRuntimeContext {
  readonly kind: "agent";
  readonly address: AgentTeamAddress;
  readonly agentRunId: string;
  getPlatformAgentRunId(): string | null;
}

export interface TeamSubTeamMemberRuntimeContext {
  readonly kind: "agent_team";
  readonly address: AgentTeamAddress;
  readonly teamDefinitionId: string;
  readonly teamRunId: string;
  childRuntimeContext: RuntimeTeamRunContext | null;
  getPlatformAgentRunId(): null;
}

export type TeamMemberRuntimeContext =
  | TeamAgentMemberRuntimeContext
  | TeamSubTeamMemberRuntimeContext;

export type RuntimeTeamRunContext = MixedTeamRunContext | null;

export type TeamRunContextInput<TRuntimeContext> = {
  teamRunId: string;
  teamAddress: AgentTeamAddress;
  taskTeamRunIds?: readonly string[] | null;
  teamBackendKind: TeamBackendKind;
  config: TeamRunConfig;
  index?: TeamRunTreeIndex | null;
  runtimeContext: TRuntimeContext;
};

export class TeamRunContext<TRuntimeContext = RuntimeTeamRunContext> {
  readonly teamRunId: string;
  readonly teamAddress: AgentTeamAddress;
  readonly taskTeamRunIds: readonly string[];
  readonly teamBackendKind: TeamBackendKind;
  readonly config: TeamRunConfig;
  readonly index: TeamRunTreeIndex;
  readonly runtimeContext: TRuntimeContext;

  constructor(input: TeamRunContextInput<TRuntimeContext>) {
    this.teamRunId = input.teamRunId.trim();
    if (!this.teamRunId) throw new Error("teamRunId is required.");
    this.teamAddress = input.teamAddress;
    this.taskTeamRunIds = Object.freeze([...(input.taskTeamRunIds ?? [])]);
    this.teamBackendKind = input.teamBackendKind;
    this.config = input.config;
    this.index = input.index ?? new TeamRunTreeIndex(input.config.rootTeam);
    if (!this.index.getTeam(this.teamAddress)) {
      throw new Error(`TeamRun context address '${this.teamAddress}' is not an AgentTeam node.`);
    }
    this.runtimeContext = input.runtimeContext;
  }
}

export const getRuntimeMemberContexts = (
  runtimeContext: RuntimeTeamRunContext | null | undefined,
): TeamMemberRuntimeContext[] => runtimeContext ? [...runtimeContext.memberContexts] : [];

export const resolveRuntimeAgentContext = (
  teamContext: TeamRunContext<unknown> | null | undefined,
  agentRunId: string,
): TeamAgentMemberRuntimeContext | null => {
  if (!teamContext) return null;
  return getRuntimeMemberContexts(teamContext.runtimeContext as RuntimeTeamRunContext).find(
    (context): context is TeamAgentMemberRuntimeContext =>
      context.kind === "agent" && context.agentRunId === agentRunId,
  ) ?? null;
};
