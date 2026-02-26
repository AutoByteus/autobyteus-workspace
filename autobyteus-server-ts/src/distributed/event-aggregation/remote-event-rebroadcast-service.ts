import type { TeamRunLocator } from "../ingress/team-run-locator.js";
import type { AggregatedTeamEvent } from "./team-event-aggregator.js";

export type RebroadcastRemoteEventInput = {
  aggregatedEvent: AggregatedTeamEvent;
};

export type RemoteEventProjection = {
  teamRunId: string;
  runVersion: string | number;
  sequence: number;
  sourceNodeId: string;
  memberName: string | null;
  agentId: string | null;
  origin: "local" | "remote";
  eventType: string;
  payload: unknown;
  receivedAtIso: string;
};

type TeamStreamProjector = {
  publishDistributedEnvelopeToTeamStream: (input: {
    teamId: string;
    projection: RemoteEventProjection;
  }) => number;
};

export type RemoteEventRebroadcastServiceDependencies = {
  teamRunLocator: Pick<TeamRunLocator, "resolveByTeamRunId">;
  teamStreamProjector: TeamStreamProjector;
};

export type RemoteEventRebroadcastResult = {
  published: boolean;
  publishedSessionCount: number;
  reason?: "RUN_NOT_ACTIVE";
};

export class RemoteEventRebroadcastService {
  private readonly teamRunLocator: Pick<TeamRunLocator, "resolveByTeamRunId">;
  private readonly teamStreamProjector: TeamStreamProjector;

  constructor(deps: RemoteEventRebroadcastServiceDependencies) {
    this.teamRunLocator = deps.teamRunLocator;
    this.teamStreamProjector = deps.teamStreamProjector;
  }

  async rebroadcastRemoteEvent(
    input: RebroadcastRemoteEventInput,
  ): Promise<RemoteEventRebroadcastResult> {
    const runRecord = this.teamRunLocator.resolveByTeamRunId(input.aggregatedEvent.teamRunId);
    if (!runRecord) {
      return {
        published: false,
        publishedSessionCount: 0,
        reason: "RUN_NOT_ACTIVE",
      };
    }

    const projection: RemoteEventProjection = {
      teamRunId: input.aggregatedEvent.teamRunId,
      runVersion: input.aggregatedEvent.runVersion,
      sequence: input.aggregatedEvent.sequence,
      sourceNodeId: input.aggregatedEvent.sourceNodeId,
      memberName: input.aggregatedEvent.memberName,
      agentId: input.aggregatedEvent.agentId,
      origin: input.aggregatedEvent.origin,
      eventType: input.aggregatedEvent.eventType,
      payload: input.aggregatedEvent.payload,
      receivedAtIso: input.aggregatedEvent.receivedAtIso,
    };

    const publishedSessionCount = this.teamStreamProjector.publishDistributedEnvelopeToTeamStream({
      teamId: runRecord.teamId,
      projection,
    });

    return {
      published: publishedSessionCount > 0,
      publishedSessionCount,
    };
  }
}
