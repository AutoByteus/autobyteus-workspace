import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const runnerDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(runnerDirectory, '..', '..');
const serverDirectory = path.join(workspaceRoot, 'autobyteus-server-ts');
const configurationPath = path.join(workspaceRoot, 'test-config', 'live-e2e.json');
const preflightOnly = process.argv.includes('--preflight');
const scenariosArgument = process.argv.find((argument) => argument.startsWith('--scenarios='));
const selectedScenarios = scenariosArgument?.slice('--scenarios='.length).trim();

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'vitest',
    'run',
    'tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts',
    '--no-watch',
  ],
  {
    cwd: serverDirectory,
    stdio: 'inherit',
    env: {
      ...process.env,
      RUN_REAL_E2E: '1',
      AUTOBYTEUS_LIVE_E2E_CONFIG: configurationPath,
      ...(preflightOnly ? { AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY: '1' } : {}),
      ...(selectedScenarios ? { AUTOBYTEUS_LIVE_E2E_SCENARIOS: selectedScenarios } : {}),
    },
  },
);

if (result.error) {
  process.stderr.write('Real-E2E runner failed to start.\n');
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
