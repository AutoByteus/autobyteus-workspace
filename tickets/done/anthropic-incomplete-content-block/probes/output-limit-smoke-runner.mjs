// Runs a ticket-local real-provider smoke spec against a worktree's test-owned vault
// (autobyteus-server-ts/db/test.db), mirroring test-support/live-e2e/run-live-e2e.mjs.
// Usage: node output-limit-smoke-runner.mjs [<worktree root>] [<spec path relative to autobyteus-server-ts>]
// Defaults: this ticket's worktree and tests/e2e/secret-management/tmp-output-limit-smoke.e2e.test.ts.
// The spec is copied into the server tests folder only for the run and removed afterwards.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ticketWorktree = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const worktreeRoot = path.resolve(process.argv[2] ?? ticketWorktree);
const specPath = process.argv[3] ?? 'tests/e2e/secret-management/tmp-output-limit-smoke.e2e.test.ts';
const { createSanitizedTestEnvironment, persistentTestRuntimeRoot, serverRoot, startBuiltTestServer } =
  await import(path.join(worktreeRoot, 'test-support/live-e2e/test-runtime-bootstrap.mjs'));
const { spawnSync } = await import('node:child_process');

const server = await startBuiltTestServer({ runtimeRoot: persistentTestRuntimeRoot, timeoutMs: 120_000 });
try {
  const result = spawnSync('pnpm', ['exec', 'vitest', 'run', specPath, '--no-watch'], {
    cwd: serverRoot,
    encoding: 'utf8',
    env: createSanitizedTestEnvironment({
      RUN_REAL_E2E: '1',
      AUTOBYTEUS_TEST_RUNTIME_ROOT: server.runtimeRoot,
      AUTOBYTEUS_TEST_SERVER_URL: server.serverUrl,
      AUTOBYTEUS_TEST_DATABASE_URL: server.database.databaseUrl,
    }),
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  process.exitCode = result.status ?? 1;
} finally {
  await server.stop();
}
