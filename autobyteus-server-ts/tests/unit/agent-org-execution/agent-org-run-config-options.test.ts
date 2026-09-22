import { describe, it, expect, vi } from 'vitest';
import { AgentOrgRunService } from '../../../src/agent-org-execution/services/agent-org-run-service.js';
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from '../../fixtures/current-agent-org-run-fixtures.js';

describe('Org candidate workspace model options', () => {
  it('uses proposed Team/child cwd with saved models without registration, persistence or activation', async () => {
    const tree = testAgentOrgExecutionTree({ orgRunId: 'org', members: [testOrgAgentNode('/direct', 'direct'),
      testOrgTeamNode({ address: '/team', teamRunId: 'team', coordinatorAddress: '/team/lead', members: [testOrgAgentNode('/team/lead', 'lead')] })] });
    const before = structuredClone(tree);
    const listOptionsMany = vi.fn(async (contexts: any[]) => contexts.map(context => ({ currentModelIdentifier: context.currentModelIdentifier, replacements: [] })));
    const ensureWorkspaceByRootPath = vi.fn(), create = vi.fn(), restore = vi.fn(), updateStoppedRunConfig = vi.fn();
    const service = new AgentOrgRunService({ manager: { getRunConfig: vi.fn().mockResolvedValue({ executionTree: tree }), create, restore, updateStoppedRunConfig },
      workspaces: { ensureWorkspaceByRootPath }, modelSelectionOptions: { listOptionsMany } } as any);
    await service.runModelOptions('org', [{ teamAddress: '/team', workspaceRootPath: '/dest/../B/' }]);
    expect(listOptionsMany.mock.calls[0]![0].map(context => context.workspaceRootPath)).toEqual(['/workspace', '/workspace', '/B', '/B']);
    expect(listOptionsMany.mock.calls[0]![0].every(context => context.currentModelIdentifier === 'test-model')).toBe(true);
    expect(tree).toEqual(before);
    for (const call of [ensureWorkspaceByRootPath, create, restore, updateStoppedRunConfig]) expect(call).not.toHaveBeenCalled();
    await expect(service.runModelOptions('org', [{ teamAddress: '/direct', workspaceRootPath: '/B' }])).rejects.toThrow('mounted Team');
  });
});
