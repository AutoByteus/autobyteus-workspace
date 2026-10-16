import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { collaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { flushMicrotasks } from "./helpers/task-publication-handles.js";
import { buildOrg, cleanupDirectories } from "./helpers/org-collaborator-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

describe("`@` mentions of an AgentOrg run", () => {
  it("resolves mentions on SEND_MESSAGE without adding anything and posts the note steering to delegate_task", async () => {
    const f = await buildOrg();
    const wire: CollaborationStreamServerMessage[] = [];
    const stream = new AgentOrgStreamHandler({ getActive: () => f.owner, recordRunActivity: vi.fn() });
    const session = await stream.connect({ send: (raw) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close: vi.fn() }, f.root.rootRunId);
    await stream.handleMessage(session!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: f.root.rootRunId, target_agent_run_id: "director", command_id: "c1",
      content: "Ask @Product Team", context_file_paths: [], image_urls: [], message_id: "m1", dedupe_key: "d1",
      mentions: [{ kind: "agent_team", definition_id: "product-team" }],
    } }));
    await flushMicrotasks();
    // REQ-001: no collaborator is added at send time.
    const added = wire.filter((message) => message.type === "ROOT_EXECUTION_EVENT" && message.payload.event.kind === "collaborator_added");
    expect(added).toHaveLength(0);
    const posted = f.handles.get("director")!.handle.postMessage.mock.calls[0]![0] as { content: string };
    expect(collaboratorMentionNote.parse(posted.content)?.collaborators).toEqual([{ name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" }]);
    // REQ-002: the note tells the focused agent to delegate to the address.
    expect(posted.content).toMatch(/\n- Product Team \(agent team\) at \/product_team: delegate the task to it with delegate_task; it returns a run id to follow up with\.$/);
    expect(posted.content).not.toMatch(/create_or_update_task|update_task|task_id/);
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.taskExecutions).toEqual([]);
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });

    await stream.handleMessage(session!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: f.root.rootRunId, target_agent_run_id: "director", command_id: "c2",
      content: "Ask the director", context_file_paths: [], image_urls: [], message_id: "m2", dedupe_key: "d2",
      mentions: [{ kind: "agent", definition_id: "definition-director" }],
    } }));
    // The focused agent mentioning itself is accepted and marked "that is you" (viewer relation, REQ-008).
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });
    const second = f.handles.get("director")!.handle.postMessage.mock.calls[1]![0] as { content: string };
    expect(collaboratorMentionNote.parse(second.content)?.collaborators).toEqual([{ name: "Director", kind: "agent", address: "/director", presence: "self" }]);
    expect(second.content).toMatch(/\n- Director \(agent\) at \/director: that is you\.$/);
  });
});
