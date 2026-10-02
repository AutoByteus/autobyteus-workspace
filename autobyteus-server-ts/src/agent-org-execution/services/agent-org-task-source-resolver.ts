import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  projectTaskExecutionSource,
  resolveCollaboratorCopySource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import { findAgentOrgConfiguredSourceNode } from "./agent-org-runtime-config-projector.js";

export type AgentOrgTaskSource =
  | Readonly<{ kind: "agent"; node: TeamRunAgentNode }>
  | Readonly<{ kind: "agent_team"; node: TeamRunAgentTeamNode; handoffs: readonly CollaborationHandoff[] }>;

/**
 * The runtime source of an Org task execution, on activation and on restore: a catalog copy's
 * recorded `source` first, then the configured placement, then an extra copy projected from
 * the run's collaborator entry. The adapter's only source reader.
 */
export class AgentOrgTaskSourceResolver {
  constructor(private readonly getTree: () => AgentOrgRunExecutionTreeSnapshot) {}

  resolve(address: AgentTeamAddress, recorded?: TaskExecutionSource | null): AgentOrgTaskSource | null {
    if (recorded) return projectTaskExecutionSource(address, recorded);
    const tree = this.getTree();
    const configured = findAgentOrgConfiguredSourceNode(tree, address);
    if (configured) {
      return configured.kind === "agent"
        ? Object.freeze({ kind: "agent", node: configured })
        : Object.freeze({ kind: "agent_team", node: configured, handoffs: tree.handoffs });
    }
    // An extra copy of a collaborator (or of a collaborator Team member) with pending identities.
    return resolveCollaboratorCopySource(tree.rootOrg.collaborators, address);
  }

  require<TKind extends AgentOrgTaskSource["kind"]>(
    address: AgentTeamAddress,
    kind: TKind,
    recorded?: TaskExecutionSource | null,
    unavailable: (message: string) => Error = (message) => new Error(message),
  ): Extract<AgentOrgTaskSource, { kind: TKind }> {
    const source = this.resolve(address, recorded);
    if (!source || source.kind !== kind) {
      throw unavailable(`${kind === "agent" ? "Agent" : "AgentTeam"} '${address}' is not configured or a collaborator of this AgentOrg.`);
    }
    return source as Extract<AgentOrgTaskSource, { kind: TKind }>;
  }
}
