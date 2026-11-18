// API-14 (autobyteus-338, code review C-02/C-03): is a background task's reported `lastLines` (what the notice shows)
// the tail of its output file, including the line written right before the task exits? Runs real tasks through the
// real runBash, wrapper, launcher and manager from autobyteus-ts/dist. Variants: background form and `&` job, last
// line on stdout (a different pipe than the JOB_ENDED frame) and on stderr, after a large burst; tasks run 10 at a
// time. Run from the worktree root after `pnpm -C autobyteus-ts build`:
//   macOS:  node tickets/in-progress/run-bash-background/evidence/API-14-lastlines-order-probe.mjs [perVariant]
//   Linux:  docker run --rm -v "$PWD:$PWD:ro" -w "$PWD" node:22-bookworm node tickets/in-progress/run-bash-background/evidence/API-14-lastlines-order-probe.mjs [perVariant]
import { mkdtempSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve('autobyteus-ts/dist/tools/terminal');
const { runBash } = await import(`${root}/tools/run-bash.js`);
const { getBackgroundManager } = await import(`${root}/background-process-context.js`);
const perVariant = Number(process.argv[2] ?? 50);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tail20 = text => { const lines = text.replace(/\n$/, '').split('\n').slice(-20).join('\n'); return lines.length > 2000 ? lines.slice(-2000) : lines; };

const variants = {
  'background, last line on stdout': i => ({ bg: true, cmd: `echo start; sleep 0.1; echo LAST-${i}` }),
  'background, burst then last line on stdout': i => ({ bg: true, cmd: `sleep 0.1; seq 1 5000; echo LAST-${i}` }),
  'background, last line on stderr': i => ({ bg: true, cmd: `echo start; sleep 0.1; echo LAST-${i} >&2` }),
  '& job, burst then last line on stdout': i => ({ bg: false, cmd: `(sleep 0.2; seq 1 5000; echo LAST-${i}) & echo started` }),
};

let n = 0;
const summary = { platform: `${process.platform} ${os.release()}`, bash: execFileSync('bash', ['-c', 'echo $BASH_VERSION'], { encoding: 'utf8' }).trim(), perVariant, variants: {} };
for (const [name, make] of Object.entries(variants)) {
  const outcome = { tasks: 0, lastLineMissing: 0, differsFromFileTail: 0, noEnd: 0, examples: [] };
  for (let batch = 0; batch < perVariant; batch += 10) {
    await Promise.all(Array.from({ length: Math.min(10, perVariant - batch) }, async (_, k) => {
      const i = batch + k;
      const ctx = { workspaceRootPath: mkdtempSync(path.join(os.tmpdir(), 'api14-')), agentId: `api14-${n++}` };
      const manager = getBackgroundManager(ctx);
      try {
        const { bg, cmd } = make(i);
        const result = await runBash(ctx, cmd, null, 30, bg);
        const pid = bg ? result.pid : result.backgroundTasksStarted?.[0]?.pid;
        let end = null;
        for (const deadline = Date.now() + 15_000; !end && Date.now() < deadline; await sleep(10)) end = manager.list().find(s => s.task.pid === pid)?.end ?? null;
        outcome.tasks++;
        if (!end) { outcome.noEnd++; return; }
        const fileTail = tail20(readFileSync(end.outputFile, 'utf8'));
        const missing = !end.lastLines.endsWith(`LAST-${i}`);
        const differs = end.lastLines !== fileTail;
        if (missing) outcome.lastLineMissing++;
        if (differs) outcome.differsFromFileTail++;
        if ((missing || differs) && outcome.examples.length < 3) outcome.examples.push({ i, outcome: end.outcome, lastLines: end.lastLines.slice(-200), fileTail: fileTail.slice(-200) });
      } finally {
        await manager.stopAllForRunEnd();
        await manager.scope.close();
      }
    }));
  }
  summary.variants[name] = outcome;
}
const failed = Object.values(summary.variants).some(v => v.lastLineMissing || v.differsFromFileTail || v.noEnd);
console.log(JSON.stringify({ ...summary, result: failed ? 'Fail' : 'Pass' }, null, 1));
process.exit(failed ? 1 : 0);
