import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  applyLiveAgentStatusEvent,
  applyLiveRuntimeActivityProjectionRepair,
} from '../agentRuntimeStatusState';

const buildContext = (status: AgentStatus = AgentStatus.Offline) => ({
  state: {
    currentStatus: status,
    canInterrupt: true,
    conversation: { messages: [], updatedAt: '' },
  },
  isSending: false,
  requirement: '',
  contextFilePaths: [],
}) as any;

describe('agentRuntimeStatusState', () => {
  it('accepts initializing status events without granting interrupt permission or clearing sending', () => {
    const context = buildContext(AgentStatus.Running);
    context.isSending = true;

    applyLiveAgentStatusEvent(context, { status: 'initializing', can_interrupt: true });

    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
    expect(context.state.canInterrupt).toBe(false);
    expect(context.isSending).toBe(true);
  });

  it('clears stale error on same-run live non-error activity', () => {
    const context = buildContext(AgentStatus.Error);

    applyLiveRuntimeActivityProjectionRepair(context);

    expect(context.state.currentStatus).toBe(AgentStatus.Running);
    expect(context.state.canInterrupt).toBe(false);
    expect(context.isSending).toBe(true);
  });

  it('does not use live activity projection repair as a general lifecycle source', () => {
    const context = buildContext(AgentStatus.Idle);

    applyLiveRuntimeActivityProjectionRepair(context);

    expect(context.state.currentStatus).toBe(AgentStatus.Idle);
    expect(context.state.canInterrupt).toBe(true);
    expect(context.isSending).toBe(false);
  });

  it('keeps pending submission separate from canonical backend status', () => {
    const context = buildContext(AgentStatus.Offline);
    context.isSending = true;

    expect(context.state.currentStatus).toBe(AgentStatus.Offline);
    expect(context.isSending).toBe(true);

    applyLiveAgentStatusEvent(context, { status: 'initializing', can_interrupt: false });
    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
  });
});
