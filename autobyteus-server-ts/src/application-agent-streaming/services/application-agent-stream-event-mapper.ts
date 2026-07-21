import type {
  ApplicationAgentRunPublicEvent,
  ApplicationAgentTeamPublicEvent,
  ApplicationExecutionProducer,
} from "@autobyteus/application-sdk-contracts";
import { TeamRunEventSourceType, type TeamRunAgentEventPayload } from "../../agent-team-execution/domain/team-run-event.js";
import type { ApplicationAgentStreamSourceEvent } from "../domain/application-agent-streaming-models.js";
import { ApplicationAgentStreamPublicEventProjector } from "./application-agent-stream-public-event-projector.js";

export type MappedApplicationAgentStreamSourceEvent = {
  event: ApplicationAgentRunPublicEvent | ApplicationAgentTeamPublicEvent;
  producer: ApplicationExecutionProducer | null;
};

export class ApplicationAgentEventMapper {
  constructor(
    private readonly projector = new ApplicationAgentStreamPublicEventProjector(),
  ) {}

  map(source: ApplicationAgentStreamSourceEvent): MappedApplicationAgentStreamSourceEvent | null {
    if (source.source === "AGENT") {
      const event = this.projector.projectAgent(source.event);
      return event ? { event, producer: source.producer } : null;
    }
    if (source.event.eventSourceType === TeamRunEventSourceType.AGENT) {
      const payload = source.event.data as TeamRunAgentEventPayload;
      const event = this.projector.projectAgent(payload.agentEvent);
      if (!source.producer) return null;
      return event ? { event, producer: source.producer } : null;
    }
    const event = this.projector.projectTeam(source.event);
    return event ? { event, producer: null } : null;
  }
}
