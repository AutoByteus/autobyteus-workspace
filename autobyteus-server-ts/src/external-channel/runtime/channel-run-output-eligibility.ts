import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import type { ChannelRunOutputTarget } from "../domain/models.js";
import type { ParsedChannelOutputEvent } from "./channel-output-event-parser.js";

const OBSERVABLE_OUTPUT_EVENT_TYPES = new Set<AgentRunEventType>([
  AgentRunEventType.TURN_STARTED,
  AgentRunEventType.SEGMENT_CONTENT,
  AgentRunEventType.SEGMENT_END,
  AgentRunEventType.TURN_COMPLETED,
  AgentRunEventType.ERROR,
]);

export type EligibleChannelOutputEvent = {
  event: ParsedChannelOutputEvent;
  target: ChannelRunOutputTarget;
};

export class ChannelRunOutputEligibilityPolicy {
  evaluate(input: {
    linkTarget: ChannelRunOutputTarget;
    event: ParsedChannelOutputEvent;
  }): EligibleChannelOutputEvent | null {
    if (!OBSERVABLE_OUTPUT_EVENT_TYPES.has(input.event.eventType)) {
      return null;
    }
    if (!input.event.turnId) {
      return null;
    }
    if (input.linkTarget.targetType === "AGENT") {
      return this.evaluateStandalone(input.linkTarget, input.event);
    }
    return this.evaluateTeam(input.linkTarget, input.event);
  }

  private evaluateStandalone(
    target: Extract<ChannelRunOutputTarget, { targetType: "AGENT" }>,
    event: ParsedChannelOutputEvent,
  ): EligibleChannelOutputEvent | null {
    if (event.teamRunId) {
      return null;
    }
    if (event.agentRunId !== target.agentRunId) {
      return null;
    }
    return { event, target };
  }

  private evaluateTeam(
    target: Extract<ChannelRunOutputTarget, { targetType: "TEAM" }>,
    event: ParsedChannelOutputEvent,
  ): EligibleChannelOutputEvent | null {
    if (event.teamRunId !== target.teamRunId) {
      return null;
    }

    const configuredMemberRunId = normalizeOptionalString(target.entryMemberRunId);
    const configuredMemberName = normalizeOptionalString(target.entryMemberName);
    const eventMemberRunId = normalizeOptionalString(event.memberRunId);
    const eventMemberName = normalizeOptionalString(event.memberName);

    if (configuredMemberRunId) {
      if (eventMemberRunId !== configuredMemberRunId) {
        return null;
      }
      return {
        event,
        target: {
          ...target,
          entryMemberRunId: configuredMemberRunId,
          entryMemberName: configuredMemberName ?? eventMemberName,
        },
      };
    }

    if (!configuredMemberName || eventMemberName !== configuredMemberName) {
      return null;
    }

    return {
      event,
      target: {
        ...target,
        entryMemberRunId: eventMemberRunId,
        entryMemberName: configuredMemberName,
      },
    };
  }
}

const normalizeOptionalString = (
  value: string | null | undefined,
): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
