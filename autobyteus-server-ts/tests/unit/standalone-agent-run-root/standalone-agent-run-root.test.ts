import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { DelegationTree } from "../../../src/agent-collaboration/delegation/delegation-tree.js";
import { bindDelegationTree, unbindDelegationTree } from "../../../src/agent-collaboration/delegation/delegation-tree-binding.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { HOST, buildManager, cleanupDirectories } from "./helpers/standalone-root-harness.js";

/**
 * autobyteus-461: a standalone run's root holds only its own agent (contract P1, P2; design DS-4, DS-8): its own log in
 * its run folder (TC-13), its own Stop, and nothing hosted. A run it delegates to is a run of its own.
 */
const trees: DelegationTree[] = [];
afterEach(async () => {
  trees.splice(0).forEach(unbindDelegationTree);
  vi.restoreAllMocks();
  await cleanupDirectories();
});
const otherRun = createAgentRootExecutionIdentity("manager-run");
const manager = createCollaborationMemberExecutionIdentity({ root: otherRun, memberAddress: "/project_task_manager", agentRunId: "manager-run" });
const message = (id: string) => ({ messageId: id, senderAgentRunId: "manager-run", receiverAgentRunId: HOST, content: "Please review.",
  messageType: "agent_message", referenceFiles: [], createdAt: "2026-11-11T10:00:00.000Z" });

describe("StandaloneAgentRunRoot (its own agent only)", () => {
  it("resolving the root starts nothing; a message from another run makes the agent ready and is kept in the run's own log", async () => {
    const h = await buildManager();
    h.host.crash();
    const root = (await h.manager.resolveRoot(HOST))!;
    expect(h.restores).not.toHaveBeenCalled();
    expect(root.hasAgentExecution(HOST)).toBe(true);
    expect(root.hasAgentExecution("someone-else")).toBe(false);
    const accepted = await root.acceptFromRun({ message: message("m-1"), senderIdentity: manager, senderDisplayName: "project_task_manager",
      senderAddress: "/project_task_manager", assertAllowed: () => undefined });
    expect(accepted).toMatchObject({ accepted: true });
    expect(h.restores).toHaveBeenCalledOnce();
    expect(h.host.reserved).toEqual([expect.stringContaining("Please review.")]);
    // TC-13: the run's own log is in its run folder, not under `collaboration/`.
    const files = await fs.readdir(path.join(h.memoryDir, "agents", HOST));
    expect(files.some((file) => file.startsWith("communication_messages"))).toBe(true);
    expect(files).not.toContain("collaboration");
    expect(root.getCommunicationSnapshot().messages.map((item) => item.messageId)).toEqual(["m-1"]);
  });

  it("an address in this run is its own agent (the self refusal); any other address is not found here", async () => {
    const h = await buildManager();
    const root = (await h.manager.resolveRoot(HOST))!;
    await expect(root.deliverLogicalMessage(h.hostIdentity, { recipientAddress: "/research_assistant" as never, content: "x" }))
      .resolves.toMatchObject({ accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED" });
    await expect(root.deliverLogicalMessage(h.hostIdentity, { recipientAddress: "/code_reviewer" as never, content: "x" }))
      .rejects.toMatchObject({ code: "COLLABORATION_TARGET_NOT_FOUND" });
  });

  it("Stop ends the run's own agent only and unregisters the root (DS-4, TC-1); the next use loads it again", async () => {
    const h = await buildManager();
    const root = (await h.manager.resolveRoot(HOST))!;
    const stopped = await h.manager.stopRoot(HOST);
    expect(stopped).toMatchObject({ rootEnded: true, host: { outcome: "terminated" } });
    expect(root.isActive()).toBe(false);
    expect(h.directory.resolve(root.rootIdentity)).toBeNull();
    expect(await h.manager.resolveRoot(HOST)).not.toBe(root);
  });

  it("CR-461-001: a closure stop keeps a run whose Task entry is open again where its gate closes; else it stops as Stop does", async () => {
    const h = await buildManager();
    const root = (await h.manager.resolveRoot(HOST))!;
    await expect(h.manager.stopRootForTaskClosure(HOST, () => false)).resolves.toBe("kept_open");
    expect(root.isActive()).toBe(true);
    expect(h.directory.resolve(root.rootIdentity)).toBe(root);
    await expect(h.manager.stopRootForTaskClosure(HOST, () => true)).resolves.toMatchObject({ rootEnded: true, host: { outcome: "terminated" } });
    expect(root.isActive()).toBe(false);
  });

  it("a stopped run's view is its own agent, read without restoring it (DS-8)", async () => {
    const h = await buildManager();
    const inspection = await h.manager.getInspection(HOST);
    expect(inspection).toMatchObject({ isActive: false, snapshot: { host: { agentRunId: HOST, address: "/research_assistant" }, createdAt: "2026-09-30T00:00:00.000Z" } });
    expect(h.restores).not.toHaveBeenCalled();
  });

  it("the Task the run works on (get_project_task's scope) is its own current entry, by its own identity", async () => {
    const h = await buildManager();
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationTree(() => tasks);
    tree.build(); tasks.setEntriesListener(tree); bindDelegationTree(tree); trees.push(tree);
    tasks.addTask("T1");
    const root = (await h.manager.resolveRoot(HOST))!;
    expect(root.ownedTaskOf({ identity: h.hostIdentity })).toBeNull();
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/research_assistant",
      delegatedFrom: { delegatingRun: otherRun, delegatorAgentRunId: "manager-run" }, execution: { agentRunId: HOST } });
    expect(root.ownedTaskOf({ identity: h.hostIdentity })).toEqual({ taskId: "T1", execution: { agentRunId: HOST }, open: true });
  });
});
