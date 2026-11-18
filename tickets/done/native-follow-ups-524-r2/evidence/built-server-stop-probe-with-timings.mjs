// API-05 cause probe (autobyteus-515, API/E2E): start the built server the way the E2E suites do
// (test-support/live-e2e/test-runtime-bootstrap.mjs startBuiltTestServer, from <root>), wait <idleMs>, send SIGTERM
// (its stop()), and report how long the stop took, the exit outcome and the server's own shutdown lines.
// Usage: node API-05-built-server-stop-probe.mjs <root> [rounds=3] [idleMs=3000]
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, rounds = '3', idleMs = '3000'] = process.argv.slice(2);
const { startBuiltTestServer } = await import(pathToFileURL(path.join(root, 'test-support/live-e2e/test-runtime-bootstrap.mjs')).href);
for (let i = 0; i < Number(rounds); i += 1) {
  const t0 = Date.now();
  const server = await startBuiltTestServer();
  const startedMs = Date.now() - t0;
  await new Promise((r) => setTimeout(r, Number(idleMs)));
  const t1 = Date.now();
  let outcome = 'exit 0';
  try { await server.stop(); } catch (error) { outcome = String(error?.code ?? error); }
  const lines = server.output().split('\n').filter((l) => /\[timing\]|forcing exit|incomplete|unconfirmed/.test(l)).slice(-80);
  console.log(JSON.stringify({ root: path.basename(root), round: i + 1, startedMs, stopMs: Date.now() - t1, outcome, exitCode: server.child.exitCode, signal: server.child.signalCode, shutdownLines: lines }));
}
process.exit(0);
