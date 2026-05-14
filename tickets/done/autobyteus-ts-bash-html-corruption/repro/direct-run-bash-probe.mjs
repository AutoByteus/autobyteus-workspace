import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { runBash } from '../../../../autobyteus-ts/dist/tools/terminal/tools/run-bash.js';

const workspace = path.resolve('tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/direct-workspace');
await fs.rm(workspace, { recursive: true, force: true });
await fs.mkdir(workspace, { recursive: true });
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Jet Game</title>
  <style>
    body { margin: 0; background: #08111f; color: white; font-family: Arial, sans-serif; }
    canvas { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <canvas id="game"></canvas>
  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const keys = new Set();
    let jet = { x: 100, y: 200, vx: 0, vy: 0, score: 0 };
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    addEventListener('resize', resize); resize();
    addEventListener('keydown', e => keys.add(e.key));
    addEventListener('keyup', e => keys.delete(e.key));
    function loop() {
      jet.vx += (keys.has('ArrowRight') - keys.has('ArrowLeft')) * 0.4;
      jet.vy += (keys.has('ArrowDown') - keys.has('ArrowUp')) * 0.4;
      jet.x = Math.max(20, Math.min(canvas.width - 20, jet.x + jet.vx));
      jet.y = Math.max(20, Math.min(canvas.height - 20, jet.y + jet.vy));
      jet.vx *= 0.94; jet.vy *= 0.94; jet.score += 1;
      ctx.fillStyle = '#08111f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#66e0ff'; ctx.beginPath();
      ctx.moveTo(jet.x + 26, jet.y); ctx.lineTo(jet.x - 18, jet.y - 14); ctx.lineTo(jet.x - 8, jet.y); ctx.lineTo(jet.x - 18, jet.y + 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'white'; ctx.fillText('Score: ' + jet.score, 20, 30);
      requestAnimationFrame(loop);
    }
    loop();
  </script>
</body>
</html>
`;
const command = `mkdir -p jet-game && cat > jet-game/index.html <<'EOF_HTML'\n${html}EOF_HTML\npython3 - <<'PY'\nfrom pathlib import Path\np = Path('jet-game/index.html')\nprint('exists', p.exists(), 'bytes', p.stat().st_size)\nprint(p.read_text()[:120])\nPY`;
const result = await runBash({ workspaceRootPath: workspace, agentId: 'direct-probe' }, command, null, 30, false);
const filePath = path.join(workspace, 'jet-game', 'index.html');
let file = { path: filePath, exists: false };
try {
  const bytes = await fs.readFile(filePath);
  const actual = bytes.toString('utf8');
  file = {
    path: filePath,
    exists: true,
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    matchesExpected: actual === html,
    expectedSha256: crypto.createHash('sha256').update(html).digest('hex'),
    prefix: actual.slice(0, 200),
    suffix: actual.slice(-200)
  };
} catch (error) {
  file = { ...file, exists: false, readError: String(error) };
}
const report = {
  workspace,
  commandLength: command.length,
  command,
  result,
  file
};
await fs.writeFile(path.resolve('tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/direct-run-bash-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({
  exitCode: result.exitCode,
  timedOut: result.timedOut,
  stdoutLength: result.stdout.length,
  fileExists: report.file.exists,
  fileBytes: report.file.bytes ?? null,
  matchesExpected: report.file.matchesExpected ?? null,
  sha256: report.file.sha256 ?? null,
  stdoutPreview: result.stdout.slice(0, 500)
}, null, 2));
