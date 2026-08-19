import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { TeamLiveMessagePublisher } from "../../../../src/services/agent-streaming/team-live-message-publisher.js";
import { assertAgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";

const createEnvelope = () => ({
  provider: ExternalChannelProvider.TELEGRAM,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: ExternalPeerType.USER,
  threadId: "thread-1",
  externalMessageId: "msg-1",
  content: "hello team",
  attachments: [],
  receivedAt: "2026-03-09T12:00:00.000Z",
  metadata: null,
  routingKey: createChannelRoutingKey({
    provider: ExternalChannelProvider.TELEGRAM,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
  }),
});

describe("TeamLiveMessagePublisher", () => {
  it("publishes external user messages with exact current address and AgentRun identity", () => {
    const publishToTeamRun = vi.fn().mockReturnValue(1);
    const publisher = new TeamLiveMessagePublisher({
      broadcaster: {
        publishToTeamRun,
      } as any,
    });

    const delivered = publisher.publishExternalUserMessage({
      teamRunId: "team-1",
      envelope: createEnvelope(),
      agentRunId: "review-run-1",
      memberAddress: assertAgentTeamAddress("/BuildSquad/review_lead"),
    });

    expect(delivered).toBe(1);
    expect(publishToTeamRun).toHaveBeenCalledWith(
      "team-1",
      expect.objectContaining({
        type: "EXTERNAL_USER_MESSAGE",
        payload: expect.objectContaining({
          content: "hello team",
          agent_run_id: "review-run-1",
          member_address: "/BuildSquad/review_lead",
        }),
      }),
    );
  });
});
