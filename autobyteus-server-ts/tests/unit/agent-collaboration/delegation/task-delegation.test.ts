import { describe, expect, it, vi } from "vitest";
import { TaskDelegation, type LocalDelegationPlacement } from "../../../../src/agent-collaboration/execution/task/task-delegation.js";
import { DelegationTree } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { DelegatedRunStartError } from "../../../../src/agent-collaboration/execution/delegation/delegated-run-starter.js";
import { createCollaborationMemberExecutionIdentity, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/** autobyteus-461 design DS-1 (`TaskDelegation`), contract §13.1 D1, D2, D5: a delegation creates an ordinary run and its Task entry. */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "project_task_manager_7c8d" };
const E: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "software_engineering_team_0218" };
const launch = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "sonnet", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/w" };
const agentPlacement: LocalDelegationPlacement = { kind: "agent", address: "/image_maker" as never,
  source: { kind: "agent", agentDefinitionId: "image-maker", launchConfiguration: launch }, launchNotes: ["note"] };
const teamPlacement: LocalDelegationPlacement = { kind: "agent_team", address: "/product_team" as never, coordinatorAddress: "/product_team/designer" as never,
  source: { kind: "agent_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/designer" as never, members: [], handoffs: [], defaultLaunchConfiguration: launch } };

const harness = () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationTree(() => tasks);
  tree.build();
  tasks.setEntriesListener(tree);
  const starter = { startAgent: vi.fn(async () => ({ agentRunId: "image_maker_33f0" })),
    startTeam: vi.fn(async () => ({ teamRunId: "product_team_e03d", coordinatorAddress: "/designer" as never, coordinatorAgentRunId: "designer_1", members: [] })) };
  const deliverWorkPacket = vi.fn(async () => ({ accepted: true }) as { accepted: boolean; code?: string; message?: string });
  const discard = vi.fn(async () => undefined);
  const recordCollaborating = vi.fn(async () => undefined);
  const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter, deliverWorkPacket, discard, recordCollaborating });
  const delegate = (senderRun: RootExecutionIdentity, sender: string, spawn: Record<string, unknown>, placement: LocalDelegationPlacement = agentPlacement) => delegation.toNewRun({
    sender: createCollaborationMemberExecutionIdentity({ root: senderRun, memberAddress: `/${sender}` as never, agentRunId: sender }),
    senderRun, delegatorAddress: null, spawn: spawn as never, resolvePlacement: async () => placement });
  return { tasks, tree, starter, deliverWorkPacket, discard, recordCollaborating, delegate };
};

describe("TaskDelegation.toNewRun", () => {
  it("D1: a sender with no Task assigns described work to a new Task with no Project; the run carries its origin; the entry, then the packet, then markStarted", async () => {
    const h = harness();
    const outcome = await h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", description: "Draw the logo." });
    expect(outcome).toEqual({ delegated: true, copy: { kind: "agent", agentRunId: "image_maker_33f0" }, taskId: "ad_hoc_task_1", launchNotes: ["note"] });
    expect(h.starter.startAgent).toHaveBeenCalledWith({ source: agentPlacement.source, address: "/image_maker",
      delegatedFrom: { delegatingRun: { kind: "agent", runId: M.rootRunId }, delegatorAgentRunId: M.rootRunId } });
    expect(h.tasks.entry({ agentRunId: "image_maker_33f0" })).toMatchObject({ taskId: "ad_hoc_task_1", role: "assigned", start: "started",
      recipientAddress: "/image_maker", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId } });
    expect(h.deliverWorkPacket).toHaveBeenCalledWith({ rootSubjectKind: "agent", rootRunId: "image_maker_33f0" },
      expect.objectContaining({ description: "Draw the logo.", referenceFiles: [] }));
    // The tree follows the record: the new run is under the manager.
    expect(h.tree.openChildrenOf(M).map((child) => child.run)).toEqual([{ agentRunId: "image_maker_33f0" }]);
    // The delegating agent run collaborates: its own address is fixed (contract §3.3, model.py delegate).
    expect(h.recordCollaborating).toHaveBeenCalledWith(M.rootRunId, `/${M.rootRunId}`);
  });

  it("a saved Task by task_id is assigned to the new team run, with its coordinator (D3-like)", async () => {
    const h = harness();
    h.tasks.addTask("project_task_440e", "Build it", "abc-1");
    const outcome = await h.delegate(M, M.rootRunId, { recipient_address: "/product_team", task_id: "abc-1" }, teamPlacement);
    expect(outcome).toEqual({ delegated: true, copy: { kind: "team", teamRunId: "product_team_e03d", teamCoordinatorAgentRunId: "designer_1" } });
    expect(h.tasks.entry({ teamRunId: "product_team_e03d" })).toMatchObject({ taskId: "project_task_440e", role: "assigned", teamCoordinatorAgentRunId: "designer_1" });
  });

  it("D5: a member of a run working on an open Task delegates sub-work of that Task; task_id is refused (CM-6)", async () => {
    const h = harness();
    h.tasks.addTask("T1");
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/software_engineering_team",
      delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId }, teamCoordinatorAgentRunId: "solution_designer_65a9" });
    await expect(h.delegate(E, "solution_designer_65a9", { recipient_address: "/product_team", task_id: "T1" }, teamPlacement))
      .resolves.toEqual({ delegated: false, message: expect.stringContaining("you can't use task_id") });
    const outcome = await h.delegate(E, "solution_designer_65a9", { recipient_address: "/product_team", description: "Design it." }, teamPlacement);
    expect(outcome).toMatchObject({ delegated: true });
    expect(outcome).not.toHaveProperty("taskId");
    expect(h.tasks.entry({ teamRunId: "product_team_e03d" })).toMatchObject({ taskId: "T1", role: "subWork",
      delegatedFrom: { delegatingRun: E, delegatorAgentRunId: "solution_designer_65a9" } });
    // A team run's address is its own file's (`/`): nothing to fix.
    expect(h.recordCollaborating).not.toHaveBeenCalled();
    // A closed Task: no new work.
    h.tasks.close("T1");
    await expect(h.delegate(E, "solution_designer_65a9", { recipient_address: "/image_maker", description: "More." }))
      .resolves.toEqual({ delegated: false, message: expect.stringContaining("DONE or CANCELLED") });
  });

  it("a link refused after the run was created ends the run; nothing else is written", async () => {
    const h = harness();
    h.tasks.addTask("T9");
    h.tasks.close("T9");
    await expect(h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", task_id: "T9" })).resolves.toMatchObject({ delegated: false });
    expect(h.starter.startAgent).not.toHaveBeenCalled(); // resolveAssignment refused first
    h.tasks.addTask("T10");
    h.tasks.beforeLinkCommit = () => { throw Object.assign(new Error("The Task was marked DONE."), { code: "TASK_AGENT_RESOURCE_CLOSED" }); };
    await expect(h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", task_id: "T10" }))
      .resolves.toEqual({ delegated: false, message: "The Task was marked DONE." });
    expect(h.discard).toHaveBeenCalledWith({ agentRunId: "image_maker_33f0" });
    expect(h.deliverWorkPacket).not.toHaveBeenCalled();
  });

  it("a work packet the new run does not accept marks the entry failed and ends the run", async () => {
    const h = harness();
    h.deliverWorkPacket.mockResolvedValueOnce({ accepted: false, code: "AGENT_ROOT_HOST_UNAVAILABLE", message: "The runtime is not available." });
    await expect(h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", description: "Draw." }))
      .resolves.toEqual({ delegated: false, message: "The runtime is not available." });
    expect(h.tasks.entry({ agentRunId: "image_maker_33f0" })).toMatchObject({ start: "failed" });
    expect(h.discard).toHaveBeenCalledWith({ agentRunId: "image_maker_33f0" });
  });

  it("a run that cannot be created is refused with the reason; no Task entry is written", async () => {
    const h = harness();
    h.starter.startAgent.mockRejectedValueOnce(new DelegatedRunStartError("No model is set."));
    await expect(h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", description: "Draw." }))
      .resolves.toEqual({ delegated: false, message: "No model is set." });
    expect(h.tasks.links).toEqual([]);
  });

  describe("toPeerRun (D8, contract §2.1 E3: the peer's run is recorded in its Task entry)", () => {
    const peer = { nodeId: "node-b-1f0e", name: "Studio B" };
    const placement = { kind: "remote_agent" as const, address: "/research_team" as never, peer, description: "Research it." };
    const channelWith = (started: unknown, delivered: unknown = { accepted: true, peerName: "Studio B" }) => ({
      startDelegatedRun: vi.fn(async () => started), deliverMessage: vi.fn(async () => delivered) });
    const peerHarness = (channel: ReturnType<typeof channelWith>) => {
      const tasks = new InMemoryTaskExecutionResources();
      const tree = new DelegationTree(() => tasks);
      tree.build();
      tasks.setEntriesListener(tree);
      const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter: {} as never, deliverWorkPacket: vi.fn(), discard: vi.fn(),
        channel: () => channel as never });
      const delegate = () => delegation.toPeerRun({ sender: createCollaborationMemberExecutionIdentity({ root: M, memberAddress: "/project_task_manager" as never, agentRunId: M.rootRunId }),
        senderRun: M, spawn: { recipient_address: "/research_team", description: "Research it." } as never, placement });
      return { tasks, tree, delegate };
    };

    it("a team on a peer: the entry holds nodeId, members and the address; the work packet goes to its coordinator; the result names the peer", async () => {
      const channel = channelWith({ accepted: true, kind: "agent_team", teamRunId: "research_team_77aa", coordinatorAddress: "/research_team/lead",
        members: [{ address: "/research_team/lead", agentRunId: "lead_0c11" }, { address: "/research_team/analyst", agentRunId: "analyst_5d20" }], launches: [] });
      const h = peerHarness(channel);
      const { outcome } = await h.delegate();
      expect(outcome).toEqual({ delegated: true, copy: { kind: "team", teamRunId: "research_team_77aa", teamCoordinatorAgentRunId: "lead_0c11" },
        node: "Studio B", taskId: "ad_hoc_task_1" });
      expect(channel.startDelegatedRun).toHaveBeenCalledWith(expect.objectContaining({ nodeId: "node-b-1f0e", address: "/research_team",
        delegatorAgentRunId: M.rootRunId, delegatingRun: { kind: "agent", runId: M.rootRunId } }));
      expect(h.tasks.entry({ teamRunId: "research_team_77aa" })).toMatchObject({ start: "started", recipientAddress: "/research_team", nodeId: "node-b-1f0e",
        members: [{ address: "/research_team/lead", agentRunId: "lead_0c11" }, { address: "/research_team/analyst", agentRunId: "analyst_5d20" }] });
      expect(channel.deliverMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: "work_packet", targetAgentRunId: "lead_0c11",
        targetRoot: { kind: "agent_team", runId: "research_team_77aa" } }));
      expect(await h.tree.runOfAgent("analyst_5d20")).toEqual({ rootSubjectKind: "agent_team", rootRunId: "research_team_77aa" });
    });

    it("a refusal by the peer writes nothing; a work packet the peer refuses marks the entry failed", async () => {
      const refusing = peerHarness(channelWith({ accepted: false, code: "AGENT_NOT_FOUND", message: "Nothing is at /research_team on Studio B." }));
      await expect(refusing.delegate()).resolves.toEqual({ outcome: { delegated: false, message: "Nothing is at /research_team on Studio B." }, launches: [] });
      expect(refusing.tasks.links).toEqual([]);
      const failing = peerHarness(channelWith({ accepted: true, kind: "agent", agentRunId: "remote_agent_1", launches: [] },
        { accepted: false, code: "PEER_UNREACHABLE", message: "Studio B did not answer." }));
      await expect(failing.delegate()).resolves.toMatchObject({ outcome: { delegated: false, message: "Studio B did not answer." } });
      expect(failing.tasks.entry({ agentRunId: "remote_agent_1" })).toMatchObject({ start: "failed", nodeId: "node-b-1f0e" });
    });
  });

  describe("toExistingRun (S8, DS-6: a follow-up Task by run ID)", () => {
    const followUp = async (deliverToRun = vi.fn(async () => ({ accepted: true }) as { accepted: boolean; code?: string; message?: string })) => {
      const tasks = new InMemoryTaskExecutionResources();
      const tree = new DelegationTree(() => tasks);
      tree.build();
      tasks.setEntriesListener(tree);
      tasks.addTask("T1", "Build it", "abc-1"); tasks.addTask("T2", "Polish it", "abc-2");
      await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/software_engineering_team",
        delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId }, teamCoordinatorAgentRunId: "solution_designer_65a9" });
      await tasks.markStarted({ teamRunId: E.rootRunId });
      const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter: {} as never, deliverWorkPacket: vi.fn(), discard: vi.fn(), deliverToRun });
      const give = (senderRun: RootExecutionIdentity, sender: string, copy: Record<string, string>, taskId = "abc-2") => delegation.toExistingRun({
        sender: createCollaborationMemberExecutionIdentity({ root: senderRun, memberAddress: `/${sender}` as never, agentRunId: sender }), senderRun,
        assign: { copy: copy as never, taskId } });
      return { tasks, tree, give, deliverToRun };
    };

    it("its assigner gives it a second Task: a new assigned entry with the same delegatedFrom and address; the work is a task_assignment message between the runs", async () => {
      const h = await followUp();
      await expect(h.give(M, M.rootRunId, { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: true,
        copy: { kind: "team", teamRunId: E.rootRunId, teamCoordinatorAgentRunId: "solution_designer_65a9" } });
      expect(h.tasks.assignments).toEqual([{ delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId },
        taskId: "T2", teamCoordinatorAgentRunId: "solution_designer_65a9" }]);
      expect(h.deliverToRun).toHaveBeenCalledWith(expect.objectContaining({ targetAgentRunId: "solution_designer_65a9", messageType: "task_assignment",
        content: expect.stringContaining("New Task assigned to you: abc-2.") }));
      expect(h.tasks.entry({ teamRunId: E.rootRunId })).toMatchObject({ taskId: "T2", start: "started", open: true });
      expect(h.tree.openTaskIdsOf({ teamRunId: E.rootRunId })).toEqual(["T1", "T2"]);
    });

    it("refusals keep today's texts: another agent than its last assigner, a sender that works on a Task, a run no Task names", async () => {
      const h = await followUp();
      await expect(h.give(M, "someone_else", { teamRunId: E.rootRunId })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("Only the agent that gave this task agent") });
      await expect(h.give(E, "solution_designer_65a9", { agentRunId: "anyone" })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("you can't use task_id") });
      await expect(h.give(M, M.rootRunId, { agentRunId: "never_delegated" })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("is not one of your task agents") });
      expect(h.tasks.assignments).toEqual([]);
      expect(h.deliverToRun).not.toHaveBeenCalled();
    });

    it("a work message that is not delivered marks the new entry failed and says what to do", async () => {
      const h = await followUp(vi.fn(async () => ({ accepted: false, code: "TARGET_RUN_NOT_AVAILABLE", message: "It could not be resumed." })));
      await expect(h.give(M, M.rootRunId, { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: false,
        message: expect.stringContaining("Task abc-2 was given to the task agent, but the message with its work was not delivered (It could not be resumed.)") });
      expect(h.tasks.entry({ teamRunId: E.rootRunId })).toMatchObject({ taskId: "T2", start: "failed" });
    });
  });
});
