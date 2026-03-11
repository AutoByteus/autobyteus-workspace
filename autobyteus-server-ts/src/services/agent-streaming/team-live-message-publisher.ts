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
  }): number {
    return this.broadcaster.publishToTeamRun(
      input.teamRunId,
      createExternalUserMessageServerMessage({
        envelope: input.envelope,
        agentName: input.agentName ?? null,
        agentId: input.agentId ?? null,
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
