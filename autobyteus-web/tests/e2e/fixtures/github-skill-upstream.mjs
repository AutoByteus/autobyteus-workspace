// Test-only Node preload: emulate GitHub, never GraphQL, filesystem owners, or renderer.
// Activated only in the browser probe's owned child via --import and a private control file.
import fs from 'node:fs';
import path from 'node:path';
const control = process.env.SKILL_SOURCE_PROBE_CONTROL;
if (!control) throw new Error('This test fixture needs its owned control file');
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith('https://api.github.com/repos/api-e2e/skills') || url.startsWith('https://codeload.github.com/api-e2e/skills/')) {
    const state = JSON.parse(fs.readFileSync(control, 'utf8'));
    fs.appendFileSync(path.join(path.dirname(control), 'upstream-requests.jsonl'), JSON.stringify({ url, revision: state.revision, fail: state.fail }) + '\n');
    if (state.fail) throw new Error('Fixture GitHub temporarily unavailable');
    if (url.endsWith('/branches/main')) return Response.json({ commit: { sha: state.revision } });
    if (url === 'https://api.github.com/repos/api-e2e/skills') return Response.json({ owner: { login: 'api-e2e' }, name: 'skills', private: false, default_branch: 'main' });
    if (url === `https://codeload.github.com/api-e2e/skills/tar.gz/${state.revision}`) {
      // Interrupted download: the owner kills only its backend after observing this request.
      while (JSON.parse(fs.readFileSync(control, 'utf8')).holdArchive) await new Promise(resolve => setTimeout(resolve, 50));
      return new Response(fs.readFileSync(state.archive));
    }
    throw new Error(`Unexpected fixture request ${url}`);
  }
  return original(input, init);
};
