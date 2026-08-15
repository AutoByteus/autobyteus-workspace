import type { AgentContext } from '~/types/agent/AgentContext';
import type { ContextAttachment, UserMessage } from '~/types/conversation';
import {
  commitRecentEventMonitorEffect,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { resolveFirstUserMessageSummary } from '~/utils/runTreeSummary';

export interface BeginLocalUserSubmissionOptions {
  text: string;
  attachments: ContextAttachment[];
  navigationTarget: LocalUserSubmissionNavigationTarget;
}

export type LocalUserSubmissionNavigationTarget =
  | { kind: 'standalone'; runId: string }
  | {
      kind: 'team_member';
      teamRunId: string;
      agentRunId: string;
    };

export interface LocalUserSubmissionHandle {
  context: AgentContext;
  message: UserMessage;
  navigationTarget: LocalUserSubmissionNavigationTarget;
}

const nowIso = (): string => new Date().toISOString();

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'An unexpected error occurred.';
};

const applyLocalSubmissionNavigation = (
  context: AgentContext,
  target: LocalUserSubmissionNavigationTarget,
  occurredAt: string,
): void => {
  const currentStatus = context.state.currentStatus;
  const summary = resolveFirstUserMessageSummary(context.state.conversation) ?? undefined;
  useRunHistoryStore().applyRunNavigationEffect(
    { ...target, currentStatus, summary },
    { kind: 'PRESENTATION', occurredAt },
  );
};

const attachmentsEqual = (
  left: readonly ContextAttachment[] | undefined,
  right: readonly ContextAttachment[],
): boolean => JSON.stringify(left ?? []) === JSON.stringify(right);

export const beginLocalUserSubmission = (
  context: AgentContext,
  options: BeginLocalUserSubmissionOptions,
): LocalUserSubmissionHandle => {
  const occurredAt = nowIso();
  const submittedMessage: UserMessage = {
    type: 'user',
    text: options.text,
    timestamp: new Date(occurredAt),
    contextFilePaths: [...options.attachments],
  };

  context.state.conversation.messages.push(submittedMessage);
  commitRecentEventMonitorEffect(context, 'STRUCTURAL');
  context.state.conversation.updatedAt = occurredAt;
  context.requirement = '';
  context.contextFilePaths = [];
  context.submissionPending = true;
  applyLocalSubmissionNavigation(context, options.navigationTarget, occurredAt);

  return {
    context,
    message: submittedMessage,
    navigationTarget: options.navigationTarget,
  };
};

export const retargetLocalUserSubmission = (
  handle: LocalUserSubmissionHandle,
  navigationTarget: LocalUserSubmissionNavigationTarget,
): void => {
  handle.navigationTarget = navigationTarget;
};

export const finalizeLocalSubmissionAttachments = (
  handle: LocalUserSubmissionHandle,
  attachments: ContextAttachment[],
): boolean => {
  if (attachmentsEqual(handle.message.contextFilePaths, attachments)) return false;
  const occurredAt = nowIso();
  handle.message.contextFilePaths = [...attachments];
  commitRecentEventMonitorEffect(handle.context, 'PRESENTATION');
  handle.context.state.conversation.updatedAt = occurredAt;
  applyLocalSubmissionNavigation(handle.context, handle.navigationTarget, occurredAt);
  return true;
};

export const failLocalSubmission = (
  handle: LocalUserSubmissionHandle,
  error: unknown,
): void => {
  const occurredAt = nowIso();
  const message = toErrorMessage(error);
  handle.context.submissionPending = false;
  handle.context.state.conversation.messages.push({
    type: 'ai',
    text: 'Error Occurred',
    timestamp: new Date(occurredAt),
    isComplete: true,
    segments: [{
      type: 'error',
      source: 'System',
      message,
      details: error instanceof Error ? error.toString() : String(error),
    }],
  });
  commitRecentEventMonitorEffect(handle.context, 'STRUCTURAL');
  handle.context.state.conversation.updatedAt = occurredAt;
  applyLocalSubmissionNavigation(handle.context, handle.navigationTarget, occurredAt);
};
