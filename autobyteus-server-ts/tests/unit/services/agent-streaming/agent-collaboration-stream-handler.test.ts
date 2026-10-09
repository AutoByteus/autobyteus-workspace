import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { describe, expect, it, vi } from "vitest";
import { AgentCollaborationStreamHandler } from "../../../../src/services/agent-streaming/agent-collaboration-stream-handler.js";
import { emptyStandaloneRootMessages, emptyStandaloneRootTree } from "../../../../src/standalone-agent-run-root/domain/standalone-root-tree.js";

const HOST = "host-run";
const tree = emptyStandaloneRootTree({
  host: { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" },
  createdAt: "2026-09-30T00:00:00.000Z",
});

const fakeRoot = (hostLive = true) => ({
  ensureHostReady: vi.fn(async () => ({ runId: HOST })),
  isHostLive: () => hostLive,
  getExecutionTreeSnapshot: () => tree,
  openPackageSnapshotConnection: vi.fn(async () => ({
    snapshot: { tree, closedTaskExecutions: [], messages: emptyStandaloneRootMessages(HOST), statuses: [], inputStates: [] },
    baseChangeSequence: 0,
    subscribe: vi.fn(() => () => undefined),
    close: vi.fn(),
  })),
  resolveCollaboratorMentions: vi.fn(async () => ({ admitted: true as const, collaborators: [{ name: "Code Reviewer", kind: "agent" as const, address: "/code_reviewer", presence: "not_in_run" as const }] })),
  executeAgentCommand: vi.fn(async (agentRunId: string) => agentRunId === HOST
    ? { accepted: false, code: "AGENT_ROOT_HOST_COMMAND_REJECTED", message: "host" }
    : { accepted: true }),
});

const connect = async (roots: ConstructorParameters<typeof AgentCollaborationStreamHandler>[0]) => {
  const wire: CollaborationStreamServerMessage[] = [];
  const close = vi.fn();
  const handler = new AgentCollaborationStreamHandler(roots);
  const sessionId = await handler.connect({ send: (raw) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close }, HOST);
  return { handler, sessionId, wire, close };
};

const send = (overrides: Record<string, unknown> = {}) => JSON.stringify({ type: "SEND_MESSAGE", payload: {
  root_subject_kind: "agent", root_run_id: HOST, target_agent_run_id: "child-run", command_id: "c1",
  content: "hello", context_file_paths: [], image_urls: [], message_id: "m1", dedupe_key: "d1", ...overrides,
} });

describe("AgentCollaborationStreamHandler", () => {
  it("resolves the run's root and makes its host ready on connect, then sends the Agent-root snapshot (AR-001)", async () => {
    const root = fakeRoot();
    const resolveRoot = vi.fn(async () => root as never);
    const { wire } = await connect({ resolveRoot, getActive: () => null });
    expect(resolveRoot).toHaveBeenCalledWith(HOST);
    expect(root.ensureHostReady).toHaveBeenCalledOnce();
    expect(root.ensureHostReady.mock.invocationCallOrder[0]).toBeLessThan(root.openPackageSnapshotConnection.mock.invocationCallOrder[0]!);
    expect(wire.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
    expect(wire[1]).toMatchObject({ payload: { root_subject_kind: "agent", root_run_id: HOST, root_agent: { is_active: true } } });
  });

  it("reports the host's real state in the snapshot", async () => {
    const { wire } = await connect({ resolveRoot: async () => fakeRoot(false) as never, getActive: () => null });
    expect(wire[1]).toMatchObject({ payload: { root_agent: { is_active: false } } });
  });

  it("closes with AGENT_ROOT_UNAVAILABLE when the run cannot host collaborators or its host cannot be made ready", async () => {
    for (const [roots, message] of [
      [{ resolveRoot: vi.fn(async () => null), getActive: () => null }, `Agent run '${HOST}' cannot host collaborators.`],
      [{ resolveRoot: vi.fn(async () => { throw Object.assign(new Error("not found"), { code: "AGENT_ROOT_UNAVAILABLE" }); }), getActive: () => null }, "not found"],
      [{ resolveRoot: vi.fn(async () => ({ ...fakeRoot(), ensureHostReady: vi.fn(async () => { throw new Error("restore failed"); }) }) as never), getActive: () => null }, "restore failed"],
    ] as const) {
      const { sessionId, wire, close } = await connect(roots as never);
      expect(sessionId).toBeNull();
      expect(wire).toEqual([{ type: "ERROR", payload: { code: "AGENT_ROOT_UNAVAILABLE", message } }]);
      expect(close).toHaveBeenCalledWith(4004);
    }
  });

  it("resolves mentions for the focused child, posts the composed content, and rejects host targets and wrong roots", async () => {
    const root = fakeRoot();
    const { handler, sessionId, wire } = await connect({ resolveRoot: async () => root as never, getActive: () => root as never });
    await handler.handleMessage(sessionId!, send({ mentions: [{ kind: "agent", definition_id: "code-reviewer" }] }));
    expect(root.resolveCollaboratorMentions).toHaveBeenCalledWith({ focusedAgentRunId: "child-run", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    expect(root.executeAgentCommand).toHaveBeenCalledWith("child-run", expect.objectContaining({ kind: "post_message", message: expect.objectContaining({ content: expect.stringMatching(/^hello\n\n\[Mentioned collaborators\]\n- Code Reviewer \(Agent\) at \/code_reviewer\nDelegate the work with delegate_task to its address; /) }) }));
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { root_subject_kind: "agent", state: "accepted" } });

    await handler.handleMessage(sessionId!, send({ target_agent_run_id: HOST, command_id: "c2" }));
    expect(wire.at(-1)).toMatchObject({ payload: { state: "rejected", code: "AGENT_ROOT_HOST_COMMAND_REJECTED" } });

    await handler.handleMessage(sessionId!, send({ root_subject_kind: "agent_org", command_id: "c3" }));
    expect(wire.at(-1)).toMatchObject({ payload: { state: "failed", code: "AGENT_ROOT_COMMAND_FAILED" } });
  });

  it("takes child commands on the active root without restarting a crashed host (CR-001)", async () => {
    const root = fakeRoot(false);
    const { handler, sessionId, wire } = await connect({ resolveRoot: async () => root as never, getActive: () => root as never });
    root.ensureHostReady.mockClear();
    // The host crashed after connect: it must not be restored for a child's send or interrupt.
    root.ensureHostReady.mockImplementation(async () => { throw new Error("restore failed"); });

    await handler.handleMessage(sessionId!, send());
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_type: "SEND_MESSAGE", state: "accepted" } });
    await handler.handleMessage(sessionId!, JSON.stringify({ type: "INTERRUPT_GENERATION", payload: {
      root_subject_kind: "agent", root_run_id: HOST, target_agent_run_id: "child-run", command_id: "c2",
    } }));
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { command_type: "INTERRUPT_GENERATION", state: "accepted" } });

    expect(root.ensureHostReady).not.toHaveBeenCalled();
    expect(root.executeAgentCommand.mock.calls.map(([target, command]) => [target, (command as { kind: string }).kind]))
      .toEqual([["child-run", "post_message"], ["child-run", "interrupt"]]);
  });

  it("falls back to resolving the root and making its host ready only when no root is active", async () => {
    const root = fakeRoot();
    const resolveRoot = vi.fn(async () => root as never);
    let active: unknown = root;
    const { handler, sessionId, wire } = await connect({ resolveRoot, getActive: () => active as never });
    resolveRoot.mockClear();
    root.ensureHostReady.mockClear();

    active = null; // e.g. the root ended (Stop) while the stream stayed open
    await handler.handleMessage(sessionId!, send());
    expect(resolveRoot).toHaveBeenCalledWith(HOST);
    expect(root.ensureHostReady).toHaveBeenCalledOnce();
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });
  });
});
