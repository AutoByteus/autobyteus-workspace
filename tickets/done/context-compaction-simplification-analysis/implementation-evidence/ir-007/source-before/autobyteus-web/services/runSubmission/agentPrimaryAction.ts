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
  contextFilePaths: readonly unknown[];
}

/**
 * Whether a composer holds something to send. Text or a skill tag always counts.
 * Context files alone count only in the Chat box (standalone agents); the team and
 * org run-view boxes keep their text-required behavior.
 */
export const hasSendableDraft = (
  draft: SendableDraft,
  options: { attachmentsAreSendable: boolean },
): boolean => Boolean(draft.requirement.trim())
  || draft.requestedSkillNames.length > 0
  || (options.attachmentsAreSendable && draft.contextFilePaths.length > 0);
