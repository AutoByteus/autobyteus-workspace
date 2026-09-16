import 'reflect-metadata';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../../src/config/app-config.js';
import type { ApplicationBundleService } from '../../../src/application-bundles/services/application-bundle-service.js';
import { FileAgentDefinitionProvider } from '../../../src/agent-definition/providers/file-agent-definition-provider.js';
import { FileAgentTeamDefinitionProvider } from '../../../src/agent-team-definition/providers/file-agent-team-definition-provider.js';
import { FileAgentOrgDefinitionProvider } from '../../../src/agent-org-definition/providers/file-agent-org-definition-provider.js';
import { CachedAgentTeamDefinitionProvider } from '../../../src/agent-team-definition/providers/cached-agent-team-definition-provider.js';
import { AgentTeamDefinitionPersistenceProvider } from '../../../src/agent-team-definition/providers/agent-team-definition-persistence-provider.js';
import { AgentTeamDefinitionService } from '../../../src/agent-team-definition/services/agent-team-definition-service.js';
import { buildAgentOrgOwnedDefinitionId, isAgentOrgOwnedTeamDefinitionId } from '../../../src/agent-org-definition/utils/agent-org-owned-definition-id.js';
import { buildTeamLocalAgentDefinitionId } from '../../../src/agent-team-definition/utils/team-local-definition-id.js';
import { findTeamSourcePaths } from '../../../src/agent-team-definition/providers/team-definition-source-paths.js';
import { DefinitionSourceRegistry } from '../../../src/collaboration-definition-admission/providers/definition-source-registry.js';
import { DefinitionAdmissionService } from '../../../src/collaboration-definition-admission/services/definition-admission-service.js';
import { AgentOrgExecutionScopeBuilder } from '../../../src/agent-org-execution/services/agent-org-execution-scope-builder.js';
import { validateAgentOrgStatePackage } from '../../../src/agent-org-execution/services/agent-org-state-package-validator.js';
import type { FlatTeamExecutionFactory } from '../../../src/agent-team-execution/local/flat-team-execution-factory.js';
import type { FlatTeamExecutionCallbacks } from '../../../src/agent-team-execution/local/flat-team-execution-callbacks.js';
import { createAgentOrgRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { AgentOrgRunPlanner } from '../../../src/agent-org-execution/services/agent-org-run-planner.js';
import { RuntimeKind } from '../../../src/runtime-management/runtime-kind-enum.js';
import { SkillAccessMode } from 'autobyteus-ts/agent/context/skill-access-mode.js';
import { AgentOrgDefinitionResolver } from '../../../src/agent-org-definition/services/agent-org-definition-resolver.js';
import { CollaborationHandoffCompiler } from '../../../src/agent-collaboration/definition/collaboration-handoff-compiler.js';
import { buildCanonicalApplicationId, buildCanonicalApplicationOwnedTeamId } from '../../../src/application-bundles/utils/application-bundle-identity.js';
const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map(root => fs.rm(root, { recursive: true, force: true }))); });
const launch = { llmModelIdentifier: 'fixture-model', runtimeKind: RuntimeKind.AUTOBYTEUS, llmConfig: { temperature: 0.2 } };
const write = async (base: string, family: 'agent' | 'team' | 'org', id: string, config: unknown, instructions: string) => {
  const dir = path.join(base, `agent${family === 'agent' ? 's' : `-${family}s`}`, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${family}.md`), `---\nname: ${id}\ndescription: Synthetic owned definition\ncategory: testing\n${family === 'agent' ? 'role: Test worker\n' : ''}---\n\n${instructions}\n`);
  await fs.writeFile(path.join(dir, `${family}-config.json`), JSON.stringify(config));
  return dir;
};
const treeHash = async (root: string): Promise<Record<string, string>> => {
  const result: Record<string, string> = {};
  const visit = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory())
        await visit(file);
      else
        result[path.relative(root, file)] = createHash('sha256').update(await fs.readFile(file)).digest('hex');
    }
  };
  await visit(root);
  return result;
};
const fixture = async (placement: 'data' | 'external' = 'data') => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'org-local-read-'));
  roots.push(root);
  const data = path.join(root, 'data'), external = path.join(root, 'external'), base = placement === 'data' ? data : external;
  const appConfig = { getAgentsDir: () => path.join(data, 'agents'), getAgentTeamsDir: () => path.join(data, 'agent-teams'), getAgentOrgsDir: () => path.join(data, 'agent-orgs'), getAdditionalAgentPackageRoots: () => [external] } as AppConfig;
  const appRoot = path.join(root, 'application');
  const applicationId = buildCanonicalApplicationId('test-package', 'test-app');
  const applicationTeamId = buildCanonicalApplicationOwnedTeamId('test-package', 'test-app', 'squad');
  const appSource = { definitionId: applicationTeamId, localDefinitionId: 'squad', applicationRootPath: appRoot, applicationId, applicationName: 'Test application', packageId: 'test-package', localApplicationId: 'test-app' };
  const apps = { getApplicationOwnedAgentSourceById: async () => null, getApplicationOwnedTeamSourceById: async (id: string) => id === applicationTeamId ? appSource : null, listApplicationOwnedTeamSources: async () => [appSource], listApplicationOwnedAgentSources: async () => [] } as unknown as ApplicationBundleService;
  const agents = new FileAgentDefinitionProvider({ appConfig, applicationBundleService: apps });
  const teams = new FileAgentTeamDefinitionProvider({ appConfig, applicationBundleService: apps });
  const orgs = new FileAgentOrgDefinitionProvider(appConfig);
  const agentConfig = { toolNames: ['send_message_to'], skillNames: [], defaultLaunchConfig: launch };
  const teamConfig = { coordinatorMemberName: 'lead', members: [{ memberName: 'lead', ref: 'worker', refScope: 'team_local' }], handoffs: [], avatarUrl: null, defaultLaunchConfig: launch };
  await write(data, 'team', 'squad', teamConfig, 'Shared Team instructions');
  await write(path.join(data, 'agent-teams/squad'), 'agent', 'worker', agentConfig, 'Shared Agent instructions');
  await write(appRoot, 'team', 'squad', teamConfig, 'Application Team instructions');
  await write(path.join(appRoot, 'agent-teams/squad'), 'agent', 'worker', agentConfig, 'Application Agent instructions');
  const ids = (org: string) => ({ team: buildAgentOrgOwnedDefinitionId('agent_team', org, 'squad'), direct: buildAgentOrgOwnedDefinitionId('agent', org, 'guide'), agent: buildTeamLocalAgentDefinitionId(buildAgentOrgOwnedDefinitionId('agent_team', org, 'squad'), 'worker') });
  for (const org of ['alpha', 'beta']) {
    const current = ids(org);
    const orgDir = await write(base, 'org', org, { members: [{ memberName: 'guide', ref: current.direct, refType: 'agent', refScope: 'org_local' }, { memberName: 'group', ref: current.team, refType: 'agent_team', refScope: 'org_local' }], handoffs: [{ from: '/guide', to: '/group', rules: ['Delegate to the owned Team.'] }, { from: '/group/lead', to: '/guide', rules: ['Return the result.'] }], avatarUrl: null, defaultLaunchConfig: null }, `${org} Org instructions`);
    await write(orgDir, 'agent', 'guide', agentConfig, `${org} direct instructions`);
    await write(orgDir, 'team', 'squad', teamConfig, `${org} Team instructions`);
    await write(path.join(orgDir, 'agent-teams/squad'), 'agent', 'worker', agentConfig, `${org} Agent instructions`);
  }
  const persistence = new AgentTeamDefinitionPersistenceProvider(teams), cache = new CachedAgentTeamDefinitionProvider(persistence);
  const service = new AgentTeamDefinitionService({ provider: cache, persistenceProvider: persistence, agentDefinitionService: { getAgentDefinitionById: id => agents.getById(id), getFreshAgentDefinitionById: id => agents.getById(id) } });
  const admission = new DefinitionAdmissionService({ registry: new DefinitionSourceRegistry({ appConfig }), agents: { getFreshAgentDefinitionById: id => agents.getById(id) }, teams: { getFreshDefinitionById: id => teams.getById(id) }, orgs: { getDefinitionById: id => orgs.getById(id) } });
  return { root, data, base, appConfig, apps, agents, teams, orgs, cache, service, admission, ids, applicationTeamId };
};
describe('Org-owned Team -> Team-local Agent production reads', () => {
  it.each(['data', 'external'] as const)('reads/admit %s authored packages with exact immediate owner, metadata and unchanged bytes', async (placement) => {
    const f = await fixture(placement), before = await treeHash(f.root);
    for (let round = 0; round < 2; round++)
      for (const owner of ['alpha', 'beta']) {
        const ids = f.ids(owner);
        expect(await f.agents.getById(ids.agent)).toMatchObject({ id: ids.agent, ownershipScope: 'team_local', ownerTeamId: ids.team, instructions: `${owner} Agent instructions\n`, toolNames: ['send_message_to'], defaultLaunchConfig: launch });
        expect(await f.agents.getById(ids.direct)).toMatchObject({ id: ids.direct, ownershipScope: 'agent_org_owned', ownerOrgId: owner });
        expect(await f.service.getDefinitionById(ids.team)).toMatchObject({ id: ids.team, ownershipScope: 'agent_org_owned', ownerOrgId: owner, instructions: `${owner} Team instructions\n`, defaultLaunchConfig: launch });
        const admitted = await f.admission.requireAvailable('agent_org', owner);
        expect(admitted.status).toBe('available');
        const topology = await new AgentOrgDefinitionResolver().resolve({ definition: (await f.orgs.getById(owner))!, lookup: { getAgentById: id => f.agents.getById(id), getTeamById: id => f.service.getDefinitionById(id) } });
        expect(new CollaborationHandoffCompiler().compileOrg(topology)).toHaveLength(2);
      }
    expect(await treeHash(f.root)).toEqual(before);
  });
  it('normal cached Team service reads work before/after catalog fill and refresh without catalog insertion', async () => {
    const f = await fixture(), id = f.ids('alpha').team, all = vi.spyOn(f.teams, 'getAll');
    expect((await f.service.getDefinitionById(id))?.instructions).toBe('alpha Team instructions\n');
    expect(all).not.toHaveBeenCalled();
    const listed = await f.service.getAllDefinitions();
    expect(listed.map(t => t.id)).not.toContain(id);
    const file = path.join(f.base, 'agent-orgs/alpha/agent-teams/squad/team.md');
    await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace('alpha Team instructions', 'Updated instructions'));
    expect((await f.service.getDefinitionById(id))?.instructions).toBe('Updated instructions\n');
    await f.cache.refresh();
    expect((await f.service.getDefinitionById(id))?.instructions).toBe('Updated instructions\n');
    expect((await f.service.getAllDefinitions()).map(t => t.id)).not.toContain(id);
    expect((await f.service.getEndpointCatalog(id)).from[0]?.address).toBe('/lead');
  });
  it.each(['agent', 'team'] as const)('rejects missing owned %s, never borrows same-name shared/other Org children', async (missing) => {
    const f = await fixture(), ids = f.ids('alpha');
    await fs.rm(path.join(f.base, 'agent-orgs/alpha/agent-teams/squad', missing === 'agent' ? 'agents/worker' : ''), { recursive: true });
    expect(await f.agents.getById(ids.agent)).toBeNull();
    await expect(f.admission.requireAvailable('agent_org', 'alpha')).rejects.toThrow();
    expect((await f.admission.requireAvailable('agent_org', 'beta')).status).toBe('available');
    expect((await f.agents.getById(buildTeamLocalAgentDefinitionId('squad', 'worker')))?.instructions).toBe('Shared Agent instructions\n');
  });
  it('keeps shared and application-owned Team/local-Agent read controls unchanged', async () => {
    const f = await fixture();
    for (const [team, instructions] of [['squad', 'Shared'], [f.applicationTeamId, 'Application']]) {
      expect(await f.service.getDefinitionById(team!)).toMatchObject({ id: team, instructions: `${instructions} Team instructions\n` });
      expect(await f.agents.getById(buildTeamLocalAgentDefinitionId(team!, 'worker'))).toMatchObject({ ownershipScope: 'team_local', ownerTeamId: team, instructions: `${instructions} Agent instructions\n` });
    }
  });
  it('leaves independent owned writes unavailable and package bytes unchanged', async () => {
    const f = await fixture(), ids = f.ids('alpha'), before = await treeHash(f.root);
    const team = (await f.teams.getById(ids.team))!, agent = (await f.agents.getById(ids.agent))!;
    expect(agent).not.toBeNull();
    team.instructions = 'Forbidden';
    await expect(f.teams.update(team)).rejects.toThrow(/atomic parent/);
    await expect(f.teams.delete(ids.team)).rejects.toThrow(/atomic parent/);
    agent.instructions = 'Forbidden';
    await expect(f.agents.update(agent)).rejects.toThrow();
    expect(await f.agents.delete(ids.agent)).toBe(false);
    const direct = (await f.agents.getById(ids.direct))!;
    await expect(f.agents.update(direct)).rejects.toThrow();
    await expect(f.agents.delete(ids.direct)).rejects.toThrow();
    expect(await treeHash(f.root)).toEqual(before);
  });
  it('does not fall through to an unrelated shared directory whose name equals a missing tagged Team ID', async () => {
    const f = await fixture(), id = buildAgentOrgOwnedDefinitionId('agent_team', 'absent', 'squad');
    await write(f.data, 'team', id, { coordinatorMemberName: 'lead', members: [{ memberName: 'lead', ref: 'worker', refScope: 'team_local' }], handoffs: [] }, 'Wrong shared identity');
    expect(await f.teams.getById(id)).toBeNull();
    // Omitted Org-root capability is also used by unchanged independent mutation lookups.
    expect(await findTeamSourcePaths(f.ids('alpha').team, [f.appConfig.getAgentTeamsDir()], f.apps)).toBeNull();
  });
  it('plans exact configured identities through real providers and normal cached Team service without activation', async () => {
    const f = await fixture(), before = await treeHash(f.root);
    let sequence = 0;
    const planner = new AgentOrgRunPlanner({ getAgentById: id => f.agents.getById(id), getTeamById: id => f.service.getDefinitionById(id) }, { allocateAgent: async () => `agent-${++sequence}`, allocateTeam: () => 'team-run', allocateOrg: () => 'org-run' });
    const tree = await planner.build({ definition: (await f.orgs.getById('alpha'))!, rootConfiguration: { ...launch, autoExecuteTools: false, skillAccessMode: SkillAccessMode.PRELOADED_ONLY, workspaceRootPath: null } });
    expect(tree.rootOrg.members).toMatchObject([{ address: '/guide', agentDefinitionId: f.ids('alpha').direct, platformAgentRunId: null }, { address: '/group', teamDefinitionId: f.ids('alpha').team, members: [{ address: '/group/lead', agentDefinitionId: f.ids('alpha').agent, platformAgentRunId: null }] }]);
    expect(tree.handoffs).toHaveLength(2);
    expect(await treeHash(f.root)).toEqual(before);
  });
  it('supplies fresh mounted enclosing instructions through the actual scope callback and normal Team service', async () => {
    const f = await fixture();
    let sequence = 0;
    const planner = new AgentOrgRunPlanner({ getAgentById: id => f.agents.getById(id), getTeamById: id => f.service.getDefinitionById(id) }, { allocateAgent: async () => `agent-${++sequence}`, allocateTeam: () => 'team-run', allocateOrg: () => 'org-run' });
    const tree = await planner.build({
      definition: (await f.orgs.getById('alpha'))!,
      rootConfiguration: { ...launch, autoExecuteTools: false, skillAccessMode: SkillAccessMode.PRELOADED_ONLY, workspaceRootPath: null },
    });
    const state = validateAgentOrgStatePackage({
      executionTree: tree,
      taskRecords: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-run', records: [] },
      communicationMessages: { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-run', messages: [] },
    });
    let callbacks: FlatTeamExecutionCallbacks | undefined;
    // Only the execution plane is substituted; all definition reads remain real.
    const materialize = vi.fn(async (input: Parameters<FlatTeamExecutionFactory['materialize']>[0]) => {
      callbacks = input.callbacks;
      return { teamRun: { teamRunId: input.teamNode.teamRunId }, commitAfterDurability() { }, abort: async () => { } };
    });
    const prepareNewAgentRun = vi.fn();
    const read = vi.spyOn(f.service, 'getDefinitionById');
    const builder = new AgentOrgExecutionScopeBuilder({
      flatTeamExecutionFactory: { materialize } as never,
      taskExecutionIdentity: {} as never,
      agentRunManager: { prepareNewAgentRun } as never,
      orgDefinitions: { getDefinitionById: id => f.orgs.getById(id) },
      teamDefinitions: f.service,
    });
    await builder.build({ state, persistence: {} as never, activationMode: 'fresh', persistInitialPackage: false });
    expect(materialize.mock.calls[0]![0].prepareConfiguredAgents).toBe(false);
    expect(prepareNewAgentRun).not.toHaveBeenCalled();
    const member = state.index.listAgents().find(agent => agent.address === '/group/lead')!;
    const identity = createCollaborationMemberExecutionIdentity({
      root: createAgentOrgRootExecutionIdentity('org-run'), memberAddress: member.address, agentRunId: member.agentRunId,
    });
    const context = await callbacks!.buildMemberExecutionContext({ identity } as Parameters<FlatTeamExecutionCallbacks['buildMemberExecutionContext']>[0]);
    expect(context.authoredEnclosingScopeInstruction).toBe('alpha Team instructions');
    expect(read).toHaveBeenCalledWith(f.ids('alpha').team);
    expect(prepareNewAgentRun).not.toHaveBeenCalled();
  });
  it('requires current parent membership even when the owned Team folder remains on disk', async () => {
    const f = await fixture(), id = f.ids('alpha').team, file = path.join(f.base, 'agent-orgs/alpha/org-config.json');
    const config = JSON.parse(await fs.readFile(file, 'utf8'));
    config.members = config.members.filter((m: {
      ref: string;
    }) => m.ref !== id);
    await fs.writeFile(file, JSON.stringify(config));
    expect(await f.teams.getById(id)).toBeNull();
    expect(await f.agents.getById(f.ids('alpha').agent)).toBeNull();
    expect((await f.admission.requireAvailable('agent_org', 'beta')).status).toBe('available');
  });
  it.each(['agent-org-owned-team:org:team', 'agent-org-owned-team:org%20name:team%2Fname'])('classifies %s without decoding it into filesystem paths', id => {
    expect(isAgentOrgOwnedTeamDefinitionId(id)).toBe(true);
  });
  it.each(['squad', 'agent-org-owned-agent:org:agent', 'agent-org-owned-team::team', 'agent-org-owned-team:org:', 'agent-org-owned-team:org:team/child'])('does not classify other/malformed identity %s as an owned Team', id => {
    expect(isAgentOrgOwnedTeamDefinitionId(id)).toBe(false);
  });
});
