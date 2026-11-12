import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { describe, expect, it, vi } from "vitest";
import { AgentCollaborationStreamHandler } from "../../../../src/services/agent-streaming/agent-collaboration-stream-handler.js";
import { createAgentRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { delegatedChild, followTestChildRows } from "../../../helpers/child-rows-feed.js";

/**
 * The agent run's view stream (design DS-8; autobyteus-461 SR-061 … SR-063): connecting never starts the run's agent; the
 * view is in base's shapes, from the run's one `RunViewStream`: a snapshot with its rows read at its base, then every
 * frame after it in order (base's row events with their records). A delegated run is reached by its own stream; a peer
 * run's command goes through the root to its node.
 */
const HOST = "host-run";
const host = { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" };
const createdAt = "2026-09-30T00:00:00.000Z";

const fakeRoot = (feed: ReturnType<typeof followTestChildRows>, hostLive = true) => {
  const identity = createAgentRootExecutionIdentity(HOST);
  const stream = feed.streams.streamOf(identity);
  return {
    rootIdentity: identity,
    ensureHostReady: vi.fn(async () => ({ runId: HOST })),
    isHostLive: () => hostLive,
    remoteChildren: { viewerAttached: vi.fn(), viewerDetached: vi.fn(), refresh: vi.fn(async () => undefined) },
    // The run's view stream's snapshot connection, as the root opens it (SR-063): the rows at the base, then its own parts.
    openViewSnapshotConnection: vi.fn((atBase: () => unknown, read: (own: unknown, rows: unknown) => unknown) =>
      stream.openSnapshotConnection(() => { const rows = atBase(); return read({ host, createdAt, statuses: [] }, rows); })),
    resolveCollaboratorMentions: vi.fn(async () => ({ admitted: true as const, launchNotes: [], collaborators: [{ name: "Code Reviewer", kind: "agent" as const, address: "/code_reviewer", presence: "not_in_run" as const }] })),
    executeAgentCommand: vi.fn(async () => ({ accepted: true })),
    stream,
  };
};

const connect = async (roots: ConstructorParameters<typeof AgentCollaborationStreamHandler>[0], feed: ReturnType<typeof followTestChildRows>) => {
  const wire: CollaborationStreamServerMessage[] = [];
  const close = vi.fn();
  const handler = new AgentCollaborationStreamHandler(roots, feed.rows);
  const sessionId = await handler.connect({ send: (raw) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close }, HOST);
  return { handler, sessionId, wire, close };
};

const send = (overrides: Record<string, unknown> = {}) => JSON.stringify({ type: "SEND_MESSAGE", payload: {
  root_subject_kind: "agent", root_run_id: HOST, target_agent_run_id: "peer-run", command_id: "c1",
  content: "hello", context_file_paths: [], image_urls: [], message_id: "m1", dedupe_key: "d1", ...overrides,
} });

describe("AgentCollaborationStreamHandler", () => {
  it("resolves the run's root on connect without starting its agent, then sends the view snapshot in base's shape (REQ-004)", async () => {
    const feed = followTestChildRows();
    const root = fakeRoot(feed);
    const resolveRoot = vi.fn(async () => root as never);
    const { wire } = await connect({ resolveRoot, getActive: () => null }, feed);
    expect(resolveRoot).toHaveBeenCalledWith(HOST);
    expect(root.ensureHostReady).not.toHaveBeenCalled();
    expect(wire.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
    expect(wire[1]).toMatchObject({ payload: { root_subject_kind: "agent", root_run_id: HOST,
      root_agent: { is_active: true, closed_task_executions: [], live_sequence_id: root.stream.liveSequenceId } } });
  });

  it("reports the agent's real state in the snapshot", async () => {
    const feed = followTestChildRows();
    const { wire } = await connect({ resolveRoot: async () => fakeRoot(feed, false) as never, getActive: () => null }, feed);
    expect(wire[1]).toMatchObject({ payload: { root_agent: { is_active: false } } });
  });

  it("closes with AGENT_ROOT_UNAVAILABLE when the run is not a collaboration run or cannot be resolved", async () => {
    for (const [roots, message] of [
      [{ resolveRoot: vi.fn(async () => null), getActive: () => null }, `Agent run '${HOST}' is not a collaboration run.`],
      [{ resolveRoot: vi.fn(async () => { throw Object.assign(new Error("not found"), { code: "AGENT_ROOT_UNAVAILABLE" }); }), getActive: () => null }, "not found"],
    ] as const) {
      const { sessionId, wire, close } = await connect(roots as never, followTestChildRows());
      expect(sessionId).toBeNull();
      expect(wire).toEqual([{ type: "ERROR", payload: { code: "AGENT_ROOT_UNAVAILABLE", message } }]);
      expect(close).toHaveBeenCalledWith(4004);
    }
  });

  it("a peer run's command goes through the root, its mentions resolved there (autobyteus-278); nothing starts the agent", async () => {
    const feed = followTestChildRows();
    const root = fakeRoot(feed, false);
    const { handler, sessionId, wire } = await connect({ resolveRoot: async () => root as never, getActive: () => root as never }, feed);
    await handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: {
      root_subject_kind: "agent", root_run_id: HOST, target_agent_run_id: "peer-run", command_id: "c2",
    } }));
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_type: "INTERRUPT_GENERATION", state: "accepted" } });
    expect(root.executeAgentCommand).toHaveBeenCalledWith("peer-run", { kind: "interrupt" });
    await handler.handleMessage(sessionId!, send({ mentions: [{ kind: "agent", definition_id: "code-reviewer" }] }));
    expect(root.resolveCollaboratorMentions).toHaveBeenCalledWith({ focusedAgentRunId: "peer-run", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    expect(root.executeAgentCommand).toHaveBeenLastCalledWith("peer-run", expect.objectContaining({ kind: "post_message",
      message: expect.objectContaining({ content: expect.stringMatching(/^hello\n\n\[Mentioned agents\]\n- Code Reviewer \(agent\) at \/code_reviewer/) }) }));
    expect(root.ensureHostReady).not.toHaveBeenCalled();
    await handler.handleMessage(sessionId!, send({ root_subject_kind: "agent_org", command_id: "c3" }));
    expect(wire.at(-1)).toMatchObject({ payload: { state: "failed", code: "AGENT_ROOT_COMMAND_FAILED" } });
  });

  it("autobyteus-461 SR-061 … SR-063: a delegation is base's task_execution_started in the run's sequence, with its record; a closure is task_executions_closed", async () => {
    const feed = followTestChildRows();
    const root = fakeRoot(feed, false);
    const hostRun = createAgentRootExecutionIdentity(HOST);
    const { handler, sessionId, wire } = await connect({ resolveRoot: async () => root as never, getActive: () => null }, feed);
    feed.report({ run: hostRun, added: [delegatedChild("writer")], removed: [] });
    feed.report({ run: createAgentRootExecutionIdentity("another-run"), added: [delegatedChild("other")], removed: [] });
    await feed.settled();
    expect(wire.at(-1)).toMatchObject({ type: "ROOT_EXECUTION_EVENT", payload: { change_sequence: 1,
      event: { kind: "task_execution_started", host_kind: "root", host_run_id: HOST, execution: { agentRunId: "writer", address: "/writer" } } } });
    feed.report({ run: hostRun, added: [], removed: [{ agentRunId: "writer" }] });
    await feed.settled();
    expect(wire.at(-1)).toMatchObject({ type: "ROOT_EXECUTION_EVENT", payload: { change_sequence: 2,
      event: { kind: "task_executions_closed", task_executions: [{ agentRunId: "writer" }] } } });
    expect(wire).toHaveLength(5);
    handler.disconnect(sessionId!);
    feed.report({ run: hostRun, added: [delegatedChild("late")], removed: [] });
    await feed.settled();
    expect(wire).toHaveLength(5);
  });

  it("a row reported while the snapshot is read is in the snapshot or after it, never both (SR-063)", async () => {
    const feed = followTestChildRows();
    const root = fakeRoot(feed);
    const hostRun = createAgentRootExecutionIdentity(HOST);
    root.openViewSnapshotConnection.mockImplementationOnce((atBase, read) => root.stream.openSnapshotConnection(async () => {
      const rows = atBase();
      // A delegation committed while the run's own parts are read: after the base, so a frame after the snapshot.
      feed.report({ run: hostRun, added: [delegatedChild("writer")], removed: [] });
      return read({ host, createdAt, statuses: [] }, rows);
    }));
    const { wire } = await connect({ resolveRoot: async () => root as never, getActive: () => null }, feed);
    await feed.settled();
    const snapshot = wire.find((message) => message.type === "ROOT_EXECUTION_VIEW_SNAPSHOT");
    expect(snapshot).toMatchObject({ payload: { root_agent: { base_change_sequence: 0, execution_tree: { taskExecutions: [] } } } });
    expect(wire.filter((message) => message.type === "ROOT_EXECUTION_EVENT")).toEqual([expect.objectContaining({ payload: expect.objectContaining({
      change_sequence: 1, event: expect.objectContaining({ kind: "task_execution_started" }) }) })]);
  });
});
