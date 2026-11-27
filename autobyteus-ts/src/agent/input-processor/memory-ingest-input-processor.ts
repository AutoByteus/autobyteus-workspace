import { BaseAgentUserInputMessageProcessor } from './base-user-input-processor.js';
import type { AgentInputUserMessage } from '../message/agent-input-user-message.js';
import type { AgentContext } from '../context/agent-context.js';
import type { UserMessageReceivedEvent } from '../events/agent-events.js';
import { buildLLMUserMessage } from '../message/multimodal-message-builder.js';
import { partitionRawTraceAttachments } from '../../memory/models/raw-trace-attachments.js';
import { SenderType } from '../sender-type.js';
import { resolveInterAgentSenderId } from '../message/inter-agent-sender.js';
import { LLMUserMessage } from '../../llm/user-message.js';
import { readPlatformInputPreface, stripPlatformInputPreface } from '../message/platform-input-preface-metadata.js';
import { readPresentAsNotice } from '../message/present-as-notice-metadata.js';

/**
 * The source event of every input trace this processor writes: the user message and, for an input carrying a platform
 * notice, the notice it stores right before it. The server's run replay reads it to recognize native's preface pair
 * (autobyteus-628).
 */
export const NATIVE_INPUT_TRACE_SOURCE_EVENT = 'LLMUserMessageReadyEvent';

export class MemoryIngestInputProcessor extends BaseAgentUserInputMessageProcessor {
  static getOrder(): number {
    return 900;
  }

  async process(
    message: AgentInputUserMessage,
    context: AgentContext,
    triggeringEvent: UserMessageReceivedEvent
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
      return message;
    }

    const llmUserMessage = buildLLMUserMessage(message);
    const original = triggeringEvent.agentInputUserMessage;
    const fileAttachments = original.recordingFileAttachments
      ?? partitionRawTraceAttachments(original.contextFiles ?? []).fileAttachments;
    const identity = {
      messageId: typeof original.metadata?.message_id === 'string' ? original.metadata.message_id : undefined,
      dedupeKey: typeof original.metadata?.dedupe_key === 'string' ? original.metadata.dedupe_key : undefined,
    };

    // autobyteus-646 R-10: an input presented as a notice is recorded as a system notice trace from its sender.
    const presentAsNotice = readPresentAsNotice(original.metadata);
    const recordInput = (content: string, llmMessage: LLMUserMessage) => presentAsNotice
      ? memoryManager.appendRawTrace({
        turnId, traceType: 'system_task_notification', content, senderId: presentAsNotice.senderId, sourceEvent: NATIVE_INPUT_TRACE_SOURCE_EVENT,
        messageId: identity.messageId,
      }).id
      : memoryManager.ingestUserMessage(llmMessage, turnId, NATIVE_INPUT_TRACE_SOURCE_EVENT, fileAttachments,
        resolveInterAgentSenderId(original.metadata), identity);

    const preface = readPlatformInputPreface(original.metadata);
    if (preface) {
      // The model sees the notice and the input together; history keeps them apart: one system
      // notice, then the input as it was sent (when there is one). The working-context entry is
      // linked to both traces explicitly, because its content matches neither.
      const traceIds = [memoryManager.appendRawTrace({
        turnId, traceType: 'system_task_notification', content: preface.content, senderId: preface.senderId, sourceEvent: NATIVE_INPUT_TRACE_SOURCE_EVENT,
        messageId: preface.noticeId ?? undefined,
      }).id];
      const inputContent = stripPlatformInputPreface(llmUserMessage.content, preface);
      if (inputContent !== null) {
        traceIds.push(recordInput(inputContent, new LLMUserMessage({
          content: inputContent,
          image_urls: llmUserMessage.image_urls,
          audio_urls: llmUserMessage.audio_urls,
          video_urls: llmUserMessage.video_urls,
        })));
      }
      context.state.activeTurn?.recordInputRawTraceIds(traceIds);
      console.debug(`MemoryIngestInputProcessor stored a platform notice and its input with turnId ${turnId}`);
      return message;
    }

    const traceId = recordInput(llmUserMessage.content, llmUserMessage);
    if (presentAsNotice) context.state.activeTurn?.recordInputRawTraceIds([traceId]);
    console.debug(`MemoryIngestInputProcessor stored processed user input with turnId ${turnId}`);
    return message;
  }
}
