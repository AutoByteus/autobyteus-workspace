import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import type {
  AgentRunEventProcessor,
  AgentRunEventProcessorInput,
} from "../../agent-run-event-processor.js";
import { buildMessageFileReferencePayload } from "./message-file-reference-payload-builder.js";
import { extractMessageFileReferencePathCandidates } from "./message-file-reference-paths.js";

const LOG_PREFIX = "[message-file-reference]";
const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeRequiredString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeMessageType = (value: unknown): string =>
  normalizeRequiredString(value) ?? "agent_message";

export class MessageFileReferenceProcessor implements AgentRunEventProcessor {
  process(input: AgentRunEventProcessorInput): AgentRunEvent[] {
    const derivedEvents: AgentRunEvent[] = [];

    for (const event of input.sourceEvents) {
      if (event.eventType !== AgentRunEventType.INTER_AGENT_MESSAGE) {
        continue;
      }

      const payload = event.payload;
      const rawContent = typeof payload.content === "string" ? payload.content : "";
      const content = normalizeRequiredString(payload.content);
      const teamRunId = normalizeRequiredString(payload.team_run_id);
      const senderRunId = normalizeRequiredString(payload.sender_agent_id);
      const receiverRunId = normalizeRequiredString(payload.receiver_run_id) ?? event.runId;
      if (!content || !teamRunId || !senderRunId || !receiverRunId) {
        const missingFields = [
          !content ? "content" : null,
          !teamRunId ? "team_run_id" : null,
          !senderRunId ? "sender_agent_id" : null,
          !receiverRunId ? "receiver_run_id" : null,
        ].filter(Boolean).join(",");
        logger.warn(
          `${LOG_PREFIX} skipped accepted INTER_AGENT_MESSAGE missing=${missingFields} teamRunId=${teamRunId ?? "missing"} senderRunId=${senderRunId ?? "missing"} receiverRunId=${receiverRunId ?? "missing"} contentLength=${rawContent.length}`,
        );
        continue;
      }

      const paths = extractMessageFileReferencePathCandidates(content);
      const senderMemberName = normalizeRequiredString(payload.sender_agent_name);
      const receiverMemberName =
        normalizeRequiredString(payload.receiver_agent_name)
        ?? normalizeRequiredString(payload.recipient_role_name);
      logger.info(
        `${LOG_PREFIX} scanned accepted INTER_AGENT_MESSAGE teamRunId=${teamRunId} senderRunId=${senderRunId} senderName=${senderMemberName ?? "unknown"} receiverRunId=${receiverRunId} receiverName=${receiverMemberName ?? "unknown"} contentLength=${rawContent.length} referenceCount=${paths.length}${paths.length > 0 ? ` paths=${JSON.stringify(paths)}` : ""}`,
      );
      if (paths.length === 0) {
        continue;
      }

      const messageType = normalizeMessageType(payload.message_type);
      const timestamp = new Date().toISOString();

      for (const path of paths) {
        derivedEvents.push({
          eventType: AgentRunEventType.MESSAGE_FILE_REFERENCE_DECLARED,
          runId: receiverRunId,
          payload: {
            ...buildMessageFileReferencePayload({
              teamRunId,
              senderRunId,
              senderMemberName,
              receiverRunId,
              receiverMemberName,
              messageType,
              path,
              timestamp,
            }),
          },
          statusHint: null,
        });
      }
    }

    return derivedEvents;
  }
}
