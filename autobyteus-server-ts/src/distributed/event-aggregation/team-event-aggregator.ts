import type { RunVersion } from "../envelope/envelope-builder.js";

export type PublishTeamEventInput = {
  teamRunId: string;
  runVersion: RunVersion;
  sourceNodeId: string;
  memberName?: string | null;
  agentId?: string | null;
  eventType: string;
  payload: unknown;
};

export type AggregatedTeamEvent = {
  teamRunId: string;
  runVersion: RunVersion;
  sequence: number;
  sourceNodeId: string;
  memberName: string | null;
  agentId: string | null;
  origin: "local" | "remote";
  eventType: string;
  payload: unknown;
  receivedAtIso: string;
};

export class TeamEventAggregator {
  private readonly sequenceByRunId = new Map<string, number>();
  private readonly publishSink?: (event: AggregatedTeamEvent) => void;

  constructor(options: { publishSink?: (event: AggregatedTeamEvent) => void } = {}) {
    this.publishSink = options.publishSink;
  }

  publishLocalEvent(input: PublishTeamEventInput): AggregatedTeamEvent {
    return this.publish(input, "local");
  }

  publishRemoteEvent(input: PublishTeamEventInput): AggregatedTeamEvent {
    return this.publish(input, "remote");
  }

  finalizeRun(teamRunId: string): boolean {
    return this.sequenceByRunId.delete(teamRunId);
  }

  private publish(
    input: PublishTeamEventInput,
    origin: "local" | "remote"
  ): AggregatedTeamEvent {
    const nextSequence = (this.sequenceByRunId.get(input.teamRunId) ?? 0) + 1;
    this.sequenceByRunId.set(input.teamRunId, nextSequence);

    const normalizedEvent: AggregatedTeamEvent = {
      teamRunId: input.teamRunId,
      runVersion: input.runVersion,
      sequence: nextSequence,
      sourceNodeId: input.sourceNodeId,
      memberName: input.memberName ?? null,
      agentId: input.agentId ?? null,
      origin,
      eventType: input.eventType,
      payload: input.payload,
      receivedAtIso: new Date().toISOString(),
    };

    this.publishSink?.(normalizedEvent);
    return normalizedEvent;
  }
}
