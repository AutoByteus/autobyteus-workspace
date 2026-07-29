import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(moduleDirectory, '..', '..');
export const serverRoot = path.join(workspaceRoot, 'autobyteus-server-ts');
export const webRoot = path.join(workspaceRoot, 'autobyteus-web');
export const trackedDevelopmentEnvironmentPath = path.join(serverRoot, '.env.development');
export const developmentRoot = path.join(workspaceRoot, '.autobyteus', 'development');
export const developmentDataRoot = path.join(developmentRoot, 'server-data');
export const developmentDatabaseRoot = path.join(developmentDataRoot, 'db');
export const developmentDatabasePath = path.join(developmentDatabaseRoot, 'development.db');
export const developmentRuntimeEnvironmentPath = path.join(developmentDataRoot, '.env');
export const builtServerEntry = path.join(serverRoot, 'dist', 'app.js');

export const developmentHost = '127.0.0.1';
export const developmentBackendPort = 8000;
export const developmentFrontendPort = 3000;
export const developmentBackendUrl = `http://${developmentHost}:${developmentBackendPort}`;
export const developmentFrontendUrl = `http://${developmentHost}:${developmentFrontendPort}`;

export const developmentTemplateKeys = Object.freeze([
  'APP_ENV',
  'DB_TYPE',
  'DATABASE_URL',
  'AUTOBYTEUS_SERVER_HOST',
]);

export const launcherOwnedBackendKeys = Object.freeze([
  ...developmentTemplateKeys,
  'AUTOBYTEUS_LOG_DIR',
  'AUTOBYTEUS_MEMORY_DIR',
  'AUTOBYTEUS_TEMP_WORKSPACE_DIR',
]);

const launcherOwnedBackendKeySet = new Set(launcherOwnedBackendKeys);
const frontendBackendEnvironment = Object.freeze({
  BACKEND_NODE_BASE_URL: developmentBackendUrl,
  BACKEND_AGENT_WS_ENDPOINT: `${developmentBackendUrl.replace(/^http/, 'ws')}/ws/agent`,
  BACKEND_TEAM_WS_ENDPOINT: `${developmentBackendUrl.replace(/^http/, 'ws')}/ws/agent-team`,
  BACKEND_GRAPHQL_WS_ENDPOINT: `${developmentBackendUrl.replace(/^http/, 'ws')}/graphql`,
  BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${developmentBackendUrl.replace(/^http/, 'ws')}/ws/transcribe`,
  BACKEND_TERMINAL_WS_ENDPOINT: `${developmentBackendUrl.replace(/^http/, 'ws')}/ws/terminal`,
  BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${developmentBackendUrl.replace(/^http/, 'ws')}/ws/file-explorer`,
});

const stableError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

const isWithin = (candidate, root) => {
  const relative = path.relative(root, candidate);
  return relative === ''
    || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

const assertRegularNonSymlink = (candidate, missingCode, unsafeCode) => {
  let metadata;
  try {
    metadata = fs.lstatSync(candidate);
  } catch (error) {
    if (error?.code === 'ENOENT') throw stableError(missingCode);
    throw stableError(unsafeCode);
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw stableError(unsafeCode);
};

const assertDirectoryWithoutSymlinkComponents = (candidate, boundary) => {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedBoundary = path.resolve(boundary);
  if (!isWithin(resolvedCandidate, resolvedBoundary)) {
    throw stableError('DEV_RUNTIME_PATH_UNSAFE');
  }

  let current = resolvedBoundary;
  const relative = path.relative(resolvedBoundary, resolvedCandidate);
  for (const component of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let metadata;
    try {
      metadata = fs.lstatSync(current);
    } catch (error) {
      if (error?.code === 'ENOENT') break;
      throw stableError('DEV_RUNTIME_PATH_UNSAFE');
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw stableError('DEV_RUNTIME_PATH_UNSAFE');
    }
  }
};

const assertDirectoryRealPathContained = (candidate, boundary) => {
  let resolvedCandidate;
  let resolvedBoundary;
  try {
    resolvedCandidate = fs.realpathSync(candidate);
    resolvedBoundary = fs.realpathSync(boundary);
  } catch {
    throw stableError('DEV_RUNTIME_PATH_UNSAFE');
  }
  if (!isWithin(resolvedCandidate, resolvedBoundary)) {
    throw stableError('DEV_RUNTIME_PATH_UNSAFE');
  }
};

const assertManagedDirectory = (candidate, boundary) => {
  assertDirectoryWithoutSymlinkComponents(candidate, boundary);
  fs.mkdirSync(candidate, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') fs.chmodSync(candidate, 0o700);
  assertDirectoryWithoutSymlinkComponents(candidate, boundary);
  assertDirectoryRealPathContained(candidate, boundary);
};

const assertManagedFileTarget = (candidate, boundary, missingCode = 'DEV_RUNTIME_FILE_MISSING') => {
  const resolvedCandidate = path.resolve(candidate);
  if (!isWithin(resolvedCandidate, path.resolve(boundary))) {
    throw stableError('DEV_RUNTIME_PATH_UNSAFE');
  }
  assertDirectoryWithoutSymlinkComponents(path.dirname(resolvedCandidate), boundary);
  if (!fs.existsSync(resolvedCandidate)) return;
  assertRegularNonSymlink(resolvedCandidate, missingCode, 'DEV_RUNTIME_PATH_UNSAFE');
  try {
    const realCandidate = fs.realpathSync(resolvedCandidate);
    const realBoundary = fs.realpathSync(boundary);
    if (!isWithin(realCandidate, realBoundary)) throw stableError('DEV_RUNTIME_PATH_UNSAFE');
  } catch (error) {
    if (error?.code === 'DEV_RUNTIME_PATH_UNSAFE') throw error;
    throw stableError('DEV_RUNTIME_PATH_UNSAFE');
  }
};

const assignmentName = (line) =>
  /^(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/.exec(line)?.[1] ?? null;

const parseTemplate = (source) => {
  const values = new Map();
  const lines = source.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  for (const line of lines) {
    const match = /^([A-Z][A-Z0-9_]*)=([^\r\n]*)$/.exec(line);
    if (!match) throw stableError('DEV_ENV_TEMPLATE_INVALID');
    const [, key, value] = match;
    if (!developmentTemplateKeys.includes(key)) {
      throw stableError('DEV_ENV_TEMPLATE_KEY_NOT_ALLOWED');
    }
    if (values.has(key)) throw stableError('DEV_ENV_TEMPLATE_DUPLICATE_KEY');
    if (!value || /[`$]/.test(value)) throw stableError('DEV_ENV_TEMPLATE_VALUE_INVALID');
    values.set(key, value);
  }

  if (
    values.size !== developmentTemplateKeys.length
    || developmentTemplateKeys.some((key) => !values.has(key))
    || values.get('APP_ENV') !== 'development'
    || values.get('DB_TYPE') !== 'sqlite'
    || values.get('DATABASE_URL') !== 'file:./db/development.db'
  ) {
    throw stableError('DEV_ENV_TEMPLATE_SCHEMA_INVALID');
  }

  let serverUrl;
  try {
    serverUrl = new URL(values.get('AUTOBYTEUS_SERVER_HOST'));
  } catch {
    throw stableError('DEV_ENV_SERVER_HOST_INVALID');
  }
  if (
    serverUrl.protocol !== 'http:'
    || serverUrl.hostname !== developmentHost
    || serverUrl.port !== String(developmentBackendPort)
    || serverUrl.pathname !== '/'
    || serverUrl.search
    || serverUrl.hash
  ) {
    throw stableError('DEV_ENV_SERVER_HOST_INVALID');
  }
  return Object.freeze(Object.fromEntries(values));
};

export const parseTrackedDevelopmentEnvironmentSource = (source) => parseTemplate(source);

export const readTrackedDevelopmentEnvironment = () => {
  assertRegularNonSymlink(
    trackedDevelopmentEnvironmentPath,
    'DEV_ENV_TEMPLATE_MISSING',
    'DEV_ENV_TEMPLATE_UNSAFE',
  );
  const bytes = fs.readFileSync(trackedDevelopmentEnvironmentPath);
  const values = parseTemplate(bytes.toString('utf8'));
  return Object.freeze({ bytes, values });
};

const readExistingRuntimeEnvironment = () => {
  try {
    fs.lstatSync(developmentRuntimeEnvironmentPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw stableError('DEV_RUNTIME_PATH_UNSAFE');
  }
  assertManagedFileTarget(developmentRuntimeEnvironmentPath, developmentDataRoot);
  return fs.readFileSync(developmentRuntimeEnvironmentPath, 'utf8').split(/\r?\n/);
};

const writeAtomically = (target, content) => {
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let created = false;
  try {
    const descriptor = fs.openSync(temporary, 'wx', 0o600);
    created = true;
    try {
      fs.writeFileSync(descriptor, content, 'utf8');
      fs.fsyncSync(descriptor);
    } finally {
      fs.closeSync(descriptor);
    }
    try {
      fs.renameSync(temporary, target);
    } catch (error) {
      // Windows does not replace an existing file with renameSync. The fallback
      // still keeps the temporary file owner-private and never follows target.
      if (!['EEXIST', 'EPERM', 'ENOTEMPTY'].includes(error?.code)) throw error;
      fs.rmSync(target, { force: true });
      fs.renameSync(temporary, target);
    }
    created = false;
    if (process.platform !== 'win32') fs.chmodSync(target, 0o600);
  } finally {
    if (created) fs.rmSync(temporary, { force: true });
  }
};

const runtimeEnvironmentContent = (retainedLines, values) => {
  const retained = retainedLines.filter((line) => !launcherOwnedBackendKeySet.has(assignmentName(line)));
  while (retained.at(-1) === '') retained.pop();
  const owned = [
    `APP_ENV=${values.APP_ENV}`,
    `DB_TYPE=${values.DB_TYPE}`,
    `DATABASE_URL=${values.databaseUrl}`,
    `AUTOBYTEUS_SERVER_HOST=${developmentBackendUrl}`,
    `AUTOBYTEUS_LOG_DIR=${values.logsDirectory}`,
    `AUTOBYTEUS_MEMORY_DIR=${values.memoryDirectory}`,
    `AUTOBYTEUS_TEMP_WORKSPACE_DIR=${values.tempWorkspaceDirectory}`,
  ];
  return `${[...retained, ...owned].join('\n')}\n`;
};

const buildChildEnvironment = (databaseUrl, dataRoot) => {
  const backendEnvironment = { ...process.env };
  for (const key of launcherOwnedBackendKeys) delete backendEnvironment[key];
  Object.assign(backendEnvironment, {
    APP_ENV: 'development',
    DB_TYPE: 'sqlite',
    DATABASE_URL: databaseUrl,
    AUTOBYTEUS_SERVER_HOST: developmentBackendUrl,
    AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'),
    AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
  });

  const frontendEnvironment = {
    ...process.env,
    NODE_ENV: 'development',
    ...frontendBackendEnvironment,
  };
  return Object.freeze({ backendEnvironment, frontendEnvironment });
};

export const materializeDevelopmentRuntime = () => {
  const before = readTrackedDevelopmentEnvironment();
  assertManagedDirectory(path.join(workspaceRoot, '.autobyteus'), workspaceRoot);
  assertManagedDirectory(developmentRoot, path.join(workspaceRoot, '.autobyteus'));
  assertManagedDirectory(developmentDataRoot, developmentRoot);
  assertManagedDirectory(developmentDatabaseRoot, developmentDataRoot);
  for (const directory of [
    path.join(developmentDataRoot, 'logs'),
    path.join(developmentDataRoot, 'memory'),
    path.join(developmentDataRoot, 'temp_workspace'),
  ]) {
    assertManagedDirectory(directory, developmentDataRoot);
  }

  assertManagedFileTarget(developmentRuntimeEnvironmentPath, developmentDataRoot);
  assertManagedFileTarget(developmentDatabasePath, developmentDataRoot);
  assertManagedFileTarget(`${developmentDatabasePath}.secret.key`, developmentDataRoot);

  const databaseUrl = pathToFileURL(developmentDatabasePath).href;
  const childEnvironment = buildChildEnvironment(databaseUrl, developmentDataRoot);
  const retainedLines = readExistingRuntimeEnvironment()
    .filter((line) => !launcherOwnedBackendKeySet.has(assignmentName(line)));
  writeAtomically(
    developmentRuntimeEnvironmentPath,
    runtimeEnvironmentContent(retainedLines, {
      APP_ENV: before.values.APP_ENV,
      DB_TYPE: before.values.DB_TYPE,
      databaseUrl,
      logsDirectory: path.join(developmentDataRoot, 'logs'),
      memoryDirectory: path.join(developmentDataRoot, 'memory'),
      tempWorkspaceDirectory: path.join(developmentDataRoot, 'temp_workspace'),
    }),
  );
  assertManagedFileTarget(developmentRuntimeEnvironmentPath, developmentDataRoot);

  const after = readTrackedDevelopmentEnvironment();
  if (!before.bytes.equals(after.bytes)) throw stableError('DEV_ENV_TEMPLATE_MUTATED');

  return Object.freeze({
    workspaceRoot,
    serverRoot,
    webRoot,
    dataRoot: developmentDataRoot,
    runtimeEnvironmentPath: developmentRuntimeEnvironmentPath,
    databasePath: developmentDatabasePath,
    databaseUrl,
    backendUrl: developmentBackendUrl,
    frontendUrl: developmentFrontendUrl,
    backendEnvironment: childEnvironment.backendEnvironment,
    frontendEnvironment: childEnvironment.frontendEnvironment,
    templateBytes: Buffer.from(before.bytes),
  });
};

export const __testOnly = Object.freeze({
  isWithin,
  launcherOwnedBackendKeys,
  frontendBackendEnvironment,
  runtimeEnvironmentContent,
});
