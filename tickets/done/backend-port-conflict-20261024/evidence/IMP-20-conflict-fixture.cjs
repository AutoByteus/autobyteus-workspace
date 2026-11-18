// IMP-20 manual rendered inspection support, not an API/E2E suite.
// Usage: node <this-file> <isolated-app-start.json>; only its verified child is stopped.
const fs = require('node:fs'), cp = require('node:child_process'), http = require('node:http');
const i = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).result;
const rows = cp.execFileSync('ps', ['-axo', 'pid=,ppid=,command='], { encoding: 'utf8' }).split('\n');
const candidates = rows.map(s => /^\s*(\d+)\s+(\d+)\s+(.+)$/.exec(s)).filter(m => m && Number(m[2]) === i.pid && m[3].includes(i.executablePath + ' ') && m[3].includes('/Contents/Resources/server/dist/app.js ') && m[3].includes('--data-dir ' + i.dataRoot + '/server-data'));
if (candidates.length !== 1) throw new Error('Exact isolated backend ownership not established');
const backendPid = Number(candidates[0][1]);
fs.writeFileSync(i.dataRoot + '/IMP-20-sentinel', 'preserve-owned-render-check\n');
console.log(JSON.stringify({ check:'IMP-20', instanceId:i.instanceId, backendPid, ownership:candidates[0][0], date:new Date().toISOString() }));
process.kill(backendPid, 'SIGTERM');
(async () => {
  let live = true;
  for (let n=0; n<100; n++) { try { process.kill(backendPid, 0); } catch { live=false; break; } await new Promise(r=>setTimeout(r,100)); }
  if (live) throw new Error('Owned backend did not stop; no fixture bind attempted');
  const server = http.createServer((_req,res) => { res.writeHead(426); res.end('IMP-20 unrelated fixture survives'); });
  server.listen(i.serverPort, '127.0.0.1', () => console.log(JSON.stringify({ check:'IMP-20', fixturePid:process.pid, port:i.serverPort, listening:true })));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
})();
