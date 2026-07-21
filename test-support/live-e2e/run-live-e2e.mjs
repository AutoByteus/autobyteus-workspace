import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runCapturedLiveE2eProcess,
} from './live-e2e-evidence-scanner.mjs';

const runnerDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(runnerDirectory, '..', '..');
const serverDirectory = path.join(workspaceRoot, 'autobyteus-server-ts');
const configurationPath = path.join(workspaceRoot, 'test-config', 'live-e2e.json');
const preflightOnly = process.argv.includes('--preflight');
const scenariosArgument = process.argv.find((argument) => argument.startsWith('--scenarios='));
const selectedScenarios = scenariosArgument?.slice('--scenarios='.length).trim();

const inheritedEnvironmentKeys = [
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'TMPDIR',
  'TMP',
  'TEMP',
  'LANG',
  'LC_ALL',
  'TERM',
  'CI',
  'PNPM_HOME',
  'COREPACK_HOME',
  'XDG_CACHE_HOME',
  'FORCE_COLOR',
];

const childEnvironment = Object.fromEntries(
  inheritedEnvironmentKeys.flatMap((key) => {
    const value = process.env[key];
    return value === undefined ? [] : [[key, value]];
  }),
);

try {
  const evidenceDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'live-e2e-evidence-'));
  let result;
  try {
    result = await runCapturedLiveE2eProcess({
      command: 'pnpm',
      args: [
        'exec',
        'vitest',
        'run',
        'tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts',
        '--no-watch',
      ],
      cwd: serverDirectory,
      evidencePaths: [evidenceDirectory],
      env: {
        ...childEnvironment,
        RUN_REAL_E2E: '1',
        AUTOBYTEUS_LIVE_E2E_CONFIG: configurationPath,
        AUTOBYTEUS_LIVE_E2E_EVIDENCE_DIR: evidenceDirectory,
        ...(preflightOnly ? { AUTOBYTEUS_LIVE_E2E_PREFLIGHT_ONLY: '1' } : {}),
        ...(selectedScenarios ? { AUTOBYTEUS_LIVE_E2E_SCENARIOS: selectedScenarios } : {}),
      },
    });
  } finally {
    await fs.rm(evidenceDirectory, { recursive: true, force: true });
  }
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.status;
} catch (error) {
  const code = error instanceof Error && error.message.startsWith('LIVE_E2E_')
    ? error.message
    : 'LIVE_E2E_EVIDENCE_CAPTURE_FAILED';
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}
