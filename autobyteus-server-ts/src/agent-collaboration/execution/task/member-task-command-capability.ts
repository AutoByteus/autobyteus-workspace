import type { AssignToExistingCopyInput, SpawnTaskInput, TaskDelegationOutcome } from "./task-delegation-command.js";
import {
  cloneRootExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../domain/root-execution-identity.js";

/** The caller's root-bound task commands, one per subject: a new copy from an address, or an existing copy by its ID. */
export type MemberTaskCommandCapability = Readonly<{
  root: RootExecutionIdentity;
  delegateToNewCopy(caller: CollaborationMemberExecutionIdentity, input: SpawnTaskInput): Promise<TaskDelegationOutcome>;
  assignToExistingCopy(caller: CollaborationMemberExecutionIdentity, input: AssignToExistingCopyInput): Promise<TaskDelegationOutcome>;
}>;

export const requireMemberTaskCommandCapability = (
  value: MemberTaskCommandCapability | null | undefined,
): MemberTaskCommandCapability => {
  if (!value || typeof value.delegateToNewCopy !== "function" || typeof value.assignToExistingCopy !== "function") {
    throw new Error("MemberTaskCommandCapability is required.");
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
  });
};

const assertCallerRoot = (
  root: RootExecutionIdentity,
  caller: CollaborationMemberExecutionIdentity,
): void => {
  if (!sameRootExecutionIdentity(root, caller.root)) {
    throw new Error("Task caller and bound command capability belong to different roots.");
  }
};
