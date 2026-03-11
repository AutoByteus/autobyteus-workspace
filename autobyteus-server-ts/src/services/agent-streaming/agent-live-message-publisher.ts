import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import {
  AgentStreamBroadcaster,
  getAgentStreamBroadcaster,
} from "./agent-stream-broadcaster.js";
import { createExternalUserMessageServerMessage } from "./external-user-message-server-message.js";

export type AgentLiveMessagePublisherDependencies = {
  broadcaster?: AgentStreamBroadcaster;
};

export class AgentLiveMessagePublisher {
  private readonly broadcaster: AgentStreamBroadcaster;

  constructor(deps: AgentLiveMessagePublisherDependencies = {}) {
    this.broadcaster = deps.broadcaster ?? getAgentStreamBroadcaster();
  }

  publishExternalUserMessage(input: {
    runId: string;
    envelope: ExternalMessageEnvelope;
  }): number {
    return this.broadcaster.publishToRun(
      input.runId,
      createExternalUserMessageServerMessage({
        envelope: input.envelope,
      }),
    );
  }
}

let cachedAgentLiveMessagePublisher: AgentLiveMessagePublisher | null = null;

export const getAgentLiveMessagePublisher = (): AgentLiveMessagePublisher => {
  if (!cachedAgentLiveMessagePublisher) {
    cachedAgentLiveMessagePublisher = new AgentLiveMessagePublisher();
  }
  return cachedAgentLiveMessagePublisher;
};
