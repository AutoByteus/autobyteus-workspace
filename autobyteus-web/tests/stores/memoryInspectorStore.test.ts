import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useMemoryInspectorStore } from '~/stores/memoryInspectorStore';
import { getApolloClient } from '~/utils/apolloClient';
import { GET_AGENT_ORG_MEMBER_RUN_MEMORY_VIEW } from '~/graphql/queries/memoryViewQueries';

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn() }));

describe('memoryInspectorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('inspect opens on the Work Journal and reads no memory view until Raw Traces are shown', async () => {
    const queryMock = vi.fn().mockResolvedValue({ data: { getAgentRunMemoryView: { runId: 'run-1', rawTraces: [] } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryInspectorStore();
    await store.inspect({ kind: 'agent_run', runId: 'run-1', agentDisplayName: 'Codex' });

    expect(store.activeTab).toBe('journal');
    expect(queryMock).not.toHaveBeenCalled();
    await store.setActiveTab('raw');
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0].variables).toMatchObject({ runId: 'run-1', includeRawTraces: true });
    expect(store.memoryView?.runId).toBe('run-1');
  });

  it('opening Raw Traces triggers a refetch with raw traces enabled', async () => {
    const queryMock = vi.fn().mockResolvedValue({
      data: {
        getAgentRunMemoryView: {
          runId: 'run-1',
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
    const queryMock = vi.fn().mockResolvedValue({ data: { getTeamMemberRunMemoryView: { runId: 'member-1', rawTraces: null } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryInspectorStore();
    await store.inspect({ kind: 'team_member_run', teamRunId: 'team-1', agentRunId: 'member-1', memberAddress: '/lead', teamDefinitionName: 'Team', memberName: 'Lead' });
    await store.setActiveTab('raw');

    expect(queryMock.mock.calls[0][0].variables).toMatchObject({ teamRunId: 'team-1', agentRunId: 'member-1' });
    expect(store.memoryView?.runId).toBe('member-1');
  });

  it('loads an org member memory view with the org view query and compound identity', async () => {
    const queryMock = vi.fn().mockResolvedValue({ data: { getAgentOrgMemberRunMemoryView: { runId: 'designer-run', rawTraces: null } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);

    const store = useMemoryInspectorStore();
    await store.inspect({ kind: 'org_member_run', orgRunId: 'org-run-1', agentRunId: 'designer-run', orgDefinitionName: 'Alpha Org', memberName: 'engineering/solution_designer' });
    await store.setActiveTab('raw');

    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0].query).toBe(GET_AGENT_ORG_MEMBER_RUN_MEMORY_VIEW);
    expect(queryMock.mock.calls[0][0].variables).toMatchObject({ orgRunId: 'org-run-1', agentRunId: 'designer-run', source: { type: 'LOCAL' } });
    expect(queryMock.mock.calls[0][0].variables).not.toHaveProperty('teamRunId');
    expect(store.memoryView?.runId).toBe('designer-run');
  });

  it('keeps the loaded view when re-inspecting the same org member and resets it for another member', async () => {
    const queryMock = vi.fn().mockResolvedValue({ data: { getAgentOrgMemberRunMemoryView: { runId: 'designer-run' } } });
    vi.mocked(getApolloClient).mockReturnValue({ query: queryMock } as any);
    const store = useMemoryInspectorStore();
    await store.inspect({ kind: 'org_member_run', orgRunId: 'org-run-1', agentRunId: 'designer-run' });
    await store.setActiveTab('raw');

    // The same member again (a route refresh): the tab stays and the view is read again with raw traces.
    await store.inspect({ kind: 'org_member_run', orgRunId: 'org-run-1', agentRunId: 'designer-run' });
    expect(store.activeTab).toBe('raw');
    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(store.memoryView?.runId).toBe('designer-run');

    // Another member: back to its Work Journal, no view read.
    void store.inspect({ kind: 'org_member_run', orgRunId: 'org-run-1', agentRunId: 'ceo-run' });
    expect(store.activeTab).toBe('journal');
    expect(store.memoryView).toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(2);
  });
});
