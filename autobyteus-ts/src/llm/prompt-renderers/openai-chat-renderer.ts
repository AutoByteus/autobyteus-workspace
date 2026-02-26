import type {
  ChatCompletionContentPart,
  ChatCompletionContentPartInputAudio,
  ChatCompletionMessageParam
} from 'openai/resources/chat/completions.mjs';
import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  ToolCallPayload,
  ToolResultPayload
} from '../utils/messages.js';
import {
  mediaSourceToBase64,
  mediaSourceToDataUri,
  createDataUri,
  getMimeType,
  isValidMediaPath
} from '../utils/media-payload-formatter.js';

type RenderedMessage = ChatCompletionMessageParam;

export class OpenAIChatRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<RenderedMessage[]> {
    const rendered: RenderedMessage[] = [];

    for (const msg of messages) {
      let content: any = msg.content;

      if (msg.image_urls.length || msg.audio_urls.length || msg.video_urls.length) {
        const contentParts: ChatCompletionContentPart[] = [];

        if (msg.content) {
          contentParts.push({ type: 'text', text: msg.content });
        }

        const base64Images = await Promise.allSettled(
          msg.image_urls.map((url) => mediaSourceToBase64(url))
        );

        for (let index = 0; index < base64Images.length; index += 1) {
          const result = base64Images[index];
          const source = msg.image_urls[index];
          if (result.status !== 'fulfilled') {
            console.error(`Error processing image ${source}: ${result.reason}`);
            continue;
          }

          const hasLocalPath = source ? await isValidMediaPath(source) : false;
          const mimeType = hasLocalPath ? getMimeType(source) : 'image/jpeg';
          const imagePart = createDataUri(mimeType, result.value);
          contentParts.push({
            type: 'image_url',
            image_url: imagePart.image_url,
          });
        }

        for (const source of msg.audio_urls) {
          const audioPart = await buildOpenAIInputAudioPart(source);
          if (audioPart) {
            contentParts.push(audioPart);
          }
        }
        if (msg.video_urls.length) {
          console.warn('OpenAI compatible layer does not yet support video; skipping.');
        }

        content = contentParts;
      }

      if (msg.tool_payload instanceof ToolCallPayload) {
        const toolCalls = msg.tool_payload.toolCalls.map((call) => ({
          id: call.id,
          type: 'function' as const,
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments)
          }
        }));
        rendered.push({
          role: 'assistant',
          content,
          tool_calls: toolCalls
        });
        continue;
      }

      if (msg.tool_payload instanceof ToolResultPayload) {
        rendered.push({
          role: 'tool',
          tool_call_id: msg.tool_payload.toolCallId,
          content: formatToolResult(msg.tool_payload)
        });
        continue;
      }

      const role = msg.role === 'system'
        ? 'system'
        : msg.role === 'assistant'
          ? 'assistant'
          : msg.role === 'tool'
            ? 'tool'
            : 'user';
      rendered.push({ role, content } as RenderedMessage);
    }

    return rendered;
  }
}

type ParsedDataUri = {
  mimeType: string;
  data: string;
  isBase64: boolean;
};

const parseDataUri = (input: string): ParsedDataUri | null => {
  const matches = /^data:([^;,]+)?((?:;[^;,=]+=[^;,=]+)*)(;base64)?,(.*)$/i.exec(input);
  if (!matches) {
    return null;
  }
  return {
    mimeType: (matches[1] ?? 'application/octet-stream').toLowerCase(),
    data: matches[4] ?? '',
    isBase64: Boolean(matches[3]),
  };
};

const inferOpenAIAudioFormat = (mimeType: string, source: string): 'mp3' | 'wav' | null => {
  const normalizedMime = mimeType.toLowerCase();
  if (normalizedMime === 'audio/mpeg' || normalizedMime === 'audio/mp3') {
    return 'mp3';
  }
  if (normalizedMime === 'audio/wav' || normalizedMime === 'audio/x-wav') {
    return 'wav';
  }

  const normalizedSource = source.toLowerCase();
  if (normalizedSource.endsWith('.mp3')) {
    return 'mp3';
  }
  if (normalizedSource.endsWith('.wav')) {
    return 'wav';
  }
  return null;
};

const buildOpenAIInputAudioPart = async (
  source: string,
): Promise<ChatCompletionContentPartInputAudio | null> => {
  try {
    const dataUri = await mediaSourceToDataUri(source);
    const parsed = parseDataUri(dataUri);
    if (!parsed) {
      console.warn(`Unable to parse audio source as data URI: ${source}`);
      return null;
    }

    const format = inferOpenAIAudioFormat(parsed.mimeType, source);
    if (!format) {
      console.warn(
        `OpenAI chat input audio supports mp3/wav. Skipping unsupported audio source: ${source}`,
      );
      return null;
    }

    const base64Data = parsed.isBase64
      ? parsed.data
      : Buffer.from(decodeURIComponent(parsed.data), 'utf8').toString('base64');

    return {
      type: 'input_audio',
      input_audio: {
        data: base64Data,
        format,
      },
    };
  } catch (error) {
    console.error(`Error processing audio ${source}: ${error}`);
    return null;
  }
};

function formatToolResult(payload: ToolResultPayload): string {
  if (payload.toolError) {
    return `Error: ${payload.toolError}`;
  }
  if (payload.toolResult === null || payload.toolResult === undefined) {
    return '';
  }
  if (Array.isArray(payload.toolResult) || typeof payload.toolResult === 'object') {
    return JSON.stringify(payload.toolResult);
  }
  return String(payload.toolResult);
}
