import { NO_RUN_PARTS } from "../../helpers/run-agents-reader.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskDelegation } from "../../../src/agent-collaboration/execution/task/task-delegation.js";
import { DelegationIndex } from "../../../src/agent-collaboration/delegation/delegation-index.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { createCollaborationRootResolver } from "../../../src/compositions/collaboration-root-resolver.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import { HOST, buildManager, cleanupDirectories } from "./helpers/standalone-root-harness.js";
import { NO_OUTGOING_FILES, NO_PEER_RUN_PORTS } from "../../helpers/explicit-host-collaborators.js";

/**
 * autobyteus-461 CR-461-001 (residual), design race table rows 1 and 4: DONE(A) closes a run's last Task and its stop
 * begins; the assigner's follow-up Task B commits while the run is still stopping. The work's delivery waits for the
 * stop, the run is loaded again (one root at a time) and takes B's work: the assignment answers `delegated: true`.
 */
afterEach(async () => { vi.restoreAllMocks(); await cleanupDirectories(); });
const M = createAgentRootExecutionIdentity("manager-run");
const run = { agentRunId: HOST };
const flush = async () => { for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 0)); };

describe("a closure stop and a follow-up Task delivered while the agent run stops", () => {
  it("waits for the stop, then restores the run in B with its work; never two roots", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
    tree.build(); tasks.setEntriesListener(tree);
    tasks.addTask("A", "First", "task-a"); tasks.addTask("B", "Second", "task-b");
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "A", recipientAddress: "/research_assistant",
      delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager-run" }, execution: run });
    await tasks.markStarted(run);
    const h = await buildManager(tasks);
    const first = (await h.manager.resolveRoot(HOST))!;
    const resolver = createCollaborationRootResolver({ standaloneRoots: h.manager, teamRuns: {} as never, orgRuns: {} as never });
    const roots = new Set<unknown>();
    const delegation = new TaskDelegation({ outgoing: NO_OUTGOING_FILES, tasks: () => tasks, tree: () => tree, starter: {} as never, deliverWorkPacket: vi.fn(), discard: vi.fn(),
      channel: () => null, ...NO_PEER_RUN_PORTS, recordCollaborating: vi.fn(async () => undefined), reachingAddress: async () => null, ownDelegations: { of: async () => null }, delegatorCatalog: { placementAt: async () => null }, conversationOf: async () => ({ entryAddress: "/entry", activity: { kind: "present" as const } }),
      deliverToRun: async (input) => {
        const resolved = await resolver.resolveOrRestore(createAgentRootExecutionIdentity(HOST));
        if (resolved?.kind !== "agent") throw new Error("no root");
        roots.add(resolved.root);
        return resolved.root.acceptFromRun({ message: { messageId: "work-b", senderAgentRunId: "manager-run", receiverAgentRunId: HOST, content: input.content,
          messageType: input.messageType, referenceFiles: [], createdAt: "2026-11-11T10:00:00.000Z" },
          senderIdentity: input.sender, senderDisplayName: "manager", senderAddress: "/manager", assertAllowed: () => undefined, relation: "related" });
      } });

    // DONE(A): the closure stop checks "still closed" (true) and starts ending the run; its agent's end is held.
    const release = h.holdTermination();
    tasks.close("A");
    const stopping = h.manager.stopRootForTaskClosure(HOST, () => !tasks.isOpen(run));
    await flush();
    expect(first.isActive()).toBe(false);
    // B's assignment commits after the check, while the run stops.
    const assigning = delegation.toExistingRun({ sender: createCollaborationMemberExecutionIdentity({ root: M, memberAddress: "/manager" as never, agentRunId: "manager-run" }),
      senderRun: M, assign: { delegatedRun: run as never, taskId: "task-b" } });
    await flush();
    expect(tasks.entry(run)).toMatchObject({ taskId: "B", open: true });
    expect(roots.size).toBe(0);
    // While it stops, no second root exists for the run: the directory holds the ending root or none.
    expect([first, null]).toContain(h.directory.resolve(createAgentRootExecutionIdentity(HOST)));
    release();
    await expect(stopping).resolves.toMatchObject({ rootEnded: true });
    await expect(assigning).resolves.toMatchObject({ delegated: true });

    const [second] = [...roots] as [typeof first];
    expect(roots.size).toBe(1);
    expect(second).not.toBe(first);
    expect(second.isActive()).toBe(true);
    expect(h.directory.resolve(createAgentRootExecutionIdentity(HOST))).toBe(second);
    expect(h.restores).toHaveBeenCalledOnce();
    expect(h.host.reserved).toEqual([expect.stringContaining("task-b")]);
    expect(tasks.entry(run)).toMatchObject({ taskId: "B", open: true, start: "started" });
  });

  it("a plain resolution during a Stop waits for it and loads one new root", async () => {
    const h = await buildManager();
    const first = (await h.manager.resolveRoot(HOST))!;
    const release = h.holdTermination();
    const stopping = h.manager.stopRoot(HOST);
    const resolving = Promise.all([h.manager.resolveRoot(HOST), h.manager.resolveRoot(HOST)]);
    let settled = false;
    void resolving.then(() => { settled = true; });
    await flush();
    expect(settled).toBe(false);
    release();
    await stopping;
    const [a, b] = await resolving;
    expect(a).toBe(b);
    expect(a).not.toBe(first);
    expect(a!.isActive()).toBe(true);
  });
});
