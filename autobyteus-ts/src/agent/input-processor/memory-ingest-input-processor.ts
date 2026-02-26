import { BaseAgentUserInputMessageProcessor } from './base-user-input-processor.js';
import type { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import type { AgentContext } from '../context/agent-context.js';
import type { UserMessageReceivedEvent } from '../events/agent-events.js';
import { buildLLMUserMessage } from '../message/multimodal-message-builder.js';
import { SenderType } from '../sender-type.js';

export class MemoryIngestInputProcessor extends BaseAgentUserInputMessageProcessor {
  static getOrder(): number {
    return 900;
  }

  async process(
    message: AgentInputUserMessage,
    context: AgentContext,
    _triggeringEvent: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    const memoryManager = context.state.memoryManager;
    if (!memoryManager) {
      return message;
    }
    if (message.senderType === SenderType.TOOL) {
      console.debug('MemoryIngestInputProcessor skipping TOOL-originated message to avoid duplicate tool results.');
      return message;
    }

    const turnId = memoryManager.startTurn();
    context.state.activeTurnId = turnId;

    const llmUserMessage = buildLLMUserMessage(message);
    memoryManager.ingestUserMessage(llmUserMessage, turnId, 'LLMUserMessageReadyEvent');
    console.debug(`MemoryIngestInputProcessor stored processed user input with turnId ${turnId}`);
    return message;
  }
}
