// Narrow implementation-readiness probe of the unchanged production candidate.
// The synthetic callback reproduces an approved cleanup-failure branch; it does
// not establish product reachability or certify provider / API / E2E behavior.
import assert from 'node:assert/strict';
import { AgentRunActivationCandidate } from '../../../../autobyteus-server-ts/src/agent-execution/services/agent-run-activation-candidate.ts';

let attempts = 0;
let providerRecovered = false;
const candidate = new AgentRunActivationCandidate({
  runId: 'test-owned-private-candidate', runtimeKind: 'codex_app_server',
  platformAgentRunId: 'test-owned-provider-conversation',
  publish() { throw new Error('No publication expected'); },
  async abort() {
    attempts++;
    return providerRecovered ? { kind: 'aborted' }
      : { kind: 'quarantined', error: new Error('Synthetic first cleanup failure') };
  },
});
const first = await candidate.abort();
assert.equal(first.kind, 'quarantined');
assert.equal(attempts, 1);
providerRecovered = true;
const retry = await candidate.abort();
assert.equal(retry, first);
assert.equal(retry.kind, 'quarantined');
assert.equal(attempts, 1, 'Public abort did not reattempt cleanup after provider recovery');

let successfulAttempts = 0;
const successful = new AgentRunActivationCandidate({
  runId: 'test-owned-success-control', runtimeKind: 'codex_app_server',
  platformAgentRunId: 'test-owned-success-conversation',
  publish() { throw new Error('No publication expected'); },
  async abort() { successfulAttempts++; return { kind: 'aborted' }; },
});
assert.equal((await successful.abort()).kind, 'aborted');
assert.equal((await successful.abort()).kind, 'aborted');
assert.equal(successfulAttempts, 1);
console.log(JSON.stringify({
  result: 'PASS — current-boundary obstruction reproduced, NOT implementation acceptance',
  firstAbort: first.kind, retryAbort: retry.kind, cleanupAttempts: attempts,
  successfulControlAttempts: successfulAttempts,
  providerCalls: 0, applicationDataWrites: 0,
}, null, 2));
