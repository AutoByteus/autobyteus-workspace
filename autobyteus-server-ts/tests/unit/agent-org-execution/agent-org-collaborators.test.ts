import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { collaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { flushMicrotasks } from "./helpers/task-publication-handles.js";
import { admission, bringIn, buildOrg, cleanupDirectories } from "./helpers/org-collaborator-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

describe("`@` and collaborators of an AgentOrg run", () => {
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
    expect(posted.content).toMatch(/\nDelegate the work with delegate_task to its address; .*create_or_update_task.*DONE/);
    const durable = await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId);
    expect(durable!.rootOrg.collaborators).toEqual([]);
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });

    await stream.handleMessage(session!, JSON.stringify({ type: "SEND_MESSAGE", payload: {
      root_subject_kind: "agent_org", root_run_id: f.root.rootRunId, target_agent_run_id: "director", command_id: "c2",
      content: "Ask the director", context_file_paths: [], image_urls: [], message_id: "m2", dedupe_key: "d2",
      mentions: [{ kind: "agent", definition_id: "definition-director" }],
    } }));
    // A configured member is already in the Org: the mention is accepted, marked and addressed at its placement (REQ-002/003).
    expect(wire.at(-1)).toMatchObject({ type: "AGENT_COMMAND_ACK", payload: { state: "accepted" } });
    const second = f.handles.get("director")!.handle.postMessage.mock.calls[1]![0] as { content: string };
    expect(collaboratorMentionNote.parse(second.content)?.collaborators).toEqual([{ name: "Director", kind: "agent", address: "/director", presence: "in_run" }]);
    expect(second.content).toContain("\n- Director (Agent) at /director, already in this run\n");
    expect(second.content).toMatch(/messaged directly with send_message_to at its address, or use delegate_task for a separate copy\.$/);
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.collaborators).toEqual([]);
  });

  it("hosts each brought-in collaborator once, Offline, and reaches it by address (DI-001)", async () => {
    const f = await buildOrg();
    await bringIn(f.owner, "/code_reviewer", "director");
    await bringIn(f.owner, "/product_team", "director");
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
    // `@` resolves to the in-run address and adds nothing.
    await expect(f.owner.resolveCollaboratorMentions({ focusedAgentRunId: "director", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] }))
      .resolves.toEqual({ admitted: true, collaborators: [{ name: "Code Reviewer", kind: "agent", address: "/code_reviewer", presence: "in_run" }] });
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.collaborators).toHaveLength(2);
  });

  it("an unrunnable definition still resolves for `@` (delegation checks it); its bring-in fails without writing, hosting or publishing", async () => {
    const f = await buildOrg({ runnable: false });
    const events: unknown[] = [];
    f.publisher.subscribe(({ event }) => events.push(event));
    await expect(f.owner.resolveCollaboratorMentions({ focusedAgentRunId: "director", mentions: [{ kind: "agent_team", definitionId: "product-team" }] }))
      .resolves.toMatchObject({ admitted: true });
    const result = await bringIn(f.owner, "/product_team", "director");
    expect(result).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Product Team" });
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.collaborators).toEqual([]);
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.collaborators).toEqual([]);
    expect(f.teams.list().map((run) => run.teamRunId)).toEqual(["configured-team"]);
    expect(events).toEqual([]);
  });

  it("places extra copies by address: a mounted-Team member's copy of a top-level collaborator goes to the root (REQ-012)", async () => {
    const f = await buildOrg();
    await bringIn(f.owner, "/code_reviewer", "configured-lead");
    const lead = { identity: createCollaborationMemberExecutionIdentity({ root: f.root, memberAddress: "/target/lead", agentRunId: "configured-lead" }) };
    const director = { identity: f.handles.get("director")!.input.identity };
    await expect(f.owner.delegateToNewCopy(lead, { recipient_address: "/code_reviewer", description: "Review" }))
      .resolves.toMatchObject({ delegated: true });
    await expect(f.owner.delegateToNewCopy(director, { recipient_address: "/code_reviewer", description: "Review too" }))
      .resolves.toMatchObject({ delegated: true });
    const tree = f.owner.getExecutionTreeSnapshot();
    const team = tree.rootOrg.members.find((member) => member.address === "/target")!;
    expect("teamRunId" in team && team.taskExecutions).toEqual([]);
    expect(tree.rootOrg.taskExecutions.map((task) => [task.address, task.delegatorAgentRunId]))
      .toEqual([["/code_reviewer", "configured-lead"], ["/code_reviewer", "director"]]);
  });

  it("offers every eligible definition, in the Org or not, and rejects unmentioned delegation with a reason (REQ-001)", async () => {
    const f = await buildOrg();
    const policy = admission().policy;
    const listed = await policy.listCandidates(f.owner.collaboratorPort());
    expect(listed.candidates.map((candidate) => candidate.definitionId)).toEqual(["definition-director", "code-reviewer", "designer", "product-team"]);
    await bringIn(f.owner, "/product_team", "director");
    // The Team and its member Agents are now in the run, and still offered for `@`.
    expect((await policy.listCandidates(f.owner.collaboratorPort())).candidates.map((candidate) => candidate.definitionId))
      .toEqual(["definition-director", "code-reviewer", "designer", "product-team"]);
    const director = { identity: f.handles.get("director")!.input.identity };
    await expect(f.owner.delegateToNewCopy(director, { recipient_address: "/marketing_team", description: "x" }))
      .resolves.toEqual({ delegated: false, message: expect.stringContaining("is not a mounted Agent or Agent Team, a collaborator or an available agent") });
  });
});
