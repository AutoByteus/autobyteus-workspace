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

test("a view takes no Retry: a peer row's Retry goes over /ws/run-status (autobyteus-461 SR-090)", () => {
  assert.throws(() => CollaborationStreamClientMessageSchema.parse({ type: "REFRESH_REMOTE_TASK_EXECUTIONS", payload: { root_subject_kind: "agent", root_run_id: "agent-run" } }));
});
