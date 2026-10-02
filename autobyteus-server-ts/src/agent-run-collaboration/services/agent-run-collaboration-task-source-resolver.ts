import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  projectTaskExecutionSource,
  resolveCollaboratorCopySource,
  type CollaboratorCopySource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentRunCollaborationExecutionIndex } from "./agent-run-collaboration-execution-index.js";

export type AgentRunCollaborationTaskSource = CollaboratorCopySource;

/**
 * An Agent root has no configured placements: a task source is a catalog copy's recorded
 * `source`, else an extra copy projected from a collaborator entry (or a collaborator-Team member).
 */
export class AgentRunCollaborationTaskSourceResolver {
  constructor(private readonly getIndex: () => AgentRunCollaborationExecutionIndex) {}

  require<TKind extends AgentRunCollaborationTaskSource["kind"]>(
    address: AgentTeamAddress | string,
    kind: TKind,
    recorded?: TaskExecutionSource | null,
    unavailable: (message: string) => Error = (message) => new Error(message),
  ): Extract<AgentRunCollaborationTaskSource, { kind: TKind }> {
    const source = recorded
      ? projectTaskExecutionSource(address as AgentTeamAddress, recorded)
      : resolveCollaboratorCopySource(this.getIndex().listCollaborators(), address);
    if (!source || source.kind !== kind) {
      throw unavailable(`${kind === "agent" ? "Agent" : "AgentTeam"} '${address}' is not a collaborator of this Agent run.`);
    }
    return source as Extract<AgentRunCollaborationTaskSource, { kind: TKind }>;
  }
}
