import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  hydrateLiveTeamRunContext,
  hydrateTeamRunContextForStreamRecovery,
} from '../teamRunContextHydrationService';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { GetRunFileChanges } from '~/graphql/queries/runHistoryQueries';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import { commitTeamRunHydration, markCommittedTeamRunHydrationAuthority } from '../teamRunHydrationCommit';
import { isTeamMemberProjectionAuthoritative } from '../teamMemberProjectionHydrationService';

const {
  queryMock,
  fetchTeamCommunicationMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  fetchTeamCommunicationMock: vi.fn(),
}));

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: queryMock }) }));
vi.mock('../teamCommunicationHydrationService', () => ({
  fetchTeamCommunicationForTeam: fetchTeamCommunicationMock,
}));
const tree = buildTestTeamContext({
  teamRunId: 'team-live-recovery',
  teamDefinitionId: 'team-def-1',
  teamDefinitionName: 'Recovery Team',
  coordinatorAddress: '/member-a',
  rootChildren: [testAgentNode('/member-a', {
    agentRunId: 'run-a', agentDefinitionId: 'agent-a', llmModelIdentifier: 'gpt-test',
  })],
}).view.getExecutionTree();

const projectedActivity = {
  kind: 'compaction', activityId: 'compaction:boundary:boundary-a', phase: 'completed',
  message: 'Provider context compaction boundary recorded', turnId: 'turn-a',
  provider: 'codex', boundaryKey: 'boundary-a', ts: 30,
};

describe('hydrateLiveTeamRunContext current V2 aggregate', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    fetchTeamCommunicationMock.mockResolvedValue([]);
  });

  it('stages one exact AgentRun projection without mutating the Activity store', async () => {
    const projection = {
      agentRunId: 'run-a', conversation: [], activities: [projectedActivity], hasEarlierActiveTraceEvents: false,
    };
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => (
      variables.agentRunId
        ? { data: { getTeamMemberRunProjection: projection }, errors: [] }
        : { data: { getTeamRunResumeConfig: {
            teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
          } }, errors: [] }
    ));

    const result = await hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    });

    const memberContext = result.hydratedContext.view.getAgentContext('run-a');
    expect(result.focusedAgentRunId).toBe('run-a');
    expect(result.hydratedContext.view.getMemberAddress('run-a')).toBe('/member-a');
    expect(memberContext?.state.runId).toBe('run-a');
    expect(result.memberRunStates).toEqual([
      expect.objectContaining({ runId: 'run-a', expectedActivityRevision: 0 }),
    ]);
    expect(result.memberRunStates[0]?.activities).toEqual([
      expect.objectContaining({ activityId: projectedActivity.activityId }),
    ]);
  });

  it.each([true, false])('hydrates a delegated execution as a standard navigable row under active=%s', async isActive => {
    const retainedTree = structuredClone(tree);
    retainedTree.root_team.task_executions.push({ kind: 'task_agent', address: '/member-a',
      agent_run_id: 'retained-task', platform_agent_run_id: null, delegator_agent_run_id: 'run-a',
      started_at: retainedTree.created_at });
    queryMock.mockImplementation(async ({ variables }) => variables.agentRunId
      ? { data: { getTeamMemberRunProjection: { agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } }
      : { data: { getTeamRunResumeConfig: { teamRunId: 'team-live-recovery', isActive, executionTree: retainedTree } } });
    const result = await hydrateLiveTeamRunContext({ teamRunId: 'team-live-recovery', agentRunId: 'retained-task',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null), ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null) });
    const view = result.hydratedContext.view;
    expect(result.focusedAgentRunId).toBe('retained-task');
    expect(view.isRootTeamActive()).toBe(isActive);
    expect(view.getFocusedNavigationRow()).toMatchObject({ kind: 'task_agent', agentRunId: 'retained-task', focusable: true });
    expect(view.getFocusedNavigationRow()?.delegatedBy).toBeTruthy();
    expect(view.listNavigationRows().some(row => row.agentRunId === 'retained-task')).toBe(true);
  });

  it('fails fast when the exact requested AgentRun projection is missing', async () => {
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => (
      variables.agentRunId
        ? { data: { getTeamMemberRunProjection: null }, errors: [] }
        : { data: { getTeamRunResumeConfig: {
            teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
          } }, errors: [] }
    ));

    await expect(hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow("Team member projection payload missing for 'run-a'.");
  });

  it('keeps the requested projection exact while treating nonfocused members as best effort', async () => {
    const twoMemberTree = buildTestTeamContext({
      teamRunId: 'team-live-recovery',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Recovery Team',
      coordinatorAddress: '/member-a',
      rootChildren: [
        testAgentNode('/member-a', {
          agentRunId: 'run-a', agentDefinitionId: 'agent-a', llmModelIdentifier: 'gpt-test',
        }),
        testAgentNode('/member-b', {
          agentRunId: 'run-b', agentDefinitionId: 'agent-b', llmModelIdentifier: 'gpt-test',
        }),
      ],
    }).view.getExecutionTree();
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => {
      if (!variables.agentRunId) {
        return { data: { getTeamRunResumeConfig: {
          teamRunId: 'team-live-recovery', isActive: true, executionTree: twoMemberTree,
        } }, errors: [] };
      }
      if (variables.agentRunId === 'run-a') {
        return { data: { getTeamMemberRunProjection: {
          agentRunId: 'run-a', conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
        } }, errors: [] };
      }
      return { data: null, errors: [{ message: 'nonfocused projection unavailable' }] };
    });

    const result = await hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    });

    expect(result.focusedAgentRunId).toBe('run-a');
    expect(result.projectionByAgentRunId.get('run-a')).toEqual(expect.objectContaining({ agentRunId: 'run-a' }));
    expect(result.projectionByAgentRunId.get('run-b')).toBeNull();
    expect(result.memberRunStates.map((replacement) => replacement.runId)).toEqual(['run-a']);
  });

  it('rejects a requested root that disagrees with the execution tree', async () => {
    queryMock.mockResolvedValue({ data: { getTeamRunResumeConfig: {
      teamRunId: 'foreign-root', isActive: false, executionTree: tree,
    } }, errors: [] });
    await expect(hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow("Team execution tree root identity mismatch for 'team-live-recovery'.");
  });

  it('accepts the exact non-null empty projection inside a stable recovery checkpoint', async () => {
    const checkpoints = [
      { rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false },
      { rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false },
    ];
    const emptyProjection = {
      agentRunId: 'run-a', conversation: [], activities: [], summary: null,
      lastActivityAt: null, hasEarlierActiveTraceEvents: false,
    };
    queryMock.mockImplementation(async ({ query, variables }: { query: any; variables: Record<string, unknown> }) => {
      const operation = query.definitions[0]?.name?.value;
      if (operation === 'GetTeamRunExecutionCheckpoint') {
        return { data: { getTeamRunExecutionCheckpoint: checkpoints.shift() }, errors: [] };
      }
      if (variables.agentRunId) {
        return { data: { getTeamMemberRunProjection: emptyProjection }, errors: [] };
      }
      return { data: { getTeamRunResumeConfig: {
        teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
      } }, errors: [] };
    });

    const result = await hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    });

    expect(result.expectedBaseChangeSequence).toBe(9);
    expect(result.projectionByAgentRunId.get('run-a')).toBe(emptyProjection);
    expect(result.hydratedContext.view.getAgentContext('run-a')?.state.conversation.messages).toEqual([]);
    expect(checkpoints).toEqual([]);
  });

  it('refuses recovery before hydration while the root still has open work', async () => {
    queryMock.mockResolvedValue({ data: { getTeamRunExecutionCheckpoint: {
      rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: true,
    } }, errors: [] });

    await expect(hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow('TEAM_STREAM_RECOVERY_WAIT');
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('cancels recovery when the root checkpoint changes during hydration', async () => {
    const checkpoints = [
      { rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false },
      { rootTeamRunId: 'team-live-recovery', changeSequence: 10, hasOpenExecutionWork: false },
    ];
    queryMock.mockImplementation(async ({ query, variables }: { query: any; variables: Record<string, unknown> }) => {
      const operation = query.definitions[0]?.name?.value;
      if (operation === 'GetTeamRunExecutionCheckpoint') {
        return { data: { getTeamRunExecutionCheckpoint: checkpoints.shift() }, errors: [] };
      }
      if (variables.agentRunId) {
        return { data: { getTeamMemberRunProjection: {
          agentRunId: 'run-a', conversation: [], activities: [], summary: null,
          lastActivityAt: null, hasEarlierActiveTraceEvents: false,
        } }, errors: [] };
      }
      return { data: { getTeamRunResumeConfig: {
        teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
      } }, errors: [] };
    });

    await expect(hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow('TEAM_STREAM_RECOVERY_CHECKPOINT_CHANGED');
    expect(checkpoints).toEqual([]);
  });

  it.each([
    { name: 'missing payload', projection: null, error: "projection payload missing for 'run-a'" },
    { name: 'identity mismatch', projection: {
      agentRunId: 'foreign-run', conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
    }, error: "projection 'foreign-run' does not match 'run-a'" },
  ])('aborts recovery on $name instead of inventing empty history', async ({ projection, error }) => {
    queryMock.mockImplementation(async ({ query, variables }: { query: any; variables: Record<string, unknown> }) => {
      const operation = query.definitions[0]?.name?.value;
      if (operation === 'GetTeamRunExecutionCheckpoint') {
        return { data: { getTeamRunExecutionCheckpoint: {
          rootTeamRunId: 'team-live-recovery', changeSequence: 9, hasOpenExecutionWork: false,
        } }, errors: [] };
      }
      if (variables.agentRunId) return { data: { getTeamMemberRunProjection: projection }, errors: [] };
      return { data: { getTeamRunResumeConfig: {
        teamRunId: 'team-live-recovery', isActive: true, executionTree: tree,
      } }, errors: [] };
    });

    await expect(hydrateTeamRunContextForStreamRecovery({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow(error);
  });
});

describe('Team open loads each member artifact list with its run state', () => {
  const twoMemberTree = () => buildTestTeamContext({
    teamRunId: 'team-artifacts',
    teamDefinitionId: 'team-def-1',
    teamDefinitionName: 'Artifact Team',
    coordinatorAddress: '/member-a',
    rootChildren: [
      testAgentNode('/member-a', { agentRunId: 'run-a', agentDefinitionId: 'agent-a', llmModelIdentifier: 'gpt-test' }),
      testAgentNode('/member-b', { agentRunId: 'run-b', agentDefinitionId: 'agent-b', llmModelIdentifier: 'gpt-test' }),
    ],
  }).view.getExecutionTree();
  const artifact = (runId: string, name: string) => ({
    id: `${runId}:/outputs/${name}`, runId, path: `/outputs/${name}`, type: 'image', status: 'available',
    sourceTool: 'generated_output', sourceInvocationId: null, content: null,
    createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z',
  });
  const serve = (input: { isActive: boolean; failingArtifactsFor?: string }) => {
    const tree = twoMemberTree();
    queryMock.mockImplementation(async ({ query, variables }: { query: unknown; variables: Record<string, unknown> }) => {
      if (query === GetRunFileChanges) {
        return variables.runId === input.failingArtifactsFor
          ? { data: null, errors: [{ message: `artifacts unavailable for ${String(variables.runId)}` }] }
          : { data: { getRunFileChanges: [artifact(String(variables.runId), '1.png'), artifact(String(variables.runId), '2.png')] }, errors: [] };
      }
      if (variables.agentRunId) {
        return { data: { getTeamMemberRunProjection: {
          agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
        } }, errors: [] };
      }
      return { data: { getTeamRunResumeConfig: { teamRunId: 'team-artifacts', isActive: input.isActive, executionTree: tree } }, errors: [] };
    });
  };
  const open = () => hydrateLiveTeamRunContext({
    teamRunId: 'team-artifacts',
    agentRunId: 'run-a',
    resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
    ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
  });
  const paths = (runId: string) => useRunFileChangesStore().getArtifactsForRun(runId).map((entry) => entry.path);

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    fetchTeamCommunicationMock.mockResolvedValue([]);
  });

  it.each([true, false])('commits every member artifact list when the Team opens (active=%s; AC-001, AC-002)', async (isActive) => {
    serve({ isActive });
    const candidate = await open();
    expect(paths('run-a')).toEqual([]);

    commitTeamRunHydration(candidate);
    markCommittedTeamRunHydrationAuthority(candidate);

    expect(paths('run-a')).toEqual(['/outputs/1.png', '/outputs/2.png']);
    expect(paths('run-b')).toEqual(['/outputs/1.png', '/outputs/2.png']);
    expect(isTeamMemberProjectionAuthoritative(candidate.hydratedContext, 'run-b')).toBe(true);
  });

  it('leaves a nonfocused member whose artifacts fail unhydrated, so it is loaded again on selection (AC-007)', async () => {
    serve({ isActive: true, failingArtifactsFor: 'run-b' });
    const candidate = await open();

    expect(candidate.projectionByAgentRunId.get('run-b')).toBeNull();
    expect(candidate.memberRunStates.map((state) => state.runId)).toEqual(['run-a']);
    commitTeamRunHydration(candidate);
    markCommittedTeamRunHydrationAuthority(candidate);
    expect(paths('run-a')).toEqual(['/outputs/1.png', '/outputs/2.png']);
    expect(paths('run-b')).toEqual([]);
    expect(isTeamMemberProjectionAuthoritative(candidate.hydratedContext, 'run-b')).toBe(false);
  });

  it('fails the open when the focused member artifacts fail, as for its projection (AC-007)', async () => {
    serve({ isActive: true, failingArtifactsFor: 'run-a' });
    await expect(open()).rejects.toThrow('artifacts unavailable for run-a');
  });

  it('writes no artifacts when Team activity changed before the commit', async () => {
    serve({ isActive: true });
    const candidate = await open();
    useAgentActivityStore().upsertSystemInstructionActivity('run-a', {
      kind: 'system_instruction', activityId: 'live', content: 'live', timestamp: new Date(),
    });

    expect(() => commitTeamRunHydration(candidate)).toThrow("Team activity for 'team-artifacts' changed before projection commit.");
    expect(paths('run-a')).toEqual([]);
    expect(paths('run-b')).toEqual([]);
  });
});
