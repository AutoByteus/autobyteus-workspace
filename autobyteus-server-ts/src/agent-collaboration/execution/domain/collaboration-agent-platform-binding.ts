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

export type CollaborationAgentPlatformBindingChange =
  | Readonly<{ kind: "adopt_or_retain"; binding: CollaborationAgentPlatformBinding }>
  | Readonly<{ kind: "replace_without_conversation"; replacement: CollaborationAgentNoConversationBindingReplacement }>;

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
