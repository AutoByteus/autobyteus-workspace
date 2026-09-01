import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';
import { ensureAuthoritativeTeamMemberProjection } from '../teamMemberProjectionHydrationService';

const { fetchProjection } = vi.hoisted(() => ({ fetchProjection: vi.fn() }));
vi.mock('../teamRunContextHydrationService', () => ({
  fetchExactTeamMemberProjection: fetchProjection,
}));

const ROOT = 'team-mounted';
const TASK_RUN = 'task-run';
const projection = () => ({
  agentRunId: TASK_RUN,
  conversation: [{ kind: 'assistant', role: 'assistant', content: 'projected answer', ts: 10 }],
  activities: [{ kind: 'system_instruction', activityId: 'projection-system', content: 'projected', ts: 11 }],
  lastActivityAt: '2026-08-31T10:00:00.000Z',
  hasEarlierActiveTraceEvents: true,
});

const mountTaskTeam = () => {
  const team = buildTestTeamContext({
    teamRunId: ROOT,
    coordinatorAddress: '/member-a',
    focusedAgentRunId: TASK_RUN,
    rootChildren: [testAgentNode('/member-a', { agentRunId: 'run-a' })],
    tasks: [testTaskRecord({
      taskId: 'task-1', delegatorAgentRunId: 'run-a', recipientAddress: '/member-a',
      target: { agentRunId: TASK_RUN }, description: 'Inspect retained task work',
    })],
  });
  const contexts = useAgentTeamContextsStore();
  contexts.teams = new Map([[ROOT, team]]);
  return contexts.getTeamContextById(ROOT)!;
};

const addSystemActivity = (runId: string, activityId: string) =>
  useAgentActivityStore().upsertSystemInstructionActivity(runId, {
    kind: 'system_instruction', activityId, content: activityId, timestamp: new Date(),
  });

const addToolActivity = (runId: string, invocationId: string) =>
  useAgentActivityStore().addToolActivity(runId, {
    kind: 'tool', activityId: invocationId, invocationId, toolName: 'read_file', type: 'tool_call',
    status: 'parsed', contextText: 'README.md', arguments: {}, logs: [], result: null, error: null,
    approvalTarget: null, timestamp: new Date(),
  });

describe('teamMemberProjectionHydrationService', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('single-flights and atomically applies an exact mounted task projection', async () => {
    const team = mountTaskTeam();
    const member = team.view.getAgentContext(TASK_RUN)!;
    const beforeRevision = member.state.eventMonitorPresentationRevision;
    let resolveProjection!: (value: ReturnType<typeof projection>) => void;
    fetchProjection.mockReturnValue(new Promise((resolve) => { resolveProjection = resolve; }));

    const first = ensureAuthoritativeTeamMemberProjection({ team, agentRunId: TASK_RUN });
    const second = ensureAuthoritativeTeamMemberProjection({ team, agentRunId: TASK_RUN });
    await vi.waitFor(() => expect(fetchProjection).toHaveBeenCalledTimes(1));
    resolveProjection(projection());

    await expect(Promise.all([first, second])).resolves.toEqual([
      { disposition: 'hydrated', agentRunId: TASK_RUN },
      { disposition: 'hydrated', agentRunId: TASK_RUN },
    ]);
    expect(member.state.conversation.messages).toHaveLength(1);
    expect(member.state.hasEarlierActiveTraceEvents).toBe(true);
    expect(member.state.eventMonitorPresentationRevision).toBe(beforeRevision + 1);
    expect(useAgentActivityStore().getActivities(TASK_RUN)).toEqual([
      expect.objectContaining({ activityId: 'projection-system', content: 'projected' }),
    ]);

    await expect(ensureAuthoritativeTeamMemberProjection({ team, agentRunId: TASK_RUN }))
      .resolves.toEqual({ disposition: 'authoritative', agentRunId: TASK_RUN });
    expect(fetchProjection).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['system instruction', (attempt: number) => addSystemActivity(TASK_RUN, `live-system-${attempt}`)],
    ['tool mutation', (attempt: number) => addToolActivity(TASK_RUN, `live-tool-${attempt}`)],
  ])('does not overwrite %s Activity that arrives during projection fetch', async (_name, mutate) => {
    const team = mountTaskTeam();
    const member = team.view.getAgentContext(TASK_RUN)!;
    const originalConversation = member.state.conversation;
    let attempt = 0;
    fetchProjection.mockImplementation(async () => {
      attempt += 1;
      mutate(attempt);
      return projection();
    });

    await expect(ensureAuthoritativeTeamMemberProjection({ team, agentRunId: TASK_RUN }))
      .rejects.toThrow(`Task activity for '${TASK_RUN}' changed while it was loading.`);

    expect(fetchProjection).toHaveBeenCalledTimes(3);
    expect(member.state.conversation).toBe(originalConversation);
    expect(useAgentActivityStore().getActivities(TASK_RUN).map((activity) => activity.activityId))
      .toEqual(Array.from({ length: 3 }, (_, index) => `${_name === 'system instruction' ? 'live-system' : 'live-tool'}-${index + 1}`));
  });

  it('rejects a mounted Team context replacement without changing the stale target', async () => {
    const team = mountTaskTeam();
    const member = team.view.getAgentContext(TASK_RUN)!;
    const originalConversation = member.state.conversation;
    fetchProjection.mockImplementation(async () => {
      const replacement = buildTestTeamContext({
        teamRunId: ROOT,
        coordinatorAddress: '/replacement',
        rootChildren: [testAgentNode('/replacement', { agentRunId: 'replacement-run', currentStatus: AgentStatus.Idle })],
      });
      useAgentTeamContextsStore().teams = new Map([[ROOT, replacement]]);
      return projection();
    });

    await expect(ensureAuthoritativeTeamMemberProjection({ team, agentRunId: TASK_RUN }))
      .rejects.toThrow(`Team context '${ROOT}' changed before task activity could be loaded.`);
    expect(member.state.conversation).toBe(originalConversation);
    expect(useAgentActivityStore().getActivities(TASK_RUN)).toEqual([]);
  });
});
