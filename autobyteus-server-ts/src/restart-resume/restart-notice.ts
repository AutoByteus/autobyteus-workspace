import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata, readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { RESTART_RESUME_NOTICE_SENDER_ID } from "../agent-execution/domain/system-task-notification-senders.js";
import { AgentRunEventType } from "../agent-execution/domain/agent-run-event.js";
import type { AgentRun } from "../agent-execution/domain/agent-run.js";
import type { AgentRunInputLifecycleObserver } from "../agent-execution/input/agent-run-input-contract.js";
import type { RestartCause } from "./restart-cause.js";

const RESTART_REMINDER_HEADER = "[Platform notice — application restarted]";

/** The facts a restart reminder is built from (stored with a pending reminder; the text is built at delivery). */
export type RestartReminderFacts = Readonly<{
  cause: RestartCause;
  /** The release this server runs (the update's target); `null` without a release stamp. */
  version: string | null;
  /** ISO time the server took the previous session's record. */
  restartedAt: string;
  /** The run was mid-turn when recorded. */
  interruptedTurn: boolean;
}>;

/** After an update or a restart the graceful shutdown stopped every command the run started (DEC-003). */
const STOPPED_BACKGROUND_LINE = "If you started any background tasks, the restart stopped them. Check what you still need: restart it, or continue your work.";
/** A crash runs no cleanup: the run's commands may outlive the server, untracked (DEC-008). */
const UNEXPECTED_STOP_BACKGROUND_LINE = "If you started any background tasks, some may still be running: the application stopped unexpectedly and could not stop "
  + "them, and any that are still running are no longer tracked, so you will not be told when they finish. Check them (for example "
  + "with `ps` and the pids you were given); stop any you still need and start them again so they are tracked, or continue your work.";

const reasonOf = (facts: RestartReminderFacts): string => {
  if (facts.cause === "update") return `an update to ${facts.version && !facts.version.startsWith("v") ? `v${facts.version}` : facts.version ?? "a new version"}`;
  return facts.cause === "restart" ? "a restart" : "an unexpected stop (a crash, a forced quit or a power loss)";
};

/** `2026-11-17 22:20 UTC`: the agent knows no time zone of the node. */
const timeOf = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

/**
 * The restart reminder (autobyteus-448 DEC-003, DEC-008): the cause, the interrupted turn when the run was mid-turn,
 * and the background-task line by cause: stopped by an update or restart; possibly still running and untracked after
 * an unexpected stop. One text for the wake after an update and for
 * the preface of the run's next input; the wake adds the delegated runs that were resumed too.
 */
export const buildRestartNoticeText = (input: RestartReminderFacts & Readonly<{ resumedDelegated: readonly string[] }>): string => {
  const lines = [
    RESTART_REMINDER_HEADER,
    "",
    `The application restarted at ${timeOf(input.restartedAt)} (reason: ${reasonOf(input)}).`,
  ];
  if (input.interruptedTurn) {
    lines.push("Your previous turn was interrupted; check the results of any tool calls that were running before you repeat them.");
  }
  lines.push(input.cause === "unexpected_stop" ? UNEXPECTED_STOP_BACKGROUND_LINE : STOPPED_BACKGROUND_LINE);
  if (input.resumedDelegated.length) {
    lines.push(`These runs you delegated were resumed too and are working: ${input.resumedDelegated.join(", ")}.`);
  }
  return lines.join("\n");
};

/**
 * The wake after an update (autobyteus-285 D4): a SYSTEM input from `system.restart_resume`, in the shape of the
 * platform's other notices. The native runtime emits no notification for it; the resumer (host) or the member
 * presentation shows it as a system notice. `message_id` / `dedupe_key` are display and projection keys only.
 */
export const buildRestartNotice = (input: Readonly<{
  agentRunId: string;
  facts: RestartReminderFacts;
  resumedDelegated: readonly string[];
}>): AgentInputUserMessage => {
  const text = buildRestartNoticeText({ ...input.facts, resumedDelegated: input.resumedDelegated });
  const messageId = `restart-resume:${input.facts.restartedAt}:${input.agentRunId}`;
  return new AgentInputUserMessage(text, SenderType.SYSTEM, null, {
    sender_id: RESTART_RESUME_NOTICE_SENDER_ID,
    message_id: messageId,
    dedupe_key: `agent_run_input:${input.agentRunId}:${messageId}`,
    [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    // The wake's message id is the notice's one id too (autobyteus-526): the message, its trace and its notice.
    ...platformInputPrefaceMetadata({ content: text, senderId: RESTART_RESUME_NOTICE_SENDER_ID, originalContent: null, noticeId: messageId }),
  });
};

/**
 * Shows the notice for every place (SR-005): once the input is forwarded, the run publishes its own
 * `SYSTEM_TASK_NOTIFICATION`, so the window shows a system notice and the run's memory records it (the sender is in
 * the recorded set), live and after a reload. `runOf` gives the run at that moment (a member's run starts on the input).
 */
export const restartNoticeLifecycleObserver = (
  runOf: () => Pick<AgentRun, "runId" | "publishEvent"> | null,
  message: Pick<AgentInputUserMessage, "content" | "metadata">,
): AgentRunInputLifecycleObserver => (fact) => {
  if (fact.kind !== "forwarded") return;
  const run = runOf();
  if (!run) return;
  void run.publishEvent({
    eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION, runId: run.runId, statusHint: null,
    payload: { sender_id: RESTART_RESUME_NOTICE_SENDER_ID, content: message.content,
      message_id: readPlatformInputPreface(message.metadata)?.noticeId ?? null, ...(fact.turnId ? { turn_id: fact.turnId } : {}) },
  }).catch(() => undefined);
};
