import test from "node:test";
import assert from "node:assert/strict";
import { remoteAgentStatusSchema } from "../dist/index.js";

test("a peer's agent status is one of the agent status words", () => {
  for (const status of ["offline", "initializing", "idle", "running", "error"]) assert.equal(remoteAgentStatusSchema.parse(status), status);
  assert.throws(() => remoteAgentStatusSchema.parse("waiting"));
});
