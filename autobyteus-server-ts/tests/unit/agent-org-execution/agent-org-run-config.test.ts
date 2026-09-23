import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentOrgRunManager } from '../../../src/agent-org-execution/services/agent-org-run-manager.js';
import { AgentOrgRunExecutionTreeStore } from '../../../src/run-history/store/agent-org-run-execution-tree-store.js';
import { AgentMemoryLayout } from '../../../src/agent-memory/store/agent-memory-layout.js';
import { RunModelSelectionService } from '../../../src/llm-management/services/run-model-selection-service.js';
import { ActiveCollaborationRootDirectory } from '../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js';
import { createAgentOrgRootExecutionIdentity } from '../../../src/agent-collaboration/execution/domain/root-execution-identity.js';
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from '../../fixtures/current-agent-org-run-fixtures.js';
import { AgentOrgTaskDelegationRecordsV1Store } from '../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js';
import { AgentOrgCommunicationMessagesV1Store } from '../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js';
import { applyAgentOrgRunModelConfigPatches, listAgentOrgRunModelConfigScopes, resolveAgentOrgRunModelConfigTargets } from '../../../src/agent-org-execution/services/agent-org-run-config-mutator.js';

const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map(p => fs.rm(p, { recursive: true, force: true }))); });
const select = (scopeKind: 'CONFIGURED_ORG'|'CONFIGURED_TEAM'|'CONFIGURED_AGENT', scopeAddress: string, model = 'equal') =>
  ({ scopeKind, scopeAddress, llmModelIdentifier: model, llmConfig: { temperature: 0, enabled: false } });

async function setup() {
  const memoryDir = await fs.mkdtemp(join(tmpdir(), 'org-whole-config-')); roots.push(memoryDir);
  const dir = new AgentMemoryLayout(memoryDir).getOrgDirPath('org');
  const root = testAgentOrgExecutionTree({ orgRunId: 'org', members: [
    testOrgAgentNode('/worker', 'worker'),
    testOrgTeamNode({ address: '/team', teamRunId: 'team', coordinatorAddress: '/team/lead', members: [testOrgAgentNode('/team/lead', 'lead')] }),
  ] });
  const tree = { ...root, rootOrg: { ...root.rootOrg, defaultLaunchConfiguration: { ...root.rootOrg.defaultLaunchConfiguration,
    llmModelIdentifier: 'test-model', llmConfig: { temperature: 1, enabled: true } } } };
  const store = new AgentOrgRunExecutionTreeStore(); await store.write(dir, tree);
  await new AgentOrgTaskDelegationRecordsV1Store().write(dir, { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org', records: [] });
  await new AgentOrgCommunicationMessagesV1Store().write(dir, { schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org', messages: [] });
  const catalog = { listLlmModels: vi.fn().mockResolvedValue(['test-model','equal','larger','smaller'].map(model_identifier =>
    ({ model_identifier, config_schema: { properties: { temperature: { type: 'number', minimum: 0, maximum: 1 }, enabled: { type: 'boolean' } } } }))) };
  const capacity = { resolveMany: vi.fn().mockResolvedValue({
    'test-model': { kind: 'known', tokens: 100, source: 'provider' }, equal: { kind: 'known', tokens: 100, source: 'provider' },
    larger: { kind: 'known', tokens: 200, source: 'provider' }, smaller: { kind: 'known', tokens: 50, source: 'provider' },
  }) };
  const validator = new RunModelSelectionService(catalog, capacity);
  let runActive = true;
  const run = { orgRunId: 'org', rootIdentity: createAgentOrgRootExecutionIdentity('org'), isActive: () => runActive,
    deliverExactAgentMessage: vi.fn(), terminate: vi.fn(async () => ({ accepted: true })) };
  const build = vi.fn().mockResolvedValue(run);
  const ensureWorkspaceByRootPath = vi.fn(async (root: string) => ({ getBasePath: () => root }));
  const manager = new AgentOrgRunManager({ workspaces: { ensureWorkspaceByRootPath } as any, memoryDir, executionTreeStore: store, modelSelectionValidator: validator,
    scopeBuilder: { build } as any, activeRootDirectory: new ActiveCollaborationRootDirectory(),
    tokenUsageRunStore: { assertAgentOrgRecordsReady: vi.fn() } });
  return { dir, tree, store, manager, validator, build, ensureWorkspaceByRootPath, failStop: () => { runActive = false; } };
}

describe('whole stopped AgentOrg model configuration', () => {
  it('resolves root, direct Agent, mounted Team and Team Agent and immutably applies model-only patches', () => {
    const tree = testAgentOrgExecutionTree({ orgRunId: 'org', members: [testOrgAgentNode('/worker','worker'),
      testOrgTeamNode({ address: '/team', teamRunId: 'team', coordinatorAddress: '/team/lead', members: [testOrgAgentNode('/team/lead','lead')] })] });
    const patches = [select('CONFIGURED_ORG','/'), select('CONFIGURED_AGENT','/worker'),
      select('CONFIGURED_TEAM','/team'), select('CONFIGURED_AGENT','/team/lead')];
    expect(listAgentOrgRunModelConfigScopes(tree).map(({ scopeKind, scopeAddress }) => [scopeKind, scopeAddress])).toEqual([
      ['CONFIGURED_ORG', '/'], ['CONFIGURED_AGENT', '/worker'],
      ['CONFIGURED_TEAM', '/team'], ['CONFIGURED_AGENT', '/team/lead'],
    ]);
    const targets = resolveAgentOrgRunModelConfigTargets(tree, patches);
    const next = applyAgentOrgRunModelConfigPatches(tree, targets);
    expect(tree.rootOrg.defaultLaunchConfiguration.llmConfig).toBeNull();
    expect(next.rootOrg.defaultLaunchConfiguration.llmConfig).toEqual({ temperature: 0, enabled: false });
    expect(next.rootOrg.members.map(member => 'agentRunId' in member ? member.launchConfiguration.llmConfig
      : [member.defaultLaunchConfiguration.llmConfig, member.members[0]!.launchConfiguration.llmConfig])).toEqual([
        { temperature: 0, enabled: false }, [{ temperature: 0, enabled: false }, { temperature: 0, enabled: false }],
      ]);
  });

  it('rejects duplicates, kind mismatches, Teams-as-Agents, and task addresses before mutation', () => {
    const tree = testAgentOrgExecutionTree({ orgRunId: 'org', members: [testOrgTeamNode({ address: '/team', teamRunId: 'team', coordinatorAddress: '/team/lead', members: [testOrgAgentNode('/team/lead','lead')] })] });
    expect(() => resolveAgentOrgRunModelConfigTargets(tree, [select('CONFIGURED_AGENT','/team')])).toThrow('does not match kind');
    expect(() => resolveAgentOrgRunModelConfigTargets(tree, [select('CONFIGURED_TEAM','/team'), select('CONFIGURED_TEAM','/team')])).toThrow('Duplicate');
    expect(() => resolveAgentOrgRunModelConfigTargets(tree, [select('CONFIGURED_AGENT','/task')])).toThrow('was not found');
  });

  it('validates every scope then performs one write/readback and preserves explicit null/zero/false', async () => {
    const h = await setup(); const write = vi.spyOn(h.store, 'write');
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [
      select('CONFIGURED_ORG','/'), select('CONFIGURED_AGENT','/worker'), select('CONFIGURED_TEAM','/team'),
      { ...select('CONFIGURED_AGENT','/team/lead'), llmConfig: null },
    ] });
    expect(result).toMatchObject({ success: true, outcome: 'UPDATED', isActive: false });
    expect(write).toHaveBeenCalledTimes(1); expect(h.build).not.toHaveBeenCalled();
    expect(result.canonical?.rootOrg.defaultLaunchConfiguration.llmConfig).toEqual({ temperature: 0, enabled: false });
    expect((result.canonical?.rootOrg.members[1] as any).members[0].launchConfiguration.llmConfig).toBeNull();
    expect((await h.manager.getRunConfig('org')).executionTree).toEqual(result.canonical);
  });

  it('applies none when any target fails validation and reports the exact scope path', async () => {
    const h = await setup(); const write = vi.spyOn(h.store, 'write');
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [
      select('CONFIGURED_ORG','/'), { ...select('CONFIGURED_AGENT','/worker'), llmConfig: { temperature: -1 } },
    ] });
    expect(result.outcome).toBe('VALIDATION_FAILED');
    expect(result.fieldErrors[0]?.path).toContain('modelPatches[/worker]');
    expect(write).not.toHaveBeenCalled(); expect(await h.store.read(h.dir, 'org')).toEqual(h.tree);
  });

  it('skips a no-op write and keeps explicit canonical values', async () => {
    const h = await setup(); const write = vi.spyOn(h.store, 'write');
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [{
      scopeKind: 'CONFIGURED_ORG', scopeAddress: '/', llmModelIdentifier: 'test-model',
      llmConfig: { temperature: 1, enabled: true },
    }] });
    expect(result).toMatchObject({ success: true, outcome: 'UNCHANGED' });
    expect(write).not.toHaveBeenCalled();
    expect(result.canonical).toEqual(h.tree);
  });

  it('keeps not-renamed failure distinct from committed-readback uncertainty and never replays', async () => {
    const notRenamed = await setup();
    const failedWrite = vi.spyOn(notRenamed.store, 'write').mockResolvedValue({ outcome: 'not_renamed' });
    const failed = await notRenamed.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [select('CONFIGURED_ORG','/')] });
    expect(failed).toMatchObject({ success: false, outcome: 'PERSISTENCE_FAILED', canonical: notRenamed.tree });
    expect(failedWrite).toHaveBeenCalledTimes(1);

    const uncertain = await setup();
    const uncertainWrite = vi.spyOn(uncertain.store, 'write').mockResolvedValue({ outcome: 'committed' });
    const unknown = await uncertain.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [select('CONFIGURED_ORG','/')] });
    expect(unknown).toMatchObject({ success: false, outcome: 'PERSISTENCE_INDETERMINATE', canonical: uncertain.tree });
    expect(uncertainWrite).toHaveBeenCalledTimes(1);
  });

  it('blocks archived, application-owned and admission-closed roots without writing', async () => {
    const archived = await setup();
    await archived.store.write(archived.dir, { ...archived.tree, archivedAt: '2026-09-17T00:00:00.000Z' });
    const archivedWrite = vi.spyOn(archived.store, 'write');
    expect((await archived.manager.getRunConfig('org')).editability).toEqual({ editable: false, reason: 'RUN_ARCHIVED' });
    expect((await archived.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('RUN_ARCHIVED');
    expect(archivedWrite).not.toHaveBeenCalled();

    const owned = await setup();
    await owned.store.write(owned.dir, { ...owned.tree, applicationBinding: { applicationId: 'app', bindingId: 'binding' } });
    const ownedWrite = vi.spyOn(owned.store, 'write');
    expect((await owned.manager.getRunConfig('org')).editability).toEqual({ editable: false, reason: 'OWNERSHIP_UNAVAILABLE' });
    expect((await owned.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('VALIDATION_FAILED');
    expect(ownedWrite).not.toHaveBeenCalled();

    const closed = await setup(); closed.manager.closeRootAdmission();
    const closedWrite = vi.spyOn(closed.store, 'write');
    expect((await closed.manager.getRunConfig('org')).editability).toEqual({ editable: false, reason: 'ADMISSION_CLOSED' });
    expect((await closed.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('VALIDATION_FAILED');
    expect(closedWrite).not.toHaveBeenCalled();
  });

  it('excludes managed fail-stopped roots and never activates on read/save', async () => {
    const h = await setup();
    expect((await h.manager.getRunConfig('org')).editability.editable).toBe(true);
    await h.manager.restore('org'); h.failStop(); expect(h.manager.getActive('org')).toBeNull();
    expect((await h.manager.getRunConfig('org')).editability.editable).toBe(false);
    expect((await h.manager.updateStoppedRunConfig({ orgRunId: 'org', teamWorkspacePatches: [], modelPatches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('RUN_ACTIVE');
    expect(h.build).toHaveBeenCalledTimes(1);
  });

});

describe('stopped AgentOrg Team workspace composition', () => {
  it('changes all configured children, preserves custom models/siblings/history, and validates once at final cwd', async () => {
    const h = await setup();
    const tree = structuredClone(h.tree) as any;
    const team = tree.rootOrg.members[1];
    team.members.push({ ...testOrgAgentNode('/team/custom', 'custom'),
      launchConfiguration: { ...team.members[0].launchConfiguration, workspaceRootPath: '/distinct', llmModelIdentifier: 'larger', llmConfig: { enabled: false } } });
    tree.rootOrg.members.push(testOrgTeamNode({ address: '/sibling', teamRunId: 'sibling', coordinatorAddress: '/sibling/lead', members: [testOrgAgentNode('/sibling/lead', 'sibling-lead')] }));
    team.taskExecutions = [{ address: '/team/lead', agentRunId: 'old-task', platformAgentRunId: null,
      startedAt: '2026-09-01T00:00:00.000Z', settledAt: '2026-09-01T00:01:00.000Z' }];
    await h.store.write(h.dir, tree);
    const write = vi.spyOn(h.store, 'write'), validate = vi.spyOn(h.validator, 'validateMany');
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: 'org',
      modelPatches: [select('CONFIGURED_AGENT', '/team/lead')],
      teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: ' /new/../destination/ ' }] });
    expect(result.outcome).toBe('UPDATED'); expect(write).toHaveBeenCalledTimes(1);
    expect(h.ensureWorkspaceByRootPath).toHaveBeenCalledExactlyOnceWith('/destination');
    expect(h.build).not.toHaveBeenCalled(); expect(validate).toHaveBeenCalledTimes(1);
    const validations = validate.mock.calls[0]![0];
    expect(validations).toHaveLength(3);
    expect(validations.every(item => item.context.workspaceRootPath === '/destination')).toBe(true);
    const next = result.canonical as any, saved = next.rootOrg.members[1];
    expect(saved.defaultLaunchConfiguration.workspaceRootPath).toBe('/destination');
    expect(saved.members.map((agent: any) => agent.launchConfiguration.workspaceRootPath)).toEqual(['/destination', '/destination']);
    expect(saved.members[1].launchConfiguration).toEqual({ ...team.members[1].launchConfiguration, workspaceRootPath: '/destination' });
    expect(saved.taskExecutions).toEqual(team.taskExecutions);
    expect(next.rootOrg.defaultLaunchConfiguration).toEqual(tree.rootOrg.defaultLaunchConfiguration);
    expect(next.rootOrg.members[0]).toEqual(tree.rootOrg.members[0]);
    expect(next.rootOrg.members[2]).toEqual(tree.rootOrg.members[2]);
    expect(next.rootOrg.taskExecutions).toEqual(tree.rootOrg.taskExecutions);
    expect((await h.manager.getRunConfig('org')).executionTree).toEqual(next);
  });

  it('does not persist validation normalization for unchanged model fields on workspace-only Save', async () => {
    const h = await setup();
    vi.spyOn(h.validator, 'validateMany').mockImplementation(async inputs => inputs.map(() => ({
      kind: 'valid', selection: { llmModelIdentifier: 'normalized', llmConfig: { injected: true } },
    })));
    const result = await h.manager.updateStoppedRunConfig({ orgRunId: 'org', modelPatches: [],
      teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/B' }] });
    expect(result.outcome).toBe('UPDATED');
    const team = result.canonical!.rootOrg.members[1] as any;
    expect(team.defaultLaunchConfiguration.llmModelIdentifier).toBe('test-model');
    expect(team.members[0].launchConfiguration.llmConfig).toBeNull();
  });

  it.each(['/', '/worker', '/team/lead', 'team', '/old-task'])('rejects non-Team target %s before registration or write', async teamAddress => {
    const h = await setup(), write = vi.spyOn(h.store, 'write');
    expect((await h.manager.updateStoppedRunConfig({ orgRunId: 'org', modelPatches: [],
      teamWorkspacePatches: [{ teamAddress, workspaceRootPath: '/B' }] })).outcome).toBe('VALIDATION_FAILED');
    expect(write).not.toHaveBeenCalled(); expect(h.ensureWorkspaceByRootPath).not.toHaveBeenCalled();
  });

  it('rejects duplicate/blank/empty intentions, registration and final-cwd validation failure without configuration mutation', async () => {
    const h = await setup(), write = vi.spyOn(h.store, 'write');
    for (const patches of [[], [{ teamAddress: '/team', workspaceRootPath: ' ' }],
      [{ teamAddress: '/team', workspaceRootPath: '/B' }, { teamAddress: '/team', workspaceRootPath: '/C' }]]) {
      expect((await h.manager.updateStoppedRunConfig({ orgRunId: 'org', modelPatches: [], teamWorkspacePatches: patches })).outcome).toBe('VALIDATION_FAILED');
    }
    expect((await h.manager.updateStoppedRunConfig({ orgRunId: 'org', modelPatches: [],
      teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: ' ' }] })).fieldErrors[0]?.path).toBe('teamWorkspacePatches[/team].workspaceRootPath');
    expect(h.ensureWorkspaceByRootPath).not.toHaveBeenCalled();
    h.ensureWorkspaceByRootPath.mockRejectedValueOnce(new Error('registration failed'));
    const input = { orgRunId: 'org', modelPatches: [], teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/B' }] };
    expect((await h.manager.updateStoppedRunConfig(input)).fieldErrors[0]?.path).toBe('teamWorkspacePatches[/team].workspaceRootPath');
    vi.spyOn(h.validator, 'validateMany').mockResolvedValue([{ kind: 'schema_unavailable' }, { kind: 'schema_unavailable' }] as any);
    expect((await h.manager.updateStoppedRunConfig(input)).outcome).toBe('SCHEMA_UNAVAILABLE');
    expect(write).not.toHaveBeenCalled(); expect(await h.store.read(h.dir, 'org')).toEqual(h.tree);
  });

  it('does not register while active and rechecks closed admission after awaited preparation', async () => {
    const h = await setup();
    const input = { orgRunId: 'org', modelPatches: [], teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/B' }] };
    await h.manager.restore('org'); h.failStop();
    expect((await h.manager.updateStoppedRunConfig(input)).outcome).toBe('RUN_ACTIVE');
    expect(h.ensureWorkspaceByRootPath).not.toHaveBeenCalled();
    const stopped = await setup(), write = vi.spyOn(stopped.store, 'write');
    stopped.ensureWorkspaceByRootPath.mockImplementationOnce(async root => {
      stopped.manager.closeRootAdmission(); return { getBasePath: () => root };
    });
    expect((await stopped.manager.updateStoppedRunConfig(input)).outcome).toBe('VALIDATION_FAILED');
    expect(write).not.toHaveBeenCalled();
  });

  it('serializes restore behind Save and reports no-op workspace Save without another write', async () => {
    const h = await setup(); let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    h.ensureWorkspaceByRootPath.mockImplementationOnce(async root => { await hold; return { getBasePath: () => root }; });
    const input = { orgRunId: 'org', modelPatches: [], teamWorkspacePatches: [{ teamAddress: '/team', workspaceRootPath: '/B' }] };
    const save = h.manager.updateStoppedRunConfig(input);
    const restore = h.manager.restore('org');
    await new Promise(resolve => setTimeout(resolve, 10)); expect(h.build).not.toHaveBeenCalled();
    release(); expect((await save).outcome).toBe('UPDATED'); await restore;
    expect((h.build.mock.calls[0]![0] as any).state.executionTree.rootOrg.members[1].members[0].launchConfiguration.workspaceRootPath).toBe('/B');
    await h.manager.terminate('org'); const write = vi.spyOn(h.store, 'write');
    expect((await h.manager.updateStoppedRunConfig(input)).outcome).toBe('UNCHANGED'); expect(write).not.toHaveBeenCalled();
  });
});
