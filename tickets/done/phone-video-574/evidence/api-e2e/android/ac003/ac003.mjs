// Temporary check (autobyteus-574 API/E2E, AC-003 refusal on Android): the page posts `playVideo` requests straight to
// the app's bridge (window.AutoByteusShell) with the phone's real credential (read inside the page, never leaving it).
// A listener on another origin (a host port the emulator reaches as 10.0.2.2) records any request; the stack's proxy log
// records any request to the node; `dumpsys` counts VideoPlayerActivity. A valid /rest/files/ URL is the positive control.
import http from 'node:http';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const info = JSON.parse(fs.readFileSync('/tmp/api574/stack-android/stack-info.json', 'utf8'));
const serial = 'emulator-5580';
const origin = info.phoneOrigin.replace(/\/$/, '');
const control = `http://127.0.0.1:${info.controlPort}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const foreign = [];
const listener = http.createServer((request, response) => {
  foreign.push({ method: request.method, path: request.url, hasAuthorization: Boolean(request.headers.authorization) });
  response.writeHead(404).end();
});
await new Promise((resolve) => listener.listen(0, '0.0.0.0', resolve));
const foreignOrigin = `http://10.0.2.2:${listener.address().port}`;

const players = () => (execFileSync('adb', ['-s', serial, 'shell', 'dumpsys', 'activity', 'activities']).toString()
  .match(/\* ActivityRecord\{[^}]*VideoPlayerActivity/g) ?? []).length;
const step = (expression) => JSON.parse(execFileSync('node', ['/tmp/api574/scripts/android-step.mjs', 'eval', expression]).toString());
const post = (url) => step(`(() => { const s = JSON.parse(localStorage.getItem('autobyteus.remote_access.mobile_session')); window.AutoByteusShell.postMessage(JSON.stringify({ type: 'playVideo', url: ${JSON.stringify(url)}, title: 'probe-574.mp4', credential: s.credential })); return true; })()`);
const nodeLog = async (since) => {
  const body = await (await fetch(`${control}/log?since=${since}`)).json();
  return (Array.isArray(body) ? body : body.entries).filter((entry) => !entry.path.startsWith('/ws/') && entry.path !== '/favicon.ico')
    .map((entry) => ({ path: entry.path.slice(0, 80), range: entry.range, credential: entry.credential, status: entry.status }));
};

const cases = [
  ['another origin (port)', `${foreignOrigin}/rest/files/video/media-574.mp4`],
  ['another origin (userinfo trick)', `http://10.0.2.2:${new URL(origin).port}@10.0.2.2:${listener.address().port}/rest/files/video/media-574.mp4`],
  ['another scheme', `${origin.replace('http:', 'https:')}/rest/files/video/media-574.mp4`],
  ['same origin, not /rest/', `${origin}/graphql`],
  ['same origin, /rest/ by dot-segments', `${origin}/rest/../graphql`],
  ['same origin, /rest/ by encoded dot-segments', `${origin}/rest/%2e%2e/graphql`],
  ['same origin, /rest/ dot-segments to the page', `${origin}/rest/../mobile/`],
  ['same origin, static page path', `${origin}/mobile/media-574.mp4`],
  ['positive control: /rest/files/ media route', `${origin}/rest/files/video/media-574.mp4`],
];
const results = [];
for (const [label, url] of cases) {
  const before = players();
  const since = Date.now();
  foreign.length = 0;
  post(url);
  await sleep(5000);
  const after = players();
  results.push({ label, url: url.replace(/:\d{4,5}/g, ':<port>'), playersBefore: before, playersAfter: after, nodeRequests: await nodeLog(since), foreignRequests: [...foreign] });
  if (after > before) { execFileSync('adb', ['-s', serial, 'shell', 'input', 'keyevent', '4']); await sleep(2000); }
}
listener.close();
console.log(JSON.stringify(results, null, 2));
