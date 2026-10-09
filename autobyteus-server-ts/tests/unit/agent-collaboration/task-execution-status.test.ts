import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentInputUserMessage } from 'autobyteus-ts/agent/message/agent-input-user-message.js';
import { RootTaskExecutionLifecycle } from '../../../src/agent-collaboration/execution/task/root-task-execution-lifecycle.js';
import { nestedReleaseScenario } from '../../fixtures/task-release-generation-fixtures.js';

afterEach(() => vi.restoreAllMocks());

// Actual root adapters, registries, factory and handles for each root kind; provider runs and the
// Task side are controlled. Task A is an assigned Team (quiet-shut-down by the fixture), Task B an assigned Agent.
describe.each(['agent', 'agent_team', 'agent_org'] as const)('%s root: a task execution\'s own live status for the Task side', kind => {
  it('reports the live worker status, the folded team status, and offline once stopped or not admitting (DEC-006)', async () => {
    const f = await nestedReleaseScenario(kind);
    const lifecycle = new RootTaskExecutionLifecycle(f.adapter, { taskExecutionResources: f.resources, gracePeriodMs: () => 600_000 });
    // The live Agent copy reports its handle's status; the quiet-shut-down Team copy reports offline.
    expect(lifecycle.taskExecutionStatus({ agentRunId: 'B-worker' })).toBe('idle');
    expect(lifecycle.taskExecutionStatus({ teamRunId: 'A-team' })).toBe('offline');
    // Restored (live) Team: its status folds its members' live statuses.
    await f.adapter.restoreChain('A-lead', () => undefined);
    expect(lifecycle.taskExecutionStatus({ teamRunId: 'A-team' })).toBe('offline'); // members activate lazily
    expect(await f.getManaged('A-team')!.postMessage(new AgentInputUserMessage('Next round'), 'A-lead')).toMatchObject({ accepted: true });
    const lead = f.getManaged('A-team')!.getLeafAgentStatusSnapshots().find((snapshot) => snapshot.execution.agentRunId === 'A-lead');
    expect(lead?.details.status).not.toBe('offline');
    expect(lifecycle.taskExecutionStatus({ teamRunId: 'A-team' })).toBe(lead!.details.status);
    // Reading never wakes anything: an unknown or stopped copy is offline.
    expect(lifecycle.taskExecutionStatus({ agentRunId: 'never-delegated' })).toBe('offline');
    f.resources.close('B');
    await lifecycle.releaseTaskExecutions([{ agentRunId: 'B-worker' }]);
    expect(lifecycle.taskExecutionStatus({ agentRunId: 'B-worker' })).toBe('offline');
    lifecycle.closeExternalAdmission();
    expect(lifecycle.taskExecutionStatus({ teamRunId: 'A-team' })).toBe('offline');
  });

  it('forwards every status change of an agent in a copy to the Task side, and announces all copies when it stops admitting', async () => {
    const f = await nestedReleaseScenario(kind);
    const lifecycle = new RootTaskExecutionLifecycle(f.adapter, { taskExecutionResources: f.resources, gracePeriodMs: () => 600_000 });
    lifecycle.onAgentStatus('A-child', 'running');
    expect(f.resources.statusChanges.at(-1)).toEqual({ hostRoot: f.root, references: [{ agentRunId: 'A-child' }, { teamRunId: 'A-team' }] });
    lifecycle.onAgentStatus('not-in-a-copy', 'running');
    expect(f.resources.statusChanges).toHaveLength(1);
    lifecycle.closeExternalAdmission();
    const announced = f.resources.statusChanges.at(-1)!.references.map((reference) => 'agentRunId' in reference ? reference.agentRunId : reference.teamRunId);
    expect(announced).toEqual(expect.arrayContaining(['A-team', 'A-child', 'A-nested', 'A-grand', 'A-helper', 'B-worker']));
    // Status changes after the root stopped admitting (its agents going offline) are still forwarded.
    lifecycle.onAgentStatus('B-worker', 'offline');
    expect(f.resources.statusChanges.at(-1)!.references).toEqual([{ agentRunId: 'B-worker' }]);
  });
});
