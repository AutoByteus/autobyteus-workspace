import type {
  DelegateTaskInput,
  DelegateTaskResult,
  ReviewTaskResultInput,
  ReviewTaskResultResult,
  SubmitTaskResultInput,
  SubmitTaskResultResult,
} from "./task-lifecycle-command.js";
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
  submitTaskResult(
    caller: CollaborationMemberExecutionIdentity,
    input: SubmitTaskResultInput,
  ): Promise<SubmitTaskResultResult>;
  reviewTaskResult(
    caller: CollaborationMemberExecutionIdentity,
    input: ReviewTaskResultInput,
  ): Promise<ReviewTaskResultResult>;
}>;

export const requireMemberTaskCommandCapability = (
  value: MemberTaskCommandCapability | null | undefined,
): MemberTaskCommandCapability => {
  if (
    !value
    || typeof value.delegateTask !== "function"
    || typeof value.submitTaskResult !== "function"
    || typeof value.reviewTaskResult !== "function"
  ) {
    throw new Error("MemberTaskCommandCapability is required.");
  }
  const root = cloneRootExecutionIdentity(value.root);
  return Object.freeze({
    root,
    delegateTask: (caller, input) => {
      assertCallerRoot(root, caller);
      return value.delegateTask(caller, input);
    },
    submitTaskResult: (caller, input) => {
      assertCallerRoot(root, caller);
      return value.submitTaskResult(caller, input);
    },
    reviewTaskResult: (caller, input) => {
      assertCallerRoot(root, caller);
      return value.reviewTaskResult(caller, input);
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
