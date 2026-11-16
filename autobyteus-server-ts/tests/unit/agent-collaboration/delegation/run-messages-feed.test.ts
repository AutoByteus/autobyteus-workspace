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
    w.streams.messages.publish({ message: message("x1", "worker-lead", "helper"), senderRun: W, receiverRun: H });
    expect(atM.map((event) => event.event)).toEqual([{ kind: "communication", message: message("x1", "worker-lead", "helper") }]);
    expect(atW.map((event) => event.event)).toEqual([{ eventSourceType: "COMMUNICATION", payload: message("x1", "worker-lead", "helper") }]);
    expect(atH).toHaveLength(1);
    expect(w.streams.streamOf(M).getLivePosition()).toMatchObject({ changeSequence: 1, lastMessageChangeSequence: 1 });
  });

  it("a message inside the Manager reaches only its view", async () => {
    const w = await world();
    const [atM, atW, atH] = [w.seen(M), w.seen(W), w.seen(H)];
    w.streams.messages.publish({ message: message("x3", "manager", "manager-mate"), senderRun: M, receiverRun: M });
    expect([atM.length, atW.length, atH.length]).toEqual([1, 0, 0]);
  });

  it("SR-074, one rule: a message between a run below X and X's own delegator is not in X's view; the Manager's and the helper's views show it", async () => {
    const w = await world();
    const [atM, atW, atH] = [w.seen(M), w.seen(W), w.seen(H)];
    // The worker's view: the helper is in its tree, the Manager is not, and neither is the worker's own.
    w.streams.messages.publish({ message: message("x6", "manager", "helper"), senderRun: M, receiverRun: H });
    expect([atM.length, atW.length, atH.length]).toEqual([1, 0, 1]);
  });

  it("SR-074: a closed run is out of its delegator's tree: messages between closed runs below leave the Manager's view; its own agents' stay", async () => {
    const w = await world();
    w.tasks.close("T1");
    const [atM, atW] = [w.seen(M), w.seen(W)];
    w.streams.messages.publish({ message: message("x4", "worker-lead", "helper"), senderRun: W, receiverRun: H });
    expect([atM.length, atW.length]).toEqual([0, 1]);
    w.streams.messages.publish({ message: message("x7", "worker-lead", "manager"), senderRun: W, receiverRun: M });
    expect(atM).toHaveLength(1);
  });

  it("a view no one opened gets nothing; it reads the logs when it opens", async () => {
    const w = await world();
    const atH = w.seen(H);
    w.streams.messages.publish({ message: message("x5", "worker-lead", "helper"), senderRun: W, receiverRun: H });
    expect(atH).toHaveLength(1);
    expect(w.streams.streamOf(M).getLivePosition()).toMatchObject({ changeSequence: 0, lastMessageChangeSequence: 0 });
  });
});
