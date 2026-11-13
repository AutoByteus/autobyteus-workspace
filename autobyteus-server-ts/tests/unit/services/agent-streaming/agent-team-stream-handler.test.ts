import { createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import { AgentTeamStreamHandler } from "../../../../src/services/agent-streaming/agent-team-stream-handler.js";
import { validateTeamRunExecutionTreePayload } from "../../../../src/run-history/store/team-run-execution-tree-schema.js";
import { validateCollaborationCommunicationMessageArray } from "../../../../src/agent-collaboration/execution/communication/collaboration-communication-message-schema.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { createTeamAgentExecutionBinding } from "../../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails } from "../../../../src/agent-team-execution/domain/team-agent-status.js";
import { assertAgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import { delegatedChild, followTestChildRows, testRegistrations, openTasks } from "../../../helpers/child-rows-feed.js";

const scenarioDir = path.resolve(
  process.cwd(),
  "tests/fixtures/current-team-run-v2/case-001-delegated-task-team-forest",
);
const recordsDir = path.resolve(
  process.cwd(),
  "tests/fixtures/app-data-migrations/team-run-execution-tree-v1/case-003-nested-task-team",
);
const json = (dir: string, name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as unknown;
const tree = validateTeamRunExecutionTreePayload(json(scenarioDir, "team_run_execution_tree.json"), "team-run-root");
const messages = Object.freeze({
  schemaVersion: 1 as const,
  rootTeamRunId: "team-run-root",
  messages: validateCollaborationCommunicationMessageArray((json(recordsDir, "team_communication_messages.json") as { messages: unknown }).messages),
});

const sent = (connection: { send: ReturnType<typeof vi.fn> }) =>
  connection.send.mock.calls.map(([raw]) => JSON.parse(String(raw)) as { type: string; payload: Record<string, unknown> });

const createHarness = (input: {
  commandResult?: { accepted: boolean; code?: string; message?: string };
  commandError?: Error;
  /** The team run is stopped (not managed) when the view connects. */
  stopped?: boolean;
} = {}) => {
  const feed = followTestChildRows();
  // The run's one view stream (SR-062): row events reach the live view's subscription through it.
  const stream = feed.streams.streamOf(createTeamRootExecutionIdentity("team-run-root"));
  let eventListener: ((event: unknown) => void) | null = null;
  const closeSnapshot = vi.fn();
  const executeAgentCommand = vi.fn(async () => {
    if (input.commandError) throw input.commandError;
    return input.commandResult ?? ({ accepted: true });
  });
  const root = {
    teamRunId: "team-run-root",
    openViewSnapshotConnection: vi.fn(async (atBase: () => unknown, read: (own: unknown, rows: unknown) => unknown) => {
      const rows = atBase();
      return {
        snapshot: await read({ tree, messages, inputStates: [], statuses: [] }, rows),
        baseChangeSequence: 31,
        liveSequenceId: "live-team-1", lastMessageChangeSequence: 0,
        subscribe: vi.fn((listener: (event: unknown) => void) => { eventListener = listener; return stream.subscribe(listener as never); }),
        close: closeSnapshot,
      };
    }),
    executeAgentCommand,
    getExecutionTreeSnapshot: () => tree,
    localChildren: { viewerAttached: () => undefined, viewerDetached: () => undefined },
  };
  // The run's registration (SR-046): managed (live) or stopped; a restore registers it, a stop unregisters it.
  let managed = !input.stopped;
  const registrations = testRegistrations();
  const team = createTeamRootExecutionIdentity("team-run-root");
  const teamRunService = {
    getActiveTeamRun: vi.fn(() => managed ? root : null),
    resolveManagedTeamRun: vi.fn(async () => { if (!managed) { managed = true; registrations.register(team); } return root; }),
    recordRunActivity: vi.fn(async () => undefined),
  };
  const readStoredTree = vi.fn(async () => tree);
  const closedTasks = openTasks();
  const connection = { send: vi.fn(), close: vi.fn() };
  const handler = new AgentTeamStreamHandler(
    new AgentSessionManager(),
    teamRunService as never,
    { streams: feed.streams, rows: feed.rows, registrations, closedTasks, readStoredTree },
  );
  return { handler, connection, root, teamRunService, executeAgentCommand, closeSnapshot, feed, registrations, readStoredTree, stream, closedTasks,
    stop: () => { managed = false; registrations.unregister(team); },
    emit: (event: unknown) => eventListener?.(event) };
};

const sessions: Array<{ handler: AgentTeamStreamHandler; id: string }> = [];
afterEach(async () => {
  await Promise.all(sessions.splice(0).map(({ handler, id }) => handler.disconnect(id)));
});

describe("AgentTeamStreamHandler current root stream", () => {
  it("connects with one atomic snapshot (tree, statuses) before lifecycle changes", async () => {
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
        live_sequence_id: "live-team-1",
      },
    });
    expect(output[1]!.payload).not.toHaveProperty("tasks");
    // autobyteus-358: the Team tab reads its participant's messages; the snapshot carries none.
    expect(output[1]!.payload).not.toHaveProperty("messages");
  });

  it("streams strict live status N and the following Agent event N+1 after the snapshot barrier", async () => {
    const harness = createHarness();
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    sessions.push({ handler: harness.handler, id: sessionId! });
    const execution = createTeamAgentExecutionBinding({
      root: createTeamRootExecutionIdentity("team-run-root"),
      memberAddress: assertAgentTeamAddress("/qa/automation/tester"),
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
    // Every frame after the base is sent in order, through the view's ordered sends (SR-062).
    for (let k = 0; k < 10; k += 1) await new Promise((resolve) => setTimeout(resolve, 0));
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
          recoverableBlock: null,
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
      payload: {
        code: "INVALID_TARGET", message: "missing task run", agent_run_id: "stale-agent-run",
      },
    });
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });

  it("returns a target-correlated failure when the exact AgentRun rejects message admission", async () => {
    const harness = createHarness({
      commandResult: { accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "runtime is stopping" },
    });
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    sessions.push({ handler: harness.handler, id: sessionId! });
    await harness.handler.handleMessage(sessionId!, JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        content: "keep this prompt", context_file_paths: [], image_urls: [],
        agent_run_id: "nested-task-agent-run-001", message_id: "message-user-3", dedupe_key: "user:3",
      },
    }));
    expect(sent(harness.connection).at(-1)).toMatchObject({
      type: "ERROR",
      payload: {
        code: "TEAM_SEND_MESSAGE_REJECTED", message: "runtime is stopping",
        details: "AGENT_RUN_NOT_ACCEPTING_INPUT", agent_run_id: "nested-task-agent-run-001",
      },
    });
    expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
  });

  it("returns a target-correlated failure when message execution throws", async () => {
    const harness = createHarness({ commandError: new Error("provider activation failed") });
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    sessions.push({ handler: harness.handler, id: sessionId! });
    await harness.handler.handleMessage(sessionId!, JSON.stringify({
      type: "SEND_MESSAGE",
      payload: {
        content: "keep this prompt", context_file_paths: [], image_urls: [],
        agent_run_id: "nested-task-agent-run-001", message_id: "message-user-4", dedupe_key: "user:4",
      },
    }));
    expect(sent(harness.connection).at(-1)).toMatchObject({
      type: "ERROR",
      payload: {
        code: "TEAM_SEND_MESSAGE_FAILED", message: "provider activation failed",
        agent_run_id: "nested-task-agent-run-001",
      },
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

  it("autobyteus-461 SR-061 … SR-063: an open Team view gets base's row events in the run's sequence, after its snapshot, each once", async () => {
    const harness = createHarness();
    const team = createTeamRootExecutionIdentity("team-run-root");
    // Two changes committed while the run's own parts are read: after the base, so frames after the snapshot, in order
    // (the run's real view stream queues them, SR-063).
    harness.root.openViewSnapshotConnection.mockImplementationOnce((atBase, read) => harness.stream.openSnapshotConnection(async () => {
      const rows = atBase();
      harness.feed.report({ run: team, added: [delegatedChild("writer")], removed: [] });
      harness.feed.report({ run: team, added: [], removed: [{ agentRunId: "old-helper" }] });
      return read({ tree, messages, inputStates: [], statuses: [] }, rows);
    }) as never);
    const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
    sessions.push({ handler: harness.handler, id: sessionId! });
    await harness.feed.settled();
    const output = sent(harness.connection);
    expect(output.map((message) => message.type)).toEqual(["CONNECTED", "TEAM_EXECUTION_VIEW_SNAPSHOT", "TEAM_RUN_LIFECYCLE", "TASK_EXECUTION_STARTED", "TASK_EXECUTIONS_CLOSED"]);
    expect(output[1]!.payload).toMatchObject({ closed_task_executions: [], execution_tree: { root_team: { task_executions: [] } } });
    expect(output[3]!.payload).toEqual({ change_sequence: 1, parent_team_run_id: "team-run-root",
      execution: expect.objectContaining({ kind: "task_agent", agent_run_id: "writer", address: "/writer" }) });
    expect(output[4]!.payload).toEqual({ change_sequence: 2, task_executions: [{ agent_run_id: "old-helper" }] });
  });

  describe("SR-046: a stopped team run's view (stored mode), never restored to serve the view", () => {
    const flush = async () => { for (let i = 0; i < 10; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };

    it("connects from the run's stored tree: every member offline, a fresh base, lifecycle stopped; the run stays stopped", async () => {
      const harness = createHarness({ stopped: true });
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      const output = sent(harness.connection);
      expect(output.map((message) => message.type)).toEqual(["CONNECTED", "TEAM_EXECUTION_VIEW_SNAPSHOT", "TEAM_RUN_LIFECYCLE"]);
      // The run's one view stream (SR-062): the stopped view is numbered in it, under its live sequence.
      expect(output[1]!.payload).toMatchObject({ root_team_run_id: "team-run-root", base_change_sequence: 0, live_sequence_id: harness.stream.liveSequenceId, closed_task_executions: [] });
      expect((output[1]!.payload.agent_statuses as Array<{ status: string }>).every((status) => status.status === "offline")).toBe(true);
      expect(output[2]).toEqual({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: false } });
      expect(harness.teamRunService.resolveManagedTeamRun).not.toHaveBeenCalled();
      expect(harness.root.openViewSnapshotConnection).not.toHaveBeenCalled();
      // Its rows stay live: base's row events, numbered in the run's stream.
      harness.feed.report({ run: createTeamRootExecutionIdentity("team-run-root"), added: [delegatedChild("checker")], removed: [] });
      await harness.feed.settled();
      expect(sent(harness.connection).at(-1)).toMatchObject({ type: "TASK_EXECUTION_STARTED", payload: { change_sequence: 1, execution: { agent_run_id: "checker" } } });
    });

    it("an interrupt or tool approval for a member of the stopped team is refused and restores nothing", async () => {
      const harness = createHarness({ stopped: true });
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      await harness.handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { agent_run_id: "nested-task-agent-run-001", command_id: "c-1" } }));
      expect(sent(harness.connection).at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "failed", code: "TEAM_RUN_STOPPED" } });
      expect(harness.teamRunService.resolveManagedTeamRun).not.toHaveBeenCalled();
      expect(harness.executeAgentCommand).not.toHaveBeenCalled();
    });

    it("SR-066 (ARCH-REV-039 note 1): a peer child's message and interrupt reach its node through its handle; the stopped team stays stopped", async () => {
      const harness = createHarness({ stopped: true });
      const peer = { kind: "agent" as const, runId: "peer-run", postMessage: vi.fn(async () => ({ accepted: true })), interrupt: vi.fn(async () => ({ accepted: true })) };
      (harness.feed.rows as { peerRunOf: unknown }).peerRunOf = (id: string) => id === "peer-run" ? peer : null;
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      await harness.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "status?", context_file_paths: [], image_urls: [],
        agent_run_id: "peer-run", message_id: "m-1", dedupe_key: "d-1" } }));
      expect(peer.postMessage).toHaveBeenCalledWith(expect.objectContaining({ content: "status?", messageId: "m-1", dedupeKey: "d-1" }));
      await harness.handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { agent_run_id: "peer-run", command_id: "c-2" } }));
      expect(peer.interrupt).toHaveBeenCalledOnce();
      // SR-069: a peer run takes no `@`, as at base; mentions that arrive anyway are refused and nothing is posted.
      await harness.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "@Code Reviewer?", context_file_paths: [], image_urls: [],
        agent_run_id: "peer-run", message_id: "m-3", dedupe_key: "d-3", mentions: [{ kind: "agent", definition_id: "code-reviewer" }] } }));
      expect(sent(harness.connection).at(-1)).toMatchObject({ type: "ERROR", payload: { agent_run_id: "peer-run" } });
      expect(JSON.stringify(sent(harness.connection).at(-1))).toContain("REMOTE_RUN_MENTIONS_UNSUPPORTED");
      expect(peer.postMessage).toHaveBeenCalledOnce();
      expect(harness.teamRunService.resolveManagedTeamRun).not.toHaveBeenCalled();
      expect(harness.executeAgentCommand).not.toHaveBeenCalled();
    });

    it("a member's message restores the team on that input: the view is live (one in-band snapshot, then followed) before the message is posted, so the run's events after it reach the view (SR-048)", async () => {
      const harness = createHarness({ stopped: true });
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      const order: string[] = [];
      const execution = createTeamAgentExecutionBinding({
        root: createTeamRootExecutionIdentity("team-run-root"), memberAddress: assertAgentTeamAddress("/qa/automation/tester"), agentRunId: "nested-task-agent-run-001",
      });
      harness.executeAgentCommand.mockImplementationOnce(async () => {
        order.push("posted");
        // The run's own event for this input (its echo is one such event): published after the post.
        harness.emit({ changeSequence: 32, event: { eventSourceType: TeamRunEventSourceType.AGENT, execution,
          payload: { eventType: "AGENT_STATUS", statusHint: "running", details: createTeamAgentStatusDetails({ status: "running", trigger: "turn_started" }) } } });
        return { accepted: true };
      });
      const open = harness.root.openViewSnapshotConnection.getMockImplementation()!;
      harness.root.openViewSnapshotConnection.mockImplementationOnce(async (atBase, read) => { order.push("live snapshot"); return open(atBase, read); });
      await harness.handler.handleMessage(sessionId!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
        agent_run_id: "nested-task-agent-run-001", content: "Start please", context_file_paths: [], image_urls: [], message_id: "m-1", dedupe_key: "d-1",
      } }));
      await flush();
      expect(harness.teamRunService.resolveManagedTeamRun).toHaveBeenCalledOnce();
      expect(order).toEqual(["live snapshot", "posted"]);
      const tail = sent(harness.connection).slice(-3);
      expect(tail.map((message) => message.type)).toEqual(["TEAM_EXECUTION_VIEW_SNAPSHOT", "TEAM_RUN_LIFECYCLE", "AGENT_STATUS"]);
      expect(tail[0]!.payload).toMatchObject({ base_change_sequence: 31, live_sequence_id: "live-team-1" });
      expect(tail[1]).toEqual({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: true } });
      expect(tail[2]!.payload).toMatchObject({ change_sequence: 32, agent_run_id: "nested-task-agent-run-001" });
      expect(sent(harness.connection).filter((message) => message.type === "CONNECTED")).toHaveLength(1);
    });

    it("a live team that stops: the same stream continues with a stored-mode snapshot; the view keeps its child rows", async () => {
      const harness = createHarness();
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      harness.stop();
      await flush();
      const tail = sent(harness.connection).slice(-2);
      expect(tail.map((message) => message.type)).toEqual(["TEAM_EXECUTION_VIEW_SNAPSHOT", "TEAM_RUN_LIFECYCLE"]);
      // The switch is an in-band snapshot at the current sequence, in the same live sequence (SR-062, DS-8).
      expect(tail[0]!.payload).toMatchObject({ base_change_sequence: harness.stream.getCurrentChangeSequence(), live_sequence_id: harness.stream.liveSequenceId });
      expect(tail[1]).toEqual({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: false } });
      expect(harness.connection.close).not.toHaveBeenCalled();
      harness.feed.report({ run: createTeamRootExecutionIdentity("team-run-root"), added: [delegatedChild("checker")], removed: [] });
      await harness.feed.settled();
      expect(sent(harness.connection).at(-1)).toMatchObject({ type: "TASK_EXECUTION_STARTED" });
    });

    it("a run with no stored tree closes with TEAM_NOT_FOUND; disconnect stops following the run", async () => {
      const missing = createHarness({ stopped: true });
      missing.readStoredTree.mockResolvedValueOnce(null as never);
      expect(await missing.handler.connect(missing.connection, "team-run-root")).toBeNull();
      expect(sent(missing.connection).at(-1)).toMatchObject({ type: "ERROR", payload: { code: "TEAM_NOT_FOUND" } });
      expect(missing.connection.close).toHaveBeenCalledWith(4004);
      expect(missing.registrations.listening(createTeamRootExecutionIdentity("team-run-root"))).toBe(0);
    });
  });

  describe("DS-15: the user's input to a member of a delegated team run whose Task is closed", () => {
    const closed = { accepted: false as const, code: "TASK_AGENT_RESOURCE_CLOSED" as const, message: "Your Task is DONE or CANCELLED, so you can't start new work." };
    const send = (id: string, extra: Record<string, unknown> = {}) => JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "Are you there?", context_file_paths: [],
      image_urls: [], agent_run_id: "nested-task-agent-run-001", message_id: `m-${id}`, dedupe_key: `d-${id}`, ...extra } });

    it("a stopped run is refused before it is restored: nothing registers, no snapshot or status follows, nothing is posted", async () => {
      const harness = createHarness({ stopped: true });
      harness.closedTasks.refusal.mockReturnValue(closed);
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      const before = sent(harness.connection).length;
      await harness.handler.handleMessage(sessionId!, send("1"));
      await harness.handler.handleMessage(sessionId!, send("2", { mentions: [{ kind: "agent", definition_id: "code-reviewer" }] }));
      const after = sent(harness.connection).slice(before);
      expect(after.map((message) => message.type)).toEqual(["ERROR", "ERROR"]);
      for (const message of after) {
        expect(message.payload).toMatchObject({ agent_run_id: "nested-task-agent-run-001", message: closed.message });
        expect(JSON.stringify(message)).toContain("TASK_AGENT_RESOURCE_CLOSED");
      }
      expect(harness.closedTasks.refusal).toHaveBeenCalledWith(createTeamRootExecutionIdentity("team-run-root"));
      expect(harness.teamRunService.resolveManagedTeamRun).not.toHaveBeenCalled();
      expect(harness.root.openViewSnapshotConnection).not.toHaveBeenCalled();
      expect(harness.executeAgentCommand).not.toHaveBeenCalled();
      expect(harness.teamRunService.recordRunActivity).not.toHaveBeenCalled();
    });

    it("a live run refuses the message and an approval; an interrupt still reaches it", async () => {
      const harness = createHarness();
      harness.closedTasks.refusal.mockReturnValue(closed);
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      await harness.handler.handleMessage(sessionId!, send("3"));
      expect(sent(harness.connection).at(-1)).toMatchObject({ type: "ERROR", payload: { message: closed.message } });
      expect(harness.executeAgentCommand).not.toHaveBeenCalled();
      await harness.handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { agent_run_id: "nested-task-agent-run-001", command_id: "c-i" } }));
      expect(harness.executeAgentCommand).toHaveBeenCalledWith("nested-task-agent-run-001", { kind: "interrupt" });
    });

    it("after the assigner reopens it, the user's message is posted", async () => {
      const harness = createHarness({ stopped: true });
      harness.closedTasks.refusal.mockReturnValue(closed);
      const sessionId = await harness.handler.connect(harness.connection, "team-run-root");
      sessions.push({ handler: harness.handler, id: sessionId! });
      harness.closedTasks.refusal.mockReturnValue(null);
      await harness.handler.handleMessage(sessionId!, send("4"));
      expect(harness.teamRunService.resolveManagedTeamRun).toHaveBeenCalledOnce();
      expect(harness.executeAgentCommand).toHaveBeenCalledWith("nested-task-agent-run-001", expect.objectContaining({ kind: "post_message" }));
    });
  });
});
