import { reactive } from 'vue';
import { refreshConversationUpdatedAt } from '~/utils/conversation/conversationRowTimes';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { ContextAttachment, UserMessage } from '~/types/conversation';
import type { RequestedCollaboratorMention } from '~/utils/collaborators/collaboratorMentionText';
import {
  commitRecentEventMonitorEffect,
} from '~/services/eventMonitor/recentEventMonitorMutationCoordinator';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { resolveFirstUserMessageSummary } from '~/utils/runTreeSummary';
import { CollaboratorAddRejection } from '~/services/collaborators/collaboratorAddFailures';
import { MessageNotDeliveredError, type MessageNotDeliveredCertainty } from './messageNotDelivered';
import { applyOfflineOrTerminalCleanup } from '~/services/runStatus/agentRuntimeStatusState';
import type { AgentStatus } from '~/types/agent/AgentStatus';

export interface BeginLocalUserSubmissionOptions {
  text: string;
  identity?: { messageId: string; dedupeKey: string };
  attachments: ContextAttachment[];
  // Null keeps local composer/conversation effects without optimistic history navigation.
  navigationTarget: LocalUserSubmissionNavigationTarget | null;
  /** `@` mentions sent with this message; their names render as inline chips. */
  mentions?: readonly RequestedCollaboratorMention[];
  /**
   * The draft as the user typed it, when `text` is composed from it (a skill tag's instruction): what comes back to the
   * message box if the message is not delivered. Defaults to `text` with no skill tags.
   */
  draft?: Readonly<{ requirement: string; requestedSkillNames: readonly string[] }>;
}

/** What a not-delivered send puts back in the message box (autobyteus-540 D-4); attachments are the message's own. */
export type ReturnableDraft = Readonly<{
  requirement: string;
  requestedSkillNames: readonly string[];
  requestedMentions: readonly RequestedCollaboratorMention[];
}>;

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
  /** The draft to put back if the message is not delivered. */
  readonly draft: ReturnableDraft;
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
    ...options.identity,
    text: options.text,
    // No time until the node confirms the send (its `received_at` or `accepted_at`): the app never stamps one itself.
    timestamp: null,
    contextFilePaths: [...options.attachments],
    ...(options.mentions?.length ? { mentionNames: options.mentions.map((mention) => mention.name) } : {}),
  });
  const handle: LocalUserSubmissionHandle = {
    context,
    message: submittedMessage,
    navigationTarget: options.navigationTarget,
    held: Boolean(options.mentions?.length),
    draft: Object.freeze({
      requirement: options.draft?.requirement ?? options.text,
      requestedSkillNames: [...(options.draft?.requestedSkillNames ?? [])],
      requestedMentions: [...(options.mentions ?? [])],
    }),
  };
  // A new send replaces the notice of the previous one.
  context.collaboratorAddFailure = null;
  context.messageNotDelivered = null;
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
  refreshConversationUpdatedAt(context.state.conversation);
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
  applyLocalSubmissionNavigation(handle.context, handle.navigationTarget, occurredAt);
  return true;
};

/** Shows the not-delivered notice above the message box (autobyteus-540 D-6); a new send or its dismiss clears it. */
export const showMessageNotDelivered = (context: AgentContext, certainty: MessageNotDeliveredCertainty): void => {
  context.messageNotDelivered = certainty;
};

/**
 * A message that did not reach the node, or may not have: the shown message is removed when the node does not have it
 * (`not_sent`; for `unknown` the next snapshot shows the truth), the draft comes back when the message box is empty
 * (a draft typed meanwhile is kept), the notice shows, and the run's status is left alone.
 */
const returnDraft = (handle: LocalUserSubmissionHandle, error: MessageNotDeliveredError): void => {
  const { context, message, draft } = handle;
  console.warn(`Message not delivered (${error.certainty}): ${error.message}`);
  context.submissionPending = false;
  if (!handle.held && error.certainty === 'not_sent') {
    const at = context.state.conversation.messages.indexOf(message);
    if (at >= 0) {
      context.state.conversation.messages.splice(at, 1);
      commitRecentEventMonitorEffect(context, 'STRUCTURAL');
      refreshConversationUpdatedAt(context.state.conversation);
    }
  }
  // A held send never cleared the box; any other: only an empty box takes the draft back.
  if (!handle.held && !context.requirement.trim() && !context.contextFilePaths.length && !context.requestedSkillNames.length) {
    context.requirement = draft.requirement;
    context.contextFilePaths = (message.contextFilePaths ?? []).map((attachment) => ({ ...attachment }));
    context.requestedSkillNames = [...draft.requestedSkillNames];
    context.requestedMentions = [...draft.requestedMentions];
  }
  showMessageNotDelivered(context, error.certainty);
};

/**
 * A failed send. A held send rejected because a mentioned unit could not be involved shows the
 * notice and keeps the draft as typed (nothing was posted); returns `'kept_draft'` then.
 * A message that did not reach the node returns its draft with the not-delivered notice; returns `'returned_draft'`.
 * Neither changes the run's status. Any other failure shows the message with an error, as before, after setting the
 * run's status to `failedStatus` when given (so the navigation effect carries it).
 */
export const failLocalSubmission = (
  handle: LocalUserSubmissionHandle,
  error: unknown,
  options: Readonly<{ failedStatus?: AgentStatus }> = {},
): 'kept_draft' | 'returned_draft' | 'failed' => {
  if (handle.held && error instanceof CollaboratorAddRejection) {
    handle.context.submissionPending = false;
    handle.context.collaboratorAddFailure = error.failure;
    return 'kept_draft';
  }
  if (error instanceof MessageNotDeliveredError) {
    returnDraft(handle, error);
    return 'returned_draft';
  }
  if (options.failedStatus) applyOfflineOrTerminalCleanup(handle.context, options.failedStatus);
  acceptLocalSubmission(handle);
  const occurredAt = nowIso();
  const message = toErrorMessage(error);
  handle.context.submissionPending = false;
  handle.context.state.conversation.messages.push({
    type: 'ai',
    text: 'Error Occurred',
    // A failure the node never saw: it has no recorded time (autobyteus-628 D-3).
    timestamp: null,
    isComplete: true,
    segments: [{
      type: 'error',
      code: 'LOCAL_SUBMISSION_ERROR',
      message,
      details: error instanceof Error ? error.toString() : String(error),
    }],
  });
  commitRecentEventMonitorEffect(handle.context, 'STRUCTURAL');
  applyLocalSubmissionNavigation(handle.context, handle.navigationTarget, occurredAt);
  return 'failed';
};
