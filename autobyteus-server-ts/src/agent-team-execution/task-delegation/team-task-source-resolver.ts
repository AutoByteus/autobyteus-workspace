import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  projectCollaboratorAgentSource,
  projectCollaboratorTeamSource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode, TeamRunConfig } from "../domain/team-run-config.js";
import type { TeamExecutionIndex } from "../services/team-execution-index.js";
import { findTaskConfigNode } from "./task-delegation-execution-resolution.js";

export type TeamTaskSource =
  | Readonly<{ kind: "agent"; node: TeamRunAgentNode }>
  | Readonly<{ kind: "agent_team"; node: TeamRunAgentTeamNode; handoffs: readonly CollaborationHandoff[] }>;

/**
 * The runtime source of a task execution at an address, on activation and on restore: the
 * configured node first, then the run's collaborator entry. The only reader of configured
 * task sources in the Team root.
 */
export class TeamTaskSourceResolver {
  constructor(private readonly options: Readonly<{
    config: TeamRunConfig;
    getIndex(): TeamExecutionIndex;
  }>) {}

  resolve(address: AgentTeamAddress | string): TeamTaskSource | null {
    const configured = findTaskConfigNode(this.options.config.rootTeam, address);
    if (configured && configured.address !== "/") {
      return configured.kind === "agent"
        ? Object.freeze({ kind: "agent", node: configured })
        : Object.freeze({ kind: "agent_team", node: configured, handoffs: this.options.config.handoffs });
    }
    const collaborator = this.options.getIndex().getCollaborator(address);
    if (!collaborator) return null;
    return collaborator.kind === "agent"
      ? Object.freeze({ kind: "agent", node: projectCollaboratorAgentSource(collaborator) })
      : Object.freeze({ kind: "agent_team", node: projectCollaboratorTeamSource(collaborator), handoffs: collaborator.handoffs });
  }

  requireAgent(address: AgentTeamAddress | string): TeamRunAgentNode {
    const source = this.resolve(address);
    if (!source || source.kind !== "agent") throw new Error(`Agent '${address}' is not configured or a collaborator of this run.`);
    return source.node;
  }

  requireTeam(address: AgentTeamAddress | string): Extract<TeamTaskSource, { kind: "agent_team" }> {
    const source = this.resolve(address);
    if (!source || source.kind !== "agent_team") throw new Error(`AgentTeam '${address}' is not configured or a collaborator of this run.`);
    return source;
  }
}
