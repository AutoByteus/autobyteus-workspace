import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { createWriteStream } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const serverRoot = path.join(repoRoot, 'autobyteus-server-ts');
const distApp = path.join(serverRoot, 'dist', 'app.js');
const evidenceDir = path.join(repoRoot, 'tickets', 'featured-default-assistant', 'validation-evidence');
const settingKey = 'AUTOBYTEUS_FEATURED_CATALOG_ITEMS';
const superAssistantId = 'autobyteus-super-assistant';

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function writeEnv(dataDir, port, extraLines = []) {
  await fs.mkdir(dataDir, { recursive: true });
  const lines = [
    `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}`,
    'APP_ENV=test',
    'AUTOBYTEUS_AGENT_PACKAGE_ROOTS=',
    'AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=',
    'LOG_LEVEL=ERROR',
    ...extraLines,
    '',
  ];
  await fs.writeFile(path.join(dataDir, '.env'), lines.join('\n'), 'utf-8');
}

async function waitForHealth(port, child, logPath) {
  const url = `http://127.0.0.1:${port}/rest/health`;
  const deadline = Date.now() + 45000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`server exited early with code ${child.exitCode}; log: ${logPath}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`health ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for ${url}: ${lastError?.message ?? lastError}; log: ${logPath}`);
}

function cleanEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.AUTOBYTEUS_SERVER_HOST;
  delete env.APP_ENV;
  delete env.DATABASE_URL;
  delete env.AUTOBYTEUS_MEMORY_DIR;
  delete env.AUTOBYTEUS_LOG_DIR;
  delete env.AUTOBYTEUS_TEMP_WORKSPACE_DIR;
  delete env[settingKey];
  env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = '';
  env.AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS = '';
  env.LOG_LEVEL = 'ERROR';
  return env;
}

async function startServer(name, extraEnvLines = []) {
  const port = await freePort();
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-${name}-`));
  await writeEnv(dataDir, port, extraEnvLines);
  const logPath = path.join(evidenceDir, `${name}-server.log`);
  const logStream = createWriteStream(logPath, { flags: 'w' });
  const child = spawn(process.execPath, [distApp, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverRoot,
    env: cleanEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  await waitForHealth(port, child, logPath);
  return { port, dataDir, logPath, child, logStream };
}

async function stopServer(server) {
  if (server.child.exitCode === null) {
    server.child.kill('SIGTERM');
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, 5000);
      server.child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
  server.logStream.end();
}

async function graphql(port, query, variables = {}) {
  const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json();
  if (!response.ok || payload.errors?.length) {
    throw new Error(JSON.stringify(payload));
  }
  return payload.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readSetting(port) {
  const data = await graphql(port, `query Settings { getServerSettings { key value description isEditable isDeletable } }`);
  return data.getServerSettings.find((entry) => entry.key === settingKey);
}

async function scenarioFreshBuiltStartup() {
  const server = await startServer('fresh-built-startup');
  try {
    const agentDir = path.join(server.dataDir, 'agents', superAssistantId);
    const seededMd = await fs.readFile(path.join(agentDir, 'agent.md'), 'utf-8');
    const seededConfig = JSON.parse(await fs.readFile(path.join(agentDir, 'agent-config.json'), 'utf-8'));
    assert(seededMd.includes('name: AutoByteus Super Assistant'), 'fresh startup did not seed Super Assistant markdown');
    assert(!Object.prototype.hasOwnProperty.call(seededConfig, 'featured'), 'agent-config.json self-declares featured metadata');

    const agents = await graphql(server.port, `query Agents { agentDefinitions { id name ownershipScope defaultLaunchConfig { runtimeKind llmModelIdentifier } } }`);
    const superAssistant = agents.agentDefinitions.find((agent) => agent.id === superAssistantId);
    assert(superAssistant?.name === 'AutoByteus Super Assistant', 'Super Assistant did not resolve through GraphQL agentDefinitions');
    assert(superAssistant?.ownershipScope === 'SHARED', 'Super Assistant should be a normal shared agent');

    const setting = await readSetting(server.port);
    assert(setting?.isEditable === true && setting?.isDeletable === false, 'featured setting metadata is wrong');
    assert(JSON.stringify(JSON.parse(setting.value)) === JSON.stringify({
      version: 1,
      items: [{ resourceKind: 'AGENT', definitionId: superAssistantId, sortOrder: 10 }],
    }), 'fresh startup default featured setting was not initialized as expected');

    return { dataDir: server.dataDir, logPath: server.logPath, port: server.port };
  } finally {
    await stopServer(server);
  }
}

async function scenarioExistingFilesBlankSetting() {
  const port = await freePort();
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-existing-files-blank-'));
  const agentDir = path.join(dataDir, 'agents', superAssistantId);
  await fs.mkdir(agentDir, { recursive: true });
  const customMd = `---\nname: User Edited Super Assistant\ndescription: Preserved by startup\ncategory: general\nrole: Custom assistant\n---\n\nUSER EDITED INSTRUCTIONS\n`;
  await fs.writeFile(path.join(agentDir, 'agent.md'), customMd, 'utf-8');
  await fs.writeFile(path.join(agentDir, 'agent-config.json'), JSON.stringify({ defaultLaunchConfig: null }, null, 2), 'utf-8');
  await writeEnv(dataDir, port, [`${settingKey}=   `]);

  const logPath = path.join(evidenceDir, 'existing-files-blank-setting-server.log');
  const logStream = createWriteStream(logPath, { flags: 'w' });
  const child = spawn(process.execPath, [distApp, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: serverRoot,
    env: cleanEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  const server = { port, dataDir, logPath, child, logStream };
  try {
    await waitForHealth(port, child, logPath);
    const preservedMd = await fs.readFile(path.join(agentDir, 'agent.md'), 'utf-8');
    assert(preservedMd === customMd, 'startup overwrote existing Super Assistant markdown');
    const setting = await readSetting(port);
    assert(JSON.parse(setting.value).items[0]?.definitionId === superAssistantId, 'blank featured setting was not initialized');
    return { dataDir, logPath, port };
  } finally {
    await stopServer(server);
  }
}

async function scenarioEmptySettingPreserved() {
  const emptyValue = JSON.stringify({ version: 1, items: [] });
  const server = await startServer('empty-setting-preserved', [`${settingKey}=${emptyValue}`]);
  try {
    await fs.access(path.join(server.dataDir, 'agents', superAssistantId, 'agent.md'));
    const setting = await readSetting(server.port);
    assert(setting.value === emptyValue, 'intentional empty featured setting was not preserved');
    return { dataDir: server.dataDir, logPath: server.logPath, port: server.port };
  } finally {
    await stopServer(server);
  }
}

const result = {
  freshBuiltStartup: await scenarioFreshBuiltStartup(),
  existingFilesBlankSetting: await scenarioExistingFilesBlankSetting(),
  emptySettingPreserved: await scenarioEmptySettingPreserved(),
};

console.log(JSON.stringify(result, null, 2));
