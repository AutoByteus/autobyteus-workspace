import { describe, it, expect, vi } from 'vitest';
import { AgentTeam } from '../../../src/agent-team/agent-team.js';
import { ProcessUserMessageEvent } from '../../../src/agent-team/events/agent-team-events.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';

const makeRuntime = () => {
  const mockContext = {
    config: { coordinatorNode: { name: 'Coordinator' } },
    teamId: 'mock-team-id'
  };

  return {
    context: mockContext,
    isRunning: false,
    start: vi.fn(),
    submitEvent: vi.fn(async () => undefined)
  } as any;
};

describe('AgentTeam', () => {
  it('postMessage starts if not running', async () => {
    const runtime = makeRuntime();
    runtime.isRunning = false;
    const team = new AgentTeam(runtime);
    const message = new AgentInputUserMessage('test');

    await team.postMessage(message);

    expect(runtime.start).toHaveBeenCalledOnce();
    expect(runtime.submitEvent).toHaveBeenCalledOnce();
  });

  it('postMessage defaults to coordinator', async () => {
    const runtime = makeRuntime();
    runtime.isRunning = true;
    const team = new AgentTeam(runtime);
    const message = new AgentInputUserMessage('test');

    await team.postMessage(message, null);

    const submittedEvent = runtime.submitEvent.mock.calls[0][0];
    expect(submittedEvent).toBeInstanceOf(ProcessUserMessageEvent);
    expect(submittedEvent.userMessage).toBe(message);
    expect(submittedEvent.targetAgentName).toBe('Coordinator');
  });

  it('postMessage uses provided target', async () => {
    const runtime = makeRuntime();
    runtime.isRunning = true;
    const team = new AgentTeam(runtime);
    const message = new AgentInputUserMessage('test');

    await team.postMessage(message, 'Specialist');

    const submittedEvent = runtime.submitEvent.mock.calls[0][0];
    expect(submittedEvent).toBeInstanceOf(ProcessUserMessageEvent);
    expect(submittedEvent.targetAgentName).toBe('Specialist');
  });
});
