// Temporary API/E2E probe: candidate user prompts — does claude-opus-5-5 think at tool steps without refusing?
// Uses the run's captured system + tools (production shape), strict mode on, 3-step tool loop with real chunk data.
// Usage: ANTHROPIC_API_KEY=… node thinking-prompt-probe.mjs <calls-full.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
const [callsPath, outPath] = process.argv.slice(2);
const base = JSON.parse(readFileSync(callsPath, 'utf8'))[0].body;
const key = process.env.ANTHROPIC_API_KEY.trim();
const chunk = (n) => [`CODE: K${String(n).padStart(2, '0')}-${(n * 37) % 101}`, ...Array.from({ length: 24 }, (_, i) =>
  `Section ${i + 1}: component C${(n * 7 + i) % 23} depends on C${(n * 11 + i) % 19} with latency budget ${(n * 13 + i * 5) % 97} ms.`)]
  .map((line, i) => `${i + 1}: ${line}`).join('\n');
const candidates = {
  C1: 'Review the service dependency data in chunk-01.txt through chunk-12.txt, one file per tool call, in order. Before each next read, reason about which components seen so far form dependency cycles and which edge has the tightest latency budget. At the end, report the longest cycle you found.',
  C2: 'Audit chunk-01.txt through chunk-12.txt, one file per tool call, in order. After each file, carefully check whether any component depends on itself directly or through components seen in earlier files, and keep a running list of such cycles. At the end, reply with the cycles.',
};
const out = {};
for (const [name, prompt] of Object.entries(candidates)) {
  const messages = [{ role: 'user', content: prompt }];
  out[name] = [];
  for (let step = 0; step < 3; step += 1) {
    const body = { model: base.model, max_tokens: base.max_tokens, system: base.system, tools: base.tools, messages,
      thinking: { type: 'adaptive', display: 'summarized', block_binding: { prefix_mismatch_behavior: 'error' } } };
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', body: JSON.stringify(body), headers: {
      'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'thinking-binding-controls-2026-08-01' } });
    const json = await res.json();
    const blocks = (json.content ?? []).map((b) => b.type);
    out[name].push({ step, status: res.status, stop: json.stop_reason ?? null, blocks, error: json.error?.message ?? null });
    console.log(name, step, res.status, json.stop_reason, blocks.join(','));
    const uses = (json.content ?? []).filter((b) => b.type === 'tool_use');
    if (!uses.length) break;
    messages.push({ role: 'assistant', content: json.content });
    messages.push({ role: 'user', content: uses.map((u, i) => ({ type: 'tool_result', tool_use_id: u.id, content: chunk(step + 1 + i) })) });
  }
}
writeFileSync(outPath, JSON.stringify(out, null, 2));
