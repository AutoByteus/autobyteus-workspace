import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  createSanitizedTestEnvironment,
  materializeTestRuntime,
  persistentTestRuntimeRoot,
  workspaceRoot,
} from './test-runtime-bootstrap.mjs';

const runtime = materializeTestRuntime({ runtimeRoot: persistentTestRuntimeRoot });
const webRoot = path.join(workspaceRoot, 'autobyteus-web');
const child = spawn(
  'pnpm',
  ['dev', '--host', '127.0.0.1', '--port', '3000'],
  {
    cwd: webRoot,
    env: createSanitizedTestEnvironment({
      NODE_ENV: 'development',
      BACKEND_NODE_BASE_URL: runtime.serverUrl,
    }),
    stdio: 'inherit',
  },
);
const forward = (signal) => {
  if (child.exitCode === null) child.kill(signal);
};
process.once('SIGINT', () => forward('SIGINT'));
process.once('SIGTERM', () => forward('SIGTERM'));
child.once('close', (code) => {
  process.exitCode = code ?? 1;
});
