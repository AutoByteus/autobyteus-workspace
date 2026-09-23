import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { describe, expect, it } from 'vitest';
import { AnthropicLLM } from '../../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { ANTHROPIC_ASSISTANT_TURN_KEY } from '../../../src/llm/utils/provider-native-assistant-turn.js';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';
import type { AnthropicAssistantTurn } from '../../../src/llm/utils/provider-native-assistant-turn.js';

const env = dotenv.parse(readFileSync(join(homedir(), '.autobyteus/server-data/.env')));
const key = env.ANTHROPIC_API_KEY;
const definition = supportedModelDefinitions.find(row => row.value === 'claude-opus-5-5');
const tools = [{
  name: 'echo_validation',
  description: 'Echoes a short text value. Call this to satisfy a request to echo a value.',
  input_schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
}];
const safeStageError = (stage: string, error: unknown): Error => {
  const status = String(error).match(/\b(400|401|403|404|429|500|503)\b/)?.[1] ?? 'unknown';
  return new Error(`${stage} failed; provider HTTP status ${status}; original error suppressed`);
};

describe('temporary live product AnthropicLLM Opus 5.5 signed continuation', () => {
  it('streams one real tool turn and replays the native signed block to a real continuation', async () => {
    expect(Boolean(key), 'candidate key missing').toBe(true);
    expect(definition, 'exact catalog model missing').toBeTruthy();
    const llm = new AnthropicLLM(new LLMModel(definition!), new LLMConfig({ maxTokens: 1024 }), {
      resolve: async () => SecretValue.fromString(key!),
    });
    const system = new Message(MessageRole.SYSTEM, 'Use the provided echo tool when explicitly requested.');
    const user = new Message(MessageRole.USER, 'Call echo_validation exactly once with text ping. Wait for its result before answering.');
    let native: AnthropicAssistantTurn | null = null;
    let firstUsage = false;
    try {
      for await (const chunk of llm.streamMessages([system, user], null, { tools, tool_choice: { type: 'auto' } })) {
        if (chunk.providerNativeAssistantTurn) native = chunk.providerNativeAssistantTurn;
        if (chunk.is_complete && chunk.usage) firstUsage = true;
      }
    } catch (error) { throw safeStageError('AnthropicLLM streamed tool request', error); }
    const blocks = native?.blocks ?? [];
    const toolUses = blocks.filter(block => block.type === 'tool_use');
    const signed = blocks.some(block => block.type === 'thinking' && Boolean(block.signature));
    console.log('ANTHROPIC_LLM_FIRST', 'native_turn', Boolean(native), 'tool_count', toolUses.length,
      'signed_thinking', signed, 'block_types', blocks.map(block => block.type).join(','), 'usage', firstUsage);
    expect(native, 'provider did not emit a native tool turn').toBeTruthy();
    expect(toolUses, 'provider did not select tool under allowed auto choice').toHaveLength(1);
    expect(firstUsage, 'stream did not expose usage').toBe(true);
    const call = toolUses[0]!;
    if (call.type !== 'tool_use') throw new Error('Unexpected tool block type');
    const assistant = new Message(MessageRole.ASSISTANT, {
      content: blocks.filter(block => block.type === 'text').map(block => block.type === 'text' ? block.text : '').join(''),
      tool_payload: new ToolCallPayload([{ id: call.id, name: call.name, arguments: call.input }]),
      metadata: { [ANTHROPIC_ASSISTANT_TURN_KEY]: native },
    });
    const toolResult = new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload(call.id, call.name, { echoed: 'ping' }),
    });
    let result;
    try {
      result = await llm.sendMessages([system, user, assistant, toolResult], null, { tools, tool_choice: { type: 'auto' } });
    } catch (error) { throw safeStageError('AnthropicLLM signed tool continuation', error); }
    console.log('ANTHROPIC_LLM_CONTINUATION', 'content_nonempty', Boolean(result.content), 'usage', Boolean(result.usage));
    expect(result.content.length).toBeGreaterThan(0);
    expect(result.usage).toBeTruthy();
  }, 90000);
});
