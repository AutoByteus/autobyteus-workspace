import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  TeamStreamBroadcaster,
  getTeamStreamBroadcaster,
} from "./team-stream-broadcaster.js";
import { createTeamExternalUserMessageServerMessage } from "./external-user-message-server-message.js";
import type { TeamExecutionAddress } from "../../agent-team-execution/domain/team-execution-address.js";

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
    executionAddress: TeamExecutionAddress;
    displayName?: string | null;
    agentRunId?: string | null;
  }): number {
    return this.broadcaster.publishToTeamRun(
      input.teamRunId,
      createTeamExternalUserMessageServerMessage({
        envelope: input.envelope,
        executionAddress: input.executionAddress,
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
