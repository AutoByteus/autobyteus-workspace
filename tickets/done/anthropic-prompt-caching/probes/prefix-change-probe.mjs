// Disposable probe (solution designer, 2026-10-09) for ARCH-001 / ARCH-003.
// With Opus 5.5 thinking kept and the strict preserved-thinking check on ("error"):
//  P1: system sent as a string in the request that minted thinking, then as a TextBlockParam[] -> accepted?
//  P2: a tool definition changes after thinking was minted -> 400?
//  P3: same as P2 but all thinking blocks stripped once -> accepted?
// Run from a directory where '@anthropic-ai/sdk' resolves:  node prefix-change-probe.mjs <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const key = readFileSync('/Users/normy/.autobyteus/server-data/.env', 'utf8').split('\n')
  .find((l) => l.startsWith('ANTHROPIC_API_KEY=')).slice('ANTHROPIC_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
const client = new Anthropic({ apiKey: key });
const SYSTEM = ['You are an engineering agent. Think before acting.',
  ...Array.from({ length: 60 }, (_, i) => `Guideline ${i + 1}: verify with tools; answer in one sentence.`)].join('\n');
const tool = (description) => [{ name: 'read_chunk', description,
  input_schema: { type: 'object', properties: { n: { type: 'integer' } }, required: ['n'], additionalProperties: false } }];
const TOOLS_A = tool('Read one numbered chunk of the design document (model: media-a).');
const TOOLS_B = tool('Read one numbered chunk of the design document (model: media-b).');
const chunk = (n) => `Chunk ${n}: component C${n} depends on C${n + 3} with latency ${n * 7} ms.`;
const base = {
  model: 'claude-opus-5-5', max_tokens: 2000, betas: ['thinking-binding-controls-2026-08-01'],
  thinking: { type: 'adaptive', display: 'summarized', block_binding: { prefix_mismatch_behavior: 'error' } },
  output_config: { effort: 'high' },
};
const strip = (msgs) => msgs.map((m) => m.role === 'assistant' && Array.isArray(m.content)
  ? { ...m, content: m.content.filter((b) => b.type !== 'thinking' && b.type !== 'redacted_thinking') } : m);
const hasThinking = (msgs) => msgs.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'thinking'));

async function mintHistory(system, tools) {
  const msgs = [{ role: 'user', content: 'Think carefully, then read chunk 2 with the tool, then reply with its latency.' }];
  for (let i = 0; i < 4; i += 1) {
    const r = await client.beta.messages.create({ ...base, system, tools, messages: msgs });
    msgs.push({ role: 'assistant', content: r.content });
    const uses = r.content.filter((b) => b.type === 'tool_use');
    if (!uses.length) break;
    msgs.push({ role: 'user', content: uses.map((u) => ({ type: 'tool_result', tool_use_id: u.id, content: chunk(Number(u.input.n) || 0) })) });
  }
  msgs.push({ role: 'user', content: 'Now reply with the single word: ok.' });
  return msgs;
}
async function attempt(label, params) {
  try {
    const r = await client.beta.messages.create({ ...base, ...params });
    return { label, ok: true, stop: r.stop_reason, transformations: r.input_transformations ?? null, read: r.usage.cache_read_input_tokens };
  } catch (e) { return { label, ok: false, status: e?.status ?? null, error: String(e?.message ?? e).slice(0, 400) }; }
}

const out = { at: new Date().toISOString(), results: [] };
const h1 = await mintHistory(SYSTEM, TOOLS_A);
out.historyHasThinking = hasThinking(h1);
out.results.push(await attempt('P1 system string -> TextBlockParam[] (+cache_control)', {
  system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral', ttl: '1h' } }], tools: TOOLS_A, messages: h1,
  cache_control: { type: 'ephemeral', ttl: '1h' } }));
out.results.push(await attempt('P2 tool description changed, thinking kept', { system: SYSTEM, tools: TOOLS_B, messages: h1 }));
out.results.push(await attempt('P3 tool description changed, all thinking stripped once', { system: SYSTEM, tools: TOOLS_B, messages: strip(h1) }));
out.results.push(await attempt('P4 control: unchanged prefix, thinking kept', { system: SYSTEM, tools: TOOLS_A, messages: h1 }));
writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
