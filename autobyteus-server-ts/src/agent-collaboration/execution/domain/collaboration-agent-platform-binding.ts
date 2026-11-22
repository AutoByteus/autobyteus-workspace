import {
  cloneCollaborationMemberExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "./root-execution-identity.js";

export type CollaborationAgentPlatformBinding = Readonly<{
  execution: CollaborationMemberExecutionIdentity;
  platformAgentRunId: string;
}>;

/**
 * A compare-and-set replacement of a member's stored session ID: `binding` replaces the stored ID only if it still equals
 * `expectedPreviousPlatformAgentRunId`. Two kinds use it, each keeping its own meaning: a member whose session had no
 * conversation (`replace_without_conversation`), and a session renewal of a lost runtime session (`replace_lost_session`,
 * autobyteus-599), whose expected previous ID is the lost one.
 */
export type CollaborationAgentBindingReplacement = Readonly<{
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
  | Readonly<{ kind: "replace_without_conversation"; replacement: CollaborationAgentBindingReplacement }>
  | Readonly<{ kind: "replace_lost_session"; replacement: CollaborationAgentBindingReplacement }>
  | CollaborationAgentRuntimeSwitchCommit;

/** The member a binding change is for. */
export const platformBindingChangeExecution = (change: CollaborationAgentPlatformBindingChange): CollaborationMemberExecutionIdentity =>
  change.kind === "adopt_or_retain" ? change.binding.execution
    : change.kind === "replace_without_conversation" || change.kind === "replace_lost_session" ? change.replacement.binding.execution
      : change.execution;

/** The session ID a binding change leaves on the member (`null`: none, the native agent runtime). */
export const platformBindingChangeSessionId = (change: CollaborationAgentPlatformBindingChange): string | null =>
  change.kind === "adopt_or_retain" ? change.binding.platformAgentRunId
    : change.kind === "replace_without_conversation" || change.kind === "replace_lost_session" ? change.replacement.binding.platformAgentRunId
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

export const createCollaborationAgentBindingReplacement = (input: {
  binding: CollaborationAgentPlatformBinding;
  expectedPreviousPlatformAgentRunId: string;
}): CollaborationAgentBindingReplacement => {
  const expectedPreviousPlatformAgentRunId = input.expectedPreviousPlatformAgentRunId?.trim();
  if (!expectedPreviousPlatformAgentRunId) {
    throw new Error("expectedPreviousPlatformAgentRunId is required.");
  }
  if (expectedPreviousPlatformAgentRunId === input.binding.platformAgentRunId) {
    throw new Error("A binding replacement must change the provider identity.");
  }
  return Object.freeze({
    binding: createCollaborationAgentPlatformBinding(input.binding),
    expectedPreviousPlatformAgentRunId,
  });
};
