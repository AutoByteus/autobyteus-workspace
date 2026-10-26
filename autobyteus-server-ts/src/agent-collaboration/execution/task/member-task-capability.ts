import type { AssignToExistingCopyInput, SpawnTaskInput, TaskDelegationOutcome } from "./task-delegation-command.js";
import type { TaskExecutionOwner } from "./task-execution-resource-port.js";
import {
  cloneRootExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../domain/root-execution-identity.js";

/**
 * The caller's root-bound Task capability: its task commands, one per subject (a new copy from an address, or an
 * existing copy by its ID), and the read of the Task it works on.
 */
export type MemberTaskCapability = Readonly<{
  root: RootExecutionIdentity;
  delegateToNewCopy(caller: CollaborationMemberExecutionIdentity, input: SpawnTaskInput): Promise<TaskDelegationOutcome>;
  assignToExistingCopy(caller: CollaborationMemberExecutionIdentity, input: AssignToExistingCopyInput): Promise<TaskDelegationOutcome>;
  /**
   * The Task the caller works on: its copy's current Task (the root's `ownerOf` over its containment chain), or null
   * when it works on none. Throws `TASK_AGENT_RESOURCES_UNAVAILABLE` when that can't be told (damaged run data).
   */
  ownedTaskOf(caller: CollaborationMemberExecutionIdentity): TaskExecutionOwner | null;
}>;

export const requireMemberTaskCapability = (
  value: MemberTaskCapability | null | undefined,
): MemberTaskCapability => {
  if (!value || typeof value.delegateToNewCopy !== "function" || typeof value.assignToExistingCopy !== "function"
    || typeof value.ownedTaskOf !== "function") {
    throw new Error("MemberTaskCapability is required.");
  }
  const root = cloneRootExecutionIdentity(value.root);
  return Object.freeze({
    root,
    delegateToNewCopy: (caller, input) => {
      assertCallerRoot(root, caller);
      return value.delegateToNewCopy(caller, input);
    },
    assignToExistingCopy: (caller, input) => {
      assertCallerRoot(root, caller);
      return value.assignToExistingCopy(caller, input);
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
