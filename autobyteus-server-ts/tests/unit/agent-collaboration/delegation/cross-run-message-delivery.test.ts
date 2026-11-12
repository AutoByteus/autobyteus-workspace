import { readerOfAgentRunIds } from "../../../helpers/run-agents-reader.js";
import { describe, expect, it, vi } from "vitest";
import { CrossRunMessageDelivery, OTHER_TASK_REFUSAL, type CrossRunReceiverRoot } from "../../../../src/agent-collaboration/communication/cross-run-message-delivery.js";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import { createCollaborationMemberExecutionIdentity, rootExecutionIdentityKey, type RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ASSIGNER_ONLY_REACTIVATION_MESSAGE } from "../../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskDelegationError } from "../../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";

/**
 * autobyteus-461 design DS-2 (`CrossRunMessageDelivery`), contract §2.2, the run-ID cases R-1 … R-10, and the closure race
 * of "Ordering Without A Shared Queue" (AR-017): M assigned T1 to E; E's designer handed sub-work of T1 to P; P's designer
 * to I; M assigned T2 to R.
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
      return { accepted: true };
    },
  });
  const beforeReceive = { hook: async () => undefined as void };
  const delivery = new CrossRunMessageDelivery({ tree: () => tree, tasks: () => tasks, senderRoot: (r) => senderRoot(r) as never, senderAddress: async () => null,
    receiverRoot: async (r) => { await beforeReceive.hook(); return receiverRoot(r); } });
  const send = (from: RootExecutionIdentity, sender: string, target: string) => delivery.route({ sender: agent(from, sender), senderDisplayName: sender,
    targetAgentRunId: target, content: "hello", messageType: "agent_message", referenceFiles: [] });
  const sendAs = (from: RootExecutionIdentity, sender: string, target: string, shownAs: string) => delivery.route({ sender: agent(from, sender),
    senderDisplayName: sender, targetAgentRunId: target, shownAs, content: "hello", messageType: "agent_message", referenceFiles: [] });
  return { tasks, tree, log, send, sendAs, beforeReceive };
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
  });

  it("by address, the result names the address the sender used (CR-461-017)", async () => {
    const h = await harness();
    const result = await h.sendAs(E, "coder", "manager", "/manager");
    expect(result).toMatchObject({ accepted: true, agentRunId: "manager", message: "Delivered message to /manager." });
  });

  it("R-7: runs of different Tasks are refused with today's text; nothing is written", async () => {
    const h = await harness();
    await expect(h.send(P, "pd", "research")).resolves.toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CONFLICT", message: OTHER_TASK_REFUSAL });
    expect(h.log).toEqual([]);
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
    // Both attempts asked the Task side, which re-validates every condition: the first was refused (DONE), the second reopened.
    expect(h.tasks.reopenRequests).toEqual([{ execution: { teamRunId: "eng" }, requestedBy: "manager" }, { execution: { teamRunId: "eng" }, requestedBy: "manager" }]);
    // A sub-work run is not reopened by a message.
    await expect(h.send(M, "manager", "pd")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    // Only its assigner continues it: another agent of the same run is refused.
    h.tasks.close("T1"); h.tasks.setTaskOpen("T1");
    await expect(h.send(P, "pm", "designer")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
  });

  it("R-9: a run no Task relates to (a legacy run) is not this route's; R-10: a run on a peer goes through the peer endpoints", async () => {
    const h = await harness();
    await expect(h.send(LEGACY, "legacy", "designer")).resolves.toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CONFLICT" });
    await expect(h.send(M, "manager", "legacy")).resolves.toBeNull();
    await h.tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/remote", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" },
      execution: { agentRunId: "remote_1" }, nodeId: "node-b" });
    await expect(h.send(M, "manager", "remote_1")).resolves.toBeNull();
    // Inside one run: the same run's own route.
    await expect(h.send(E, "coder", "designer")).resolves.toBeNull();
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
    const refusing = new CrossRunMessageDelivery({ tree: () => h.tree, tasks: () => h.tasks, senderAddress: async () => null,
      senderRoot: () => ({ prepareSendToRun: (input) => ({ ok: true, message: { messageId: "m", senderAgentRunId: input.senderIdentity.agentRunId, receiverAgentRunId: input.receiverAgentRunId,
        content: "x", messageType: "agent_message", referenceFiles: [], createdAt: "t" } }), commitSentToRun: vi.fn() }),
      receiverRoot: async () => ({ acceptFromRun: async () => ({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AgentRun is not accepting input." }) }) });
    await expect(refusing.route({ sender: agent(M, "manager"), senderDisplayName: "manager", targetAgentRunId: "designer", content: "x", messageType: "agent_message", referenceFiles: [] }))
      .resolves.toMatchObject({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT" });
  });
});
