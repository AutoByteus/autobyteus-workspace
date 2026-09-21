import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentDefinition } from '../../../src/agent-definition/domain/models.js';
import { AgentOrgDefinition, AgentOrgMember } from '../../../src/agent-org-definition/domain/agent-org-definition.js';
import { AgentTeamDefinition, TeamMember } from '../../../src/agent-team-definition/domain/agent-team-definition.js';
import { DefinitionSourceRegistry } from '../../../src/collaboration-definition-admission/providers/definition-source-registry.js';
import { DefinitionAdmissionService } from '../../../src/collaboration-definition-admission/services/definition-admission-service.js';

const temporaryRoots: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

const temporaryRoot = async (): Promise<string> => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'definition-admission-'));
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

const teamDefinition = (id = 'team-1', agentId = 'agent-1') => new AgentTeamDefinition({
  id, name: id, description: '', instructions: '', coordinatorMemberName: 'coordinator',
  nodes: [new TeamMember({ memberName: 'coordinator', ref: agentId, refScope: 'shared' })],
});
const orgDefinition = (id = 'org-1', teamId = 'team-1', refScope: 'shared' | 'org_local' = 'shared') => new AgentOrgDefinition({
  id, name: id, description: '', instructions: '',
  members: [new AgentOrgMember({ memberName: 'team', ref: teamId, refType: 'agent_team', refScope })],
});
const agentDefinition = (id = 'agent-1') => new AgentDefinition({ id, name: id, description: '', instructions: '' });

const build = (input: {
  dataRoot: string
  implementationRoots?: string[]
  externalRoots?: string[]
  team?: AgentTeamDefinition | null
  org?: AgentOrgDefinition | null
}) => {
  const teams = { getFreshDefinitionById: vi.fn(async (id: string) => input.team?.id === id ? input.team : null) };
  const orgs = { getDefinitionById: vi.fn(async (id: string) => input.org?.id === id ? input.org : null) };
  const agents = { getFreshAgentDefinitionById: vi.fn(async (id: string) => id === 'agent-1' ? agentDefinition() : null) };
  const registry = new DefinitionSourceRegistry({
    appConfig: {
      getAgentTeamsDir: () => path.join(input.dataRoot, 'agent-teams'),
      getAgentOrgsDir: () => path.join(input.dataRoot, 'agent-orgs'),
      getAdditionalAgentPackageRoots: () => input.externalRoots ?? [],
    },
    implementationPackageRoots: input.implementationRoots,
  });
  return { service: new DefinitionAdmissionService({ registry, teams, orgs, agents }), teams, orgs, agents };
};

describe('DefinitionAdmissionService', () => {
  it('admits valid Team and Org targets with resolved dependencies', async () => {
    const dataRoot = await temporaryRoot();
    await writePackage(dataRoot, 'agent-teams', 'team-1', teamConfig());
    await writePackage(dataRoot, 'agent-orgs', 'org-1', orgConfig());
    const { service } = build({ dataRoot, team: teamDefinition(), org: orgDefinition() });
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
    expect(result).toMatchObject({ status: 'unavailable', expectedFamily: subjectKind, definitionPath: packagePath,
      code: 'DEFINITION_CONTRACT_INVALID', reason: expect.stringContaining('Unsupported keys: schemaVersion'),
      ownerAction: expect.stringContaining('current definition format') });
    expect(result).not.toHaveProperty('expectedSchemaVersion'); expect(await fs.readFile(configPath)).toEqual(before);
  });

  it('marks every same-identity physical package unavailable without selecting a precedence winner', async () => {
    const dataRoot = await temporaryRoot();
    const implementationRoot = await temporaryRoot();
    await writePackage(dataRoot, 'agent-teams', 'team-1', teamConfig());
    await writePackage(implementationRoot, 'agent-teams', 'team-1', teamConfig());
    const { service, teams } = build({ dataRoot, implementationRoots: [implementationRoot], team: teamDefinition() });
    const matches = (await service.scan()).filter((item) => item.subjectKind === 'agent_team' && item.definitionId === 'team-1');
    expect(matches).toHaveLength(2);
    expect(matches.every((item) => item.status === 'unavailable' && item.code === 'DEFINITION_CONTRACT_INVALID')).toBe(true);
    expect(teams.getFreshDefinitionById).not.toHaveBeenCalled();
  });

  it('does not modify an incompatible external package while reporting target-only unavailability', async () => {
    const dataRoot = await temporaryRoot();
    const externalRoot = await temporaryRoot();
    const packagePath = await writePackage(externalRoot, 'agent-teams', 'legacy', { coordinatorMemberName: 'coordinator', members: [] });
    const configPath = path.join(packagePath, 'team-config.json');
    const before = { bytes: await fs.readFile(configPath, 'base64'), stats: await fs.stat(configPath) };
    const { service } = build({ dataRoot, externalRoots: [externalRoot], team: null });
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
    const teamPath = await writePackage(dataRoot, 'agent-teams', 'team-1', { ...teamConfig(), avatarUrl: false });
    const orgPath = await writePackage(dataRoot, 'agent-orgs', 'org-1', orgConfig());
    const { service } = build({ dataRoot, team: teamDefinition(), org: orgDefinition() });
    const result = (await service.scan()).find((item) => item.subjectKind === 'agent_org');
    expect(result).toMatchObject({ status: 'unavailable', code: 'DEFINITION_DEPENDENCY_UNAVAILABLE' });
    if (result?.status === 'unavailable') {
      expect(result.dependencyChain).toEqual([`agent_org:org-1@${orgPath}`, `agent_team:team-1@${teamPath}`]);
    }
  });

  it('keeps unrelated scanning available when an Org-owned reference has no exact physical mapping', async () => {
    const dataRoot = await temporaryRoot();
    await writePackage(dataRoot, 'agent-teams', 'team-1', teamConfig());
    await writePackage(dataRoot, 'agent-orgs', 'org-1', orgConfig('opaque-owned-team', 'org_local'));
    const { service } = build({ dataRoot, team: teamDefinition(), org: orgDefinition('org-1', 'opaque-owned-team', 'org_local') });
    const results = await service.scan();
    expect(results.find((item) => item.subjectKind === 'agent_team')).toMatchObject({ status: 'available' });
    expect(results.find((item) => item.subjectKind === 'agent_org')).toMatchObject({ status: 'unavailable' });
  });
});
