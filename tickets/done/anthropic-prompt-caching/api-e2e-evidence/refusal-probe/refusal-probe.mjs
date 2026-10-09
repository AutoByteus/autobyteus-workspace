// Temporary API/E2E probe: which part of the run-3 first request triggers stop_reason "refusal" on claude-opus-5-5?
// Usage: ANTHROPIC_API_KEY=… node refusal-probe.mjs <calls-full.json> <out.json>   (key never printed)
import { readFileSync, writeFileSync } from 'node:fs';
const [callsPath, outPath] = process.argv.slice(2);
const base = JSON.parse(readFileSync(callsPath, 'utf8'))[0].body;
const key = process.env.ANTHROPIC_API_KEY.trim();
const strip = ({ cache_control, stream, ...rest }) => rest;
const RUN1_PROMPT = 'Read chunk-01.txt through chunk-12.txt, one file per tool call, in order. Then reply with the CODE values of chunk-01.txt and chunk-12.txt.';
const variants = {
  'V1 captured + strict': { body: strip(base), strict: true },
  'V2 captured, no strict': { body: strip(base), strict: false },
  'V3 no summarized display, strict': { body: { ...strip(base), thinking: { type: 'adaptive' } }, strict: true },
  'V4 run-1 prompt + summarized, strict': { body: { ...strip(base), messages: [{ role: 'user', content: RUN1_PROMPT }] }, strict: true },
};
const out = {};
for (const [name, { body, strict }] of Object.entries(variants)) {
  const sent = strict ? { ...body, thinking: { ...body.thinking, block_binding: { prefix_mismatch_behavior: 'error' } } } : body;
  const headers = { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01',
    ...(strict ? { 'anthropic-beta': 'thinking-binding-controls-2026-08-01' } : {}) };
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(sent) });
  const json = await res.json();
  out[name] = { status: res.status, stop_reason: json.stop_reason ?? null, blocks: (json.content ?? []).map((b) => b.type),
    output_tokens: json.usage?.output_tokens ?? null, error: json.error?.message ?? null };
  console.log(name, JSON.stringify(out[name]));
}
writeFileSync(outPath, JSON.stringify(out, null, 2));
