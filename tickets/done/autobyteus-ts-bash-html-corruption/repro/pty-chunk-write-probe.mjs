import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { PtySession } from '../../../../autobyteus-ts/dist/tools/terminal/pty-session.js';
import { OutputBuffer } from '../../../../autobyteus-ts/dist/tools/terminal/output-buffer.js';
import { PromptDetector } from '../../../../autobyteus-ts/dist/tools/terminal/prompt-detector.js';
import { stripAnsiCodes } from '../../../../autobyteus-ts/dist/tools/terminal/ansi-utils.js';
const sleep = ms => new Promise(r=>setTimeout(r,ms));
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
const command = `mkdir -p jet-game && cat > jet-game/index.html <<'EOF_HTML'\n${html}EOF_HTML\npython3 - <<'PY'\nfrom pathlib import Path\np = Path('jet-game/index.html')\nprint('exists', p.exists(), 'bytes', p.stat().st_size)\nprint(p.read_text()[:120])\nPY\n`;
async function run(chunkSize, delayMs) {
  const workspace = path.resolve(`tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/pty-chunk-${chunkSize}-${delayMs}`);
  await fs.rm(workspace, {recursive:true, force:true}); await fs.mkdir(workspace,{recursive:true});
  const session = new PtySession('chunk');
  const buf = new OutputBuffer(); const prompt = new PromptDetector();
  await session.start(workspace);
  // drain startup
  const start=Date.now(); while(Date.now()-start<500){ const d=await session.read(0.05); if(d) buf.append(d); else await sleep(20); }
  buf.clear();
  for (let i=0; i<command.length; i+=chunkSize) {
    await session.write(command.slice(i, i+chunkSize));
    if (delayMs) await sleep(delayMs);
  }
  let timedOut=false; const st=Date.now();
  while(true){
    if(Date.now()-st>30000){timedOut=true; break;}
    const d=await session.read(0.1); if(d){ buf.append(d); if(prompt.check(buf.getAll())) break; }
  }
  const output=stripAnsiCodes(buf.getAll());
  await session.close();
  let file={exists:false};
  try { const data=await fs.readFile(path.join(workspace,'jet-game/index.html'),'utf8'); file={exists:true, matchesExpected:data===html, bytes:Buffer.byteLength(data), sha256:crypto.createHash('sha256').update(data).digest('hex'), excerpt:data.slice(900,1400)}; } catch(e){file={exists:false,error:String(e)}}
  return {chunkSize, delayMs, timedOut, stdoutLen:output.length, file, stdoutTail:output.slice(-800)};
}
const reports=[];
for (const [chunk, delay] of [[256,2],[128,1],[128,2],[64,1],[64,2],[32,1]]) reports.push(await run(chunk,delay));
await fs.writeFile('tickets/in-progress/autobyteus-ts-bash-html-corruption/repro/pty-chunk-report.json', JSON.stringify({expectedSha256:crypto.createHash('sha256').update(html).digest('hex'), reports}, null, 2));
console.log(JSON.stringify(reports.map(r=>({chunkSize:r.chunkSize, delayMs:r.delayMs, timedOut:r.timedOut, file:r.file})), null, 2));
