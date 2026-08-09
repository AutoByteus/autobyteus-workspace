import type { AgentContext } from '~/types/agent/AgentContext';
import type { ContextAttachment, UserMessage } from '~/types/conversation';
import {
  commitRecentEventMonitorEffect,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';

export interface BeginLocalUserSubmissionOptions {
  text: string;
  attachments: ContextAttachment[];
}

export interface LocalUserSubmissionHandle {
  context: AgentContext;
  message: UserMessage;
}

const nowIso = (): string => new Date().toISOString();

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'An unexpected error occurred.';
};

export const beginLocalUserSubmission = (
  context: AgentContext,
  options: BeginLocalUserSubmissionOptions,
): LocalUserSubmissionHandle => {
  const submittedMessage: UserMessage = {
    type: 'user',
    text: options.text,
    timestamp: new Date(),
    contextFilePaths: [...options.attachments],
  };

  context.state.conversation.messages.push(submittedMessage);
  commitRecentEventMonitorEffect(context, 'STRUCTURAL');
  context.state.conversation.updatedAt = nowIso();
  context.requirement = '';
  context.contextFilePaths = [];
  context.submissionPending = true;

  return {
    context,
    message: submittedMessage,
  };
};

export const finalizeLocalSubmissionAttachments = (
  handle: LocalUserSubmissionHandle,
  attachments: ContextAttachment[],
): void => {
  handle.message.contextFilePaths = [...attachments];
  commitRecentEventMonitorEffect(handle.context, 'PRESENTATION');
  handle.context.state.conversation.updatedAt = nowIso();
};

export const failLocalSubmission = (
  handle: LocalUserSubmissionHandle,
  error: unknown,
): void => {
  const message = toErrorMessage(error);
  handle.context.submissionPending = false;
  handle.context.state.conversation.messages.push({
    type: 'ai',
    text: 'Error Occurred',
    timestamp: new Date(),
    isComplete: true,
    segments: [{
      type: 'error',
      source: 'System',
      message,
      details: error instanceof Error ? error.toString() : String(error),
    }],
  });
  commitRecentEventMonitorEffect(handle.context, 'STRUCTURAL');
  handle.context.state.conversation.updatedAt = nowIso();
};
