import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { ChannelTeamRunFacade } from "../../../../src/external-channel/runtime/channel-team-run-facade.js";

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

const createTeamBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
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
  allowTransportFallback: false,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createTeamRun = () => ({
  runId: "team-1",
  subscribeToEvents: vi.fn().mockReturnValue(vi.fn()),
  postMessage: vi.fn().mockResolvedValue({
    accepted: true,
    message: null,
    memberRunId: "member-1",
    memberName: "support-node",
    turnId: "turn-1",
  }),
});

describe("ChannelTeamRunFacade", () => {
  it("uses an active team run when already present", async () => {
    const binding = createTeamBinding();
    const envelope = createEnvelope();
    const resolveOrStartTeamRun = vi.fn().mockResolvedValue("team-1");
    const teamRun = createTeamRun();
    const getTeamRun = vi.fn().mockReturnValue(teamRun);
    const restoreTeamRun = vi.fn();
    const publishExternalUserMessage = vi.fn();
    const bindAcceptedExternalTeamTurn = vi.fn().mockResolvedValue(undefined);
    const facade = new ChannelTeamRunFacade({
      runLauncher: { resolveOrStartTeamRun },
      teamRunService: {
        getTeamRun,
        restoreTeamRun,
      } as any,
      externalTurnBridge: {
        bindAcceptedExternalTeamTurn,
      },
      teamLiveMessagePublisher: { publishExternalUserMessage },
    });

    const result = await facade.dispatchToTeamBinding(binding, envelope);

    expect(result.agentRunId).toBeNull();
    expect(result.teamRunId).toBe("team-1");
    expect(resolveOrStartTeamRun).toHaveBeenCalledWith(binding, {
      initialSummary: "hello",
    });
    expect(getTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoreTeamRun).not.toHaveBeenCalled();
    expect(teamRun.postMessage).toHaveBeenCalledOnce();
    expect(teamRun.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "hello",
        metadata: expect.objectContaining({
          source: "test",
          externalSource: expect.any(Object),
        }),
      }),
      "support-node",
    );
    expect(bindAcceptedExternalTeamTurn).toHaveBeenCalledWith({
      run: teamRun,
      teamRunId: "team-1",
      memberName: "support-node",
      memberRunId: "member-1",
      turnId: "turn-1",
      envelope,
    });
    expect(publishExternalUserMessage).toHaveBeenCalledWith({
      teamRunId: "team-1",
      envelope,
      agentName: "support-node",
      agentId: null,
    });
  });

  it("restores the team run when it is not active in memory", async () => {
    const binding = createTeamBinding();
    const envelope = createEnvelope();
    const resolveOrStartTeamRun = vi.fn().mockResolvedValue("team-1");
    const restoredRun = createTeamRun();
    const getTeamRun = vi.fn().mockReturnValue(null);
    const restoreTeamRun = vi.fn().mockResolvedValue(restoredRun);
    const bindAcceptedExternalTeamTurn = vi.fn().mockResolvedValue(undefined);
    const facade = new ChannelTeamRunFacade({
      runLauncher: { resolveOrStartTeamRun },
      teamRunService: {
        getTeamRun,
        restoreTeamRun,
      } as any,
      externalTurnBridge: {
        bindAcceptedExternalTeamTurn,
      },
      teamLiveMessagePublisher: {
        publishExternalUserMessage: vi.fn(),
      },
    });

    const result = await facade.dispatchToTeamBinding(binding, envelope);

    expect(result.teamRunId).toBe("team-1");
    expect(getTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoreTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoredRun.postMessage).toHaveBeenCalledOnce();
    expect(bindAcceptedExternalTeamTurn).toHaveBeenCalledOnce();
  });

  it("continues team dispatch when live team external-user publish fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const teamRun = createTeamRun();
    const publishExternalUserMessage = vi.fn(() => {
      throw new Error("team socket write failed");
    });
    const facade = new ChannelTeamRunFacade({
      runLauncher: {
        resolveOrStartTeamRun: vi.fn().mockResolvedValue("team-1"),
      },
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(teamRun),
        restoreTeamRun: vi.fn(),
      } as any,
      externalTurnBridge: {
        bindAcceptedExternalTeamTurn: vi.fn().mockResolvedValue(undefined),
      },
      teamLiveMessagePublisher: {
        publishExternalUserMessage,
      },
    });

    const result = await facade.dispatchToTeamBinding(createTeamBinding(), createEnvelope());

    expect(result.teamRunId).toBe("team-1");
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("continues team dispatch when accepted-turn binding fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const teamRun = createTeamRun();
    const facade = new ChannelTeamRunFacade({
      runLauncher: {
        resolveOrStartTeamRun: vi.fn().mockResolvedValue("team-1"),
      },
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(teamRun),
        restoreTeamRun: vi.fn(),
      } as any,
      externalTurnBridge: {
        bindAcceptedExternalTeamTurn: vi.fn(() => {
          throw new Error("bridge failed");
        }),
      },
      teamLiveMessagePublisher: {
        publishExternalUserMessage: vi.fn(),
      },
    });

    const result = await facade.dispatchToTeamBinding(createTeamBinding(), createEnvelope());

    expect(result.teamRunId).toBe("team-1");
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
