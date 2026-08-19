import type {
  ApplicationAgentStreamEvent,
  ApplicationExecutionProducer,
} from "@autobyteus/application-sdk-contracts";
import { TeamRunEventSourceType } from "../../agent-team-execution/domain/team-run-event.js";
import type { ApplicationAgentStreamSourceEvent } from "../domain/application-agent-streaming-models.js";
import { ApplicationAgentStreamEventProjector } from "./application-agent-stream-event-projector.js";

export type MappedApplicationAgentStreamSourceEvent = {
  event: ApplicationAgentStreamEvent;
  producer: ApplicationExecutionProducer;
};

export class ApplicationAgentEventMapper {
  constructor(
    private readonly projector = new ApplicationAgentStreamEventProjector(),
  ) {}

  map(source: ApplicationAgentStreamSourceEvent): MappedApplicationAgentStreamSourceEvent | null {
    if (source.source === "AGENT") {
      const event = this.projector.project(source.event);
      return event ? { event, producer: source.producer } : null;
    }
    if (source.event.eventSourceType !== TeamRunEventSourceType.AGENT || !source.producer) return null;
    const event = this.projector.projectTeam(source.event.payload);
    return event ? { event, producer: source.producer } : null;
  }
}
