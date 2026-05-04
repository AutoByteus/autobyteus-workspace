import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import type {
  AgentRunEventProcessor,
  AgentRunEventProcessorInput,
} from "../../agent-run-event-processor.js";
import {
  normalizeExplicitMessageFileReferencePaths,
} from "../../../../services/message-file-references/message-file-reference-explicit-paths.js";
import { buildMessageFileReferencePayload } from "./message-file-reference-payload-builder.js";

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
      const teamRunId = normalizeRequiredString(payload.team_run_id);
      const senderRunId = normalizeRequiredString(payload.sender_agent_id);
      const receiverRunId = normalizeRequiredString(payload.receiver_run_id) ?? event.runId;
      if (!teamRunId || !senderRunId || !receiverRunId) {
        const missingFields = [
          !teamRunId ? "team_run_id" : null,
          !senderRunId ? "sender_agent_id" : null,
          !receiverRunId ? "receiver_run_id" : null,
        ].filter(Boolean).join(",");
        logger.warn(
          `${LOG_PREFIX} skipped accepted INTER_AGENT_MESSAGE missing=${missingFields} teamRunId=${teamRunId ?? "missing"} senderRunId=${senderRunId ?? "missing"} receiverRunId=${receiverRunId ?? "missing"} contentLength=${rawContent.length}`,
        );
        continue;
      }

      const referenceFilesResult = normalizeExplicitMessageFileReferencePaths(
        payload.reference_files,
      );
      if (!referenceFilesResult.ok) {
        const location = referenceFilesResult.error.index === undefined
          ? ""
          : ` index=${referenceFilesResult.error.index}`;
        logger.warn(
          `${LOG_PREFIX} skipped accepted INTER_AGENT_MESSAGE invalid reference_files teamRunId=${teamRunId} senderRunId=${senderRunId} receiverRunId=${receiverRunId}${location} reason=${referenceFilesResult.error.reason}`,
        );
        continue;
      }

      const paths = referenceFilesResult.referenceFiles;
      const senderMemberName = normalizeRequiredString(payload.sender_agent_name);
      const receiverMemberName =
        normalizeRequiredString(payload.receiver_agent_name)
        ?? normalizeRequiredString(payload.recipient_role_name);
      logger.info(
        `${LOG_PREFIX} processed accepted INTER_AGENT_MESSAGE teamRunId=${teamRunId} senderRunId=${senderRunId} senderName=${senderMemberName ?? "unknown"} receiverRunId=${receiverRunId} receiverName=${receiverMemberName ?? "unknown"} contentLength=${rawContent.length} referenceCount=${paths.length}${paths.length > 0 ? ` paths=${JSON.stringify(paths)}` : ""}`,
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
