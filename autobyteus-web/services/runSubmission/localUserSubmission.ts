import { reactive } from 'vue';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { ContextAttachment, UserMessage } from '~/types/conversation';
import type { RequestedCollaboratorMention } from '~/utils/collaborators/collaboratorMentionText';
import {
  commitRecentEventMonitorEffect,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { resolveFirstUserMessageSummary } from '~/utils/runTreeSummary';
import { CollaboratorAddRejection } from '~/services/collaborators/collaboratorAddFailures';

export interface BeginLocalUserSubmissionOptions {
  text: string;
  attachments: ContextAttachment[];
  // Null keeps local composer/conversation effects without optimistic history navigation.
  navigationTarget: LocalUserSubmissionNavigationTarget | null;
  /** `@` mentions sent with this message; their names render as inline chips. */
  mentions?: readonly RequestedCollaboratorMention[];
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
  /**
   * A send with `@` mentions is held (AR-007): the composer keeps the draft and the message is
   * not shown until the root accepts it, because admission may reject the whole send.
   */
  held: boolean;
  // Null keeps local composer/conversation effects without optimistic history navigation.
  navigationTarget: LocalUserSubmissionNavigationTarget | null;
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
  target: LocalUserSubmissionNavigationTarget | null,
  occurredAt: string,
): void => {
  if (!target) return;
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
  const submittedMessage = reactive<UserMessage>({
    type: 'user',
    text: options.text,
    timestamp: new Date(occurredAt),
    contextFilePaths: [...options.attachments],
    ...(options.mentions?.length ? { mentionNames: options.mentions.map((mention) => mention.name) } : {}),
  });
  const handle: LocalUserSubmissionHandle = {
    context,
    message: submittedMessage,
    navigationTarget: options.navigationTarget,
    held: Boolean(options.mentions?.length),
  };
  // A new send replaces the notice of the previous one.
  context.collaboratorAddFailure = null;
  context.submissionPending = true;
  if (!handle.held) showSubmittedMessage(handle, occurredAt);
  return handle;
};

/** Shows the submitted message and clears the composer (immediately, or on acceptance when held). */
const showSubmittedMessage = (handle: LocalUserSubmissionHandle, occurredAt: string): void => {
  const { context } = handle;
  const messages = context.state.conversation.messages;
  // The accepted echo of a held send may already be in the conversation (same identity).
  const echoed = handle.message.messageId
    ? messages.find((message) => message.type === 'user' && message.messageId === handle.message.messageId)
    : undefined;
  if (echoed && echoed.type === 'user') {
    if (handle.message.mentionNames) echoed.mentionNames = handle.message.mentionNames;
  } else {
    messages.push(handle.message);
  }
  commitRecentEventMonitorEffect(context, 'STRUCTURAL');
  context.state.conversation.updatedAt = occurredAt;
  context.requirement = '';
  context.contextFilePaths = [];
  context.requestedSkillNames = [];
  context.requestedMentions = [];
  applyLocalSubmissionNavigation(context, handle.navigationTarget, occurredAt);
};

/** The root accepted a held send: show it and clear the composer. No effect for an ordinary send. */
export const acceptLocalSubmission = (handle: LocalUserSubmissionHandle): void => {
  if (!handle.held) return;
  handle.held = false;
  showSubmittedMessage(handle, nowIso());
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
  if (handle.held) return true;
  commitRecentEventMonitorEffect(handle.context, 'PRESENTATION');
  handle.context.state.conversation.updatedAt = occurredAt;
  applyLocalSubmissionNavigation(handle.context, handle.navigationTarget, occurredAt);
  return true;
};

/**
 * A failed send. A held send rejected because a collaborator could not be added shows the
 * notice and keeps the draft as typed (nothing was posted); returns `'kept_draft'` then.
 * Any other failure shows the message with an error, as before.
 */
export const failLocalSubmission = (
  handle: LocalUserSubmissionHandle,
  error: unknown,
): 'kept_draft' | 'failed' => {
  if (handle.held && error instanceof CollaboratorAddRejection) {
    handle.context.submissionPending = false;
    handle.context.collaboratorAddFailure = error.failure;
    return 'kept_draft';
  }
  acceptLocalSubmission(handle);
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
      code: 'LOCAL_SUBMISSION_ERROR',
      message,
      details: error instanceof Error ? error.toString() : String(error),
    }],
  });
  commitRecentEventMonitorEffect(handle.context, 'STRUCTURAL');
  handle.context.state.conversation.updatedAt = occurredAt;
  applyLocalSubmissionNavigation(handle.context, handle.navigationTarget, occurredAt);
  return 'failed';
};
