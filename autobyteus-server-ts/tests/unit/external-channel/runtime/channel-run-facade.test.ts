import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { ChannelRunFacade } from "../../../../src/external-channel/runtime/channel-run-facade.js";

const createEnvelope = () => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: ExternalPeerType.USER,
  threadId: "thread-1",
  externalMessageId: "msg-1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-08T00:00:00.000Z",
  metadata: { source: "test" },
  routingKey: createChannelRoutingKey({
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
  }),
});

const createAgentBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  targetType: "AGENT",
  agentDefinitionId: "agent-definition-1",
  launchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS",
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  agentRunId: "agent-1",
  teamDefinitionId: null,
  teamLaunchPreset: null,
  teamRunId: null,
  targetNodeName: null,
  allowTransportFallback: false,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createTeamBinding = (): ChannelBinding => ({
  ...createAgentBinding(),
  targetType: "TEAM",
  agentDefinitionId: null,
  launchPreset: null,
  agentRunId: null,
  teamDefinitionId: "team-definition-1",
  teamLaunchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS",
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  teamRunId: "team-1",
  targetNodeName: "support-node",
});

describe("ChannelRunFacade", () => {
  it("delegates AGENT bindings to the agent run facade", async () => {
    const dispatchToAgentBinding = vi.fn().mockResolvedValue({
      agentRunId: "agent-1",
      teamRunId: null,
      turnId: "turn-1",
      dispatchedAt: new Date("2026-02-08T00:00:01.000Z"),
    });
    const dispatchToTeamBinding = vi.fn();
    const facade = new ChannelRunFacade({
      agentRunFacade: { dispatchToAgentBinding },
      teamRunFacade: { dispatchToTeamBinding },
    });

    const result = await facade.dispatchToBinding(createAgentBinding(), createEnvelope());

    expect(result.agentRunId).toBe("agent-1");
    expect(dispatchToAgentBinding).toHaveBeenCalledWith(
      createAgentBinding(),
      createEnvelope(),
    );
    expect(dispatchToTeamBinding).not.toHaveBeenCalled();
  });

  it("delegates TEAM bindings to the team run facade", async () => {
    const dispatchToAgentBinding = vi.fn();
    const dispatchToTeamBinding = vi.fn().mockResolvedValue({
      agentRunId: null,
      teamRunId: "team-1",
      turnId: "turn-1",
      dispatchedAt: new Date("2026-02-08T00:00:01.000Z"),
    });
    const facade = new ChannelRunFacade({
      agentRunFacade: { dispatchToAgentBinding },
      teamRunFacade: { dispatchToTeamBinding },
    });

    const result = await facade.dispatchToBinding(createTeamBinding(), createEnvelope());

    expect(result.teamRunId).toBe("team-1");
    expect(dispatchToTeamBinding).toHaveBeenCalledWith(
      createTeamBinding(),
      createEnvelope(),
    );
    expect(dispatchToAgentBinding).not.toHaveBeenCalled();
  });
});
