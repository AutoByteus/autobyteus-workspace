import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..', '..', '..');
const artifactDir = path.dirname(scriptPath);
const backendPort = Number(process.env.ROUND5_BACKEND_PORT ?? '53861');
const webPort = Number(process.env.ROUND5_WEB_PORT ?? '33861');
const dataDir = path.join(artifactDir, 'ui-runtime-data');
const appPackageRoot = path.join(artifactDir, 'ui-application-package');
const privateAgentsRoot = '/Users/normy/autobyteus_org/autobyteus-private-agents';

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

function agentMd(name, description, role = 'Helper') {
  return ['---', `name: ${name}`, `description: ${description}`, 'category: validation', `role: ${role}`, '---', '', `${name} validation instructions.`].join('\n');
}

function agentConfig() {
  return JSON.stringify({ toolNames: [], skillNames: [], defaultLaunchConfig: null }, null, 2);
}

async function writeAgent(root, id, name, description, role) {
  await writeFile(path.join(root, id, 'agent.md'), agentMd(name, description, role));
  await writeFile(path.join(root, id, 'agent-config.json'), agentConfig());
}

async function writeTeam(root, id, name, description, memberLocalId) {
  const teamRoot = path.join(root, id);
  await writeFile(path.join(teamRoot, 'team.md'), ['---', `name: ${name}`, `description: ${description}`, 'category: validation', '---', '', `${name} coordinates validation.`].join('\n'));
  await writeFile(path.join(teamRoot, 'team-config.json'), JSON.stringify({
    coordinatorMemberName: 'lead',
    members: [
      { memberName: 'lead', ref: memberLocalId, refType: 'agent', refScope: 'team_local' },
    ],
  }, null, 2));
}

await fs.rm(dataDir, { recursive: true, force: true });
await fs.rm(appPackageRoot, { recursive: true, force: true });
await fs.mkdir(dataDir, { recursive: true });

await writeFile(path.join(dataDir, '.env'), [
  'APP_ENV=production',
  'DB_TYPE=sqlite',
  `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${backendPort}`,
  'LOG_LEVEL=INFO',
  'DISABLE_HTTP_REQUEST_LOGS=true',
  'PRISMA_LOG_QUERIES=0',
  `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=${privateAgentsRoot}`,
  `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS=${appPackageRoot}`,
  'AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID=',
].join('\n') + '\n');

await writeAgent(path.join(dataDir, 'agents'), 'general-agent', 'General Agent', 'Shared validation agent', 'Shared helper');
const sharedTeamRoot = path.join(dataDir, 'agent-teams', 'software-engineering');
await writeTeam(path.join(dataDir, 'agent-teams'), 'software-engineering', 'Software Engineering Team', 'Shared team for team-local validation', 'implementation-engineer');
await writeAgent(path.join(sharedTeamRoot, 'agents'), 'implementation-engineer', 'Implementation Engineer', 'Team-local validation agent', 'Implementer');

const appRoot = path.join(appPackageRoot, 'applications', 'research-workspace');
await writeFile(path.join(appRoot, 'application.json'), JSON.stringify({
  manifestVersion: '3',
  id: 'research-workspace',
  name: 'Research Workspace',
  description: 'Application package for grouped catalog validation',
  ui: { entryHtml: 'ui/index.html', frontendSdkContractVersion: '3' },
  backend: { bundleManifest: 'backend/bundle.json' },
  resourceSlots: [],
}, null, 2));
await writeFile(path.join(appRoot, 'ui', 'index.html'), '<!doctype html><html><body>Research Workspace</body></html>\n');
await writeFile(path.join(appRoot, 'backend', 'bundle.json'), JSON.stringify({
  contractVersion: '1',
  entryModule: 'backend/dist/entry.mjs',
  moduleFormat: 'esm',
  distribution: 'self-contained',
  targetRuntime: { engine: 'node', semver: '>=22 <23' },
  sdkCompatibility: { backendDefinitionContractVersion: '2', frontendSdkContractVersion: '3' },
  supportedExposures: {
    queries: false,
    commands: false,
    routes: false,
    graphql: false,
    notifications: false,
    eventHandlers: false,
  },
  migrationsDir: 'backend/migrations',
  assetsDir: 'backend/assets',
}, null, 2));
await writeFile(path.join(appRoot, 'backend', 'dist', 'entry.mjs'), 'export default { definitionContractVersion: \'2\' }\n');
await fs.mkdir(path.join(appRoot, 'backend', 'migrations'), { recursive: true });
await fs.mkdir(path.join(appRoot, 'backend', 'assets'), { recursive: true });
await writeAgent(path.join(appRoot, 'agents'), 'research-assistant', 'Research Assistant', 'Application-owned validation agent', 'Research helper');
const appTeamRoot = path.join(appRoot, 'agent-teams', 'literature-review');
await writeTeam(path.join(appRoot, 'agent-teams'), 'literature-review', 'Literature Review Team', 'Application team for local-agent provenance', 'source-collector');
await writeAgent(path.join(appTeamRoot, 'agents'), 'source-collector', 'Source Collector', 'Application-team local agent', 'Collector');

const metadata = {
  repoRoot,
  artifactDir,
  backendPort,
  webPort,
  dataDir,
  appPackageRoot,
  privateAgentsRoot,
  backendBaseUrl: `http://127.0.0.1:${backendPort}`,
  graphqlUrl: `http://127.0.0.1:${backendPort}/graphql`,
  agentsPageUrl: `http://127.0.0.1:${webPort}/agents`,
  settingsAdvancedUrl: `http://127.0.0.1:${webPort}/settings?section=server-settings&mode=advanced`,
};
await writeFile(path.join(artifactDir, 'ui-runtime-metadata.json'), JSON.stringify(metadata, null, 2));
console.log(JSON.stringify(metadata, null, 2));
