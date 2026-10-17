// Temporary API/E2E runner: start the built test server on the persistent test database
// (autobyteus-server-ts/db/test.db, whose vault holds the imported keys), run one live-suite case
// against it, then stop the server.  node run-against-test-server.mjs <outDir> <vitest -t pattern>
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
const root = '/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision';
const { startBuiltTestServer, persistentTestRuntimeRoot } = await import(root + '/test-support/live-e2e/test-runtime-bootstrap.mjs');
const [out, pattern] = process.argv.slice(2);
await fs.mkdir(out, { recursive: true });
const server = await startBuiltTestServer({ runtimeRoot: persistentTestRuntimeRoot, timeoutMs: 120000 });
let code = 1;
try {
  for (let i = 0; i < 120; i++) { try { if ((await fetch(server.serverUrl + '/rest/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 1000)); }
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, USER: process.env.USER,
    RUN_TOKEN_TPS_LIVE_E2E: '1', TPS_LIVE_RUNTIMES: 'autobyteus', AUTOBYTEUS_TEST_SERVER_URL: server.serverUrl, TEST_TPS_LIVE_OUTPUT_DIR: out };
  code = await new Promise(resolve => {
    const child = spawn('pnpm', ['-C', root + '/autobyteus-server-ts', 'exec', 'vitest', 'run', 'tests/e2e/runtime/token-meter-tps-live.e2e.test.ts', '-t', pattern, '--no-watch'], { env, stdio: 'inherit' });
    child.on('close', resolve);
  });
} finally {
  await fs.writeFile(out + '/test-server.log', server.output());
  await server.stop();
  console.log(JSON.stringify({ serverUrl: server.serverUrl, vitestExit: code, serverStopped: true }));
  process.exitCode = code;
}
