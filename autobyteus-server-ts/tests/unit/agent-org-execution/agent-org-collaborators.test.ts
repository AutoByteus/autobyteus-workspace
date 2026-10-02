import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { collaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { flushMicrotasks } from "./helpers/task-publication-handles.js";
import { admission, buildOrg, cleanupDirectories } from "./helpers/org-collaborator-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

describe("collaborators brought into an AgentOrg run with @", () => {
  it("admits mentions on SEND_MESSAGE, streams collaborator_added and posts the composed note", async () => {
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
    const added = wire.filter((message) => message.type === "ROOT_EXECUTION_EVENT" && message.payload.event.kind === "collaborator_added");
    expect(added).toHaveLength(1);
    const posted = f.handles.get("director")!.handle.postMessage.mock.calls[0]![0] as { content: string };
    expect(collaboratorMentionNote.parse(posted.content)?.collaborators).toEqual([{ name: "Product Team", kind: "agent_team", address: "/product_team" }]);
    const durable = await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId);
    expect(durable!.rootOrg.collaborators.map((entry) => entry.address)).toEqual(["/product_team"]);
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });

    await stream.handleMessage(session!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: f.root.rootRunId, target_agent_run_id: "director", command_id: "c2",
      content: "Ask the director", context_file_paths: [], image_urls: [], message_id: "m2", dedupe_key: "d2",
      mentions: [{ kind: "agent", definition_id: "definition-director" }],
    } }));
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: {
      state: "rejected", code: "COLLABORATOR_ADD_FAILED", collaborator_name: "Director", message: "Director is already in this run.",
    } });
  });

  it("hosts each collaborator once at admission, Offline, and reaches it by address (DI-001)", async () => {
    const f = await buildOrg();
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", mentions: [
      { kind: "agent", definitionId: "code-reviewer" }, { kind: "agent_team", definitionId: "product-team" },
    ] });
    const [reviewer, product] = f.owner.getExecutionTreeSnapshot().rootOrg.collaborators;
    if (reviewer?.kind !== "agent" || product?.kind !== "agent_team") throw new Error("collaborators were not added");
    // Hosted handles exist before any message; nothing has started.
    expect(f.rootAgents.get(reviewer.agentRunId)).not.toBeNull();
    expect(f.teams.get(product.teamRunId)?.isActive()).toBe(true);
    const offline = f.owner.getAgentStatusSnapshots().filter((snapshot) =>
      [reviewer.agentRunId, product.members[0]!.agentRunId].includes(snapshot.execution.agentRunId));
    expect(offline.map((snapshot) => snapshot.details.status)).toEqual(["offline", "offline"]);
    // send_message_to by address starts the collaborator Agent and delivers.
    const director = f.handles.get("director")!.input.identity;
    await expect(f.owner.deliverLogicalMessage(director, { recipientAddress: "/code_reviewer", content: "Please review" }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(reviewer.agentRunId)!.handle.reserveInput).toHaveBeenCalledTimes(1);
    // ...and a collaborator Team member, through its hosted TeamRun.
    await expect(f.owner.deliverLogicalMessage(director, { recipientAddress: "/product_team", content: "Design it" }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(product.members[0]!.agentRunId)!.handle.reserveInput).toHaveBeenCalledTimes(1);
    // Re-mention reuses the same instance.
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.collaborators).toHaveLength(2);
  });

  it("rejects an unrunnable mention without writing, hosting or posting anything", async () => {
    const f = await buildOrg({ runnable: false });
    const events: unknown[] = [];
    f.publisher.subscribe(({ event }) => events.push(event));
    const result = await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", mentions: [{ kind: "agent_team", definitionId: "product-team" }] });
    expect(result).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Product Team" });
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.collaborators).toEqual([]);
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.collaborators).toEqual([]);
    expect(f.teams.list().map((run) => run.teamRunId)).toEqual(["configured-team"]);
    expect(events).toEqual([]);
  });

  it("places extra copies by address: a mounted-Team member's copy of a top-level collaborator goes to the root (REQ-012)", async () => {
    const f = await buildOrg();
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "configured-lead", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] });
    const lead = { identity: createCollaborationMemberExecutionIdentity({ root: f.root, memberAddress: "/target/lead", agentRunId: "configured-lead" }) };
    const director = { identity: f.handles.get("director")!.input.identity };
    await expect(f.owner.delegateTask(lead, { recipient_address: "/code_reviewer", description: "Review" }))
      .resolves.toMatchObject({ target_agent_run_id: expect.any(String) });
    await expect(f.owner.delegateTask(director, { recipient_address: "/code_reviewer", description: "Review too" }))
      .resolves.toMatchObject({ target_agent_run_id: expect.any(String) });
    const tree = f.owner.getExecutionTreeSnapshot();
    const team = tree.rootOrg.members.find((member) => member.address === "/target")!;
    expect("teamRunId" in team && team.taskExecutions).toEqual([]);
    expect(tree.rootOrg.taskExecutions.map((task) => [task.address, task.delegatorAgentRunId]))
      .toEqual([["/code_reviewer", "configured-lead"], ["/code_reviewer", "director"]]);
  });

  it("offers nothing already in the Org and rejects unmentioned delegation with a reason", async () => {
    const f = await buildOrg();
    const policy = admission().policy;
    const listed = await policy.listCandidates(f.owner.collaboratorPort());
    expect(listed.candidates.map((candidate) => candidate.definitionId)).toEqual(["code-reviewer", "designer", "product-team"]);
    await f.owner.admitCollaboratorMentions({ focusedAgentRunId: "director", mentions: [{ kind: "agent_team", definitionId: "product-team" }] });
    // The Team and its member Agents are now in the run.
    expect((await policy.listCandidates(f.owner.collaboratorPort())).candidates.map((candidate) => candidate.definitionId)).toEqual(["code-reviewer"]);
    const director = { identity: f.handles.get("director")!.input.identity };
    await expect(f.owner.delegateTask(director, { recipient_address: "/marketing_team", description: "x" }))
      .resolves.toEqual({ target_agent_run_id: null, message: expect.stringContaining("is not a mounted Agent or Agent Team, a collaborator or an available agent") });
  });
});
