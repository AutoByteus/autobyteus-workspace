import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import { AgentTeamStreamHandler } from "../../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { TeamStreamBroadcaster } from "../../../../src/services/agent-streaming/team-stream-broadcaster.js";
import { validateTaskDelegationRecordsV1Payload } from "../../../../src/agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../../src/services/team-communication/team-communication-v1-schema.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails } from "../../../../src/agent-team-execution/domain/team-agent-status.js";

const scenarioDir = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team",
);
const json = (name: string) => JSON.parse(fs.readFileSync(path.join(scenarioDir, name), "utf8")) as unknown;
const tree = validateTeamRunExecutionTreePayload(json("team_run_execution_tree.json"), "team-run-root");
const tasks = validateTaskDelegationRecordsV1Payload(json("task_delegation_records.json"), "team-run-root");
const messages = validateTeamCommunicationMessagesV1Payload(json("team_communication_messages.json"), "team-run-root");

const sent = (connection: { send: ReturnType<typeof vi.fn> }) =>
  connection.send.mock.calls.map(([raw]) => JSON.parse(String(raw)) as { type: string; payload: Record<string, unknown> });

const createHarness = (input: { commandResult?: { accepted: boolean; code?: string; message?: string } } = {}) => {
  let eventListener: ((event: unknown) => void) | null = null;
  const closeSnapshot = vi.fn();
  const executeAgentCommand = vi.fn(async () => input.commandResult ?? ({ accepted: true }));
  const root = {
    teamRunId: "team-run-root",
    openPackageSnapshotConnection: vi.fn(async () => ({
      snapshot: { tree, tasks, messages, statuses: [] },
      baseChangeSequence: 31,
      subscribe: vi.fn((listener: (event: unknown) => void) => { eventListener = listener; return vi.fn(); }),
      close: closeSnapshot,
    })),
    executeAgentCommand,
    getExecutionTreeSnapshot: () => tree,
    getTaskRecordsSnapshot: () => tasks,
  };
  const teamRunService = {
    resolveTeamRun: vi.fn(async () => root),
    getTeamRun: vi.fn(() => root),
    recordRunActivity: vi.fn(async () => undefined),
  };
  const lifecycle = {
    getLifecycleSnapshot: vi.fn(() => ({ teamRunId: "team-run-root", isActive: true })),
    subscribeToLifecycle: vi.fn(() => vi.fn()),
  };
  const connection = { send: vi.fn(), close: vi.fn() };
  const handler = new AgentTeamStreamHandler(
    new AgentSessionManager(),
    teamRunService as never,
    new TeamStreamBroadcaster(),
    lifecycle as never,
  );
  return { handler, connection, root, teamRunService, executeAgentCommand, closeSnapshot, emit: (event: unknown) => eventListener?.(event) };
};

const sessions: Array<{ handler: AgentTeamStreamHandler; id: string }> = [];
afterEach(async () => {
  await Promise.all(sessions.splice(0).map(({ handler, id }) => handler.disconnect(id)));
});

describe("AgentTeamStreamHandler current root stream", () => {
  it("connects with one atomic V1 snapshot before lifecycle changes", async () => {
    const harness = createHarness();
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    expect(sessionId).toEqual(expect.any(String));
    sessions.push({ handler: harness.handler, id: sessionId! });

    const output = sent(harness.connection);
    expect(output.map((message) => message.type)).toEqual([
      "CONNECTED",
      "TEAM_EXECUTION_VIEW_SNAPSHOT",
      "TEAM_RUN_LIFECYCLE",
    ]);
    expect(output[1]).toMatchObject({
      payload: {
        root_team_run_id: "team-run-root",
        base_change_sequence: 31,
        tasks: expect.arrayContaining([expect.objectContaining({ task_id: "task-011" })]),
        messages: [expect.objectContaining({ message_id: "message-010" })],
      },
    });
  });

  it("streams strict live status N and the following Agent event N+1 after the snapshot barrier", async () => {
    const harness = createHarness();
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    sessions.push({ handler: harness.handler, id: sessionId! });
    const execution = createTeamAgentExecutionBinding({
      rootTeamRunId: "team-run-root",
      memberAddress: "/qa/automation/tester",
      agentRunId: "nested-task-agent-run-001",
    });
    harness.emit({
      changeSequence: 32,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution,
        payload: {
          eventType: "AGENT_STATUS",
          statusHint: "running",
          details: createTeamAgentStatusDetails({ status: "running", trigger: "turn_started" }),
        },
      },
    });
    harness.emit({
      changeSequence: 33,
      event: {
        eventSourceType: TeamRunEventSourceType.AGENT,
        execution,
        payload: { eventType: "TURN_STARTED", statusHint: "running", details: { turnId: "turn-1" } },
      },
    });
    expect(sent(harness.connection).slice(-2)).toEqual([
      {
        type: "AGENT_STATUS",
        payload: {
          change_sequence: 32,
          agent_run_id: "nested-task-agent-run-001",
          status: "running",
          trigger: "turn_started",
          tool_name: null,
          error_message: null,
          error_details: null,
        },
      },
      {
        type: "TURN_STARTED",
        payload: {
          change_sequence: 33,
          agent_run_id: "nested-task-agent-run-001",
          turn_id: "turn-1",
        },
      },
    ]);
  });

  it("routes SEND_MESSAGE by the exact concrete AgentRun ID and records activity once", async () => {
    const harness = createHarness();
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    sessions.push({ handler: harness.handler, id: sessionId! });
    await harness.handler.handleMessage(sessionId!, JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        content: "hello task agent",
        context_file_paths: ["/tmp/context.txt"],
        image_urls: [],
        agent_run_id: "nested-task-agent-run-001",
        message_id: "message-user-1",
        dedupe_key: "user:1",
      },
    }));
    expect(harness.executeAgentCommand).toHaveBeenCalledWith(
      "nested-task-agent-run-001",
      expect.objectContaining({ kind: "post_message", message: expect.objectContaining({ content: "hello task agent" }) }),
    );
    expect(harness.teamRunService.recordRunActivity).toHaveBeenCalledOnce();
  });

  it("reports exact-target rejection without persistent or address fallback", async () => {
    const harness = createHarness({ commandResult: { accepted: false, code: "RUN_NOT_FOUND", message: "missing task run" } });
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    sessions.push({ handler: harness.handler, id: sessionId! });
    await harness.handler.handleMessage(sessionId!, JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        content: "hello",
        context_file_paths: [], image_urls: [],
        agent_run_id: "stale-agent-run", message_id: "message-user-2", dedupe_key: "user:2",
      },
    }));
    expect(harness.executeAgentCommand).toHaveBeenCalledWith("stale-agent-run", expect.anything());
    expect(sent(harness.connection).at(-1)).toMatchObject({
      type: "ERROR",
      payload: { code: "INVALID_TARGET", message: "missing task run" },
    });
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });

  it("rejects legacy selector fields at the strict client contract boundary", () => {
    expect(() => AgentTeamStreamHandler.parseMessage(JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        content: "hello", context_file_paths: [], image_urls: [],
        agent_run_id: "agent-run-product-manager", message_id: "m", dedupe_key: "d",
        member_route_key: "product_manager",
      },
    }))).toThrow();
  });
});
