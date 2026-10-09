import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgTaskSourceResolver } from "../../../src/agent-org-execution/services/agent-org-task-source-resolver.js";
import type { TaskTeamExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { flushMicrotasks } from "./helpers/task-publication-handles.js";
import { buildOrg, cleanupDirectories } from "./helpers/org-collaborator-harness.js";

afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });

type Org = Awaited<ReturnType<typeof buildOrg>>;
const identity = (f: Org, memberAddress: string, agentRunId: string) =>
  createCollaborationMemberExecutionIdentity({ root: f.root, memberAddress, agentRunId });
const receiversOf = (f: Org) => f.owner.getCommunicationSnapshot().messages.map((message) => message.receiverAgentRunId);
const memberRun = (copy: TaskTeamExecution, address: string) => {
  const member = copy.members.find((candidate) => candidate.address === address);
  if (!member || !("agentRunId" in member)) throw new Error(`no ${address}`);
  return member.agentRunId;
};

describe("agent-initiated collaborators and team instances in an AgentOrg", () => {
  it("gives a closed Team copy a follow-up Task by its team run ID; its coordinator gets B's work from the delegator (AC-002)", async () => {
    const f = await buildOrg();
    const director = identity(f, "/director", "director");
    const first = await f.owner.delegateToNewCopy({ identity: director }, { recipient_address: "/target", description: "Copy one" });
    await flushMicrotasks();
    const [copy] = f.owner.getExecutionTreeSnapshot().rootOrg.taskExecutions as TaskTeamExecution[];
    const lead = memberRun(copy!, "/target/lead");
    expect(first).toEqual({ delegated: true, copy: { kind: "team", teamRunId: copy!.teamRunId, teamCoordinatorAgentRunId: lead }, taskId: "ad_hoc_task_1" });
    expect(f.owner.teamCoordinatorOf(copy!.teamRunId)).toBe(lead);
    await f.owner.releaseTaskExecutions(f.resources.close("ad_hoc_task_1"));
    f.resources.addTask("task-B", "Polish the copy");
    expect(await f.owner.assignToExistingCopy({ identity: director }, { copy: { teamRunId: copy!.teamRunId }, taskId: "task-B" }))
      .toEqual({ delegated: true, copy: { kind: "team", teamRunId: copy!.teamRunId, teamCoordinatorAgentRunId: lead } });
    const work = f.owner.getCommunicationSnapshot().messages.at(-1)!;
    expect(work).toEqual(expect.objectContaining({ senderAgentRunId: "director", receiverAgentRunId: lead, messageType: "task_assignment",
      content: expect.stringContaining("New Task assigned to you: task-B.") }));
    expect(f.resources.entry({ teamRunId: copy!.teamRunId })).toMatchObject({ taskId: "task-B", open: true, start: "started" });
  });

  it("a copy of a mounted Team reaches its own members, not the mounted Team's (REQ-007 behavior change)", async () => {
    const f = await buildOrg();
    const director = identity(f, "/director", "director");
    await f.owner.delegateToNewCopy({ identity: director }, { recipient_address: "/target", description: "Copy one" });
    await f.owner.delegateToNewCopy({ identity: director }, { recipient_address: "/target", description: "Copy two" });
    await flushMicrotasks();
    const [one, two] = f.owner.getExecutionTreeSnapshot().rootOrg.taskExecutions as TaskTeamExecution[];
    expect(one!.source).toBeUndefined(); // copies of a mounted Team keep reading the configured source
    await expect(f.owner.deliverLogicalMessage(identity(f, "/target/lead", memberRun(one!, "/target/lead")), { recipientAddress: "/target/writer", content: "Write it" }))
      .resolves.toMatchObject({ accepted: true });
    await expect(f.owner.deliverLogicalMessage(identity(f, "/target/lead", memberRun(two!, "/target/lead")), { recipientAddress: "/target/writer", content: "Write it too" }))
      .resolves.toMatchObject({ accepted: true });
    // The mounted Team's configured handoff is unchanged.
    await expect(f.owner.deliverLogicalMessage(identity(f, "/target/lead", "configured-lead"), { recipientAddress: "/target/writer", content: "Mounted" }))
      .resolves.toMatchObject({ accepted: true });
    expect(receiversOf(f)).toEqual([memberRun(one!, "/target/writer"), memberRun(two!, "/target/writer"), "configured-writer"]);
    // Outside the copy's Team, addresses resolve run-wide as before.
    await expect(f.owner.deliverLogicalMessage(identity(f, "/target/lead", memberRun(one!, "/target/lead")), { recipientAddress: "/director", content: "Done" }))
      .resolves.toMatchObject({ accepted: true });
    expect(receiversOf(f).at(-1)).toBe("director");
    // AR-003: no fall-through inside the copy.
    await expect(f.owner.deliverLogicalMessage(identity(f, "/target/lead", memberRun(one!, "/target/lead")), { recipientAddress: "/target/nobody", content: "?" }))
      .rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
  });

  it("lists, brings in on the first message and reuses the instance (AC-002, AC-004)", async () => {
    const f = await buildOrg();
    const director = identity(f, "/director", "director");
    await expect(f.owner.listAvailableAgents(director)).resolves.toEqual([
      { name: "Director", kind: "agent", address: "/director", description: "d" },
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", description: "Reviews" },
      { name: "Designer", kind: "agent", address: "/designer", description: "Designs" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product" },
    ]);
    const results = await Promise.all([
      f.owner.deliverLogicalMessage(director, { recipientAddress: "/code_reviewer", content: "one" }),
      f.owner.deliverLogicalMessage(director, { recipientAddress: "/code_reviewer", content: "two" }),
    ]);
    expect(results).toEqual([expect.objectContaining({ accepted: true }), expect.objectContaining({ accepted: true })]);
    const collaborators = f.owner.getExecutionTreeSnapshot().rootOrg.collaborators;
    expect(collaborators).toEqual([expect.objectContaining({ kind: "agent", address: "/code_reviewer", addedViaAgentRunId: "director" })]);
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.collaborators).toEqual(collaborators);
  });

  it("a failed add returns COLLABORATOR_ADD_FAILED and writes nothing", async () => {
    const f = await buildOrg({ runnable: false });
    await expect(f.owner.deliverLogicalMessage(identity(f, "/director", "director"), { recipientAddress: "/product_team", content: "x" }))
      .resolves.toMatchObject({ accepted: false, code: "COLLABORATOR_ADD_FAILED" });
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.collaborators).toEqual([]);
  });

  it("catalog copies record their source and add no collaborator; a mounted-Team member's catalog copy goes to the root (AC-005, AC-006, AC-013)", async () => {
    const f = await buildOrg();
    const lead = identity(f, "/target/lead", "configured-lead");
    await expect(f.owner.delegateToNewCopy({ identity: lead }, { recipient_address: "/product_team", description: "Design" }))
      .resolves.toMatchObject({ delegated: true });
    await expect(f.owner.delegateToNewCopy({ identity: identity(f, "/director", "director") }, { recipient_address: "/code_reviewer", description: "Review" }))
      .resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    const tree = f.owner.getExecutionTreeSnapshot();
    expect(tree.rootOrg.collaborators).toEqual([]);
    const mounted = tree.rootOrg.members.find((member) => member.address === "/target")!;
    expect("teamRunId" in mounted && mounted.taskExecutions).toEqual([]);
    const [copy, reviewer] = tree.rootOrg.taskExecutions as TaskTeamExecution[];
    expect(copy).toMatchObject({ address: "/product_team", delegatorAgentRunId: "configured-lead", source: { kind: "agent_team", teamDefinitionId: "product-team" } });
    expect(reviewer).toEqual(expect.objectContaining({ address: "/code_reviewer", source: expect.objectContaining({ agentDefinitionId: "code-reviewer" }) }));
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.taskExecutions).toEqual(tree.rootOrg.taskExecutions);
    // Restore reads the recorded source first.
    const sources = new AgentOrgTaskSourceResolver(() => f.owner.getExecutionTreeSnapshot());
    expect(sources.require(copy!.address, "agent_team", copy!.source)).toMatchObject({
      node: { address: "/product_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/designer" },
    });
    expect(() => sources.require(copy!.address, "agent_team")).toThrow("is not configured or a collaborator");
  });

  it("places copies by address from inside a mounted Team: teammate under the Team, Org-level placement at the root (REQ-012, AC-013)", async () => {
    const f = await buildOrg();
    const lead = { identity: identity(f, "/target/lead", "configured-lead") };
    await f.owner.delegateToNewCopy(lead, { recipient_address: "/target/writer", description: "Draft" });
    await f.owner.delegateToNewCopy(lead, { recipient_address: "/director", description: "Decide" });
    await flushMicrotasks();
    const tree = f.owner.getExecutionTreeSnapshot();
    const mounted = tree.rootOrg.members.find((member) => member.address === "/target")!;
    expect("teamRunId" in mounted && mounted.taskExecutions.map((task) => [task.address, task.delegatorAgentRunId]))
      .toEqual([["/target/writer", "configured-lead"]]);
    expect(tree.rootOrg.taskExecutions.map((task) => [task.address, task.delegatorAgentRunId])).toEqual([["/director", "configured-lead"]]);
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.taskExecutions).toEqual(tree.rootOrg.taskExecutions);
  });
});
