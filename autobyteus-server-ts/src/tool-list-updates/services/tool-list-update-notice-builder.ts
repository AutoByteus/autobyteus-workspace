import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { platformInputPrefaceMetadata } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from "autobyteus-ts/agent/message/system-task-notification-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentRunEventType, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { TOOL_LIST_UPDATE_NOTICE_SENDER_ID } from "../../agent-execution/domain/system-task-notification-senders.js";
import type { ToolListDiff } from "./tool-list-diff.js";

export const TOOL_LIST_UPDATE_NOTICE_HEADER = "[Platform notice — tools updated]";
export const TOOL_LIST_UPDATE_NOTICE_METADATA_KEY = "tool_list_update_notice";

/**
 * The short notice the agent and the web see: the header (the web labels the card by its sender),
 * then one sentence per side of the change, naming exactly the tools added and removed.
 */
export const buildToolListUpdateNoticeText = (diff: ToolListDiff): string => {
  const parts: string[] = [];
  if (diff.added.length > 0) parts.push(`Now available: ${diff.added.join(", ")}.`);
  if (diff.removed.length > 0) parts.push(`No longer available: ${diff.removed.join(", ")}.`);
  return [TOOL_LIST_UPDATE_NOTICE_HEADER, "", `Your tools changed. ${parts.join(" ")}`].join("\n");
};

/**
 * The SYSTEM input for a busy run whose runtime takes the change at once (delivered through the
 * agent-message path). Tagged as a notice-only platform message, so it never carries another
 * notice and memory records it as one system notice. The service publishes the run's system
 * notice once it is forwarded.
 */
export const buildToolListUpdateNoticeMessage = (text: string): AgentInputUserMessage =>
  new AgentInputUserMessage(text, SenderType.SYSTEM, null, {
    [TOOL_LIST_UPDATE_NOTICE_METADATA_KEY]: true,
    sender_id: TOOL_LIST_UPDATE_NOTICE_SENDER_ID,
    [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true,
    ...platformInputPrefaceMetadata({ content: text, senderId: TOOL_LIST_UPDATE_NOTICE_SENDER_ID, originalContent: null }),
  });

/** The run's system notice event (web presentation and external-runtime history). */
export const buildToolListUpdateNoticeEvent = (runId: string, text: string, turnId: string | null): AgentRunEvent => ({
  eventType: AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
  runId,
  payload: {
    sender_id: TOOL_LIST_UPDATE_NOTICE_SENDER_ID,
    content: text,
    ...(turnId ? { turn_id: turnId } : {}),
  },
  statusHint: null,
});
