// Live probe: Opus 5.5 streaming + adaptive thinking + small max_tokens + a forced-long write_file.
// Usage: node max-tokens-tool-use-probe.cjs <autobyteus-ts dir with node_modules> [max_tokens]
// Reads ANTHROPIC_API_KEY from ~/.autobyteus/server-data/.env without printing it.
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const sdkRequire = createRequire(path.join(process.argv[2], 'package.json'));
const Anthropic = sdkRequire('@anthropic-ai/sdk').default;
const maxTokens = Number(process.argv[3] ?? 400);
const envLine = readFileSync(path.join(process.env.HOME, '.autobyteus/server-data/.env'), 'utf8')
  .split('\n').find((l) => l.startsWith('ANTHROPIC_API_KEY='));
const apiKey = envLine.slice('ANTHROPIC_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '');
(async () => {
  const client = new Anthropic({ apiKey });
  const stream = await client.messages.create({
    model: 'claude-opus-5-5', max_tokens: maxTokens, stream: true, thinking: { type: 'adaptive' },
    tools: [{ name: 'write_file', description: 'Write a file.', input_schema: { type: 'object',
      properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } }],
    messages: [{ role: 'user', content: 'Call write_file right away (no preamble) with path "spec.md" and content: a 3000-word design document about caching. Put the full document in the content argument.' }],
  });
  const seen = []; let deltaCount = 0; let jsonChars = 0;
  for await (const e of stream) {
    if (e.type === 'content_block_delta') { deltaCount++; if (e.delta.type === 'input_json_delta') jsonChars += e.delta.partial_json.length; continue; }
    if (e.type === 'content_block_start') seen.push(`content_block_start #${e.index} ${e.content_block.type}`);
    else if (e.type === 'content_block_stop') seen.push(`content_block_stop #${e.index}`);
    else if (e.type === 'message_delta') seen.push(`message_delta stop_reason=${e.delta.stop_reason} output_tokens=${e.usage?.output_tokens}`);
    else seen.push(e.type);
  }
  console.log(JSON.stringify({ model: 'claude-opus-5-5', max_tokens: maxTokens, events: seen, deltaCount, inputJsonChars: jsonChars }, null, 2));
})().catch((e) => { console.error(String(e)); process.exit(1); });
