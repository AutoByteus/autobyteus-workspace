import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import type { TeamBackendKind } from "./team-backend-kind.js";
import type { TeamRunAgentTeamNode, TeamRunApplicationBinding } from "./team-run-config.js";
import type { FlatTeamExecutionContext } from "../local/flat-team-execution-context.js";
import {
  createRootExecutionPhysicalScope,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  runPartPlacement,
  type AgentRunMemoryPlacement,
} from "../../agent-memory/domain/agent-run-memory-placement.js";

export interface TeamAgentMemberRuntimeContext {
  readonly kind: "agent";
  readonly address: import("../../agent-collaboration/domain/agent-team-address.js").AgentTeamAddress;
  readonly agentRunId: string;
  getPlatformAgentRunId(): string | null;
}

export type RuntimeTeamRunContext = FlatTeamExecutionContext | null;

/** Root-neutral local context for one physical TeamRun. */
export class TeamRunContext<TRuntimeContext = RuntimeTeamRunContext> {
  readonly physicalScope: RootExecutionPhysicalScope;
  readonly teamRunId: string;
  readonly teamBackendKind: TeamBackendKind;
  readonly teamNode: TeamRunAgentTeamNode;
  readonly handoffs: readonly CollaborationHandoff[];
  readonly applicationBinding: TeamRunApplicationBinding | null;
  readonly runtimeContext: TRuntimeContext;

  constructor(input: {
    physicalScope: RootExecutionPhysicalScope;
    teamRunId: string;
    teamBackendKind: TeamBackendKind;
    teamNode: TeamRunAgentTeamNode;
    handoffs?: readonly CollaborationHandoff[] | null;
    applicationBinding?: TeamRunApplicationBinding | null;
    runtimeContext: TRuntimeContext;
  }) {
    this.physicalScope = createRootExecutionPhysicalScope(input.physicalScope);
    this.teamRunId = required(input.teamRunId, "teamRunId");
    const containingTeamRunId = this.physicalScope.ancestorTeamRunIds.at(-1)
      ?? (this.physicalScope.root.rootSubjectKind === "agent_team"
        ? this.physicalScope.root.rootRunId
        : null);
    if (containingTeamRunId !== this.teamRunId) {
      throw new Error(
        `Physical scope contains TeamRun '${containingTeamRunId ?? "none"}', not '${this.teamRunId}'.`,
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

  get rootIdentity() { return this.physicalScope.root; }
  /** Where this team's members keep their memory (contract L1): inside the run, or inside the task agent team's own folder. */
  get memberMemoryPlacement(): AgentRunMemoryPlacement {
    return runPartPlacement(this.physicalScope);
  }
  get teamAddress() { return this.teamNode.address; }
}

const required = (value: string, field: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} is required.`);
  return normalized;
};

