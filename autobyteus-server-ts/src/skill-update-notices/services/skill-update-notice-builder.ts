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

const describeChange = (change: SkillChange): string => {
  if (change.kind === "removed") return `- ${change.skillName}: no longer available`;
  const shown = change.changedFiles.slice(0, MAX_FILES_PER_SKILL);
  const more = change.changedFiles.length - shown.length;
  const files = more > 0 ? `${shown.join(", ")} and ${more} more` : shown.join(", ");
  return `- ${change.skillName} (${change.skillMdPath}): ${files}`;
};

/** The notice the agent and the web see (REQ-008). */
export const buildSkillUpdateNoticeText = (changes: readonly SkillChange[]): string => {
  const lines = [
    SKILL_UPDATE_NOTICE_HEADER,
    "The following skills you use changed on disk since you last read them:",
    ...changes.map(describeChange),
    // A blank line ends the list, so the instructions are not read (or rendered) as part of its last item.
    "",
  ];
  const updated = changes.some((change) => change.kind === "updated");
  if (updated) {
    lines.push("Re-read the updated SKILL.md (and any files it points to) before continuing work that relies on these skills.");
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
