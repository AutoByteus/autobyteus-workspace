/** TEMPORARY API/E2E probe API-08 (autobyteus-284, U-A2), kept as evidence.
 * Rechecks the E9 premise with the installed Claude Code CLI: a Claude CLI busy in a foreground tool command whose stdin
 * reaches EOF (what the server's death causes) — does the CLI and its command survive? Then SIGTERM of the CLI alone —
 * does it end its command (what the sweep and the desktop force rely on)?
 * Usage: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" node API-08-claude-eof-probe.mjs <evidence dir>
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, execFileSync } from 'node:child_process';

const evidence = resolve(process.argv[2]);
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'bq284-claude-eof-')));
const marker = `BQ284EOF${Date.now().toString(36)}`;
const T0 = Date.now();
const record = { case: 'API-08', date: new Date().toISOString(), version: execFileSync('claude', ['--version'], { encoding: 'utf8' }).trim(), marker, steps: [] };
const log = (step, value) => { const at = ((Date.now() - T0) / 1000).toFixed(1); record.steps.push({ at, step, value }); console.log(`[+${at}s] ${step} ${JSON.stringify(value)}`); };
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const rows = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' }).split('\n').flatMap(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4] }] : []; });
const marked = () => rows().filter(r => r.command.includes(own) && /Python|python/.test(r.command) && !r.command.includes('ps -ww')).map(r => ({ ...r, command: r.command.slice(-120) }));
const runOnce = async (label, action) => {
  const cli = spawn('claude', ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--model', 'haiku', '--allowedTools', 'Bash'], { cwd: own, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  let out = ''; cli.stdout.on('data', b => { out += b; }); cli.stderr.on('data', b => { out += b; });
  let exited = null; cli.on('exit', (code, signal) => { exited = { code, signal, at: Date.now() }; });
  const tag = `${marker}_${label}`;
  cli.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: `Run exactly this shell command in the foreground with the Bash tool and wait for it to finish. Do not run it in the background, do not add a timeout: python3 -c "import time; time.sleep(900)" ${tag}` } }) + '\n');
  let tool; const end = Date.now() + 120_000;
  const descendantsOf = root => { const all = rows(), outRows = []; let frontier = [root]; while (frontier.length) { const kids = all.filter(r => frontier.includes(r.ppid)); outRows.push(...kids); frontier = kids.map(k => k.pid); } return outRows; };
  while (!tool && Date.now() < end) { tool = descendantsOf(cli.pid).find(r => /Python/.test(r.command) && r.command.includes('time.sleep(900)')); if (!tool) await delay(250); }
  if (!tool) { cli.kill('SIGKILL'); throw Error(`${label}: the command never started\n${out.slice(-2000)}`); }
  log(`${label} busy`, { cli: cli.pid, tool: tool.pid, toolPpid: tool.ppid, toolPgid: tool.pgid });
  const started = Date.now();
  if (action === 'eof') cli.stdin.end(); else cli.kill('SIGTERM');
  const samples = [];
  for (const ms of [1000, 3000, 5000, 10000, 15000]) { await delay(ms - (Date.now() - started)); samples.push({ afterMs: ms, cliAlive: exited === null, toolAlive: alive(tool.pid) }); }
  const result = { action, cliPid: cli.pid, toolPid: tool.pid, cliExit: exited ? { ...exited, afterMs: exited.at - started } : null, samples };
  log(`${label} after ${action}`, result);
  if (exited === null) { cli.kill('SIGTERM'); await delay(3000); result.cleanupSigtermCliAlive = exited === null; result.cleanupSigtermToolAlive = alive(tool.pid); }
  if (alive(tool.pid)) { process.kill(tool.pid, 'SIGKILL'); result.toolKilledByProbe = true; }
  if (exited === null) { cli.kill('SIGKILL'); result.cliKilledByProbe = true; }
  return result;
};
try {
  record.eof = await runOnce('eof', 'eof');
  record.sigterm = await runOnce('sigterm', 'sigterm');
  record.result = 'Completed';
} catch (error) { record.result = 'Error'; record.error = String(error.stack ?? error); process.exitCode = 1; }
finally {
  await delay(500);
  const left = marked(); for (const r of left) { try { process.kill(r.pid, 'SIGKILL'); } catch {} }
  record.leftAfterProbe = left;
  await fs.rm(own, { recursive: true, force: true });
  await fs.writeFile(join(evidence, 'API-08-result.json'), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null }));
}
