import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startBuiltTestServer } from '../../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const control = path.join(here, 'control.json');
const info = path.join(here, 'server-info.json');
let server;
let stopped = false;
let cycle = 0;
let options = {
  runtimeRoot: path.join(root, 'autobyteus-server-ts/tests/.tmp/aorg-api-rev001'),
  databaseUrlOverride: 'file:' + path.join(root, 'autobyteus-server-ts/db/aorg-api-rev001.db'),
  environment: { NODE_OPTIONS: '--import=' + path.join(here, 'telemetry.mjs'), AORG_TELEMETRY_PATH: path.join(here, 'telemetry.json') },
};
async function start() {
  server = await startBuiltTestServer(options);
  options.port = server.port;
  cycle++;
  await fs.writeFile(info, JSON.stringify({ serverUrl: server.serverUrl, port: server.port, pid: server.child.pid, runtimeRoot: server.runtimeRoot, database: server.database.databaseUrl, cycle }, null, 2));
  console.log('READY', server.serverUrl, server.child.pid, cycle);
}
async function stop() {
  if (!server) return;
  await server.stop();
  await fs.writeFile(path.join(here, `server-cycle-${cycle}.log`), server.output());
}
await start();
while (!stopped) {
  await new Promise(resolve => setTimeout(resolve, 500));
  const command = await fs.readFile(control, 'utf8').then(JSON.parse).catch(() => null);
  if (!command) continue;
  await fs.unlink(control);
  if (command.action === 'restart') { await stop(); await start(); }
  if (command.action === 'stop') { await stop(); stopped = true; }
}
