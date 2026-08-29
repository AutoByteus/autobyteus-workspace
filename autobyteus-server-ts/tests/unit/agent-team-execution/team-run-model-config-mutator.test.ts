import { describe, expect, it } from 'vitest';
import {
  applyTeamRunModelConfigPatches,
  resolveTeamRunModelConfigTargets,
} from '../../../src/agent-team-execution/services/team-run-model-config-mutator.js';

const launch = (llmConfig: Record<string, unknown>) => ({
  runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt', llmConfig,
  autoExecuteTools: false, skillAccessMode: 'PRELOADED_ONLY', workspaceRootPath: '/workspace',
});
const tree = () => ({
  schemaVersion: 2, createdAt: '2026-08-25T00:00:00.000Z', archivedAt: null, applicationBinding: null, handoffs: [],
  rootTeam: {
    address: '/', teamDefinitionId: 'root-def', teamDefinitionName: 'Root', teamRunId: 'root-run',
    coordinatorAddress: '/agent', defaultLaunchConfiguration: launch({ effort: 'medium' }), taskExecutions: [],
    members: [{
      address: '/agent', agentDefinitionId: 'agent-def', role: null, description: null,
      agentRunId: 'agent-run', platformAgentRunId: null, launchConfiguration: launch({ effort: 'medium' }),
    }],
  },
} as any);

describe('Team run model-config mutator', () => {
  it('changes only the addressed configured launch configurations', () => {
    const original = tree();
    const targets = resolveTeamRunModelConfigTargets(original, [{
      scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', llmConfig: { effort: 'high' },
    }]);
    const updated = applyTeamRunModelConfigPatches(original, targets);
    expect(updated.rootTeam.defaultLaunchConfiguration.llmConfig).toEqual({ effort: 'medium' });
    expect((updated.rootTeam.members[0] as any).launchConfiguration.llmConfig).toEqual({ effort: 'high' });
    expect(original.rootTeam.members[0].launchConfiguration.llmConfig).toEqual({ effort: 'medium' });
  });

  it('rejects duplicate, missing, and kind-mismatched configured targets', () => {
    const original = tree();
    expect(() => resolveTeamRunModelConfigTargets(original, [
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', llmConfig: null },
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/agent', llmConfig: null },
    ])).toThrow(/Duplicate/);
    expect(() => resolveTeamRunModelConfigTargets(original, [
      { scopeKind: 'CONFIGURED_TEAM', scopeAddress: '/agent', llmConfig: null },
    ])).toThrow(/does not match kind/);
    expect(() => resolveTeamRunModelConfigTargets(original, [
      { scopeKind: 'CONFIGURED_AGENT', scopeAddress: '/task-agent', llmConfig: null },
    ])).toThrow(/was not found/);
  });
});
