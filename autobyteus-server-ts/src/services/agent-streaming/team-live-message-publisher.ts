import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  TeamStreamBroadcaster,
  getTeamStreamBroadcaster,
} from "./team-stream-broadcaster.js";
import { createExternalUserMessageServerMessage } from "./external-user-message-server-message.js";

export type TeamLiveMessagePublisherDependencies = {
  broadcaster?: TeamStreamBroadcaster;
};

export class TeamLiveMessagePublisher {
  private readonly broadcaster: TeamStreamBroadcaster;

  constructor(deps: TeamLiveMessagePublisherDependencies = {}) {
    this.broadcaster = deps.broadcaster ?? getTeamStreamBroadcaster();
  }

  publishExternalUserMessage(input: {
    teamRunId: string;
    envelope: ExternalMessageEnvelope;
    agentName?: string | null;
    agentId?: string | null;
    memberRouteKey?: string | null;
    memberPath?: readonly string[] | null;
    sourceRouteKey?: string | null;
    sourcePath?: readonly string[] | null;
  }): number {
    return this.broadcaster.publishToTeamRun(
      input.teamRunId,
      createExternalUserMessageServerMessage({
        envelope: input.envelope,
        agentName: input.agentName ?? null,
        agentId: input.agentId ?? null,
        memberRouteKey: input.memberRouteKey ?? null,
        memberPath: input.memberPath ?? null,
        sourceRouteKey: input.sourceRouteKey ?? null,
        sourcePath: input.sourcePath ?? null,
      }),
    );
  }
}

let cachedTeamLiveMessagePublisher: TeamLiveMessagePublisher | null = null;

export const getTeamLiveMessagePublisher = (): TeamLiveMessagePublisher => {
  if (!cachedTeamLiveMessagePublisher) {
    cachedTeamLiveMessagePublisher = new TeamLiveMessagePublisher();
  }
  return cachedTeamLiveMessagePublisher;
};
