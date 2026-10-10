#!/usr/bin/env node
// Implementation render check for skill-sources-dialog-redesign (not a durable test).
// Starts a disposable built backend (outbound GitHub controlled by the probe's upstream fixture) and the
// worktree's Nuxt dev server, seeds local folder sources and one GitHub source, prints the URLs and the
// control-file path, and keeps running until SIGINT/SIGTERM, then stops its children and removes its data.
// Usage (repo root): node tickets/in-progress/skill-sources-dialog-redesign/implementation-evidence/render-check-stack.mjs [extraLocalSources]
// Control: write {"revision":"b...","fail":false} to the printed control file to change the upstream state.
import fs from 'node:fs/promises';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const web = path.join(root, 'autobyteus-web'), server = path.join(root, 'autobyteus-server-ts');
const { create: tar } = createRequire(path.join(server, 'package.json'))('tar');
const extraLocal = Number(process.argv[2] ?? 0);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const env = Object.fromEntries(['PATH', 'TMPDIR', 'LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
const children = [];
const owned = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-sources-render-'));
const start = (cmd, args, cwd, extra, name) => {
  const child = spawn(cmd, args, { cwd, env: { ...env, ...extra }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const log = path.join(owned, name + '.log');
  child.stdout.on('data', d => fs.appendFile(log, d)); child.stderr.on('data', d => fs.appendFile(log, d));
  children.push(child); return child;
};
const cleanup = async () => {
  for (const child of children.toReversed()) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  await sleep(1500);
  for (const child of children) { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
  await fs.rm(owned, { recursive: true, force: true });
  console.log('cleaned', owned);
  process.exit(0);
};
process.on('SIGINT', cleanup); process.on('SIGTERM', cleanup);

const data = path.join(owned, 'data'); await fs.mkdir(path.join(data, 'db'), { recursive: true });
const home = path.join(owned, 'home'); await fs.mkdir(home);
const port = await freePort(), webPort = await freePort();
const backendUrl = `http://127.0.0.1:${port}`;
const database = pathToFileURL(path.join(data, 'db', 'test.db')).href;
const backendEnv = { HOME: home, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: database, AUTOBYTEUS_SERVER_HOST: backendUrl,
  AUTOBYTEUS_MEMORY_DIR: path.join(data, 'memory'), AUTOBYTEUS_LOG_DIR: path.join(data, 'logs'),
  AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(data, 'workspaces'), CODEX_HOME: path.join(owned, 'codex') };
await fs.writeFile(path.join(data, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${database}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
const migrate = start('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], server, backendEnv, 'migrate');
await new Promise((resolve, reject) => migrate.once('close', code => code === 0 ? resolve() : reject(new Error('migration failed'))));

// Controlled upstream for https://github.com/api-e2e/skills (same fixture as the GitHub skill sources probe).
const archives = {};
for (const version of [1, 2]) {
  const wrapper = path.join(owned, 'v' + version, 'wrapper');
  for (const name of ['writer', 'reviewer']) {
    await fs.mkdir(path.join(wrapper, name), { recursive: true });
    await fs.writeFile(path.join(wrapper, name, 'SKILL.md'), `---\nname: gh-${name}\ndescription: v${version}\n---\nv${version}\n`);
  }
  archives[version] = path.join(owned, `v${version}.tar.gz`);
  await tar({ cwd: path.dirname(wrapper), file: archives[version], gzip: true, portable: true }, ['wrapper']);
}
const control = path.join(owned, 'control.json');
await fs.writeFile(control, JSON.stringify({ revision: 'a'.repeat(40), archive: archives[1], fail: false }));
await fs.writeFile(path.join(owned, 'archives.json'), JSON.stringify(archives));

const backend = start(process.execPath, ['--import', path.join(web, 'tests/e2e/fixtures/github-skill-upstream.mjs'), path.join(server, 'dist/app.js'),
  '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], server, { ...backendEnv, SKILL_SOURCE_PROBE_CONTROL: control }, 'backend');
for (let i = 0; i < 1200 && !(await fetch(backendUrl + '/rest/health').then(r => r.ok).catch(() => false)); i++) await sleep(100);
const gql = async (query, variables = {}) => {
  const body = await (await fetch(backendUrl + '/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors) throw new Error(JSON.stringify(body.errors)); return body.data;
};

// Local folder sources: 0, 1 and n skills, a generic `.../.codex/skills` folder, plus optional extras for scrolling.
const folder = async (rel, skills) => {
  const dir = path.join(owned, 'sources', rel); await fs.mkdir(dir, { recursive: true });
  for (const name of skills) {
    await fs.mkdir(path.join(dir, name), { recursive: true });
    await fs.writeFile(path.join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: Render check\n---\nbody\n`);
  }
  await gql('mutation($p:String!){addSkillSource(path:$p){sourceId}}', { p: dir });
};
await folder('team/skills-library', ['lib-a', 'lib-b', 'lib-c']);
await folder('empty-folder', []);
await folder('one-skill', ['solo']);
await folder('user/.codex/skills', ['codex-a', 'codex-b']);
for (let i = 0; i < extraLocal; i++) await folder(`more/extra-source-${String(i + 1).padStart(2, '0')}`, [`extra-${i + 1}`]);
await gql('mutation($u:String!){importGitHubSkillSource(repositoryUrl:$u){warnings}}', { u: 'https://github.com/api-e2e/skills' });

start('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(webPort)], web, { HOME: process.env.HOME, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl }, 'frontend');
for (let i = 0; i < 2400 && !(await fetch(`http://127.0.0.1:${webPort}/skills`).then(r => r.ok).catch(() => false)); i++) await sleep(100);
console.log(JSON.stringify({ frontend: `http://127.0.0.1:${webPort}/skills`, backend: backendUrl, control, archives, owned }));
setInterval(() => {}, 1 << 30);
