// Test-only Node preload (autobyteus-627): emulate GitHub for one private repository and the token check, never
// GraphQL, filesystem owners or the renderer. Activated only in the browser probe's owned backend via --import and a
// private control file ({ accepted, archive, revision, archives? }). Requests are recorded without any credential value.
import fs from 'node:fs';
import path from 'node:path';
const control = process.env.GITHUB_PRIVATE_PROBE_CONTROL;
if (!control) throw new Error('This test fixture needs its owned control file');
const REPOSITORY = 'probe-org/private-pack';
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const github = url === 'https://api.github.com/user' || url.includes(REPOSITORY);
  if (!github) return original(input, init);
  const state = JSON.parse(fs.readFileSync(control, 'utf8'));
  const authorization = new Headers(init?.headers).get('authorization');
  const accepted = authorization === `Bearer ${state.accepted}`
    || authorization === `Basic ${Buffer.from(`x-access-token:${state.accepted}`).toString('base64')}`;
  fs.appendFileSync(path.join(path.dirname(control), 'upstream-requests.jsonl'),
    JSON.stringify({ url, credential: authorization ? (accepted ? 'accepted' : 'other') : 'none' }) + '\n');
  if (url === 'https://api.github.com/user') return accepted ? Response.json({ login: 'octo-dev' }) : new Response(null, { status: 401 });
  if (url === `https://github.com/${REPOSITORY}.git/git-upload-pack`) {
    if (!accepted) return new Response(null, { status: 401 });
    const line = `${state.revision} HEAD symref-target:refs/heads/main\n`;
    return new Response(`${(Buffer.byteLength(line) + 4).toString(16).padStart(4, '0')}${line}0000`);
  }
  if (!accepted) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
  if (url === `https://api.github.com/repos/${REPOSITORY}`) {
    return Response.json({ owner: { login: 'probe-org' }, name: 'private-pack', default_branch: 'main', html_url: `https://github.com/${REPOSITORY}`, private: true });
  }
  if (url === `https://api.github.com/repos/${REPOSITORY}/branches/main`) return Response.json({ commit: { sha: state.revision } });
  // Any published commit's archive (`archives`: revision → file), as GitHub serves every commit; `archive` is `revision`'s.
  const codeload = new RegExp(`^https://codeload\\.github\\.com/${REPOSITORY}/tar\\.gz/([0-9a-f]{40})$`).exec(url);
  const archive = codeload ? (state.archives?.[codeload[1]] ?? (codeload[1] === state.revision ? state.archive : null)) : null;
  if (archive) return new Response(fs.readFileSync(archive));
  throw new Error(`Unexpected fixture request ${url}`);
};
