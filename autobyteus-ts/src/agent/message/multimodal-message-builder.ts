import { AgentInputUserMessage } from './agent-input-user-message.js';
import { ContextFileType } from './context-file-type.js';
import { LLMUserMessage } from '../../llm/user-message.js';

export function buildLLMUserMessage(agentInputUserMessage: AgentInputUserMessage): LLMUserMessage {
  const imageUrls: string[] = [];
  const audioUrls: string[] = [];
  const videoUrls: string[] = [];

  if (agentInputUserMessage.contextFiles) {
    for (const contextFile of agentInputUserMessage.contextFiles) {
      const fileType = contextFile.fileType;
      if (fileType === ContextFileType.IMAGE) {
        imageUrls.push(contextFile.uri);
      } else if (fileType === ContextFileType.AUDIO) {
        audioUrls.push(contextFile.uri);
      } else if (fileType === ContextFileType.VIDEO) {
        videoUrls.push(contextFile.uri);
      }
    }
  }

  return new LLMUserMessage({
    content: agentInputUserMessage.content,
    image_urls: imageUrls.length > 0 ? imageUrls : undefined,
    audio_urls: audioUrls.length > 0 ? audioUrls : undefined,
    video_urls: videoUrls.length > 0 ? videoUrls : undefined
  });
}
