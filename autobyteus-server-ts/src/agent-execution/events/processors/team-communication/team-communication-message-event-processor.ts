import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import type {
  AgentRunEventProcessor,
  AgentRunEventProcessorInput,
} from "../../agent-run-event-processor.js";
import { normalizeTeamCommunicationMessage } from "../../../../services/team-communication/team-communication-normalizer.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const LOG_PREFIX = "[team-communication]";

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class TeamCommunicationMessageProcessor implements AgentRunEventProcessor {
  process(input: AgentRunEventProcessorInput): AgentRunEvent[] {
    const derivedEvents: AgentRunEvent[] = [];

    for (const event of input.sourceEvents) {
      if (event.eventType !== AgentRunEventType.INTER_AGENT_MESSAGE) {
        continue;
      }

      const teamRunId = readString(event.payload.team_run_id) ?? readString(event.payload.teamRunId);
      if (!teamRunId) {
        continue;
      }
      const message = normalizeTeamCommunicationMessage(event.payload, {
        teamRunId,
      });
      if (!message) {
        logger.warn(
          `${LOG_PREFIX} skipped TEAM_COMMUNICATION_MESSAGE derivation runId=${event.runId} reason=missing_required_metadata`,
        );
        continue;
      }

      derivedEvents.push({
        eventType: AgentRunEventType.TEAM_COMMUNICATION_MESSAGE,
        runId: event.runId,
        payload: {
          teamRunId,
          ...message,
          referenceFiles: message.referenceFiles.map((reference) => ({ ...reference })),
        },
        statusHint: null,
      });
    }

    return derivedEvents;
  }
}
