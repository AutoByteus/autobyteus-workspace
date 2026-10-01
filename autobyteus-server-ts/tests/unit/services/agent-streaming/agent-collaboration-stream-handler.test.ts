import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { describe, expect, it, vi } from "vitest";
import { AgentCollaborationStreamHandler } from "../../../../src/services/agent-streaming/agent-collaboration-stream-handler.js";
import { emptyAgentRunCollaborationMessages, emptyAgentRunCollaborationTree } from "../../../../src/agent-run-collaboration/domain/agent-run-collaboration-tree.js";

const HOST = "host-run";
const tree = emptyAgentRunCollaborationTree({
  host: { address: "/assistant" as never, agentRunId: HOST, agentDefinitionId: "assistant" },
  createdAt: "2026-09-30T00:00:00.000Z",
});

const fakeRoot = () => ({
  getExecutionTreeSnapshot: () => tree,
  openPackageSnapshotConnection: vi.fn(async () => ({
    snapshot: { tree, messages: emptyAgentRunCollaborationMessages(HOST), statuses: [] },
    baseChangeSequence: 0,
    subscribe: vi.fn(() => () => undefined),
    close: vi.fn(),
  })),
  admitCollaboratorMentions: vi.fn(async () => ({ admitted: true as const, collaborators: [{ name: "Code Reviewer", kind: "agent" as const, address: "/code_reviewer" }] })),
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
  it("makes the root command-ready on connect and sends the Agent-root snapshot", async () => {
    const root = fakeRoot();
    const resolveCommandReadyRoot = vi.fn(async () => root as never);
    const { wire } = await connect({ resolveCommandReadyRoot, getActive: () => root as never });
    expect(resolveCommandReadyRoot).toHaveBeenCalledWith(HOST);
    expect(wire.map((message) => message.type)).toEqual(["CONNECTED", "ROOT_EXECUTION_VIEW_SNAPSHOT", "ROOT_LIFECYCLE"]);
    expect(wire[1]).toMatchObject({ payload: { root_subject_kind: "agent", root_run_id: HOST, root_agent: { is_active: true } } });
  });

  it("closes with AGENT_ROOT_UNAVAILABLE when the run cannot host collaborators", async () => {
    const { sessionId, wire, close } = await connect({
      resolveCommandReadyRoot: vi.fn(async () => { throw Object.assign(new Error("cannot host"), { code: "AGENT_ROOT_UNAVAILABLE" }); }),
      getActive: () => null,
    });
    expect(sessionId).toBeNull();
    expect(wire).toEqual([{ type: "ERROR", payload: { code: "AGENT_ROOT_UNAVAILABLE", message: "cannot host" } }]);
    expect(close).toHaveBeenCalledWith(4004);
  });

  it("admits mentions for the focused child, posts the composed content, and rejects host targets and wrong roots", async () => {
    const root = fakeRoot();
    const { handler, sessionId, wire } = await connect({ resolveCommandReadyRoot: async () => root as never, getActive: () => root as never });
    await handler.handleMessage(sessionId!, send({ mentions: [{ kind: "agent", definition_id: "code-reviewer" }] }));
    expect(root.admitCollaboratorMentions).toHaveBeenCalledWith({ focusedAgentRunId: "child-run", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    expect(root.executeAgentCommand).toHaveBeenCalledWith("child-run", expect.objectContaining({ kind: "post_message", message: expect.objectContaining({ content: expect.stringMatching(/^hello\n\n\[Mentioned collaborators\]\n- Code Reviewer \(Agent\) at \/code_reviewer\n/) }) }));
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { root_subject_kind: "agent", state: "accepted" } });

    await handler.handleMessage(sessionId!, send({ target_agent_run_id: HOST, command_id: "c2" }));
    expect(wire.at(-1)).toMatchObject({ payload: { state: "rejected", code: "AGENT_ROOT_HOST_COMMAND_REJECTED" } });

    await handler.handleMessage(sessionId!, send({ root_subject_kind: "agent_org", command_id: "c3" }));
    expect(wire.at(-1)).toMatchObject({ payload: { state: "failed", code: "AGENT_ROOT_COMMAND_FAILED" } });
  });
});
