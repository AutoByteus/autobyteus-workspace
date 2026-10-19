import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { GetAgentOrgMemberFileChanges, GetRunFileChanges, GetTeamMemberFileChanges } from '~/graphql/queries/runHistoryQueries';
import { GetAgentRunCollaborationMemberFileChanges } from '~/graphql/queries/collaboratorQueries';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useRunFileChangesStore, type RunFileChangeArtifact } from '~/stores/runFileChangesStore';
import { commitMemberRunStates, fetchMemberRunState } from '../memberRunStateHydration';
import { fetchRunFileChanges } from '../runFileChangeHydrationService';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }));

const RUN = 'member-run';
const artifact = (path: string, overrides: Partial<RunFileChangeArtifact> = {}): RunFileChangeArtifact => ({
  id: `${RUN}:${path}`, runId: RUN, path, type: 'image', status: 'available', sourceTool: 'generated_output',
  sourceInvocationId: null, createdAt: '2026-10-06T10:00:00.000Z', updatedAt: '2026-10-06T10:00:00.000Z', ...overrides,
});
const activity = (activityId: string) => ({ kind: 'system_instruction', activityId, content: activityId, ts: 1 }) as never;
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('fetchRunFileChanges', () => {
  beforeEach(() => vi.clearAllMocks());
  const read = (document: unknown, variables: Record<string, string>) => ({
    query: document, variables, fetchPolicy: 'network-only', context: { queryDeduplication: false },
  });

  it('reads a standalone run\'s artifacts by run id, network-only, and treats a missing payload as no artifacts', async () => {
    query.mockResolvedValueOnce({ data: { getRunFileChanges: [artifact('a.png')] } });
    await expect(fetchRunFileChanges({ kind: 'run', runId: RUN })).resolves.toEqual([artifact('a.png')]);
    expect(query).toHaveBeenCalledWith(read(GetRunFileChanges, { runId: RUN }));
    query.mockResolvedValueOnce({ data: {} });
    await expect(fetchRunFileChanges({ kind: 'run', runId: RUN })).resolves.toEqual([]);
  });

  it('reads each member kind through its owner\'s query', async () => {
    query.mockResolvedValueOnce({ data: { getTeamMemberFileChanges: [artifact('t.png')] } });
    await expect(fetchRunFileChanges({ kind: 'teamMember', teamRunId: 'team-1', memberAddress: '/lead', agentRunId: RUN }))
      .resolves.toEqual([artifact('t.png')]);
    expect(query).toHaveBeenLastCalledWith(read(GetTeamMemberFileChanges, { teamRunId: 'team-1', agentRunId: RUN }));

    query.mockResolvedValueOnce({ data: { getAgentOrgMemberFileChanges: [artifact('o.png')] } });
    await expect(fetchRunFileChanges({ kind: 'agentOrgMember', orgRunId: 'org-1', memberAddress: '/team/lead', agentRunId: RUN }))
      .resolves.toEqual([artifact('o.png')]);
    expect(query).toHaveBeenLastCalledWith(read(GetAgentOrgMemberFileChanges, { orgRunId: 'org-1', memberAddress: '/team/lead', agentRunId: RUN }));

    query.mockResolvedValueOnce({ data: { agentRunCollaborationMemberFileChanges: [artifact('c.png')] } });
    await expect(fetchRunFileChanges({ kind: 'standaloneMember', hostRunId: 'hub-1', memberAddress: '/reviewer', agentRunId: RUN }))
      .resolves.toEqual([artifact('c.png')]);
    expect(query).toHaveBeenLastCalledWith(read(GetAgentRunCollaborationMemberFileChanges, { hostRunId: 'hub-1', memberAddress: '/reviewer', agentRunId: RUN }));
    expect(query).not.toHaveBeenCalledWith(expect.objectContaining({ query: GetRunFileChanges }));
  });

  it('throws on GraphQL errors', async () => {
    query.mockResolvedValueOnce({ data: null, errors: [{ message: 'run unknown' }] });
    await expect(fetchRunFileChanges({ kind: 'run', runId: RUN })).rejects.toThrow('run unknown');
    query.mockResolvedValueOnce({ data: null, errors: [{ message: 'not in team' }] });
    await expect(fetchRunFileChanges({ kind: 'teamMember', teamRunId: 'team-1', memberAddress: '/lead', agentRunId: RUN }))
      .rejects.toThrow('not in team');
  });
});

describe('fetchMemberRunState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the projection and the artifacts in parallel, each through the caller\'s fetcher', async () => {
    const projection = deferred<{ id: string }>();
    const artifacts = deferred<RunFileChangeArtifact[]>();
    const fetchProjection = vi.fn(() => projection.promise);
    const fetchFileChanges = vi.fn(() => artifacts.promise);

    const state = fetchMemberRunState({ fetchProjection, fetchFileChanges });
    expect(fetchProjection).toHaveBeenCalledOnce();
    expect(fetchFileChanges).toHaveBeenCalledOnce();
    artifacts.resolve([artifact('a.png')]);
    projection.resolve({ id: 'projection' });

    await expect(state).resolves.toEqual({ projection: { id: 'projection' }, fileChanges: [artifact('a.png')] });
    expect(query).not.toHaveBeenCalled();
  });

  it('fails when the artifacts fail, exactly as when the projection fails (AC-007)', async () => {
    await expect(fetchMemberRunState({
      fetchProjection: async () => ({}),
      fetchFileChanges: () => Promise.reject(new Error('artifacts unavailable')),
    })).rejects.toThrow('artifacts unavailable');

    await expect(fetchMemberRunState({
      fetchProjection: () => Promise.reject(new Error('projection unavailable')),
      fetchFileChanges: async () => [],
    })).rejects.toThrow('projection unavailable');
  });
});

describe('commitMemberRunStates', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('applies the guarded activities, then merges each member artifact list', () => {
    const activities = useAgentActivityStore();
    const result = commitMemberRunStates([
      { runId: RUN, expectedActivityRevision: activities.getActivityContentRevision(RUN),
        activities: [activity('projected')], fileChanges: [artifact('a.png'), artifact('b.png')] },
      { runId: 'other-run', expectedActivityRevision: activities.getActivityContentRevision('other-run'),
        activities: [], fileChanges: [] },
    ]);

    expect(result).toBe('applied');
    expect(activities.getActivities(RUN)).toEqual([expect.objectContaining({ activityId: 'projected' })]);
    expect(useRunFileChangesStore().getArtifactsForRun(RUN).map((entry) => entry.path)).toEqual(['a.png', 'b.png']);
  });

  it('writes no artifacts when the activity revision changed (conflict)', () => {
    const activities = useAgentActivityStore();
    const staleRevision = activities.getActivityContentRevision(RUN);
    activities.upsertSystemInstructionActivity(RUN, {
      kind: 'system_instruction', activityId: 'live', content: 'live', timestamp: new Date(),
    });

    const result = commitMemberRunStates([{
      runId: RUN, expectedActivityRevision: staleRevision, activities: [activity('projected')], fileChanges: [artifact('a.png')],
    }]);

    expect(result).toBe('conflict');
    expect(useRunFileChangesStore().getArtifactsForRun(RUN)).toEqual([]);
    expect(activities.getActivities(RUN)).toEqual([expect.objectContaining({ activityId: 'live' })]);
  });

  it('keeps a live FILE_CHANGE that arrived during hydration and adds the rest without duplicates (AC-005)', () => {
    const files = useRunFileChangesStore();
    files.upsertFromLivePayload(artifact('a.png', { status: 'available', updatedAt: '2026-10-06T10:00:05.000Z' }));

    commitMemberRunStates([{
      runId: RUN, expectedActivityRevision: useAgentActivityStore().getActivityContentRevision(RUN), activities: [],
      fileChanges: [artifact('a.png', { status: 'streaming', updatedAt: '2026-10-06T10:00:01.000Z' }), artifact('b.png')],
    }]);

    const entries = files.getArtifactsForRun(RUN);
    expect(entries.map((entry) => entry.path).sort()).toEqual(['a.png', 'b.png']);
    expect(entries.find((entry) => entry.path === 'a.png')).toMatchObject({ status: 'available', updatedAt: '2026-10-06T10:00:05.000Z' });
  });
});
