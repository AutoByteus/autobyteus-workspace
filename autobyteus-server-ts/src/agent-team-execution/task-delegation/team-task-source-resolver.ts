import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  projectTaskExecutionSource,
  resolveCollaboratorCopySource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import { findTaskConfigNode } from "./task-delegation-execution-resolution.js";

export type TeamTaskSource =
  | Readonly<{ kind: "agent"; node: TeamRunAgentNode }>
  | Readonly<{ kind: "agent_team"; node: TeamRunAgentTeamNode; handoffs: readonly CollaborationHandoff[] }>;

/**
 * The runtime source of a task execution at an address, on activation and on restore: a
 * catalog copy's recorded `source` first, then the configured node, then an extra copy
 * projected from the run's collaborator entry. The only reader of task sources in the Team root.
 */
export class TeamTaskSourceResolver {
  constructor(private readonly options: Readonly<{
    config: TeamRunConfig;
    getIndex(): TeamExecutionIndex;
  }>) {}

  resolve(address: AgentTeamAddress | string, recorded?: TaskExecutionSource | null): TeamTaskSource | null {
    if (recorded) return projectTaskExecutionSource(address as AgentTeamAddress, recorded);
    const configured = findTaskConfigNode(this.options.config.rootTeam, address);
    if (configured && configured.address !== "/") {
      return configured.kind === "agent"
        ? Object.freeze({ kind: "agent", node: configured })
        : Object.freeze({ kind: "agent_team", node: configured, handoffs: this.options.config.handoffs });
    }
    // An extra copy of a collaborator (or of a collaborator Team member) with pending identities.
    return resolveCollaboratorCopySource(this.options.getIndex().tree.rootTeam.collaborators, address);
  }

  requireAgent(address: AgentTeamAddress | string, recorded?: TaskExecutionSource | null): TeamRunAgentNode {
    const source = this.resolve(address, recorded);
    if (!source || source.kind !== "agent") throw new Error(`Agent '${address}' is not configured or a collaborator of this run.`);
    return source.node;
  }

  requireTeam(address: AgentTeamAddress | string, recorded?: TaskExecutionSource | null): Extract<TeamTaskSource, { kind: "agent_team" }> {
    const source = this.resolve(address, recorded);
    if (!source || source.kind !== "agent_team") throw new Error(`AgentTeam '${address}' is not configured or a collaborator of this run.`);
    return source;
  }
}
