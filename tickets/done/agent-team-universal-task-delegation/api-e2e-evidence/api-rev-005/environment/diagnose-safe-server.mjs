import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  builtServerEntry,
  createSanitizedTestEnvironment,
  materializeTestRuntime,
  resolveTestDatabaseLocation,
  serverRoot,
} from '../../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

const runtimeRoot = path.join(serverRoot, 'tests/.tmp/api-rev-005-live-20260815-1');
const databasePath = path.join(serverRoot, 'db/api-rev-005-live-20260815-1.db');
const databaseUrl = `file://${databasePath}`;
const operational = '/Users/normy/.autobyteus/server-data/db/production.db';
if (path.resolve(databasePath) === path.resolve(operational)) throw new Error('OPERATIONAL_TARGET_MATCH');
const materialized = materializeTestRuntime({
  runtimeRoot,
  databaseUrlOverride: databaseUrl,
  serverUrlOverride: 'http://127.0.0.1:60310',
});
if (resolveTestDatabaseLocation(materialized.database.databaseUrl).databasePath !== databasePath) {
  throw new Error('CONFIG_TARGET_MISMATCH');
}
const environment = createSanitizedTestEnvironment();
if ('DATABASE_URL' in environment || 'DATABASE_URL_TEST' in environment) {
  throw new Error('CHILD_DATABASE_SELECTOR_PRESENT');
}
const child = spawn(process.execPath, [
  builtServerEntry,
  '--host', '127.0.0.1',
  '--port', '60310',
  '--data-dir', materialized.runtimeRoot,
], { cwd: serverRoot, env: environment, stdio: 'pipe' });
let output = '';
child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
const marker = 'Server listening on 127.0.0.1:60310';
const deadline = Date.now() + 60_000;
while (Date.now() < deadline && child.exitCode === null && !output.includes(marker)) {
  await new Promise((resolve) => setTimeout(resolve, 100));
}
if (child.exitCode === null) {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('close', resolve));
}
fs.writeFileSync(new URL('./safe-server-diagnostic.log', import.meta.url), output);
process.stdout.write(output);
if (!output.includes(marker)) process.exitCode = 2;
