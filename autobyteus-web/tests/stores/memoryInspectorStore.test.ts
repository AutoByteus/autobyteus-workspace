import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import { getApolloClient } from '~/utils/apolloClient';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

describe('memoryInspectorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('inspect loads an agent run memory view without raw traces by default', async () => {
    const queryMock = vi.fn().mockResolvedValue({ data: { getAgentRunMemoryView: { runId: 'run-1', workingContext: [], episodic: [], semantic: [], rawTraces: null } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryInspectorStore();
    await store.inspect({ kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex' });

    expect(queryMock.mock.calls[0][0].variables.includeRawTraces).toBe(false);
    expect(store.memoryView?.runId).toBe('run-1');
  });

  it('opening Raw Traces triggers a refetch with raw traces enabled', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getAgentRunMemoryView: {
          runId: 'run-1',
          workingContext: [],
          episodic: [],
          semantic: [],
          rawTraceFiles: [{ fileName: 'raw_traces_active.jsonl', kind: 'active', recordCount: 2 }],
          selectedRawTraceFileName: 'raw_traces_active.jsonl',
          rawTraces: [],
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryInspectorStore();
    store.target = { kind: 'agent_run', runId: 'run-1' };
    await store.setActiveTab('raw');

    expect(store.includeRawTraces).toBe(true);
    expect(queryMock.mock.calls[0][0].variables.includeRawTraces).toBe(true);
    expect(queryMock.mock.calls[0][0].variables.includeRawTraceFiles).toBe(true);
    expect(store.selectedRawTraceFileName).toBe('raw_traces_active.jsonl');
  });

  it('selecting a raw trace file sends the backend-listed filename selector', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getAgentRunMemoryView: {
          runId: 'run-1',
          workingContext: [],
          episodic: [],
          semantic: [],
          rawTraceFiles: [
            { fileName: 'raw_traces_active.jsonl', kind: 'active', recordCount: 2 },
            { fileName: 'raw_traces_000001.jsonl', kind: 'segment', recordCount: 1, segmentIndex: 1 },
          ],
          selectedRawTraceFileName: 'raw_traces_000001.jsonl',
          rawTraces: [],
        },
      },
    });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryInspectorStore();
    store.target = { kind: 'agent_run', runId: 'run-1' };
    store.includeRawTraces = true;
    await store.setRawTraceFileName('raw_traces_000001.jsonl');

    expect(queryMock.mock.calls[0][0].variables.rawTraceFileName).toBe('raw_traces_000001.jsonl');
    expect(store.selectedRawTraceFileName).toBe('raw_traces_000001.jsonl');
  });

  it('loads a team member memory view with compound identity', async () => {
    const queryMock = vi.fn().mockResolvedValue({ data: { getTeamMemberRunMemoryView: { runId: 'member-1', workingContext: [], episodic: [], semantic: [], rawTraces: null } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryInspectorStore();
    await store.inspect({ kind: 'team_member_run', teamRunId: 'team-1', agentRunId: 'member-1', memberAddress: '/lead', teamDefinitionName: 'Team', memberName: 'Lead' });

    expect(queryMock.mock.calls[0][0].variables).toMatchObject({ teamRunId: 'team-1', agentRunId: 'member-1' });
    expect(store.memoryView?.runId).toBe('member-1');
  });
});
