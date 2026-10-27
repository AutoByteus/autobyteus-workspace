import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getApolloClient } from '~/utils/apolloClient';
import { MEMORY_INDEX_POLL_MS, toIndexStatus, toSearchResult, useMemorySearchStore } from '~/stores/memorySearchStore';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

const step = (name: string, state: string, done: number, total: number, unit = 'RUNS', failureMessage: string | null = null) => ({ step: name, state, done, total, unit, failureMessage });
const status = (overrides: Record<string, unknown> = {}) => ({
  state: 'READY',
  steps: [step('FIND_RUNS', 'DONE', 3, 3), step('JOURNALS', 'DONE', 3, 3), step('TEXT_INDEX', 'DONE', 5, 5, 'JOURNAL_FILES'), step('MEANING_INDEX', 'DONE', 5, 5, 'JOURNAL_FILES')],
  runCount: 3, journalFileCount: 5, updatedAt: '2026-10-26T09:00:00.000Z', textIndexHasContent: true,
  activeModelId: 'granite', meaningIndexModelId: 'granite', meaningNote: null,
  ...overrides,
});
const serverResult = (overrides: Record<string, unknown> = {}) => ({
  agent: 'Codex', team: null, member: null, org: null, runId: 'codex_45ce', workspace: '/w/home', firstDay: '2026-08-25', latestDay: '2026-08-27',
  subject: { kind: 'AGENT', runId: 'codex_45ce', agentDefinitionId: 'codex', teamRunId: null, orgRunId: null, agentRunId: null, runKey: null },
  matches: [{ journalFileName: 'work_journal_active.md', lineStart: 812, lineEnd: 814, day: '2026-08-27', snippet: 'User: set up DDNS\n  for home.example.org', matchedBy: 'TEXT', matchedWords: ['ddns', 'home.example.org'] }],
  ...overrides,
});

const client = (responses: { status?: () => unknown; search?: () => unknown; mutate?: () => unknown }) => {
  const query = vi.fn(({ query: document }: { query: { definitions: Array<{ name?: { value: string } }> } }) => {
    const name = document.definitions[0]?.name?.value;
    if (name === 'MemoryIndexStatus') return Promise.resolve({ data: { memoryIndexStatus: responses.status?.() ?? status() } });
    if (name === 'MemorySearch') return Promise.resolve({ data: { memorySearch: responses.search?.() ?? { results: [], coverage: null, note: null } } });
    return Promise.reject(new Error(`unexpected ${name}`));
  });
  const mutate = vi.fn(() => Promise.resolve({ data: responses.mutate?.() ?? {} }));
  vi.mocked(getApolloClient).mockReturnValue({ query, mutate } as never);
  return { query, mutate };
};

describe('memorySearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });
  afterEach(() => {
    useMemorySearchStore().stopPolling();
    vi.useRealTimers();
    vi.mocked(getApolloClient).mockReset();
  });

  it('maps the server status; the Meaning index still embedding after a build reads as its running last step', () => {
    expect(toIndexStatus(status({ state: 'NOT_INDEXED', textIndexHasContent: false })).phase).toBe('needs_index');
    expect(toIndexStatus(status({ state: 'FAILED' })).phase).toBe('failed');
    const ready = toIndexStatus(status());
    expect(ready).toMatchObject({ phase: 'ready', builtWithModel: 'granite', activeModel: 'granite', runCount: 3, textIndexHasContent: true });
    expect(ready.steps.map((s) => [s.id, s.state, s.done, s.total])).toEqual([['runs', 'done', 3, 3], ['journals', 'done', 3, 3], ['text', 'done', 5, 5], ['meaning', 'done', 5, 5]]);
    const embedding = toIndexStatus(status({ steps: [step('FIND_RUNS', 'DONE', 3, 3), step('JOURNALS', 'DONE', 3, 3), step('TEXT_INDEX', 'DONE', 5, 5), step('MEANING_INDEX', 'DONE', 2, 5)] }));
    expect(embedding.phase).toBe('building');
    expect(embedding.steps[3]).toMatchObject({ id: 'meaning', state: 'running', done: 2, total: 5 });
    const failed = toIndexStatus(status({ state: 'FAILED', steps: [step('FIND_RUNS', 'FAILED', 0, 0, 'RUNS', 'disk full')] }));
    expect(failed.steps[0]).toMatchObject({ state: 'failed', message: 'disk full' });
  });

  it('maps results to the page: subject, team heading, lines, snippet lines, kind and found words', () => {
    expect(toSearchResult(serverResult())).toEqual({
      runId: 'codex_45ce', agentName: 'Codex', team: null, member: null, workspace: '/w/home', firstDay: '2026-08-25', latestDay: '2026-08-27',
      subject: { kind: 'AGENT', runId: 'codex_45ce', agentDefinitionId: 'codex' },
      matches: [{ file: 'work_journal_active.md', fromLine: 812, toLine: 814, day: '2026-08-27', snippet: ['User: set up DDNS', '  for home.example.org'], kind: 'text', matchedWords: ['ddns', 'home.example.org'] }],
    });
    const member = toSearchResult(serverResult({ team: 'Software Team', member: 'lead', subject: { kind: 'TEAM_MEMBER', teamRunId: 'team_1', agentRunId: 'lead_1' } }));
    expect(member.team).toEqual({ name: 'Software Team', kind: 'team' });
    expect(member.subject).toEqual({ kind: 'TEAM_MEMBER', teamRunId: 'team_1', agentRunId: 'lead_1' });
    const orgMember = toSearchResult(serverResult({ org: 'Alpha Org', team: 'research', subject: { kind: 'ORG_MEMBER', orgRunId: 'org_1', agentRunId: 'r_1' } }));
    expect(orgMember.team).toEqual({ name: 'Alpha Org / research', kind: 'org' });
    expect(toSearchResult(serverResult({ subject: { kind: 'RUN_FOLDER', runKey: 'agent_teams/old/m' } })).subject).toEqual({ kind: 'RUN_FOLDER', runKey: 'agent_teams/old/m' });
    const meaning = toSearchResult(serverResult({ matches: [{ journalFileName: 'a.md', lineStart: 1, lineEnd: 2, day: null, snippet: 'x', matchedBy: 'MEANING', matchedWords: [] }] }));
    expect(meaning.matches[0]).toMatchObject({ kind: 'meaning', matchedWords: [], day: null });
  });

  it('searches with the server default limit and records coverage and the words found in no journal', async () => {
    const { query } = client({ status: () => status({ state: 'BUILDING', steps: [step('FIND_RUNS', 'DONE', 3, 3), step('JOURNALS', 'DONE', 3, 3), step('TEXT_INDEX', 'RUNNING', 1, 4), step('MEANING_INDEX', 'WAITING', 0, 0)] }),
      search: () => ({ results: [serverResult({ matches: [{ journalFileName: 'a.md', lineStart: 1, lineEnd: 2, day: null, snippet: 'x', matchedBy: 'MEANING', matchedWords: [] }] })], wordsNotFound: ['purple', 'elephant'], note: 'None of these words appear in your memory: purple, elephant.' }) });
    const store = useMemorySearchStore();
    await store.runSearch('  purple elephant ');
    expect(store.query).toBe('purple elephant');
    expect(store.status).toBe('ready');
    expect(store.outcome).toMatchObject({ cue: 'purple elephant', wordsNotFound: ['purple', 'elephant'] });
    expect(store.coverage).toEqual({ textPct: 25, meaningPct: 0 });
    // The words come from the server, which names none while the Text index is incomplete (SR-006).
    client({ search: () => ({ results: [serverResult({ matches: [{ journalFileName: 'a.md', lineStart: 1, lineEnd: 2, day: null, snippet: 'x', matchedBy: 'MEANING', matchedWords: [] }] })], wordsNotFound: [], note: null, coverage: 'Text index covers 1 of 4 journal files.' }) });
    await store.runSearch('purple elephant');
    expect(store.outcome?.wordsNotFound).toEqual([]);
    const searchCall = query.mock.calls.find(([options]) => (options as { variables?: unknown }).variables);
    expect((searchCall![0] as { variables: unknown }).variables).toEqual({ query: 'purple elephant' });
  });

  it('turns a failed search into the error state, and Clear search back to idle', async () => {
    client({ search: () => { throw new Error('boom'); } });
    const store = useMemorySearchStore();
    await store.runSearch('ddns');
    expect(store.status).toBe('error');
    store.clearSearch();
    expect(store).toMatchObject({ status: 'idle', query: '', outcome: null });
  });

  it('reads the status about every 2 s while building, and stops when the build is done or the page is left', async () => {
    let building = true;
    const { query } = client({ status: () => (building ? status({ state: 'BUILDING' }) : status()) });
    const store = useMemorySearchStore();
    await store.loadIndexStatus();
    expect(store.isBuilding).toBe(true);
    expect(query).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(MEMORY_INDEX_POLL_MS);
    expect(query).toHaveBeenCalledTimes(2);
    building = false;
    await vi.advanceTimersByTimeAsync(MEMORY_INDEX_POLL_MS);
    expect(query).toHaveBeenCalledTimes(3);
    expect(store.index?.phase).toBe('ready');
    await vi.advanceTimersByTimeAsync(MEMORY_INDEX_POLL_MS * 3);
    expect(query).toHaveBeenCalledTimes(3);

    building = true;
    await store.loadIndexStatus();
    store.stopPolling();
    await vi.advanceTimersByTimeAsync(MEMORY_INDEX_POLL_MS * 3);
    expect(query).toHaveBeenCalledTimes(4);
  });

  it('starts indexing and rebuilds only by the user action, then reads the status; ignored while building', async () => {
    const { mutate } = client({ status: () => status({ state: 'BUILDING' }) });
    const store = useMemorySearchStore();
    await store.startIndex();
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(store.isBuilding).toBe(true);
    await store.rebuild();
    await store.startIndex();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('is model-changed when the Meaning index was built with another model', () => {
    const store = useMemorySearchStore();
    store.index = toIndexStatus(status({ state: 'MODEL_CHANGED', meaningIndexModelId: 'leaf-ir', activeModelId: 'granite' }));
    expect(store.modelChanged).toBe(true);
    expect(store.searchReady).toBe(true);
  });
});
