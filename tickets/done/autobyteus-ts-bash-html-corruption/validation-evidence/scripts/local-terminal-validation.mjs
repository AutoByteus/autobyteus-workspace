import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const evidenceRoot = path.join(repoRoot, 'tickets/in-progress/autobyteus-ts-bash-html-corruption/validation-evidence');
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const workspace = path.join(evidenceRoot, 'workspaces', `local-terminal-${runId}`);
await fs.mkdir(workspace, { recursive: true });

const terminalDist = path.join(repoRoot, 'autobyteus-ts/dist/tools/terminal');
const { runBash } = await import(path.join(terminalDist, 'tools/run-bash.js'));
const { registerRunBashTool } = await import(path.join(terminalDist, 'tools/run-bash.js'));
const { registerStartBackgroundProcessTool } = await import(path.join(terminalDist, 'tools/start-background-process.js'));
const { registerGetBackgroundProcessesTool } = await import(path.join(terminalDist, 'tools/get-background-processes.js'));
const { registerGetProcessOutputTool } = await import(path.join(terminalDist, 'tools/get-process-output.js'));
const { registerStopBackgroundProcessTool } = await import(path.join(terminalDist, 'tools/stop-background-process.js'));
const { getBackgroundManager } = await import(path.join(terminalDist, 'background-process-context.js'));

const context = { workspaceRootPath: workspace, agentId: `local-validation-${runId}` };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const assert = (condition, message, details = undefined) => {
  if (!condition) {
    const error = new Error(message);
    if (details !== undefined) error.details = details;
    throw error;
  }
};
const jsonStable = (value) => JSON.stringify(value, null, 2);
const noLegacyPublicIdentity = (label, value) => {
  const text = jsonStable(value);
  assert(!text.includes('processId'), `${label} exposed processId`, text);
  assert(!text.includes('process_id'), `${label} exposed process_id`, text);
  assert(!text.includes('bg_'), `${label} exposed bg_ synthetic id`, text);
};

const makeStandaloneHtml = () => {
  const sprites = Array.from({ length: 950 }, (_, i) => {
    const x = (i * 37) % 1920;
    const y = (i * 53) % 1080;
    return `{id:${i},x:${x},y:${y},vx:${(i % 17) - 8},vy:${(i % 13) - 6},kind:${JSON.stringify(i % 5 === 0 ? 'enemy' : 'cloud')}}`;
  }).join(',\n');
  const levels = Array.from({ length: 120 }, (_, level) => {
    const enemies = Array.from({ length: 20 }, (_, i) => `{x:${80 + i * 70},y:${50 + ((level + i) % 9) * 42},hp:${1 + ((level + i) % 4)}}`).join(',');
    return `{level:${level + 1},speed:${(1 + level / 25).toFixed(2)},enemies:[${enemies}]}`;
  }).join(',\n');
  const narrative = Array.from({ length: 500 }, (_, i) => `Mission log ${String(i).padStart(3, '0')}: vector glyphs, particle trails, collision boxes, and deterministic gameplay data remain byte-exact.`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Autobyteus Jet Game Integrity Fixture</title>
<style>
:root{color-scheme:dark;--sky:#061526;--hud:#8ff;--danger:#ff6070;}
html,body{margin:0;height:100%;background:radial-gradient(circle at 50% 30%,#15345a,var(--sky));font-family:Inter,system-ui,sans-serif;color:white;overflow:hidden;}
#game{display:block;width:100vw;height:100vh;image-rendering:auto;}
#hud{position:fixed;left:18px;top:14px;background:rgba(0,0,0,.35);padding:10px 12px;border:1px solid rgba(136,255,255,.5);border-radius:10px;box-shadow:0 0 30px rgba(0,255,255,.12);}
.star{position:absolute;width:2px;height:2px;background:white;border-radius:999px;opacity:.6;}
</style>
</head>
<body>
<canvas id="game" width="1280" height="720" aria-label="jet game canvas"></canvas>
<div id="hud">Autobyteus Jet Game • Integrity Fixture • <span id="score">0</span></div>
<script>
'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sprites = [
${sprites}
];
const levels = [
${levels}
];
const narrative = ${JSON.stringify(narrative)};
const state = {score:0,tick:0,player:{x:180,y:360,vx:0,vy:0,hp:5},bullets:[],keys:new Set()};
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function drawJet(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#9ff';ctx.beginPath();ctx.moveTo(34,0);ctx.lineTo(-22,-16);ctx.lineTo(-12,0);ctx.lineTo(-22,16);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-5,-5,18,10);ctx.restore();}
function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='rgba(255,255,255,.45)';for(const s of sprites){ctx.fillRect((s.x-state.tick*s.vx*.08)%canvas.width,(s.y+state.tick*s.vy*.05+canvas.height)%canvas.height,2,2);}drawJet(state.player.x,state.player.y);ctx.fillStyle='#ff6070';for(const level of levels.slice(0,3)){for(const e of level.enemies){ctx.fillRect(e.x+(state.tick%120),e.y,18,12);}}document.getElementById('score').textContent=String(state.score);}
function step(){state.tick++;state.player.x=clamp(state.player.x+state.player.vx,20,canvas.width-20);state.player.y=clamp(state.player.y+state.player.vy,20,canvas.height-20);state.score += state.tick % 17 === 0 ? 10 : 0;draw();requestAnimationFrame(step);}
addEventListener('keydown',e=>{state.keys.add(e.key);if(e.key==='ArrowUp')state.player.vy=-4;if(e.key==='ArrowDown')state.player.vy=4;if(e.key==='ArrowLeft')state.player.vx=-4;if(e.key==='ArrowRight')state.player.vx=4;});
addEventListener('keyup',e=>{state.keys.delete(e.key);if(e.key.startsWith('Arrow')){state.player.vx=0;state.player.vy=0;}});
console.log('fixture-bytes', narrative.length, sprites.length, levels.length);
step();
</script>
</body>
</html>
`;
};

const html = makeStandaloneHtml();
const expectedHash = sha256(html);
const expectedBytes = Buffer.byteLength(html, 'utf8');
const htmlCommand = `mkdir -p jet-game && cat > jet-game/index.html <<'AUTOBYTEUS_HTML_EOF'\n${html}AUTOBYTEUS_HTML_EOF\nnode -e "const fs=require('fs'),crypto=require('crypto');const b=fs.readFileSync('jet-game/index.html');console.log('sha256='+crypto.createHash('sha256').update(b).digest('hex'));console.log('bytes='+b.length);"`;

const htmlResult = await runBash(context, htmlCommand, workspace, 20);
const written = await fs.readFile(path.join(workspace, 'jet-game/index.html'), 'utf8');
assert(htmlResult.exitCode === 0, 'large HTML run_bash exit code was not zero', htmlResult);
assert(!htmlResult.timedOut, 'large HTML run_bash timed out', htmlResult);
assert(written === html, 'large HTML file bytes did not match exact expected content', { expectedHash, actualHash: sha256(written), expectedBytes, actualBytes: Buffer.byteLength(written, 'utf8') });
assert(htmlResult.stdout.includes(`sha256=${expectedHash}`), 'large HTML command stdout did not include expected sha256', htmlResult.stdout);
assert(htmlResult.stdout.includes(`bytes=${expectedBytes}`), 'large HTML command stdout did not include expected byte count', htmlResult.stdout);

const runBashTool = registerRunBashTool();
const startBackgroundProcessTool = registerStartBackgroundProcessTool();
const getBackgroundProcessesTool = registerGetBackgroundProcessesTool();
const getProcessOutputTool = registerGetProcessOutputTool();
const stopBackgroundProcessTool = registerStopBackgroundProcessTool();

const bashNativeCommand = '(for i in 1 2 3 4; do echo bash_native_$i; sleep 0.15; done; sleep 30) &';
const bashNativeResult = await runBashTool.execute(context, { command: bashNativeCommand, cwd: workspace, timeout_seconds: 5 });
assert(bashNativeResult.exitCode === 0, 'bash-native background run_bash did not exit cleanly', bashNativeResult);
assert(Array.isArray(bashNativeResult.backgroundProcesses) && bashNativeResult.backgroundProcesses.length >= 1, 'run_bash did not return adopted backgroundProcesses', bashNativeResult);
noLegacyPublicIdentity('run_bash background result', bashNativeResult);
const bashNativePids = bashNativeResult.backgroundProcesses.map((p) => p.pid);
assert(bashNativePids.every((pid) => Number.isInteger(pid) && pid > 0), 'run_bash background pids are not positive integers', bashNativeResult.backgroundProcesses);
await sleep(750);
const listAfterRunBash = await getBackgroundProcessesTool.execute(context, {});
noLegacyPublicIdentity('get_background_processes after run_bash', listAfterRunBash);
for (const pid of bashNativePids) {
  assert(listAfterRunBash.processes.some((process) => process.pid === pid), `get_background_processes missing run_bash pid ${pid}`, listAfterRunBash);
}
const runBashOutput = await getProcessOutputTool.execute(context, { pid: bashNativePids[0], lines: 20 });
noLegacyPublicIdentity('get_process_output after run_bash', runBashOutput);
assert(runBashOutput.output.includes('bash_native_'), 'get_process_output missing expected bash-native output', runBashOutput);
assert(runBashOutput.isRunning === true, 'bash-native background process was not running before stop', runBashOutput);
const runBashStopResults = [];
for (const pid of bashNativePids) {
  runBashStopResults.push(await stopBackgroundProcessTool.execute(context, { pid }));
}
assert(runBashStopResults.some((result) => result.status === 'stopped'), 'no run_bash background process reported stopped', runBashStopResults);
noLegacyPublicIdentity('stop_background_process after run_bash', runBashStopResults);
await sleep(350);
const listAfterRunBashStop = await getBackgroundProcessesTool.execute(context, {});
for (const pid of bashNativePids) {
  assert(!listAfterRunBashStop.processes.some((process) => process.pid === pid && process.status === 'running'), `run_bash pid ${pid} still listed running after stop`, listAfterRunBashStop);
}

const startCommand = 'for i in 1 2 3 4; do echo startproc_$i; sleep 0.15; done; sleep 30';
const startResult = await startBackgroundProcessTool.execute(context, { command: startCommand, cwd: workspace });
noLegacyPublicIdentity('start_background_process result', startResult);
assert(Number.isInteger(startResult.pid) && startResult.pid > 0, 'start_background_process pid is not a positive integer', startResult);
assert(startResult.status === 'running', 'start_background_process did not report running status', startResult);
await sleep(800);
const listAfterStart = await getBackgroundProcessesTool.execute(context, {});
assert(listAfterStart.processes.some((process) => process.pid === startResult.pid), 'get_background_processes missing start_background_process pid', listAfterStart);
const startOutput = await getProcessOutputTool.execute(context, { pid: startResult.pid, lines: 20 });
assert(startOutput.output.includes('startproc_'), 'get_process_output missing expected start_background_process output', startOutput);
assert(startOutput.isRunning === true, 'start_background_process was not running before stop', startOutput);
const startStop = await stopBackgroundProcessTool.execute(context, { pid: startResult.pid });
assert(startStop.status === 'stopped', 'stop_background_process did not stop start_background_process pid', startStop);
await sleep(350);
const listAfterStartStop = await getBackgroundProcessesTool.execute(context, {});
assert(!listAfterStartStop.processes.some((process) => process.pid === startResult.pid && process.status === 'running'), 'start_background_process pid still running after stop', listAfterStartStop);

const manager = getBackgroundManager(context);
await manager.stopAll();

const evidence = {
  runId,
  platform: { platform: process.platform, arch: process.arch, node: process.version, shell: process.env.SHELL ?? null },
  workspace,
  largeHtml: {
    expectedBytes,
    actualBytes: Buffer.byteLength(written, 'utf8'),
    expectedSha256: expectedHash,
    actualSha256: sha256(written),
    result: htmlResult.toJSON?.() ?? htmlResult,
    fileRelativePath: 'jet-game/index.html'
  },
  bashNativeBackground: {
    command: bashNativeCommand,
    result: bashNativeResult.toJSON?.() ?? bashNativeResult,
    pids: bashNativePids,
    listAfterRunBash,
    output: runBashOutput,
    stopResults: runBashStopResults,
    listAfterStop: listAfterRunBashStop
  },
  startBackgroundProcess: {
    command: startCommand,
    result: startResult,
    listAfterStart,
    output: startOutput,
    stopResult: startStop,
    listAfterStop: listAfterStartStop
  }
};

const evidencePath = path.join(evidenceRoot, 'logs', `local-terminal-validation-${runId}.json`);
await fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2), 'utf8');
console.log(JSON.stringify({ status: 'pass', evidencePath, workspace, expectedBytes, expectedHash, bashNativePids, startPid: startResult.pid }, null, 2));
