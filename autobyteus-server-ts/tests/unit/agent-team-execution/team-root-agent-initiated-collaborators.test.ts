import { afterEach, describe, expect, it, vi } from "vitest";
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
    // The same instance again, by address and by `@`.
    await expect(f.message(coordinatorOf(f), "/product_team", "More")).resolves.toMatchObject({ accepted: true });
    expect(lead.handle.reserveInput).toHaveBeenCalledTimes(2);
    await expect(f.root.admitCollaboratorMentions({ focusedAgentRunId: "run-coordinator", mentions: [{ kind: "agent_team", definitionId: "product-team" }] }))
      .resolves.toEqual({ admitted: true, collaborators: [{ name: "Product Team", kind: "agent_team", address: "/product_team" }] });
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

  it("delegates parallel catalog copies with a source and no collaborator; each copy is one unit (AC-005, AC-007)", async () => {
    const f = await harness();
    const delegate = () => f.root.delegateTask({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    const started = [await delegate(), await delegate(), await delegate()];
    await flushMicrotasks();
    const copies = copiesOf(f);
    expect(copies).toHaveLength(3);
    expect(new Set(started.map((result) => result.target_agent_run_id)).size).toBe(3);
    expect(copies.map((copy) => copy.source)).toEqual(Array(3).fill(expect.objectContaining({
      kind: "agent_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/lead",
    })));
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toEqual([]);
    expect((await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!.rootTeam.taskExecutions).toEqual(copies);

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
    await f.root.delegateTask({ identity: coordinatorOf(f) }, { recipient_address: "/product_team", description: "Build a page" });
    await flushMicrotasks();
    const [copy] = copiesOf(f);
    const leadRunId = memberOf(copy!, "/product_team/lead");
    await expect(f.root.terminate()).resolves.toMatchObject({ accepted: true });
    const reopened = await f.reopen();
    expect(copiesOf(f, reopened)).toEqual([copy]);
    await expect(reopened.deliverExactAgentMessage({
      sender: { kind: "agent", identity: coordinatorOf(f), displayName: "coordinator" }, targetAgentRunId: leadRunId, content: "Status?",
    })).resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(leadRunId)!.input.activationMode).toBe("restore");
    await reopened.terminate();
  });

  it("a copy member and a collaborator member can each delegate to and bring in a listed agent (AC-006)", async () => {
    const f = await harness();
    // A catalog copy's member delegates to another catalog definition.
    await f.root.delegateTask({ identity: coordinatorOf(f) }, { recipient_address: "/designer", description: "Sketch" });
    await flushMicrotasks();
    const designerCopy = f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions[0] as { agentRunId: string; source?: unknown };
    expect(designerCopy.source).toMatchObject({ kind: "agent", agentDefinitionId: "designer" });
    const copyIdentity = f.identity("/designer", designerCopy.agentRunId);
    await expect(f.root.delegateTask({ identity: copyIdentity }, { recipient_address: "/lead", description: "Plan" }))
      .resolves.toMatchObject({ target_agent_run_id: expect.any(String) });
    await flushMicrotasks();
    expect(f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions.map((task) => [task.address, task.delegatorAgentRunId]))
      .toEqual([["/designer", "run-coordinator"], ["/lead", designerCopy.agentRunId]]);

    // A collaborator Team member brings a listed agent in.
    await f.root.admitCollaboratorMentions({ focusedAgentRunId: "run-coordinator", mentions: [{ kind: "agent_team", definitionId: "product-team" }] });
    const [product] = f.root.getExecutionTreeSnapshot().rootTeam.collaborators;
    if (product?.kind !== "agent_team") throw new Error("not added");
    await f.message(coordinatorOf(f), "/product_team", "Start");
    const lead = f.identity("/product_team/lead", product.members[0]!.agentRunId);
    await expect(f.message(lead, "/code_reviewer", "Review the UI")).resolves.toMatchObject({ accepted: true });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators.map((entry) => [entry.address, entry.addedViaAgentRunId]))
      .toEqual([["/product_team", "run-coordinator"], ["/code_reviewer", product.members[0]!.agentRunId]]);
  });
});
