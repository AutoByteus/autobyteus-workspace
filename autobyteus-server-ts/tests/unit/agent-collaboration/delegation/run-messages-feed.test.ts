import { describe, expect, it } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { SequencedRootEvent } from "../../../../src/agent-collaboration/delegation/run-view-stream.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { NO_RUN_PARTS } from "../../../helpers/run-agents-reader.js";
import { testViewStreams } from "../../../helpers/view-streams.js";

/**
 * autobyteus-461 SR-072, SR-074 (CR-461-054, -056): the node's message feed. A committed message is numbered, once, as its
 * kind's message event in the open view of each of its two runs and of every run above either, when base's in-view rule
 * holds for that view (both agents' runs in its tree, X and its open rows, or one of them X); a run whose view no one
 * opened gets nothing; the message moves each view's `lastMessageChangeSequence`.
 */
const M = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const W = { rootSubjectKind: "agent_team" as const, rootRunId: "worker" };
const H = { rootSubjectKind: "agent" as const, rootRunId: "helper" };
const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string) => ({ messageId, senderAgentRunId, receiverAgentRunId,
  content: "Status?", messageType: "agent_message", referenceFiles: [], createdAt: "2026-11-13T00:00:00.000Z" });

const parties = (sender: string, receiver: string) => ({ sender: { agentRunId: sender, address: `/${sender}`, nodeName: null },
  receiver: { agentRunId: receiver, address: `/${receiver}`, nodeName: null } });
type Side = typeof M | typeof W | typeof H | Readonly<{ rootSubjectKind: "agent" | "agent_team" | "agent_org"; rootRunId: string }>;
/** A committed message between two local runs, as its publishing commit hands it to the feed (related by default). */
const publish = (w: Awaited<ReturnType<typeof world>>, msg: ReturnType<typeof message>, sender: Side, receiver: Side,
  relation: "same_run" | "related" | "unrelated" = sender.rootRunId === receiver.rootRunId ? "same_run" : "related") =>
  w.streams.messages.publish({ message: msg, relation, sender: { run: sender }, receiver: { run: receiver }, parties: parties(msg.senderAgentRunId, msg.receiverAgentRunId) });

const world = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, NO_RUN_PARTS);
  tree.build(); tasks.setEntriesListener(tree);
  tasks.addTask("T1");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/worker", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" },
    execution: { teamRunId: "worker" }, teamCoordinatorAgentRunId: "worker-lead" });
  await tasks.linkNewTaskExecution({ role: "subWork", recipientAddress: "/helper", delegatedFrom: { delegatingRun: W, delegatorAgentRunId: "worker-lead" },
    execution: { agentRunId: "helper" } });
  const streams = testViewStreams(tree);
  const seen = (run: typeof M | typeof W | typeof H) => {
    const events: SequencedRootEvent<unknown>[] = [];
    streams.streamOf(run).subscribe((event) => { events.push(event); });
    return events;
  };
  return { tasks, streams, seen };
};

describe("RunMessagesFeed (SR-072)", () => {
  it("a message between the worker and its helper is numbered once in the helper's, the worker's and the Manager's views, as each kind's message event", async () => {
    const w = await world();
    const [atM, atW, atH] = [w.seen(M), w.seen(W), w.seen(H)];
    publish(w, message("x1", "worker-lead", "helper"), W, H);
    // An Agent root's event carries the message's parties (autobyteus-565); a Team's does not.
    expect(atM.map((event) => event.event)).toEqual([{ kind: "communication", message: message("x1", "worker-lead", "helper"), parties: parties("worker-lead", "helper") }]);
    expect(atW.map((event) => event.event)).toEqual([{ eventSourceType: "COMMUNICATION", payload: message("x1", "worker-lead", "helper") }]);
    expect(atH).toHaveLength(1);
    expect(w.streams.streamOf(M).getLivePosition()).toMatchObject({ changeSequence: 1, lastMessageChangeSequence: 1 });
  });

  it("a message inside the Manager reaches only its view", async () => {
    const w = await world();
    const [atM, atW, atH] = [w.seen(M), w.seen(W), w.seen(H)];
    publish(w, message("x3", "manager", "manager-mate"), M, M);
    expect([atM.length, atW.length, atH.length]).toEqual([1, 0, 0]);
  });

  it("SR-074, one rule: a message between a run below X and X's own delegator is not in X's view; the Manager's and the helper's views show it", async () => {
    const w = await world();
    const [atM, atW, atH] = [w.seen(M), w.seen(W), w.seen(H)];
    // The worker's view: the helper is in its tree, the Manager is not, and neither is the worker's own.
    publish(w, message("x6", "manager", "helper"), M, H);
    expect([atM.length, atW.length, atH.length]).toEqual([1, 0, 1]);
  });

  it("SR-074: a closed run is out of its delegator's tree: messages between closed runs below leave the Manager's view; its own agents' stay", async () => {
    const w = await world();
    w.tasks.close("T1");
    const [atM, atW] = [w.seen(M), w.seen(W)];
    publish(w, message("x4", "worker-lead", "helper"), W, H);
    expect([atM.length, atW.length]).toEqual([0, 1]);
    publish(w, message("x7", "worker-lead", "manager"), W, M);
    expect(atM).toHaveLength(1);
  });

  it("a view no one opened gets nothing; it reads the logs when it opens", async () => {
    const w = await world();
    const atH = w.seen(H);
    publish(w, message("x5", "worker-lead", "helper"), W, H);
    expect(atH).toHaveLength(1);
    expect(w.streams.streamOf(M).getLivePosition()).toMatchObject({ changeSequence: 0, lastMessageChangeSequence: 0 });
  });

  describe("autobyteus-565: unrelated and remote messages, by MessageViewScope", () => {
    const P = { rootSubjectKind: "agent" as const, rootRunId: "other-pm" };
    const remoteParties = { sender: { agentRunId: "linux-pm", address: "/project_task_manager", nodeName: "ryan-ai-linux" },
      receiver: { agentRunId: "manager", address: "/project_task_manager", nodeName: null } };

    it("an unrelated message reaches only the view of an Agent root that is one of its runs, not the runs above, never a Team's", async () => {
      const w = await world();
      const [atM, atW, atH, atP] = [w.seen(M), w.seen(W), w.seen(H), w.seen(P)];
      publish(w, message("u1", "manager", "other-pm"), M, P, "unrelated");
      expect([atM.length, atP.length]).toEqual([1, 1]);
      // The helper (an Agent root below W) talks with the other PM: its own view only; the worker (Team) and Manager above do not.
      publish(w, message("u2", "helper", "other-pm"), H, P, "unrelated");
      expect([atM.length, atW.length, atH.length, atP.length]).toEqual([1, 0, 1, 2]);
      // A Team member and an unrelated run: no Team view shows it (autobyteus-492 DEC-014 kept there).
      publish(w, message("u3", "worker-lead", "other-pm"), W, P, "unrelated");
      expect([atM.length, atW.length, atP.length]).toEqual([1, 0, 3]);
    });

    it("a message with another node reaches only its local Agent root's own view, with the remote party's node", async () => {
      const w = await world();
      const [atM, atW, atH] = [w.seen(M), w.seen(W), w.seen(H)];
      w.streams.messages.publish({ message: message("r1", "linux-pm", "manager"), relation: "remote", sender: { nodeId: "srv_linux" }, receiver: { run: M }, parties: remoteParties });
      expect(atM.map((event) => event.event)).toEqual([{ kind: "communication", message: message("r1", "linux-pm", "manager"), parties: remoteParties }]);
      w.streams.messages.publish({ message: message("r2", "helper", "linux-pm"), relation: "remote", sender: { run: H }, receiver: { nodeId: "srv_linux" }, parties: remoteParties });
      w.streams.messages.publish({ message: message("r3", "worker-lead", "linux-pm"), relation: "remote", sender: { run: W }, receiver: { nodeId: "srv_linux" }, parties: remoteParties });
      expect([atM.length, atW.length, atH.length]).toEqual([1, 0, 1]);
    });
  });
});

