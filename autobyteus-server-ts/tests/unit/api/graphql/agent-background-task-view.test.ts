import { createRequire } from 'node:module';
// type-graphql loads CommonJS graphql; use the same realm under Vitest's ESM runner.
const { graphql } = createRequire(import.meta.url)('graphql') as typeof import('graphql');
import { buildSchema } from 'type-graphql';
import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentRunManager } from '../../../../src/agent-execution/services/agent-run-manager.js';
import { AgentBackgroundTaskViewResolver } from '../../../../src/api/graphql/types/agent-background-task-view.js';

const snapshot = { kind: 'snapshot', agentRunId: 'run-1', runInstanceId: 'instance-1', observedAt: 'now', tasks: [] };
const fixture = () => {
  const run = { isActive: vi.fn(() => true), inspectBackgroundTasks: vi.fn().mockResolvedValue(snapshot), getStatusSnapshot: vi.fn(), forceReleaseRuntime: vi.fn() };
  const manager = { peekPublishedRun: vi.fn(() => run), getActiveRun: vi.fn(), hasActiveRun: vi.fn(), listActiveRuns: vi.fn(), terminateAgent: vi.fn() };
  vi.spyOn(AgentRunManager, 'getInstance').mockReturnValue(manager as never);
  return { run, manager, resolver: new AgentBackgroundTaskViewResolver() };
};
afterEach(() => vi.restoreAllMocks());
describe('selected-run background query (unit boundary, not API acceptance)', () => {
  it('uses only the observational run lookup and exact instance read', async () => {
    const { run, manager, resolver } = fixture();
    expect(await resolver.agentBackgroundTaskView(' run-1 ')).toEqual(snapshot);
    expect(manager.peekPublishedRun).toHaveBeenCalledTimes(2);
    expect(manager.peekPublishedRun).toHaveBeenCalledWith('run-1');
    expect(run.isActive).toHaveBeenCalledTimes(2);
    expect(manager.getActiveRun).not.toHaveBeenCalled(); expect(manager.hasActiveRun).not.toHaveBeenCalled();
    expect(run.getStatusSnapshot).not.toHaveBeenCalled(); expect(run.forceReleaseRuntime).not.toHaveBeenCalled();
  });
  it('does not inspect or prune an inactive published run', async () => {
    const { run, manager, resolver } = fixture(); run.isActive.mockReturnValue(false);
    expect(await resolver.agentBackgroundTaskView('run-1')).toMatchObject({ kind: 'unavailable', reason: 'inactive' });
    expect(run.inspectBackgroundTasks).not.toHaveBeenCalled(); expect(manager.getActiveRun).not.toHaveBeenCalled();
    expect(manager.peekPublishedRun('run-1')).toBe(run);
  });
  it.each(['inactive', 'replaced', 'removed'])('discards a response when the captured run is %s during await, with no replacement retry', async change => {
    const { run, manager, resolver } = fixture();
    run.inspectBackgroundTasks.mockImplementation(async () => {
      if (change === 'inactive') run.isActive.mockReturnValue(false);
      else manager.peekPublishedRun.mockReturnValue(change === 'removed' ? null as never : { ...run } as never);
      return snapshot;
    });
    expect(await resolver.agentBackgroundTaskView('run-1')).toMatchObject({ kind: 'unavailable', reason: 'inactive' });
    expect(run.inspectBackgroundTasks).toHaveBeenCalledTimes(1); expect(run.forceReleaseRuntime).not.toHaveBeenCalled();
  });
  it('rechecks identity even after an exception and never exposes its payload', async () => {
    const { run, manager, resolver } = fixture(); run.inspectBackgroundTasks.mockRejectedValueOnce(new Error('SECRET'));
    expect(await resolver.agentBackgroundTaskView('run-1')).toEqual({ kind: 'unavailable', agentRunId: 'run-1', reason: 'inspection_failed' });
    run.inspectBackgroundTasks.mockImplementation(async () => { manager.peekPublishedRun.mockReturnValue(null as never); throw new Error('SECRET'); });
    expect(await resolver.agentBackgroundTaskView('run-1')).toMatchObject({ kind: 'unavailable', reason: 'inactive' });
  });
});


describe('background view GraphQL serialization', () => {
  const source = `query($id: String!) { agentBackgroundTaskView(agentRunId: $id) {
    __typename
    ... on AgentBackgroundTaskSnapshot { agentRunId runInstanceId tasks { taskId status command exitCode } }
    ... on AgentBackgroundTaskEventStream { agentRunId }
    ... on AgentBackgroundTaskUnsupported { agentRunId reason }
    ... on AgentBackgroundTaskUnavailable { agentRunId reason }
  } }`;
  it.each([
    { kind: 'snapshot', agentRunId: 'run-1', runInstanceId: 'instance-1', observedAt: 'now', tasks: [
      { taskId: 'view-1', kind: 'shell', description: 'bash', command: null, exitCode: -1, status: 'failed', startedAt: 'now' },
    ] },
    { kind: 'event-stream', agentRunId: 'run-1' },
    { kind: 'unsupported', agentRunId: 'run-1', reason: 'unsupported' },
    { kind: 'unavailable', agentRunId: 'run-1', reason: 'incomplete' },
  ])('serializes $kind through the actual typed union', async view => {
    const { run } = fixture(); run.inspectBackgroundTasks.mockResolvedValue(view);
    const schema = await buildSchema({ resolvers: [AgentBackgroundTaskViewResolver] });
    const result = await graphql({ schema, source, variableValues: { id: 'run-1' } });
    expect(result.errors).toBeUndefined();
    expect(result.data?.agentBackgroundTaskView).toMatchObject({ agentRunId: 'run-1' });
    expect(JSON.stringify(result)).not.toContain('"kind"');
  });
});
