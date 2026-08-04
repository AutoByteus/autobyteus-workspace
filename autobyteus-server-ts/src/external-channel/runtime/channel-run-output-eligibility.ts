import { AgentRunEventType } from "../../agent-execution/domain/agent-run-event.js";
import { serializeTeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";
import type { ChannelRunOutputTarget } from "../domain/models.js";
import type { ParsedChannelOutputEvent } from "./channel-output-event-parser.js";

const OBSERVABLE_OUTPUT_EVENT_TYPES = new Set<AgentRunEventType>([
  AgentRunEventType.TURN_STARTED,
  AgentRunEventType.SEGMENT_CONTENT,
  AgentRunEventType.SEGMENT_END,
  AgentRunEventType.TURN_COMPLETED,
  AgentRunEventType.ERROR,
]);

export type EligibleChannelOutputEvent = { event: ParsedChannelOutputEvent; target: ChannelRunOutputTarget };

export class ChannelRunOutputEligibilityPolicy {
  evaluate(input: { linkTarget: ChannelRunOutputTarget; event: ParsedChannelOutputEvent }): EligibleChannelOutputEvent | null {
    const { linkTarget: target, event } = input;
    if (!OBSERVABLE_OUTPUT_EVENT_TYPES.has(event.eventType) || !event.turnId) return null;
    if (target.targetType === "AGENT") {
      return !event.teamRunId && event.agentRunId === target.agentRunId ? { event, target } : null;
    }
    if (event.teamRunId !== target.teamRunId || !target.entryExecutionAddress || !event.executionAddress) return null;
    return serializeTeamExecutionAddress(event.executionAddress) === serializeTeamExecutionAddress(target.entryExecutionAddress)
      ? { event, target }
      : null;
  }
}
