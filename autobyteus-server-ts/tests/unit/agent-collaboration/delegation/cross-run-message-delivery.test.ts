import { readerOfAgentRunIds } from "../../../helpers/run-agents-reader.js";
import { describe, expect, it, vi } from "vitest";
import { CrossRunMessageDelivery, type CrossRunReceiverRoot } from "../../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { createCollaborationMemberExecutionIdentity, rootExecutionIdentityKey, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ASSIGNER_ONLY_REACTIVATION_MESSAGE } from "../../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskDelegationError } from "../../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-461 design DS-2 (`CrossRunMessageDelivery`), contract §2.2, the run-ID cases R-1 … R-10, and the closure race
 * of "Ordering Without A Shared Queue" (AR-017): M assigned T1 to E; E's designer handed sub-work of T1 to P; P's designer
 * to I; M assigned T2 to R. autobyteus-492 (CM-13, DS-003): a pair of runs no Task relates is `unrelated`: delivered
 * while the receiver runs, in its active root (never restored), out of run views; else not this route's (`null`).
 */
const run = (rootSubjectKind: RootExecutionIdentity["rootSubjectKind"], rootRunId: string) => ({ rootSubjectKind, rootRunId }) as RootExecutionIdentity;
const M = run("agent", "manager"), E = run("agent_team", "eng"), P = run("agent_team", "product"), I = run("agent", "image"), R = run("agent", "research");
const LEGACY = run("agent", "legacy");
const agent = (root: RootExecutionIdentity, agentRunId: string) => createCollaborationMemberExecutionIdentity({ root, memberAddress: `/${agentRunId}` as never, agentRunId });

const harness = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, readerOfAgentRunIds(async (r) => r.rootRunId === "eng" ? ["designer", "coder"] : r.rootRunId === "product" ? ["pd", "pm"] : null));
  tree.build();
  tasks.setEntriesListener(tree);
  tasks.addTask("T1"); tasks.addTask("T2");
  const from = (delegatingRun: RootExecutionIdentity, by: string) => ({ delegatingRun, delegatorAgentRunId: by });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/eng", delegatedFrom: from(M, "manager"), execution: { teamRunId: "eng" }, teamCoordinatorAgentRunId: "designer" });
  await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/product", delegatedFrom: from(E, "designer"), execution: { teamRunId: "product" }, teamCoordinatorAgentRunId: "pd" });
  await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/image", delegatedFrom: from(P, "pd"), execution: { agentRunId: "image" } });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/research", delegatedFrom: from(M, "manager"), execution: { agentRunId: "research" } });
  for (const execution of [{ teamRunId: "eng" }, { teamRunId: "product" }, { agentRunId: "image" }, { agentRunId: "research" }]) await tasks.markStarted(execution);
  const log: string[] = [];
  /** Whether each accepted message entered run views (G-1, DEC-014), by message ID. */
  const publishedToViews = new Map<string, boolean>();
  /** The agents that run now, in their run (`RunningAgents.rootOf`); every agent of the tree runs unless a test stops it. */
  const running = new Map<string, RootExecutionIdentity>([["manager", M], ["designer", E], ["coder", E], ["pd", P], ["pm", P], ["image", I], ["research", R], ["legacy", LEGACY]]);
  const senderRoot = (r: RootExecutionIdentity) => ({
    prepareSendToRun: (input: { senderIdentity: { agentRunId: string }; receiverAgentRunId: string; content: string }) => ({ ok: true as const,
      message: { messageId: `m-${input.senderIdentity.agentRunId}-${input.receiverAgentRunId}`, senderAgentRunId: input.senderIdentity.agentRunId,
        receiverAgentRunId: input.receiverAgentRunId, content: input.content, messageType: "agent_message", referenceFiles: [], createdAt: "t" } }),
    commitSentToRun: async (message: { messageId: string }) => { log.push(`sender-log:${r.rootRunId}:${message.messageId}`); },
  });
  /** The receiver's root runs the gate-head re-check, then writes its own log (or refuses, writing nothing). */
  const receiverRoot = (r: RootExecutionIdentity): CrossRunReceiverRoot => ({
    acceptFromRun: async (input) => {
      try { input.assertAllowed(); } catch (error) {
        if (error instanceof TaskDelegationError) return { accepted: false, code: error.code, message: error.message };
        throw error;
      }
      log.push(`receiver-log:${r.rootRunId}:${input.message.messageId}`);
      publishedToViews.set(input.message.messageId, input.publishToViews);
      return { accepted: true };
    },
  });
  const beforeReceive = { hook: async () => undefined as void };
  // Whether a delegated run can be restored (CR-461-070): every run can unless a test says otherwise.
  const restorability = { refusal: vi.fn(async (_run: RootExecutionIdentity): Promise<{ accepted: false; code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE"; message: string } | null> => null) };
  // Each run's own file: the research run's and the eng team run's delegation, as their files record it (it outlives the Task's deletion).
  const runFiles = { delegationOfAgent: vi.fn(async (agentRunId: string) => agentRunId === "research"
    ? { delegatedFrom: from(M, "manager"), address: "/research", definition: { kind: "agent" as const, definitionId: "research" }, entryAgentRunId: "research" }
    : ["designer", "coder"].includes(agentRunId)
      ? { delegatedFrom: from(M, "manager"), address: null, definition: { kind: "agent_team" as const, definitionId: "eng" }, entryAgentRunId: "designer" } : null) };
  const restored = vi.fn();
  const delivery = new CrossRunMessageDelivery({ tree: () => tree, tasks: () => tasks, senderRoot: (r) => senderRoot(r) as never, senderAddress: async () => null, runFiles, restorability,
    receiverRoot: async (r) => { restored(r); await beforeReceive.hook(); return receiverRoot(r); },
    runningAgents: { rootOf: (agentRunId) => { const root = running.get(agentRunId); return root ? { root, status: { agentRunId, status: "idle", backgroundTasksRunning: 0 } } : null; } },
    activeReceiverRoot: (r) => receiverRoot(r) });
  const send = (from: RootExecutionIdentity, sender: string, target: string) => delivery.route({ sender: agent(from, sender), senderDisplayName: sender,
    targetAgentRunId: target, content: "hello", messageType: "agent_message", referenceFiles: [] });
  const sendAs = (from: RootExecutionIdentity, sender: string, target: string, shownAs: string) => delivery.route({ sender: agent(from, sender),
    senderDisplayName: sender, targetAgentRunId: target, shownAs, content: "hello", messageType: "agent_message", referenceFiles: [] });
  return { tasks, tree, log, send, sendAs, beforeReceive, runFiles, restorability, running, restored, publishedToViews, delivery };
};

describe("CrossRunMessageDelivery (DS-2)", () => {
  it.each([
    ["R-1: M → E's coordinator (b)", M, "manager", "designer"],
    ["R-1: M → any member of E (b; a stopped team's member from its own file)", M, "manager", "coder"],
    ["R-2: E ↔ P (a)", E, "coder", "pd"],
    ["R-2: I → P (a)", I, "image", "pm"],
    ["R-3: P's member → its delegator (a)", P, "pm", "designer"],
    ["R-4: M → P at depth 2 (b)", M, "manager", "pd"],
    ["R-5: E's member → M (b)", E, "coder", "manager"],
  ])("%s: delivered; the receiver's log first, then the sender's, with one message ID (CM-9)", async (_case, from, sender, target) => {
    const h = await harness();
    const result = await h.send(from, sender, target);
    // Today's text by run ID (REQ-009, contract §2; CR-461-017).
    expect(result).toMatchObject({ accepted: true, agentRunId: target, message: "Message delivered." });
    const receiverRun = rootExecutionIdentityKey((await h.tree.runOfAgent(target))!);
    expect(h.log).toEqual([`receiver-log:${receiverRun.split("\0")[1]}:m-${sender}-${target}`, `sender-log:${from.rootRunId}:m-${sender}-${target}`]);
    // A related message enters run views as today (G-1).
    expect(h.publishedToViews.get(`m-${sender}-${target}`)).toBe(true);
  });

  it("by address, the result names the address the sender used (CR-461-017)", async () => {
    const h = await harness();
    const result = await h.sendAs(E, "coder", "manager", "/manager");
    expect(result).toMatchObject({ accepted: true, agentRunId: "manager", message: "Delivered message to /manager." });
  });

  it("CR-461-070 (F-50): the delegator's message to a delegated run whose entry agent's saved conversation cannot be read is base's refusal, before anything is restored", async () => {
    const h = await harness();
    const unrestorable = { accepted: false as const, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" as const,
      message: "The delegated Agent at '/research' cannot be restored: its saved conversation cannot be read (line 2 is not JSON). Its files were left unchanged. Start a new delegation for this work, or restore its saved conversation from a backup." };
    h.restorability.refusal.mockResolvedValueOnce(unrestorable);
    const restored = vi.fn();
    h.beforeReceive.hook = async () => { restored(); };
    await expect(h.send(M, "manager", "research")).resolves.toEqual(unrestorable);
    expect(h.restorability.refusal).toHaveBeenCalledWith(R);
    expect(restored).not.toHaveBeenCalled();
    expect(h.log).toEqual([]);
  });

  it("autobyteus-492 DS-003 (was R-7): runs of different Tasks are unrelated: delivered while the receiver runs, in its active root, never restored, out of run views", async () => {
    const h = await harness();
    await expect(h.send(P, "pd", "research")).resolves.toMatchObject({ accepted: true, agentRunId: "research", message: "Message delivered." });
    expect(h.log).toEqual(["receiver-log:research:m-pd-research", "sender-log:product:m-pd-research"]);
    expect(h.restored).not.toHaveBeenCalled();
    expect(h.publishedToViews.get("m-pd-research")).toBe(false);
  });

  it("autobyteus-492 REQ-010 (DEC-003): an unrelated receiver that does not run is not this route's (the router answers not running); nothing is restored or written", async () => {
    const h = await harness();
    h.running.delete("research");
    await expect(h.send(P, "pd", "research")).resolves.toBeNull();
    expect(h.restored).not.toHaveBeenCalled();
    expect(h.log).toEqual([]);
  });

  it("CR-461-058 (R-9, SR-071: base's text): the delegator's message to a run whose Task was deleted gets TASK_NOT_FOUND; anyone else's is unrelated (autobyteus-492)", async () => {
    const h = await harness();
    h.tasks.close("T2"); h.tasks.deleteTask("T2");
    expect(h.tree.tasksOf({ agentRunId: "research" })).toEqual([]);
    await expect(h.send(M, "manager", "research")).resolves.toEqual({ accepted: false, code: "TASK_NOT_FOUND", message: "The Task was deleted, so its task agent cannot continue." });
    await expect(h.send(M, "manager", "nobody")).resolves.toBeNull();
    expect(h.log).toEqual([]);
    // Another run's agent: delivered while it runs, never restored; not this route's once it stopped.
    await expect(h.send(E, "designer", "research")).resolves.toMatchObject({ accepted: true, agentRunId: "research" });
    h.running.delete("research");
    await expect(h.send(E, "designer", "research")).resolves.toBeNull();
    expect(h.restored).not.toHaveBeenCalled();
  });

  it("CR-461-065: the same for a delegated team run, to its coordinator and to any other member; anyone else's, when they do not run, is not this route's", async () => {
    const h = await harness();
    h.tasks.close("T1"); h.tasks.deleteTask("T1");
    expect(h.tree.tasksOf({ teamRunId: "eng" })).toEqual([]);
    for (const member of ["designer", "coder"]) {
      await expect(h.send(M, "manager", member)).resolves.toEqual({ accepted: false, code: "TASK_NOT_FOUND", message: "The Task was deleted, so its task agent cannot continue." });
      h.running.delete(member);
      await expect(h.send(R, "research", member)).resolves.toBeNull();
    }
    expect(h.log).toEqual([]);
  });

  it("S20 (SR-071, R-8 before R-7): a run whose Tasks are all closed is refused as closed even by a run of another Task, as base answered", async () => {
    const h = await harness();
    h.tasks.close("T1");
    await expect(h.send(R, "research", "designer")).resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: ASSIGNER_ONLY_REACTIVATION_MESSAGE });
    expect(h.log).toEqual([]);
  });

  it("SR-072 F-23 (R-8, S10; R-6, S11): a team's member is answered as its run: refused to the assigner while the Task is DONE, continued once it is open", async () => {
    const h = await harness();
    h.tasks.close("T1");
    // "coder" is a member of E, not its coordinator: the same refusal as for the run (R-8), nothing delivered.
    await expect(h.send(M, "manager", "coder")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(h.tasks.isOpen({ teamRunId: "eng" })).toBe(false);
    // After the Task is open again, the assigner's message continues E whichever of its agents it names (model `_admit`).
    h.tasks.setTaskOpen("T1");
    await expect(h.send(M, "manager", "coder")).resolves.toMatchObject({ accepted: true, message: expect.stringContaining("coder continues with its conversation.") });
    expect(h.tasks.isOpen({ teamRunId: "eng" })).toBe(true);
  });

  it("R-8: a run whose Task is closed is refused with the closed text; R-6: its assigner continues it after a reopen, a sub-work run stays closed", async () => {
    const h = await harness();
    h.tasks.close("T1");
    await expect(h.send(P, "pd", "designer")).resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: ASSIGNER_ONLY_REACTIVATION_MESSAGE });
    // The Task is DONE: the assigner's continuation is refused by the Task side.
    await expect(h.send(M, "manager", "designer")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    h.tasks.setTaskOpen("T1");
    const continued = await h.send(M, "manager", "designer");
    expect(continued).toMatchObject({ accepted: true, message: expect.stringContaining("designer continues with its conversation.") });
    expect(h.tasks.isOpen({ teamRunId: "eng" })).toBe(true);
    // Both attempts asked the Task side: the first was refused by its eligibility (DONE) before any reopen was asked
    // (CR-461-072: eligibility, then whether the run can continue, then the commit); the second reopened.
    expect(h.tasks.reopenRequests).toEqual([{ execution: { teamRunId: "eng" }, requestedBy: "manager" }]);
    // A sub-work run is not reopened by a message.
    await expect(h.send(M, "manager", "pd")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    // Only its assigner continues it: another agent of the same run is refused.
    h.tasks.close("T1"); h.tasks.setTaskOpen("T1");
    await expect(h.send(P, "pm", "designer")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
  });

  it("CR-461-072: the assigner's message to its closed run whose saved conversation cannot be read is base's refusal before the reopen: the Task stays closed, nothing reopens", async () => {
    const h = await harness();
    h.tasks.close("T1"); h.tasks.setTaskOpen("T1");
    const unrestorable = { accepted: false as const, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" as const,
      message: "The delegated Team at '/eng' cannot be restored: the saved conversation of its coordinator '/designer' cannot be read (line 2 is not JSON). Its files were left unchanged. Start a new delegation for this work, or restore its saved conversation from a backup." };
    h.restorability.refusal.mockResolvedValue(unrestorable);
    // Base's text, without the "open again" note.
    await expect(h.send(M, "manager", "designer")).resolves.toEqual(unrestorable);
    expect(h.restorability.refusal).toHaveBeenCalledWith(E);
    expect(h.tasks.reopenRequests).toEqual([]);
    expect(h.tasks.isOpen({ teamRunId: "eng" })).toBe(false);
    expect(h.tree.openTaskIdsOf({ teamRunId: "eng" })).toEqual([]);
    expect(h.log).toEqual([]);
    // Its eligibility comes first: a DONE Task is refused as closed, and the run is not asked.
    h.restorability.refusal.mockClear();
    h.tasks.close("T1");
    await expect(h.send(M, "manager", "designer")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(h.restorability.refusal).not.toHaveBeenCalled();
  });

  it("R-9 (autobyteus-492): a run no Task names is unrelated, both ways: delivered while running, not this route's when stopped; R-10: an open run on a peer goes through the peer endpoints", async () => {
    const h = await harness();
    await expect(h.send(LEGACY, "legacy", "designer")).resolves.toMatchObject({ accepted: true, agentRunId: "designer" });
    await expect(h.send(M, "manager", "legacy")).resolves.toMatchObject({ accepted: true, agentRunId: "legacy" });
    h.running.delete("legacy");
    await expect(h.send(M, "manager", "legacy")).resolves.toBeNull();
    expect(h.restored).not.toHaveBeenCalled();
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/remote", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" },
      execution: { agentRunId: "remote_1" }, nodeId: "node-b" });
    await expect(h.send(M, "manager", "remote_1")).resolves.toBeNull();
    // Inside one run: the same run's own route.
    await expect(h.send(E, "coder", "designer")).resolves.toBeNull();
  });

  describe("closedPeerRunRefusal (AR-001, AR-007, DEC-011): a peer run this node's tree holds", () => {
    const linkRemote = async (h: Awaited<ReturnType<typeof harness>>) => h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/remote",
      delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { agentRunId: "remote_1" }, nodeId: "node-b" });

    it("open: no refusal; all its entries on that node closed: TASK_AGENT_RESOURCE_CLOSED; another node or an unknown run: no refusal", async () => {
      const h = await harness();
      await linkRemote(h);
      await expect(h.delivery.closedPeerRunRefusal({ nodeId: "node-b", agentRunId: "remote_1" })).resolves.toBeNull();
      h.tasks.close("T2");
      await expect(h.delivery.closedPeerRunRefusal({ nodeId: "node-b", agentRunId: "remote_1" }))
        .resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: ASSIGNER_ONLY_REACTIVATION_MESSAGE });
      await expect(h.delivery.closedPeerRunRefusal({ nodeId: "node-c", agentRunId: "remote_1" })).resolves.toBeNull();
      await expect(h.delivery.closedPeerRunRefusal({ nodeId: "node-b", agentRunId: "nobody" })).resolves.toBeNull();
    });

    it("entry-form row 13 without node (AR-007): any sender here, in any run, is refused CLOSED by the route itself; nothing is written", async () => {
      const h = await harness();
      await linkRemote(h);
      h.tasks.close("T2");
      for (const [from, sender] of [[M, "manager"], [P, "pd"], [LEGACY, "legacy"]] as const) {
        await expect(h.send(from, sender, "remote_1")).resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: ASSIGNER_ONLY_REACTIVATION_MESSAGE });
      }
      expect(h.log).toEqual([]);
    });
  });

  describe("closure vs. the receiver's gate (AR-017, both orders)", () => {
    it("closure committed first: the delivery's gate-head re-check (from the Task side) refuses with today's text; nothing is written", async () => {
      const h = await harness();
      // The admission passed on the open Task; the closure commits before the receiver's gate takes the message.
      h.beforeReceive.hook = async () => { h.tasks.close("T1"); };
      await expect(h.send(P, "pd", "designer")).resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: ASSIGNER_ONLY_REACTIVATION_MESSAGE });
      expect(h.log).toEqual([]);
    });

    it("delivery first: the message is in both logs; the closure that follows closes the entry (the stop is the run's own, DS-5)", async () => {
      const h = await harness();
      await expect(h.send(P, "pd", "designer")).resolves.toMatchObject({ accepted: true });
      h.tasks.close("T1");
      expect(h.log).toEqual(["receiver-log:eng:m-pd-designer", "sender-log:product:m-pd-designer"]);
      await expect(h.send(P, "pd", "designer")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    });
  });

  it("a receiver that refuses (its root's own refusal) writes nothing on the sender's side", async () => {
    const h = await harness();
    const commitSentToRun = vi.fn();
    const refusing = new CrossRunMessageDelivery({ tree: () => h.tree, tasks: () => h.tasks, senderAddress: async () => null, runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null },
      senderRoot: () => ({ prepareSendToRun: (input) => ({ ok: true, message: { messageId: "m", senderAgentRunId: input.senderIdentity.agentRunId, receiverAgentRunId: input.receiverAgentRunId,
        content: "x", messageType: "agent_message", referenceFiles: [], createdAt: "t" } }), commitSentToRun }),
      receiverRoot: async () => ({ acceptFromRun: async () => ({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AgentRun is not accepting input." }) }),
      runningAgents: { rootOf: () => null }, activeReceiverRoot: () => null });
    await expect(refusing.route({ sender: agent(M, "manager"), senderDisplayName: "manager", targetAgentRunId: "designer", content: "x", messageType: "agent_message", referenceFiles: [] }))
      .resolves.toMatchObject({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT" });
    expect(commitSentToRun).not.toHaveBeenCalled();
  });

  it("SR-076: a refusal after the receiver's durable write is recorded on the sender's side too (TC-13), and answered as the receiver's refusal", async () => {
    const h = await harness();
    const commitSentToRun = vi.fn(async () => undefined);
    const delivery = new CrossRunMessageDelivery({ tree: () => h.tree, tasks: () => h.tasks, senderAddress: async () => null, runFiles: { delegationOfAgent: async () => null }, restorability: { refusal: async () => null },
      senderRoot: () => ({ prepareSendToRun: (input) => ({ ok: true, message: { messageId: "m", senderAgentRunId: input.senderIdentity.agentRunId, receiverAgentRunId: input.receiverAgentRunId,
        content: "x", messageType: "agent_message", referenceFiles: [], createdAt: "t" } }), commitSentToRun }),
      receiverRoot: async () => ({ acceptFromRun: async () => ({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: ASSIGNER_ONLY_REACTIVATION_MESSAGE, recordedByReceiver: true }) }),
      runningAgents: { rootOf: () => null }, activeReceiverRoot: () => null });
    await expect(delivery.route({ sender: agent(M, "manager"), senderDisplayName: "manager", targetAgentRunId: "designer", content: "x", messageType: "agent_message", referenceFiles: [] }))
      .resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: ASSIGNER_ONLY_REACTIVATION_MESSAGE });
    expect(commitSentToRun).toHaveBeenCalledWith(expect.objectContaining({ messageId: "m" }));
  });
});
