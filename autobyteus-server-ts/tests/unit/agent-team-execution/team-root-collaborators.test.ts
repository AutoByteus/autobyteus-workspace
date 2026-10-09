import { afterEach, describe, expect, it, vi } from "vitest";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { ROOT, bringInBoth, cleanupDirectories, entriesOf, harness, mentionBoth } from "./helpers/team-root-collaborator-harness.js";

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupDirectories();
});

describe("collaborators hosted in a Team root (AR-006)", () => {
  it("includes a hosted collaborator Team's live input snapshots in the root package", async () => {
    const f = await harness(); await bringInBoth(f.root);
    const { lead } = entriesOf(f.root);
    await f.root.executeAgentCommand(lead.agentRunId, { kind: "post_message", message: { content: "Work" } as never });
    const state = { run_instance_id: 'instance', revision: 1, entries: [], recoverableBlock: null };
    f.handles.get(lead.agentRunId)!.handle.getInputStateSnapshots.mockReturnValue([{ agent_run_id: lead.agentRunId, state }]);
    const connection = await f.root.openPackageSnapshotConnection();
    expect(connection.snapshot.inputStates).toEqual([{ agent_run_id: lead.agentRunId, state }]);
    connection.close();
  });

  it("`@` resolves each mentioned definition's address without writing, hosting or publishing anything (REQ-001)", async () => {
    const f = await harness();
    const events: TeamRunEvent[] = [];
    f.root.subscribeToEvents(({ event }) => events.push(event));
    await expect(mentionBoth(f.root)).resolves.toEqual({ admitted: true, collaborators: [
      { name: "Code Reviewer", kind: "agent", address: "/code_reviewer", presence: "not_in_run" },
      { name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" },
    ] });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toEqual([]);
    expect((await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!.rootTeam.collaborators).toEqual([]);
    expect(events).toEqual([]);
    expect(f.handles.size).toBe(0);
    // An unknown run is still refused.
    await expect(f.root.resolveCollaboratorMentions({ focusedAgentRunId: "nobody", mentions: [{ kind: "agent", definitionId: "code-reviewer" }] }))
      .resolves.toMatchObject({ admitted: false, code: "RUN_NOT_FOUND" });
  });

  it("brings each collaborator in once, Offline, persisted with its run IDs and published", async () => {
    const f = await harness();
    const events: TeamRunEvent[] = [];
    f.root.subscribeToEvents(({ event }) => events.push(event));
    const [reviewerResult, productResult] = await bringInBoth(f.root);
    expect(reviewerResult).toEqual({ admitted: true, collaborators: [{ name: "Code Reviewer", kind: "agent", address: "/code_reviewer", presence: "not_in_run" }] });
    expect(productResult).toEqual({ admitted: true, collaborators: [{ name: "Product Team", kind: "agent_team", address: "/product_team", presence: "not_in_run" }] });
    // `@` now resolves to the in-run collaborator addresses and adds nothing more.
    await expect(mentionBoth(f.root)).resolves.toMatchObject({ admitted: true });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toHaveLength(2);
    const { reviewer, product, lead, designer } = entriesOf(f.root);
    const stored = await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT);
    expect(stored!.rootTeam.collaborators).toEqual(f.root.getExecutionTreeSnapshot().rootTeam.collaborators);
    expect(events.filter((event) => event.eventSourceType === TeamRunEventSourceType.COLLABORATOR)).toHaveLength(2);
    // Status leaves include every collaborator execution, Offline until its first message.
    const statuses = new Map(f.root.getLeafAgentStatusSnapshots().map((snapshot) => [snapshot.execution.agentRunId, snapshot.details.status]));
    expect([reviewer.agentRunId, lead.agentRunId, designer.agentRunId].map((id) => statuses.get(id))).toEqual(["offline", "offline", "offline"]);
    // The collaborator Team is a managed TeamRun under the root; its coordinator resolves.
    expect(f.root.getCoordinatorAgentRunId(product.teamRunId)).toBe(lead.agentRunId);
    expect(f.root.getAgentExecution(designer.agentRunId)).toMatchObject({
      containingTeamRunId: product.teamRunId, ancestorTeamRunIds: [product.teamRunId],
    });
    expect(f.root.getAgentExecution(reviewer.agentRunId)).toMatchObject({ containingTeamRunId: ROOT, ancestorTeamRunIds: [] });
    // Nothing started.
    expect(f.handles.size).toBe(0);
  });

  it("starts a collaborator on a user send, serves interrupt and tool approval, and delivers by address both ways", async () => {
    const f = await harness();
    await bringInBoth(f.root);
    const { reviewer, lead, designer } = entriesOf(f.root);
    await expect(f.root.executeAgentCommand(reviewer.agentRunId, { kind: "post_message", message: { content: "Review this" } as never }))
      .resolves.toMatchObject({ accepted: true });
    const reviewerHandle = f.handles.get(reviewer.agentRunId)!;
    expect(reviewerHandle.input.activationMode).toBe("fresh");
    expect(reviewerHandle.handle.postMessage).toHaveBeenCalledOnce();
    // A collaborator Agent has no enclosing Team instruction or handoffs.
    expect(reviewerHandle.input.memberExecutionContext).toMatchObject({ authoredEnclosingScopeInstruction: null });
    expect(reviewerHandle.input.memberExecutionContext.collaboration.outgoingHandoffs).toEqual([]);
    await expect(f.root.executeAgentCommand(reviewer.agentRunId, { kind: "interrupt" })).resolves.toMatchObject({ accepted: true });
    expect(reviewerHandle.handle.interrupt).toHaveBeenCalledOnce();
    await expect(f.root.executeAgentCommand(reviewer.agentRunId, { kind: "approve_tool", invocationId: "t1", approved: false, reason: "no" }))
      .resolves.toMatchObject({ accepted: true });
    expect(reviewerHandle.handle.approveToolInvocation).toHaveBeenCalledWith("t1", false, "no");

    // The coordinator messages the collaborator Team by address: its coordinator starts.
    const coordinator = f.identity("/coordinator", "run-coordinator");
    await expect(f.message(coordinator, "/product_team", "Design it")).resolves.toMatchObject({ accepted: true });
    const leadHandle = f.handles.get(lead.agentRunId)!;
    expect(leadHandle.handle.reserveInput).toHaveBeenCalledOnce();
    expect(leadHandle.input.memberExecutionContext).toMatchObject({ teamScoped: true, authoredEnclosingScopeInstruction: "Ship the product UI." });
    expect(leadHandle.input.memberExecutionContext.collaboration.outgoingHandoffs)
      .toEqual([{ from: "/product_team/lead", to: "/product_team/designer", rules: ["When UI work is needed."] }]);
    // DI-001: the lead's authored handoff reaches its teammate's own instance.
    await expect(f.message(leadHandle.input.identity, "/product_team/designer", "UI please")).resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(designer.agentRunId)!.handle.reserveInput).toHaveBeenCalledOnce();
    // The collaborator's report back is authorized and delivered.
    await expect(f.message(reviewerHandle.input.identity, "/coordinator", "Done.")).resolves.toMatchObject({ accepted: true });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.taskExecutions).toEqual([]);
    expect(f.root.getCommunicationSnapshot().messages.map((entry) => entry.receiverAgentRunId))
      .toEqual([lead.agentRunId, designer.agentRunId, "run-coordinator"]);
  });

  it("starts an extra copy on delegate_task, hosted by the delegator's Team (REQ-013)", async () => {
    const f = await harness();
    await bringInBoth(f.root);
    const { product, lead } = entriesOf(f.root);
    const coordinator = { identity: f.identity("/coordinator", "run-coordinator") };
    await expect(f.root.delegateToNewCopy(coordinator, { recipient_address: "/code_reviewer", description: "Review too" }))
      .resolves.toMatchObject({ delegated: true, copy: { agentRunId: "code-reviewer-run-4" } });
    await expect(f.root.delegateToNewCopy({ identity: f.identity("/product_team/lead", lead.agentRunId) }, { recipient_address: "/product_team/designer", description: "Mock it" }))
      .resolves.toMatchObject({ delegated: true, copy: { agentRunId: "designer-run-5" } });
    await flushMicrotasks();
    const tree = f.root.getExecutionTreeSnapshot();
    expect(tree.rootTeam.taskExecutions.map((task) => task.address)).toEqual(["/code_reviewer"]);
    const team = tree.rootTeam.collaborators.find((entry) => entry.address === "/product_team")!;
    expect(team.kind === "agent_team" && team.taskExecutions.map((task) => task.address)).toEqual(["/product_team/designer"]);
    expect(f.root.getAgentExecution("designer-run-5")).toMatchObject({ containingTeamRunId: product.teamRunId });
  });

  it("restores collaborators with the root after Stop, in restore mode with the same run IDs", async () => {
    const f = await harness();
    await bringInBoth(f.root);
    const { reviewer, lead } = entriesOf(f.root);
    await f.root.executeAgentCommand(reviewer.agentRunId, { kind: "post_message", message: { content: "x" } as never });
    await f.message(f.identity("/coordinator", "run-coordinator"), "/product_team", "Design it");
    await expect(f.root.terminate()).resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(reviewer.agentRunId)!.finish).toHaveBeenCalled();
    expect(f.handles.get(lead.agentRunId)!.finish).toHaveBeenCalled();

    const reopened = await f.reopen();
    expect(entriesOf(reopened).reviewer.agentRunId).toBe(reviewer.agentRunId);
    await expect(reopened.executeAgentCommand(reviewer.agentRunId, { kind: "post_message", message: { content: "Again" } as never }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(reviewer.agentRunId)!.input.activationMode).toBe("restore");
    await expect(reopened.executeAgentCommand(lead.agentRunId, { kind: "post_message", message: { content: "Again" } as never }))
      .resolves.toMatchObject({ accepted: true });
    expect(f.handles.get(lead.agentRunId)!.input.activationMode).toBe("restore");
    await reopened.terminate();
  });

  it("an unrunnable definition still resolves for `@` (delegation checks it) and its bring-in fails without writing, hosting or publishing", async () => {
    const f = await harness({ runnable: false });
    const events: TeamRunEvent[] = [];
    f.root.subscribeToEvents(({ event }) => events.push(event));
    await expect(mentionBoth(f.root)).resolves.toMatchObject({ admitted: true });
    const [reviewerResult] = await bringInBoth(f.root);
    expect(reviewerResult).toMatchObject({ admitted: false, code: "COLLABORATOR_ADD_FAILED", collaboratorName: "Code Reviewer" });
    expect(f.root.getExecutionTreeSnapshot().rootTeam.collaborators).toEqual([]);
    expect((await f.dependencies.executionTreeStore.read(f.teamMemoryDir, ROOT))!.rootTeam.collaborators).toEqual([]);
    expect(events).toEqual([]);
  });
});
