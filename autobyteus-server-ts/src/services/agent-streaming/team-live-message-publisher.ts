import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  TeamStreamBroadcaster,
  getTeamStreamBroadcaster,
} from "./team-stream-broadcaster.js";
import { createTeamExternalUserMessageServerMessage } from "./external-user-message-server-message.js";
import type { AgentTeamAddress } from "../../agent-collaboration/domain/agent-team-address.js";

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
    memberAddress: AgentTeamAddress;
    agentRunId: string;
    displayName?: string | null;
  }): number {
    return this.broadcaster.publishToTeamRun(
      input.teamRunId,
      createTeamExternalUserMessageServerMessage({
        envelope: input.envelope,
        memberAddress: input.memberAddress,
        agentRunId: input.agentRunId,
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
