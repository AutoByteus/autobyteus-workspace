import type { MemoryTraceEvent } from "../../agent-memory/domain/models.js";
import type { RuntimeTranslation } from "./runtimes/runtime-translation.js";
import { parseTeammateMessage } from "./teammate-message-envelope.js";

/**
 * Contract §8: the journal line of every record that is not a tool call or result. A record is
 * either shown (a message with a label, or one fixed line) or omitted with its documented reason.
 */
export type NonToolRecordLine =
  | Readonly<{ kind: "message"; label: string; text: string; extraLines: readonly string[] }>
  | Readonly<{ kind: "line"; text: string }>
  | Readonly<{ kind: "omitted"; reason: string }>;

const attachmentLine = (record: MemoryTraceEvent): string[] => {
  const locators = [
    ...(record.media?.images ?? []),
    ...(record.media?.audio ?? []),
    ...(record.media?.video ?? []),
    ...(record.scope === "turn" ? (record.fileAttachments ?? []).map((file) => file.uri) : []),
  ];
  return locators.length ? [`Attachments: ${locators.join(", ")}`] : [];
};

const userLine = (record: MemoryTraceEvent, translation: RuntimeTranslation): NonToolRecordLine => {
  const content = record.content ?? "";
  const teammate = parseTeammateMessage(content);
  if (teammate) {
    return {
      kind: "message",
      label: `Message from ${teammate.sender}`,
      text: teammate.text,
      extraLines: [...(teammate.files.length ? [`Files: ${teammate.files.join(", ")}`] : []), ...attachmentLine(record)],
    };
  }
  const text = translation.normalizeUserText ? translation.normalizeUserText(content) : content;
  return { kind: "message", label: "User", text, extraLines: attachmentLine(record) };
};

/** The system note to the agent ("Do not retry, resume …") is not reproduced. */
const interruptionLine = (record: MemoryTraceEvent): NonToolRecordLine => {
  const reason = /Reason: ([^\s.]+)/.exec(record.content ?? "")?.[1];
  if (reason === "user_interrupt") return { kind: "line", text: "Turn interrupted by the user." };
  return { kind: "line", text: reason ? `Turn interrupted (${reason}).` : "Turn interrupted." };
};

/** D5: runtime machinery, not the agent's work. A compaction shows as the boundary between journal files. */
const RUNTIME_MACHINERY = "runtime machinery (D5)";

export const nonToolRecordLine = (record: MemoryTraceEvent, translation: RuntimeTranslation): NonToolRecordLine => {
  switch (record.traceType) {
    case "user":
      return userLine(record, translation);
    case "assistant": {
      const raw = record.content ?? "";
      const text = translation.normalizeAgentText ? translation.normalizeAgentText(raw) : raw;
      return text.trim().length ? { kind: "message", label: "Agent", text, extraLines: [] }
        : { kind: "omitted", reason: "empty agent text" };
    }
    case "reasoning":
      return { kind: "omitted", reason: "model reasoning" };
    case "system_task_notification":
      return { kind: "message", label: "Notice", text: record.content ?? "", extraLines: [] };
    case "operation_boundary":
      return interruptionLine(record);
    case "system_instruction":
    case "provider_compaction_boundary":
    case "llm_request_recovery":
    case "output_limit_recovery":
      return { kind: "omitted", reason: RUNTIME_MACHINERY };
    case "tool_continuation":
      return { kind: "omitted", reason: "tool continuation bookkeeping" };
    default:
      // A record type the contract does not name is shown, never dropped silently (REQ-W2).
      return { kind: "message", label: `Record (${record.traceType || "type not recorded"})`, text: record.content ?? "", extraLines: [] };
  }
};
