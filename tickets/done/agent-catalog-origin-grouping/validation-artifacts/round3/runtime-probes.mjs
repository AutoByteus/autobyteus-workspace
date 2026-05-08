import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..', '..', '..');
const artifactDir = path.dirname(scriptPath);
const tempRoot = path.join(artifactDir, '.tmp-runtime-probes');
const serverApp = path.join(repoRoot, 'autobyteus-server-ts', 'dist', 'app.js');
const dailyTemplateDir = path.join(repoRoot, 'autobyteus-server-ts', 'dist', 'built-in-agents', 'templates', 'daily-assistant');
const memoryTemplateDir = path.join(repoRoot, 'autobyteus-server-ts', 'dist', 'built-in-agents', 'templates', 'memory-compactor');
const legacyAgentMdPath = path.join(repoRoot, 'autobyteus-server-ts', 'tests', 'fixtures', 'built-in-agents', 'legacy-daily-assistant-agent.md');
const dailyTemplateMd = await fs.readFile(path.join(dailyTemplateDir, 'agent.md'), 'utf8');
const memoryTemplateMd = await fs.readFile(path.join(memoryTemplateDir, 'agent.md'), 'utf8');
const dailyConfig = await fs.readFile(path.join(dailyTemplateDir, 'agent-config.json'), 'utf8');
const memoryConfig = await fs.readFile(path.join(memoryTemplateDir, 'agent-config.json'), 'utf8');
const legacyAgentMd = await fs.readFile(legacyAgentMdPath, 'utf8');

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(() => port ? resolve(port) : reject(new Error('No port assigned')));
    });
    server.on('error', reject);
  });
}

function envForRun() {
  return {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    TMPDIR: process.env.TMPDIR ?? '/tmp',
    USER: process.env.USER ?? '',
    SHELL: process.env.SHELL ?? '/bin/bash',
    LOG_LEVEL: 'INFO',
    DISABLE_HTTP_REQUEST_LOGS: 'true',
    PRISMA_LOG_QUERIES: '0',
  };
}

async function writeEnv(dataDir, port, extras = {}) {
  await fs.mkdir(dataDir, { recursive: true });
  const lines = [
    'APP_ENV=production',
    'DB_TYPE=sqlite',
    `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}`,
    'LOG_LEVEL=INFO',
    'DISABLE_HTTP_REQUEST_LOGS=true',
    'PRISMA_LOG_QUERIES=0',
    'AUTOBYTEUS_AGENT_PACKAGE_ROOTS=',
  ];
  for (const [key, value] of Object.entries(extras)) {
    lines.push(`${key}=${value}`);
  }
  await fs.writeFile(path.join(dataDir, '.env'), `${lines.join('\n')}\n`, 'utf8');
}

async function writeAgent(dir, agentMd, agentConfig = '{}\n') {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'agent.md'), agentMd, 'utf8');
  await fs.writeFile(path.join(dir, 'agent-config.json'), agentConfig, 'utf8');
}

async function createSharedAgent(dataDir, id, name, description) {
  await writeAgent(
    path.join(dataDir, 'agents', id),
    ['---', `name: ${name}`, `description: ${description}`, 'category: validation', 'role: Helper', '---', '', `${name} instructions.`].join('\n'),
    JSON.stringify({ toolNames: [], skillNames: [] }, null, 2),
  );
}

function featuredSetting(items) {
  return JSON.stringify({ version: 1, items });
}

async function waitForGraphql(port, child, logFiles) {
  const url = `http://127.0.0.1:${port}/graphql`;
  const query = '{ __typename }';
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < 90000) {
    if (child.exitCode !== null) {
      const stdout = await fs.readFile(logFiles.stdout, 'utf8').catch(() => '');
      const stderr = await fs.readFile(logFiles.stderr, 'utf8').catch(() => '');
      throw new Error(`server exited before GraphQL became ready (code=${child.exitCode})\nSTDOUT\n${stdout}\nSTDERR\n${stderr}`);
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`GraphQL did not become ready on port ${port}: ${lastError?.message ?? lastError}`);
}

async function startRuntime(caseName, dataDir, port) {
  const stdoutPath = path.join(artifactDir, `${caseName}.server.stdout.log`);
  const stderrPath = path.join(artifactDir, `${caseName}.server.stderr.log`);
  const stdout = fsSync.openSync(stdoutPath, 'w');
  const stderr = fsSync.openSync(stderrPath, 'w');
  const child = spawn(process.execPath, [serverApp, '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataDir], {
    cwd: path.join(repoRoot, 'autobyteus-server-ts'),
    env: envForRun(),
    stdio: ['ignore', stdout, stderr],
  });
  const logFiles = { stdout: stdoutPath, stderr: stderrPath };
  await waitForGraphql(port, child, logFiles);
  return {
    child,
    logFiles,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      const exited = await Promise.race([
        new Promise((resolve) => child.once('exit', () => resolve(true))),
        new Promise((resolve) => setTimeout(() => resolve(false), 8000)),
      ]);
      if (!exited) {
        child.kill('SIGKILL');
        await new Promise((resolve) => child.once('exit', resolve));
      }
    },
  };
}

async function graphQL(port, query, variables) {
  const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await response.json();
  if (!response.ok || json.errors?.length) {
    throw new Error(`GraphQL request failed: ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function collectSnapshot(caseName, dataDir, port, runtime) {
  const query = `
    query Round3BuiltInAgentProbe {
      agentDefinitions {
        id
        name
        description
        category
        ownershipScope
        ownerTeamId
        ownerTeamName
        ownerApplicationId
        ownerApplicationName
        ownerPackageId
        ownerLocalApplicationId
        defaultLaunchConfig { runtimeKind llmModelIdentifier llmConfig }
      }
      getServerSettings { key value }
    }
  `;
  const data = await graphQL(port, query);
  const agentsDir = path.join(dataDir, 'agents');
  const entries = await fs.readdir(agentsDir, { withFileTypes: true }).catch(() => []);
  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const readMaybe = async (relative) => fs.readFile(path.join(dataDir, relative), 'utf8').catch(() => null);
  const stdout = await fs.readFile(runtime.logFiles.stdout, 'utf8').catch(() => '');
  const stderr = await fs.readFile(runtime.logFiles.stderr, 'utf8').catch(() => '');
  return {
    caseName,
    dataDir,
    port,
    agentFolders: folders,
    definitions: data.agentDefinitions.map((entry) => ({
      id: entry.id,
      name: entry.name,
      ownershipScope: entry.ownershipScope,
      ownerTeamName: entry.ownerTeamName,
      ownerApplicationName: entry.ownerApplicationName,
      ownerPackageId: entry.ownerPackageId,
      ownerLocalApplicationId: entry.ownerLocalApplicationId,
      defaultLaunchConfig: entry.defaultLaunchConfig,
    })).sort((a, b) => a.id.localeCompare(b.id)),
    settings: Object.fromEntries(data.getServerSettings.map((entry) => [entry.key, entry.value])),
    fileObservations: {
      dailyAgentMd: await readMaybe(path.join('agents', 'daily-assistant', 'agent.md')),
      memoryCompactorAgentMd: await readMaybe(path.join('agents', 'autobyteus-memory-compactor', 'agent.md')),
      legacyAgentMd: await readMaybe(path.join('agents', 'autobyteus-super-assistant', 'agent.md')),
      env: await readMaybe('.env'),
    },
    logSignals: {
      stdoutContainsMigration: stdout.includes("Migrated built-in agent folder 'autobyteus-super-assistant' to 'daily-assistant'"),
      stdoutContainsUpgrade: stdout.includes("Upgraded legacy 'daily-assistant' agent.md"),
      stdoutContainsCollisionRemoval: stdout.includes("Removed unmodified legacy built-in agent folder 'autobyteus-super-assistant'"),
      stdoutContainsCollisionWarning: [stdout, stderr].join('\n').includes("Both built-in agent folders 'autobyteus-super-assistant' and 'daily-assistant' exist"),
      stderrTail: stderr.split('\n').slice(-20).join('\n'),
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findDefinition(snapshot, id) {
  return snapshot.definitions.find((entry) => entry.id === id);
}

function parseFeatured(snapshot) {
  const raw = snapshot.settings.AUTOBYTEUS_FEATURED_CATALOG_ITEMS;
  return raw ? JSON.parse(raw) : null;
}

function validateCommonBuiltIns(snapshot) {
  const daily = findDefinition(snapshot, 'daily-assistant');
  const memory = findDefinition(snapshot, 'autobyteus-memory-compactor');
  assert(daily, `${snapshot.caseName}: missing daily-assistant definition`);
  assert(memory, `${snapshot.caseName}: missing autobyteus-memory-compactor definition`);
  assert(memory.name === 'Memory Compactor', `${snapshot.caseName}: unexpected Memory Compactor name ${memory.name}`);
  assert(snapshot.agentFolders.includes('autobyteus-memory-compactor'), `${snapshot.caseName}: missing memory compactor folder`);
}

async function runCase(caseName, setup, validate) {
  const port = await getFreePort();
  const dataDir = path.join(tempRoot, caseName);
  await fs.rm(dataDir, { recursive: true, force: true });
  await setup(dataDir, port);
  const runtime = await startRuntime(caseName, dataDir, port);
  let snapshot;
  try {
    snapshot = await collectSnapshot(caseName, dataDir, port, runtime);
    validate(snapshot);
    await fs.writeFile(path.join(artifactDir, `${caseName}.snapshot.json`), JSON.stringify(snapshot, null, 2), 'utf8');
    return snapshot;
  } finally {
    await runtime.stop();
  }
}

await fs.rm(tempRoot, { recursive: true, force: true });
await fs.mkdir(tempRoot, { recursive: true });

const snapshots = [];

snapshots.push(await runCase('fresh-built-ins', async (dataDir, port) => {
  await writeEnv(dataDir, port);
}, (snapshot) => {
  validateCommonBuiltIns(snapshot);
  const daily = findDefinition(snapshot, 'daily-assistant');
  assert(daily.name === 'Daily Assistant', `fresh: unexpected daily name ${daily.name}`);
  assert(snapshot.agentFolders.includes('daily-assistant'), 'fresh: missing daily folder');
  assert(!snapshot.agentFolders.includes('autobyteus-super-assistant'), 'fresh: legacy folder unexpectedly present');
  assert(snapshot.fileObservations.dailyAgentMd === dailyTemplateMd, 'fresh: daily agent.md is not canonical template');
  assert(snapshot.fileObservations.memoryCompactorAgentMd === memoryTemplateMd, 'fresh: memory compactor agent.md is not canonical template');
  const featured = parseFeatured(snapshot);
  assert(featured?.items?.[0]?.definitionId === 'daily-assistant', 'fresh: featured setting not daily-assistant');
  assert(snapshot.settings.AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID === 'autobyteus-memory-compactor', 'fresh: compaction setting not memory compactor');
}));

snapshots.push(await runCase('legacy-unmodified-migration', async (dataDir, port) => {
  await writeEnv(dataDir, port, {
    AUTOBYTEUS_FEATURED_CATALOG_ITEMS: featuredSetting([
      { resourceKind: 'AGENT_TEAM', definitionId: 'team-a', sortOrder: 5 },
      { resourceKind: 'AGENT', definitionId: 'autobyteus-super-assistant', sortOrder: 20 },
      { resourceKind: 'AGENT', definitionId: 'other-agent', sortOrder: 30 },
    ]),
  });
  await writeAgent(path.join(dataDir, 'agents', 'autobyteus-super-assistant'), legacyAgentMd, dailyConfig);
  await createSharedAgent(dataDir, 'other-agent', 'Other Agent', 'Other featured agent');
}, (snapshot) => {
  validateCommonBuiltIns(snapshot);
  const daily = findDefinition(snapshot, 'daily-assistant');
  assert(daily.name === 'Daily Assistant', `legacy unmodified: expected upgraded Daily Assistant name, got ${daily.name}`);
  assert(snapshot.agentFolders.includes('daily-assistant'), 'legacy unmodified: missing daily folder');
  assert(!snapshot.agentFolders.includes('autobyteus-super-assistant'), 'legacy unmodified: legacy folder not removed after move');
  assert(snapshot.fileObservations.dailyAgentMd === dailyTemplateMd, 'legacy unmodified: daily md not upgraded to canonical template');
  const featured = parseFeatured(snapshot);
  assert(featured.items.some((item) => item.resourceKind === 'AGENT_TEAM' && item.definitionId === 'team-a' && item.sortOrder === 5), 'legacy unmodified: team row not preserved');
  assert(featured.items.some((item) => item.resourceKind === 'AGENT' && item.definitionId === 'daily-assistant' && item.sortOrder === 20), 'legacy unmodified: legacy featured row not migrated with sort order');
  assert(!featured.items.some((item) => item.definitionId === 'autobyteus-super-assistant'), 'legacy unmodified: old featured id still present');
  assert(snapshot.logSignals.stdoutContainsMigration, 'legacy unmodified: migration log not observed');
  assert(snapshot.logSignals.stdoutContainsUpgrade, 'legacy unmodified: upgrade log not observed');
}));

const editedMarker = 'ROUND3_USER_EDIT_PRESERVE_MARKER';
const editedLegacyMd = legacyAgentMd.replace('Help the user complete a wide range of tasks', `Help the user complete a wide range of tasks. ${editedMarker}`);
snapshots.push(await runCase('legacy-edited-preservation', async (dataDir, port) => {
  await writeEnv(dataDir, port, {
    AUTOBYTEUS_FEATURED_CATALOG_ITEMS: featuredSetting([
      { resourceKind: 'AGENT', definitionId: 'autobyteus-super-assistant', sortOrder: 10 },
    ]),
  });
  await writeAgent(path.join(dataDir, 'agents', 'autobyteus-super-assistant'), editedLegacyMd, dailyConfig);
}, (snapshot) => {
  validateCommonBuiltIns(snapshot);
  assert(snapshot.agentFolders.includes('daily-assistant'), 'legacy edited: missing daily folder after move');
  assert(!snapshot.agentFolders.includes('autobyteus-super-assistant'), 'legacy edited: legacy folder should have moved');
  assert(snapshot.fileObservations.dailyAgentMd?.includes(editedMarker), 'legacy edited: user edit marker was not preserved');
  assert(snapshot.fileObservations.dailyAgentMd !== dailyTemplateMd, 'legacy edited: user-edited agent.md was rewritten to canonical template');
  const featured = parseFeatured(snapshot);
  assert(featured.items.length === 1 && featured.items[0].definitionId === 'daily-assistant', 'legacy edited: featured row not migrated to daily-assistant');
  assert(snapshot.logSignals.stdoutContainsMigration, 'legacy edited: migration log not observed');
}));

snapshots.push(await runCase('collision-unmodified-legacy', async (dataDir, port) => {
  await writeEnv(dataDir, port);
  await writeAgent(path.join(dataDir, 'agents', 'daily-assistant'), dailyTemplateMd, dailyConfig);
  await writeAgent(path.join(dataDir, 'agents', 'autobyteus-super-assistant'), legacyAgentMd, dailyConfig);
}, (snapshot) => {
  validateCommonBuiltIns(snapshot);
  assert(snapshot.agentFolders.includes('daily-assistant'), 'collision unmodified: missing daily folder');
  assert(!snapshot.agentFolders.includes('autobyteus-super-assistant'), 'collision unmodified: unmodified legacy folder should be removed');
  assert(snapshot.fileObservations.dailyAgentMd === dailyTemplateMd, 'collision unmodified: canonical target overwritten/changed');
  assert(snapshot.logSignals.stdoutContainsCollisionRemoval, 'collision unmodified: removal log not observed');
}));

snapshots.push(await runCase('collision-edited-legacy', async (dataDir, port) => {
  await writeEnv(dataDir, port);
  await writeAgent(path.join(dataDir, 'agents', 'daily-assistant'), dailyTemplateMd, dailyConfig);
  await writeAgent(path.join(dataDir, 'agents', 'autobyteus-super-assistant'), editedLegacyMd, dailyConfig);
}, (snapshot) => {
  validateCommonBuiltIns(snapshot);
  assert(snapshot.agentFolders.includes('daily-assistant'), 'collision edited: missing daily folder');
  assert(snapshot.agentFolders.includes('autobyteus-super-assistant'), 'collision edited: edited legacy folder should remain');
  assert(snapshot.fileObservations.dailyAgentMd === dailyTemplateMd, 'collision edited: canonical target overwritten/changed');
  assert(snapshot.fileObservations.legacyAgentMd?.includes(editedMarker), 'collision edited: edited legacy content not preserved');
  assert(findDefinition(snapshot, 'autobyteus-super-assistant'), 'collision edited: unresolved legacy folder should still appear as a normal non-featured definition');
  const featured = parseFeatured(snapshot);
  assert(featured.items.length === 1 && featured.items[0].definitionId === 'daily-assistant', 'collision edited: featured setting should initialize to daily-assistant only');
  assert(snapshot.logSignals.stdoutContainsCollisionWarning, 'collision edited: collision warning not observed');
}));

await fs.writeFile(path.join(artifactDir, 'runtime-probes-summary.json'), JSON.stringify({
  result: 'PASS',
  generatedAt: new Date().toISOString(),
  cases: snapshots.map((snapshot) => ({
    caseName: snapshot.caseName,
    port: snapshot.port,
    agentFolders: snapshot.agentFolders,
    definitionIds: snapshot.definitions.map((definition) => definition.id),
    featuredSetting: snapshot.settings.AUTOBYTEUS_FEATURED_CATALOG_ITEMS,
    compactionSetting: snapshot.settings.AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
    logSignals: snapshot.logSignals,
  })),
}, null, 2), 'utf8');

await fs.rm(tempRoot, { recursive: true, force: true });
console.log(`Round 3 runtime probes passed: ${snapshots.map((snapshot) => snapshot.caseName).join(', ')}`);
