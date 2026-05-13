import { describe, it, expect, vi } from 'vitest';
import { AgentInputPipeline } from '../../../../src/agent/pipelines/agent-input-pipeline.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { InterAgentMessageReceivedEvent, UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import { InterAgentMessage } from '../../../../src/agent/message/inter-agent-message.js';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import type { Message } from '../../../../src/llm/utils/messages.js';
import type { CompleteResponse as CompleteResponseType, ChunkResponse } from '../../../../src/llm/utils/response-types.js';

class DummyLLM extends BaseLLM {
  protected async _sendMessagesToLLM(_messages: Message[]): Promise<CompleteResponseType> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: Message[],
    _kwargs: Record<string, unknown>,
    _options?: LLMInvocationOptions
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield { content: 'ok', is_complete: true } as ChunkResponse;
  }
}

const makeContextAndTurn = () => {
  const model = new LLMModel({ name: 'dummy', value: 'dummy', canonicalName: 'dummy', provider: LLMProvider.OPENAI });
  const config = new AgentConfig('agent', 'role', 'desc', new DummyLLM(model, new LLMConfig()));
  const state = new AgentRuntimeState('agent-1');
  const turn = new AgentTurn('turn-1');
  state.activeTurn = turn;
  return { context: new AgentContext('agent-1', config, state), turn };
};

const attachTeamCommunicationContext = (
  context: AgentContext,
  resolveMemberNameByAgentId: (agentId: string) => string | null
) => {
  context.state.customData = {
    teamContext: {
      communicationContext: {
        members: [],
        dispatchInterAgentMessageRequest: vi.fn(async () => undefined),
        resolveMemberNameByAgentId
      }
    }
  };
};

const countOccurrences = (content: string, needle: string): number =>
  content.split(needle).length - 1;

describe('AgentInputPipeline', () => {
  it('preserves SenderType.TOOL same-turn continuation through input processors and LLM message building', async () => {
    const { context, turn } = makeContextAndTurn();
    const processor = {
      getName: () => 'append-processor',
      getOrder: () => 10,
      process: vi.fn(async (message: AgentInputUserMessage) =>
        new AgentInputUserMessage(`${message.content} processed`, message.senderType, message.contextFiles)
      )
    };
    context.config.inputProcessors = [processor as any];
    const pipeline = new AgentInputPipeline();
    const media = [new ContextFile('/tmp/image.png', ContextFileType.IMAGE)];
    const toolMessage = new AgentInputUserMessage('tool result', SenderType.TOOL, media);

    const result = await pipeline.processToolContinuation(toolMessage, context, turn);

    expect(processor.process).toHaveBeenCalledTimes(1);
    expect(result.turnId).toBe('turn-1');
    expect(result.sourceEvent.agentInputUserMessage.senderType).toBe(SenderType.TOOL);
    expect(String(result.llmUserMessage.content)).toContain('tool result processed');
    expect(result.llmUserMessage.image_urls).toContain('/tmp/image.png');
  });

  it('rejects SenderType.TOOL as a new external turn trigger', async () => {
    const { context, turn } = makeContextAndTurn();
    const pipeline = new AgentInputPipeline();
    const event = new UserMessageReceivedEvent(new AgentInputUserMessage('tool', SenderType.TOOL));

    await expect(pipeline.processForLlm(event, context, turn, { startsNewTurn: true })).rejects.toThrow(
      /cannot start a new turn/
    );
  });

  it('publishes system task notifications through the semantic notifier exactly once', async () => {
    const { context, turn } = makeContextAndTurn();
    const notifier = {
      notifyAgentDataSystemTaskNotificationReceived: vi.fn()
    };
    const pipeline = new AgentInputPipeline();
    const event = new UserMessageReceivedEvent(
      new AgentInputUserMessage('system task update', SenderType.SYSTEM, null, {
        sender_id: 'system_scheduler'
      })
    );

    const result = await pipeline.processForLlm(event, context, turn, {
      startsNewTurn: true,
      notifier: notifier as any
    });

    expect(notifier.notifyAgentDataSystemTaskNotificationReceived).toHaveBeenCalledOnce();
    expect(notifier.notifyAgentDataSystemTaskNotificationReceived).toHaveBeenCalledWith({
      sender_id: 'system_scheduler',
      content: 'system task update'
    });
    expect(String(result.llmUserMessage.content)).toContain('system task update');
  });

  it('converts inter-agent messages with resolved sender display name and strict recipient input shape', async () => {
    const { context, turn } = makeContextAndTurn();
    attachTeamCommunicationContext(
      context,
      (agentId) => (agentId === 'sender_agent_123' ? 'Professor' : null)
    );
    const notifier = {
      notifyAgentDataInterAgentMessageReceived: vi.fn()
    };
    const pipeline = new AgentInputPipeline();
    const interAgentMsg = new InterAgentMessage(
      context.config.role,
      context.agentId,
      'This is a test message from another agent.',
      'task_assignment',
      'sender_agent_123'
    );

    const result = await pipeline.processExternalTrigger(
      new InterAgentMessageReceivedEvent(interAgentMsg),
      context,
      turn,
      notifier as any
    );

    expect(notifier.notifyAgentDataInterAgentMessageReceived).toHaveBeenCalledWith({
      sender_agent_id: 'sender_agent_123',
      recipient_role_name: context.config.role,
      content: 'This is a test message from another agent.',
      message_type: 'task_assignment',
      reference_files: []
    });
    const contentSent = String(result.llmUserMessage.content);
    expect(contentSent).toContain(
      'You received a message from sender name: Professor, sender id: sender_agent_123'
    );
    expect(contentSent).toContain('message:\nThis is a test message from another agent.');
    expect(contentSent).not.toContain('Message Type:');
    expect(contentSent).not.toContain('Recipient Role Name');
    expect(contentSent).not.toContain('Reply naturally based on this message.');
    expect(result.sourceEvent.agentInputUserMessage.metadata).toEqual(expect.objectContaining({
      sender_agent_id: 'sender_agent_123',
      original_message_type: 'task_assignment',
      reference_files: []
    }));
  });

  it('includes explicit reference files once in recipient runtime input and metadata', async () => {
    const { context, turn } = makeContextAndTurn();
    attachTeamCommunicationContext(
      context,
      (agentId) => (agentId === 'sender_agent_123' ? 'Professor' : null)
    );
    const notifier = {
      notifyAgentDataInterAgentMessageReceived: vi.fn()
    };
    const pipeline = new AgentInputPipeline();
    const interAgentMsg = new InterAgentMessage(
      context.config.role,
      context.agentId,
      'Please inspect the referenced file.',
      'handoff',
      'sender_agent_123',
      ['/tmp/report.md']
    );

    const result = await pipeline.processExternalTrigger(
      new InterAgentMessageReceivedEvent(interAgentMsg),
      context,
      turn,
      notifier as any
    );

    expect(notifier.notifyAgentDataInterAgentMessageReceived).toHaveBeenCalledWith(expect.objectContaining({
      reference_files: ['/tmp/report.md']
    }));
    const contentSent = String(result.llmUserMessage.content);
    expect(countOccurrences(contentSent, 'Reference files:')).toBe(1);
    expect(contentSent).toContain('Reference files:\n- /tmp/report.md');
    expect(result.sourceEvent.agentInputUserMessage.metadata).toEqual(expect.objectContaining({
      reference_files: ['/tmp/report.md']
    }));
  });

  it('keeps strict inter-agent template when sender name cannot be resolved', async () => {
    const { context, turn } = makeContextAndTurn();
    attachTeamCommunicationContext(context, () => null);
    const pipeline = new AgentInputPipeline();
    const senderId = 'member_1249a255a7c74b9b';
    const interAgentMsg = new InterAgentMessage(
      context.config.role,
      context.agentId,
      'hello',
      'clarification',
      senderId
    );

    const result = await pipeline.processExternalTrigger(
      new InterAgentMessageReceivedEvent(interAgentMsg),
      context,
      turn
    );

    expect(String(result.llmUserMessage.content)).toContain(
      `You received a message from sender name: ${senderId}, sender id: ${senderId}\nmessage:\nhello`
    );
  });

  it('resolves inter-agent sender name when team communication method requires bound this context', async () => {
    const { context, turn } = makeContextAndTurn();
    const senderId = 'member_sender_1';
    const communicationContextWithState = {
      senderById: {
        [senderId]: 'Professor'
      } as Record<string, string>,
      members: [],
      dispatchInterAgentMessageRequest: vi.fn(async () => undefined),
      resolveMemberNameByAgentId(agentId: string): string | null {
        return this.senderById[agentId] ?? null;
      }
    };
    context.state.customData = {
      teamContext: {
        communicationContext: communicationContextWithState
      }
    };
    const pipeline = new AgentInputPipeline();
    const interAgentMsg = new InterAgentMessage(
      context.config.role,
      context.agentId,
      'hello from teammate',
      'clarification',
      senderId
    );

    const result = await pipeline.processExternalTrigger(
      new InterAgentMessageReceivedEvent(interAgentMsg),
      context,
      turn
    );

    expect(String(result.llmUserMessage.content)).toContain(
      `You received a message from sender name: Professor, sender id: ${senderId}\nmessage:\nhello from teammate`
    );
  });
});
