import { afterEach, describe, expect, it, vi } from "vitest";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { ingressOfOutcome } from "../../fixtures/task-execution-resource-fixtures.js";
import type { TaskTeamExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { AgentConversationActivityInspector } from "../../../src/agent-memory/services/agent-conversation-activity-inspector.js";
import { ROOT, cleanupDirectories, harness } from "./helpers/team-root-collaborator-harness.js";

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupDirectories();
});

type Harness = Awaited<ReturnType<typeof harness>>;
const coordinatorOf = (f: Harness) => f.identity("/coordinator", "run-coordinator");
const copiesOf = (f: Harness, root = f.root) => root.getExecutionTreeSnapshot().rootTeam.taskExecutions as TaskTeamExecution[];
const memberOf = (copy: TaskTeamExecution, address: string) => {
  const member = copy.members.find((candidate) => candidate.address === address);
  if (!member || !("agentRunId" in member)) throw new Error(`no member ${address}`);
  return member.agentRunId;
};

describe("delegation and messaging in a Team root (CM-1, CM-4)", () => {
  it("lists eligible definitions with addresses and never writes (AC-002, AR-005)", async () => {
    const f = await harness();
    const before = await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT);
    await expect(f.root.listAvailableAgents(coordinatorOf(f))).resolves.toEqual([
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", description: "Reviews" },
      { name: "Lead", kind: "agent", address: "/lead", description: "Leads" },
      { name: "Designer", kind: "agent", address: "/designer", description: "Designs" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product" },
    ]);
    expect(await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT)).toEqual(before);
  });

  it("a message to a catalog address that is not in the run is not found and creates nothing (CM-4, AC-005)", async () => {
    const f = await harness();
    const before = await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT);
    await expect(f.message(coordinatorOf(f), "/product_team", "Design it")).rejects.toMatchObject({
      code: "COLLABORATION_TARGET_NOT_FOUND",
      message: "No agent or agent team you can talk with has the address /product_team. To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender run ID. To have a task done by a new agent, use delegate_task.",
    });
    await expect(f.message(coordinatorOf(f), "/code_reviewer", "Review")).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
    // A run ID or unknown run creates nothing either.
    await expect(f.root.deliverExactAgentMessage({
      sender: { kind: "agent", identity: coordinatorOf(f), displayName: "coordinator" }, targetAgentRunId: "nope", content: "x",
    })).resolves.toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND" });
    expect(await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT)).toEqual(before);
    expect(f.handles.size).toBe(0);
  });

  it("delegating to yourself or a teammate is refused with send_message_to guidance; no copy, no Task link (CM-1, AC-001)", async () => {
    const f = await harness({ withTeammate: true });
    const resources = f.dependencies.taskExecutionResources;
    const before = await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT);
    await expect(f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/worker", description: "Do it" }))
      .rejects.toMatchObject({
        code: "COLLABORATION_SELF_TARGET_REJECTED",
        message: "/worker is in your own team; you can't delegate to it. Talk with it using send_message_to.",
      });
    await expect(f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/coordinator", description: "Do it" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    await flushMicrotasks();
    expect(await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT)).toEqual(before);
    expect(f.handles.size).toBe(0);
    expect((resources as unknown as { adHocTaskIds?(): string[] }).adHocTaskIds?.() ?? []).toEqual([]);
    // The teammate is reached by message instead.
    await expect(f.message(coordinatorOf(f), "/worker", "Please help")).resolves.toMatchObject({ accepted: true });
  });

  it("`@` is decided for the coordinator: a teammate is marked \"in your team\" and not offered delegate_task; a catalog unit is offered delegate_task (AC-006)", async () => {
    const f = await harness({ withTeammate: true, teammateDefinitionId: "designer" });
    const result = await f.root.resolveCollaboratorMentions({
      focusedAgentRunId: "run-coordinator",
      mentions: [{ kind: "agent", definitionId: "designer" }, { kind: "agent", definitionId: "code-reviewer" }],
    });
    expect(result).toMatchObject({ admitted: true, collaborators: [
      { name: "Designer", address: "/worker", presence: "own_team" },
      { name: "Code Reviewer", address: "/code_reviewer", presence: "not_in_run" },
    ] });
    const note = composeCollaboratorMentionNote("ask", result.admitted ? result.collaborators : []);
    expect(note).toContain("- Designer (agent) at /worker, in your team: talk with it using send_message_to; don't delegate to it.");
    expect(note).toContain("- Code Reviewer (agent) at /code_reviewer: delegate the task to it with delegate_task; it returns a run ID to follow up with.");
  });

  it("a configured root-Team member may still delegate to an independent catalog unit (CM-2, AC-004)", async () => {
    const f = await harness({ withTeammate: true });
    await expect(f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build" }))
      .resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    expect(copiesOf(f)).toHaveLength(1);
  });

  it("gives a closed Team copy a follow-up Task by its team run ID; its coordinator gets B's work from the delegator (AC-002, REQ-002/003)", async () => {
    const f = await harness();
    vi.spyOn(AgentConversationActivityInspector.prototype, "inspect").mockReturnValue({ kind: "present" } as never);
    const resources = f.dependencies.taskExecutionResources;
    const first = await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    await flushMicrotasks();
    expect(first).toMatchObject({ delegated: true, copy: { kind: "team" } });
    const [copy] = copiesOf(f);
    const lead = memberOf(copy!, "/product_team/lead");
    expect(first).toEqual({ delegated: true, copy: { kind: "team", teamRunId: copy!.teamRunId, teamCoordinatorAgentRunId: lead }, taskId: "ad_hoc_task_1" });
    expect(f.root.teamCoordinatorOf(copy!.teamRunId)).toBe(lead);
    expect(f.root.teamCoordinatorOf(lead)).toBeNull();
    await f.root.releaseTaskExecutions(resources.close("ad_hoc_task_1"));
    resources.addTask("task-B", "Clean up the page");
    // The coordinator's agent run ID is not the copy's ID.
    expect(await f.root.assignToExistingCopy({ identity: coordinatorOf(f) }, { copy: { agentRunId: lead }, taskId: "task-B" }))
      .toEqual({ delegated: false, message: `${lead} is the coordinator of task agent team ${copy!.teamRunId}; use target_team_run_id "${copy!.teamRunId}".` });
    expect(await f.root.assignToExistingCopy({ identity: coordinatorOf(f) }, { copy: { teamRunId: copy!.teamRunId }, taskId: "task-B" }))
      .toEqual({ delegated: true, copy: { kind: "team", teamRunId: copy!.teamRunId, teamCoordinatorAgentRunId: lead } });
    expect(resources.entry({ teamRunId: copy!.teamRunId })).toMatchObject({ taskId: "task-B", open: true, start: "started" });
    const messages = (await f.dependencies.communicationStore.read(f.teamMemoryDir, ROOT))!.messages;
    expect(messages.at(-1)).toEqual(expect.objectContaining({ senderAgentRunId: "run-coordinator", receiverAgentRunId: lead, messageType: "task_assignment",
      content: expect.stringContaining("New Task assigned to you: task-B.") }));
  });

  it("delegates parallel catalog copies with a source and no collaborator; each copy is one unit (AC-005, AC-007)", async () => {
    const f = await harness();
    const delegate = () => f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    const started = [await delegate(), await delegate(), await delegate()];
    await flushMicrotasks();
    const copies = copiesOf(f);
    expect(copies).toHaveLength(3);
    expect(new Set(started.map((result) => ingressOfOutcome(result))).size).toBe(3);
    expect(copies.map((copy) => copy.source)).toEqual(Array(3).fill(expect.objectContaining({
      kind: "agent_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/lead",
    })));
    expect((await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!.rootTeam.taskExecutions).toEqual(copies);
    // Only each copy's lead starts (with the delegated work); its designer stays unstarted.
    for (const copy of copies) {
      expect(f.handles.get(memberOf(copy, "/product_team/lead"))!.handle.postMessage).toHaveBeenCalledOnce();
      expect(f.handles.has(memberOf(copy, "/product_team/designer"))).toBe(false);
    }

    // Each copy's lead hands off to its own designer; the copies never cross.
    for (const copy of copies.slice(0, 2)) {
      const lead = f.identity("/product_team/lead", memberOf(copy, "/product_team/lead"));
      await expect(f.message(lead, "/product_team/designer", "UI please")).resolves.toMatchObject({ accepted: true });
      expect(f.handles.get(memberOf(copy, "/product_team/designer"))!.handle.reserveInput).toHaveBeenCalledOnce();
    }
    expect(f.handles.has(memberOf(copies[2]!, "/product_team/designer"))).toBe(false);
    // AR-003: an address inside the copy without a member is not found, never run-wide or catalog.
    await expect(f.message(f.identity("/product_team/lead", memberOf(copies[0]!, "/product_team/lead")), "/product_team/nobody", "x"))
      .rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
  });

  it("a member of a delegated Team copy may not delegate to its teammate or its own Team copy (CM-1, AC-002)", async () => {
    const f = await harness();
    await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    await flushMicrotasks();
    const [copy] = copiesOf(f);
    const lead = f.identity("/product_team/lead", memberOf(copy!, "/product_team/lead"));
    await expect(f.root.delegateToNewCopy({ identity: lead }, { recipient_address: "/product_team/designer", description: "x" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    await expect(f.root.delegateToNewCopy({ identity: lead }, { recipient_address: "/product_team", description: "x" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    await expect(f.root.delegateToNewCopy({ identity: lead }, { recipient_address: "/product_team/lead", description: "x" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    expect(copiesOf(f)).toHaveLength(1);
  });

  it("restores a catalog copy from its recorded source after Stop and reopen", async () => {
    const f = await harness();
    vi.spyOn(AgentConversationActivityInspector.prototype, "inspect").mockReturnValue({ kind: "present" } as never);
    await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    await flushMicrotasks();
    const [copy] = copiesOf(f);
    const leadRunId = memberOf(copy!, "/product_team/lead");
    // CR-001: the catalog copy's members get the copy's own handoffs and Team instruction.
    const ownScope = {
      authoredEnclosingScopeInstruction: "Ship the product UI.",
      collaboration: expect.objectContaining({
        outgoingHandoffs: [{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }],
      }),
    };
    expect(f.handles.get(leadRunId)!.input.memberExecutionContext).toMatchObject(ownScope);
    await expect(f.root.terminate()).resolves.toMatchObject({ accepted: true });
    const reopened = await f.reopen();
    expect(copiesOf(f, reopened)).toEqual([copy]);
    await expect(reopened.deliverExactAgentMessage({
      sender: { kind: "agent", identity: coordinatorOf(f), displayName: "coordinator" }, targetAgentRunId: leadRunId, content: "Status?",
    })).resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(leadRunId)!.input.activationMode).toBe("restore");
    // ...and keep them after Stop → reopen → message.
    expect(f.handles.get(leadRunId)!.input.memberExecutionContext).toMatchObject(ownScope);
    await reopened.terminate();
  });

  it("a catalog copy's agent delegates to another unit; the delegator is recorded (AC-006)", async () => {
    const f = await harness();
    // A catalog copy delegates to another catalog definition.
    await f.root.delegateToNewCopy({ identity: coordinatorOf(f) }, { recipient_address: "/designer", description: "Sketch" });
    await flushMicrotasks();
    const designerCopy = f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions[0] as { agentRunId: string; source?: unknown };
    expect(designerCopy.source).toMatchObject({ kind: "agent", agentDefinitionId: "designer" });
    // CR-001: a catalog Agent copy is not a root-Team member: no handoffs, no root-Team instruction.
    expect(f.handles.get(designerCopy.agentRunId)!.input.memberExecutionContext).toMatchObject({
      authoredEnclosingScopeInstruction: null, collaboration: expect.objectContaining({ outgoingHandoffs: [] }),
    });
    const copyIdentity = f.identity("/designer", designerCopy.agentRunId);
    await expect(f.root.delegateToNewCopy({ identity: copyIdentity }, { recipient_address: "/lead", description: "Plan" }))
      .resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    expect(f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions.map((task) => [task.address, task.delegatorAgentRunId]))
      .toEqual([["/designer", "run-coordinator"], ["/lead", designerCopy.agentRunId]]);
    // The copy may not delegate to itself.
    await expect(f.root.delegateToNewCopy({ identity: copyIdentity }, { recipient_address: "/designer", description: "x" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
  });
});
