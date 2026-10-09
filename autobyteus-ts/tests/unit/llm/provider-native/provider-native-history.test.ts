import { describe, expect, it } from 'vitest';
import { Message, MessageRole, ToolCallPayload } from '../../../../src/llm/utils/messages.js';
import { PROVIDER_NATIVE_ASSISTANT_TURN_KEY } from '../../../../src/llm/provider-native/provider-native-assistant-turn.js';
import {
  messageHasPrefixBoundReasoning,
  messageWithoutPrefixBoundReasoning,
  nativeTurnMetadata,
  readProviderNativeTurn,
} from '../../../../src/llm/provider-native/provider-native-history.js';

const toolCall = { id: 'toolu_1', name: 'run_bash', arguments: { command: 'pwd' } };
const anthropicTurn = {
  provider: 'anthropic',
  blocks: [
    { type: 'thinking', thinking: 'synthetic reasoning', signature: 'sig' },
    { type: 'redacted_thinking', data: 'opaque' },
    { type: 'text', text: 'Checking.' },
    { type: 'tool_use', id: 'toolu_1', name: 'run_bash', input: { command: 'pwd' } },
  ],
};

const assistantWith = (turn: unknown) => new Message(MessageRole.ASSISTANT, {
  content: 'Checking.',
  tool_payload: new ToolCallPayload([toolCall]),
  metadata: { [PROVIDER_NATIVE_ASSISTANT_TURN_KEY]: turn, keep: 'other metadata' },
});

describe('provider-native history operations', () => {
  it('validates an Anthropic turn against the tool calls and round-trips it through stored metadata', () => {
    const metadata = nativeTurnMetadata(anthropicTurn, [toolCall]);
    expect(metadata).toEqual({ [PROVIDER_NATIVE_ASSISTANT_TURN_KEY]: anthropicTurn });

    const stored = new Message(MessageRole.ASSISTANT, { metadata });
    expect(readProviderNativeTurn(stored)).toEqual(anthropicTurn);
    expect(readProviderNativeTurn(new Message(MessageRole.ASSISTANT, { content: 'plain' }))).toBeNull();
  });

  it('rejects a turn whose tool calls differ from the executable calls', () => {
    expect(() => nativeTurnMetadata(anthropicTurn, [{ ...toolCall, arguments: { command: 'ls' } }]))
      .toThrow('does not match executable tool calls');
  });

  it('fails closed for an unknown or missing provider tag', () => {
    expect(() => nativeTurnMetadata({ provider: 'unknown_provider', blocks: [] }, [])).toThrow("provider 'unknown_provider'");
    expect(() => readProviderNativeTurn(assistantWith({ blocks: [] }))).toThrow("provider 'missing'");
  });

  it('removes only Anthropic thinking and redacted thinking, keeping text, tool use and other metadata', () => {
    const message = assistantWith(anthropicTurn);
    expect(messageHasPrefixBoundReasoning(message)).toBe(true);

    const stripped = messageWithoutPrefixBoundReasoning(message);
    expect(stripped.metadata).toEqual({
      [PROVIDER_NATIVE_ASSISTANT_TURN_KEY]: { provider: 'anthropic', blocks: anthropicTurn.blocks.slice(2) },
      keep: 'other metadata',
    });
    expect(stripped.content).toBe('Checking.');
    expect(stripped.tool_payload).toBe(message.tool_payload);
    expect(messageHasPrefixBoundReasoning(stripped)).toBe(false);
    expect(message.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY]).toEqual(anthropicTurn);
  });

  it('leaves messages without a native turn untouched', () => {
    const plain = new Message(MessageRole.USER, { content: 'hello' });
    expect(messageWithoutPrefixBoundReasoning(plain)).toBe(plain);
    expect(messageHasPrefixBoundReasoning(plain)).toBe(false);
  });
});
