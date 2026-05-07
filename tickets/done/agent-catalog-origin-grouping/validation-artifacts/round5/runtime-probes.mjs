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
const privateAgentsRoot = '/Users/normy/autobyteus_org/autobyteus-private-agents';
const privateDailyRoot = path.join(privateAgentsRoot, 'agents', 'daily-assistant');
const privateDailyAgentMd = await fs.readFile(path.join(privateDailyRoot, 'agent.md'), 'utf8');
const privateDailyConfig = JSON.parse(await fs.readFile(path.join(privateDailyRoot, 'agent-config.json'), 'utf8'));
const memoryTemplateMd = await fs.readFile(path.join(repoRoot, 'autobyteus-server-ts', 'dist', 'built-in-agents', 'templates', 'memory-compactor', 'agent.md'), 'utf8');
const memoryTemplateConfig = JSON.parse(await fs.readFile(path.join(repoRoot, 'autobyteus-server-ts', 'dist', 'built-in-agents', 'templates', 'memory-compactor', 'agent-config.json'), 'utf8'));

const forbiddenPrivateTools = new Set(['download_media', 'edit_image', 'generate_image', 'generate_speech', 'read_media_file']);
const expectedPrivateTools = [...privateDailyConfig.toolNames].sort();

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
  const base = {
    APP_ENV: 'production',
    DB_TYPE: 'sqlite',
    AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${port}`,
    LOG_LEVEL: 'INFO',
    DISABLE_HTTP_REQUEST_LOGS: 'true',
    PRISMA_LOG_QUERIES: '0',
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '',
    AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID: '',
  };
  const lines = Object.entries({ ...base, ...extras }).map(([key, value]) => `${key}=${value}`);
  await fs.writeFile(path.join(dataDir, '.env'), `${lines.join('\n')}\n`, 'utf8');
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
      if (response.ok) return;
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
    signal: AbortSignal.timeout(15000),
  });
  const json = await response.json();
  if (!response.ok || json.errors?.length) {
    throw new Error(`GraphQL request failed: ${JSON.stringify(json)}`);
  }
  return json.data;
}

const definitionFields = `
  id
  name
  description
  instructions
  toolNames
  skillNames
  inputProcessorNames
  llmResponseProcessorNames
  systemPromptProcessorNames
  toolExecutionResultProcessorNames
  toolInvocationPreprocessorNames
  lifecycleProcessorNames
  ownershipScope
  ownerTeamId
  ownerTeamName
  ownerApplicationId
  ownerApplicationName
  ownerPackageId
  ownerLocalApplicationId
  defaultLaunchConfig { runtimeKind llmModelIdentifier llmConfig }
`;

async function collectSnapshot(caseName, dataDir, port, runtime) {
  const query = `
    query Round5PrivateDailyProbe {
      agentDefinitions { ${definitionFields} }
      daily: agentDefinition(id: "daily-assistant") { ${definitionFields} }
      superAi: agentDefinition(id: "super-ai-assistant") { id name }
      oldAutoByteus: agentDefinition(id: "autobyteus-super-assistant") { id name }
      getServerSettings { key value }
    }
  `;
  const data = await graphQL(port, query);
  const agentsDir = path.join(dataDir, 'agents');
  const entries = await fs.readdir(agentsDir, { withFileTypes: true }).catch(() => []);
  const agentFolders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const readMaybe = async (relative) => fs.readFile(path.join(dataDir, relative), 'utf8').catch(() => null);
  const stdout = await fs.readFile(runtime.logFiles.stdout, 'utf8').catch(() => '');
  const stderr = await fs.readFile(runtime.logFiles.stderr, 'utf8').catch(() => '');

  return {
    caseName,
    dataDir,
    port,
    agentFolders,
    definitions: data.agentDefinitions.sort((a, b) => a.id.localeCompare(b.id)),
    daily: data.daily,
    superAi: data.superAi,
    oldAutoByteus: data.oldAutoByteus,
    settings: Object.fromEntries(data.getServerSettings.map((entry) => [entry.key, entry.value])),
    fileObservations: {
      env: await readMaybe('.env'),
      memoryCompactorAgentMd: await readMaybe(path.join('agents', 'autobyteus-memory-compactor', 'agent.md')),
      memoryCompactorAgentConfig: await readMaybe(path.join('agents', 'autobyteus-memory-compactor', 'agent-config.json')),
      dailyAgentMdFromAppData: await readMaybe(path.join('agents', 'daily-assistant', 'agent.md')),
      superAiAgentMdFromAppData: await readMaybe(path.join('agents', 'super-ai-assistant', 'agent.md')),
      oldAutoByteusAgentMdFromAppData: await readMaybe(path.join('agents', 'autobyteus-super-assistant', 'agent.md')),
    },
    logSignals: {
      stdoutContainsMemorySeed: stdout.includes("autobyteus-memory-compactor"),
      combinedContainsDailyBuiltInSeed: [stdout, stderr].join('\n').includes('Seeded built-in agent') && [stdout, stderr].join('\n').includes('daily-assistant'),
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

function assertNoFeaturedSetting(snapshot) {
  assert(!Object.prototype.hasOwnProperty.call(snapshot.settings, 'AUTOBYTEUS_FEATURED_CATALOG_ITEMS'), `${snapshot.caseName}: featured catalog setting was unexpectedly initialized`);
  assert(!snapshot.fileObservations.env.includes('AUTOBYTEUS_FEATURED_CATALOG_ITEMS='), `${snapshot.caseName}: .env unexpectedly contains featured catalog setting`);
}

function validateMemoryOnlyServerBuiltIn(snapshot) {
  const memory = findDefinition(snapshot, 'autobyteus-memory-compactor');
  assert(memory, `${snapshot.caseName}: missing Memory Compactor definition`);
  assert(memory.name === 'Memory Compactor', `${snapshot.caseName}: unexpected Memory Compactor name ${memory.name}`);
  assert(snapshot.agentFolders.includes('autobyteus-memory-compactor'), `${snapshot.caseName}: Memory Compactor folder was not seeded in app data`);
  assert(snapshot.fileObservations.memoryCompactorAgentMd === memoryTemplateMd, `${snapshot.caseName}: Memory Compactor agent.md does not match built template`);
  assert(JSON.stringify(JSON.parse(snapshot.fileObservations.memoryCompactorAgentConfig)) === JSON.stringify(memoryTemplateConfig), `${snapshot.caseName}: Memory Compactor agent-config.json does not match built template`);
  assert(snapshot.settings.AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID === 'autobyteus-memory-compactor', `${snapshot.caseName}: blank compaction setting did not initialize to autobyteus-memory-compactor`);
  for (const invalidId of ['daily-assistant', 'super-ai-assistant', 'autobyteus-super-assistant']) {
    assert(!snapshot.agentFolders.includes(invalidId), `${snapshot.caseName}: app data unexpectedly contains ${invalidId}`);
  }
  assert(!snapshot.fileObservations.dailyAgentMdFromAppData, `${snapshot.caseName}: Daily Assistant was server-seeded into app data`);
  assert(!snapshot.fileObservations.superAiAgentMdFromAppData, `${snapshot.caseName}: old private super-ai-assistant path was server-seeded into app data`);
  assert(!snapshot.fileObservations.oldAutoByteusAgentMdFromAppData, `${snapshot.caseName}: legacy autobyteus-super-assistant path was server-seeded into app data`);
}

function validatePrivateDaily(snapshot) {
  assert(snapshot.daily, `${snapshot.caseName}: private daily-assistant did not resolve`);
  assert(snapshot.daily.id === 'daily-assistant', `${snapshot.caseName}: unexpected Daily Assistant id ${snapshot.daily.id}`);
  assert(snapshot.daily.name === 'Daily Assistant', `${snapshot.caseName}: unexpected Daily Assistant name ${snapshot.daily.name}`);
  assert(snapshot.daily.instructions === privateDailyAgentMd.split('---').slice(2).join('---').trim() || snapshot.daily.instructions.includes('You are Daily Assistant.'), `${snapshot.caseName}: Daily Assistant instructions do not appear to come from private agent.md`);
  assert(snapshot.daily.ownershipScope === 'SHARED', `${snapshot.caseName}: Daily Assistant should be a normal shared/private-package agent, got ${snapshot.daily.ownershipScope}`);
  assert(!snapshot.superAi, `${snapshot.caseName}: deleted private legacy id super-ai-assistant still resolves`);
  assert(!snapshot.oldAutoByteus, `${snapshot.caseName}: old server legacy id autobyteus-super-assistant still resolves`);
  const actualTools = [...snapshot.daily.toolNames].sort();
  assert(JSON.stringify(actualTools) === JSON.stringify(expectedPrivateTools), `${snapshot.caseName}: Daily toolNames did not match preserved private config. actual=${JSON.stringify(actualTools)} expected=${JSON.stringify(expectedPrivateTools)}`);
  for (const toolName of snapshot.daily.toolNames) {
    assert(!forbiddenPrivateTools.has(toolName), `${snapshot.caseName}: Daily Assistant includes forbidden old server built-in-only tool ${toolName}`);
  }
  for (const key of [
    'inputProcessorNames',
    'llmResponseProcessorNames',
    'systemPromptProcessorNames',
    'toolExecutionResultProcessorNames',
    'toolInvocationPreprocessorNames',
    'lifecycleProcessorNames',
    'skillNames',
  ]) {
    const actual = [...snapshot.daily[key]].sort();
    const expected = [...(privateDailyConfig[key] ?? [])].sort();
    assert(JSON.stringify(actual) === JSON.stringify(expected), `${snapshot.caseName}: Daily ${key} did not match preserved private config. actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`);
  }
  assert(snapshot.daily.defaultLaunchConfig === (privateDailyConfig.defaultLaunchConfig ?? null) || JSON.stringify(snapshot.daily.defaultLaunchConfig) === JSON.stringify(privateDailyConfig.defaultLaunchConfig ?? null), `${snapshot.caseName}: Daily defaultLaunchConfig did not match preserved private config`);
}

async function runCase(caseName, setup, validate, afterStart) {
  const port = await getFreePort();
  const dataDir = path.join(tempRoot, caseName);
  await fs.rm(dataDir, { recursive: true, force: true });
  await setup(dataDir, port);
  const runtime = await startRuntime(caseName, dataDir, port);
  let snapshot;
  try {
    if (afterStart) {
      await afterStart({ dataDir, port, runtime });
    }
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

snapshots.push(await runCase('fresh-memory-only', async (dataDir, port) => {
  await writeEnv(dataDir, port);
}, (snapshot) => {
  validateMemoryOnlyServerBuiltIn(snapshot);
  assert(!findDefinition(snapshot, 'daily-assistant'), 'fresh-memory-only: Daily Assistant should not resolve without private package root');
  assert(!findDefinition(snapshot, 'super-ai-assistant'), 'fresh-memory-only: super-ai-assistant should not resolve');
  assert(!findDefinition(snapshot, 'autobyteus-super-assistant'), 'fresh-memory-only: autobyteus-super-assistant should not resolve');
  assertNoFeaturedSetting(snapshot);
}));

snapshots.push(await runCase('private-root-unfeatured', async (dataDir, port) => {
  await writeEnv(dataDir, port, {
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: privateAgentsRoot,
  });
}, (snapshot) => {
  validateMemoryOnlyServerBuiltIn(snapshot);
  validatePrivateDaily(snapshot);
  assertNoFeaturedSetting(snapshot);
}));

const featuredSettingValue = JSON.stringify({
  version: 1,
  items: [
    { resourceKind: 'AGENT', definitionId: 'daily-assistant', sortOrder: 10 },
  ],
});

snapshots.push(await runCase('private-root-settings-featured', async (dataDir, port) => {
  await writeEnv(dataDir, port, {
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: privateAgentsRoot,
  });
}, (snapshot) => {
  validateMemoryOnlyServerBuiltIn(snapshot);
  validatePrivateDaily(snapshot);
  const featured = JSON.parse(snapshot.settings.AUTOBYTEUS_FEATURED_CATALOG_ITEMS);
  assert(featured.version === 1, 'private-root-settings-featured: featured setting version not 1');
  assert(featured.items.length === 1, 'private-root-settings-featured: expected one featured row');
  assert(featured.items[0].resourceKind === 'AGENT', 'private-root-settings-featured: featured resource kind not AGENT');
  assert(featured.items[0].definitionId === 'daily-assistant', 'private-root-settings-featured: featured id not daily-assistant');
  assert(featured.items[0].sortOrder === 10, 'private-root-settings-featured: featured sort order not preserved');
}, async ({ port }) => {
  const mutation = `
    mutation FeatureDaily($key: String!, $value: String!) {
      updateServerSetting(key: $key, value: $value)
    }
  `;
  const result = await graphQL(port, mutation, {
    key: 'AUTOBYTEUS_FEATURED_CATALOG_ITEMS',
    value: featuredSettingValue,
  });
  assert(result.updateServerSetting.includes('updated successfully'), `featured setting mutation failed: ${result.updateServerSetting}`);
}));

await fs.writeFile(path.join(artifactDir, 'runtime-probes-summary.json'), JSON.stringify({
  result: 'PASS',
  generatedAt: new Date().toISOString(),
  privateAgentsRoot,
  expectedPrivateDailyToolNames: expectedPrivateTools,
  forbiddenPrivateTools: [...forbiddenPrivateTools].sort(),
  cases: snapshots.map((snapshot) => ({
    caseName: snapshot.caseName,
    port: snapshot.port,
    agentFolders: snapshot.agentFolders,
    definitionIds: snapshot.definitions.map((definition) => definition.id),
    dailyResolved: Boolean(snapshot.daily),
    superAiResolved: Boolean(snapshot.superAi),
    oldAutoByteusResolved: Boolean(snapshot.oldAutoByteus),
    dailyToolNames: snapshot.daily?.toolNames ?? null,
    dailyProcessors: snapshot.daily ? {
      inputProcessorNames: snapshot.daily.inputProcessorNames,
      llmResponseProcessorNames: snapshot.daily.llmResponseProcessorNames,
      systemPromptProcessorNames: snapshot.daily.systemPromptProcessorNames,
      toolExecutionResultProcessorNames: snapshot.daily.toolExecutionResultProcessorNames,
      toolInvocationPreprocessorNames: snapshot.daily.toolInvocationPreprocessorNames,
      lifecycleProcessorNames: snapshot.daily.lifecycleProcessorNames,
      skillNames: snapshot.daily.skillNames,
      defaultLaunchConfig: snapshot.daily.defaultLaunchConfig,
    } : null,
    featuredSetting: snapshot.settings.AUTOBYTEUS_FEATURED_CATALOG_ITEMS ?? null,
    compactionSetting: snapshot.settings.AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID,
  })),
}, null, 2), 'utf8');

await fs.rm(tempRoot, { recursive: true, force: true });
console.log(`Round 5 runtime probes passed: ${snapshots.map((snapshot) => snapshot.caseName).join(', ')}`);
