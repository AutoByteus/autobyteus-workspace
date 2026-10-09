// Disposable investigation probe (solution designer, 2026-10-09).
// Compares caching strategies on a realistic multi-turn tool loop with thinking on claude-opus-5-5.
// Run from a directory where '@anthropic-ai/sdk' resolves (e.g. copy into autobyteus-ts/):
//   node strategy-probe.mjs <out.json>
// The API key is read in-process from the server .env and never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const key = readFileSync('/Users/normy/.autobyteus/server-data/.env', 'utf8').split('\n')
  .find((l) => l.startsWith('ANTHROPIC_API_KEY=')).slice('ANTHROPIC_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
const client = new Anthropic({ apiKey: key });
const MODEL = 'claude-opus-5-5';
const PRICE = { input: 4, read: 0.2, w5: 5, w1: 8, output: 20 };
const TTL = '1h';

const SYSTEM_TEXT = [
  'You are an engineering agent working through files with tools. Think carefully before each step.',
  ...Array.from({ length: 80 }, (_, i) => `Guideline ${i + 1}: verify facts with the read_chunk tool before concluding, keep final answers to one sentence.`),
].join('\n');
const TOOLS = [{
  name: 'read_chunk',
  description: 'Read one numbered chunk of the design document. Call it once per chunk; chunks are numbered from 1.',
  input_schema: { type: 'object', properties: { n: { type: 'integer' } }, required: ['n'], additionalProperties: false },
}];
const chunk = (n) => `Chunk ${n}. ` + Array.from({ length: 60 }, (_, i) =>
  `Section ${n}.${i + 1}: component C${(n * 7 + i) % 23} depends on C${(n * 11 + i) % 19} with latency budget ${(n * 13 + i) % 97} ms.`).join(' ');

const TURNS = [
  'Read chunks 1 through 5, one tool call at a time, then state which component appears most often as a dependency.',
  'Now read chunks 6 through 10 the same way and state the largest latency budget you saw in them.',
  'Finally read chunks 11 through 14 the same way and say whether C3 depends on C5 anywhere in them.',
];

const stripThinking = (messages) => messages.map((m) => m.role === 'assistant' && Array.isArray(m.content)
  ? { ...m, content: m.content.filter((b) => b.type !== 'thinking' && b.type !== 'redacted_thinking') }
  : m);

const withoutMarkers = (messages) => messages.map((m) => Array.isArray(m.content)
  ? { ...m, content: m.content.map(({ cache_control, ...rest }) => rest) } : m);

async function runStrategy(name, { strip, markPreviousTurnStart, dropReplyThinking = false }) {
  let history = [];
  const calls = [];
  const userTurnIndexes = [];
  for (const [turnIndex, text] of TURNS.entries()) {
    if (strip && turnIndex > 0) history = stripThinking(history);
    userTurnIndexes.push(history.length);
    history.push({ role: 'user', content: [{ type: 'text', text }] });
    for (let step = 0; step < 12; step += 1) {
      let messages = withoutMarkers(history);
      if (markPreviousTurnStart && userTurnIndexes.length > 1) {
        const idx = userTurnIndexes[userTurnIndexes.length - 2];
        const m = messages[idx];
        messages[idx] = { ...m, content: m.content.map((b, i, all) => i === all.length - 1 ? { ...b, cache_control: { type: 'ephemeral', ttl: TTL } } : b) };
      }
      const res = await client.beta.messages.create({
        model: MODEL, max_tokens: 4000,
        betas: ['thinking-binding-controls-2026-08-01'],
        thinking: { type: 'adaptive', display: 'summarized', block_binding: { prefix_mismatch_behavior: 'error' } },
        output_config: { effort: 'high' },
        system: [{ type: 'text', text: SYSTEM_TEXT, cache_control: { type: 'ephemeral', ttl: TTL } }],
        tools: TOOLS,
        cache_control: { type: 'ephemeral', ttl: TTL },
        messages,
      });
      const u = res.usage;
      calls.push({ turn: turnIndex + 1, step, stop: res.stop_reason,
        blocks: res.content.map((b) => b.type),
        input: u.input_tokens, read: u.cache_read_input_tokens, write: u.cache_creation_input_tokens,
        w5: u.cache_creation?.ephemeral_5m_input_tokens ?? 0, w1: u.cache_creation?.ephemeral_1h_input_tokens ?? 0,
        output: u.output_tokens, transformations: res.input_transformations ?? null });
      const uses = res.content.filter((b) => b.type === 'tool_use');
      history.push({ role: 'assistant', content: (!uses.length && dropReplyThinking)
        ? res.content.filter((b) => b.type !== 'thinking' && b.type !== 'redacted_thinking') : res.content });
      if (!uses.length) break;
      history.push({ role: 'user', content: uses.map((b) => ({ type: 'tool_result', tool_use_id: b.id, content: chunk(Number(b.input.n) || 0) })) });
    }
  }
  const t = calls.reduce((a, c) => ({ input: a.input + c.input, read: a.read + c.read, w5: a.w5 + c.w5, w1: a.w1 + c.w1, output: a.output + c.output }),
    { input: 0, read: 0, w5: 0, w1: 0, output: 0 });
  const gross = t.input + t.read + t.w5 + t.w1;
  const inputCost = (t.input * PRICE.input + t.read * PRICE.read + t.w5 * PRICE.w5 + t.w1 * PRICE.w1) / 1e6;
  const uncachedEquivalent = gross * PRICE.input / 1e6;
  return { name, calls, totals: { ...t, gross, hitPct: +(100 * t.read / gross).toFixed(1),
    inputCost: +inputCost.toFixed(4), uncachedInputCost: +uncachedEquivalent.toFixed(4) } };
}

const out = { model: MODEL, ttl: TTL, at: new Date().toISOString(), strategies: [] };
const only = process.argv[3];
for (const [name, opts] of [
  ['S1 strip + system/auto markers', { strip: true, markPreviousTurnStart: false }],
  ['S2 strip + system/auto + previous-turn-start marker', { strip: true, markPreviousTurnStart: true }],
  ['S3 append-only (no strip) + system/auto markers', { strip: false, markPreviousTurnStart: false }],
  ['S4 no strip, text-only replies stored without thinking (as today)', { strip: false, markPreviousTurnStart: false, dropReplyThinking: true }],
].filter(([n]) => !only || n.startsWith(only))) {
  try { out.strategies.push(await runStrategy(name, opts)); }
  catch (e) { out.strategies.push({ name, error: String(e?.message ?? e).slice(0, 800) }); }
  writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
}
for (const s of out.strategies) console.log(s.name, s.error ? `ERROR ${s.error}` : JSON.stringify(s.totals));
