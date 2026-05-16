import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { TerminalSessionManager } from '../../../../autobyteus-ts/dist/tools/terminal/terminal-session-manager.js';
import { PtySession } from '../../../../autobyteus-ts/dist/tools/terminal/pty-session.js';
import { DirectShellSession } from '../../../../autobyteus-ts/dist/tools/terminal/direct-shell-session.js';

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

const reports=[];
for (const [name, Factory] of [['pty', PtySession], ['direct', DirectShellSession]]) {
  const workspace = path.resolve(`tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/${name}-workspace`);
  await fs.rm(workspace, { recursive: true, force: true });
  await fs.mkdir(workspace, { recursive: true });
  const manager = new TerminalSessionManager(Factory);
  await manager.ensureStarted(workspace);
  const result = await manager.executeCommand(command, 30);
  await manager.close();
  const filePath = path.join(workspace, 'jet-game/index.html');
  let file = { exists: false };
  try {
    const data = await fs.readFile(filePath, 'utf8');
    file = { exists: true, bytes: Buffer.byteLength(data), matchesExpected: data === html, sha256: crypto.createHash('sha256').update(data).digest('hex'), excerpt: data.slice(900, 1400) };
  } catch (e) { file = { exists:false, error:String(e)}; }
  reports.push({ backend:name, result, file, stdoutPreview: result.stdout.slice(0, 400), stdoutTail: result.stdout.slice(-1200) });
}
await fs.writeFile('tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/session-backend-report.json', JSON.stringify({ commandLength: command.length, expectedSha256: crypto.createHash('sha256').update(html).digest('hex'), reports }, null, 2));
console.log(JSON.stringify(reports.map(r => ({ backend: r.backend, exitCode:r.result.exitCode, timedOut:r.result.timedOut, stdoutLength:r.result.stdout.length, file:r.file })), null, 2));
