import { toTaskDelegationToolErrorPayload } from "../../../../src/agent-tools/task-delegation/task-delegation-tool-serialization.js";
import type { RunOwnDelegation } from "../../../../src/agent-collaboration/execution/task/run-own-delegation.js";
import type { AgentConversationActivity } from "../../../../src/agent-memory/services/agent-conversation-activity-inspector.js";
import { NO_RUN_PARTS, readerOfAgents } from "../../../helpers/run-agents-reader.js";
import { describe, expect, it, vi } from "vitest";
import { acceptWorkPacketIfAllowed, TaskDelegation, type LocalDelegationPlacement, type WorkPacket } from "../../../../src/agent-collaboration/execution/task/task-delegation.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RunFilesReader } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
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
  source: { kind: "agent_team", teamDefinitionId: "product-team", coordinatorAddress: "/product_team/designer" as never, members: [], handoffs: [], defaultLaunchConfiguration: launch }, copiedFrom: "team_definition" };

const harness = (reader: RunFilesReader = NO_RUN_PARTS, fromDelegator: LocalDelegationPlacement | null = null) => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, reader);
  tree.build();
  tasks.setEntriesListener(tree);
  const starter = { startAgent: vi.fn(async () => ({ agentRunId: "image_maker_33f0" })),
    startTeam: vi.fn(async () => ({ teamRunId: "product_team_e03d", coordinatorAddress: "/designer" as never, coordinatorAgentRunId: "designer_1", members: [] })) };
  const deliverWorkPacket = vi.fn(async (_run: unknown, _packet: WorkPacket) => ({ accepted: true }) as { accepted: boolean; code?: string; message?: string });
  const discard = vi.fn(async () => undefined);
  const recordCollaborating = vi.fn(async () => undefined);
  const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter, deliverWorkPacket, discard, recordCollaborating,
    deliverToRun: vi.fn(async () => ({ accepted: true })), channel: () => null,
    reachingAddress: (sender, receiverRun) => tree.collaborationTreeOf(receiverRun).reachingAddressOf(sender), ownDelegations: { of: async () => null }, delegatorCatalog: { placementAt: vi.fn(async () => fromDelegator) }, conversationOf: async () => ({ entryAddress: "/entry", activity: { kind: "present" as const } }) });
  const folders: (string | null)[] = [];
  const delegate = (senderRun: RootExecutionIdentity, sender: string, spawn: Record<string, unknown>, placement: LocalDelegationPlacement | null = agentPlacement) => delegation.toNewRun({
    sender: createCollaborationMemberExecutionIdentity({ root: senderRun, memberAddress: `/${sender}` as never, agentRunId: sender }),
    senderRun, spawn: spawn as never, resolvePlacement: async (_work, folder) => {
      folders.push(folder);
      if (!placement) throw Object.assign(new Error(`'${String(spawn.recipient_address)}' is not the address of an available agent or agent team.`), { code: "COLLABORATION_TARGET_NOT_FOUND" });
      return placement;
    } });
  return { tasks, tree, starter, deliverWorkPacket, discard, recordCollaborating, delegate, folders };
};

/**
 * CR-461-031 (contract §2.5, §5.4.3 E-4): the work packet's sender address is the one the new run can reach the sender
 * by, from one owner (the receiver's collaboration tree, `reachingAddressOf`) for every delegator kind: the assigner's address when
 * the sender's run assigned the Task; the run ID only for sub-work of a Task another run assigned.
 */
describe("the work packet's sender address (CR-461-031)", () => {
  const ORG: RootExecutionIdentity = { rootSubjectKind: "agent_org", rootRunId: "org_5aa1" };
  const reader = readerOfAgents(async (run) => ({
    [M.rootRunId]: [{ agentRunId: M.rootRunId, address: `/${M.rootRunId}`, agentDefinitionId: null }],
    [E.rootRunId]: [{ agentRunId: "designer", address: "/designer", agentDefinitionId: null }],
    [ORG.rootRunId]: [{ agentRunId: "ceo", address: "/ceo", agentDefinitionId: null }],
  } as Record<string, { agentRunId: string; address: string | null; agentDefinitionId: null }[]>)[run.rootRunId]
    ?? [{ agentRunId: run.rootRunId, address: null, agentDefinitionId: null }]);
  const headerOf = (h: ReturnType<typeof harness>) => (h.deliverWorkPacket.mock.calls.at(-1)![1] as WorkPacket).delegatorAddress;

  it.each([["an agent run", M, M.rootRunId], ["a team run's member", E, "designer"], ["an org run's agent", ORG, "ceo"]] as const)(
    "%s that assigns the Task is shown by its own address", async (_kind, run, sender) => {
      const h = harness(reader);
      await expect(h.delegate(run, sender, { recipient_address: "/image_maker", description: "Draw." })).resolves.toMatchObject({ delegated: true });
      expect(headerOf(h)).toBe(`/${sender}`);
    });

  it("E-4: sub-work of a Task another run assigned shows the run ID only (the new run cannot reach that address)", async () => {
    const h = harness(reader);
    h.tasks.addTask("project_task_440e", "Build it", "abc-1");
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "project_task_440e", recipientAddress: "/software_engineering_team",
      delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId }, teamCoordinatorAgentRunId: "designer" });
    await expect(h.delegate(E, "designer", { recipient_address: "/image_maker", description: "Draw part of it." })).resolves.toMatchObject({ delegated: true });
    expect(headerOf(h)).toBeNull();
  });
});

describe("TaskDelegation.toNewRun", () => {
  it("CR-461-041: an address its own root does not offer is answered with its delegator's catalog copy; with none, the refusal stands", async () => {
    const h = harness(NO_RUN_PARTS, agentPlacement);
    await expect(h.delegate(E, "designer", { recipient_address: "/image_maker", description: "Draw." }, null)).resolves.toMatchObject({ delegated: true });
    expect(h.starter.startAgent).toHaveBeenCalledWith(expect.objectContaining({ source: agentPlacement.source, address: agentPlacement.address }));
    const none = harness();
    await expect(none.delegate(E, "designer", { recipient_address: "/image_maker", description: "Draw." }, null)).resolves.toEqual({ delegated: false,
      message: "'/image_maker' is not the address of an available agent or agent team." });
    expect(none.starter.startAgent).not.toHaveBeenCalled();
  });

  it("CR-461-050 (CM-1): a delegated run's own name, or an address inside it, is itself; refused before any placement", async () => {
    const h = harness();
    h.tasks.addTask("T1", "Build it", "abc-1");
    const W: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "writer_51aa" };
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/software_engineering_team",
      delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId }, teamCoordinatorAgentRunId: "designer" });
    await h.tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/writer", delegatedFrom: { delegatingRun: E, delegatorAgentRunId: "designer" },
      execution: { agentRunId: W.rootRunId } });
    const refused = (run: RootExecutionIdentity, sender: string, address: string) =>
      expect(h.delegate(run, sender, { recipient_address: address, description: "More." })).rejects.toMatchObject({ code: "COLLABORATION_SELF_TARGET_REJECTED" });
    await refused(E, "designer", "/software_engineering_team");
    await refused(E, "designer", "/software_engineering_team/designer");
    await expect(h.delegate(E, "designer", { recipient_address: "/software_engineering_team", description: "More." }))
      .rejects.toThrow("/software_engineering_team is in your own team; you can't delegate to it. Talk with it using send_message_to.");
    await expect(h.delegate(W, W.rootRunId, { recipient_address: "/writer", description: "More." }))
      .rejects.toThrow("/writer is your own address; you can't delegate to yourself.");
    expect(h.folders).toEqual([]);
    // A name that only begins the same way is another address.
    await expect(h.delegate(E, "designer", { recipient_address: "/software_engineering_team_two", description: "More." })).resolves.toMatchObject({ delegated: true });
  });

  it.each([["an agent run", undefined], ["a team run", "team"]] as const)(
    "CR-461-003 (race table row 5): %s whose Task closes while it starts is refused at its gate head, discarded, and nothing starts", async (_kind, which) => {
      const h = harness();
      h.tasks.addTask("project_task_440e", "Build it", "abc-1");
      const posted = vi.fn(async () => ({ accepted: true }));
      // The new run's root: the closure commits after TaskDelegation's own check, before the packet reaches the gate.
      h.deliverWorkPacket.mockImplementationOnce(async (_run: unknown, packet: WorkPacket) => {
        h.tasks.close("project_task_440e");
        return acceptWorkPacketIfAllowed(packet, posted);
      });
      const outcome = await h.delegate(M, M.rootRunId, { recipient_address: "/x", task_id: "abc-1" }, which === "team" ? teamPlacement : agentPlacement);
      expect(outcome).toEqual({ delegated: false, message: "The Task was marked DONE or CANCELLED; its new work was not started." });
      expect(posted).not.toHaveBeenCalled();
      expect(h.discard).toHaveBeenCalledWith(which === "team" ? { teamRunId: "product_team_e03d" } : { agentRunId: "image_maker_33f0" });
    });

  it("CR-461-003: the gate-head check lets the packet through while the Task is open", async () => {
    const h = harness();
    h.deliverWorkPacket.mockImplementationOnce(async (_run: unknown, packet: WorkPacket) => acceptWorkPacketIfAllowed(packet, async () => ({ accepted: true })));
    await expect(h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", description: "Draw." })).resolves.toMatchObject({ delegated: true });
  });

  it("CM-6: a new run of a Project Task works in the Project's first linked folder; a missing link refuses before anything starts", async () => {
    const h = harness();
    h.tasks.addTask("project_task_440e", "Build it", "abc-1");
    h.tasks.projectFolders.set("project_fixture", "/projects/linked");
    await h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", task_id: "abc-1" });
    expect(h.folders).toEqual(["/projects/linked"]);
    h.tasks.addTask("project_task_441f", "More", "abc-2");
    h.tasks.projectFolders.set("project_fixture", Object.assign(new Error("The Project's first linked folder is missing."), { code: "TASK_PROJECT_FOLDER_UNAVAILABLE" }));
    await expect(h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", task_id: "abc-2" })).resolves.toMatchObject({ delegated: false });
    expect(h.folders).toHaveLength(1);
    // Described work of a sender with no Task (a Task with no Project) takes the top-level run's folder: no Project folder.
    await h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", description: "Draw." });
    expect(h.folders.at(-1)).toBeNull();
  });

  it("D1: a sender with no Task assigns described work to a new Task with no Project; the run carries its origin; the entry, then the packet, then markStarted", async () => {
    const h = harness();
    const outcome = await h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", description: "Draw the logo." });
    expect(outcome).toEqual({ delegated: true, delegatedRun: { kind: "agent", agentRunId: "image_maker_33f0" }, taskId: "ad_hoc_task_1", launchNotes: ["note"] });
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
    expect(outcome).toEqual({ delegated: true, delegatedRun: { kind: "team", teamRunId: "product_team_e03d", teamCoordinatorAgentRunId: "designer_1" } });
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

  it("a work packet the new run does not accept marks the entry failed (base's TASK_DISPATCH_FAILED, CR-461-052) and ends the run", async () => {
    const h = harness();
    const markFailed = vi.spyOn(h.tasks, "markFailed");
    h.deliverWorkPacket.mockResolvedValueOnce({ accepted: false, code: "AGENT_ROOT_HOST_UNAVAILABLE", message: "The runtime is not available." });
    await expect(h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", description: "Draw." }))
      .resolves.toEqual({ delegated: false, message: "The runtime is not available." });
    expect(h.tasks.entry({ agentRunId: "image_maker_33f0" })).toMatchObject({ start: "failed" });
    expect(markFailed).toHaveBeenCalledWith({ agentRunId: "image_maker_33f0" }, { code: "TASK_DISPATCH_FAILED", message: "The runtime is not available." });
    expect(h.discard).toHaveBeenCalledWith({ agentRunId: "image_maker_33f0" });
  });

  it("CR-461-059: an unknown Task key is thrown, so the tool answers base's { error: { code: TASK_DELEGATION_ERROR, message } }", async () => {
    const h = harness();
    const thrown = await h.delegate(M, M.rootRunId, { recipient_address: "/image_maker", task_id: "nope-9" }).catch((error: unknown) => error);
    expect(thrown).toMatchObject({ code: "TASK_NOT_FOUND", message: "Task 'nope-9' was not found." });
    expect(toTaskDelegationToolErrorPayload(thrown)).toEqual({ error: { code: "TASK_DELEGATION_ERROR", message: "Task 'nope-9' was not found." } });
    expect(h.starter.startAgent).not.toHaveBeenCalled();
    expect(h.tasks.links).toEqual([]);
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
      const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
      tree.build();
      tasks.setEntriesListener(tree);
      const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter: {} as never, deliverWorkPacket: vi.fn(), discard: vi.fn(),
        channel: () => channel as never, deliverToRun: vi.fn(async () => ({ accepted: true })), recordCollaborating: vi.fn(async () => undefined), reachingAddress: async () => null, ownDelegations: { of: async () => null }, delegatorCatalog: { placementAt: async () => null }, conversationOf: async () => ({ entryAddress: "/entry", activity: { kind: "present" as const } }) });
      const delegate = () => delegation.toPeerRun({ sender: createCollaborationMemberExecutionIdentity({ root: M, memberAddress: "/project_task_manager" as never, agentRunId: M.rootRunId }),
        senderRun: M, spawn: { recipient_address: "/research_team", description: "Research it." } as never, placement });
      return { tasks, tree, delegate };
    };

    it("a team on a peer: the entry holds nodeId, members and the address; the work packet goes to its coordinator; the result names the peer", async () => {
      const channel = channelWith({ accepted: true, kind: "agent_team", teamRunId: "research_team_77aa", coordinatorAddress: "/research_team/lead",
        members: [{ address: "/research_team/lead", agentRunId: "lead_0c11" }, { address: "/research_team/analyst", agentRunId: "analyst_5d20" }], launches: [] });
      const h = peerHarness(channel);
      const { outcome } = await h.delegate();
      expect(outcome).toEqual({ delegated: true, delegatedRun: { kind: "team", teamRunId: "research_team_77aa", teamCoordinatorAgentRunId: "lead_0c11" },
        node: "Studio B", taskId: "ad_hoc_task_1" });
      expect(channel.startDelegatedRun).toHaveBeenCalledWith(expect.objectContaining({ nodeId: "node-b-1f0e", address: "/research_team",
        delegatorAgentRunId: M.rootRunId, delegatingRun: { kind: "agent", runId: M.rootRunId } }));
      expect(h.tasks.entry({ teamRunId: "research_team_77aa" })).toMatchObject({ start: "started", recipientAddress: "/research_team", nodeId: "node-b-1f0e",
        members: [{ address: "/research_team/lead", agentRunId: "lead_0c11" }, { address: "/research_team/analyst", agentRunId: "analyst_5d20" }] });
      expect(channel.deliverMessage).toHaveBeenCalledWith(expect.objectContaining({ kind: "work_packet", targetAgentRunId: "lead_0c11",
        targetRoot: { kind: "agent_team", runId: "research_team_77aa" } }));
      expect(await h.tree.runOfAgent("analyst_5d20")).toEqual({ rootSubjectKind: "agent_team", rootRunId: "research_team_77aa" });
    });

    it("a refusal by the peer writes nothing; a work packet the peer refuses, or that cannot reach it, marks the entry failed with base's TASK_DISPATCH_FAILED (CR-461-052)", async () => {
      const refusing = peerHarness(channelWith({ accepted: false, code: "AGENT_NOT_FOUND", message: "Nothing is at /research_team on Studio B." }));
      await expect(refusing.delegate()).resolves.toEqual({ outcome: { delegated: false, message: "Nothing is at /research_team on Studio B." }, launches: [] });
      expect(refusing.tasks.links).toEqual([]);
      const failing = peerHarness(channelWith({ accepted: true, kind: "agent", agentRunId: "remote_agent_1", launches: [] },
        { accepted: false, code: "PEER_UNREACHABLE", message: "Studio B did not answer." }));
      const markFailed = vi.spyOn(failing.tasks, "markFailed");
      await expect(failing.delegate()).resolves.toMatchObject({ outcome: { delegated: false, message: "Studio B did not answer." } });
      expect(failing.tasks.entry({ agentRunId: "remote_agent_1" })).toMatchObject({ start: "failed", nodeId: "node-b-1f0e" });
      expect(markFailed).toHaveBeenCalledWith({ agentRunId: "remote_agent_1" }, { code: "TASK_DISPATCH_FAILED", message: "Studio B did not answer." });
      // The channel's delivery rejects: the node is gone.
      const channel = channelWith({ accepted: true, kind: "agent", agentRunId: "remote_agent_2", launches: [] });
      channel.deliverMessage.mockRejectedValueOnce(new Error('Node "Studio B" could not be reached (fetch failed).'));
      const gone = peerHarness(channel);
      const goneFailed = vi.spyOn(gone.tasks, "markFailed");
      await expect(gone.delegate()).resolves.toMatchObject({ outcome: { delegated: false, message: 'Node "Studio B" could not be reached (fetch failed).' } });
      expect(goneFailed).toHaveBeenCalledWith({ agentRunId: "remote_agent_2" }, { code: "TASK_DISPATCH_FAILED", message: 'Node "Studio B" could not be reached (fetch failed).' });
    });
  });

  describe("toExistingRun (S8, DS-6: a follow-up Task by run ID)", () => {
    const followUp = async (deliverToRun = vi.fn(async () => ({ accepted: true }) as { accepted: boolean; code?: string; message?: string }),
      activity: AgentConversationActivity = { kind: "present" }, ownDelegation: RunOwnDelegation | null = null) => {
      const tasks = new InMemoryTaskExecutionResources();
      const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
      tree.build();
      tasks.setEntriesListener(tree);
      tasks.addTask("T1", "Build it", "abc-1"); tasks.addTask("T2", "Polish it", "abc-2");
      await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/software_engineering_team",
        delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId }, teamCoordinatorAgentRunId: "solution_designer_65a9" });
      await tasks.markStarted({ teamRunId: E.rootRunId });
      const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter: {} as never, deliverWorkPacket: vi.fn(), discard: vi.fn(), deliverToRun,
        channel: () => null, recordCollaborating: vi.fn(async () => undefined), reachingAddress: async () => null,
        ownDelegations: { of: async (execution) => ownDelegation && "teamRunId" in execution && execution.teamRunId === E.rootRunId ? ownDelegation : null },
        delegatorCatalog: { placementAt: async () => null }, conversationOf: vi.fn(async () => ({ entryAddress: "/solution_designer", activity })) });
      const give = (senderRun: RootExecutionIdentity, sender: string, copy: Record<string, string>, taskId = "abc-2") => delegation.toExistingRun({
        sender: createCollaborationMemberExecutionIdentity({ root: senderRun, memberAddress: `/${sender}` as never, agentRunId: sender }), senderRun,
        assign: { delegatedRun: copy as never, taskId } });
      return { tasks, tree, give, deliverToRun };
    };

    it("its assigner gives it a second Task: a new assigned entry with the same delegatedFrom and address; the work is a task_assignment message between the runs", async () => {
      const h = await followUp();
      await expect(h.give(M, M.rootRunId, { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: true,
        delegatedRun: { kind: "team", teamRunId: E.rootRunId, teamCoordinatorAgentRunId: "solution_designer_65a9" } });
      expect(h.tasks.assignments).toEqual([{ delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId },
        taskId: "T2", teamCoordinatorAgentRunId: "solution_designer_65a9" }]);
      expect(h.deliverToRun).toHaveBeenCalledWith(expect.objectContaining({ targetAgentRunId: "solution_designer_65a9", messageType: "task_assignment",
        content: expect.stringContaining("New Task assigned to you: abc-2.") }));
      expect(h.tasks.entry({ teamRunId: E.rootRunId })).toMatchObject({ taskId: "T2", start: "started", open: true });
      expect(h.tree.openTaskIdsOf({ teamRunId: E.rootRunId })).toEqual(["T1", "T2"]);
    });

    it("SR-071: a member of a team run it assigned gets base's text (not one of your task agents); its coordinator names the team", async () => {
      const tasks = new InMemoryTaskExecutionResources();
      const tree = new DelegationIndex(() => tasks, readerOfAgents(async (run) => run.rootRunId === E.rootRunId
        ? [{ agentRunId: "solution_designer_65a9", address: "/solution_designer", agentDefinitionId: null }, { agentRunId: "reviewer_cd34", address: "/reviewer", agentDefinitionId: null }] : null));
      tree.build(); tasks.setEntriesListener(tree);
      tasks.addTask("T1", "Build it", "abc-1"); tasks.addTask("T2", "Polish it", "abc-2");
      await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/software_engineering_team",
        delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, execution: { teamRunId: E.rootRunId }, teamCoordinatorAgentRunId: "solution_designer_65a9" });
      const delegation = new TaskDelegation({ tasks: () => tasks, tree: () => tree, starter: {} as never, deliverWorkPacket: vi.fn(), discard: vi.fn(), deliverToRun: vi.fn(),
        channel: () => null, recordCollaborating: vi.fn(async () => undefined), reachingAddress: async () => null, ownDelegations: { of: async () => null }, delegatorCatalog: { placementAt: async () => null },
        conversationOf: async () => ({ entryAddress: "/solution_designer", activity: { kind: "present" as const } }) });
      const give = (agentRunId: string) => delegation.toExistingRun({ sender: createCollaborationMemberExecutionIdentity({ root: M, memberAddress: `/${M.rootRunId}` as never, agentRunId: M.rootRunId }),
        senderRun: M, assign: { delegatedRun: { agentRunId } as never, taskId: "abc-2" } });
      await expect(give("reviewer_cd34")).resolves.toEqual({ delegated: false,
        message: "reviewer_cd34 is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address." });
      await expect(give("solution_designer_65a9")).resolves.toMatchObject({ delegated: false, message: expect.stringContaining(`is the coordinator of task agent team ${E.rootRunId}`) });
    });

    it("refusals keep today's texts: another agent than its last assigner, a sender that works on a Task, a run no Task names", async () => {
      const h = await followUp();
      await expect(h.give(M, "someone_else", { teamRunId: E.rootRunId })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("Only the agent that gave this task agent") });
      await expect(h.give(E, "solution_designer_65a9", { agentRunId: "anyone" })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("you can't use task_id") });
      await expect(h.give(M, M.rootRunId, { agentRunId: "never_delegated" })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("is not one of your task agents") });
      expect(h.tasks.assignments).toEqual([]);
      expect(h.deliverToRun).not.toHaveBeenCalled();
    });

    it.each([["target_team_run_id", { teamRunId: E.rootRunId }], ["target_agent_run_id", { agentRunId: "solution_designer_65a9" }]])(
      "CR-461-059 (F-47): by %s, an unknown Task key is base's refusal { delegated: false, message }, not the recipient path's error", async (_form, copy) => {
        const h = await followUp();
        await expect(h.give(M, M.rootRunId, copy, "nope-9")).resolves.toEqual({ delegated: false, message: "Task 'nope-9' was not found." });
        expect(h.tasks.assignments).toEqual([]);
        expect(h.deliverToRun).not.toHaveBeenCalled();
      });

    it("an uncoded failure on the run-ID path is thrown, as base", async () => {
      const h = await followUp();
      vi.spyOn(h.tasks, "resolveAssignment").mockRejectedValueOnce(new Error("disk unreadable"));
      await expect(h.give(M, M.rootRunId, { teamRunId: E.rootRunId })).rejects.toThrow("disk unreadable");
    });

    it("SR-072 F-24 (U11): a run whose Tasks were all deleted is given a new Task by the delegator its own file names; the entry repeats its delegation and address", async () => {
      const own: RunOwnDelegation = { delegatedFrom: { delegatingRun: M, delegatorAgentRunId: M.rootRunId }, recipientAddress: "/software_engineering_team",
        entryAgentRunId: "solution_designer_65a9" };
      const h = await followUp(undefined, undefined, own);
      h.tasks.deleteTask("T1");
      expect(h.tree.tasksOf({ teamRunId: E.rootRunId })).toEqual([]);
      // Another agent is told it is not one of its task agents, as for any run that is not its own.
      await expect(h.give(M, "someone_else", { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: false,
        message: `${E.rootRunId} is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address.` });
      await expect(h.give(M, M.rootRunId, { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: true,
        delegatedRun: { kind: "team", teamRunId: E.rootRunId, teamCoordinatorAgentRunId: "solution_designer_65a9" } });
      expect(h.tasks.assignments).toEqual([{ delegatedFrom: own.delegatedFrom, execution: { teamRunId: E.rootRunId }, taskId: "T2",
        recipientAddress: "/software_engineering_team", teamCoordinatorAgentRunId: "solution_designer_65a9" }]);
      expect(h.tasks.entry({ teamRunId: E.rootRunId })).toMatchObject({ taskId: "T2", recipientAddress: "/software_engineering_team", open: true });
      expect(h.deliverToRun).toHaveBeenCalledWith(expect.objectContaining({ targetAgentRunId: "solution_designer_65a9", messageType: "task_assignment" }));
      // A run whose own file names no local delegator stays refused.
      const none = await followUp();
      none.tasks.deleteTask("T1");
      await expect(none.give(M, M.rootRunId, { teamRunId: E.rootRunId })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("is not one of your task agents") });
    });

    it("CR-461-049: a sender in another tree gets base's \"not one of your task agents\", before the Task side's assigner check", async () => {
      const h = await followUp();
      const other = { rootSubjectKind: "agent" as const, rootRunId: "other_manager_77aa" };
      await expect(h.give(other, other.rootRunId, { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: false,
        message: `${E.rootRunId} is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address.` });
      // In the same tree, another agent than its last assigner keeps the Task side's text.
      await expect(h.give(M, "someone_else", { teamRunId: E.rootRunId })).resolves.toMatchObject({ delegated: false, message: expect.stringContaining("Only the agent that gave this task agent") });
      expect(h.tasks.assignments).toEqual([]);
      expect(h.deliverToRun).not.toHaveBeenCalled();
    });

    it("CR-461-043: a run that cannot be restored is refused with base's text before anything changes, and no path is shown", async () => {
      const none = await followUp(undefined, { kind: "none" });
      await expect(none.give(M, M.rootRunId, { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: false, message: "The delegated Team at "
        + "'/software_engineering_team' cannot be restored: its coordinator '/solution_designer' has no saved conversation to continue. Start a new delegation for this work." });
      expect(none.tasks.assignments).toEqual([]);
      expect(none.deliverToRun).not.toHaveBeenCalled();
      expect(none.tasks.entry({ teamRunId: E.rootRunId })).toMatchObject({ taskId: "T1", start: "started" });
      const unreadable = await followUp(undefined, { kind: "indeterminate", error: new Error("raw_traces.jsonl could not be read (ENOENT)") });
      const refused = await unreadable.give(M, M.rootRunId, { teamRunId: E.rootRunId });
      expect(refused).toEqual({ delegated: false, message: "The delegated Team at '/software_engineering_team' cannot be restored: the saved conversation of its "
        + "coordinator '/solution_designer' cannot be read (raw_traces.jsonl could not be read (ENOENT)). Its files were left unchanged. Start a new delegation "
        + "for this work, or restore its saved conversation from a backup." });
      expect((refused as { message: string }).message).not.toMatch(/memory\/|\/agents\/|\/agent_teams\//);
      expect(unreadable.tasks.assignments).toEqual([]);
    });

    it("a work message that is not delivered marks the new entry failed and says what to do", async () => {
      const h = await followUp(vi.fn(async () => ({ accepted: false, code: "TARGET_RUN_NOT_AVAILABLE", message: "It could not be resumed." })));
      await expect(h.give(M, M.rootRunId, { teamRunId: E.rootRunId })).resolves.toEqual({ delegated: false,
        message: expect.stringContaining("Task abc-2 was given to the task agent, but the message with its work was not delivered (It could not be resumed.)") });
      expect(h.tasks.entry({ teamRunId: E.rootRunId })).toMatchObject({ taskId: "T2", start: "failed" });
    });
  });
});
