// Disposable investigation probe (solution designer, 2026-10-09): can native compaction reuse the conversation cache?
// Builds a multi-turn Opus 5.5 conversation the way the delivered native runtime sends it
// (1h system breakpoint + top-level automatic 1h caching, adaptive thinking, tools, text-only replies stored without thinking),
// then compares three summary requests:
//   A  current strategy: separate call, system = compaction prompt, user = rendered history text (no cache markers)
//   F1 fork: same system/tools/thinking/messages as the conversation + appended user summarize instruction, tool_choice unchanged
//   F2 fork with tool_choice {type:'none'}
// Strict preserved-thinking check on ("error"). Run where '@anthropic-ai/sdk' resolves: node fork-summary-probe.mjs <out.json> <promptFile>
import { readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const key = readFileSync('/Users/normy/.autobyteus/server-data/.env', 'utf8').split('\n')
  .find((l) => l.startsWith('ANTHROPIC_API_KEY=')).slice('ANTHROPIC_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
const client = new Anthropic({ apiKey: key });
const MODEL = 'claude-opus-5-5';
const COMPACTION_PROMPT = readFileSync(process.argv[3], 'utf8');
const H = { type: 'ephemeral', ttl: '1h' };
const SYSTEM_TEXT = ['You are a software engineering agent working in a repository through tools. Think before acting.',
  ...Array.from({ length: 70 }, (_, i) => `Working rule ${i + 1}: read files with read_file before changing them, and report exact paths and results.`)].join('\n');
const TOOLS = [
  { name: 'read_file', description: 'Read a repository file by path.', input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false } },
  { name: 'run_tests', description: 'Run the test suite for a package and return the summary.', input_schema: { type: 'object', properties: { pkg: { type: 'string' } }, required: ['pkg'], additionalProperties: false } },
];
const fileBody = (p) => `// ${p}\n` + Array.from({ length: 45 }, (_, i) => `export const value${i} = computeBudget('${p}', ${i}); // retries=${i % 4}, timeoutMs=${(i * 250) % 3000}`).join('\n');
const toolResult = (u) => u.name === 'read_file' ? fileBody(u.input.path) : `pkg ${u.input.pkg}: 412 passed, 1 failed (retry-options.test.ts: expected 3 retries, got 2)`;
const TURNS = [
  'We need to fix the retry budget bug. Read src/net/retry.ts and src/net/budget.ts, then tell me which one computes retries.',
  'Now run the tests for package core and tell me what fails. Do not fix anything yet.',
  'Decision: keep maxRetries=3 as the default and make the budget respect it. Read src/net/config.ts and summarize what needs to change, in 3 bullets.',
];
const base = { model: MODEL, max_tokens: 6000, betas: ['thinking-binding-controls-2026-08-01'],
  thinking: { type: 'adaptive', block_binding: { prefix_mismatch_behavior: 'error' } } };
const pick = (u) => ({ input: u.input_tokens, read: u.cache_read_input_tokens, write: u.cache_creation_input_tokens, output: u.output_tokens });
const system = [{ type: 'text', text: SYSTEM_TEXT, cache_control: H }];

const out = { at: new Date().toISOString(), conversation: [], results: [] };
const history = [];
for (const turn of TURNS) {
  history.push({ role: 'user', content: turn });
  for (let i = 0; i < 6; i += 1) {
    const r = await client.beta.messages.create({ ...base, system, tools: TOOLS, cache_control: H, messages: history });
    out.conversation.push({ blocks: r.content.map((b) => b.type), usage: pick(r.usage) });
    const uses = r.content.filter((b) => b.type === 'tool_use');
    // Runtime storage: tool-bearing turns keep native blocks; text-only replies are stored as text without thinking.
    history.push({ role: 'assistant', content: uses.length ? r.content : r.content.filter((b) => b.type === 'text') });
    if (!uses.length) break;
    history.push({ role: 'user', content: uses.map((u) => ({ type: 'tool_result', tool_use_id: u.id, content: toolResult(u) })) });
  }
}

const summaryMarkers = (text) => (text.match(/<compaction_summary>/g) || []).length === 1 && (text.match(/<\/compaction_summary>/g) || []).length === 1;
const headingsOk = (text) => ['Goal and constraints', 'Decisions and findings', 'Completed work', 'Current state', 'Open work and next steps', 'Essential references']
  .every((h) => text.includes(`## ${h}`));
const report = (label, r) => {
  const text = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const toolCalls = r.content.filter((b) => b.type === 'tool_use').length;
  return { label, stop: r.stop_reason, usage: pick(r.usage), toolCalls, markers: summaryMarkers(text), headings: headingsOk(text), textChars: text.length, text };
};
const forkInstruction = `${COMPACTION_PROMPT}\n\nApply the instructions above now to this entire conversation so far (everything before this message). Do not call any tools and do not continue the task; reply only with the summary block.`;

// Fork variants first, while the conversation cache is warm.
try {
  const f1 = await client.beta.messages.create({ ...base, system, tools: TOOLS, cache_control: H,
    messages: [...history, { role: 'user', content: forkInstruction }] });
  out.results.push(report('F1 fork, tool_choice unchanged', f1));
} catch (e) { out.results.push({ label: 'F1', error: String(e?.message ?? e).slice(0, 500) }); }
try {
  const f2 = await client.beta.messages.create({ ...base, system, tools: TOOLS, tool_choice: { type: 'none' }, cache_control: H,
    messages: [...history, { role: 'user', content: forkInstruction }] });
  out.results.push(report('F2 fork, tool_choice none', f2));
} catch (e) { out.results.push({ label: 'F2', error: String(e?.message ?? e).slice(0, 500) }); }

// Current strategy: rendered transcript text under the compaction system prompt, no markers.
const render = (m) => {
  if (typeof m.content === 'string') return `[${m.role}] ${m.content}`;
  return m.content.map((b) => b.type === 'text' ? `[${m.role}] ${b.text}`
    : b.type === 'tool_use' ? `[tool_call ${b.name}] ${JSON.stringify(b.input)}`
    : b.type === 'tool_result' ? `[tool_result] ${b.content}` : '').filter(Boolean).join('\n');
};
const transcript = history.map(render).join('\n');
try {
  const a = await client.messages.create({ model: MODEL, max_tokens: 6000, system: COMPACTION_PROMPT,
    messages: [{ role: 'user', content: `Here is the conversation history of the target agent.\n---- START ----\n${transcript}\n---- END ----` }] });
  out.results.push(report('A current separate summarizer', a));
} catch (e) { out.results.push({ label: 'A', error: String(e?.message ?? e).slice(0, 500) }); }

writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
for (const r of out.results) console.log(r.label, r.error ?? JSON.stringify({ ...r, text: undefined }));
