import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import {
  __testOnly as runtimeTestOnly,
  developmentBackendUrl,
  developmentDataRoot,
  developmentFrontendUrl,
  launcherOwnedBackendKeys,
  materializeDevelopmentRuntime,
  parseTrackedDevelopmentEnvironmentSource,
  readTrackedDevelopmentEnvironment,
} from './development-runtime.mjs';
import {
  __testOnly as launcherTestOnly,
  assertFixedPortsAvailable,
} from './run-dev.mjs';

const validTemplate = [
  'APP_ENV=development',
  'DB_TYPE=sqlite',
  'DATABASE_URL=file:./db/development.db',
  'AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000',
].join('\n');

test('development template accepts exactly the approved credential-free schema', () => {
  assert.deepEqual(parseTrackedDevelopmentEnvironmentSource(`${validTemplate}\n`), {
    APP_ENV: 'development',
    DB_TYPE: 'sqlite',
    DATABASE_URL: 'file:./db/development.db',
    AUTOBYTEUS_SERVER_HOST: 'http://127.0.0.1:8000',
  });

  for (const source of [
    `${validTemplate}\nEXTRA=value\n`,
    `${validTemplate.replace('DB_TYPE=sqlite', 'DB_TYPE=sqlite\nDB_TYPE=sqlite')}\n`,
    validTemplate.replace('DATABASE_URL=file:./db/development.db', 'DATABASE_URL=file:../outside.db'),
    validTemplate.replace('APP_ENV=development', 'APP_ENV=${HOME}'),
  ]) {
    assert.throws(() => parseTrackedDevelopmentEnvironmentSource(source));
  }
});

test('materialization owns the fixed development data paths and routing keys', () => {
  const previous = {};
  for (const key of launcherOwnedBackendKeys) {
    previous[key] = process.env[key];
    process.env[key] = `/tmp/hostile-${key.toLowerCase()}`;
  }

  try {
    const templateBefore = readTrackedDevelopmentEnvironment().bytes;
    const runtime = materializeDevelopmentRuntime();
    const runtimeSource = fs.readFileSync(runtime.runtimeEnvironmentPath, 'utf8');

    assert.equal(runtime.dataRoot, developmentDataRoot);
    assert.equal(runtime.backendUrl, developmentBackendUrl);
    assert.equal(runtime.frontendUrl, developmentFrontendUrl);
    assert.equal(runtime.backendEnvironment.DATABASE_URL, runtime.databaseUrl);
    assert.equal(runtime.backendEnvironment.AUTOBYTEUS_SERVER_HOST, developmentBackendUrl);
    assert.equal(runtime.backendEnvironment.AUTOBYTEUS_LOG_DIR, path.join(developmentDataRoot, 'logs'));
    assert.equal(runtime.backendEnvironment.AUTOBYTEUS_MEMORY_DIR, path.join(developmentDataRoot, 'memory'));
    assert.equal(
      runtime.backendEnvironment.AUTOBYTEUS_TEMP_WORKSPACE_DIR,
      path.join(developmentDataRoot, 'temp_workspace'),
    );
    assert.equal(runtime.frontendEnvironment.BACKEND_NODE_BASE_URL, developmentBackendUrl);
    assert.equal(
      runtime.frontendEnvironment.BACKEND_FILE_EXPLORER_WS_ENDPOINT,
      'ws://127.0.0.1:8000/ws/file-explorer',
    );
    assert.match(runtimeSource, new RegExp(`^DATABASE_URL=${runtime.databaseUrl}$`, 'm'));
    assert.ok(
      runtimeSource.split(/\r?\n/).includes(
        `AUTOBYTEUS_LOG_DIR=${path.join(developmentDataRoot, 'logs')}`,
      ),
    );
    assert.deepEqual(readTrackedDevelopmentEnvironment().bytes, templateBefore);
  } finally {
    for (const key of launcherOwnedBackendKeys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('runtime materialization retains non-launcher settings while replacing owned assignments', () => {
  const content = runtimeTestOnly.runtimeEnvironmentContent(
    ['LOG_LEVEL=DEBUG', 'DATABASE_URL=file:/tmp/hostile.db', 'CUSTOM_SETTING=value', ''],
    {
      APP_ENV: 'development',
      DB_TYPE: 'sqlite',
      databaseUrl: 'file:///workspace/.autobyteus/development/server-data/db/development.db',
      logsDirectory: '/workspace/.autobyteus/development/server-data/logs',
      memoryDirectory: '/workspace/.autobyteus/development/server-data/memory',
      tempWorkspaceDirectory: '/workspace/.autobyteus/development/server-data/temp_workspace',
    },
  );
  assert.match(content, /^LOG_LEVEL=DEBUG$/m);
  assert.match(content, /^CUSTOM_SETTING=value$/m);
  assert.equal((content.match(/^DATABASE_URL=/gm) ?? []).length, 1);
  assert.match(content, /^DATABASE_URL=file:\/\/\/workspace\/\.autobyteus\/development\/server-data\/db\/development\.db$/m);
});

test('occupied fixed ports are rejected before stack startup', async () => {
  const occupied = net.createServer();
  await new Promise((resolve) => occupied.listen(0, '127.0.0.1', resolve));
  const address = occupied.address();
  assert.equal(typeof address, 'object');
  await assert.rejects(
    () => assertFixedPortsAvailable({
      backendPort: address.port,
      frontendPort: address.port + 1,
      probe: launcherTestOnly.portProbe,
    }),
    (error) => error?.code === 'DEV_PORT_OCCUPIED',
  );
  await new Promise((resolve, reject) => occupied.close((error) => error ? reject(error) : resolve()));
});
