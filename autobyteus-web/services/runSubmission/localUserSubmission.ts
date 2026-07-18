import type { AgentContext } from '~/types/agent/AgentContext';
import type { ContextAttachment, UserMessage } from '~/types/conversation';
import { commitRecentEventMonitorMutation } from '~/services/eventMonitor/recentEventMonitorWindow';

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
  commitRecentEventMonitorMutation(context, 'changed');
  context.state.conversation.updatedAt = nowIso();
  context.requirement = '';
  context.contextFilePaths = [];
  context.isSending = true;

  return {
    context,
    message: submittedMessage,
  };
};

export const finalizeLocalSubmissionAttachments = (
  handle: LocalUserSubmissionHandle,
  attachments: ContextAttachment[],
): void => {
  const previous = handle.message.contextFilePaths ?? [];
  const changed = previous.length !== attachments.length
    || previous.some((attachment, index) => {
      const next = attachments[index];
      if (!next) return true;
      const keys = new Set([...Object.keys(attachment), ...Object.keys(next)]);
      return [...keys].some((key) =>
        (attachment as unknown as Record<string, unknown>)[key]
          !== (next as unknown as Record<string, unknown>)[key]);
    });
  handle.message.contextFilePaths = [...attachments];
  if (changed) commitRecentEventMonitorMutation(handle.context, 'changed');
  handle.context.state.conversation.updatedAt = nowIso();
};

export const failLocalSubmission = (
  handle: LocalUserSubmissionHandle,
  error: unknown,
): void => {
  const message = toErrorMessage(error);
  handle.context.isSending = false;
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
  commitRecentEventMonitorMutation(handle.context, 'changed');
  handle.context.state.conversation.updatedAt = nowIso();
};
