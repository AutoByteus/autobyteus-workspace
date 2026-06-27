import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import type { ConversationTargetAddress } from "../../../src/agent-team-execution/domain/conversation-target-address.js";
import type { TeamRunEventListener } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { ServerMessageType } from "../../../src/services/agent-streaming/models.js";

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type WsMessage = {
  type: string;
  payload: Record<string, unknown>;
};

const parseMessage = (raw: WebSocket.RawData): WsMessage => JSON.parse(raw.toString()) as WsMessage;

const waitForOpen = (socket: WebSocket, timeoutMs = 2_000): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), timeoutMs);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });

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

const makeSendCommand = (payload: Record<string, unknown>) => {
  commandCounter += 1;
  const messageId = `client-${commandCounter}`;
  return {
  type: "SEND_MESSAGE",
  payload: {
    message_id: messageId,
    dedupe_key: `member_input:${messageId}`,
    context_file_paths: [],
    image_urls: [],
    ...payload,
  },
  };
};

const sendCommand = (socket: WebSocket, payload: Record<string, unknown>): void => {
  socket.send(JSON.stringify(makeSendCommand(payload)));
};

const buildTeamRun = (results: AgentOperationResult[] = []) => {
  const queuedResults = [...results];
  const postMessageToConversationTarget = vi.fn(async () => queuedResults.shift() ?? { accepted: true });
  return {
    runId: "team-run-1",
    getStatusSnapshot: vi.fn().mockReturnValue({ status: "running" }),
    getMemberStatusSnapshots: vi.fn().mockReturnValue([]),
    subscribeToEvents: vi.fn((_listener: TeamRunEventListener) => () => undefined),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    postMessageToConversationTarget,
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
  };
};

const startHarness = async (input: { results?: AgentOperationResult[] } = {}) => {
  const app = fastify();
  await app.register(websocket);
  const teamRun = buildTeamRun(input.results);
  const teamRunService = {
    getTeamRun: vi.fn().mockReturnValue(teamRun),
    resolveTeamRun: vi.fn().mockResolvedValue(teamRun),
    recordRunActivity: vi.fn().mockResolvedValue(undefined),
    refreshRunMetadata: vi.fn().mockResolvedValue(undefined),
  };
  const handler = new AgentTeamStreamHandler(
    new AgentSessionManager(),
    teamRunService as never,
    undefined,
    undefined,
    { getInitialMessages: vi.fn().mockReturnValue([]) } as never,
  );
  await registerAgentWebsocket(app, {} as never, handler);
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected server address info");
  }
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/agent-team/team-run-1`);
  const messages: WsMessage[] = [];
  socket.on("message", (raw) => messages.push(parseMessage(raw)));
  await waitForOpen(socket);
  await waitForMessage(messages, (message) => message.type === ServerMessageType.CONNECTED, "CONNECTED");
  return { app, socket, messages, teamRun, teamRunService };
};

let cleanup: { app: FastifyInstance; socket: WebSocket | null } | null = null;

afterEach(async () => {
  await closeSocket(cleanup?.socket ?? null);
  await cleanup?.app.close();
  cleanup = null;
});

describe("team conversation target websocket integration", () => {
  it("routes flat structural and typed runtime targets through the websocket address boundary", async () => {
    const harness = await startHarness();
    cleanup = harness;

    sendCommand(harness.socket, {
      content: "flat structural",
      target_member_route_key: "worker",
    });
    sendCommand(harness.socket, {
      content: "task agent",
      conversation_target_address: {
        segments: [
          { kind: "member", member_route_key: "worker" },
          { kind: "task_agent", task_agent_run_id: "task-agent-run-1" },
        ],
      },
    });
    sendCommand(harness.socket, {
      content: "task team root",
      conversation_target_address: {
        segments: [
          { kind: "member", member_route_key: "BuildSquad" },
          { kind: "task_team", task_team_run_id: "task-team-run-1" },
        ],
      },
    });
    sendCommand(harness.socket, {
      content: "nested runtime path",
      conversation_target_address: {
        segments: [
          { kind: "member", member_route_key: "BuildSquad" },
          { kind: "task_team", task_team_run_id: "task-team-run-1" },
          { kind: "member", member_route_key: "NestedSquad" },
          { kind: "task_team", task_team_run_id: "task-team-run-2" },
          { kind: "member", member_route_key: "api_engineer" },
          { kind: "task_agent", task_agent_run_id: "task-agent-run-2" },
        ],
      },
    });

    await waitForCondition(
      () => harness.teamRun.postMessageToConversationTarget.mock.calls.length === 4,
      "four routed SEND_MESSAGE calls",
    );

    const postedAddresses = harness.teamRun.postMessageToConversationTarget.mock.calls
      .map((call) => call[1] as ConversationTargetAddress);
    expect(postedAddresses).toEqual([
      { segments: [{ kind: "member", memberRouteKey: "worker" }] },
      {
        segments: [
          { kind: "member", memberRouteKey: "worker" },
          { kind: "task_agent", taskAgentRunId: "task-agent-run-1" },
        ],
      },
      {
        segments: [
          { kind: "member", memberRouteKey: "BuildSquad" },
          { kind: "task_team", taskTeamRunId: "task-team-run-1" },
        ],
      },
      {
        segments: [
          { kind: "member", memberRouteKey: "BuildSquad" },
          { kind: "task_team", taskTeamRunId: "task-team-run-1" },
          { kind: "member", memberRouteKey: "NestedSquad" },
          { kind: "task_team", taskTeamRunId: "task-team-run-2" },
          { kind: "member", memberRouteKey: "api_engineer" },
          { kind: "task_agent", taskAgentRunId: "task-agent-run-2" },
        ],
      },
    ]);
    expect(harness.teamRun.postMessage).not.toHaveBeenCalled();
    expect(harness.teamRunService.recordRunActivity).toHaveBeenCalledTimes(4);
  });

  it("keeps concurrent runtime ids distinct and does not choose a latest-run fallback", async () => {
    const harness = await startHarness();
    cleanup = harness;

    for (const taskTeamRunId of ["task-team-run-1", "task-team-run-2"]) {
      sendCommand(harness.socket, {
        content: `message ${taskTeamRunId}`,
        conversation_target_address: {
          segments: [
            { kind: "member", member_route_key: "BuildSquad" },
            { kind: "task_team", task_team_run_id: taskTeamRunId },
            { kind: "member", member_route_key: "review_lead" },
          ],
        },
      });
    }
    for (const taskAgentRunId of ["task-agent-run-1", "task-agent-run-2"]) {
      sendCommand(harness.socket, {
        content: `message ${taskAgentRunId}`,
        conversation_target_address: {
          segments: [
            { kind: "member", member_route_key: "worker" },
            { kind: "task_agent", task_agent_run_id: taskAgentRunId },
          ],
        },
      });
    }

    await waitForCondition(
      () => harness.teamRun.postMessageToConversationTarget.mock.calls.length === 4,
      "four concurrent-id SEND_MESSAGE calls",
    );

    const postedAddresses = harness.teamRun.postMessageToConversationTarget.mock.calls
      .map((call) => call[1] as ConversationTargetAddress);
    expect(postedAddresses.map((address) => address.segments)).toEqual([
      [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-1" },
        { kind: "member", memberRouteKey: "review_lead" },
      ],
      [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-2" },
        { kind: "member", memberRouteKey: "review_lead" },
      ],
      [
        { kind: "member", memberRouteKey: "worker" },
        { kind: "task_agent", taskAgentRunId: "task-agent-run-1" },
      ],
      [
        { kind: "member", memberRouteKey: "worker" },
        { kind: "task_agent", taskAgentRunId: "task-agent-run-2" },
      ],
    ]);
    expect(harness.teamRun.postMessage).not.toHaveBeenCalled();
  });

  it("reports backend invalid runtime targets over the websocket without structural fallback or activity recording", async () => {
    const harness = await startHarness({
      results: [{
        accepted: false,
        code: "TASK_TEAM_RUN_NOT_FOUND",
        message: "Task-team run 'stale-task-team-run' was not found.",
      }],
    });
    cleanup = harness;

    sendCommand(harness.socket, {
      content: "stale runtime target",
      conversation_target_address: {
        segments: [
          { kind: "member", member_route_key: "BuildSquad" },
          { kind: "task_team", task_team_run_id: "stale-task-team-run" },
        ],
      },
    });

    await waitForCondition(
      () => harness.teamRun.postMessageToConversationTarget.mock.calls.length === 1,
      "stale runtime SEND_MESSAGE call",
    );
    const error = await waitForMessage(
      harness.messages,
      (message) => message.type === ServerMessageType.ERROR,
      "INVALID_TARGET error",
    );

    expect(error.payload).toMatchObject({
      code: "INVALID_TARGET",
      message: "Task-team run 'stale-task-team-run' was not found.",
    });
    expect(harness.teamRun.postMessageToConversationTarget.mock.calls[0]?.[1]).toEqual({
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "stale-task-team-run" },
      ],
    });
    expect(harness.teamRun.postMessage).not.toHaveBeenCalled();
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });
});
