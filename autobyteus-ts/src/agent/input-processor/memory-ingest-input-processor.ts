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

    const turnId = context.state.activeTurn?.turnId;
    if (!turnId) {
      if (message.senderType === SenderType.TOOL) {
        throw new Error(
          `MemoryIngestInputProcessor cannot ingest TOOL continuation input without an active turn for agent '${context.agentId}'.`
        );
      }
      throw new Error(
        `MemoryIngestInputProcessor cannot ingest non-tool user input without an active turn for agent '${context.agentId}'.`
      );
    }

    if (message.senderType === SenderType.TOOL) {
      memoryManager.ingestToolContinuationBoundary(turnId, 'ToolContinuationInput');
      console.debug(`MemoryIngestInputProcessor stored tool continuation boundary with turnId ${turnId}`);
      return message;
    }

    const llmUserMessage = buildLLMUserMessage(message);
    memoryManager.ingestUserMessage(llmUserMessage, turnId, 'LLMUserMessageReadyEvent');
    console.debug(`MemoryIngestInputProcessor stored processed user input with turnId ${turnId}`);
    return message;
  }
}
