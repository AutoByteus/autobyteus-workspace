import { test } from "node:test";
import assert from "node:assert/strict";
import { teamAgentStatusDtoSchema } from "../dist/index.js";

test("autobyteus-448: a team member's status carries the required running background task count", () => {
  const status = { agent_run_id: "helper", member_address: "/squad/helper", status: "idle", background_tasks_running: 1,
    trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null };
  assert.equal(teamAgentStatusDtoSchema.parse(status).background_tasks_running, 1);
  const { background_tasks_running: _count, ...withoutCount } = status;
  assert.throws(() => teamAgentStatusDtoSchema.parse(withoutCount));
  assert.throws(() => teamAgentStatusDtoSchema.parse({ ...status, background_tasks_running: -1 }));
});
