import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";
import {
  projectTaskExecutionSource,
  type CollaboratorCopySource,
} from "../../agent-collaboration/collaborators/collaborator-source-projector.js";
import type { TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";

export type StandaloneRootTaskSource = CollaboratorCopySource;

/**
 * An Agent root has no configured placements: a task source is a copy's recorded catalog
 * `source`; a copy without one has no source ("absent source means configured placement only").
 */
export class StandaloneRootTaskSourceResolver {
  resolve(address: AgentTeamAddress | string, recorded?: TaskExecutionSource | null): StandaloneRootTaskSource | null {
    return recorded ? projectTaskExecutionSource(address as AgentTeamAddress, recorded) : null;
  }

  require<TKind extends StandaloneRootTaskSource["kind"]>(
    address: AgentTeamAddress | string,
    kind: TKind,
    recorded?: TaskExecutionSource | null,
    unavailable: (message: string) => Error = (message) => new Error(message),
  ): Extract<StandaloneRootTaskSource, { kind: TKind }> {
    const source = this.resolve(address, recorded);
    if (!source || source.kind !== kind) {
      throw unavailable(`${kind === "agent" ? "Agent" : "AgentTeam"} '${address}' has no recorded source in this Agent run.`);
    }
    return source as Extract<StandaloneRootTaskSource, { kind: TKind }>;
  }
}
