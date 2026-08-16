import fs from 'node:fs';
import path from 'node:path';
import {
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  serverRoot,
} from '../../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

const runtimeRoot = path.join(serverRoot, 'tests/.tmp/api-rev-004-live-20260815-1');
const databaseUrl = `file://${path.join(serverRoot, 'db/api-rev-004-live-20260815-1.db')}`;
const database = resolveTestDatabaseLocation(databaseUrl);
await removeOwnedTestRuntime(runtimeRoot, database);
const candidates = [
  runtimeRoot,
  database.databasePath,
  database.rootKeyPath,
  `${database.databasePath}-wal`,
  `${database.databasePath}-shm`,
  `${database.databasePath}-journal`,
];
const result = {
  status: candidates.every((candidate) => !fs.existsSync(candidate)) ? 'PASS' : 'FAIL',
  removedOwnedCandidates: Object.fromEntries(candidates.map((candidate) => [candidate, !fs.existsSync(candidate)])),
  operationalDatabaseAction: 'NONE',
  protectedPortsAction: 'NONE',
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.status !== 'PASS') process.exitCode = 2;
