import test from "node:test";
import assert from "node:assert/strict";
import { taskExecutionReferenceKey } from "../dist/index.js";

test("the one task-execution key: agent:<id> or team:<id> (autobyteus-435)", () => {
  assert.equal(taskExecutionReferenceKey({ agentRunId: "writer-run" }), "agent:writer-run");
  assert.equal(taskExecutionReferenceKey({ teamRunId: "review-team" }), "team:review-team");
});
