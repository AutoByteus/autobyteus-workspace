import {
  cloneCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "./root-execution-identity.js";

export type CollaborationAgentPlatformBinding = Readonly<{
  execution: CollaborationMemberExecutionIdentity;
  platformAgentRunId: string;
}>;

export type CollaborationAgentNoConversationBindingReplacement = Readonly<{
  binding: CollaborationAgentPlatformBinding;
  expectedPreviousPlatformAgentRunId: string;
}>;

/**
 * autobyteus-348: the activation of a member whose agent runtime was switched. It names the member itself (the native agent
 * runtime has no provider session, so `platformAgentRunId` is `null` and there is no binding to read it from) and the switch
 * it makes real, so a root commits the new session ID and removes the pending switch in one write, and a commit for any
 * other switch is a conflict.
 */
export type CollaborationAgentRuntimeSwitchCommit = Readonly<{
  kind: "runtime_switch";
  execution: CollaborationMemberExecutionIdentity;
  switchId: string;
  platformAgentRunId: string | null;
}>;

export type CollaborationAgentPlatformBindingChange =
  | Readonly<{ kind: "adopt_or_retain"; binding: CollaborationAgentPlatformBinding }>
  | Readonly<{ kind: "replace_without_conversation"; replacement: CollaborationAgentNoConversationBindingReplacement }>
  | CollaborationAgentRuntimeSwitchCommit;

/** The member a binding change is for. */
export const platformBindingChangeExecution = (change: CollaborationAgentPlatformBindingChange): CollaborationMemberExecutionIdentity =>
  change.kind === "adopt_or_retain" ? change.binding.execution
    : change.kind === "replace_without_conversation" ? change.replacement.binding.execution
      : change.execution;

/** The session ID a binding change leaves on the member (`null`: none, the native agent runtime). */
export const platformBindingChangeSessionId = (change: CollaborationAgentPlatformBindingChange): string | null =>
  change.kind === "adopt_or_retain" ? change.binding.platformAgentRunId
    : change.kind === "replace_without_conversation" ? change.replacement.binding.platformAgentRunId
      : change.platformAgentRunId;

export const createCollaborationAgentRuntimeSwitchCommit = (input: {
  execution: CollaborationMemberExecutionIdentity;
  switchId: string;
  platformAgentRunId: string | null;
}): CollaborationAgentRuntimeSwitchCommit => {
  const switchId = input.switchId?.trim();
  if (!switchId) throw new Error("switchId is required.");
  const platformAgentRunId = input.platformAgentRunId === null ? null : input.platformAgentRunId?.trim() || null;
  return Object.freeze({
    kind: "runtime_switch" as const,
    execution: cloneCollaborationMemberExecutionIdentity(input.execution),
    switchId,
    platformAgentRunId,
  });
};

export const createCollaborationAgentPlatformBinding = (input: {
  execution: CollaborationMemberExecutionIdentity;
  platformAgentRunId: string;
}): CollaborationAgentPlatformBinding => {
  const platformAgentRunId = input.platformAgentRunId?.trim();
  if (!platformAgentRunId) throw new Error("platformAgentRunId is required.");
  return Object.freeze({
    execution: cloneCollaborationMemberExecutionIdentity(input.execution),
    platformAgentRunId,
  });
};

export const createCollaborationAgentNoConversationBindingReplacement = (input: {
  binding: CollaborationAgentPlatformBinding;
  expectedPreviousPlatformAgentRunId: string;
}): CollaborationAgentNoConversationBindingReplacement => {
  const expectedPreviousPlatformAgentRunId = input.expectedPreviousPlatformAgentRunId?.trim();
  if (!expectedPreviousPlatformAgentRunId) {
    throw new Error("expectedPreviousPlatformAgentRunId is required.");
  }
  if (expectedPreviousPlatformAgentRunId === input.binding.platformAgentRunId) {
    throw new Error("A no-conversation binding replacement must change the provider identity.");
  }
  return Object.freeze({
    binding: createCollaborationAgentPlatformBinding(input.binding),
    expectedPreviousPlatformAgentRunId,
  });
};
