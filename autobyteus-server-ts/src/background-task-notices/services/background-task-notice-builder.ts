import type { BackgroundTaskEnd, BackgroundTaskStart } from "autobyteus-ts";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { BACKGROUND_TASK_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";

export const BACKGROUND_TASK_NOTICE_HEADER = "[Platform notice — background tasks finished]";

const duration = (ms: number): string => {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const howItEnded = (end: BackgroundTaskEnd): string => {
  const { outcome } = end;
  if ("exitCode" in outcome) return `exit code ${outcome.exitCode} after ${duration(end.durationMs)}`;
  if ("signal" in outcome) return `killed by ${outcome.signal} after ${duration(end.durationMs)}`;
  return `ended after ${duration(end.durationMs)}; how is unknown (${outcome.error})`;
};

/**
 * The notice the agent and the web see: the header, one entry per ended task (pid, command, how and when it
 * ended, its output file and last lines), then the tasks still running, so a compacted conversation still knows
 * what runs (DEC-013).
 */
export const buildBackgroundTaskNoticeText = (
  ends: readonly BackgroundTaskEnd[],
  running: readonly BackgroundTaskStart[],
): string => {
  const files = [...ends.map((end) => end.outputFile), ...running.map((task) => task.outputFile)];
  const shared = (file: string) => files.filter((other) => other === file).length > 1;
  const lines = [BACKGROUND_TASK_NOTICE_HEADER, ""];
  for (const end of ends) {
    lines.push(`- pid ${end.pid} \`${end.command}\`: ${howItEnded(end)}. Output: ${end.outputFile}`
      + `${shared(end.outputFile) ? " (shared by tasks started in the same call)" : ""}.`
      + (end.lastLines ? " Last lines:" : " No output."));
    for (const line of end.lastLines ? end.lastLines.split("\n") : []) lines.push(`    ${line}`);
  }
  if (running.length > 0) {
    lines.push("", `Still running: ${running.map((task) =>
      `pid ${task.pid} \`${task.command}\` (started ${task.startedAt.slice(11, 19)} UTC)`).join("; ")}`);
  }
  return lines.join("\n");
};

/**
 * The SYSTEM input that delivers the notice (it starts a turn on an idle run). Tagged as a notice-only platform
 * message, so it never carries another notice and memory records it as one system notice; the service publishes
 * the run's system notice once it is forwarded.
 */
export const buildBackgroundTaskNoticeMessage = (text: string): AgentInputUserMessage =>
  new AgentInputUserMessage(text, SenderType.SYSTEM, null, {
    sender_id: BACKGROUND_TASK_NOTICE_SENDER_ID,
    [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    ...platformInputPrefaceMetadata({ content: text, senderId: BACKGROUND_TASK_NOTICE_SENDER_ID, originalContent: null }),
  });

/** The run's system notice event (web presentation and history). */
export const buildBackgroundTaskNoticeEvent = (runId: string, text: string, turnId: string | null): AgentRunEvent => ({
  eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
  runId,
  payload: {
    sender_id: BACKGROUND_TASK_NOTICE_SENDER_ID,
    content: text,
    ...(turnId ? { turn_id: turnId } : {}),
  },
  statusHint: null,
});
