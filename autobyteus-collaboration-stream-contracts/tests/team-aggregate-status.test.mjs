import test from "node:test";
import assert from "node:assert/strict";
import { foldTeamAggregateStatus } from "../dist/index.js";

test("the shared team status fold ranks offline < idle < error < initializing < running", () => {
  assert.equal(foldTeamAggregateStatus([], "live"), "offline");
  assert.equal(foldTeamAggregateStatus(["idle", "offline"], "live"), "idle");
  assert.equal(foldTeamAggregateStatus(["idle", "error"], "live"), "error");
  assert.equal(foldTeamAggregateStatus(["error", "initializing", "idle"], "live"), "initializing");
  assert.equal(foldTeamAggregateStatus(["initializing", " RUNNING "], "live"), "running");
  assert.equal(foldTeamAggregateStatus(["unexpected", null, undefined], "live"), "offline");
  // Stored statuses cannot be running work.
  assert.equal(foldTeamAggregateStatus(["running", "idle"], "historical"), "idle");
});
