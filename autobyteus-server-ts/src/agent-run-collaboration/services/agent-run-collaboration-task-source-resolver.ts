import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../agent-collaboration/domain/collaboration-handoff.js";
import {
  projectCollaboratorAgentSource,
  projectCollaboratorTeamSource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";

export type AgentRunCollaborationTaskSource =
  | Readonly<{ kind: "agent"; node: TeamRunAgentNode }>
  | Readonly<{ kind: "agent_team"; node: TeamRunAgentTeamNode; handoffs: readonly CollaborationHandoff[] }>;

/** An Agent root has no configured placements: every task source is a collaborator entry. */
export class AgentRunCollaborationTaskSourceResolver {
  constructor(private readonly getIndex: () => AgentRunCollaborationExecutionIndex) {}

  require<TKind extends AgentRunCollaborationTaskSource["kind"]>(
    address: AgentTeamAddress | string,
    kind: TKind,
    unavailable: (message: string) => Error = (message) => new Error(message),
  ): Extract<AgentRunCollaborationTaskSource, { kind: TKind }> {
    const entry = this.getIndex().getCollaborator(address);
    if (!entry || entry.kind !== kind) {
      throw unavailable(`${kind === "agent" ? "Agent" : "AgentTeam"} '${address}' is not a collaborator of this Agent run.`);
    }
    const source: AgentRunCollaborationTaskSource = entry.kind === "agent"
      ? Object.freeze({ kind: "agent", node: projectCollaboratorAgentSource(entry) })
      : Object.freeze({ kind: "agent_team", node: projectCollaboratorTeamSource(entry), handoffs: entry.handoffs });
    return source as Extract<AgentRunCollaborationTaskSource, { kind: TKind }>;
  }
}
