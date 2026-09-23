import type { RawMessageStreamEvent } from '@anthropic-ai/sdk/resources/messages/messages.js';
import { parseAnthropicAssistantTurn, type AnthropicAssistantTurn } from '../utils/provider-native-assistant-turn.js';

type BlockState = {
  type: string;
  text?: string;
  thinking?: string;
  signature?: string;
  data?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  inputJson?: string;
  stopped: boolean;
};

export class AnthropicAssistantTurnAssembler {
  private readonly blocks = new Map<number, BlockState>();

  accept(event: RawMessageStreamEvent): void {
    if (event.type === 'content_block_start') {
      if (this.blocks.has(event.index)) throw new Error('Duplicate Anthropic content block index.');
      const block = event.content_block as unknown as Record<string, unknown>;
      this.blocks.set(event.index, {
        type: String(block.type),
        ...(typeof block.text === 'string' ? { text: block.text } : {}),
        ...(typeof block.thinking === 'string' ? { thinking: block.thinking } : {}),
        ...(typeof block.signature === 'string' ? { signature: block.signature } : {}),
        ...(typeof block.data === 'string' ? { data: block.data } : {}),
        ...(typeof block.id === 'string' ? { id: block.id } : {}),
        ...(typeof block.name === 'string' ? { name: block.name } : {}),
        ...(block.input && typeof block.input === 'object' && !Array.isArray(block.input) ? { input: block.input as Record<string, unknown> } : {}),
        stopped: false,
      });
    } else if (event.type === 'content_block_delta') {
      const block = this.blocks.get(event.index);
      if (!block || block.stopped) throw new Error('Anthropic content delta has no open block.');
      const delta = event.delta;
      if (delta.type === 'text_delta') block.text = (block.text ?? '') + delta.text;
      if (delta.type === 'thinking_delta') block.thinking = (block.thinking ?? '') + delta.thinking;
      if (delta.type === 'signature_delta') block.signature = (block.signature ?? '') + delta.signature;
      if (delta.type === 'input_json_delta') block.inputJson = (block.inputJson ?? '') + delta.partial_json;
    } else if (event.type === 'content_block_stop') {
      const block = this.blocks.get(event.index);
      if (!block || block.stopped) throw new Error('Anthropic content block stop has no open block.');
      block.stopped = true;
      if (block.type === 'tool_use' && block.inputJson) {
        const parsed: unknown = JSON.parse(block.inputJson);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid Anthropic tool input JSON.');
        block.input = parsed as Record<string, unknown>;
      }
    }
  }

  complete(): AnthropicAssistantTurn | null {
    if (!this.blocks.size) return null;
    const indexes = [...this.blocks.keys()].sort((a, b) => a - b);
    if (indexes.some((index, position) => index !== position)) throw new Error('Anthropic content blocks are not contiguous.');
    const blocks = indexes.map((index) => {
      const block = this.blocks.get(index)!;
      if (!block.stopped) throw new Error('Anthropic content block is incomplete.');
      if (block.type === 'text') return { type: 'text', text: block.text ?? '' };
      if (block.type === 'thinking') return { type: 'thinking', thinking: block.thinking ?? '', signature: block.signature };
      if (block.type === 'redacted_thinking') return { type: 'redacted_thinking', data: block.data };
      if (block.type === 'tool_use') return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
      throw new Error(`Unsupported Anthropic content block type '${block.type}'.`);
    });
    return parseAnthropicAssistantTurn({ provider: 'anthropic', blocks });
  }
}
