import test from "node:test";
import assert from "node:assert/strict";
import { CollaborationStreamClientMessageSchema, RootExecutionEventDtoSchema } from "../dist/index.js";

test("a view carries no remote rows or their summaries: a peer run is a row of the run's tree (autobyteus-461 SR-084)", () => {
  for (const root_subject_kind of ["agent", "agent_org"]) {
    for (const kind of ["remote_task_execution_started", "remote_task_execution_summary"]) {
      assert.throws(() => RootExecutionEventDtoSchema.parse({ root_subject_kind, root_run_id: "root-run", change_sequence: 4, event: { kind } }));
    }
  }
});

test("Retry is a root command without a target", () => {
  const refresh = { type: "REFRESH_REMOTE_TASK_EXECUTIONS", payload: { root_subject_kind: "agent", root_run_id: "host-run" } };
  assert.deepEqual(CollaborationStreamClientMessageSchema.parse(refresh), refresh);
  assert.throws(() => CollaborationStreamClientMessageSchema.parse({ ...refresh, payload: { ...refresh.payload, target_agent_run_id: "x" } }));
});
