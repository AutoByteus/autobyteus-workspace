import { spawn, execFileSync } from 'node:child_process';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const members = (pgid) => execFileSync('ps', ['-axo', 'pid=,pgid=,comm=']).toString().split('\n')
  .map(l => l.trim().split(/\s+/)).filter(p => Number(p[1]) === pgid).map(p => `${p[0]} ${p[2]}`);
async function run(label, script) {
  // detached: own process group, like the anchor's group; a node "anchor" stands in, ignoring SIGTERM
  const anchor = spawn(process.execPath, ['-e', `process.on('SIGTERM',()=>{}); const c=require('child_process').spawn('bash',['--noprofile','--norc','-c',${JSON.stringify(script)}],{stdio:'inherit'}); c.on('spawn',()=>console.log('CMD_PID',c.pid)); c.on('exit',(code,sig)=>{console.log('CMD_EXIT',code,sig); setTimeout(()=>process.exit(0),2000)});`], { detached: true, stdio: ['ignore', 'pipe', 'inherit'] });
  let cmdPid; anchor.stdout.on('data', d => { const m = /CMD_PID (\d+)/.exec(String(d)); if (m) cmdPid = Number(m[1]); process.stdout.write(`  [${label}] ${d}`); });
  await sleep(500);
  console.log(`  [${label}] group ${anchor.pid} before kill:`, members(anchor.pid));
  execFileSync('bash', ['-c', `kill ${cmdPid}`]); // what the agent would run with run_bash
  await sleep(500);
  console.log(`  [${label}] group after "kill ${cmdPid}":`, members(anchor.pid));
  try { process.kill(-anchor.pid, 'SIGKILL'); } catch {}
}
const userCommand = 'npm_like() { sleep 100; }; npm_like & sleep 101';
console.log('A) plain bash -c <command> (today\'s launch):');
await run('A', userCommand);
console.log('B) wrapped: a TERM trap forwards the kill to the whole group:');
await run('B', `trap 'trap - TERM; kill -TERM 0' TERM; ${userCommand} & wait $!`);
