import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { describe, expect, it, vi } from "vitest";
import { AgentCollaborationStreamHandler } from "../../../../src/services/agent-streaming/agent-collaboration-stream-handler.js";
import { createAgentRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { delegatedChild, followTestChildRows } from "../../../helpers/child-rows-feed.js";

/**
 * The agent run's view stream (design DS-8): connecting never starts the run's agent; a local child row's command goes to
 * the child's own run (`DelegatedRunCommands`), a peer child's through the root to its node.
 */
const HOST = "host-run";
const host = { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" };

const fakeRoot = (hostLive = true) => ({
  rootIdentity: createAgentRootExecutionIdentity(HOST),
  ensureHostReady: vi.fn(async () => ({ runId: HOST })),
  isHostLive: () => hostLive,
  localChildren: { viewerAttached: () => undefined, viewerDetached: () => undefined }, remoteChildren: { viewerAttached: vi.fn(), viewerDetached: vi.fn(), refresh: vi.fn(async () => undefined) },
  openPackageSnapshotConnection: vi.fn(async () => ({
    snapshot: { host, createdAt: "2026-09-30T00:00:00.000Z", statuses: [] },
    baseChangeSequence: 0, liveSequenceId: "live-hub-1", lastMessageChangeSequence: 0,
    subscribe: vi.fn(() => () => undefined),
    close: vi.fn(),
  })),
  resolveCollaboratorMentions: vi.fn(async () => ({ admitted: true as const, launchNotes: [], collaborators: [{ name: "Code Reviewer", kind: "agent" as const, address: "/code_reviewer", presence: "not_in_run" as const }] })),
  // A peer child's command, through its node.
  executeAgentCommand: vi.fn(async () => ({ accepted: true })),
});

/** The child-command route: `child-run` is a local child; any other target is not this route's. */
const childCommands = () => ({ execute: vi.fn(async (_parent: unknown, target: string) => target === "child-run" ? { accepted: true } : null) });

const connect = async (roots: ConstructorParameters<typeof AgentCollaborationStreamHandler>[0], children = childCommands(), feed = followTestChildRows()) => {
  const wire: CollaborationStreamServerMessage[] = [];
  const close = vi.fn();
  const handler = new AgentCollaborationStreamHandler(roots, feed.feed, children as never);
  const sessionId = await handler.connect({ send: (raw) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close }, HOST);
  return { handler, sessionId, wire, close, children };
};

const send = (overrides: Record<string, unknown> = {}) => JSON.stringify({ type: "SEND_MESSAGE", payload: {
  root_subject_kind: "agent", root_run_id: HOST, target_agent_run_id: "child-run", command_id: "c1",
  content: "hello", context_file_paths: [], image_urls: [], message_id: "m1", dedupe_key: "d1", ...overrides,
} });

describe("AgentCollaborationStreamHandler", () => {
  it("resolves the run's root on connect without starting its agent, then sends the view snapshot (REQ-004)", async () => {
    const root = fakeRoot();
    const resolveRoot = vi.fn(async () => root as never);
    const { wire } = await connect({ resolveRoot, getActive: () => null });
    expect(resolveRoot).toHaveBeenCalledWith(HOST);
    expect(root.ensureHostReady).not.toHaveBeenCalled();
    expect(wire.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
    expect(wire[1]).toMatchObject({ payload: { root_subject_kind: "agent", root_run_id: HOST, root_agent: { is_active: true } } });
  });

  it("reports the agent's real state in the snapshot", async () => {
    const { wire } = await connect({ resolveRoot: async () => fakeRoot(false) as never, getActive: () => null });
    expect(wire[1]).toMatchObject({ payload: { root_agent: { is_active: false } } });
  });

  it("closes with AGENT_ROOT_UNAVAILABLE when the run is not a collaboration run or cannot be resolved", async () => {
    for (const [roots, message] of [
      [{ resolveRoot: vi.fn(async () => null), getActive: () => null }, `Agent run '${HOST}' is not a collaboration run.`],
      [{ resolveRoot: vi.fn(async () => { throw Object.assign(new Error("not found"), { code: "AGENT_ROOT_UNAVAILABLE" }); }), getActive: () => null }, "not found"],
    ] as const) {
      const { sessionId, wire, close } = await connect(roots as never);
      expect(sessionId).toBeNull();
      expect(wire).toEqual([{ type: "ERROR", payload: { code: "AGENT_ROOT_UNAVAILABLE", message } }]);
      expect(close).toHaveBeenCalledWith(4004);
    }
  });

  it("resolves mentions for the focused child and sends a local child's command to its own run (AR-011)", async () => {
    const root = fakeRoot();
    const { handler, sessionId, wire, children } = await connect({ resolveRoot: async () => root as never, getActive: () => root as never });
    await handler.handleMessage(sessionId!, send({ mentions: [{ kind: "agent", definition_id: "code-reviewer" }] }));
    expect(root.resolveCollaboratorMentions).toHaveBeenCalledWith({ focusedAgentRunId: "child-run", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    expect(children.execute).toHaveBeenCalledWith(root.rootIdentity, "child-run", expect.objectContaining({ kind: "post_message",
      message: expect.objectContaining({ content: expect.stringMatching(/^hello\n\n\[Mentioned agents\]\n- Code Reviewer \(agent\) at \/code_reviewer: delegate the task to it/) }) }));
    expect(root.executeAgentCommand).not.toHaveBeenCalled();
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { root_subject_kind: "agent", state: "accepted" } });

    await handler.handleMessage(sessionId!, send({ root_subject_kind: "agent_org", command_id: "c3" }));
    expect(wire.at(-1)).toMatchObject({ payload: { state: "failed", code: "AGENT_ROOT_COMMAND_FAILED" } });
  });

  it("sends a peer child's command through the root, and never starts the agent for a child's command", async () => {
    const root = fakeRoot(false);
    const { handler, sessionId, wire } = await connect({ resolveRoot: async () => root as never, getActive: () => root as never });
    await handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: {
      root_subject_kind: "agent", root_run_id: HOST, target_agent_run_id: "peer-run", command_id: "c2",
    } }));
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_type: "INTERRUPT_GENERATION", state: "accepted" } });
    expect(root.executeAgentCommand).toHaveBeenCalledWith("peer-run", { kind: "interrupt" });
    expect(root.ensureHostReady).not.toHaveBeenCalled();
  });

  it("sends pending reply text before a projection-failure ERROR, then closes (autobyteus-139)", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const root = { ...fakeRoot(), openPackageSnapshotConnection: vi.fn(async () => ({
      snapshot: { host, createdAt: "2026-09-30T00:00:00.000Z", statuses: [] },
      baseChangeSequence: 0, liveSequenceId: "live-hub-1", lastMessageChangeSequence: 0,
      subscribe: vi.fn((next: (event: unknown) => void) => { listener = next; return () => undefined; }),
      close: vi.fn(),
    })) };
    const { wire, close } = await connect({ resolveRoot: async () => root as never, getActive: () => root as never });
    listener!({ changeSequence: 1, event: { kind: "agent_presentation", execution: { memberAddress: "/helper", agentRunId: "child-run" },
      message: { type: "SEGMENT_CONTENT", payload: { segment_id: "s-1", turn_id: "t-1", segment_type: "text", delta: "partial" } } } });
    expect(wire).toHaveLength(3);
    listener!({ changeSequence: 2, event: { kind: "agent_presentation", execution: { memberAddress: "/helper", agentRunId: "child-run" },
      message: { type: "NOT_A_MESSAGE" } } });
    expect(wire.slice(3)).toMatchObject([
      { type: "ROOT_EXECUTION_EVENT", payload: { change_sequence: 1, change_sequence_through: 1, event: { kind: "agent_presentation_batch" } } },
      { type: "ERROR", payload: { code: "AGENT_ROOT_STREAM_PROJECTION_FAILED" } },
    ]);
    await Promise.resolve();
    expect(close).toHaveBeenCalledWith(1011);
  });

  it("autobyteus-461 SR-042 … SR-044: an open view gets each child-row change, unsequenced, after its snapshot, even when its agent is not live", async () => {
    const feed = followTestChildRows();
    try {
      const root = fakeRoot(false);
      const hostRun = createAgentRootExecutionIdentity(HOST);
      // A delegation committed while the snapshot is being built: held, then sent right after it.
      root.openPackageSnapshotConnection.mockImplementationOnce(async () => {
        feed.report({ run: hostRun, added: [delegatedChild("writer")], removed: [] });
        await feed.settled();
        return { snapshot: { host, createdAt: "2026-09-30T00:00:00.000Z", statuses: [] }, baseChangeSequence: 0, liveSequenceId: "live-hub-1",
          lastMessageChangeSequence: 0, subscribe: vi.fn(() => () => undefined), close: vi.fn() };
      });
      const { handler, sessionId, wire } = await connect({ resolveRoot: async () => root as never, getActive: () => null }, childCommands(), feed);
      expect(wire.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "CHILD_RUNS_CHANGED", "ROOT_LIFECYCLE"]);
      // SR-045: the lifecycle frame is the run's agent's own state; a stopped run's view keeps its stream.
      expect(wire[3]).toMatchObject({ payload: { is_active: false } });
      expect(wire[2]).toEqual({ type: "CHILD_RUNS_CHANGED", payload: { root_subject_kind: "agent", root_run_id: HOST,
        event: { kind: "child_runs_changed", run_id: HOST, added: [expect.objectContaining({ agentRunId: "writer", address: "/writer" })], removed: [] } } });
      feed.report({ run: hostRun, added: [], removed: [{ agentRunId: "writer" }] });
      feed.report({ run: createAgentRootExecutionIdentity("another-run"), added: [delegatedChild("other")], removed: [] });
      await feed.settled();
      expect(wire.at(-1)).toMatchObject({ type: "CHILD_RUNS_CHANGED", payload: { event: { added: [], removed: [{ agentRunId: "writer" }] } } });
      expect(wire).toHaveLength(5);
      expect(root.ensureHostReady).not.toHaveBeenCalled();
      handler.disconnect(sessionId!);
      feed.report({ run: hostRun, added: [delegatedChild("late")], removed: [] });
      await feed.settled();
      expect(wire).toHaveLength(5);
    } finally {
      feed.release();
    }
  });
});

