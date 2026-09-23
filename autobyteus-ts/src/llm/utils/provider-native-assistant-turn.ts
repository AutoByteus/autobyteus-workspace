import { Message } from './messages.js';
import type { ToolCallSpec } from './messages.js';
import { isDeepStrictEqual } from 'node:util';

export const ANTHROPIC_ASSISTANT_TURN_KEY = 'provider_native_assistant_turn';

export type AnthropicAssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'redacted_thinking'; data: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

export type AnthropicAssistantTurn = {
  provider: 'anthropic';
  blocks: AnthropicAssistantBlock[];
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const parseAnthropicAssistantTurn = (value: unknown): AnthropicAssistantTurn => {
  if (!record(value) || value.provider !== 'anthropic' || !Array.isArray(value.blocks) || !value.blocks.length) {
    throw new Error('Invalid Anthropic native assistant turn.');
  }
  const blocks = value.blocks.map((block: unknown): AnthropicAssistantBlock => {
    if (!record(block)) throw new Error('Invalid Anthropic assistant content block.');
    if (block.type === 'text' && typeof block.text === 'string') return { type: 'text', text: block.text };
    if (block.type === 'thinking' && typeof block.thinking === 'string' && typeof block.signature === 'string' && block.signature) {
      return { type: 'thinking', thinking: block.thinking, signature: block.signature };
    }
    if (block.type === 'redacted_thinking' && typeof block.data === 'string' && block.data) {
      return { type: 'redacted_thinking', data: block.data };
    }
    if (block.type === 'tool_use' && typeof block.id === 'string' && block.id && typeof block.name === 'string' && block.name && record(block.input)) {
      return { type: 'tool_use', id: block.id, name: block.name, input: structuredClone(block.input) };
    }
    throw new Error('Unsupported or incomplete Anthropic assistant content block.');
  });
  if (new Set(blocks.filter((block) => block.type === 'tool_use').map((block) => block.id)).size !== blocks.filter((block) => block.type === 'tool_use').length) {
    throw new Error('Duplicate Anthropic tool-use IDs.');
  }
  return { provider: 'anthropic', blocks };
};

export const withoutThinkingBlocks = (turn: AnthropicAssistantTurn): AnthropicAssistantTurn => ({
  provider: 'anthropic',
  blocks: turn.blocks.filter((block) => block.type !== 'thinking' && block.type !== 'redacted_thinking').map((block) => structuredClone(block)),
});

export const assertAnthropicTurnMatchesToolCalls = (turn: AnthropicAssistantTurn, calls: readonly ToolCallSpec[]): void => {
  const nativeCalls = parseAnthropicAssistantTurn(turn).blocks.filter((block) => block.type === 'tool_use');
  if (nativeCalls.length !== calls.length || nativeCalls.some((block, index) =>
    block.id !== calls[index]!.id || block.name !== calls[index]!.name || !isDeepStrictEqual(block.input, calls[index]!.arguments))) {
    throw new Error('Anthropic native assistant turn does not match executable tool calls.');
  }
};

export const withoutAnthropicThinkingInMessage = (message: Message): Message => {
  const raw = message.metadata?.[ANTHROPIC_ASSISTANT_TURN_KEY];
  if (raw === undefined) return message;
  const turn = parseAnthropicAssistantTurn(raw);
  return new Message(message.role, {
    content: message.content,
    reasoning_content: message.reasoning_content,
    image_urls: message.image_urls,
    audio_urls: message.audio_urls,
    video_urls: message.video_urls,
    tool_payload: message.tool_payload,
    metadata: { ...message.metadata, [ANTHROPIC_ASSISTANT_TURN_KEY]: withoutThinkingBlocks(turn) },
  });
};
