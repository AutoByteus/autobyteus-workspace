import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../agent-execution/domain/system-task-notification-senders.js";
import { AgentRunEventType } from "../agent-execution/domain/agent-run-event.js";
import type { AgentRun } from "../agent-execution/domain/agent-run.js";
import type { AgentRunInputLifecycleObserver } from "../agent-execution/input/agent-run-input-contract.js";
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

/**
 * Shows the notice for every place (SR-005): once the input is forwarded, the run publishes its own
 * `SYSTEM_TASK_NOTIFICATION`, so the window shows a system notice and the run's memory records it (the sender is in
 * the recorded set), live and after a reload. `runOf` gives the run at that moment (a member's run starts on the input).
 */
export const restartNoticeLifecycleObserver = (
  runOf: () => Pick<AgentRun, "runId" | "publishEvent"> | null,
  text: string,
): AgentRunInputLifecycleObserver => (fact) => {
  if (fact.kind !== "forwarded") return;
  const run = runOf();
  if (!run) return;
  void run.publishEvent({
    eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: run.runId, statusHint: null,
    payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: text, ...(fact.turnId ? { turn_id: fact.turnId } : {}) },
  }).catch(() => undefined);
};
