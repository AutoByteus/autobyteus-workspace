import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTeamStreamServerMessage } from "../dist/index.js";

const row = (key, parentKey, depth, kind = "team_member") => ({ key, parentKey, depth, kind, name: key, address: `/${key}`,
  openTarget: { runKind: "agent_team", runId: "squad", agentRunId: key }, statusIds: [key] });

test("team stream (autobyteus-461 SR-084): the tree snapshot after the view snapshot, then numbered tree changes", () => {
  const snapshot = { type: "RUN_TREE_SNAPSHOT", payload: { base_change_sequence: 0, rows: [row("team:squad", null, 0, "team"), row("lead", "team:squad", 1)] } };
  assert.deepEqual(parseTeamStreamServerMessage(snapshot), snapshot);
  const changed = { type: "RUN_TREE_CHANGED", payload: { change_sequence: 3, added: [], removed: ["agent:helper"], updated: [] } };
  assert.deepEqual(parseTeamStreamServerMessage(changed), changed);
  assert.throws(() => parseTeamStreamServerMessage({ type: "RUN_TREE_CHANGED", payload: { added: [], removed: [], updated: [] } }));
});
