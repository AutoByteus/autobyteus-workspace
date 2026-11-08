import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamStreamingService } from '../TeamStreamingService';
import { ConnectionState } from '../transport';
import { FakeSocketClient } from './fakeSocketClient';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import {
  hidePage, installPageVisibilityControl, removePageVisibilityControl, showPage,
} from '~/services/liveStreamLifecycle/__tests__/pageVisibilityTestControl';

const { runHistoryStoreMock, teamContextsStoreMock } = vi.hoisted(() => ({
  runHistoryStoreMock: {
    applyRunNavigationEffect: vi.fn(),
    refreshRunNavigationTopology: vi.fn(),
    reconcileFocusedTeamMemberProjection: vi.fn().mockResolvedValue(undefined),
  },
  teamContextsStoreMock: { getTeamContextById: vi.fn() },
}));
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => runHistoryStoreMock }));
vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => teamContextsStoreMock }));
vi.mock('~/services/collaborationMessages/participantMessagesQuery', async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub);

const rootTeamRunId = 'classroom-run';
const teacherRunId = 'teacher-run';

/**
 * autobyteus-434 (per-owner table, Team row): the Team stream's attempt reconnects its transport; its success
 * point is the accepted snapshot; it never gives up while visible; `reopen_required` and candidate streams
 * are not retried; a stream that looks open re-synchronizes after the page was hidden ≥ 30 s.
 */
describe('TeamStreamingService reconnect scheduling', () => {
  let wsClient: FakeSocketClient;
  let team: ReturnType<typeof buildTestTeamContext>;
  let service: TeamStreamingService;

  const snapshot = () => ({
    root_team_run_id: rootTeamRunId,
    base_change_sequence: team.view.getChangeSequence(), live_sequence_id: 'live-1', last_message_change_sequence: 0,
    closed_task_executions: [], execution_tree: team.view.getExecutionTree(),
    agent_input_states: [], remote_task_executions: [],
    agent_statuses: team.view.listAgentContextEntries().map((entry) => ({
      agent_run_id: entry.agentRunId, member_address: entry.memberAddress, status: 'idle', trigger: null,
      tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
    })),
  });
  const synchronize = () => {
    wsClient.open();
    wsClient.message('CONNECTED', { session_id: 'team-session', root_team_run_id: rootTeamRunId });
    wsClient.message('TEAM_EXECUTION_VIEW_SNAPSHOT', snapshot());
  };
  /** Advances to the next attempt and returns how long the wait was. */
  const nextAttempt = (): number => {
    const before = Date.now();
    const connects = wsClient.connects;
    vi.advanceTimersToNextTimer();
    expect(wsClient.connects).toBe(connects + 1);
    return Date.now() - before;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    installPageVisibilityControl();
    wsClient = new FakeSocketClient();
    team = buildTestTeamContext({
      teamRunId: rootTeamRunId,
      coordinatorAddress: '/Teacher',
      rootChildren: [testAgentNode('/Teacher', { agentRunId: teacherRunId, displayName: 'Teacher' })],
    });
    teamContextsStoreMock.getTeamContextById.mockReturnValue(team);
    service = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
  });
  afterEach(() => {
    service.disconnect();
    removePageVisibilityControl();
    vi.useRealTimers();
  });

  it('keeps reconnecting after a loss (1, 2, 4 … s, never more than 30 s) and catches up through the snapshot (REQ-001)', () => {
    service.connect(rootTeamRunId, team);
    synchronize();
    expect(service.isReady).toBe(true);
    wsClient.lose();
    expect(service.isReady).toBe(false);
    const waits: number[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      waits.push(nextAttempt());
      wsClient.lose();
    }
    expect(waits).toEqual([1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000]);
    nextAttempt();
    synchronize();
    expect(service.isReady).toBe(true);
    expect(service.synchronizationPhase).toBe('ready');
  });

  it('counts an open that fails before the snapshot as a failure; only the snapshot resets the wait', () => {
    service.connect(rootTeamRunId, team);
    synchronize();
    wsClient.lose();
    expect(nextAttempt()).toBe(1_000);
    wsClient.open();
    wsClient.message('CONNECTED', { session_id: 'team-session', root_team_run_id: rootTeamRunId });
    wsClient.lose(); // opened, but no snapshot
    expect(nextAttempt()).toBe(2_000);
    synchronize();
    wsClient.lose();
    expect(nextAttempt()).toBe(1_000);
  });

  it('the store connect during a wait connects at once and cancels the wait', () => {
    service.connect(rootTeamRunId, team);
    synchronize();
    wsClient.lose();
    service.connect(rootTeamRunId, team);
    expect(wsClient.connects).toBe(2);
    wsClient.state = ConnectionState.DISCONNECTED; // the attempt is still underway when the old wait would end
    vi.advanceTimersByTime(60_000);
    expect(wsClient.connects).toBe(2);
  });

  it('does not retry a non-retryable close (4004/4005)', () => {
    service.connect(rootTeamRunId, team);
    synchronize();
    wsClient.lose(false);
    vi.advanceTimersByTime(120_000);
    expect(wsClient.connects).toBe(1);
  });

  it('stops retrying in reopen_required', () => {
    service.connect(rootTeamRunId, team);
    synchronize();
    wsClient.message('AGENT_STATUS', {
      change_sequence: 2, agent_run_id: teacherRunId, status: 'running', trigger: null, tool_name: null,
      error_message: null, error_details: null, recoverableBlock: null,
    });
    expect(service.isReopenRequired).toBe(true);
    vi.advanceTimersByTime(120_000);
    hidePage();
    vi.advanceTimersByTime(60_000);
    showPage();
    expect(wsClient.connects).toBe(1);
  });

  it('a candidate stream is not retried before readiness: its loss fails the candidate', async () => {
    const candidate = new TeamStreamingService('ws://localhost:8000/ws/agent-team', { wsClient });
    const readiness = candidate.connectCandidate(rootTeamRunId, team, team.view.getChangeSequence());
    const failed = expect(readiness).rejects.toThrow();
    wsClient.lose();
    await failed;
    expect(candidate.isReopenRequired).toBe(true);
    vi.advanceTimersByTime(120_000);
    expect(wsClient.connects).toBe(1);
    candidate.disconnect();
  });

  it('holds while hidden; on becoming visible it attempts at once (AC-004)', () => {
    service.connect(rootTeamRunId, team);
    synchronize();
    hidePage();
    wsClient.lose();
    vi.advanceTimersByTime(10 * 60_000);
    expect(wsClient.connects).toBe(1);
    showPage();
    expect(wsClient.connects).toBe(2);
  });

  it('re-synchronizes a stream that looks open after ≥ 30 s hidden: quiet close, pending sends rejected, fresh snapshot (AC-003)', async () => {
    service.connect(rootTeamRunId, team);
    synchronize();
    const pendingSend = service.sendMessage('hello', teacherRunId);
    const rejected = expect(pendingSend).rejects.toThrow('Team stream is re-synchronizing.');
    hidePage();
    vi.advanceTimersByTime(29_000);
    showPage();
    expect(wsClient.connects).toBe(1);
    hidePage();
    vi.advanceTimersByTime(30_000);
    showPage();
    await rejected;
    expect(service.synchronizationPhase).toBe('disconnected');
    expect(wsClient.connects).toBe(2);
    synchronize();
    expect(service.isReady).toBe(true);
  });
});
