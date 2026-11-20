// AC-012 measurement (autobyteus-554): the Memory page's owner queries on an APFS copy of the founder's memory folder,
// in-process over the built server (dist), with no server start, no migration and nothing written into the copy.
//
//   node ac012-measure.mjs <server dist dir> <memory copy> <scratch dir>
//
// - Local (this node): the episodic catalog's start pass over the copy (its catalog files go to <scratch>, never into
//   the copy), then the Agents cards and one agent's episodes from the catalog, counting run-folder discoveries
//   (expected: none after the start pass).
// - Imported: the copy's imported source(s) under imports/: the Agents cards, the busiest agent's episodes, and the
//   Agent Teams and Agent Orgs cards, each one request, timed (budget: 3 s).
// Task titles are not read (the Task side is not composed here): every episode's Task title is null.
import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const [distDir, copyDir, scratchDir] = process.argv.slice(2).map((value) => path.resolve(value));
if (!distDir || !copyDir || !scratchDir) throw new Error('usage: node ac012-measure.mjs <dist> <memory copy> <scratch>');
const load = (relative) => import(path.join(distDir, relative));

const { EpisodicCatalog } = await load('agent-episodic-catalog/services/episodic-catalog.js');
const { AgentMemoryLayout } = await load('agent-memory/store/agent-memory-layout.js');
const { RunFolderDiscovery } = await load('agent-memory/services/run-folder-discovery.js');
const { WorkJournalService } = await load('agent-work-journal/services/work-journal-service.js');
const { AgentMemoryExplorerService } = await load('agent-memory/services/agent-memory-explorer-service.js');
const { TeamMemoryExplorerService } = await load('agent-memory/services/team-memory-explorer-service.js');
const { AgentOrgMemoryExplorerService } = await load('agent-memory/services/agent-org-memory-explorer-service.js');
const { MemoryFileStore } = await load('agent-memory/store/memory-file-store.js');

const timed = async (label, work) => {
  const started = performance.now();
  const value = await work();
  return { label, ms: Math.round(performance.now() - started), value };
};
const counting = (discovery) => {
  const counter = { findRuns: 0, findRunsOfRoot: 0 };
  return {
    counter,
    discovery: {
      findRuns: () => { counter.findRuns += 1; return discovery.findRuns(); },
      findRunsOfRoot: (root) => { counter.findRunsOfRoot += 1; return discovery.findRunsOfRoot(root); },
      rootOf: (memoryDir) => discovery.rootOf(memoryDir),
    },
  };
};
const noDefinitions = { sharedIds: async () => new Set(), names: async () => new Map() };
const noGroupDefinitions = { teamById: async () => null, orgById: async () => null, allTeams: async () => [], allOrgs: async () => [], agentNames: async () => new Map() };
const nobodyHidden = { hiddenDefinitionIds: async () => new Set() };
const journals = new WorkJournalService();

const result = { node: process.version, copy: copyDir, measuredAt: new Date().toISOString(), local: {}, imported: [] };

// --- This node: catalog start pass, then cards and episodes from the catalog ---
const catalogDiscovery = counting(new RunFolderDiscovery(copyDir));
const catalog = new EpisodicCatalog({
  layout: new AgentMemoryLayout(scratchDir),
  discovery: catalogDiscovery.discovery,
  journals: { readJournalSpans: (dir) => journals.readJournalSpans(dir), onJournalChanged: () => () => undefined },
  tasks: { currentTaskOf: () => null },
});
const startPass = await timed('catalog start pass', async () => {
  catalog.start({ taskTitles: { taskTitleOf: async () => null } });
  await catalog.whenStartPassDone();
});
const definitionIds = catalog.agentDefinitionIds();
const runsPerDefinition = definitionIds.map((id) => [id, catalog.runsOf(id).length]).sort((a, b) => b[1] - a[1]);
result.local.startPass = { ms: startPass.ms, discoveries: { ...catalogDiscovery.counter }, definitions: definitionIds.length,
  runs: runsPerDefinition.reduce((sum, [, count]) => sum + count, 0) };

const explorerDiscovery = counting(new RunFolderDiscovery(copyDir));
const local = new AgentMemoryExplorerService(new MemoryFileStore(copyDir, { warnOnMissingFiles: false }), copyDir, {
  local: true, catalog: () => catalog, discovery: explorerDiscovery.discovery, definitions: noDefinitions, visibility: nobodyHidden,
});
const [busiestId, busiestRuns] = runsPerDefinition[0] ?? [null, 0];
const localSteps = [];
for (let round = 1; round <= 2; round += 1) {
  const cards = await timed(`Agents cards (round ${round})`, () => local.listAgentsWithMemory(null, 1, 500));
  localSteps.push({ step: cards.label, ms: cards.ms, cards: cards.value.total });
  if (busiestId) {
    const episodes = await timed(`episodes of the busiest agent (round ${round})`, () => local.listAgentEpisodes({ attribution: 'DEFINITION', agentDefinitionId: busiestId }, null, 1, 24));
    localSteps.push({ step: episodes.label, ms: episodes.ms, total: episodes.value.total });
    const filtered = await timed(`episodes filtered by "memory" (round ${round})`, () => local.listAgentEpisodes({ attribution: 'DEFINITION', agentDefinitionId: busiestId }, 'memory', 1, 24));
    localSteps.push({ step: filtered.label, ms: filtered.ms, total: filtered.value.total });
  }
  const unattributed = await timed(`unattributed runs (round ${round})`, () => local.listAgentEpisodes({ attribution: 'UNATTRIBUTED' }, null, 1, 24));
  localSteps.push({ step: unattributed.label, ms: unattributed.ms, total: unattributed.value.total });
}
result.local.busiestAgent = { runs: busiestRuns };
result.local.steps = localSteps;
result.local.discoveriesByTheExplorer = { ...explorerDiscovery.counter };
await catalog.stop();

// --- Imported sources: one discovery per request ---
const importsDir = path.join(copyDir, 'imports');
for (const sourceId of await fs.readdir(importsDir).catch(() => [])) {
  const importDir = path.join(importsDir, sourceId);
  if (!(await fs.stat(importDir)).isDirectory()) continue;
  const discovery = counting(new RunFolderDiscovery(importDir));
  const runs = (await new RunFolderDiscovery(importDir).findRuns()).length;
  const imported = new AgentMemoryExplorerService(new MemoryFileStore(importDir, { warnOnMissingFiles: false }), importDir, {
    local: false, discovery: discovery.discovery, definitions: noDefinitions, visibility: nobodyHidden,
  });
  const steps = [];
  const cards = await timed('Agents cards', () => imported.listAgentsWithMemory(null, 1, 500));
  steps.push({ step: cards.label, ms: cards.ms, cards: cards.value.total });
  const busiest = [...cards.value.entries].filter((card) => card.agentDefinitionId).sort((a, b) => b.runCount - a.runCount)[0];
  if (busiest) {
    const episodes = await timed('episodes of the busiest agent', () => imported.listAgentEpisodes({ attribution: 'DEFINITION', agentDefinitionId: busiest.agentDefinitionId }, null, 1, 24));
    steps.push({ step: episodes.label, ms: episodes.ms, total: episodes.value.total });
  }
  const teams = await timed('Agent Teams cards', () => new TeamMemoryExplorerService(importDir, { local: false, definitions: noGroupDefinitions }).listAgentTeamsWithMemory(null, 1, 500));
  steps.push({ step: teams.label, ms: teams.ms, cards: teams.value.total });
  const orgs = await timed('Agent Orgs cards', () => new AgentOrgMemoryExplorerService(importDir, { local: false, definitions: noGroupDefinitions }).listAgentOrgsWithMemory(null, 1, 500));
  steps.push({ step: orgs.label, ms: orgs.ms, cards: orgs.value.total });
  result.imported.push({ sourceId, runs, discoveries: { ...discovery.counter }, steps, withinBudget: steps.every((step) => step.ms <= 3000) });
}

console.log(JSON.stringify(result, null, 2));
