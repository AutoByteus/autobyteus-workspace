import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createSanitizedTestEnvironment,
  materializeTestRuntime,
  resolveTestDatabaseLocation,
  serverRoot,
  testRuntimeRoot,
} from '../../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';

const runtimeRoot = path.join(testRuntimeRoot, 'api-rev-004-live-20260815-1');
const databasePath = path.join(serverRoot, 'db', 'api-rev-004-live-20260815-1.db');
const databaseUrl = pathToFileURL(databasePath).href;
const operationalPath = '/Users/normy/.autobyteus/server-data/db/production.db';

if (path.resolve(databasePath) === path.resolve(operationalPath)) {
  throw new Error('OPERATIONAL_TARGET_MATCH');
}
if (
  fs.existsSync(runtimeRoot)
  || fs.existsSync(databasePath)
  || fs.existsSync(`${databasePath}.secret.key`)
) {
  throw new Error('OWNED_TARGET_NOT_FRESH');
}

const sanitized = createSanitizedTestEnvironment();
if ('DATABASE_URL' in sanitized || 'DATABASE_URL_TEST' in sanitized) {
  throw new Error('CHILD_DATABASE_SELECTOR_PRESENT');
}

const materialized = materializeTestRuntime({
  runtimeRoot,
  databaseUrlOverride: databaseUrl,
  serverUrlOverride: 'http://127.0.0.1:60309',
});
const fixed = Object.fromEntries(
  fs.readFileSync(materialized.runtimeEnvironmentPath, 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split(/=(.*)/s).slice(0, 2)),
);
const resolved = resolveTestDatabaseLocation(fixed.DATABASE_URL);
if (resolved.databasePath !== databasePath) throw new Error('CONFIG_TARGET_MISMATCH');
if (fs.existsSync(databasePath)) throw new Error('CONFIG_PREFLIGHT_INITIALIZED_DATABASE');

process.stdout.write(`${JSON.stringify({
  status: 'PASS',
  runtimeRoot: materialized.runtimeRoot,
  runtimeEnvironmentPath: materialized.runtimeEnvironmentPath,
  databasePath: materialized.database.databasePath,
  databaseUrl: materialized.database.databaseUrl,
  operationalTargetMatch: false,
  childDatabaseUrlPresent: 'DATABASE_URL' in sanitized,
  childDatabaseUrlTestPresent: 'DATABASE_URL_TEST' in sanitized,
  environmentDatabaseAssignmentMatches: fixed.DATABASE_URL === databaseUrl,
  configurationOnlyResolvedExactTarget: resolved.databasePath === databasePath,
  databaseExistsAfterConfigOnlyPreflight: fs.existsSync(databasePath),
}, null, 2)}\n`);
