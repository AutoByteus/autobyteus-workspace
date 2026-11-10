import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import {
  sourceInFolder,
  type TaskAgentExecutionSource,
  type TaskExecutionSource,
  type TaskTeamExecutionSource,
} from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { CatalogTaskSource } from "./collaborator-admission.js";
import { CollaboratorAddError, ownTeamDelegationRefusedMessage, selfDelegationRefusedMessage } from "./collaborator-errors.js";
import type { PeerNodeRef } from "../execution/remote/remote-run-channel.js";
import type { DelegationWork, RoutingDecisionDraft } from "../../model-routing/domain/model-routing-types.js";

/** The index facts a root supplies for the self and own-Team delegation rules (CM-1, DEC-008; autobyteus-435 REQ-013). */
export interface DelegationSourceIndexPort {
  agentAddressOf(agentRunId: string): AgentTeamAddress | null;
  isOwnTeamAddress(senderAgentRunId: string, address: AgentTeamAddress): boolean;
}

/**
 * A delegation target in any root: an Agent or Agent Team placement. Every placement carries the
 * snapshot the copy starts from (`source`): a catalog definition's, or a configured placement's as it
 * is now (D-1).
 * `launchNotes` are present only on a fresh catalog admission's placement (never on a snapshot
 * re-projection or an in-run placement), so a recorded fallback is never repeated as new.
 */
export type DelegationPlacement =
  | Readonly<{
      kind: "agent"; address: AgentTeamAddress; source: TaskAgentExecutionSource; launchNotes?: readonly string[];
      routingDecision?: RoutingDecisionDraft;
    }>
  | Readonly<{
      kind: "agent_team";
      address: AgentTeamAddress;
      coordinatorAddress: AgentTeamAddress;
      source: TaskTeamExecutionSource;
      launchNotes?: readonly string[];
      routingDecision?: RoutingDecisionDraft;
    }>
  | RemoteAgentPlacement;

/**
 * An Agent or Agent Team on a peer node (`delegate_task` with `node`, DEC-111): the peer, the target's catalog
 * address there, and the described work, which the peer words into its run's first message (it names this node).
 */
export type RemoteAgentPlacement = Readonly<{
  kind: "remote_agent";
  address: AgentTeamAddress;
  peer: PeerNodeRef;
  description: string;
  /** The work and its Task, sent with the start request: the peer's Model Router is told it (DS-002). */
  work: DelegationWork;
  launchNotes?: never;
  routingDecision?: never;
}>;

/**
 * The placement of a copy at `address` that starts from `source`; a fresh catalog admission's notes and (Model Routing
 * on) decision draft go with it.
 */
export const sourcedPlacement = (
  address: AgentTeamAddress,
  source: TaskExecutionSource,
  admission: Readonly<{ launchNotes?: readonly string[]; routingDecision?: RoutingDecisionDraft }> = {},
): DelegationPlacement => {
  const extras = {
    ...(admission.launchNotes?.length ? { launchNotes: admission.launchNotes } : {}),
    ...(admission.routingDecision ? { routingDecision: admission.routingDecision } : {}),
  };
  return source.kind === "agent"
    ? Object.freeze({ kind: "agent", address, source, ...extras })
    : Object.freeze({ kind: "agent_team", address, coordinatorAddress: source.coordinatorAddress, source, ...extras });
};

const placementInFolder = (placement: DelegationPlacement, folder: string | null): DelegationPlacement =>
  folder === null || placement.kind === "remote_agent"
    ? placement
    : Object.freeze({ ...placement, source: sourceInFolder(placement.source, folder) }) as DelegationPlacement;

/**
 * `delegate_task(address)` placement (DS-001), called inside the root gate:
 * 1. CM-1: the sender itself, a teammate or its own Team is refused before any placement,
 *    preparation or Task link, with guidance to use `send_message_to`;
 * 2. the root's in-run configured placements, with the placement's snapshot;
 * 3. a listed catalog definition that is not in the run: a fresh copy with its source snapshot.
 * A catalog definition that cannot run returns its reason as a not-found delegation result.
 * A new copy with its own folder (`newCopyFolder`) runs there in both forms; `null` keeps the placement's or base's.
 */
export const resolveDelegationPlacement = async (input: Readonly<{
  port: DelegationSourceIndexPort;
  senderAgentRunId: string;
  address: AgentTeamAddress;
  newCopyFolder: string | null;
  resolveInRun(): DelegationPlacement;
  catalogSource(workspaceRootPath: string | null): Promise<CatalogTaskSource | null>;
}>): Promise<DelegationPlacement> => {
  // The sender's own address is told apart from a teammate's, so the agent is not told to message itself.
  if (input.address === input.port.agentAddressOf(input.senderAgentRunId)) {
    throw new CollaborationContractError("COLLABORATION_SELF_TARGET_REJECTED", selfDelegationRefusedMessage(input.address));
  }
  if (input.port.isOwnTeamAddress(input.senderAgentRunId, input.address)) {
    throw new CollaborationContractError("COLLABORATION_SELF_TARGET_REJECTED", ownTeamDelegationRefusedMessage(input.address));
  }
  try {
    return placementInFolder(input.resolveInRun(), input.newCopyFolder);
  } catch (error) {
    if (!(error instanceof CollaborationContractError) || error.code !== "COLLABORATION_TARGET_NOT_FOUND") throw error;
    let catalog: CatalogTaskSource | null;
    try {
      catalog = await input.catalogSource(input.newCopyFolder);
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
    return sourcedPlacement(input.address, catalog.source, catalog);
  }
};
