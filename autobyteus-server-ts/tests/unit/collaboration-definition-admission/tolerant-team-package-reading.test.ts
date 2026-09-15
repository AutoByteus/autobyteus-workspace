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
const write = async (root: string, family: 'agent' | 'team', id: string, config: unknown) => {
  const dir = path.join(root, `agent${family === 'team' ? '-teams' : 's'}`, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${family}.md`), `---\nname: ${id}\ndescription: Test\n---\n\nExact instructions.\n`);
  const file = path.join(dir, `${family}-config.json`); await fs.writeFile(file, JSON.stringify(config)); return file;
};
const team = (ref: string, refScope = 'shared') => ({ coordinatorMemberName: 'lead', members: [{ memberName: 'lead', ref, refScope, refType: 'agent_team', unused: true }], handoffs: [], avatarUrl: null, arbitrary: { retain: 'on disk only' } });
it('reads mixed external packages through real scoped providers, admission, catalog and launch gating without rewriting', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tolerant-team-package-')); roots.push(root);
  const external = path.join(root, 'external'), owned = path.join(root, 'data');
  const config = { getAgentTeamsDir: () => path.join(owned, 'agent-teams'), getAgentOrgsDir: () => path.join(owned, 'agent-orgs'), getAgentsDir: () => path.join(owned, 'agents'), getAdditionalAgentPackageRoots: () => [external] } as AppConfig;
  const apps = { getApplicationOwnedTeamSourceById: async () => null, getApplicationOwnedAgentSourceById: async () => null } as unknown as ApplicationBundleService;
  const teams = new FileAgentTeamDefinitionProvider({ appConfig: config, applicationBundleService: apps });
  const agents = new FileAgentDefinitionProvider({ appConfig: config, applicationBundleService: apps });
  const orgs = new FileAgentOrgDefinitionProvider(config);
  await write(external, 'agent', 'writer', {});
  const files = [await write(external, 'team', 'flat', team('writer')),
    await write(external, 'team', 'null-defaults', { ...team('writer'), defaultLaunchConfig: null }),
    await write(external, 'team', 'local', team('writer', 'team_local')),
    await write(external, 'team', 'nested-parent', { ...team('writer'), members: [...team('writer').members, { memberName: 'department', ref: 'flat', refScope: 'shared', refType: 'agent_team' }] }),
    await write(external, 'team', 'wrong-scope', team('writer', 'team_local')),
    await write(external, 'team', 'missing-avatar', { coordinatorMemberName: 'lead', members: team('writer').members, handoffs: [] })];
  await write(path.join(external, 'agent-teams', 'local'), 'agent', 'writer', {});
  const before = await Promise.all(files.map(file => fs.readFile(file)));
  const admission = new DefinitionAdmissionService({ registry: new DefinitionSourceRegistry({ appConfig: config, implementationPackageRoots: [] }),
    teams: { getFreshDefinitionById: id => teams.getById(id) }, orgs: { getDefinitionById: id => orgs.getById(id) }, agents: { getFreshAgentDefinitionById: id => agents.getById(id) } });
  bound.admission = admission; bound.teams = teams;
  const rows = await admission.scan();
  expect(rows.filter(r => r.status === 'available').map(r => r.definitionId).sort()).toEqual(['flat', 'local', 'missing-avatar', 'null-defaults']);
  expect(rows.find(r => r.definitionId === 'nested-parent')).toMatchObject({ status: 'unavailable', code: 'DEFINITION_REFERENCE_UNRESOLVED' });
  expect(rows.find(r => r.definitionId === 'wrong-scope')).toMatchObject({ status: 'unavailable', code: 'DEFINITION_REFERENCE_UNRESOLVED' });
  expect(rows.find(r => r.definitionId === 'missing-avatar')).toMatchObject({ status: 'available', definition: expect.objectContaining({ avatarUrl: null }) });
  const catalog = new AgentTeamDefinitionResolver();
  expect((await catalog.agentTeamDefinitions()).map(d => d.id).sort()).toEqual(['flat', 'local', 'missing-avatar', 'null-defaults']);
  expect(await catalog.agentTeamDefinition('nested-parent')).toBeNull();
  const flat = await teams.getById('flat'); expect(flat!.defaultLaunchConfig).toBeNull(); expect(flat!.nodes[0]).not.toHaveProperty('refType');
  const revision = flat!.revision;
  expect((await teams.getById('flat'))!.revision).toBe(revision);
  const create = vi.fn(), allocate = vi.fn();
  const runs = new TeamRunService({ definitionAdmissionService: admission, agentTeamRunManager: { createTeamRun: create } as never,
    teamDefinitionService: {} as never, teamRunHistoryCatalogService: {} as never, workspaceManager: {} as never,
    tokenUsageReadiness: { assertCurrentSchemaReady() {}, assertExistingRunRestoreReady() {} },
    agentRunIdentityAllocator: { allocateForAgentDefinition: allocate }, teamRunIdentityAllocator: { allocateForTeamDefinitionName: allocate } });
  await expect(runs.createTeamRun({ teamDefinitionId: 'nested-parent', teamConfigs: [], memberConfigs: [] })).rejects.toThrow();
  await expect(runs.createTeamRun({ teamDefinitionId: 'flat', teamConfigs: [], memberConfigs: [] })).rejects.toThrow();
  expect(create).not.toHaveBeenCalled(); expect(allocate).not.toHaveBeenCalled();
  await expect(teams.update(flat!)).rejects.toThrow(); // external-read-only ownership remains enforced
  for (let i = 0; i < files.length; i++) expect(await fs.readFile(files[i]!)).toEqual(before[i]);
});
