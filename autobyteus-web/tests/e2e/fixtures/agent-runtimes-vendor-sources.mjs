// Loaded into the probe's own backend with `node --import <this file> dist/app.js` (agent-runtimes-settings-probe.mjs).
// Answers the three vendor latest-version sources the Agent Runtimes page checks from $FAKE_VENDOR_SOURCES_FILE, read on
// every request, so the probe can make a source fail, slow or newer between checks. Every other URL uses the real fetch.
//   { "codex": { "status": 200, "body": "rust-v0.163.0", "delayMs": 0 }, "claude": {...}, "antigravity": {...} }
// Codex's source is github.com's latest-release page: a 200 answer is GitHub's redirect to the release tag named by
// `body` (the node reads the tag from the `location`); any other status is answered as configured.
import fs from 'node:fs';

const file = process.env.FAKE_VENDOR_SOURCES_FILE;
const realFetch = globalThis.fetch;
const sourceOf = (url) => {
  if (url === 'https://github.com/openai/codex/releases/latest') return 'codex';
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
  if (source === 'codex' && answer.status === 200) {
    return new Response(null, { status: 302, headers: { location: `https://github.com/openai/codex/releases/tag/${answer.body}` } });
  }
  return new Response(answer.body, { status: answer.status });
};
