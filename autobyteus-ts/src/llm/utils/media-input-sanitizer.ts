import {
  Message,
  type MessageMetadata,
  ToolCallPayload,
  ToolResultPayload,
} from './messages.js';
import type { MultimodalCapabilities } from '../multimodal-capabilities.js';
import { promises as fs } from 'node:fs';
import { isValidMediaPath, mediaSourceToBase64 } from './media-payload-formatter.js';

export type MediaInputType = 'image' | 'audio' | 'video';
export type MediaInputDiagnosticReason = 'unsupported' | 'invalid' | 'too_large';

/**
 * The largest local media file (image, audio or video) the runtime reads and sends inline in a model request.
 * Larger files stay on disk: the agent opens them from their path.
 */
export const INLINE_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export type MediaInputDiagnostic = {
  mediaType: MediaInputType;
  reason: MediaInputDiagnosticReason;
  message: string;
};

export type SanitizedMediaInput = {
  outboundMessages: Message[];
  diagnostics: MediaInputDiagnostic[];
  removedImageCount: number;
};

const cloneMetadata = (metadata: MessageMetadata | null): MessageMetadata | null =>
  metadata ? { ...metadata } : null;

const cloneToolPayload = (payload: Message['tool_payload']): Message['tool_payload'] => {
  if (payload instanceof ToolCallPayload) {
    return new ToolCallPayload(payload.toolCalls.map((call) => ({
      ...call,
      arguments: { ...call.arguments },
      nativeToolCallContext: call.nativeToolCallContext
        ? { ...call.nativeToolCallContext }
        : undefined,
    })));
  }
  if (payload instanceof ToolResultPayload) {
    return new ToolResultPayload(
      payload.toolCallId,
      payload.toolName,
      payload.toolResult,
      payload.toolError,
    );
  }
  return null;
};

const diagnostic = (
  mediaType: MediaInputType,
  reason: MediaInputDiagnosticReason,
): MediaInputDiagnostic => ({
  mediaType,
  reason,
  message: reason === 'unsupported'
    ? `The selected model does not support ${mediaType} input; the ${mediaType} was omitted from this request.`
    : reason === 'too_large'
      ? `The ${mediaType} file is larger than 25 MB and was not sent inline; the agent can open it from its path.`
      : `The ${mediaType} input was invalid or empty and was omitted from this request.`,
});

/** A local media file (the sources the renderers read whole from disk) larger than the inline cap. */
const isLocalFileOverInlineLimit = async (source: string): Promise<boolean> => {
  if (!(await isValidMediaPath(source))) return false;
  try {
    return (await fs.stat(source)).size > INLINE_MEDIA_MAX_BYTES;
  } catch {
    return false;
  }
};

const sanitizeSources = async (
  sources: string[],
  mediaType: MediaInputType,
  capability: MultimodalCapabilities[MediaInputType],
  diagnostics: MediaInputDiagnostic[],
): Promise<string[]> => {
  if (capability === 'unsupported') {
    for (const _source of sources) diagnostics.push(diagnostic(mediaType, 'unsupported'));
    return [];
  }

  // Before the image base64 check below, so an oversized image is never read whole.
  const tooLarge = await Promise.all(sources.map(isLocalFileOverInlineLimit));
  const inlineable = sources.filter((_source, index) => {
    if (tooLarge[index]) diagnostics.push(diagnostic(mediaType, 'too_large'));
    return !tooLarge[index];
  });

  if (mediaType !== 'image') return inlineable;

  const settled = await Promise.allSettled(inlineable.map((source) => mediaSourceToBase64(source)));
  return settled.flatMap((result, index) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      return [inlineable[index]!];
    }
    diagnostics.push(diagnostic(mediaType, 'invalid'));
    return [];
  });
};

/**
 * Build the provider-facing copy of messages without changing canonical memory.
 * Capability filtering and the non-empty image invariant are deliberately provider-neutral.
 */
export const sanitizeMediaInputMessages = async (
  messages: Message[],
  capabilities: MultimodalCapabilities,
): Promise<SanitizedMediaInput> => {
  const diagnostics: MediaInputDiagnostic[] = [];
  const outboundMessages: Message[] = [];

  for (const message of messages) {
    const imageUrls = await sanitizeSources(
      message.image_urls,
      'image',
      capabilities.image,
      diagnostics,
    );
    const audioUrls = await sanitizeSources(
      message.audio_urls,
      'audio',
      capabilities.audio,
      diagnostics,
    );
    const videoUrls = await sanitizeSources(
      message.video_urls,
      'video',
      capabilities.video,
      diagnostics,
    );

    outboundMessages.push(new Message(message.role, {
      content: message.content,
      reasoning_content: message.reasoning_content,
      image_urls: imageUrls,
      audio_urls: audioUrls,
      video_urls: videoUrls,
      tool_payload: cloneToolPayload(message.tool_payload),
      metadata: cloneMetadata(message.metadata),
    }));
  }

  return {
    outboundMessages,
    diagnostics,
    removedImageCount: messages.reduce((count, message, index) => {
      const original = message.image_urls.length;
      const kept = outboundMessages[index]?.image_urls.length ?? 0;
      return count + original - kept;
    }, 0),
  };
};

export class MediaInputSanitizer {
  sanitize(messages: Message[], capabilities: MultimodalCapabilities): Promise<SanitizedMediaInput> {
    return sanitizeMediaInputMessages(messages, capabilities);
  }
}
