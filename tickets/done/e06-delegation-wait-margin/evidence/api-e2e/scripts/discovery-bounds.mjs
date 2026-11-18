// e06-delegation-wait-margin API/E2E (temporary): REQ-003 at the node. For each variant a fresh node of this worktree
// (`autobyteus-server-ts/dist/app.js`, temp data root and HOME, its own launch credential, never printed) runs with
// ANTIGRAVITY_CLI_COMMAND = a wrapper around the repository's scripted AGY CLI:
//   ok      no delay
//   slow5   `--help` and `--version` answer after 5 s (a busy computer: over the old 3 s bound, under the new 10 s)
//   slow12  `--help` and `--version` answer after 12 s (over the new bound)
//   hang    `--help` never answers
// Then, timed: `runtimeAvailability(runtimeKind: "antigravity_cli")` (no caller deadline: the node's own bounds) and
// `availableAgentRuntimes` (Settings › Agent Runtimes: its step caps). Args: <out dir> [variants…]. Prints JSON lines.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net';
import { spawn } from 'node:child_process'; import { randomBytes } from 'node:crypto';
const S = '/Users/normy/autobyteus_org/autobyteus-worktrees/e06-delegation-wait-margin/autobyteus-server-ts';
const FIXTURE = `${S}/tests/fixtures/agy-failure-cli.mjs`;
const [out, ...wanted] = process.argv.slice(2);
const variants = wanted.length ? wanted : ['ok', 'slow5', 'slow12', 'hang'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const wrapper = (dir, variant) => {
  const file = path.join(dir, `agy-${variant}`);
  const delay = { ok: 0, slow5: 5, slow12: 12 }[variant];
  const body = variant === 'hang'
    ? `#!/bin/sh\ncase "$1" in --help) exec sleep 3600;; esac\nexec "${process.execPath}" "${FIXTURE}" "$@"\n`
    : `#!/bin/sh\ncase "$1" in --help|--version) sleep ${delay};; esac\nexec "${process.execPath}" "${FIXTURE}" "$@"\n`;
  fs.writeFileSync(file, body, { mode: 0o755 }); return file;
};
for (const variant of variants) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `e06-node-${variant}-`)));
  const data = path.join(root, 'data'); const home = path.join(root, 'home'); fs.mkdirSync(data); fs.mkdirSync(home);
  const port = await freePort(); const base = `http://127.0.0.1:${port}`; const owner = `own_${randomBytes(32).toString('base64url')}`;
  fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${base}\nLOG_LEVEL=WARN\n`);
  const child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], { cwd: S,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: base,
      AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, ANTIGRAVITY_CLI_COMMAND: wrapper(root, variant), AGY_FAKE_CASE: 'linked_skills' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const logFile = fs.createWriteStream(path.join(out, `API-03-node-${variant}.log`));
  const redact = (d) => String(d).split(owner).join('own_…'); child.stdout.on('data', (d) => logFile.write(redact(d))); child.stderr.on('data', (d) => logFile.write(redact(d)));
  const gql = async (query) => { const r = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 300)); return r.data; };
  const result = { variant, load: os.loadavg().map((x) => Math.round(x)) };
  try {
    let up = false; for (let i = 0; i < 120 && !(up = await fetch(`${base}/rest/health`).then((r) => r.ok).catch(() => false)); i++) await sleep(1000);
    if (!up) throw new Error('node did not start');
    let t0 = Date.now();
    const a = (await gql('{ runtimeAvailability(runtimeKind: "antigravity_cli") { runtimeKind enabled reason } }')).runtimeAvailability;
    result.runtimeAvailability = { ms: Date.now() - t0, enabled: a.enabled, reason: a.reason };
    t0 = Date.now();
    const report = (await gql('{ availableAgentRuntimes }')).availableAgentRuntimes;
    const rows = JSON.stringify(report); fs.writeFileSync(path.join(out, `API-03-available-agent-runtimes-${variant}.json`), JSON.stringify(report, null, 1)); const agy = (report?.runtimes ?? report?.rows ?? []).find?.((r) => /antigravity/i.test(JSON.stringify(r).slice(0, 200)));
    result.availableAgentRuntimes = { ms: Date.now() - t0, antigravity: agy ?? rows.slice(0, 600) };
  } catch (e) { result.error = e.message; }
  finally { child.kill('SIGTERM'); await sleep(2500); if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); fs.rmSync(root, { recursive: true, force: true }); logFile.end(); }
  result.rootRemoved = !fs.existsSync(root);
  console.log(JSON.stringify(result));
}
