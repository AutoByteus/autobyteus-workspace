import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { projectTaskExecutionSource } from "../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
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

describe("agent-initiated delegation, messaging and team instances in an AgentOrg", () => {
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
    // A copy of a mounted Team records the Team's snapshot when it starts (D-1, D-5, D-6).
    expect(one!.source).toMatchObject({ kind: "agent_team", coordinatorAddress: "/target/lead", defaultLaunchSource: { origin: "configured", fallbacks: [] } });
    expect(one!.source.members.every((member) => member.followsTeam)).toBe(true);
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

  it("lists the catalog and never creates a run for send_message_to: an outside address is not found with delegate_task guidance (AC-005)", async () => {
    const f = await buildOrg();
    const director = identity(f, "/director", "director");
    await expect(f.owner.listAvailableAgents(director)).resolves.toEqual([
      { name: "Director", kind: "agent", address: "/director", description: "d" },
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", description: "Reviews" },
      { name: "Designer", kind: "agent", address: "/designer", description: "Designs" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", description: "Product" },
    ]);
    for (const address of ["/code_reviewer", "/product_team"]) {
      await expect(f.owner.deliverLogicalMessage(director, { recipientAddress: address, content: "one" }))
        .rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND", message: expect.stringContaining("delegate_task") });
    }
    expect(f.teams.list().map((run) => run.teamRunId)).toEqual(["configured-team"]);
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.taskExecutions).toEqual([]);
    expect(f.owner.getCommunicationSnapshot().messages).toEqual([]);
  });

  it("catalog copies record their source; a mounted-Team member's catalog copy goes to the root (AC-005, AC-006, AC-013)", async () => {
    const f = await buildOrg();
    const lead = identity(f, "/target/lead", "configured-lead");
    await expect(f.owner.delegateToNewCopy({ identity: lead }, { recipient_address: "/product_team", description: "Design" }))
      .resolves.toMatchObject({ delegated: true });
    await expect(f.owner.delegateToNewCopy({ identity: identity(f, "/director", "director") }, { recipient_address: "/code_reviewer", description: "Review" }))
      .resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    const tree = f.owner.getExecutionTreeSnapshot();
    const mounted = tree.rootOrg.members.find((member) => member.address === "/target")!;
    expect("teamRunId" in mounted && mounted.taskExecutions).toEqual([]);
    const [copy, reviewer] = tree.rootOrg.taskExecutions as TaskTeamExecution[];
    expect(copy).toMatchObject({ address: "/product_team", delegatorAgentRunId: "configured-lead", source: { kind: "agent_team", teamDefinitionId: "product-team" } });
    expect(reviewer).toEqual(expect.objectContaining({ address: "/code_reviewer", source: expect.objectContaining({ agentDefinitionId: "code-reviewer" }) }));
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.taskExecutions).toEqual(tree.rootOrg.taskExecutions);
    // Restore projects only the recorded source.
    expect(projectTaskExecutionSource(copy!.address, copy!.source)).toMatchObject({
      node: { address: "/product_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/designer" },
    });
  });

  it("places a copy from inside a mounted Team at the root and refuses the Team's own addresses at any depth (REQ-012, AC-003, DEC-008)", async () => {
    const f = await buildOrg();
    const lead = { identity: identity(f, "/target/lead", "configured-lead") };
    for (const own of ["/target/writer", "/target", "/target/lead"]) {
      await expect(f.owner.delegateToNewCopy(lead, { recipient_address: own, description: "Draft" }))
        .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED", message: expect.stringContaining("send_message_to") });
    }
    await expect(f.owner.delegateToNewCopy(lead, { recipient_address: "/director", description: "Decide" })).resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    const tree = f.owner.getExecutionTreeSnapshot();
    const mounted = tree.rootOrg.members.find((member) => member.address === "/target")!;
    expect("teamRunId" in mounted && mounted.taskExecutions).toEqual([]);
    expect(tree.rootOrg.taskExecutions.map((task) => [task.address, task.delegatorAgentRunId])).toEqual([["/director", "configured-lead"]]);
    // A copy of a configured placement records the placement's snapshot as it is now (D-1, D-6).
    const director = tree.rootOrg.members.find((member) => member.address === "/director")!;
    expect(tree.rootOrg.taskExecutions[0]!.source).toEqual({ kind: "agent", agentDefinitionId: (director as { agentDefinitionId: string }).agentDefinitionId,
      launchConfiguration: (director as { launchConfiguration: unknown }).launchConfiguration, launchSource: { origin: "configured", fallbacks: [] } });
    expect((await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!.rootOrg.taskExecutions).toEqual(tree.rootOrg.taskExecutions);
  });

  it("allows delegating to a Team the sender does not belong to, and refuses a delegated copy's own sub-team addresses (AC-003, DEC-008)", async () => {
    const f = await buildOrg();
    const director = { identity: identity(f, "/director", "director") };
    await expect(f.owner.delegateToNewCopy(director, { recipient_address: "/target", description: "Own-team work" })).resolves.toMatchObject({ delegated: true });
    await expect(f.owner.delegateToNewCopy(director, { recipient_address: "/target/writer", description: "Writer work" })).resolves.toMatchObject({ delegated: true });
    await flushMicrotasks();
    const [copy] = f.owner.getExecutionTreeSnapshot().rootOrg.taskExecutions as TaskTeamExecution[];
    const copyLead = { identity: identity(f, "/target/lead", memberRun(copy!, "/target/lead")) };
    // Inside its own copy instance: refused before any placement.
    await expect(f.owner.delegateToNewCopy(copyLead, { recipient_address: "/target/writer", description: "again" }))
      .rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    expect(f.owner.getExecutionTreeSnapshot().rootOrg.taskExecutions).toHaveLength(2);
  });
});
