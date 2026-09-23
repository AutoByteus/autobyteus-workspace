import fs from 'node:fs/promises';
import path from 'node:path';
import { startBuiltTestServer, resolveTestDatabaseLocation, testRuntimeRoot, createSanitizedTestEnvironment, removeOwnedTestRuntime } from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
const evidence = path.dirname(new URL(import.meta.url).pathname);
const prior = process.argv.includes('--resume') ? JSON.parse(await fs.readFile(path.join(evidence, 'api-live-stack.json'), 'utf8')) : null;
const runtimeRoot = prior?.runtimeRoot ?? path.join(testRuntimeRoot, `offline-org-live-${process.pid}-${Date.now()}`);
const database = prior?.database ?? resolveTestDatabaseLocation(`file:./db/offline-org-live-${process.pid}-${Date.now()}.db`);
const server = await startBuiltTestServer({ runtimeRoot, databaseUrlOverride: database.databaseUrl,
  environment: createSanitizedTestEnvironment() });
const info = { runtimeRoot, database, serverUrl: server.serverUrl, pid: server.child.pid };
await fs.writeFile(path.join(evidence, 'api-live-stack.json'), JSON.stringify(info, null, 2));
console.log(JSON.stringify(info));
const logPath=path.join(evidence,'api-live-backend-resumed.log');
await fs.writeFile(logPath,server.output());
server.child.stdout.on('data',chunk=>{ void fs.appendFile(logPath,chunk); });
server.child.stderr.on('data',chunk=>{ void fs.appendFile(logPath,chunk); });
const cleanup = async () => {
  await server.stop();
  await fs.writeFile(path.join(evidence, 'api-live-backend.log'), server.output());
  // Keep owned evidence/workspaces until validation ends; runtime removal is explicit below.
  await removeOwnedTestRuntime(runtimeRoot, database);
  console.log('OWNED_BACKEND_AND_DATABASE_REMOVED');
  process.exit(0);
};
process.once('SIGINT', cleanup); process.once('SIGTERM', cleanup);
process.stdin.resume();
