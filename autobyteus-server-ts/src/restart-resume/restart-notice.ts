import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../agent-execution/domain/system-task-notification-senders.js";
import type { BusyRunEntry } from "./busy-run-record.js";

export type RestartNoticeInput = Readonly<{
  entry: BusyRunEntry;
  /** The release this server runs (the update's target). */
  version: string;
  restartedAt: Date;
  /** Delegated runs of the same root accepted in the first wave; listed for its host or members. */
  resumedDelegated: readonly string[];
}>;

export const buildRestartNoticeText = (input: RestartNoticeInput): string => {
  const lines = [
    `The application restarted at ${input.restartedAt.toISOString()} after an update to ${input.version}.`,
    "Your previous turn was interrupted.",
    "Tool calls that were running have unknown results; check before repeating any of them.",
  ];
  if (input.entry.place !== "delegated" && input.resumedDelegated.length) {
    lines.push(`These runs you delegated were resumed too and are working: ${input.resumedDelegated.join(", ")}.`);
  }
  return lines.join("\n");
};

/**
 * The only producer of the restart notice (autobyteus-285 D4): a SYSTEM input from `system.restart_resume`, in the
 * shape of the platform's other notices. The native runtime emits no notification for it; the resumer (host) or the
 * member presentation shows it as a system notice. `message_id` / `dedupe_key` are display and projection keys only.
 */
export const buildRestartNotice = (input: RestartNoticeInput): AgentInputUserMessage => {
  const text = buildRestartNoticeText(input);
  const messageId = `restart-resume:${input.entry.recordedAt}:${input.entry.agentRunId}`;
  return new AgentInputUserMessage(text, SenderType.SYSTEM, null, {
    sender_id: RESTART_RESUME_NOTICE_SENDER_ID,
    message_id: messageId,
    dedupe_key: `agent_run_input:${input.entry.agentRunId}:${messageId}`,
    [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    ...platformInputPrefaceMetadata({ content: text, senderId: RESTART_RESUME_NOTICE_SENDER_ID, originalContent: null }),
  });
};
