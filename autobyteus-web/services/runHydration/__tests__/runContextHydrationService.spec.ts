import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRunContextHydrationCandidate } from '../runContextHydrationService';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  getRevision: vi.fn(),
  fetchDefinitions: vi.fn(),
  definitionStore: {
    agentDefinitions: [{ id: 'agent-def', name: 'Exact Agent', avatarUrl: null }],
    fetchAllAgentDefinitions: vi.fn(),
    getAgentDefinitionById: vi.fn(() => ({ id: 'agent-def', name: 'Exact Agent', avatarUrl: null })),
  },
}));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }));
vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({ getActivityContentRevision: mocks.getRevision }),
}));
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => mocks.definitionStore }));

const resumeConfig = {
  runId: 'run-1', isActive: false,
  metadataConfig: {
    agentDefinitionId: 'agent-def', llmModelIdentifier: 'model', runtimeKind: 'autobyteus',
    workspaceRootPath: '/workspace', autoExecuteTools: false, skillAccessMode: 'NONE', llmConfig: null,
  },
};

describe('runContextHydrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRevision.mockReturnValue(7);
    mocks.query.mockImplementation(async ({ query }: { query: any }) => {
      const operation = query.definitions[0]?.name?.value;
      if (operation === 'GetRunProjection') return { data: { getRunProjection: {
        runId: 'run-1', conversation: [],
        activities: [{ kind: 'system_instruction', activityId: 'system-1', content: 'exact', ts: 10 }],
        lastActivityAt: null, hasEarlierActiveTraceEvents: false,
      } }, errors: [] };
      if (operation === 'GetAgentRunResumeConfig') {
        return { data: { getAgentRunResumeConfig: resumeConfig }, errors: [] };
      }
      return { data: { getRunFileChanges: [] }, errors: [] };
    });
  });

  it('captures the Activity witness before I/O and returns a side-effect-free built candidate', async () => {
    const resolveWorkspace = vi.fn().mockResolvedValue({
      workspaceId: 'workspace-1', workspaceRootPath: '/workspace', displayName: 'workspace', kind: 'filesystem',
    });

    const candidate = await loadRunContextHydrationCandidate({
      runId: 'run-1', fallbackAgentName: null, resolveWorkspaceMetadataByRootPath: resolveWorkspace,
    });

    expect(mocks.getRevision).toHaveBeenCalledWith('run-1');
    expect(mocks.getRevision.mock.invocationCallOrder[0]).toBeLessThan(mocks.query.mock.invocationCallOrder[0]!);
    expect(candidate.expectedActivityRevision).toBe(7);
    expect(candidate.activities).toEqual([
      expect.objectContaining({ kind: 'system_instruction', activityId: 'system-1', content: 'exact' }),
    ]);
    expect(candidate.config).toMatchObject({ agentDefinitionId: 'agent-def', agentDefinitionName: 'Exact Agent' });
  });
});
