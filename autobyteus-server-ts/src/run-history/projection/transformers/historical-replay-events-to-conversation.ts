import type { EventMonitorReplayEvent } from "../historical-replay-event-types.js";
import type { RunProjectionConversationEntry } from "../run-projection-types.js";
import { turnIdOfReplayTurnGroup } from "../historical-replay-event-identity.js";

/**
 * The turn an agent's own output belongs to (autobyteus-461 SR-087): an agent stream snapshot keeps or leaves out an
 * entry by it. User and inter-agent messages and notices carry none: they are always kept, and the web matches them
 * by `messageId`.
 */
const turnOf = (event: EventMonitorReplayEvent): { turnId?: string } => {
  const turnId = turnIdOfReplayTurnGroup(event.turnGroupId);
  return turnId ? { turnId } : {};
};

export const buildRunProjectionConversation = (
  events: EventMonitorReplayEvent[],
): RunProjectionConversationEntry[] =>
  events.flatMap<RunProjectionConversationEntry>((event) => {
    if (event.kind === "message" && event.role === "user" && event.senderId) {
      // RD-004: an agent-to-agent delivery replays as "From <Sender>:", not as a user bubble.
      return [{
        kind: "inter_agent_message",
        role: "user",
        senderAgentRunId: event.senderId,
        senderAddress: null,
        ...(event.messageId ? { messageId: event.messageId } : {}),
        ...(event.dedupeKey ? { dedupeKey: event.dedupeKey } : {}),
        ...(event.fileAttachments?.length ? { fileAttachments: event.fileAttachments } : {}),
        content: event.content,
        media: event.media,
        ts: event.ts,
      }];
    }

    if (event.kind === "message") {
      return [{
        kind: "message",
        role: event.role,
        ...(event.role === "user" && event.messageId ? { messageId: event.messageId } : {}),
        ...(event.role === "user" && event.dedupeKey ? { dedupeKey: event.dedupeKey } : {}),
        ...(event.role === "user" && event.fileAttachments?.length ? { fileAttachments: event.fileAttachments } : {}),
        ...(event.role === "user" ? {} : turnOf(event)),
        content: event.content,
        media: event.media,
        ts: event.ts,
      }];
    }

    if (event.kind === "reasoning") {
      return [{
        kind: "reasoning",
        role: null,
        ...turnOf(event),
        content: event.content,
        media: event.media,
        ts: event.ts,
      }];
    }

    if (event.kind === "compaction") {
      return [];
    }

    if (event.kind === "system_task_notification") {
      return [{
        kind: "system_task_notification",
        role: null,
        senderId: event.senderId,
        content: event.content,
        ...(event.messageId ? { messageId: event.messageId } : {}),
        ts: event.ts,
      }];
    }

    return [{
      kind:
        event.status === "parsed" || event.status === "parsing"
          ? "tool_call_pending"
          : "tool_call",
      invocationId: event.invocationId,
      role: null,
      ...turnOf(event),
      content: event.content,
      toolName: event.toolName,
      toolArgs: event.toolArgs,
      toolResult: event.toolResult,
      toolError: event.toolError,
      toolStatus: event.status,
      media: event.media,
      ts: event.ts,
    }];
  });
