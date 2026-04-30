import { BasePromptRenderer } from './base-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolPayload,
  ToolResultPayload
} from '../utils/messages.js';
import {
  assertValidAutobyteusConversationPayload,
  AutobyteusConversationMessage,
  AutobyteusConversationPayload,
  AutobyteusConversationRole
} from '../api/autobyteus-conversation-payload.js';

const countLabel = (count: number, singular: string): string =>
  `${count} ${singular}${count === 1 ? '' : 's'}`;

const appendSections = (...sections: Array<string | null | undefined>): string =>
  sections
    .map((section) => section?.trim() ?? '')
    .filter((section) => section.length > 0)
    .join('\n\n');

const escapeXmlText = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const escapeXmlAttribute = (value: string): string =>
  escapeXmlText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toStableJsonValue = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (value === undefined) {
    return null;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return String(value);
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => toStableJsonValue(item, seen));
    }

    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = toStableJsonValue(record[key], seen);
        return acc;
      }, {});
  } finally {
    seen.delete(value);
  }
};

const formatStructuredValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    const serialized = JSON.stringify(toStableJsonValue(value));
    return serialized === undefined ? String(value) : serialized;
  } catch {
    return String(value);
  }
};

const sentinelMarkers = (argName: string): [string, string] | null => {
  if (argName === 'content') {
    return ['__START_CONTENT__', '__END_CONTENT__'];
  }
  if (argName === 'patch') {
    return ['__START_PATCH__', '__END_PATCH__'];
  }
  return null;
};

const renderToolArgumentXml = (argName: string, value: unknown): string[] => {
  const xmlName = escapeXmlAttribute(argName);
  const stringValue = escapeXmlText(formatStructuredValue(value));
  const markers = sentinelMarkers(argName);

  if (markers) {
    const [startMarker, endMarker] = markers;
    return [
      `    <arg name="${xmlName}">`,
      startMarker,
      stringValue,
      endMarker,
      '    </arg>'
    ];
  }

  return [`    <arg name="${xmlName}">${stringValue}</arg>`];
};

const renderToolCallXml = (toolName: string, args: Record<string, unknown>): string => {
  const lines = [`<tool name="${escapeXmlAttribute(toolName)}">`];
  const argNames = Object.keys(args).sort();

  if (argNames.length > 0) {
    lines.push('  <arguments>');
    for (const argName of argNames) {
      lines.push(...renderToolArgumentXml(argName, args[argName]));
    }
    lines.push('  </arguments>');
  }

  lines.push('</tool>');
  return lines.join('\n');
};

const renderToolResultRecord = (payload: ToolResultPayload): string => [
  'Tool result:',
  `tool_call_id: ${formatStructuredValue(payload.toolCallId)}`,
  `tool_name: ${formatStructuredValue(payload.toolName)}`,
  `tool_result: ${formatStructuredValue(payload.toolResult)}`,
  `tool_error: ${formatStructuredValue(payload.toolError)}`
].join('\n');

const renderToolPayload = (toolPayload: ToolPayload | null): string | null => {
  if (!toolPayload) {
    return null;
  }

  if (toolPayload instanceof ToolCallPayload) {
    return toolPayload.toolCalls
      .map((call) => renderToolCallXml(call.name, call.arguments))
      .join('\n\n');
  }

  if (toolPayload instanceof ToolResultPayload) {
    return renderToolResultRecord(toolPayload);
  }

  return null;
};

const renderHistoricalMediaReference = (message: Message): string | null => {
  const mediaReferences = [
    message.image_urls.length ? countLabel(message.image_urls.length, 'image attachment') : null,
    message.audio_urls.length ? countLabel(message.audio_urls.length, 'audio attachment') : null,
    message.video_urls.length ? countLabel(message.video_urls.length, 'video attachment') : null
  ].filter((reference): reference is string => Boolean(reference));

  if (!mediaReferences.length) {
    return null;
  }

  return `Historical media not reattached: ${mediaReferences.join(', ')}.`;
};

const toAutobyteusRole = (role: MessageRole): AutobyteusConversationRole => role;

export class AutobyteusPromptRenderer extends BasePromptRenderer {
  async render(messages: Message[]): Promise<AutobyteusConversationPayload> {
    let currentMessageIndex = -1;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const msg = messages[index];
      if (msg.role === MessageRole.USER) {
        currentMessageIndex = index;
        break;
      }
    }

    if (currentMessageIndex < 0) {
      throw new Error('AutobyteusPromptRenderer requires at least one user message.');
    }

    const payload = {
      messages: messages.map((message, index): AutobyteusConversationMessage => {
        const isCurrentMessage = index === currentMessageIndex;
        const content = appendSections(
          message.content ?? '',
          renderToolPayload(message.tool_payload),
          isCurrentMessage ? null : renderHistoricalMediaReference(message)
        );

        return {
          role: toAutobyteusRole(message.role),
          content,
          image_urls: isCurrentMessage ? [...message.image_urls] : [],
          audio_urls: isCurrentMessage ? [...message.audio_urls] : [],
          video_urls: isCurrentMessage ? [...message.video_urls] : []
        };
      }),
      current_message_index: currentMessageIndex
    };

    assertValidAutobyteusConversationPayload(payload);
    return payload;
  }
}
