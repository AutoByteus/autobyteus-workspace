import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const workspaceRoot = process.cwd();
const evidenceRoot = path.join(workspaceRoot, 'tickets/in-progress/agent-team-codex-output-not-visible/investigation-evidence/environment');
const { startBuiltTestServer } = await import(pathToFileURL(path.join(workspaceRoot, 'test-support/live-e2e/test-runtime-bootstrap.mjs')).href);
const runtimeRoot = path.join(workspaceRoot, 'autobyteus-server-ts/tests/.tmp/agent-team-codex-output-not-visible-20260817-1');
const databasePath = path.join(workspaceRoot, 'autobyteus-server-ts/db/agent-team-codex-output-not-visible-20260817-1.db');
const operational = '/Users/normy/.autobyteus/server-data/db/production.db';
if (path.resolve(databasePath) === path.resolve(operational)) throw new Error('OPERATIONAL_TARGET_MATCH');

const server = await startBuiltTestServer({
  runtimeRoot,
  databaseUrlOverride: pathToFileURL(databasePath).href,
  port: 60417,
  timeoutMs: 180000,
});
const openFiles = execFileSync('lsof', ['-nP', '-a', '-p', String(server.child.pid)], { encoding: 'utf8' });
fs.writeFileSync(path.join(evidenceRoot, 'server-pid-lsof.log'), openFiles);
if (!openFiles.includes(databasePath)) throw new Error('PID_LSOF_DISPOSABLE_DATABASE_NOT_OPEN');
if (openFiles.includes(operational)) throw new Error('PID_LSOF_OPERATIONAL_DATABASE_OPEN');
const marker = {
  status: 'READY', pid: server.child.pid, serverUrl: server.serverUrl,
  runtimeRoot: server.runtimeRoot, runtimeEnvironmentPath: server.runtimeEnvironmentPath,
  databasePath: server.database.databasePath, lsofExactDisposableTarget: true,
  lsofOperationalTarget: false, protectedPortsTargeted: false,
};
fs.writeFileSync(path.join(evidenceRoot, 'safe-server-ready.json'), `${JSON.stringify(marker, null, 2)}\n`);
process.stdout.write(`TICKET_SAFE_SERVER_READY ${JSON.stringify(marker)}\n`);
let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  fs.writeFileSync(path.join(evidenceRoot, 'safe-server-output.log'), server.output());
  try { await server.stop(); process.exitCode = 0; }
  catch (error) { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; }
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
await new Promise((resolve) => { process.on('SIGINT', resolve); process.on('SIGTERM', resolve); });
await close();
