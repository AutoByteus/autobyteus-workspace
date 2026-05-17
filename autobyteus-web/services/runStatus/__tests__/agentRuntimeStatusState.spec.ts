import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  applyAcceptedStartupStatus,
  applyAcceptedTeamMemberStartupStatus,
  applyLiveAgentStatusEvent,
  applyLiveRuntimeActivityProjectionRepair,
  applyLiveTeamMemberRuntimeActivityProjectionRepair,
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
  it('marks accepted startup as active but not interruptible', () => {
    const context = buildContext(AgentStatus.Offline);

    applyAcceptedStartupStatus(context);

    expect(context.state.currentStatus).toBe(AgentStatus.Initializing);
    expect(context.state.canInterrupt).toBe(false);
    expect(context.isSending).toBe(true);
  });

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

  it('applies team member startup and live recovery through the central status owner', () => {
    const member = buildContext(AgentStatus.Offline);
    const team = { currentStatus: AgentTeamStatus.Error } as any;

    applyAcceptedTeamMemberStartupStatus(team, member);
    expect(team.currentStatus).toBe(AgentTeamStatus.Initializing);
    expect(member.state.currentStatus).toBe(AgentStatus.Initializing);
    expect(member.state.canInterrupt).toBe(false);

    team.currentStatus = AgentTeamStatus.Error;
    member.state.currentStatus = AgentStatus.Error;
    applyLiveTeamMemberRuntimeActivityProjectionRepair(team, member);
    expect(team.currentStatus).toBe(AgentTeamStatus.Running);
    expect(member.state.currentStatus).toBe(AgentStatus.Running);
  });
});
