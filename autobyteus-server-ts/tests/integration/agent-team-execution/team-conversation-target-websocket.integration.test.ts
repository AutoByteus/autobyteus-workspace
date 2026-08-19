import fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import WebSocket from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { AgentSessionManager } from "../../../src/services/agent-streaming/agent-session-manager.js";
import { TeamStreamBroadcaster } from "../../../src/services/agent-streaming/team-stream-broadcaster.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

type WsMessage = { type: string; payload: Record<string, unknown> };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const waitFor = async <T>(read: () => T | null, label: string): Promise<T> => {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const value = read();
    if (value) return value;
    await wait(10);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const tree = testExecutionTree({
  rootTeamRunId: "team-run-1",
  coordinatorAddress: "/coordinator",
  children: [
    testAgentNode("/coordinator", { agentRunId: "persistent-coordinator-run" }),
    testAgentNode("/worker", { agentRunId: "persistent-worker-run" }),
  ],
});
const tasks = Object.freeze({ schemaVersion: 1 as const, rootTeamRunId: "team-run-1", records: Object.freeze([]) });
const messagesSnapshot = Object.freeze({ schemaVersion: 1 as const, rootTeamRunId: "team-run-1", messages: Object.freeze([]) });

let commandCounter = 0;
const sendMessage = (socket: WebSocket, agentRunId: string, content: string, extra: Record<string, unknown> = {}): void => {
  commandCounter += 1;
  socket.send(JSON.stringify({
    type: "SEND_MESSAGE",
    payload: {
      content,
      context_file_paths: [],
      image_urls: [],
      agent_run_id: agentRunId,
      message_id: `client-${commandCounter}`,
      dedupe_key: `member_input:${commandCounter}`,
      ...extra,
    },
  }));
};

const activeAgentRunIds = new Set([
  "persistent-coordinator-run",
  "task-agent-run-1",
  "outer-task-team-agent-run",
  "nested-task-team-agent-run",
]);

const startHarness = async () => {
  const app = fastify();
  await app.register(websocket);
  const executeAgentCommand = vi.fn(async (agentRunId: string) => activeAgentRunIds.has(agentRunId)
    ? { accepted: true }
    : { accepted: false, code: "RUN_NOT_FOUND", message: `AgentRun '${agentRunId}' is not active.` });
  const root = {
    teamRunId: "team-run-1",
    openPackageSnapshotConnection: vi.fn(async () => ({
      snapshot: { tree, tasks, messages: messagesSnapshot, statuses: [] },
      baseChangeSequence: 0,
      queuedEvents: [],
      subscribe: vi.fn(() => vi.fn()),
      close: vi.fn(),
    })),
    executeAgentCommand,
    getExecutionTreeSnapshot: () => tree,
    getTaskRecordsSnapshot: () => tasks,
  };
  const teamRunService = {
    getActiveTeamRun: vi.fn(() => root),
    resolveActiveTeamRun: vi.fn(async () => root),
    recordRunActivity: vi.fn(async () => undefined),
  };
  const lifecycle = {
    getLifecycleSnapshot: vi.fn(() => ({ teamRunId: "team-run-1", isActive: true })),
    subscribeToLifecycle: vi.fn(() => vi.fn()),
  };
  const handler = new AgentTeamStreamHandler(
    new AgentSessionManager(),
    teamRunService as never,
    new TeamStreamBroadcaster(),
    lifecycle as never,
  );
  await registerAgentWebsocket(app, {} as never, handler);
  await app.listen({ host: "127.0.0.1", port: 0 });
  const address = app.server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP server address");
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws/agent-team/team-run-1`);
  const output: WsMessage[] = [];
  socket.on("message", (raw) => output.push(JSON.parse(raw.toString()) as WsMessage));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), 2_000);
    socket.once("open", () => { clearTimeout(timer); resolve(); });
    socket.once("error", reject);
  });
  await waitFor(() => output.find((message) => message.type === "CONNECTED") ?? null, "CONNECTED");
  return { app, socket, output, executeAgentCommand, teamRunService };
};

let cleanup: { app: FastifyInstance; socket: WebSocket } | null = null;
afterEach(async () => {
  if (cleanup?.socket.readyState !== WebSocket.CLOSED) {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 500);
      cleanup!.socket.once("close", () => { clearTimeout(timer); resolve(); });
      cleanup!.socket.close();
    });
  }
  await cleanup?.app.close();
  cleanup = null;
});

describe("Team WebSocket exact AgentRun command integration", () => {
  it("preserves persistent, task Agent, outer task-Team, and nested task-Team AgentRun targets", async () => {
    const harness = await startHarness();
    cleanup = harness;
    const targets = [
      "persistent-coordinator-run",
      "task-agent-run-1",
      "outer-task-team-agent-run",
      "nested-task-team-agent-run",
    ];
    targets.forEach((agentRunId, index) => sendMessage(harness.socket, agentRunId, `exact-${index}`));

    await waitFor(
      () => harness.executeAgentCommand.mock.calls.length === targets.length ? true : null,
      "four exact AgentRun commands",
    );
    expect(harness.executeAgentCommand.mock.calls.map(([agentRunId]) => agentRunId)).toEqual(targets);
    expect(harness.executeAgentCommand.mock.calls.map(([, command]) => command)).toEqual(
      targets.map((_value, index) => expect.objectContaining({
        kind: "post_message",
        message: expect.objectContaining({ content: `exact-${index}` }),
      })),
    );
    expect(harness.teamRunService.recordRunActivity).toHaveBeenCalledTimes(4);
  });

  it("returns INVALID_TARGET for a stale exact AgentRun without retry or persistent substitution", async () => {
    const harness = await startHarness();
    cleanup = harness;
    sendMessage(harness.socket, "stale-nested-agent-run", "must not fall back");

    const error = await waitFor(
      () => harness.output.find((message) => message.type === "ERROR" && message.payload.code === "INVALID_TARGET") ?? null,
      "INVALID_TARGET",
    );
    expect(error.payload.message).toBe("AgentRun 'stale-nested-agent-run' is not active.");
    expect(harness.executeAgentCommand).toHaveBeenCalledOnce();
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });

  it("rejects a legacy selector at the strict WebSocket contract before root execution", async () => {
    const harness = await startHarness();
    cleanup = harness;
    sendMessage(harness.socket, "persistent-coordinator-run", "legacy", { member_route_key: "coordinator" });
    await wait(100);
    expect(harness.executeAgentCommand).not.toHaveBeenCalled();
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });
});
