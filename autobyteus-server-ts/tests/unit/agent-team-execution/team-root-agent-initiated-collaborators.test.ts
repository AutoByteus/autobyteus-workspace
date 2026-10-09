import { afterEach, describe, expect, it, vi } from "vitest";
import { ingressOfOutcome } from "../../fixtures/task-execution-resource-fixtures.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
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

describe("agent-initiated collaborators in a Team root", () => {
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

  it("a first send_message_to brings a listed Team in (Offline, then started) and later messages reach it (AC-004, AC-010)", async () => {
    const f = await harness();
    const events: TeamRunEvent[] = [];
    f.root.subscribeToEvents(({ event }) => events.push(event));
    await expect(f.message(coordinatorOf(f), "/product_team", "Design it")).resolves.toMatchObject({ accepted: true });
    const [product] = f.root.getExecutionTreeSnapshot().rootTeam.collaborators;
    expect(product).toMatchObject({ kind: "agent_team", address: "/product_team", addedViaAgentRunId: "run-coordinator" });
    if (product?.kind !== "agent_team") throw new Error("not added");
    expect(events.filter((event) => event.eventSourceType === TeamRunEventSourceType.COLLABORATOR)).toHaveLength(1);
    expect((await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!.rootTeam.collaborators).toEqual([product]);
    const lead = f.handles.get(product.members[0]!.agentRunId)!;
    expect(lead.handle.reserveInput).toHaveBeenCalledOnce();
    // The same instance again by address; `@` resolves to its address and adds nothing.
    await expect(f.message(coordinatorOf(f), "/product_team", "More")).resolves.toMatchObject({ accepted: true });
    expect(lead.handle.reserveInput).toHaveBeenCalledTimes(2);
    await expect(f.root.resolveCollaboratorMentions({ focusedAgentRunId: "run-coordinator", mentions: [{ kind: "agent_team", definitionId: "product-team" }] }))
      .resolves.toEqual({ admitted: true, collaborators: [{ name: "Product Team", kind: "agent_team", address: "/product_team", presence: "in_run" }] });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toHaveLength(1);
  });

  it("two concurrent first messages produce one instance", async () => {
    const f = await harness();
    const results = await Promise.all([
      f.message(coordinatorOf(f), "/code_reviewer", "one"),
      f.message(coordinatorOf(f), "/code_reviewer", "two"),
    ]);
    expect(results).toEqual([expect.objectContaining({ accepted: true }), expect.objectContaining({ accepted: true })]);
    const collaborators = f.root.getExecutionTreeSnapshot().rootTeam.collaborators;
    expect(collaborators).toHaveLength(1);
    expect(f.handles.get((collaborators[0] as { agentRunId: string }).agentRunId)!.handle.reserveInput).toHaveBeenCalledTimes(2);
  });

  it("a failing add returns COLLABORATOR_ADD_FAILED and adds nothing; a run ID or unknown address creates nothing", async () => {
    const f = await harness({ runnable: false });
    await expect(f.message(coordinatorOf(f), "/product_team", "Design it")).resolves.toMatchObject({
      accepted: false, code: "COLLABORATOR_ADD_FAILED", message: expect.stringContaining("Product Team could not be added"),
    });
    await expect(f.root.deliverExactAgentMessage({
      sender: { kind: "agent", identity: coordinatorOf(f), displayName: "coordinator" }, targetAgentRunId: "nope", content: "x",
    })).resolves.toMatchObject({ accepted: false, code: "TARGET_AGENT_RUN_NOT_FOUND" });
    await expect(f.message(coordinatorOf(f), "/no_such_team", "x")).rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toEqual([]);
    expect((await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!.rootTeam.collaborators).toEqual([]);
    expect(f.handles.size).toBe(0);
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
      .toEqual({ delegated: false, message: `${lead} is the coordinator of Team copy ${copy!.teamRunId}; use target_team_run_id "${copy!.teamRunId}".` });
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
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toEqual([]);
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
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toEqual([]);
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

  it("a copy member and a collaborator member can each delegate to and bring in a listed agent (AC-006)", async () => {
    const f = await harness();
    // A catalog copy's member delegates to another catalog definition.
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

    // A collaborator Team member brings a listed agent in.
    await f.message(coordinatorOf(f), "/product_team", "Start");
    const [product] = f.root.getExecutionTreeSnapshot().rootTeam.collaborators;
    if (product?.kind !== "agent_team") throw new Error("not added");
    const lead = f.identity("/product_team/lead", product.members[0]!.agentRunId);
    await expect(f.message(lead, "/code_reviewer", "Review the UI")).resolves.toMatchObject({ accepted: true });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators.map((entry) => [entry.address, entry.addedViaAgentRunId]))
      .toEqual([["/product_team", "run-coordinator"], ["/code_reviewer", product.members[0]!.agentRunId]]);
  });
});
