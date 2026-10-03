// Investigation-only probe. Executes unchanged worktree stores with real Pinia/Vue
// and a test-owned Apollo boundary. Does not access a server or user data.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../../..');
const dependencyRoot = process.env.PROBE_DEPENDENCY_ROOT || root;
const dependencyRequire = createRequire(path.join(dependencyRoot, 'autobyteus-web/package.json'));
const ts = dependencyRequire('typescript');
const pinia = dependencyRequire('pinia');
const vue = createRequire(dependencyRequire.resolve('pinia'))('vue');
const operations = [];
let revision = 'old';
const agentId = 'team-local-agent:english-bridge-team:worker';
const agent = () => ({ id: agentId, name: 'Worker', ownershipScope: 'TEAM_LOCAL', ownerTeamId: 'english-bridge-team', description: revision === 'old' ? 'Old description' : 'Works on received requests.', instructions: revision === 'old' ? 'Old Worker instructions' : 'Work on the request you receive.' });
const team = () => ({ id: 'english-bridge-team', name: 'English Bridge Team', instructions: revision === 'old' ? 'Old Team instructions' : 'Updated Team instructions', nodes: [{memberName: 'worker', ref: 'worker', refScope: 'TEAM_LOCAL'}] });
const client = {
  async query(options) {
    operations.push({kind: 'query', ...options});
    if (options.query === 'GetAgentDefinitions') return {data: {agentDefinitions: [agent()]}};
    if (options.query === 'GetAgentTeamDefinitions') return {data: {agentTeamDefinitions: [team()]}};
    throw Error('Unexpected query');
  },
  async mutate(options) { operations.push({kind: 'mutation', ...options}); return {data: {refreshAgentTeamDefinitionCatalog: true}}; }
};
function loadSource(relativePath) {
  const file = path.join(root, 'autobyteus-web', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}});
  const module = {exports: {}};
  const fakeRequire = (id) => {
    if (id === 'vue') return vue;
    if (id === 'pinia') return pinia;
    if (id === '~/utils/apolloClient') return {getApolloClient: () => client};
    if (id === '~/stores/windowNodeContextStore') return {useWindowNodeContextStore: () => ({waitForBoundBackendReady: async () => true})};
    if (id === '~/utils/definitionOwnership') return loadSource('utils/definitionOwnership.ts');
    if (id.startsWith('~/graphql/')) return new Proxy({}, {get: (_, key) => String(key)});
    throw Error('Unmapped dependency: ' + id);
  };
  vm.runInNewContext(outputText, {require: fakeRequire, module, exports: module.exports, console}, {filename: file});
  return module.exports;
}
(async () => {
  pinia.setActivePinia(pinia.createPinia());
  const agents = loadSource('stores/agentDefinitionStore.ts').useAgentDefinitionStore();
  const teams = loadSource('stores/agentTeamDefinitionStore.ts').useAgentTeamDefinitionStore();
  await Promise.all([agents.fetchAllAgentDefinitions(), teams.fetchAllAgentTeamDefinitions()]);
  assert.equal(agents.getAgentDefinitionById(agentId).instructions, 'Old Worker instructions');
  revision = 'new'; // models the package creator's completed source update
  operations.length = 0;
  await teams.refreshAndReloadAllAgentTeamDefinitions();
  await Promise.all([teams.fetchAllAgentTeamDefinitions(), agents.fetchAllAgentDefinitions()]); // actual TeamDetail read path
  assert.equal(teams.getCatalogAgentTeamDefinitionById('english-bridge-team').instructions, 'Updated Team instructions');
  assert.equal(agents.getAgentDefinitionById(agentId).instructions, 'Old Worker instructions'); // AgentDetail read path
  assert.deepEqual(operations.map(x => x.query || x.mutation), ['RefreshAgentTeamDefinitionCatalog', 'GetAgentTeamDefinitions']);
  console.log('CONFIRMED: Team Reload updates Team snapshot, leaves existing Worker snapshot stale.');
  console.log('Operations after source update:', JSON.stringify(operations));
  await agents.reloadAllAgentDefinitions(); // diagnostic read of existing public action, not a source patch
  assert.equal(agents.getAgentDefinitionById(agentId).instructions, 'Work on the request you receive.');
  assert.equal(agents.getAgentDefinitionById(agentId).description, 'Works on received requests.');
  console.log('CONFIRMED: network-only Agent catalog read publishes latest Worker instructions and description.');
  console.log('LIMIT: controlled Apollo boundary; not a real HTTP/browser/packaged-app reproduction. No implementation changed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
