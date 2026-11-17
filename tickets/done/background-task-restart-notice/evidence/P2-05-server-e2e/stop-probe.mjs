// Temporary probe: a built server's graceful stop (SIGTERM): exit code, time to exit, last output lines. Usage: node stop-probe.mjs <serverDir> [runs]
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { randomBytes } from 'node:crypto';
const serverDir = process.argv[2]; const runs = Number(process.argv[3] ?? 3);
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const results = [];
for (let i = 0; i < runs; i++) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'stop-probe-'));
  await fs.mkdir(path.join(root, 'db')); await fs.mkdir(path.join(root, 'home'));
  const port = await freePort();
  await fs.writeFile(path.join(root, '.env'), `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}\nAPP_ENV=test\n`);
  const child = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--data-dir', root, '--host', '127.0.0.1', '--port', String(port)], { cwd: serverDir,
    env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, HOME: path.join(root, 'home'), DATABASE_URL: `file:${path.join(root, 'db', 'production.db')}`,
      AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: `own_${randomBytes(24).toString('base64url')}` }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; child.stdout.on('data', (b) => { out += b; }); child.stderr.on('data', (b) => { out += b; });
  const t0 = Date.now();
  while (!out.includes(`Server listening`) || !out.includes(String(port))) { if (child.exitCode !== null) break; if (Date.now() - t0 > 180000) break; await new Promise((r) => setTimeout(r, 200)); }
  await new Promise((r) => setTimeout(r, 2000));
  const readyMs = Date.now() - t0;
  const s0 = Date.now(); child.kill('SIGTERM');
  const code = await new Promise((r) => { const to = setTimeout(() => { child.kill('SIGKILL'); r('timeout>30000'); }, 30000); child.once('close', (c, sig) => { clearTimeout(to); r(c ?? sig); }); });
  results.push({ run: i, readyMs, stopMs: Date.now() - s0, exit: code, load: os.loadavg()[0].toFixed(0), tail: out.split('\n').filter(Boolean).slice(-6).map((l) => l.slice(0, 220)) });
  await fs.rm(root, { recursive: true, force: true });
}
console.log(JSON.stringify(results, null, 1));
