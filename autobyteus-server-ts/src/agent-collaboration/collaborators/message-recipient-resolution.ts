import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import type { CollaboratorAdmissionResult } from "./collaborator-admission.js";

/** One message target: the receiving Agent of an Agent address, or a Team's coordinator. */
export type CollaborationMessagePlacement = Readonly<{
  kind: "agent" | "agent_team";
  address: AgentTeamAddress;
  receiver: Readonly<{ agentRunId: string; address: AgentTeamAddress }>;
}>;

export const messagePlacement = (
  kind: CollaborationMessagePlacement["kind"],
  address: string,
  receiver: Readonly<{ agentRunId: string; address: string }>,
): CollaborationMessagePlacement => Object.freeze({
  kind,
  address: address as AgentTeamAddress,
  receiver: Object.freeze({ agentRunId: receiver.agentRunId, address: receiver.address as AgentTeamAddress }),
});

/** One concrete team instance (configured, collaborator, task copy) containing a sender. */
export type SenderTeamInstance = Readonly<{ teamRunId: string; address: AgentTeamAddress }>;

/** The index facts every root supplies for message resolution. */
export interface MessageRecipientIndexPort {
  /** The team instances containing the sender, deepest first; never the structural root `/`. */
  teamInstancesOf(senderAgentRunId: string): readonly SenderTeamInstance[];
  /**
   * Inside one instance: its coordinator for the instance's own address, else its member Agent
   * at `address` (never a task copy hosted by the instance). Null when the instance has none.
   */
  memberOfInstance(teamRunId: string, address: AgentTeamAddress): CollaborationMessagePlacement | null;
  /** Run-wide: a configured placement, a collaborator, or a collaborator-Team member. */
  getMessagePlacement(address: AgentTeamAddress): CollaborationMessagePlacement | null;
}

const isWithin = (address: AgentTeamAddress, instance: SenderTeamInstance): boolean =>
  address === instance.address || address.startsWith(`${instance.address}/`);

/** Step 3: the root's catalog bring-in, under the gate the caller already holds. */
export type CatalogBringInPort = Readonly<{
  /**
   * Serialized per root: brings the eligible catalog definition at `address` in with
   * `CollaboratorAdmission.ensure`; null when `address` is no catalog address (anymore: a
   * concurrent first message may have brought it in meanwhile).
   */
  bringIn(address: AgentTeamAddress): Promise<CollaboratorAdmissionResult | null>;
}>;

export type MessageRecipientResult =
  | Readonly<{ resolved: true; placement: CollaborationMessagePlacement }>
  | Readonly<{ resolved: false; code: "COLLABORATOR_ADD_FAILED"; message: string }>;

/**
 * The one `send_message_to(address)` resolution (DS-002), called inside the root gate.
 * (1) The sender's own team instances, deepest first: an address inside an instance resolves
 * only within that instance (AR-003, no fall-through), so parallel copies never cross.
 * (2) For a Task-owned sender, its Task's open helper at the address. (3) Run-wide; an owned
 * sender never borrows a Task-owned run. (4) A Task-owned sender brings in a new Task helper;
 * otherwise a listed catalog definition that is not in the run is brought in with the same
 * admission as `@` and the address resolves again to the new instance. A failed add returns
 * `COLLABORATOR_ADD_FAILED` (nothing was added); any other miss is the normal not found.
 * Bring-ins are serialized per root, so of two concurrent first messages the second finds the
 * instance the first one added.
 */
export const resolveMessageRecipient = async (input: Readonly<{
  port: () => MessageRecipientIndexPort;
  senderAgentRunId: string;
  address: AgentTeamAddress;
  catalog: CatalogBringInPort;
  taskScope?: Readonly<{
    /** Opaque owning Task of the copy containing the agent; `null` when the agent is not Task-owned. */
    taskOwnerOf(agentRunId: string): Readonly<{ taskId: string }> | null;
    helper(taskId: string, address: AgentTeamAddress): CollaborationMessagePlacement | null;
    bringIn(address: AgentTeamAddress): Promise<CollaborationMessagePlacement | null>;
  }>;
  notFoundMessage(address: AgentTeamAddress): string;
}>): Promise<MessageRecipientResult> => {
  const port = input.port();
  const owner = input.taskScope?.taskOwnerOf(input.senderAgentRunId) ?? null;
  // Own-instance misses cannot fall through to an identically addressed parallel copy.
  for (const instance of port.teamInstancesOf(input.senderAgentRunId)) {
    if (!isWithin(input.address, instance)) continue;
    const placement = port.memberOfInstance(instance.teamRunId, input.address);
    if (placement) return { resolved: true, placement };
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `Collaboration target '${input.address}' is not a member of your team instance '${instance.address}'.`);
  }
  if (owner) {
    const helper = input.taskScope!.helper(owner.taskId, input.address);
    if (helper) return { resolved: true, placement: helper };
  }
  const outside = port.getMessagePlacement(input.address);
  if (outside && (!owner || !input.taskScope?.taskOwnerOf(outside.receiver.agentRunId))) {
    return { resolved: true, placement: outside };
  }
  if (owner) {
    const helper = await input.taskScope!.bringIn(input.address);
    if (helper) return { resolved: true, placement: helper };
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", input.notFoundMessage(input.address));
  }
  const admission = await input.catalog.bringIn(input.address);
  if (admission && !admission.admitted) {
    return Object.freeze({
      resolved: false,
      code: admission.code,
      message: `${admission.collaboratorName} could not be added: ${admission.message}`,
    });
  }
  const placement = input.port().getMessagePlacement(input.address);
  if (placement) return Object.freeze({ resolved: true, placement });
  throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", input.notFoundMessage(input.address));
};
