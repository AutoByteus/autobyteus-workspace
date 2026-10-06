import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { GetRunFileChanges } from '~/graphql/queries/runHistoryQueries';
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

  it('reads the run artifacts network-only and treats a missing payload as no artifacts', async () => {
    query.mockResolvedValueOnce({ data: { getRunFileChanges: [artifact('a.png')] } });
    await expect(fetchRunFileChanges(RUN)).resolves.toEqual([artifact('a.png')]);
    expect(query).toHaveBeenCalledWith({ query: GetRunFileChanges, variables: { runId: RUN }, fetchPolicy: 'network-only' });
    query.mockResolvedValueOnce({ data: {} });
    await expect(fetchRunFileChanges(RUN)).resolves.toEqual([]);
  });

  it('throws on GraphQL errors', async () => {
    query.mockResolvedValueOnce({ data: null, errors: [{ message: 'run unknown' }] });
    await expect(fetchRunFileChanges(RUN)).rejects.toThrow('run unknown');
  });
});

describe('fetchMemberRunState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches the projection and the artifacts in parallel', async () => {
    const projection = deferred<{ id: string }>();
    const artifacts = deferred<{ data: { getRunFileChanges: RunFileChangeArtifact[] } }>();
    const fetchProjection = vi.fn(() => projection.promise);
    query.mockReturnValueOnce(artifacts.promise);

    const state = fetchMemberRunState({ runId: RUN, fetchProjection });
    expect(fetchProjection).toHaveBeenCalledOnce();
    expect(query).toHaveBeenCalledOnce();
    artifacts.resolve({ data: { getRunFileChanges: [artifact('a.png')] } });
    projection.resolve({ id: 'projection' });

    await expect(state).resolves.toEqual({ projection: { id: 'projection' }, fileChanges: [artifact('a.png')] });
  });

  it('fails when the artifacts fail, exactly as when the projection fails (AC-007)', async () => {
    query.mockResolvedValueOnce({ errors: [{ message: 'artifacts unavailable' }] });
    await expect(fetchMemberRunState({ runId: RUN, fetchProjection: async () => ({}) }))
      .rejects.toThrow('artifacts unavailable');

    query.mockResolvedValueOnce({ data: { getRunFileChanges: [] } });
    await expect(fetchMemberRunState({ runId: RUN, fetchProjection: () => Promise.reject(new Error('projection unavailable')) }))
      .rejects.toThrow('projection unavailable');
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
