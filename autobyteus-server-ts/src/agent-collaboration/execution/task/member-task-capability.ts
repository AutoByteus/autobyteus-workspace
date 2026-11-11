import type { DelegationWork } from "../../../model-routing/domain/model-routing-types.js";
import type { AgentTeamAddress } from "../../domain/agent-team-address.js";
import type { PeerRunLink } from "../remote/peer-run-link.js";
import type { TaskDelegationOutcome } from "./task-delegation-command.js";
import type { LocalDelegationPlacement } from "./task-delegation.js";
import type { TaskExecutionOwner } from "./task-execution-resource-port.js";
import {
  cloneRootExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../domain/root-execution-identity.js";

/** A delegation the sender's root refuses for its own run (an inactive root). */
export type DelegationRefusal = Extract<TaskDelegationOutcome, { delegated: false }>;

/**
 * What the sender's root answers for its own run when one of its agents delegates (autobyteus-461 SR-049), read in its
 * gate: the sender, its run and its address; its own catalog address map with the own-address, own-team and
 * own-definition refusals (`resolvePlacement`, in its gate again); and its view's notice of a peer run it delegated to.
 * The delegation itself (the Task side, the new run, the work packet) is the tool path's, through `TaskDelegation`.
 */
export type DelegationSource = Readonly<{
  sender: CollaborationMemberExecutionIdentity;
  senderRun: RootExecutionIdentity;
  delegatorAddress: AgentTeamAddress | null;
  resolvePlacement(address: string, work: DelegationWork, folder: string | null): Promise<LocalDelegationPlacement>;
  peerRunLinked(link: PeerRunLink): void;
}>;

/**
 * The caller's root-bound Task capability: what its root answers for a delegation by one of its agents, and the read
 * of the Task it works on.
 */
export type MemberTaskCapability = Readonly<{
  root: RootExecutionIdentity;
  delegationSource(caller: CollaborationMemberExecutionIdentity): Promise<DelegationSource | DelegationRefusal>;
  /**
   * The Task the caller works on: its copy's current Task (the root's `ownerOf` over its containment chain), or null
   * when it works on none. Throws `TASK_AGENT_RESOURCES_UNAVAILABLE` when that can't be told (damaged run data).
   */
  ownedTaskOf(caller: CollaborationMemberExecutionIdentity): TaskExecutionOwner | null;
}>;

export const requireMemberTaskCapability = (
  value: MemberTaskCapability | null | undefined,
): MemberTaskCapability => {
  if (!value || typeof value.delegationSource !== "function" || typeof value.ownedTaskOf !== "function") {
    throw new Error("MemberTaskCapability is required.");
  }
  const root = cloneRootExecutionIdentity(value.root);
  return Object.freeze({
    root,
    delegationSource: (caller) => {
      assertCallerRoot(root, caller);
      return value.delegationSource(caller);
    },
    ownedTaskOf: (caller) => {
      assertCallerRoot(root, caller);
      return value.ownedTaskOf(caller);
    },
  });
};

const assertCallerRoot = (
  root: RootExecutionIdentity,
  caller: CollaborationMemberExecutionIdentity,
): void => {
  if (!sameRootExecutionIdentity(root, caller.root)) {
    throw new Error("Task caller and bound Task capability belong to different roots.");
  }
};
