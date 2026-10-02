import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import type {
  TaskAgentExecutionSource,
  TaskExecutionSource,
  TaskTeamExecutionSource,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { CatalogTaskSource } from "./collaborator-admission.js";
import { CollaboratorAddError } from "./collaborator-errors.js";
import { projectTaskSourceMember } from "./collaborator-source-projector.js";
import type { SenderTeamInstance } from "./message-recipient-resolution.js";

/** The index facts a root supplies for delegation inside a catalog Team copy. */
export interface DelegationSourceIndexPort {
  teamInstancesOf(senderAgentRunId: string): readonly SenderTeamInstance[];
  /** The recorded catalog source of a task Team copy; null for every other Team instance. */
  instanceCatalogSource(teamRunId: string): TaskTeamExecutionSource | null;
}

/**
 * A delegation target in any root: an Agent or Agent Team placement. `source` is present only
 * when the copy starts from a definition snapshot (a catalog definition, or a teammate inside
 * a catalog Team copy); otherwise the root resolves the source from its own placements.
 */
export type DelegationPlacement =
  | Readonly<{ kind: "agent"; address: AgentTeamAddress; source?: TaskAgentExecutionSource }>
  | Readonly<{ kind: "agent_team"; address: AgentTeamAddress; coordinatorAddress: AgentTeamAddress; source?: TaskTeamExecutionSource }>;

const sourcedPlacement = (address: AgentTeamAddress, source: TaskExecutionSource): DelegationPlacement =>
  source.kind === "agent"
    ? Object.freeze({ kind: "agent", address, source })
    : Object.freeze({ kind: "agent_team", address, coordinatorAddress: source.coordinatorAddress, source });

/**
 * `delegate_task(address)` placement (DS-003), called inside the root gate:
 * 1. a teammate inside the sender's own catalog Team copy, from that copy's snapshot (REQ-007);
 * 2. the root's in-run placements (configured, then collaborator), unchanged;
 * 3. a listed catalog definition that is not in the run: a fresh copy with its source
 *    snapshot. No collaborator entry is created (Q-1).
 * A catalog definition that cannot run returns its reason as a not-found delegation result.
 */
export const resolveDelegationPlacement = async (input: Readonly<{
  port: DelegationSourceIndexPort;
  senderAgentRunId: string;
  address: AgentTeamAddress;
  resolveInRun(): DelegationPlacement;
  catalogSource(): Promise<CatalogTaskSource | null>;
}>): Promise<DelegationPlacement> => {
  for (const instance of input.port.teamInstancesOf(input.senderAgentRunId)) {
    if (!input.address.startsWith(`${instance.address}/`)) continue;
    const snapshot = input.port.instanceCatalogSource(instance.teamRunId);
    const member = snapshot ? projectTaskSourceMember(snapshot, input.address) : null;
    if (member) return sourcedPlacement(input.address, member);
    break;
  }
  try {
    return input.resolveInRun();
  } catch (error) {
    if (!(error instanceof CollaborationContractError) || error.code !== "COLLABORATION_TARGET_NOT_FOUND") throw error;
    let catalog: CatalogTaskSource | null;
    try {
      catalog = await input.catalogSource();
    } catch (cause) {
      if (cause instanceof CollaboratorAddError) {
        throw new CollaborationContractError(
          "COLLABORATION_TARGET_NOT_FOUND",
          `${cause.collaboratorName} cannot be delegated to: ${cause.reason}`,
        );
      }
      throw cause;
    }
    if (!catalog) throw error;
    return sourcedPlacement(input.address, catalog.source);
  }
};
