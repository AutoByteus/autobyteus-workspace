import { describe, expect, it } from "vitest";
import { DelegationIndex } from "../../../../src/agent-collaboration/delegation/delegation-index.js";
import type { RootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../../fixtures/task-execution-resource-fixtures.js";
import { readerOfAgents } from "../../../helpers/run-agents-reader.js";

/**
 * autobyteus-461 SR-060 (contract §4, ARCH-REV-035): the tree is a forest, one tree per run the user started. A node's
 * tree is derived by walking up its parents, never stored: a run whose own entries go with their Task is the top of a
 * tree of its own, with its subtree. The map's rows are the open subtree, each row with the run that delegated it.
 */
const M: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const C: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "worker" };
const G: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "helper" };

const harness = async () => {
  const tasks = new InMemoryTaskExecutionResources();
  const tree = new DelegationIndex(() => tasks, readerOfAgents(async (run) => [{ agentRunId: run.rootRunId, address: `/${run.rootRunId}`, agentDefinitionId: run.rootRunId }]));
  tree.build(); tasks.setEntriesListener(tree);
  tasks.addTask("T1"); tasks.addTask("T2");
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/worker", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { agentRunId: "worker" } });
  await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/helper", delegatedFrom: { delegatingRun: C, delegatorAgentRunId: "worker" }, execution: { agentRunId: "helper" } });
  return { tasks, tree };
};

describe("the DelegationIndex as a forest", () => {
  it("a node's tree is the run the user started at the top of its chain; byRunId and byAgentRunId answer directly", async () => {
    const { tree } = await harness();
    expect(tree.topOf(G)).toEqual(M);
    expect(tree.topOf(M)).toEqual(M);
    expect(tree.nodeOf(G)).toMatchObject({ run: G, top: M, parent: { delegatingRun: C, delegatorAgentRunId: "worker" } });
    expect(tree.nodeOf({ rootSubjectKind: "agent", rootRunId: "nobody" })).toBeNull();
    await expect(tree.agentOf("helper")).resolves.toEqual({ run: G, address: "/helper", top: M });
  });

  it("the rows under a run are its open subtree, nested by the run that delegated each", async () => {
    const { tree } = await harness();
    expect(tree.collaborationTreeOf(M).rows().map((row) => [row.parent.rootRunId, "agentRunId" in row.run ? row.run.agentRunId : null]))
      .toEqual([["manager", "worker"], ["worker", "helper"]]);
    expect(tree.collaborationTreeOf(C).rows().map((row) => row.parent.rootRunId)).toEqual(["worker"]);
  });

  it("when a run's own entries go with their Task, it is the top of a tree of its own, with its subtree", async () => {
    const { tasks, tree } = await harness();
    tasks.damaged.add("T1");
    tasks.changed("T1");
    expect(tree.topOf(G)).toEqual(C);
    expect(tree.topOf(C)).toEqual(C);
    await expect(tree.agentOf("helper")).resolves.toMatchObject({ top: C });
    expect(tree.collaborationTreeOf(M).rows()).toEqual([]);
    expect(tree.collaborationTreeOf(C).rows().map((row) => "agentRunId" in row.run ? row.run.agentRunId : null)).toEqual(["helper"]);
  });

  it("a row under a row is reported live to every run above it: when delegated, and when its Task closes (CR-461-033)", async () => {
    const tasks = new InMemoryTaskExecutionResources();
    const tree = new DelegationIndex(() => tasks, readerOfAgents(async (run) => [{ agentRunId: run.rootRunId, address: `/${run.rootRunId}`, agentDefinitionId: null }]));
    tree.build(); tasks.setEntriesListener(tree);
    const reports: Array<[string, string[], string[]]> = [];
    tree.subscribeChildRows((change) => reports.push([change.run.rootRunId,
      change.added.map((row) => `${row.parent.rootRunId}>${"agentRunId" in row.run ? row.run.agentRunId : ""}`),
      change.removed.map((run) => "agentRunId" in run ? run.agentRunId : "")]));
    tasks.addTask("T1"); tasks.addTask("T2");
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T1", recipientAddress: "/worker", delegatedFrom: { delegatingRun: M, delegatorAgentRunId: "manager" }, execution: { agentRunId: "worker" } });
    reports.length = 0;
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: "T2", recipientAddress: "/helper", delegatedFrom: { delegatingRun: C, delegatorAgentRunId: "worker" }, execution: { agentRunId: "helper" } });
    expect(reports.sort()).toEqual([["manager", ["worker>helper"], []], ["worker", ["worker>helper"], []]]);
    reports.length = 0;
    tasks.close("T2");
    expect(reports.sort()).toEqual([["manager", [], ["helper"]], ["worker", [], ["helper"]]]);
  });
});
