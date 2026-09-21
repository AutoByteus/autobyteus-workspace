import "reflect-metadata";
import { describe, expect, it, vi } from 'vitest';
import { FlatTeamExecutionFactory } from '../../../src/agent-team-execution/local/flat-team-execution-factory.js';
import { MemberExecutionContextBuilder } from '../../../src/agent-team-execution/services/member-team-context-builder.js';
import { AgentTeamRunManager } from '../../../src/agent-team-execution/services/agent-team-run-manager.js';
import { RunModelSelectionService } from '../../../src/llm-management/services/run-model-selection-service.js';
import { createTaskExecutionIdentityCapabilities } from '../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js';
import { testAgentNode, testExecutionTree } from '../../fixtures/current-team-run-fixtures.js';
import { StudioRunModelConfigService } from '../../../src/run-history/services/studio-run-model-config-service.js';
import { AgentTeamRunResolver } from '../../../src/api/graphql/types/agent-team-run.js';
const harness = (physicalOutcome = 'committed', readback = 'ok') => {
  let saved: any = testExecutionTree({ rootTeamRunId: 'root', coordinatorAddress: '/member', children: [testAgentNode('/member', { platformAgentRunId: 'retained-provider-id' })] });
  saved = structuredClone(saved);
  saved.rootTeam.taskExecutions = [{ address: '/task-run', agentRunId: 'retained-task', platformAgentRunId: 'platform-task',
    startedAt: '2026-09-01T00:00:00Z', settledAt: '2026-09-01T00:01:00Z' }];
  const root = saved.rootTeam.defaultLaunchConfiguration;
  root.runtimeKind = 'codex_app_server'; root.llmModelIdentifier = 'small'; root.workspaceRootPath = '/workspace'; root.llmConfig = null;
  const member = saved.rootTeam.members[0].launchConfiguration;
  Object.assign(member, root, { llmModelIdentifier: 'large' });
  let attempted = false;
  const read = vi.fn(async () => {
    if (attempted && readback === 'throws') throw new Error('post-write read unavailable');
    return attempted && readback === 'missing' ? null : saved;
  });
  const write = vi.fn(async (_dir, next) => {
    attempted = true;
    if (physicalOutcome !== 'not_renamed') saved = next;
    return { outcome: physicalOutcome };
  });
  const catalog = { listLlmModels: vi.fn(async () => ['small','equal','large'].map(model_identifier => ({ model_identifier } as any))) };
  const capacity = { resolveMany: vi.fn(async () => Object.fromEntries([['small',128000],['equal',128000],['large',272000]].map(([id,tokens])=>[id,{ kind: 'known' as const, tokens: Number(tokens), source: 'provider' }]))) };
  const flatTeamExecutionFactory = new FlatTeamExecutionFactory();
  const memberExecutionContextBuilder = new MemberExecutionContextBuilder({} as any);
  const manager = new AgentTeamRunManager({ memoryDir: '/tmp/model-save-unit-no-disk', flatTeamExecutionFactory, memberExecutionContextBuilder,
    taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async () => 'task' }),
    executionTreeStore: { read, write } as any, modelSelectionValidator: new RunModelSelectionService(catalog, capacity) });
  return { manager, read, write, capacity, saved: () => saved };
};
describe('configured Team model selection Save', () => {
  it('validates every original baseline before writing and does not omit incompatible children', async () => {
    const h = harness(); const original = structuredClone(h.saved());
    const result = await h.manager.updateStoppedModelConfigs({ teamRunId: 'root', patches: [
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/', llmModelIdentifier: 'equal', llmConfig: null },
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/member', llmModelIdentifier: 'equal', llmConfig: null },
    ] });
    expect(result).toMatchObject({ outcome: 'VALIDATION_FAILED', fieldErrors: [{ path: 'patches[/member].llmModelIdentifier' }] });
    expect(h.write).not.toHaveBeenCalled(); expect(h.saved()).toEqual(original);
    expect(h.capacity.resolveMany).toHaveBeenCalledTimes(1);
  });
  it('commits one tree preserving configured identities and task records; later Save uses new baseline', async () => {
    const h = harness(); const original = structuredClone(h.saved());
    const patch = { scopeKind: 'CONFIGURED_TEAM' as const, scopeAddress: '/', llmModelIdentifier: 'large', llmConfig: null };
    expect((await h.manager.updateStoppedModelConfigs({ teamRunId: 'root', patches: [patch] })).outcome).toBe('UPDATED');
    expect(h.write).toHaveBeenCalledTimes(1);
    expect(h.saved()).toEqual({ ...original, rootTeam: { ...original.rootTeam, defaultLaunchConfiguration: { ...original.rootTeam.defaultLaunchConfiguration, llmModelIdentifier: 'large' } } });
    expect((await h.manager.updateStoppedModelConfigs({ teamRunId: 'root', patches: [{ ...patch, llmModelIdentifier: 'small' }] })).outcome).toBe('VALIDATION_FAILED');
    expect(h.write).toHaveBeenCalledTimes(1);
  });
  it.each(['committed', 'renamed_finalization_indeterminate', 'not_renamed'].flatMap(physicalOutcome =>
    ['ok', 'throws', 'missing'].map(readback => ({ physicalOutcome, readback }))))(
    'preserves $physicalOutcome / $readback through Team owner, Studio and resolver', async ({ physicalOutcome, readback }) => {
      const h = harness(physicalOutcome, readback);
      const original = structuredClone(h.saved());
      const service = new StudioRunModelConfigService({
        modelSelectionService: { listOptions: vi.fn(), listOptionsMany: vi.fn() },
        applicationRunOwnership: { hasLiveRunOwnership: vi.fn(async () => false) },
        agentResumeConfigService: { getAgentRunResumeConfig: vi.fn() },
        agentRunService: { updateStoppedModelConfig: vi.fn() },
        teamResumeConfigService: { getTeamRunResumeConfig: vi.fn(async () => ({
          teamRunId: 'root', executionTree: original, isActive: false,
          modelConfigEditability: { editable: true, reason: null },
        })) },
        teamRunService: { updateStoppedModelConfigs: input => h.manager.updateStoppedModelConfigs(input) },
      });
      const response = await AgentTeamRunResolver.prototype.updateStoppedTeamRunModelConfigs.call(
        { runModelConfigService: service } as never,
        { teamRunId: 'root', patches: [{ scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/',
          llmModelIdentifier: 'large', llmConfig: null }] },
      );
      const expected = physicalOutcome === 'not_renamed' ? 'PERSISTENCE_FAILED'
        : physicalOutcome === 'renamed_finalization_indeterminate' || readback !== 'ok'
          ? 'PERSISTENCE_INDETERMINATE' : 'UPDATED';
      expect(response).toMatchObject({ outcome: expected, success: expected === 'UPDATED',
        isActive: false, editability: { editable: true, reason: null }, fieldErrors: [],
        canonicalExecutionTree: { root_team: { default_launch_configuration: {
          llm_model_identifier: readback === 'ok' && physicalOutcome !== 'not_renamed' ? 'large' : 'small',
          llm_config: null,
        } } },
      });
      expect(h.write).toHaveBeenCalledTimes(1);
      expect(h.saved()).toEqual(physicalOutcome === 'not_renamed' ? original : {
        ...original, rootTeam: { ...original.rootTeam, defaultLaunchConfiguration: {
          ...original.rootTeam.defaultLaunchConfiguration, llmModelIdentifier: 'large',
        } },
      });
    },
  );

});
