import { describe, it, expect, vi } from 'vitest';
import { TaskActivator } from '../../../../src/agent-team/task-notification/task-activator.js';
import { ProcessUserMessageEvent } from '../../../../src/agent-team/events/agent-team-events.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { TASK_NOTIFIER_SENDER_ID } from '../../../../src/agent/sender-type.js';

const makeTeamManager = () => {
  return {
    teamId: 'test_activator_team',
    ensureNodeIsReady: vi.fn(async () => undefined),
    dispatchUserMessageToAgent: vi.fn(async () => undefined)
  };
};

describe('TaskActivator', () => {
  it('initializes with valid manager', () => {
    const manager = makeTeamManager();
    expect(() => new TaskActivator(manager)).not.toThrow();
  });

  it('throws when manager is missing', () => {
    expect(() => new TaskActivator(null as any)).toThrow('TaskActivator requires a valid TeamManager instance.');
  });

  it('activates agent and dispatches message', async () => {
    const manager = makeTeamManager();
    const activator = new TaskActivator(manager);
    const agentName = 'AgentToActivate';

    await activator.activateAgent(agentName);

    expect(manager.ensureNodeIsReady).toHaveBeenCalledWith(agentName);
    expect(manager.dispatchUserMessageToAgent).toHaveBeenCalledTimes(1);

    const dispatchedEvent = (manager.dispatchUserMessageToAgent as any).mock.calls[0][0];
    expect(dispatchedEvent).toBeInstanceOf(ProcessUserMessageEvent);
    expect(dispatchedEvent.targetAgentName).toBe(agentName);

    const userMessage = dispatchedEvent.userMessage;
    expect(userMessage).toBeInstanceOf(AgentInputUserMessage);
    expect(userMessage.content).toContain('You have new tasks');
    expect(userMessage.metadata.sender_id).toBe(TASK_NOTIFIER_SENDER_ID);
  });

  it('logs error when team manager throws', async () => {
    const manager = makeTeamManager();
    manager.ensureNodeIsReady = vi.fn(async () => {
      throw new Error('Node failed to start');
    });
    const activator = new TaskActivator(manager);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await activator.activateAgent('AgentThatFails');

    expect(errorSpy).toHaveBeenCalled();
    expect(manager.dispatchUserMessageToAgent).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
