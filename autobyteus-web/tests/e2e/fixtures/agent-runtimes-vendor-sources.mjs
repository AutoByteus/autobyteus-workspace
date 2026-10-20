// Loaded into the probe's own backend with `node --import <this file> dist/app.js` (agent-runtimes-settings-probe.mjs).
// Answers the three vendor latest-version sources the Agent Runtimes page checks from $FAKE_VENDOR_SOURCES_FILE, read on
// every request, so the probe can make a source fail, slow or newer between checks. Every other URL uses the real fetch.
//   { "codex": { "status": 200, "body": "...", "delayMs": 0 }, "claude": {...}, "antigravity": {...} }
import fs from 'node:fs';

const file = process.env.FAKE_VENDOR_SOURCES_FILE;
const realFetch = globalThis.fetch;
const sourceOf = (url) => {
  if (url === 'https://api.github.com/repos/openai/codex/releases/latest') return 'codex';
  if (url.startsWith('https://downloads.claude.ai/claude-code-releases/')) return 'claude';
  if (url.startsWith('https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/')) return 'antigravity';
  return null;
};

globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const source = file ? sourceOf(url) : null;
  if (!source) return realFetch(input, init);
  const answer = JSON.parse(fs.readFileSync(file, 'utf8'))[source];
  fs.appendFileSync(`${file}.requests.log`, `${source} ${url}\n`);
  if (answer.delayMs) await new Promise((resolve) => setTimeout(resolve, answer.delayMs));
  return new Response(answer.body, { status: answer.status });
};
