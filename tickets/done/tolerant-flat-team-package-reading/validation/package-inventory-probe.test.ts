import 'reflect-metadata';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../../src/config/app-config.js';
import type { ApplicationBundleService } from '../../../src/application-bundles/services/application-bundle-service.js';
import { FileAgentTeamDefinitionProvider } from '../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js';
import { FileAgentDefinitionProvider } from '../../../src/agent-definition/providers/file-agent-definition-provider.js';
import { FileAgentOrgDefinitionProvider } from '../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js';
import { DefinitionSourceRegistry } from '../../../src/collaboration-definition-admission/providers/definition-source-registry.js';
import { DefinitionAdmissionService } from '../../../src/collaboration-definition-admission/services/definition-admission-service.js';
import { AgentTeamDefinitionResolver } from '../../../src/api/graphql/types/agent-team-definition.js';
import { TeamRunService } from '../../../src/agent-team-execution/services/team-run-service.js';
const bound = vi.hoisted(() => ({ admission: null as any, teams: null as any }));
// Bind real admission to the existing catalog facade, not a substitute catalog result.
vi.mock('../../../src/api/graphql/studio-application-api-services.js', () => ({
  getStudioDefinitionAdmissionService: () => bound.admission,
  getStudioAgentTeamDefinitionService: () => bound.teams,
}));
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });
it('read-only supplied inventory through actual providers and semantic admission', async () => {
  const { createHash } = await import('node:crypto');
  const inventory = JSON.parse(await fs.readFile('../tickets/in-progress/tolerant-flat-team-package-reading/package-inventory.json', 'utf8'));
  const hashes = async () => Promise.all(inventory.teams.map(async (entry: any) => ({ path: entry.path, sha256: createHash('sha256').update(await fs.readFile(entry.path)).digest('hex') })));
  const before = await hashes(); expect(before).toEqual(inventory.teams.map((e: any) => ({ path: e.path, sha256: e.sha256 })));
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'read-only-package-inventory-')); roots.push(root);
  const config = { getAgentTeamsDir: () => path.join(root, 'agent-teams'), getAgentOrgsDir: () => path.join(root, 'agent-orgs'), getAgentsDir: () => path.join(root, 'agents'), getAdditionalAgentPackageRoots: () => [inventory.source] } as AppConfig;
  const apps = { getApplicationOwnedTeamSourceById: async () => null, getApplicationOwnedAgentSourceById: async () => null } as unknown as ApplicationBundleService;
  const teams = new FileAgentTeamDefinitionProvider({ appConfig: config, applicationBundleService: apps });
  const agents = new FileAgentDefinitionProvider({ appConfig: config, applicationBundleService: apps });
  const orgs = new FileAgentOrgDefinitionProvider(config);
  const admission = new DefinitionAdmissionService({ registry: new DefinitionSourceRegistry({ appConfig: config, implementationPackageRoots: [] }), teams: { getFreshDefinitionById: id => teams.getById(id) }, orgs: { getDefinitionById: id => orgs.getById(id) }, agents: { getFreshAgentDefinitionById: id => agents.getById(id) } });
  bound.admission = admission; bound.teams = teams;
  const results = await admission.scan();
  const listed = new Set(inventory.teams.map((e: any) => path.basename(path.dirname(e.path))));
  const rows = results.filter(r => listed.has(r.definitionId)).map(r => ({ id: r.definitionId, status: r.status, ...(r.status === 'unavailable' ? { code: r.code, reason: r.reason } : {}) }));
  expect(rows).toHaveLength(14);
  console.log('SUPPLIED_PACKAGE_ADMISSION', JSON.stringify(rows, null, 2));
  const catalog = await new AgentTeamDefinitionResolver().agentTeamDefinitions();
  expect(catalog.filter(d => listed.has(d.id)).map(d => d.id).sort()).toEqual(rows.filter(r => r.status === 'available').map(r => r.id).sort());
  expect(await hashes()).toEqual(before);
  console.log('UNCHANGED_CONFIG_HASHES', before.length);
});
