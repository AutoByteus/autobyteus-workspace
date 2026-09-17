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
import { applyAgentOrgRunModelConfigPatches, listAgentOrgRunModelConfigScopes, resolveAgentOrgRunModelConfigTargets } from '../../../src/agent-org-execution/services/agent-org-run-model-config-mutator.js';

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
  const manager = new AgentOrgRunManager({ memoryDir, executionTreeStore: store, modelSelectionValidator: validator,
    scopeBuilder: { build } as any, activeRootDirectory: new ActiveCollaborationRootDirectory(),
    tokenUsageRunStore: { assertAgentOrgRecordsReady: vi.fn() } });
  return { dir, tree, store, manager, validator, build, failStop: () => { runActive = false; } };
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
    const result = await h.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [
      select('CONFIGURED_ORG','/'), select('CONFIGURED_AGENT','/worker'), select('CONFIGURED_TEAM','/team'),
      { ...select('CONFIGURED_AGENT','/team/lead'), llmConfig: null },
    ] });
    expect(result).toMatchObject({ success: true, outcome: 'UPDATED', isActive: false });
    expect(write).toHaveBeenCalledTimes(1); expect(h.build).not.toHaveBeenCalled();
    expect(result.canonical?.rootOrg.defaultLaunchConfiguration.llmConfig).toEqual({ temperature: 0, enabled: false });
    expect((result.canonical?.rootOrg.members[1] as any).members[0].launchConfiguration.llmConfig).toBeNull();
    expect((await h.manager.getRunModelConfig('org')).executionTree).toEqual(result.canonical);
  });

  it('applies none when any target fails validation and reports the exact scope path', async () => {
    const h = await setup(); const write = vi.spyOn(h.store, 'write');
    const result = await h.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [
      select('CONFIGURED_ORG','/'), { ...select('CONFIGURED_AGENT','/worker'), llmConfig: { temperature: -1 } },
    ] });
    expect(result.outcome).toBe('VALIDATION_FAILED');
    expect(result.fieldErrors[0]?.path).toContain('patches[/worker]');
    expect(write).not.toHaveBeenCalled(); expect(await h.store.read(h.dir, 'org')).toEqual(h.tree);
  });

  it('skips a no-op write and keeps explicit canonical values', async () => {
    const h = await setup(); const write = vi.spyOn(h.store, 'write');
    const result = await h.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [{
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
    const failed = await notRenamed.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [select('CONFIGURED_ORG','/')] });
    expect(failed).toMatchObject({ success: false, outcome: 'PERSISTENCE_FAILED', canonical: notRenamed.tree });
    expect(failedWrite).toHaveBeenCalledTimes(1);

    const uncertain = await setup();
    const uncertainWrite = vi.spyOn(uncertain.store, 'write').mockResolvedValue({ outcome: 'committed' });
    const unknown = await uncertain.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [select('CONFIGURED_ORG','/')] });
    expect(unknown).toMatchObject({ success: false, outcome: 'PERSISTENCE_INDETERMINATE', canonical: uncertain.tree });
    expect(uncertainWrite).toHaveBeenCalledTimes(1);
  });

  it('blocks archived, application-owned and admission-closed roots without writing', async () => {
    const archived = await setup();
    await archived.store.write(archived.dir, { ...archived.tree, archivedAt: '2026-09-17T00:00:00.000Z' });
    const archivedWrite = vi.spyOn(archived.store, 'write');
    expect((await archived.manager.getRunModelConfig('org')).editability).toEqual({ editable: false, reason: 'RUN_ARCHIVED' });
    expect((await archived.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('RUN_ARCHIVED');
    expect(archivedWrite).not.toHaveBeenCalled();

    const owned = await setup();
    await owned.store.write(owned.dir, { ...owned.tree, applicationBinding: { applicationId: 'app', bindingId: 'binding' } });
    const ownedWrite = vi.spyOn(owned.store, 'write');
    expect((await owned.manager.getRunModelConfig('org')).editability).toEqual({ editable: false, reason: 'OWNERSHIP_UNAVAILABLE' });
    expect((await owned.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('VALIDATION_FAILED');
    expect(ownedWrite).not.toHaveBeenCalled();

    const closed = await setup(); closed.manager.closeRootAdmission();
    const closedWrite = vi.spyOn(closed.store, 'write');
    expect((await closed.manager.getRunModelConfig('org')).editability).toEqual({ editable: false, reason: 'ADMISSION_CLOSED' });
    expect((await closed.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('VALIDATION_FAILED');
    expect(closedWrite).not.toHaveBeenCalled();
  });

  it('excludes managed fail-stopped roots and never activates on read/save', async () => {
    const h = await setup();
    expect((await h.manager.getRunModelConfig('org')).editability.editable).toBe(true);
    await h.manager.restore('org'); h.failStop(); expect(h.manager.getActive('org')).toBeNull();
    expect((await h.manager.getRunModelConfig('org')).editability.editable).toBe(false);
    expect((await h.manager.updateStoppedRunModelConfigs({ orgRunId: 'org', patches: [select('CONFIGURED_ORG','/')] })).outcome).toBe('RUN_ACTIVE');
    expect(h.build).toHaveBeenCalledTimes(1);
  });

});
