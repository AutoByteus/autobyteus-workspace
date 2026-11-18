// Loaded into the probe's own backend with `node --import <this file> dist/app.js` (model-routing-settings-probe.mjs).
// Answers the AutoByteus providers' usage endpoints (DeepSeek balance, Kimi balance, Anthropic count_tokens, xAI api-key)
// from $FAKE_PROVIDER_USAGE_FILE, read on every request, so the probe can change an answer between checks:
//   { "<url>": { "status": 200, "body": { ... } }, ... }
// Every other outside URL is refused (503) and recorded, so the node stays offline; localhost passes through.
// Each request is recorded in $FAKE_PROVIDER_USAGE_FILE.requests.log as `<METHOD> <url>` (never a header or key).
import fs from 'node:fs';

const file = process.env.FAKE_PROVIDER_USAGE_FILE;
const realFetch = globalThis.fetch;

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const host = new URL(url).hostname;
  if (!file || host === '127.0.0.1' || host === 'localhost') return realFetch(input, init);
  const answer = JSON.parse(fs.readFileSync(file, 'utf8'))[url];
  fs.appendFileSync(`${file}.requests.log`, `${answer ? '' : 'REFUSED '}${init?.method ?? 'GET'} ${url}\n`);
  if (!answer) return new Response('offline probe node', { status: 503 });
  return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'content-type': 'application/json' } });
};
