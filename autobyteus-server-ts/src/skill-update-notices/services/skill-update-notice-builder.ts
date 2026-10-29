import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { SKILL_UPDATE_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { SkillChange } from "../domain/skill-update-notice-types.js";

export const SKILL_UPDATE_NOTICE_HEADER = "[Platform notice — skill updated]";
export const SKILL_UPDATE_NOTICE_METADATA_KEY = "skill_update_notice";
const MAX_FILES_PER_SKILL = 10;

/**
 * `text` as a Markdown inline code span, so a path shows literally (`__init__.py` is not bold, `*draft*` not
 * emphasis). CommonMark: the fence is one backtick longer than the longest backtick run inside, and a text that
 * starts or ends with a backtick or a space is padded with one space on each side (the renderer strips exactly those).
 */
export const inlineCode = (text: string): string => {
  const longestRun = Math.max(0, ...[...text.matchAll(/`+/g)].map((run) => run[0].length));
  const fence = "`".repeat(longestRun + 1);
  const pad = /^[` ]|[` ]$/.test(text) ? " " : "";
  return `${fence}${pad}${text}${pad}${fence}`;
};

/** One Markdown block per skill; each ends with a blank line, so blocks and lists render apart. */
const describeChange = (change: SkillChange): string[] => {
  if (change.kind === "removed") return [`Your skill package \`${change.skillName}\` is no longer available.`, ""];
  const shown = change.files.slice(0, MAX_FILES_PER_SKILL);
  const more = change.files.length - shown.length;
  return [
    `Your skill package \`${change.skillName}\` has been updated (${inlineCode(change.skillDir)}).`,
    "",
    "Changed files:",
    ...shown.map((file) => `- ${inlineCode(file.path)} (${file.status})`),
    ...(more > 0 ? [`- …and ${more} more files`] : []),
    "",
  ];
};

/**
 * The notice the agent and the web see: the header (the web labels the card by it), then one
 * block per skill naming its folder and listing exactly the files that differ, each with its
 * status, then what to do.
 */
export const buildSkillUpdateNoticeText = (changes: readonly SkillChange[]): string => {
  const updated = changes.filter((change) => change.kind === "updated");
  const lines = [SKILL_UPDATE_NOTICE_HEADER, "", ...changes.flatMap(describeChange)];
  if (updated.length > 0) {
    lines.push(`Re-read the updated files before continuing work that relies on ${updated.length > 1 ? "these skills" : "this skill"}.`);
  }
  if (updated.some((change) => change.files.some((file) => file.status === "removed"))) {
    lines.push("Removed files are no longer available.");
  }
  if (changes.some((change) => change.kind === "removed")) {
    lines.push("Do not rely on a skill that is no longer available.");
  }
  return lines.join("\n");
};

/**
 * The SYSTEM input for a busy run (delivered through the agent-message path). It is tagged as a
 * notice-only platform message, so it never carries another notice and memory records it as one
 * system notice. The native runtime does not emit its own notification for it; the service
 * publishes the run's system notice once it is forwarded.
 */
export const buildSkillUpdateNoticeMessage = (text: string): AgentInputUserMessage =>
  new AgentInputUserMessage(text, SenderType.SYSTEM, null, {
    [SKILL_UPDATE_NOTICE_METADATA_KEY]: true,
    sender_id: SKILL_UPDATE_NOTICE_SENDER_ID,
    [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    ...platformInputPrefaceMetadata({ content: text, senderId: SKILL_UPDATE_NOTICE_SENDER_ID, originalContent: null }),
  });

/** The run's system notice event (web presentation and external-runtime history). */
export const buildSkillUpdateNoticeEvent = (runId: string, text: string, turnId: string | null): AgentRunEvent => ({
  eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
  runId,
  payload: {
    sender_id: SKILL_UPDATE_NOTICE_SENDER_ID,
    content: text,
    ...(turnId ? { turn_id: turnId } : {}),
  },
  statusHint: null,
});
