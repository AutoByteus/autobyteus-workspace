import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = path.resolve(moduleDirectory, '..', '..');
export const serverRoot = path.join(workspaceRoot, 'autobyteus-server-ts');
export const trackedTestEnvironmentPath = path.join(serverRoot, '.env.test');
export const testDatabaseRoot = path.join(serverRoot, 'db');
export const testRuntimeRoot = path.join(serverRoot, 'tests', '.tmp');
export const persistentTestRuntimeRoot = path.join(testRuntimeRoot, 'live-e2e-runtime');
export const builtServerEntry = path.join(serverRoot, 'dist', 'app.js');

const fixedKeys = Object.freeze([
  'APP_ENV',
  'DB_TYPE',
  'DATABASE_URL',
  'AUTOBYTEUS_SERVER_HOST',
]);
const fixedKeySet = new Set(fixedKeys);
const inheritedEnvironmentKeys = Object.freeze([
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
  'SystemRoot',
  'WINDIR',
  'USERPROFILE',
]);

const stableError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

const isWithin = (candidate, root) => {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

const assertRegularNonSymlink = (candidate, missingCode, unsafeCode) => {
  let stat;
  try {
    stat = fs.lstatSync(candidate);
  } catch (error) {
    if (error?.code === 'ENOENT') throw stableError(missingCode);
    throw stableError(unsafeCode);
  }
  if (!stat.isFile() || stat.isSymbolicLink()) throw stableError(unsafeCode);
};

const parseFixedEnvironment = (source) => {
  const values = new Map();
  const lines = source.split(/\r?\n/);
  for (const line of lines) {
    if (line.length === 0) continue;
    const match = /^([A-Z][A-Z0-9_]*)=([^\r\n]*)$/.exec(line);
    if (!match) throw stableError('TEST_ENV_TEMPLATE_INVALID');
    const [, key, value] = match;
    if (!fixedKeySet.has(key)) throw stableError('TEST_ENV_TEMPLATE_KEY_NOT_ALLOWED');
    if (values.has(key)) throw stableError('TEST_ENV_TEMPLATE_DUPLICATE_KEY');
    if (!value || /[`$]/.test(value)) throw stableError('TEST_ENV_TEMPLATE_VALUE_INVALID');
    values.set(key, value);
  }
  if (values.size !== fixedKeys.length || fixedKeys.some((key) => !values.has(key))) {
    throw stableError('TEST_ENV_TEMPLATE_SCHEMA_INVALID');
  }
  if (values.get('APP_ENV') !== 'test' || values.get('DB_TYPE') !== 'sqlite') {
    throw stableError('TEST_ENV_TEMPLATE_SCHEMA_INVALID');
  }
  let serverUrl;
  try {
    serverUrl = new URL(values.get('AUTOBYTEUS_SERVER_HOST'));
  } catch {
    throw stableError('TEST_ENV_SERVER_HOST_INVALID');
  }
  if (
    serverUrl.protocol !== 'http:'
    || !['127.0.0.1', 'localhost', '::1'].includes(serverUrl.hostname)
    || !serverUrl.port
    || serverUrl.pathname !== '/'
  ) {
    throw stableError('TEST_ENV_SERVER_HOST_INVALID');
  }
  return Object.freeze(Object.fromEntries(values));
};

export const parseTrackedTestEnvironmentSource = (source) =>
  parseFixedEnvironment(source);

export const resolveTestDatabaseLocation = (databaseUrl) => {
  const value = databaseUrl?.trim();
  if (!value?.startsWith('file:') || value.length === 5 || /[?#]/.test(value)) {
    throw stableError('TEST_DATABASE_URL_INVALID');
  }
  const configuredPath = value.slice(5);
  let databasePath;
  try {
    databasePath = configuredPath.startsWith('//')
      ? fileURLToPath(value)
      : path.resolve(serverRoot, configuredPath);
  } catch {
    throw stableError('TEST_DATABASE_URL_INVALID');
  }
  databasePath = path.resolve(databasePath);
  if (!isWithin(databasePath, testDatabaseRoot) || databasePath === testDatabaseRoot) {
    throw stableError('TEST_DATABASE_PATH_UNSAFE');
  }
  return Object.freeze({
    databasePath,
    databaseUrl: pathToFileURL(databasePath).href,
    rootKeyPath: `${databasePath}.secret.key`,
  });
};

export const readTrackedTestEnvironment = () => {
  assertRegularNonSymlink(
    trackedTestEnvironmentPath,
    'TEST_ENV_TEMPLATE_MISSING',
    'TEST_ENV_TEMPLATE_UNSAFE',
  );
  const bytes = fs.readFileSync(trackedTestEnvironmentPath);
  const values = parseFixedEnvironment(bytes.toString('utf8'));
  const database = resolveTestDatabaseLocation(values.DATABASE_URL);
  return Object.freeze({ bytes, values, database });
};

const assignmentName = (line) => {
  const match = /^(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/.exec(line);
  return match?.[1] ?? null;
};

const assertSafeRuntimeRoot = (runtimeRoot) => {
  const resolved = path.resolve(runtimeRoot);
  if (!isWithin(resolved, testRuntimeRoot) || resolved === testRuntimeRoot) {
    throw stableError('TEST_RUNTIME_PATH_UNSAFE');
  }
  return resolved;
};

const readExistingRuntimeLines = (runtimeEnvironmentPath) => {
  if (!fs.existsSync(runtimeEnvironmentPath)) return [];
  assertRegularNonSymlink(
    runtimeEnvironmentPath,
    'TEST_RUNTIME_ENV_MISSING',
    'TEST_RUNTIME_ENV_UNSAFE',
  );
  return fs.readFileSync(runtimeEnvironmentPath, 'utf8').split(/\r?\n/);
};

const writeAtomically = (target, content) => {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporary, content, { mode: 0o600, flag: 'wx' });
  try {
    fs.renameSync(temporary, target);
    if (process.platform !== 'win32') fs.chmodSync(target, 0o600);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
};

export const materializeTestRuntime = (options = {}) => {
  const before = readTrackedTestEnvironment();
  const runtimeRoot = assertSafeRuntimeRoot(options.runtimeRoot ?? persistentTestRuntimeRoot);
  const database = resolveTestDatabaseLocation(
    options.databaseUrlOverride ?? before.values.DATABASE_URL,
  );
  const serverUrl = options.serverUrlOverride ?? before.values.AUTOBYTEUS_SERVER_HOST;
  let parsedServerUrl;
  try {
    parsedServerUrl = new URL(serverUrl);
  } catch {
    throw stableError('TEST_ENV_SERVER_HOST_INVALID');
  }
  if (
    parsedServerUrl.protocol !== 'http:'
    || !['127.0.0.1', 'localhost', '::1'].includes(parsedServerUrl.hostname)
    || !parsedServerUrl.port
  ) {
    throw stableError('TEST_ENV_SERVER_HOST_INVALID');
  }

  fs.mkdirSync(runtimeRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(path.dirname(database.databasePath), { recursive: true, mode: 0o700 });
  const runtimeEnvironmentPath = path.join(runtimeRoot, '.env');
  const retainedLines = readExistingRuntimeLines(runtimeEnvironmentPath)
    .filter((line) => {
      const name = assignmentName(line);
      return name === null || !fixedKeySet.has(name);
    });
  while (retainedLines.at(-1) === '') retainedLines.pop();
  const fixed = [
    `APP_ENV=${before.values.APP_ENV}`,
    `DB_TYPE=${before.values.DB_TYPE}`,
    `DATABASE_URL=${database.databaseUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${parsedServerUrl.origin}`,
  ];
  const content = `${[...retainedLines, ...fixed].join('\n')}\n`;
  writeAtomically(runtimeEnvironmentPath, content);

  const after = readTrackedTestEnvironment();
  if (!before.bytes.equals(after.bytes)) throw stableError('TEST_ENV_TEMPLATE_MUTATED');
  return Object.freeze({
    runtimeRoot,
    runtimeEnvironmentPath,
    database,
    serverUrl: parsedServerUrl.origin,
    templateBytes: Buffer.from(before.bytes),
  });
};

export const createSanitizedTestEnvironment = (extra = {}) => {
  const environment = { NODE_ENV: 'test' };
  for (const key of inheritedEnvironmentKeys) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined) environment[key] = String(value);
  }
  return environment;
};

export const reserveLoopbackPort = async () => await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string') {
      server.close();
      reject(stableError('TEST_PORT_RESERVATION_FAILED'));
      return;
    }
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});

const waitForServer = async (running, timeoutMs) => {
  const marker = `Server listening on ${running.host}:${running.port}`;
  const timeoutAt = Date.now() + timeoutMs;
  while (Date.now() < timeoutAt) {
    if (running.output().includes(marker)) return;
    if (running.child.exitCode !== null) throw stableError('TEST_SERVER_START_FAILED');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw stableError('TEST_SERVER_START_TIMEOUT');
};

export const startBuiltTestServer = async (options = {}) => {
  if (!fs.existsSync(builtServerEntry)) throw stableError('TEST_SERVER_BUILD_REQUIRED');
  const port = options.port ?? await reserveLoopbackPort();
  const host = '127.0.0.1';
  const materialized = materializeTestRuntime({
    runtimeRoot: options.runtimeRoot,
    databaseUrlOverride: options.databaseUrlOverride,
    serverUrlOverride: `http://${host}:${port}`,
  });
  let output = '';
  const child = spawn(
    process.execPath,
    [builtServerEntry, '--host', host, '--port', String(port), '--data-dir', materialized.runtimeRoot],
    {
      cwd: serverRoot,
      env: createSanitizedTestEnvironment(options.environment),
      stdio: 'pipe',
    },
  );
  child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); });
  child.stderr.on('data', (chunk) => { output += chunk.toString('utf8'); });
  const running = {
    ...materialized,
    host,
    port,
    child,
    output: () => output,
    async stop() {
      if (child.exitCode !== null) {
        if (child.exitCode !== 0) throw stableError('TEST_SERVER_EXITED_NONZERO');
        return;
      }
      child.kill('SIGTERM');
      const exitCode = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          child.kill('SIGKILL');
          reject(stableError('TEST_SERVER_STOP_TIMEOUT'));
        }, 15_000);
        child.once('close', (code) => {
          clearTimeout(timeout);
          resolve(code);
        });
      });
      if (exitCode !== 0) throw stableError('TEST_SERVER_EXITED_NONZERO');
    },
  };
  try {
    await waitForServer(running, options.timeoutMs ?? 120_000);
    return running;
  } catch (error) {
    if (child.exitCode === null) child.kill('SIGKILL');
    throw error;
  }
};

export const executeGraphql = async (serverUrl, query, variables = {}) => {
  const response = await fetch(`${serverUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length || !payload.data) {
    throw stableError('TEST_GRAPHQL_REQUEST_FAILED');
  }
  return payload.data;
};

export const removeOwnedTestRuntime = async (runtimeRoot, database) => {
  const safeRuntime = assertSafeRuntimeRoot(runtimeRoot);
  const safeDatabase = resolveTestDatabaseLocation(database.databaseUrl);
  await fsPromises.rm(safeRuntime, { recursive: true, force: true });
  for (const candidate of [
    safeDatabase.databasePath,
    safeDatabase.rootKeyPath,
    `${safeDatabase.databasePath}-wal`,
    `${safeDatabase.databasePath}-shm`,
    `${safeDatabase.databasePath}-journal`,
  ]) {
    await fsPromises.rm(candidate, { force: true });
  }
};
