import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentDefinitionService } from '../../../src/agent-definition/services/agent-definition-service.js';
import { AgentTeamDefinitionService } from '../../../src/agent-team-definition/services/agent-team-definition-service.js';
import { AgentOrgDefinitionService } from '../../../src/agent-org-definition/services/agent-org-definition-service.js';
import { DefinitionSourceRegistry } from '../../../src/collaboration-definition-admission/providers/definition-source-registry.js';
import { DefinitionAdmissionService } from '../../../src/collaboration-definition-admission/services/definition-admission-service.js';
import { createAgentPackageDefinitions } from '../../../src/agent-package-definitions/services/agent-package-definitions.js';

const temporaryRoots: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

const temporaryRoot = async (): Promise<string> => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'definition-admission-')));
  temporaryRoots.push(root);
  return root;
};
const markdown = (subject: 'team' | 'org', name: string): string => `---\nname: ${name}\ndescription: Test\n---\n\n${subject} instructions`;
const teamConfig = (agentId = 'agent-1') => ({
  coordinatorMemberName: 'coordinator',
  members: [{ memberName: 'coordinator', ref: agentId, refScope: 'shared' }],
  handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
});
const orgConfig = (teamId = 'team-1', refScope = 'shared') => ({
  members: [{ memberName: 'team', ref: teamId, refType: 'agent_team', refScope }],
  handoffs: [], avatarUrl: null, defaultLaunchConfig: null,
});
const writePackage = async (root: string, family: 'agent-teams' | 'agent-orgs', id: string, config: unknown): Promise<string> => {
  const packagePath = path.join(root, family, id);
  await fs.mkdir(packagePath, { recursive: true });
  await fs.writeFile(path.join(packagePath, family === 'agent-teams' ? 'team.md' : 'org.md'), markdown(family === 'agent-teams' ? 'team' : 'org', id));
  await fs.writeFile(path.join(packagePath, family === 'agent-teams' ? 'team-config.json' : 'org-config.json'), JSON.stringify(config));
  return packagePath;
};
const writeAgent = async (root: string, id = 'agent-1'): Promise<void> => {
  await fs.mkdir(path.join(root, 'agents', id), { recursive: true });
  await fs.writeFile(path.join(root, 'agents', id, 'agent.md'), `---\nname: ${id}\ndescription: Test\n---\n\nAct.`);
};

/** Admission over real agent package definitions of the given package roots (the first is the default package). */
const build = (input: { dataRoot: string; externalRoots?: string[] }) => {
  const packageDefinitions = createAgentPackageDefinitions({
    appConfig: {
      getAgentsDir: () => path.join(input.dataRoot, 'agents'),
      getAgentTeamsDir: () => path.join(input.dataRoot, 'agent-teams'),
      getAgentOrgsDir: () => path.join(input.dataRoot, 'agent-orgs'),
      getRegisteredAgentPackageRoots: () => input.externalRoots ?? [],
    },
  });
  const agents = new AgentDefinitionService({ fileStore: {} as never, packageDefinitions });
  const teams = new AgentTeamDefinitionService({ fileStore: {} as never, packageDefinitions, agentDefinitionService: agents });
  const orgs = new AgentOrgDefinitionService({} as never, agents, teams, packageDefinitions);
  const registry = new DefinitionSourceRegistry({ listImplementationOwnedTeamSources: async () => [] });
  return { service: new DefinitionAdmissionService({ registry, teams, orgs, agents }), packageDefinitions };
};

describe('DefinitionAdmissionService', () => {
  it('admits valid Team and Org targets with resolved dependencies', async () => {
    const dataRoot = await temporaryRoot();
    await writeAgent(dataRoot);
    await writePackage(dataRoot, 'agent-teams', 'team-1', teamConfig());
    await writePackage(dataRoot, 'agent-orgs', 'org-1', orgConfig());
    const { service } = build({ dataRoot });
    expect((await service.requireAvailable('agent_team', 'team-1')).definition.id).toBe('team-1');
    expect((await service.requireAvailable('agent_org', 'org-1')).definition.id).toBe('org-1');
  });

  it('reports current Org family/path/key/action without a numeric diagnostic', async () => {
    const subjectKind = 'agent_org';
    const dataRoot = await temporaryRoot(), externalRoot = await temporaryRoot();
    const packagePath = await writePackage(externalRoot, 'agent-orgs', 'versioned', { ...orgConfig(), schemaVersion: 1 });
    const configPath = path.join(packagePath, 'org-config.json'), before = await fs.readFile(configPath);
    const { service } = build({ dataRoot, externalRoots: [externalRoot] });
    const result = (await service.scan()).find((r) => r.definitionId === 'versioned');
    expect(result).toMatchObject({ status: 'unavailable', expectedFamily: subjectKind, definitionPath: configPath,
      packageRoot: externalRoot, code: 'DEFINITION_CONTRACT_INVALID', reason: expect.stringContaining('Unsupported keys: schemaVersion'),
      ownerAction: expect.stringContaining('current definition format') });
    expect(result).not.toHaveProperty('expectedSchemaVersion'); expect(await fs.readFile(configPath)).toEqual(before);
  });

  it('marks a Team identity present in two packages unavailable without selecting a precedence winner', async () => {
    const dataRoot = await temporaryRoot();
    const externalRoot = await temporaryRoot();
    await writeAgent(dataRoot);
    const first = await writePackage(dataRoot, 'agent-teams', 'team-1', teamConfig());
    const second = await writePackage(externalRoot, 'agent-teams', 'team-1', teamConfig());
    const { service } = build({ dataRoot, externalRoots: [externalRoot] });
    const matches = (await service.scan()).filter((item) => item.subjectKind === 'agent_team' && item.definitionId === 'team-1');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      status: 'unavailable',
      code: 'DEFINITION_IDENTITY_DUPLICATED',
      reason: expect.stringContaining(`${first}, ${second}`),
    });
  });

  it('does not modify an incompatible external package while reporting target-only unavailability', async () => {
    const dataRoot = await temporaryRoot();
    const externalRoot = await temporaryRoot();
    const packagePath = await writePackage(externalRoot, 'agent-teams', 'legacy', { coordinatorMemberName: 'coordinator', members: [] });
    const configPath = path.join(packagePath, 'team-config.json');
    const before = { bytes: await fs.readFile(configPath, 'base64'), stats: await fs.stat(configPath) };
    const { service } = build({ dataRoot, externalRoots: [externalRoot] });
    const result = (await service.scan()).find((item) => item.definitionId === 'legacy');
    expect(result).toMatchObject({ status: 'unavailable', sourceClass: 'external_read_only', expectedFamily: 'agent_team', code: 'DEFINITION_CONTRACT_INVALID' });
    expect(result).not.toHaveProperty('expectedSchemaVersion');
    const after = { bytes: await fs.readFile(configPath, 'base64'), stats: await fs.stat(configPath) };
    expect(after.bytes).toBe(before.bytes);
    expect({ size: after.stats.size, mtimeMs: after.stats.mtimeMs, ino: after.stats.ino })
      .toEqual({ size: before.stats.size, mtimeMs: before.stats.mtimeMs, ino: before.stats.ino });
  });

  it('reports an unavailable Team dependency with both physical definition paths', async () => {
    const dataRoot = await temporaryRoot();
    await writeAgent(dataRoot);
    const teamPath = await writePackage(dataRoot, 'agent-teams', 'team-1', { ...teamConfig(), avatarUrl: false });
    const orgPath = await writePackage(dataRoot, 'agent-orgs', 'org-1', orgConfig());
    const { service } = build({ dataRoot });
    const result = (await service.scan()).find((item) => item.subjectKind === 'agent_org');
    expect(result).toMatchObject({ status: 'unavailable', code: 'DEFINITION_DEPENDENCY_UNAVAILABLE' });
    if (result?.status === 'unavailable') {
      expect(result.dependencyChain).toEqual([`agent_org:org-1@${orgPath}`, `agent_team:team-1@${path.join(teamPath, 'team-config.json')}`]);
    }
  });

  it('keeps unrelated scanning available when an Org-owned reference has no exact physical mapping', async () => {
    const dataRoot = await temporaryRoot();
    await writeAgent(dataRoot);
    await writePackage(dataRoot, 'agent-teams', 'team-1', teamConfig());
    await writePackage(dataRoot, 'agent-orgs', 'org-1', orgConfig('opaque-owned-team', 'org_local'));
    const { service } = build({ dataRoot });
    const results = await service.scan();
    expect(results.find((item) => item.subjectKind === 'agent_team')).toMatchObject({ status: 'available' });
    expect(results.find((item) => item.subjectKind === 'agent_org')).toMatchObject({ status: 'unavailable' });
  });

  it('keeps a working Team available with its last good version when its file breaks (DEC-001)', async () => {
    const dataRoot = await temporaryRoot();
    await writeAgent(dataRoot);
    const teamPath = await writePackage(dataRoot, 'agent-teams', 'team-1', teamConfig());
    const { service, packageDefinitions } = build({ dataRoot });
    expect((await service.requireAvailable('agent_team', 'team-1')).definition.id).toBe('team-1');
    await fs.writeFile(path.join(teamPath, 'team-config.json'), '{ "coordinatorMemberName": ');
    packageDefinitions.reloader.markFolderChanged('agent_team', 'team-1');
    expect((await service.requireAvailable('agent_team', 'team-1')).definition.id).toBe('team-1');
    packageDefinitions.reloader.close();
  });
});
