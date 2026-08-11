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
import { SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY } from '../../../../src/agent/message/system-task-notification-metadata.js';
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

const countOccurrences = (content: string, needle: string): number =>
  content.split(needle).length - 1;

describe('AgentInputPipeline', () => {
  it('runs TOOL processors once and decides carrier presence from the processed message', async () => {
    const { context, turn } = makeContextAndTurn();
    const media = [new ContextFile('/tmp/image.png', ContextFileType.IMAGE)];
    const processor = {
      getName: () => 'append-processor',
      getOrder: () => 10,
      process: vi.fn(async (message: AgentInputUserMessage) =>
        new AgentInputUserMessage(`${message.content} processed`, message.senderType, media)
      )
    };
    context.config.inputProcessors = [processor as any];
    const pipeline = new AgentInputPipeline();
    const toolMessage = new AgentInputUserMessage('tool result', SenderType.TOOL);

    const result = await pipeline.processToolContinuation(toolMessage, context, turn);

    expect(processor.process).toHaveBeenCalledTimes(1);
    expect(result.turnId).toBe('turn-1');
    expect(result.sourceEvent.agentInputUserMessage.senderType).toBe(SenderType.TOOL);
    expect(result.llmUserMessage).not.toBeNull();
    expect(String(result.llmUserMessage?.content)).toContain('tool result processed');
    expect(result.llmUserMessage?.image_urls).toContain('/tmp/image.png');
  });

  it('returns a required null additional message for text-only same-turn continuation', async () => {
    const { context, turn } = makeContextAndTurn();
    const pipeline = new AgentInputPipeline();
    const toolMessage = new AgentInputUserMessage('tool results completed', SenderType.TOOL);

    const result = await pipeline.processToolContinuation(toolMessage, context, turn);

    expect(result).toHaveProperty('llmUserMessage', null);
  });

  it('returns exactly one additional message when a TOOL continuation carries media context files', async () => {
    const { context, turn } = makeContextAndTurn();
    const pipeline = new AgentInputPipeline();
    const toolMessage = new AgentInputUserMessage(
      'native tool continuation',
      SenderType.TOOL,
      [
        new ContextFile('/tmp/sample.mp3', ContextFileType.AUDIO),
        new ContextFile('/tmp/clip.mp4', ContextFileType.VIDEO)
      ]
    );

    const result = await pipeline.processToolContinuation(toolMessage, context, turn);

    expect(result.llmUserMessage).not.toBeNull();
    expect(result.llmUserMessage?.audio_urls).toEqual(['/tmp/sample.mp3']);
    expect(result.llmUserMessage?.video_urls).toEqual(['/tmp/clip.mp4']);
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

  it('suppresses only the generic system task notifier when explicit metadata requests suppression', async () => {
    const { context, turn } = makeContextAndTurn();
    const processor = {
      getName: () => 'append-processor',
      getOrder: () => 10,
      process: vi.fn(async (message: AgentInputUserMessage) =>
        new AgentInputUserMessage(`${message.content} processed`, message.senderType, message.contextFiles, message.metadata)
      )
    };
    context.config.inputProcessors = [processor as any];
    const notifier = {
      notifyAgentDataSystemTaskNotificationReceived: vi.fn()
    };
    const pipeline = new AgentInputPipeline();
    const event = new UserMessageReceivedEvent(
      new AgentInputUserMessage('suppressed system task update', SenderType.SYSTEM, null, {
        sender_id: 'system.task_delegation',
        [SYSTEM_TASK_NOTIFICATION_SUPPRESSION_METADATA_KEY]: true
      })
    );

    const result = await pipeline.processForLlm(event, context, turn, {
      startsNewTurn: true,
      notifier: notifier as any
    });

    expect(notifier.notifyAgentDataSystemTaskNotificationReceived).not.toHaveBeenCalled();
    expect(processor.process).toHaveBeenCalledOnce();
    expect(String(result.llmUserMessage.content)).toContain('suppressed system task update processed');
  });

  it('converts inter-agent messages with sender id and strict recipient input shape', async () => {
    const { context, turn } = makeContextAndTurn();
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
      'You received a message from sender name: sender_agent_123, sender id: sender_agent_123'
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
});
