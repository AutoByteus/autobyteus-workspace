import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  hydrateLiveTeamRunContext,
  hydrateTeamRunContextForStreamRecovery,
} from '../teamRunContextHydrationService';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { GetRunFileChanges, GetTeamMemberFileChanges } from '~/graphql/queries/runHistoryQueries';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import { commitTeamRunHydration, markCommittedTeamRunHydrationAuthority } from '../teamRunHydrationCommit';
import { isTeamMemberProjectionAuthoritative } from '../teamMemberProjectionHydrationService';
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: queryMock }) }));
vi.mock('~/services/collaborationMessages/participantMessagesQuery', async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub);
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
  });

  it('stages one exact AgentRun projection without mutating the Activity store', async () => {
    const projection = {
      agentRunId: 'run-a', conversation: [], activities: [projectedActivity], hasEarlierActiveTraceEvents: false,
    };
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => (
      variables.agentRunId
        ? { data: { getTeamMemberRunProjection: projection }, errors: [] }
        : { data: { getTeamRunResumeConfig: { teamRunId: 'team-live-recovery', isActive: true, liveSequenceId: 'live-1', baseChangeSequence: 0, lastMessageChangeSequence: 0, executionTree: tree,
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

  // A run the Team delegated is its own run, never in the Team's view (autobyteus-461 rule 2).

  it('fails fast when the exact requested AgentRun projection is missing', async () => {
    queryMock.mockImplementation(async ({ variables }: { variables: Record<string, unknown> }) => (
      variables.agentRunId
        ? { data: { getTeamMemberRunProjection: null }, errors: [] }
        : { data: { getTeamRunResumeConfig: { teamRunId: 'team-live-recovery', isActive: true, liveSequenceId: 'live-1', baseChangeSequence: 0, lastMessageChangeSequence: 0, executionTree: tree,
          } }, errors: [] }
    ));

    await expect(hydrateLiveTeamRunContext({
      teamRunId: 'team-live-recovery',
      agentRunId: 'run-a',
      resolveWorkspaceMetadataByRootPath: vi.fn().mockResolvedValue(null),
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue(null),
    })).rejects.toThrow("Team member projection payload missing for 'run-a'.");
  });

  it('stages the requested member exactly and requests no other member (autobyteus-358, QR-005)', async () => {
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
        return { data: { getTeamRunResumeConfig: { teamRunId: 'team-live-recovery', isActive: true, liveSequenceId: 'live-1', baseChangeSequence: 0, lastMessageChangeSequence: 0, executionTree: twoMemberTree,
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
    expect(result.projectionByAgentRunId.has('run-b')).toBe(false);
    expect(result.memberRunStates.map((replacement) => replacement.runId)).toEqual(['run-a']);
    expect(queryMock.mock.calls.map(([options]) => options.variables.agentRunId).filter(Boolean)).toEqual(['run-a', 'run-a']);
  });

  it('rejects a requested root that disagrees with the execution tree', async () => {
    queryMock.mockResolvedValue({ data: { getTeamRunResumeConfig: { teamRunId: 'foreign-root', isActive: false, liveSequenceId: null, baseChangeSequence: 0, lastMessageChangeSequence: null, executionTree: tree,
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
      return { data: { getTeamRunResumeConfig: { teamRunId: 'team-live-recovery', isActive: true, liveSequenceId: 'live-1', baseChangeSequence: 0, lastMessageChangeSequence: 0, executionTree: tree,
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
      return { data: { getTeamRunResumeConfig: { teamRunId: 'team-live-recovery', isActive: true, liveSequenceId: 'live-1', baseChangeSequence: 0, lastMessageChangeSequence: 0, executionTree: tree,
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
      return { data: { getTeamRunResumeConfig: { teamRunId: 'team-live-recovery', isActive: true, liveSequenceId: 'live-1', baseChangeSequence: 0, lastMessageChangeSequence: 0, executionTree: tree,
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

describe('Team open loads the focused member artifact list with its run state (autobyteus-358)', () => {
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
      if (query === GetRunFileChanges) throw new Error('team member artifacts are read through the team, not by run id');
      if (query === GetTeamMemberFileChanges) {
        expect(variables.teamRunId).toBe('team-artifacts');
        return variables.agentRunId === input.failingArtifactsFor
          ? { data: null, errors: [{ message: `artifacts unavailable for ${String(variables.agentRunId)}` }] }
          : { data: { getTeamMemberFileChanges: [artifact(String(variables.agentRunId), '1.png'), artifact(String(variables.agentRunId), '2.png')] }, errors: [] };
      }
      if (variables.agentRunId) {
        return { data: { getTeamMemberRunProjection: {
          agentRunId: variables.agentRunId, conversation: [], activities: [], hasEarlierActiveTraceEvents: false,
        } }, errors: [] };
      }
      return { data: { getTeamRunResumeConfig: { teamRunId: 'team-artifacts', isActive: input.isActive, executionTree: tree,
        liveSequenceId: input.isActive ? 'live-team-1' : null, baseChangeSequence: input.isActive ? 3 : 0, lastMessageChangeSequence: input.isActive ? 0 : null } }, errors: [] };
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
  });

  it.each([true, false])('commits the focused member artifact list when the Team opens; the others load on selection (active=%s; AC-003)', async (isActive) => {
    serve({ isActive });
    const candidate = await open();
    expect(paths('run-a')).toEqual([]);

    commitTeamRunHydration(candidate);
    markCommittedTeamRunHydrationAuthority(candidate);

    expect(paths('run-a')).toEqual(['/outputs/1.png', '/outputs/2.png']);
    expect(paths('run-b')).toEqual([]);
    expect(isTeamMemberProjectionAuthoritative(candidate.hydratedContext, 'run-a')).toBe(true);
    expect(isTeamMemberProjectionAuthoritative(candidate.hydratedContext, 'run-b')).toBe(false);
    expect(queryMock.mock.calls.filter(([options]) => options.query === GetTeamMemberFileChanges).map(([options]) => options.variables))
      .toEqual([{ teamRunId: 'team-artifacts', agentRunId: 'run-a' }]);
  });

  it('a running Team commits at its live sequence, so the stream snapshot that follows keeps a list loaded in between (SR-006)', async () => {
    serve({ isActive: true });
    const candidate = await open();
    expect(candidate.rebuild).toEqual({ liveSequenceId: 'live-team-1', baseChangeSequence: 3, lastMessageChangeSequence: 0 });
    const owner = useCollaborationParticipantMessagesStore();
    const key = { rootKind: 'agent_team', rootRunId: 'team-artifacts', agentRunId: 'run-a' } as const;
    commitTeamRunHydration(candidate);
    markCommittedTeamRunHydrationAuthority(candidate);
    owner.load(key);
    await new Promise((resolve) => setTimeout(resolve, 0));

    // The stream's snapshot at the same sequence: the list is kept (one fetch per running-Team open).
    owner.reloadRoot('agent_team', 'team-artifacts', { liveSequenceId: 'live-team-1', baseChangeSequence: 3, lastMessageChangeSequence: 0 }, () => true);
    expect(owner.statusOf(key).state).toBe('loaded');
  });

  it('a stopped Team names no live sequence: its commit reloads the lists (SR-006)', async () => {
    serve({ isActive: false });
    const candidate = await open();
    expect(candidate.rebuild).toEqual({ liveSequenceId: null, baseChangeSequence: 0, lastMessageChangeSequence: null });
    const owner = useCollaborationParticipantMessagesStore();
    const key = { rootKind: 'agent_team', rootRunId: 'team-artifacts', agentRunId: 'run-a' } as const;
    owner.load(key);
    await new Promise((resolve) => setTimeout(resolve, 0));

    markCommittedTeamRunHydrationAuthority(candidate);
    expect(owner.statusOf(key).state).toBe('loading');
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
