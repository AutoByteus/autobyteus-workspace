import type { AcpSessionEffect } from "../acp/acp-agent-session-profile.js";
import { GROK_PROVIDER_TURN_NOTICE_SENDER_ID } from "../../domain/system-task-notification-senders.js";

/** Grok's prompt queue: `runningPromptId` names the prompt it runs now (the client's, or one it queued itself). */
export const GROK_QUEUE_CHANGED_METHOD = "_x.ai/queue/changed";

const SYSTEM_REMINDER = /^<system-reminder>([\s\S]*)<\/system-reminder>$/;

const nonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

/** Grok's text for the running prompt without its `<system-reminder>` wrapper; null when there is no text. */
const noticeText = (runningText: unknown): string | null => {
  const text = nonEmptyString(runningText)?.trim();
  if (!text) return null;
  const inner = SYSTEM_REMINDER.exec(text)?.[1]?.trim() ?? text;
  return inner.length > 0 ? inner : null;
};

/**
 * `_x.ai/queue/changed` with a running prompt (Grok Build 1.0.88, probes of autobyteus-517):
 * `{ runningPromptId: "task-completed-<task>", runningKind: "prompt", runningText: "<system-reminder>…</system-reminder>" }`
 * for a prompt Grok queued itself, or the client prompt's own id and text. A queue without a running prompt says nothing.
 */
export const interpretGrokQueueChanged = (params: Record<string, unknown>): AcpSessionEffect | null => {
  const promptId = nonEmptyString(params.runningPromptId);
  if (!promptId) return null;
  const content = noticeText(params.runningText);
  return {
    kind: "prompt_running",
    promptId,
    notice: content ? { content, senderId: GROK_PROVIDER_TURN_NOTICE_SENDER_ID } : null,
  };
};

/** `_x.ai/session_notification` `turn_completed`: `{ prompt_id, stop_reason }` of the prompt that ended. */
export const interpretGrokTurnCompleted = (update: Record<string, unknown>): AcpSessionEffect | null => {
  if (update.sessionUpdate !== "turn_completed") return null;
  const promptId = nonEmptyString(update.prompt_id);
  const stopReason = nonEmptyString(update.stop_reason);
  return promptId && stopReason ? { kind: "prompt_completed", promptId, stopReason } : null;
};
