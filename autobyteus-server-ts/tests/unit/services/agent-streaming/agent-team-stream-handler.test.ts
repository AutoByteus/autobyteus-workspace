import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamExecutionAddress } from "../../../../src/agent-team-execution/domain/team-execution-address.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentTeamStreamHandler } from "../../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import { TeamStreamBroadcaster } from "../../../../src/services/agent-streaming/team-stream-broadcaster.js";
import {
  ClientMessageType,
  ServerMessageType,
} from "../../../../src/services/agent-streaming/models.js";

type ExecutionAddress = ReturnType<typeof createTeamExecutionAddress>;

const executionCases: Array<{ name: string; address: ExecutionAddress }> = [
  {
    name: "persistent member",
    address: createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      taskTeamRunIds: [],
      memberAddress: "/worker",
      taskAgentRunId: null,
    }),
  },
  {
    name: "direct task Agent",
    address: createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      taskTeamRunIds: [],
      memberAddress: "/worker",
      taskAgentRunId: "task-agent-run-1",
    }),
  },
  {
    name: "outer task AgentTeam member",
    address: createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      taskTeamRunIds: ["task-team-outer"],
      memberAddress: "/BuildSquad/reviewer",
      taskAgentRunId: null,
    }),
  },
  {
    name: "nested task AgentTeam member",
    address: createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      taskTeamRunIds: ["task-team-outer", "task-team-inner"],
      memberAddress: "/BuildSquad/ReviewCell/reviewer",
      taskAgentRunId: null,
    }),
  },
];

const parseSent = (connection: { send: ReturnType<typeof vi.fn> }) =>
  connection.send.mock.calls.map(([raw]) => JSON.parse(String(raw)) as {
    type: ServerMessageType;
    payload: Record<string, unknown>;
  });

const createHarness = async (input: {
  executeResult?: { accepted: boolean; code?: string; message?: string };
  resolveRun?: boolean;
} = {}) => {
  let eventListener: ((event: unknown) => void) | null = null;
  const executeMemberCommand = vi.fn(async () => input.executeResult ?? { accepted: true });
  const teamRun = {
    teamRunId: "team-1",
    subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
      eventListener = listener;
      return () => undefined;
    }),
    getLeafAgentStatusSnapshots: vi.fn(() => []),
    hasOpenExecutionWork: vi.fn(() => false),
    executeMemberCommand,
  };
  const teamRunService = {
    resolveTeamRun: vi.fn(async () => input.resolveRun === false ? null : teamRun),
    getTeamRun: vi.fn(() => input.resolveRun === false ? null : teamRun),
    recordRunActivity: vi.fn(async () => undefined),
    refreshRunMetadata: vi.fn(async () => undefined),
  };
  const teamRunManager = {
    getLifecycleSnapshot: vi.fn(() => ({ teamRunId: "team-1", isActive: true })),
    subscribeToLifecycle: vi.fn(() => () => undefined),
  };
  const handler = new AgentTeamStreamHandler(
    new AgentSessionManager(),
    teamRunService as never,
    new TeamStreamBroadcaster(),
    undefined,
    { getInitialMessages: vi.fn(() => []) } as never,
    teamRunManager as never,
  );
  const connection = { send: vi.fn(), close: vi.fn() };
  const sessionId = await handler.connect(connection, "team-1");
  if (sessionId) connection.send.mockClear();
  return {
    connection,
    eventListener: () => eventListener,
    executeMemberCommand,
    handler,
    sessionId,
    teamRun,
    teamRunManager,
    teamRunService,
  };
};

const handle = async (
  harness: Awaited<ReturnType<typeof createHarness>>,
  type: ClientMessageType,
  payload: Record<string, unknown>,
) => {
  expect(harness.sessionId).toBeTruthy();
  await harness.handler.handleMessage(
    harness.sessionId as string,
    JSON.stringify({ type, payload }),
  );
};

describe("AgentTeamStreamHandler current execution-address commands", () => {
  afterEach(() => vi.useRealTimers());

  it("parses valid messages and rejects malformed envelopes", () => {
    expect(AgentTeamStreamHandler.parseMessage(JSON.stringify({
      type: ClientMessageType.SEND_MESSAGE,
      payload: { content: "hello" },
    }))).toMatchObject({ type: ClientMessageType.SEND_MESSAGE });
    expect(() => AgentTeamStreamHandler.parseMessage("not-json")).toThrow("Invalid JSON");
    expect(() => AgentTeamStreamHandler.parseMessage("{}")).toThrow("Message missing 'type' field");
  });

  it("connects through TeamRunService and publishes the current lifecycle snapshot", async () => {
    const harness = await createHarness();

    expect(harness.sessionId).toBeTruthy();
    expect(harness.teamRunService.resolveTeamRun).toHaveBeenCalledWith("team-1");
    expect(harness.teamRun.subscribeToEvents).toHaveBeenCalledWith(expect.any(Function));
    expect(harness.teamRunManager.subscribeToLifecycle).toHaveBeenCalledWith(
      "team-1",
      expect.any(Function),
    );
    expect(harness.connection.close).not.toHaveBeenCalled();
  });

  it("closes with TEAM_NOT_FOUND when the TeamRun identity cannot be resolved", async () => {
    const harness = await createHarness({ resolveRun: false });

    expect(harness.sessionId).toBeNull();
    expect(harness.connection.close).toHaveBeenCalledWith(4004);
    expect(parseSent(harness.connection)).toEqual([
      expect.objectContaining({
        type: ServerMessageType.ERROR,
        payload: expect.objectContaining({ code: "TEAM_NOT_FOUND" }),
      }),
    ]);
  });

  it.each(executionCases)(
    "preserves the complete $name address across send, approval, and interrupt",
    async ({ address }) => {
      const harness = await createHarness();
      const exactAddress = JSON.parse(JSON.stringify(address));

      await handle(harness, ClientMessageType.SEND_MESSAGE, {
        execution_address: exactAddress,
        content: "perform exact work",
        message_id: "message-1",
        dedupe_key: "dedupe-1",
        context_file_paths: ["/tmp/context.txt"],
        image_urls: ["https://example.invalid/image.png"],
      });
      await handle(harness, ClientMessageType.APPROVE_TOOL, {
        execution_address: exactAddress,
        invocation_id: "invocation-1",
        reason: "approved by user",
      });
      await handle(harness, ClientMessageType.INTERRUPT_GENERATION, {
        execution_address: exactAddress,
        command_id: "interrupt-1",
      });

      expect(harness.executeMemberCommand).toHaveBeenCalledTimes(3);
      expect(harness.executeMemberCommand.mock.calls.map(([actual]) => actual)).toEqual([
        address,
        address,
        address,
      ]);
      expect(harness.executeMemberCommand.mock.calls[0]?.[1]).toMatchObject({
        kind: "post_message",
        message: expect.objectContaining({ content: "perform exact work" }),
      });
      expect(harness.executeMemberCommand.mock.calls[1]?.[1]).toEqual({
        kind: "approve_tool",
        invocationId: "invocation-1",
        approved: true,
        reason: "approved by user",
      });
      expect(harness.executeMemberCommand.mock.calls[2]?.[1]).toEqual({ kind: "interrupt" });
      expect(harness.teamRunService.recordRunActivity).toHaveBeenCalledOnce();
      expect(parseSent(harness.connection)).toContainEqual({
        type: ServerMessageType.AGENT_COMMAND_ACK,
        payload: {
          command_type: "INTERRUPT_GENERATION",
          command_id: "interrupt-1",
          state: "accepted",
          target: {
            target_kind: "team_member",
            team_run_id: "team-1",
            execution_address: address,
          },
        },
      });
    },
  );

  it.each([
    ClientMessageType.SEND_MESSAGE,
    ClientMessageType.APPROVE_TOOL,
    ClientMessageType.INTERRUPT_GENERATION,
  ])("rejects %s before effect when execution_address is incomplete", async (type) => {
    const harness = await createHarness();
    await handle(harness, type, {
      execution_address: {
        rootTeamRunId: "team-1",
        taskTeamRunIds: ["task-team-outer"],
        memberAddress: "/BuildSquad/reviewer",
      },
      content: "must not send",
      invocation_id: "invocation-1",
      command_id: "interrupt-1",
    });

    expect(harness.executeMemberCommand).not.toHaveBeenCalled();
    expect(parseSent(harness.connection)).toContainEqual(expect.objectContaining({
      type: ServerMessageType.ERROR,
      payload: expect.objectContaining({ code: "INVALID_TARGET" }),
    }));
  });

  it.each([
    ClientMessageType.SEND_MESSAGE,
    ClientMessageType.APPROVE_TOOL,
    ClientMessageType.INTERRUPT_GENERATION,
  ])("rejects %s before effect when execution_address names a foreign root", async (type) => {
    const harness = await createHarness();
    await handle(harness, type, {
      execution_address: {
        rootTeamRunId: "foreign-root",
        taskTeamRunIds: [],
        memberAddress: "/worker",
        taskAgentRunId: null,
      },
      content: "must not send",
      invocation_id: "invocation-1",
      command_id: "interrupt-1",
    });

    expect(harness.executeMemberCommand).not.toHaveBeenCalled();
    expect(parseSent(harness.connection)).toContainEqual(expect.objectContaining({
      type: ServerMessageType.ERROR,
      payload: expect.objectContaining({ code: "INVALID_TARGET" }),
    }));
  });

  it("passes an exact stale nested task chain once and surfaces rejection without fallback", async () => {
    const harness = await createHarness({
      executeResult: {
        accepted: false,
        code: "TASK_TEAM_INSTANCE_NOT_ACTIVE",
        message: "Nested task TeamRun is stale.",
      },
    });
    const stale = createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      taskTeamRunIds: ["stale-outer", "stale-inner"],
      memberAddress: "/BuildSquad/ReviewCell/reviewer",
      taskAgentRunId: null,
    });

    await handle(harness, ClientMessageType.SEND_MESSAGE, {
      execution_address: stale,
      content: "must not fall back",
    });

    expect(harness.executeMemberCommand).toHaveBeenCalledOnce();
    expect(harness.executeMemberCommand).toHaveBeenCalledWith(
      stale,
      expect.objectContaining({ kind: "post_message" }),
    );
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
    expect(parseSent(harness.connection)).toContainEqual(expect.objectContaining({
      type: ServerMessageType.ERROR,
      payload: {
        code: "INVALID_TARGET",
        message: "Nested task TeamRun is stale.",
      },
    }));
  });

  it("returns one failed interrupt acknowledgement for an exact stale address", async () => {
    const harness = await createHarness({
      executeResult: {
        accepted: false,
        code: "TASK_TEAM_INSTANCE_NOT_ACTIVE",
        message: "Nested task TeamRun is stale.",
      },
    });
    const stale = executionCases[3]!.address;

    await handle(harness, ClientMessageType.INTERRUPT_GENERATION, {
      execution_address: stale,
      command_id: "interrupt-stale",
    });

    expect(harness.executeMemberCommand).toHaveBeenCalledOnce();
    expect(parseSent(harness.connection)).toEqual([
      {
        type: ServerMessageType.AGENT_COMMAND_ACK,
        payload: {
          command_type: "INTERRUPT_GENERATION",
          command_id: "interrupt-stale",
          state: "failed",
          code: "TASK_TEAM_INSTANCE_NOT_ACTIVE",
          message: "Nested task TeamRun is stale.",
          target: {
            target_kind: "team_member",
            team_run_id: "team-1",
            execution_address: stale,
          },
        },
      },
    ]);
  });

  it("projects the exact execution address on Agent events", () => {
    const address = executionCases[3]!.address;
    const handler = new AgentTeamStreamHandler(
      undefined,
      { getTeamRun: vi.fn(), resolveTeamRun: vi.fn() } as never,
    );

    const message = handler.convertTeamEvent({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      executionAddress: address,
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        executionAddress: address,
        displayName: "reviewer",
        agentEvent: {
          runId: "task-reviewer-run",
          eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
          payload: { invocation_id: "invocation-1", tool_name: "read_file", result: "ok" },
          statusHint: null,
        },
        taskAgentInstance: null,
      },
    });

    expect(message.type).toBe(ServerMessageType.TOOL_EXECUTION_SUCCEEDED);
    expect(message.payload).toMatchObject({
      agent_name: "reviewer",
      runtime_kind: RuntimeKind.CODEX_APP_SERVER,
      execution_address: address,
      invocation_id: "invocation-1",
    });
  });

  it("coalesces metadata refresh work across a burst of streamed Team events", async () => {
    vi.useFakeTimers();
    const harness = await createHarness();
    const listener = harness.eventListener();
    expect(listener).toBeTruthy();
    const address = executionCases[0]!.address;
    const event = {
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      executionAddress: address,
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        executionAddress: address,
        displayName: "worker",
        agentEvent: {
          runId: "worker-run",
          eventType: AgentRunEventType.SEGMENT_CONTENT,
          payload: { id: "segment-1", segment_type: "text", delta: "x" },
          statusHint: null,
        },
        taskAgentInstance: null,
      },
    };

    listener?.(event);
    listener?.(event);
    listener?.(event);
    expect(harness.teamRunService.refreshRunMetadata).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(harness.teamRunService.refreshRunMetadata).toHaveBeenCalledOnce();
    expect(harness.teamRunService.refreshRunMetadata).toHaveBeenCalledWith(harness.teamRun);
  });
});
