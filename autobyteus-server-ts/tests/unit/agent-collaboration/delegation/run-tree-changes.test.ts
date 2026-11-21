import { describe, expect, it } from "vitest";
import { applyRunTreeChange } from "@autobyteus/collaboration-stream-contracts";
import { RunTreeView } from "../../../../src/agent-collaboration/delegation/run-tree-view.js";
import { RunTreeSessionRows, diffRunTree } from "../../../../src/agent-collaboration/delegation/run-tree-changes.js";
import type { SubtreeRow } from "../../../../src/agent-collaboration/delegation/collaboration-tree.js";
import { createAgentRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { agentChildRow, delegatedChild } from "../../../helpers/child-rows-feed.js";

/**
 * autobyteus-461 SR-084: a view's tree on its stream. The snapshot's rows are read at its base and are the rows the query
 * gives; each later notice reads the tree again and sends what changed (rows that came, keys that left, rows that changed),
 * so a client that applies the changes to its snapshot holds the rows the query gives now.
 */
const run = createAgentRootExecutionIdentity("delegating");
const harness = () => {
  const state = { rows: [] as SubtreeRow[], addresses: new Map<string, string>() };
  const runTree = new RunTreeView({
    tree: { collaborationTreeOf: () => ({ rows: () => state.rows }) } as never,
    ownTreeOf: async () => ({ kind: "agent", agentRunId: "delegator", address: "/delegator" }),
    projection: { rowOf: async (row) => "agentRunId" in row.run
      ? agentChildRow(row.run.agentRunId, state.addresses.get(row.run.agentRunId) ?? `/${row.run.agentRunId}`) : null },
    isLiveTeamRun: () => true,
  });
  return { state, runTree };
};

describe("RunTreeSessionRows (SR-084)", () => {
  it("the snapshot is the tree read at the base, and the query gives the same rows; a row added after the base comes as a change", async () => {
    const { state, runTree } = harness();
    state.rows = [delegatedChild("writer", run)];
    const atBase = runTree.readAtBase(run);
    // A row added between the base and the records' read is not in the snapshot: it is a queued notice's change.
    state.rows = [...state.rows, delegatedChild("reviewer", run)];
    const session = await RunTreeSessionRows.open(runTree, run, atBase);
    expect(session.current.map((row) => row.key)).toEqual(["agent:delegator", "agent:writer"]);
    const change = await session.next();
    expect(change.added.map((row) => [row.key, row.parentKey, row.depth])).toEqual([["agent:reviewer", "agent:delegator", 1]]);
    expect(change.removed).toEqual([]);
    expect(change.updated).toEqual([]);
    expect(session.current).toEqual(await runTree.rowsOf(run));
  });

  it("a closed row leaves by its key, a changed row is replaced, and a notice with nothing new is an empty change (its number still counts)", async () => {
    const { state, runTree } = harness();
    state.rows = [delegatedChild("writer", run), delegatedChild("reviewer", run)];
    const session = await RunTreeSessionRows.open(runTree, run, runTree.readAtBase(run));
    state.rows = [delegatedChild("reviewer", run)];
    state.addresses.set("reviewer", "/senior_reviewer");
    const change = await session.next();
    expect(change.removed).toEqual(["agent:writer"]);
    expect(change.updated.map((row) => [row.key, row.name])).toEqual([["agent:reviewer", "senior reviewer"]]);
    expect(await session.next()).toEqual({ added: [], removed: [], updated: [] });
  });

  it("a client's tree after applying each change is the query's rows, in display order (a row nested under a row that came before it)", async () => {
    const { state, runTree } = harness();
    state.rows = [delegatedChild("writer", run)];
    const session = await RunTreeSessionRows.open(runTree, run, runTree.readAtBase(run));
    let client = [...session.current];
    const helper = { ...delegatedChild("helper", createAgentRootExecutionIdentity("writer")), delegatorAgentRunId: "writer" };
    state.rows = [...state.rows, delegatedChild("reviewer", run), helper];
    client = applyRunTreeChange(client, await session.next());
    expect(client).toEqual(await runTree.rowsOf(run));
    expect(client.map((row) => row.key)).toEqual(["agent:delegator", "agent:writer", "agent:helper", "agent:reviewer"]);
    state.rows = [delegatedChild("reviewer", run)];
    client = applyRunTreeChange(client, await session.next());
    expect(client).toEqual(await runTree.rowsOf(run));
  });

  it("the diff compares a row's content, not the order its fields were built in", () => {
    const row = { key: "agent:a", parentKey: null, depth: 0, kind: "agent" as const, name: "a", address: "/a", openTarget: null, statusIds: ["a"] };
    const reordered = { statusIds: ["a"], openTarget: null, address: "/a", name: "a", kind: "agent" as const, depth: 0, parentKey: null, key: "agent:a" };
    expect(diffRunTree([row], [reordered])).toEqual({ added: [], removed: [], updated: [] });
  });
});
