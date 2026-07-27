import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  LIVE_E2E_RUNNER_CANARIES,
  LiveE2eEvidenceScanner,
  runCapturedLiveE2eProcess,
} from './live-e2e-evidence-scanner.mjs';
import {
  createSanitizedTestEnvironment,
  persistentTestRuntimeRoot,
  readTrackedTestEnvironment,
  serverRoot,
  startBuiltTestServer,
} from './test-runtime-bootstrap.mjs';

const preflightOnly = process.argv.includes('--preflight');
const scenariosArgument = process.argv.find((argument) => argument.startsWith('--scenarios='));
const selectedScenarios = scenariosArgument?.slice('--scenarios='.length).trim();
const before = readTrackedTestEnvironment();
const evidenceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'live-e2e-evidence-'));
const scanner = new LiveE2eEvidenceScanner(LIVE_E2E_RUNNER_CANARIES);
let server;

try {
  server = await startBuiltTestServer({
    runtimeRoot: persistentTestRuntimeRoot,
    timeoutMs: 120_000,
  });
  const result = await runCapturedLiveE2eProcess({
    command: 'pnpm',
    args: [
      'exec',
      'vitest',
      'run',
      'tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts',
      '--no-watch',
    ],
    cwd: serverRoot,
    evidencePaths: [evidenceDirectory],
    env: createSanitizedTestEnvironment({
      RUN_REAL_E2E: '1',
      AUTOBYTEUS_TEST_RUNTIME_ROOT: server.runtimeRoot,
      AUTOBYTEUS_TEST_SERVER_URL: server.serverUrl,
      AUTOBYTEUS_LIVE_E2E_EVIDENCE_DIR: evidenceDirectory,
      ...(preflightOnly ? { AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY: '1' } : {}),
      ...(selectedScenarios ? { AUTOBYTEUS_LIVE_E2E_SCENARIOS: selectedScenarios } : {}),
    }),
  });
  await server.stop();
  scanner.assertEvidenceClean(server.output());
  const after = readTrackedTestEnvironment();
  if (!before.bytes.equals(after.bytes)) throw new Error('TEST_ENV_TEMPLATE_MUTATED');
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.status;
} catch (error) {
  if (server?.child.exitCode === null) server.child.kill('SIGKILL');
  const code = error instanceof Error
    && (error.message.startsWith('LIVE_E2E_') || error.message.startsWith('TEST_'))
    ? error.message
    : 'LIVE_E2E_EVIDENCE_CAPTURE_FAILED';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
} finally {
  await fs.rm(evidenceDirectory, { recursive: true, force: true });
}
