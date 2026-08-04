import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  applyActiveRuntimePlaceholder,
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
  it('accepts initializing as authoritative status and clears local submission pending', () => {
    const context = buildContext(AgentStatus.Running);
    context.submissionPending = true;

    applyLiveAgentStatusEvent(context, { status: 'initializing' });

    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
    expect(context.submissionPending).toBe(false);
  });

  it('recovers error only when a canonical running status event arrives', () => {
    const context = buildContext(AgentStatus.Error);

    applyLiveAgentStatusEvent(context, { status: 'running' });

    expect(context.state.currentStatus).toBe(AgentStatus.Running);
    expect(context.submissionPending).toBe(false);
  });

  it('keeps pending submission separate from canonical backend status', () => {
    const context = buildContext(AgentStatus.Offline);
    context.submissionPending = true;

    expect(context.state.currentStatus).toBe(AgentStatus.Offline);
    expect(context.submissionPending).toBe(true);

    applyLiveAgentStatusEvent(context, { status: 'initializing' });
    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
    expect(context.submissionPending).toBe(false);
  });

  it('uses initializing rather than a false running placeholder during active bind', () => {
    const context = buildContext(AgentStatus.Offline);

    applyActiveRuntimePlaceholder(context);

    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
  });

  it('does not let a history snapshot replace an already-live status when preservation is requested', () => {
    const context = buildContext(AgentStatus.Running);

    applyMemberOrHistoryStatusSnapshot(context, 'idle', { preserveCurrentStatus: true });

    expect(context.state.currentStatus).toBe(AgentStatus.Running);
  });
});
