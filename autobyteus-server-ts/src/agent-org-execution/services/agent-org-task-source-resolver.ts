import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  projectCollaboratorAgentSource,
  projectCollaboratorTeamSource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import { findAgentOrgConfiguredSourceNode } from "./agent-org-runtime-config-projector.js";

export type AgentOrgTaskSource =
  | Readonly<{ kind: "agent"; node: TeamRunAgentNode }>
  | Readonly<{ kind: "agent_team"; node: TeamRunAgentTeamNode; handoffs: readonly CollaborationHandoff[] }>;

/**
 * The runtime source of an Org task execution, on activation and on restore: the configured
 * placement first, then the run's collaborator entry. The adapter's only source reader.
 */
export class AgentOrgTaskSourceResolver {
  constructor(private readonly getTree: () => AgentOrgRunExecutionTreeSnapshot) {}

  resolve(address: AgentTeamAddress): AgentOrgTaskSource | null {
    const tree = this.getTree();
    const configured = findAgentOrgConfiguredSourceNode(tree, address);
    if (configured) {
      return configured.kind === "agent"
        ? Object.freeze({ kind: "agent", node: configured })
        : Object.freeze({ kind: "agent_team", node: configured, handoffs: tree.handoffs });
    }
    const collaborator = new AgentOrgExecutionIndex(tree).getCollaborator(address);
    if (!collaborator) return null;
    return collaborator.kind === "agent"
      ? Object.freeze({ kind: "agent", node: projectCollaboratorAgentSource(collaborator) })
      : Object.freeze({ kind: "agent_team", node: projectCollaboratorTeamSource(collaborator), handoffs: collaborator.handoffs });
  }

  require<TKind extends AgentOrgTaskSource["kind"]>(
    address: AgentTeamAddress,
    kind: TKind,
    unavailable: (message: string) => Error = (message) => new Error(message),
  ): Extract<AgentOrgTaskSource, { kind: TKind }> {
    const source = this.resolve(address);
    if (!source || source.kind !== kind) {
      throw unavailable(`${kind === "agent" ? "Agent" : "AgentTeam"} '${address}' is not configured or a collaborator of this AgentOrg.`);
    }
    return source as Extract<AgentOrgTaskSource, { kind: TKind }>;
  }
}
