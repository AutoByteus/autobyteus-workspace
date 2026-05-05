import { describe, it, expect, vi } from 'vitest';
import { AgentInputPipeline } from '../../../../src/agent/pipelines/agent-input-pipeline.js';
import { AgentRuntimeState } from '../../../../src/agent/context/agent-runtime-state.js';
import { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentConfig } from '../../../../src/agent/context/agent-config.js';
import { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';
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
});
