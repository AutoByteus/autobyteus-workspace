import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const workspaceRoot = process.cwd();
const evidenceRoot = path.join(
  workspaceRoot,
  'tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-evidence/api-rev-001/environment',
);
const { startBuiltTestServer } = await import(
  pathToFileURL(path.join(workspaceRoot, 'test-support/live-e2e/test-runtime-bootstrap.mjs')).href
);
const runtimeRoot = path.join(
  workspaceRoot,
  'autobyteus-server-ts/tests/.tmp/api-rev-001-live-20260817-1',
);
const databasePath = path.join(
  workspaceRoot,
  'autobyteus-server-ts/db/api-rev-001-live-20260817-1.db',
);
const operationalDatabase = '/Users/normy/.autobyteus/server-data/db/production.db';

if (path.resolve(databasePath) === path.resolve(operationalDatabase)) {
  throw new Error('OPERATIONAL_TARGET_MATCH');
}

const server = await startBuiltTestServer({
  runtimeRoot,
  databaseUrlOverride: pathToFileURL(databasePath).href,
  port: 60418,
  timeoutMs: 180_000,
});

const openFiles = execFileSync('lsof', ['-nP', '-a', '-p', String(server.child.pid)], {
  encoding: 'utf8',
});
fs.writeFileSync(path.join(evidenceRoot, 'server-pid-lsof.log'), openFiles);
if (!openFiles.includes(databasePath)) throw new Error('DISPOSABLE_DATABASE_NOT_OPEN');
if (openFiles.includes(operationalDatabase)) throw new Error('OPERATIONAL_DATABASE_OPEN');

const marker = {
  status: 'READY',
  pid: server.child.pid,
  serverUrl: server.serverUrl,
  runtimeRoot: server.runtimeRoot,
  runtimeEnvironmentPath: server.runtimeEnvironmentPath,
  databasePath: server.database.databasePath,
  lsofExactDisposableTarget: true,
  lsofOperationalTarget: false,
  protectedPortsTargeted: false,
};
fs.writeFileSync(
  path.join(evidenceRoot, 'safe-server-ready.json'),
  `${JSON.stringify(marker, null, 2)}\n`,
);
process.stdout.write(`TICKET_SAFE_SERVER_READY ${JSON.stringify(marker)}\n`);

let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  fs.writeFileSync(path.join(evidenceRoot, 'safe-server-output.log'), server.output());
  await server.stop();
};
process.once('SIGINT', async () => {
  try { await close(); process.exit(0); } catch (error) { console.error(error); process.exit(1); }
});
process.once('SIGTERM', async () => {
  try { await close(); process.exit(0); } catch (error) { console.error(error); process.exit(1); }
});
await new Promise(() => {});
