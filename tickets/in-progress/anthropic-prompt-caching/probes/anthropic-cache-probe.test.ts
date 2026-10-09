/**
 * Disposable investigation probe (solution designer, 2026-10-09).
 * Live Anthropic calls on claude-opus-5-5; costs well under $0.10.
 *
 * Run (key is read in-process from the server .env and never printed):
 *   cp <this file> autobyteus-ts/tests/_probe/ && \
 *   RUN_ANTHROPIC_CACHE_PROBE=1 PROBE_OUT=<json path> \
 *   pnpm -C autobyteus-ts exec vitest run tests/_probe/anthropic-cache-probe.test.ts --no-watch
 *
 * A: current production AnthropicLLM request shape, two sequential requests with
 *    an identical system+tools prefix -> are cache fields 0?
 * B: same prefix through the SDK with an explicit breakpoint on the last system
 *    block plus top-level automatic caching, growing conversation -> reads > 0?
 * C: tool cycle with signed thinking, then the production all-block thinking strip
 *    before the next independent turn -> where does the read stop?
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { AnthropicLLM } from '../../src/llm/api/anthropic-llm.js';
import { LLMModel } from '../../src/llm/models.js';
import { LLMProvider } from '../../src/llm/providers.js';
import { LLMConfig } from '../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../src/llm/utils/messages.js';
import { SecretValue } from '../../src/secrets/secret-value.js';

const ENV_PATH = '/Users/normy/.autobyteus/server-data/.env';
const MODEL = 'claude-opus-5-5';

const loadKey = (): string => {
  const line = readFileSync(ENV_PATH, 'utf8').split('\n').find((l) => l.startsWith('ANTHROPIC_API_KEY='));
  if (!line) throw new Error('ANTHROPIC_API_KEY not found');
  return line.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
};

// ~2.5k-token deterministic system prompt (well above the 512-token Opus 5.5 minimum).
const SYSTEM = [
  'You are a careful engineering assistant used in a prompt-caching probe.',
  ...Array.from({ length: 120 }, (_, i) =>
    `Rule ${i + 1}: When handling item ${i + 1}, keep answers short, cite the rule number, and never invent file paths or results.`),
].join('\n');

const TOOLS: Anthropic.Tool[] = [{
  name: 'lookup_fact',
  description: 'Look up a short fact by key. Always use this tool when the user asks for a fact key.',
  input_schema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'], additionalProperties: false },
}];

const pickUsage = (u: any) => ({
  input_tokens: u?.input_tokens ?? null,
  cache_creation_input_tokens: u?.cache_creation_input_tokens ?? null,
  cache_read_input_tokens: u?.cache_read_input_tokens ?? null,
  cache_creation: u?.cache_creation ?? null,
  output_tokens: u?.output_tokens ?? null,
});

const run = process.env.RUN_ANTHROPIC_CACHE_PROBE === '1' ? describe : describe.skip;

run('Anthropic prompt-cache probe', () => {
  it('records current vs cached behavior', async () => {
    const key = loadKey();
    const out: Record<string, unknown> = { model: MODEL, at: new Date().toISOString() };

    // A: production adapter, current behavior.
    const llm = new AnthropicLLM(
      new LLMModel({ name: MODEL, value: MODEL, canonicalName: MODEL, provider: LLMProvider.ANTHROPIC }),
      new LLMConfig({ maxTokens: 64 }),
      { resolve: async () => SecretValue.fromString(key) },
    );
    const a: unknown[] = [];
    for (const question of ['Reply with the single word: alpha.', 'Reply with the single word: beta.']) {
      const res = await llm.sendMessages(
        [new Message(MessageRole.SYSTEM, { content: SYSTEM }), new Message(MessageRole.USER, { content: question })],
        null,
        { tools: TOOLS },
      );
      a.push({ question, rawUsage: res.usage?.rawUsage ?? null, observation: res.usage ?? null });
    }
    out.A_current_production = a;

    const client = new Anthropic({ apiKey: key });
    const system: Anthropic.TextBlockParam[] = [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }];

    // B: explicit system breakpoint + top-level automatic caching, growing conversation.
    const b: unknown[] = [];
    const history: Anthropic.MessageParam[] = [];
    for (const question of ['Reply with the single word: gamma.', 'Reply with the single word: delta.', 'Reply with the single word: epsilon.']) {
      history.push({ role: 'user', content: question });
      const res = await client.messages.create({
        model: MODEL, max_tokens: 64, thinking: { type: 'adaptive' }, system, tools: TOOLS,
        messages: history, cache_control: { type: 'ephemeral' },
      } as any);
      b.push({ question, usage: pickUsage(res.usage) });
      history.push({ role: 'assistant', content: res.content as any });
    }
    out.B_cached_conversation = b;

    // C: tool cycle with thinking, then strip thinking before the next independent turn.
    const c: unknown[] = [];
    const conv: Anthropic.MessageParam[] = [{ role: 'user', content: 'Use lookup_fact with key "color", then tell me the value in one word.' }];
    const r1 = await client.messages.create({ model: MODEL, max_tokens: 512, thinking: { type: 'adaptive', display: 'summarized' }, system, tools: TOOLS, messages: conv, cache_control: { type: 'ephemeral' } } as any);
    c.push({ step: 'C1 tool request', stop: r1.stop_reason, blocks: r1.content.map((x: any) => x.type), usage: pickUsage(r1.usage) });
    const toolUse = r1.content.find((x: any) => x.type === 'tool_use') as any;
    if (toolUse) {
      conv.push({ role: 'assistant', content: r1.content as any });
      conv.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUse.id, content: 'blue' }] });
      const r2 = await client.messages.create({ model: MODEL, max_tokens: 256, thinking: { type: 'adaptive', display: 'summarized' }, system, tools: TOOLS, messages: conv, cache_control: { type: 'ephemeral' } } as any);
      c.push({ step: 'C2 tool continuation (append-only)', stop: r2.stop_reason, blocks: r2.content.map((x: any) => x.type), usage: pickUsage(r2.usage) });
      conv.push({ role: 'assistant', content: r2.content as any });
      // Production behavior at the next independent turn: remove all thinking blocks from prior assistant turns.
      const stripped = conv.map((m) => m.role === 'assistant' && Array.isArray(m.content)
        ? { ...m, content: (m.content as any[]).filter((x) => x.type !== 'thinking' && x.type !== 'redacted_thinking') }
        : m);
      stripped.push({ role: 'user', content: 'Thanks. Reply with the single word: done.' });
      const r3 = await client.messages.create({ model: MODEL, max_tokens: 256, thinking: { type: 'adaptive', display: 'summarized' }, system, tools: TOOLS, messages: stripped, cache_control: { type: 'ephemeral' } } as any);
      c.push({ step: 'C3 next independent turn after thinking strip', stop: r3.stop_reason, usage: pickUsage(r3.usage) });
    }
    out.C_tool_cycle_and_strip = c;

    if (process.env.PROBE_OUT) writeFileSync(process.env.PROBE_OUT, JSON.stringify(out, null, 2));
    expect(a.length).toBe(2);
  }, 300_000);
});
