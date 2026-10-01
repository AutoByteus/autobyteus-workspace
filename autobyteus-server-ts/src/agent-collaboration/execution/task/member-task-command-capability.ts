import type { DelegateTaskInput, DelegateTaskResult } from "./task-delegation-command.js";
import {
  cloneRootExecutionIdentity,
  sameRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../domain/root-execution-identity.js";

export type MemberTaskCommandCapability = Readonly<{
  root: RootExecutionIdentity;
  delegateTask(
    caller: CollaborationMemberExecutionIdentity,
    input: DelegateTaskInput,
  ): Promise<DelegateTaskResult>;
}>;

export const requireMemberTaskCommandCapability = (
  value: MemberTaskCommandCapability | null | undefined,
): MemberTaskCommandCapability => {
  if (!value || typeof value.delegateTask !== "function") {
    throw new Error("MemberTaskCommandCapability is required.");
  }
  const root = cloneRootExecutionIdentity(value.root);
  return Object.freeze({
    root,
    delegateTask: (caller, input) => {
      assertCallerRoot(root, caller);
      return value.delegateTask(caller, input);
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
