import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  applyLiveAgentStatusEvent,
  applyMemberOrHistoryStatusSnapshot,
} from '../agentRuntimeStatusState';

const buildContext = (status: AgentStatus = AgentStatus.Offline) => ({
  state: {
    currentStatus: status,
    conversation: { messages: [], updatedAt: '' },
  },
  submissionPending: false,
  requirement: '',
  contextFilePaths: [],
}) as any;

describe('agentRuntimeStatusState', () => {
  it('autobyteus-448: a live status carries the running background task count (a count-only change is a change); offline clears it', () => {
    const context = buildContext(AgentStatus.Idle);
    context.state.backgroundTasksRunning = 0;
    expect(applyLiveAgentStatusEvent(context, { status: 'idle', background_tasks_running: 1 })).toBe(true);
    expect(context.state.backgroundTasksRunning).toBe(1);
    expect(applyLiveAgentStatusEvent(context, { status: 'idle', background_tasks_running: 1 })).toBe(false);
    applyMemberOrHistoryStatusSnapshot(context, AgentStatus.Idle);
    expect(context.state.backgroundTasksRunning).toBe(1); // a history status carries no count
    applyMemberOrHistoryStatusSnapshot(context, AgentStatus.Offline);
    expect(context.state.backgroundTasksRunning).toBe(0);
  });

  it('accepts initializing as authoritative status and clears local submission pending', () => {
    const context = buildContext(AgentStatus.Running);
    context.submissionPending = true;

    applyLiveAgentStatusEvent(context, { status: 'initializing', background_tasks_running: 0 });

    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
    expect(context.submissionPending).toBe(false);
  });

  it('recovers error only when a canonical running status event arrives', () => {
    const context = buildContext(AgentStatus.Error);

    applyLiveAgentStatusEvent(context, { status: 'running', background_tasks_running: 0 });

    expect(context.state.currentStatus).toBe(AgentStatus.Running);
    expect(context.submissionPending).toBe(false);
  });

  it('keeps pending submission separate from canonical backend status', () => {
    const context = buildContext(AgentStatus.Offline);
    context.submissionPending = true;

    expect(context.state.currentStatus).toBe(AgentStatus.Offline);
    expect(context.submissionPending).toBe(true);

    applyLiveAgentStatusEvent(context, { status: 'initializing', background_tasks_running: 0 });
    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
    expect(context.submissionPending).toBe(false);
  });

  it('does not let a history snapshot replace an already-live status when preservation is requested', () => {
    const context = buildContext(AgentStatus.Running);

    applyMemberOrHistoryStatusSnapshot(context, 'idle', { preserveCurrentStatus: true });

    expect(context.state.currentStatus).toBe(AgentStatus.Running);
  });
});
