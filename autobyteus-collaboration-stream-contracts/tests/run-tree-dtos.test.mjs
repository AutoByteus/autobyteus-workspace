import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRunTreeChange, CollaborationStreamServerMessageSchema, runTreeDtoSchema, runTreeRowDtoSchema } from "../dist/index.js";

const row = (key, parentKey, depth, extra = {}) => ({ key, parentKey, depth, kind: "agent", name: key, address: `/${key}`,
  openTarget: { runKind: "agent", runId: key, agentRunId: key }, statusIds: [key], ...extra });

test("run-tree (autobyteus-461 SR-084): a row with its launch and peer answer; a row error has no target; unknown fields are refused", () => {
  const launched = row("writer", "manager", 1, { launch: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus", llmConfig: { reasoning_effort: "xhigh" },
    autoExecuteTools: false, workspaceRootPath: "/w", source: { origin: "settings", fallbacks: [] }, ownSource: true } });
  assert.deepEqual(runTreeRowDtoSchema.parse(launched), launched);
  const peer = row("publisher", "manager", 1, { kind: "peer_agent", openTarget: { runKind: "agent", runId: "p", agentRunId: "p", nodeId: "beta" },
    peer: { nodeId: "beta", nodeName: "beta-node", title: null, reachable: null } });
  assert.deepEqual(runTreeRowDtoSchema.parse(peer), peer);
  assert.equal(runTreeRowDtoSchema.parse(row("orphan", null, 0, { kind: "team", openTarget: null })).openTarget, null);
  assert.throws(() => runTreeRowDtoSchema.parse({ ...row("a", null, 0), status: "running" }));
  assert.throws(() => runTreeRowDtoSchema.parse({ ...row("a", null, 0), kind: "member" }));
  assert.deepEqual(runTreeDtoSchema.parse({ kind: "agent", runId: "manager", rows: [row("manager", null, 0)] }).rows.length, 1);
});

test("run-tree (autobyteus-669 S-4): a row names its run's definition, optionally; an empty one is refused", () => {
  const withDefinition = row("writer", "manager", 1, { definitionId: "release-notes-writer" });
  assert.deepEqual(runTreeRowDtoSchema.parse(withDefinition), withDefinition);
  assert.equal(runTreeRowDtoSchema.parse(row("peer", null, 0)).definitionId, undefined);
  assert.throws(() => runTreeRowDtoSchema.parse(row("a", null, 0, { definitionId: "" })));
});

test("run-tree: the view stream's tree snapshot and a numbered change event (agent and org views)", () => {
  const snapshot = { type: "RUN_TREE_SNAPSHOT", payload: { root_subject_kind: "agent", root_run_id: "manager", base_change_sequence: 4, rows: [row("manager", null, 0)] } };
  assert.deepEqual(CollaborationStreamServerMessageSchema.parse(snapshot), snapshot);
  for (const root_subject_kind of ["agent", "agent_org"]) {
    const event = { type: "ROOT_EXECUTION_EVENT", payload: { root_subject_kind, root_run_id: "r", change_sequence: 5,
      event: { kind: "run_tree_changed", added: [row("writer", "manager", 1)], removed: ["agent:old"], updated: [] } } };
    assert.deepEqual(CollaborationStreamServerMessageSchema.parse(event), event);
  }
});

test("run-tree: a client applies a change to the rows it has, in display order (a new row under its parent, siblings in the order they came)", () => {
  const rows = [row("manager", null, 0), row("writer", "manager", 1), row("reviewer", "manager", 1)];
  const next = applyRunTreeChange(rows, { added: [row("helper", "writer", 2)], removed: ["reviewer"], updated: [{ ...row("writer", "manager", 1), name: "lead writer" }] });
  assert.deepEqual(next.map((r) => [r.key, r.name]), [["manager", "manager"], ["writer", "lead writer"], ["helper", "helper"]]);
  assert.deepEqual(applyRunTreeChange(next, { added: [], removed: [], updated: [] }), next);
});
