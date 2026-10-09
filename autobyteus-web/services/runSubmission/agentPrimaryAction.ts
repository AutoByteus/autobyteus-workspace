import { AgentStatus } from '~/types/agent/AgentStatus';

export type AgentPrimaryAction =
  | { kind: 'interrupt'; enabled: true }
  | { kind: 'send'; enabled: true }
  | {
      kind: 'disabled';
      enabled: false;
      reason: 'no_context' | 'initializing' | 'submission_pending' | 'uploading' | 'empty_draft';
    };

export interface ResolveAgentPrimaryActionInput {
  hasContext: boolean;
  status: AgentStatus;
  submissionPending: boolean;
  isUploading: boolean;
  hasDraft: boolean;
}

export const resolveAgentPrimaryAction = (
  input: ResolveAgentPrimaryActionInput,
): AgentPrimaryAction => {
  if (!input.hasContext) {
    return { kind: 'disabled', enabled: false, reason: 'no_context' };
  }
  if (input.status === AgentStatus.Running) {
    return { kind: 'interrupt', enabled: true };
  }
  if (input.status === AgentStatus.Initializing) {
    return { kind: 'disabled', enabled: false, reason: 'initializing' };
  }
  if (input.submissionPending) {
    return { kind: 'disabled', enabled: false, reason: 'submission_pending' };
  }
  if (input.isUploading) {
    return { kind: 'disabled', enabled: false, reason: 'uploading' };
  }
  if (!input.hasDraft) {
    return { kind: 'disabled', enabled: false, reason: 'empty_draft' };
  }
  return { kind: 'send', enabled: true };
};

export interface SendableDraft {
  requirement: string;
  requestedSkillNames: readonly string[];
}

/**
 * Whether a composer holds something to send: typed text or a skill tag (which
 * supplies the instruction). Context files alone never make a draft sendable; they
 * go with a message, matching the server's non-empty input content rule.
 */
export const hasSendableDraft = (draft: SendableDraft): boolean =>
  Boolean(draft.requirement.trim()) || draft.requestedSkillNames.length > 0;
