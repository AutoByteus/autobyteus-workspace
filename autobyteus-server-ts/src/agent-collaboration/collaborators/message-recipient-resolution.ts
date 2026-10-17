import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import { CollaborationContractError } from "../domain/collaboration-contract-error.js";
import { messageTargetNotFoundMessage } from "./collaborator-errors.js";

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

/** One concrete team instance (configured placement or task copy) containing a sender. */
export type SenderTeamInstance = Readonly<{ teamRunId: string; address: AgentTeamAddress }>;

/** The index facts every root supplies for message resolution and for the own-Team delegation rule. */
export interface MessageRecipientIndexPort {
  /** The team instances containing the sender, deepest first; never the structural root `/`. */
  teamInstancesOf(senderAgentRunId: string): readonly SenderTeamInstance[];
  /**
   * Inside one instance: its coordinator for the instance's own address, else its member Agent
   * at `address` (never a task copy hosted by the instance). Null when the instance has none.
   */
  memberOfInstance(teamRunId: string, address: AgentTeamAddress): CollaborationMessagePlacement | null;
  /** Run-wide: a configured placement, or the run's own agent (Agent roots). */
  getMessagePlacement(address: AgentTeamAddress): CollaborationMessagePlacement | null;
  /**
   * CM-1 membership test (DEC-008): true when `address` is the sender's own address, or lies
   * inside (or is) a Team instance that contains the sender, at any depth; in a Team root also
   * when the sender is a configured member and `address` is a configured placement of the root Team.
   */
  isOwnTeamAddress(senderAgentRunId: string, address: AgentTeamAddress): boolean;
}

/** Whether `address` is the instance's own address or lies inside it, at any depth. */
export const isWithinTeamInstance = (address: string, instance: SenderTeamInstance): boolean =>
  address === instance.address || address.startsWith(`${instance.address}/`);

/** Shared part of every index's `isOwnTeamAddress`: the sender's own address and its containing instances. */
export const isInsideSenderTeamInstances = (
  instances: readonly SenderTeamInstance[],
  senderAddress: string,
  address: string,
): boolean => address === senderAddress || instances.some((instance) => isWithinTeamInstance(address, instance));

/**
 * The one `send_message_to(address)` resolution (DS-002), called inside the root gate. Messaging
 * only resolves; it never creates a run (CM-4).
 * (1) The sender's own team instances, deepest first: an address inside an instance resolves
 * only within that instance (AR-003, no fall-through), so parallel copies never cross.
 * (2) Run-wide standing placements. Anything else is `COLLABORATION_TARGET_NOT_FOUND` with
 * guidance to use `delegate_task` for an outside Agent or Team.
 */
export const resolveMessageRecipient = (input: Readonly<{
  port: () => MessageRecipientIndexPort;
  senderAgentRunId: string;
  address: AgentTeamAddress;
}>): CollaborationMessagePlacement => {
  const port = input.port();
  // Own-instance misses cannot fall through to an identically addressed parallel copy.
  for (const instance of port.teamInstancesOf(input.senderAgentRunId)) {
    if (!isWithinTeamInstance(input.address, instance)) continue;
    const placement = port.memberOfInstance(instance.teamRunId, input.address);
    if (placement) return placement;
    throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", `Collaboration target '${input.address}' is not a member of your team instance '${instance.address}'.`);
  }
  const outside = port.getMessagePlacement(input.address);
  if (outside) return outside;
  throw new CollaborationContractError("COLLABORATION_TARGET_NOT_FOUND", messageTargetNotFoundMessage(input.address));
};

/**
 * T-5: the address to give for `agent` in a message `viewerAgentRunId` receives (or, with `null`,
 * in a new task agent's first message): the agent's own address only when `send_message_to` with
 * it reaches exactly that agent, from the viewer's position (its own team instances, then the run's
 * standing placements) or run-wide for `null`. A task agent, or a member of a task agent team seen
 * from outside its team, gets `null`: its address would reach someone else or no one.
 */
export const reachingAddressOf = (
  port: MessageRecipientIndexPort,
  viewerAgentRunId: string | null,
  agent: Readonly<{ memberAddress: AgentTeamAddress; agentRunId: string }>,
): AgentTeamAddress | null => {
  let placement: CollaborationMessagePlacement | null;
  if (viewerAgentRunId === null) {
    placement = port.getMessagePlacement(agent.memberAddress);
  } else {
    try {
      placement = resolveMessageRecipient({ port: () => port, senderAgentRunId: viewerAgentRunId, address: agent.memberAddress });
    } catch (error) {
      if (error instanceof CollaborationContractError && error.code === "COLLABORATION_TARGET_NOT_FOUND") return null;
      throw error;
    }
  }
  return placement?.kind === "agent" && placement.receiver.agentRunId === agent.agentRunId ? agent.memberAddress : null;
};
