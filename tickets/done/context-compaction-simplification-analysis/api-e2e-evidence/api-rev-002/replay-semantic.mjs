// Retained-output replay only: no provider, server, or credentials involved.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { assertNoInventedPlanChanges } from '../../../../../test-support/live-e2e/compaction-quality-checks.ts';
const file = (name) => new URL(name, import.meta.url);
const repeated = JSON.parse(fs.readFileSync(file('semantic-final-observations.json'), 'utf8'))
  .find((record) => record.event === 'semantic_repeated');
let error;
try { assertNoInventedPlanChanges(repeated.summary); } catch (cause) { error = cause.message; }
assert.equal(error, 'LIVE_E2E_QUALITY_PLANNED_WORK_REPORTED_COMPLETE');
const evidence = JSON.parse(fs.readFileSync(file('API-F005-replay.json'), 'utf8'));
Object.assign(evidence, {
  replayedAt: new Date().toISOString(), observedError: error,
  helperSha256: crypto.createHash('sha256').update(fs.readFileSync(file('../../../../../test-support/live-e2e/compaction-quality-checks.ts'))).digest('hex'),
  replayMode: 'Deterministic retained actual output; no new provider call',
  command: 'node --experimental-strip-types tickets/in-progress/context-compaction-simplification-analysis/api-e2e-evidence/api-rev-002/replay-semantic.mjs',
});
fs.writeFileSync(file('API-F005-replay.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(evidence.replayResult, error);
