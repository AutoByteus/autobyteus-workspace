import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { ServerMessageType } from "../../../src/services/agent-streaming/models.js";
import { TeamStreamBroadcaster } from "../../../src/services/agent-streaming/team-stream-broadcaster.js";
import { projectTeamExecutionAddressDto } from "../../../src/services/agent-streaming/team-agent-event-websocket-projector.js";

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type WsMessage = { type: string; payload: Record<string, unknown> };

const waitForCondition = async (predicate: () => boolean, label: string, timeoutMs = 2_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await wait(10);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const waitForMessage = async (
  messages: WsMessage[],
  predicate: (message: WsMessage) => boolean,
  label: string,
  timeoutMs = 2_000,
): Promise<WsMessage> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const match = messages.find(predicate);
    if (match) return match;
    await wait(10);
  }
  throw new Error(`Timed out waiting for websocket message '${label}'. messages=${JSON.stringify(messages)}`);
};

const closeSocket = async (socket: WebSocket | null): Promise<void> => {
  if (!socket || socket.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, 500);
    socket.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.close();
  });
};

let commandCounter = 0;
const sendMessage = (
  socket: WebSocket,
  executionAddress: ReturnType<typeof createTeamExecutionAddress> | Record<string, unknown>,
  content: string,
): void => {
  commandCounter += 1;
  const messageId = `client-${commandCounter}`;
  const execution_address = "rootTeamRunId" in executionAddress
    ? projectTeamExecutionAddressDto(executionAddress as ReturnType<typeof createTeamExecutionAddress>)
    : executionAddress;
  socket.send(JSON.stringify({
    type: "SEND_MESSAGE",
    payload: {
      execution_address,
      message_id: messageId,
      dedupe_key: `member_input:${messageId}`,
      content,
      context_file_paths: [],
      image_urls: [],
    },
  }));
};

const startHarness = async (input: {
  executeResult?: { accepted: boolean; code?: string; message?: string };
} = {}) => {
  const app = fastify();
  await app.register(websocket);
  const executeMemberCommand = vi.fn(async () => input.executeResult ?? { accepted: true });
  const teamRun = {
    teamRunId: "team-run-1",
    getLeafAgentStatusSnapshots: vi.fn().mockReturnValue([]),
    hasOpenExecutionWork: vi.fn().mockReturnValue(false),
    subscribeToEvents: vi.fn(() => () => undefined),
    executeMemberCommand,
  };
  const teamRunService = {
    getTeamRun: vi.fn().mockReturnValue(teamRun),
    resolveTeamRun: vi.fn().mockResolvedValue(teamRun),
    recordRunActivity: vi.fn().mockResolvedValue(undefined),
    refreshRunMetadata: vi.fn().mockResolvedValue(undefined),
  };
  const teamRunManager = {
    getLifecycleSnapshot: vi.fn().mockReturnValue({ teamRunId: "team-run-1", isActive: true }),
    subscribeToLifecycle: vi.fn().mockReturnValue(() => undefined),
  };
  const handler = new AgentTeamStreamHandler(
    new AgentSessionManager(),
    teamRunService as never,
    new TeamStreamBroadcaster(),
    { getInitialMessages: vi.fn().mockReturnValue([]) } as never,
    teamRunManager as never,
  );
  await registerAgentWebsocket(app, {} as never, handler);
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("Expected server address info");

  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/agent-team/team-run-1`);
  const messages: WsMessage[] = [];
  socket.on("message", (raw) => messages.push(JSON.parse(raw.toString()) as WsMessage));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), 2_000);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", reject);
  });
  await waitForMessage(messages, (message) => message.type === ServerMessageType.CONNECTED, "CONNECTED");
  return { app, socket, messages, executeMemberCommand, teamRunService };
};

let cleanup: { app: FastifyInstance; socket: WebSocket | null } | null = null;

afterEach(async () => {
  await closeSocket(cleanup?.socket ?? null);
  await cleanup?.app.close();
  cleanup = null;
});

describe("team exact execution-address websocket integration", () => {
  it("preserves persistent, task Agent, outer task-Team, and nested task-Team addresses", async () => {
    const harness = await startHarness();
    cleanup = harness;
    const addresses = [
      createTeamExecutionAddress({
        rootTeamRunId: "team-run-1",
        taskTeamRunIds: [],
        memberAddress: "/worker",
        taskAgentRunId: null,
      }),
      createTeamExecutionAddress({
        rootTeamRunId: "team-run-1",
        taskTeamRunIds: [],
        memberAddress: "/worker",
        taskAgentRunId: "task-agent-run-1",
      }),
      createTeamExecutionAddress({
        rootTeamRunId: "team-run-1",
        taskTeamRunIds: ["task-team-run-1"],
        memberAddress: "/BuildSquad/reviewer",
        taskAgentRunId: null,
      }),
      createTeamExecutionAddress({
        rootTeamRunId: "team-run-1",
        taskTeamRunIds: ["task-team-run-1", "task-team-run-2"],
        memberAddress: "/BuildSquad/NestedSquad/reviewer",
        taskAgentRunId: "task-agent-run-2",
      }),
    ];

    addresses.forEach((address, index) => sendMessage(harness.socket, address, `exact-${index}`));
    await waitForCondition(
      () => harness.executeMemberCommand.mock.calls.length === addresses.length,
      "four exact SEND_MESSAGE calls",
    );

    expect(harness.executeMemberCommand.mock.calls.map(([address]) => address)).toEqual(addresses);
    expect(harness.executeMemberCommand.mock.calls.map(([, command]) => command)).toEqual(
      addresses.map((_address, index) => expect.objectContaining({
        kind: "post_message",
        message: expect.objectContaining({ content: `exact-${index}` }),
      })),
    );
    expect(harness.teamRunService.recordRunActivity).toHaveBeenCalledTimes(addresses.length);
  });

  it("rejects an incomplete or foreign-root address before any execution effect", async () => {
    const harness = await startHarness();
    cleanup = harness;

    sendMessage(harness.socket, {
      root_team_run_id: "team-run-1",
      task_team_run_ids: [],
      member_address: "/worker",
    }, "incomplete");
    sendMessage(harness.socket, {
      root_team_run_id: "foreign-root",
      task_team_run_ids: [],
      member_address: "/worker",
      task_agent_run_id: null,
    }, "foreign");

    await waitForMessage(
      harness.messages,
      (message) => message.type === ServerMessageType.ERROR
        && message.payload.code === "INVALID_TARGET",
      "foreign-root rejection",
    );
    expect(harness.executeMemberCommand).not.toHaveBeenCalled();
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });

  it("surfaces a stale nested task-Team rejection without retry or persistent fallback", async () => {
    const harness = await startHarness({
      executeResult: {
        accepted: false,
        code: "TASK_TEAM_INSTANCE_NOT_ACTIVE",
        message: "Nested task TeamRun is stale.",
      },
    });
    cleanup = harness;
    const address = createTeamExecutionAddress({
      rootTeamRunId: "team-run-1",
      taskTeamRunIds: ["stale-outer", "stale-inner"],
      memberAddress: "/BuildSquad/NestedSquad/reviewer",
      taskAgentRunId: null,
    });

    sendMessage(harness.socket, address, "must not fall back");
    const error = await waitForMessage(
      harness.messages,
      (message) => message.type === ServerMessageType.ERROR
        && message.payload.code === "INVALID_TARGET",
      "stale nested task-Team rejection",
    );

    expect(error.payload.message).toBe("Nested task TeamRun is stale.");
    expect(harness.executeMemberCommand).toHaveBeenCalledOnce();
    expect(harness.executeMemberCommand).toHaveBeenCalledWith(
      address,
      expect.objectContaining({ kind: "post_message" }),
    );
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });
});
