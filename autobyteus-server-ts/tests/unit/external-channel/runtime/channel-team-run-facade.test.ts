import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { ChannelTeamRunFacade } from "../../../../src/external-channel/runtime/channel-team-run-facade.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";

const envelope = () => ({
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

const binding = (targetMemberAddress: string | null = null): ChannelBinding => ({
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
    runtimeKind: "autobyteus" as never,
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY" as never,
    llmConfig: null,
  },
  teamRunId: "team-1",
  targetMemberAddress,
  allowTransportFallback: false,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createTeamRun = (postResult: Record<string, unknown> = {
  accepted: true,
  message: null,
  turnId: "turn-1",
  agentRunId: "member-1",
}) => {
  const executions = new Map([
    ["member-1", { identity: { rootTeamRunId: "team-1", memberAddress: "/support", agentRunId: "member-1" } }],
    ["member-2", { identity: { rootTeamRunId: "team-1", memberAddress: "/reviewer", agentRunId: "member-2" } }],
  ]);
  return {
    teamRunId: "team-1",
    getCoordinatorAgentRunId: vi.fn(() => "member-1"),
    getAgentExecution: vi.fn((agentRunId: string) => executions.get(agentRunId) ?? null),
    resolveRecipient: vi.fn((address: string) => ({ kind: "agent", address })),
    getExecutionTreeSnapshot: vi.fn(() => ({
      rootTeam: {
        members: [
          { address: "/support", agentRunId: "member-1" },
          { address: "/reviewer", agentRunId: "member-2" },
        ],
      },
    })),
    subscribeToEvents: vi.fn().mockReturnValue(vi.fn()),
    postMessage: vi.fn().mockResolvedValue(postResult),
  };
};

const facadeFor = (teamRun: ReturnType<typeof createTeamRun>, publish = vi.fn()) => {
  const resolveOrStartTeamRun = vi.fn().mockResolvedValue("team-1");
  const resolveActiveTeamRun = vi.fn().mockResolvedValue(teamRun);
  const recordRunActivity = vi.fn().mockResolvedValue(undefined);
  return {
    facade: new ChannelTeamRunFacade({
      runLauncher: { resolveOrStartTeamRun } as never,
      teamRunService: { resolveActiveTeamRun, recordRunActivity } as never,
      teamLiveMessagePublisher: { publishExternalUserMessage: publish } as never,
    }),
    resolveOrStartTeamRun,
    resolveActiveTeamRun,
    recordRunActivity,
    publish,
  };
};

describe("ChannelTeamRunFacade", () => {
  it("dispatches to the current coordinator AgentRun and publishes exact execution identity", async () => {
    const teamRun = createTeamRun();
    const subject = facadeFor(teamRun);

    const result = await subject.facade.dispatchToTeamBinding(binding(), envelope());

    expect(result).toMatchObject({
      dispatchTargetType: "TEAM",
      teamRunId: "team-1",
      agentRunId: "member-1",
      turnId: "turn-1",
    });
    expect(teamRun.postMessage).toHaveBeenCalledWith(expect.any(Object), "member-1");
    expect(subject.recordRunActivity).toHaveBeenCalledWith(teamRun, { summary: "hello" });
    expect(subject.publish).toHaveBeenCalledWith(expect.objectContaining({
      teamRunId: "team-1",
      agentRunId: "member-1",
      memberAddress: "/support",
      displayName: "support",
    }));
  });

  it("resolves an exact configured target address to its AgentRun before dispatch", async () => {
    const teamRun = createTeamRun({
      accepted: true,
      message: null,
      turnId: "turn-2",
      agentRunId: "member-2",
    });
    const subject = facadeFor(teamRun);

    const result = await subject.facade.dispatchToTeamBinding(binding("/reviewer"), envelope());

    expect(result).toMatchObject({ agentRunId: "member-2", turnId: "turn-2" });
    expect(teamRun.resolveRecipient).toHaveBeenCalledWith("/reviewer");
    expect(teamRun.postMessage).toHaveBeenCalledWith(expect.any(Object), "member-2");
  });

  it("subscribes before posting and captures correlation when the direct result omits it", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const teamRun = createTeamRun({ accepted: true, message: null, turnId: null, agentRunId: null });
    teamRun.subscribeToEvents.mockImplementation((value) => {
      listener = value;
      return () => { listener = null; };
    });
    teamRun.postMessage.mockImplementation(async () => {
      queueMicrotask(() => listener?.({
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution: { rootTeamRunId: "team-1", memberAddress: "/support", agentRunId: "member-1" },
        payload: {
          eventType: AgentRunEventType.TURN_STARTED,
          details: { turnId: "turn-captured" },
          statusHint: "ACTIVE",
        },
      }));
      return { accepted: true, message: null, turnId: null, agentRunId: null };
    });
    const subject = facadeFor(teamRun);

    const result = await subject.facade.dispatchToTeamBinding(binding(), envelope());

    expect(result).toMatchObject({ agentRunId: "member-1", turnId: "turn-captured" });
    expect(teamRun.subscribeToEvents.mock.invocationCallOrder[0]).toBeLessThan(
      teamRun.postMessage.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("keeps an accepted dispatch successful when live publication fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const publish = vi.fn(() => { throw new Error("socket failed"); });
    const subject = facadeFor(createTeamRun(), publish);

    await expect(subject.facade.dispatchToTeamBinding(binding(), envelope())).resolves.toMatchObject({
      dispatchTargetType: "TEAM",
      agentRunId: "member-1",
    });
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("rejects dispatch when TeamRunService cannot resolve an active run", async () => {
    const facade = new ChannelTeamRunFacade({
      runLauncher: { resolveOrStartTeamRun: vi.fn().mockResolvedValue("team-1") } as never,
      teamRunService: { resolveActiveTeamRun: vi.fn().mockResolvedValue(null) } as never,
      teamLiveMessagePublisher: { publishExternalUserMessage: vi.fn() } as never,
    });

    await expect(facade.dispatchToTeamBinding(binding(), envelope())).rejects.toThrow(
      "Team run 'team-1' is not active.",
    );
  });
});
