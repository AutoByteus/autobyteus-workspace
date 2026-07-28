import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  createSanitizedTestEnvironment,
  persistentTestRuntimeRoot,
  startBuiltTestServer,
  workspaceRoot,
} from './test-runtime-bootstrap.mjs';

const server = await startBuiltTestServer({ runtimeRoot: persistentTestRuntimeRoot, port: 8000 });
const web = spawn(
  'pnpm',
  ['dev', '--host', '127.0.0.1', '--port', '3000'],
  {
    cwd: path.join(workspaceRoot, 'autobyteus-web'),
    env: createSanitizedTestEnvironment({
      NODE_ENV: 'development',
      BACKEND_NODE_BASE_URL: server.serverUrl,
    }),
    stdio: 'inherit',
  },
);
process.stdout.write(`TEST_SERVER_READY ${server.serverUrl}\n`);
process.stdout.write('TEST_WEB_STARTING http://127.0.0.1:3000\n');
server.child.stdout.pipe(process.stdout);
server.child.stderr.pipe(process.stderr);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  if (web.exitCode === null) web.kill('SIGTERM');
  try {
    await server.stop();
  } finally {
    process.exit();
  }
};
process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());
web.once('close', (code) => {
  if (!stopping) {
    process.exitCode = code ?? 1;
    void stop();
  }
});
server.child.once('close', (code) => {
  if (!stopping) {
    process.exitCode = code ?? 1;
    void stop();
  }
});
