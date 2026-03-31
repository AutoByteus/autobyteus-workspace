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
    const facade = new ChannelTeamRunFacade({
      runLauncher: { resolveOrStartTeamRun },
      teamRunService: {
        getTeamRun,
        restoreTeamRun,
      } as any,
      teamLiveMessagePublisher: { publishExternalUserMessage },
    });

    const result = await facade.dispatchToTeamBinding(binding, envelope);

    expect(result.dispatchTargetType).toBe("TEAM");
    expect(result.memberRunId).toBe("member-1");
    expect(result.teamRunId).toBe("team-1");
    expect(result.turnId).toBe("turn-1");
    expect(result.memberName).toBe("support-node");
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
    const facade = new ChannelTeamRunFacade({
      runLauncher: { resolveOrStartTeamRun },
      teamRunService: {
        getTeamRun,
        restoreTeamRun,
      } as any,
      teamLiveMessagePublisher: {
        publishExternalUserMessage: vi.fn(),
      },
    });

    const result = await facade.dispatchToTeamBinding(binding, envelope);

    expect(result.teamRunId).toBe("team-1");
    expect(result.memberRunId).toBe("member-1");
    expect(getTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoreTeamRun).toHaveBeenCalledWith("team-1");
    expect(restoredRun.postMessage).toHaveBeenCalledOnce();
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
      teamLiveMessagePublisher: {
        publishExternalUserMessage,
      },
    });

    const result = await facade.dispatchToTeamBinding(createTeamBinding(), createEnvelope());

    expect(result.dispatchTargetType).toBe("TEAM");
    expect(result.teamRunId).toBe("team-1");
    expect(publishExternalUserMessage).toHaveBeenCalledOnce();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("falls back to the binding target when runtime member metadata is absent", async () => {
    const teamRun = {
      ...createTeamRun(),
      postMessage: vi.fn().mockResolvedValue({
        accepted: true,
        message: null,
        memberRunId: null,
        memberName: null,
        turnId: "turn-1",
      }),
    };
    const facade = new ChannelTeamRunFacade({
      runLauncher: {
        resolveOrStartTeamRun: vi.fn().mockResolvedValue("team-1"),
      },
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(teamRun),
        restoreTeamRun: vi.fn(),
      } as any,
      teamLiveMessagePublisher: {
        publishExternalUserMessage: vi.fn(),
      },
    });

    const result = await facade.dispatchToTeamBinding(createTeamBinding(), createEnvelope());

    expect(result.dispatchTargetType).toBe("TEAM");
    expect(result.memberRunId).toBeNull();
    expect(result.teamRunId).toBe("team-1");
    expect(result.turnId).toBe("turn-1");
    expect(result.memberName).toBe("support-node");
  });
});
