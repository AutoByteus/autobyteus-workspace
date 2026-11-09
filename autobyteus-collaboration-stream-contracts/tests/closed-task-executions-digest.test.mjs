import test from "node:test";
import assert from "node:assert/strict";
import { closedTaskExecutionsDigest } from "../dist/index.js";

// autobyteus-446: the node and the client fingerprint a host's closed task executions with this one function.

test("an empty closed set has a fixed digest", () => {
  assert.equal(closedTaskExecutionsDigest([]), "0:811c9dc5");
});

test("the digest is independent of order and of repeated references", () => {
  const a = { agentRunId: "writer-run" };
  const b = { teamRunId: "review-team" };
  assert.equal(closedTaskExecutionsDigest([a, b]), closedTaskExecutionsDigest([b, a]));
  assert.equal(closedTaskExecutionsDigest([a, b, a]), closedTaskExecutionsDigest([b, a]));
  assert.match(closedTaskExecutionsDigest([a, b]), /^2:[0-9a-f]{8}$/);
});

test("an agent and a team with the same run ID are different closed executions", () => {
  assert.notEqual(closedTaskExecutionsDigest([{ agentRunId: "same" }]), closedTaskExecutionsDigest([{ teamRunId: "same" }]));
});

test("closing and reopening changes the digest and returns to the earlier one", () => {
  const before = closedTaskExecutionsDigest([{ agentRunId: "writer-run" }]);
  const closed = closedTaskExecutionsDigest([{ agentRunId: "writer-run" }, { teamRunId: "review-team" }]);
  assert.notEqual(closed, before);
  assert.equal(closedTaskExecutionsDigest([{ agentRunId: "writer-run" }]), before);
});

test("a known input has a fixed digest, so the node and the browser agree on the same string", () => {
  // Pinned: a change of the algorithm must be deliberate (it changes the value on both sides at once).
  assert.equal(closedTaskExecutionsDigest([{ agentRunId: "a" }]), "1:bb7f09af");
  assert.equal(closedTaskExecutionsDigest([{ agentRunId: "writer-run" }, { teamRunId: "review-team" }]), "2:0c0e8252");
});
