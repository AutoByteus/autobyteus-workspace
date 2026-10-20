// Samples TCP connections of the given pids every 250 ms (lsof). Usage: node conn-sampler.mjs <outFile> <pid>...
import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const [out, ...pids] = process.argv.slice(2);
const seen = new Map();
const sample = () => {
  for (const pid of pids) {
    let text = '';
    try { text = execFileSync('lsof', ['-nP', '-a', '-p', pid, '-iTCP'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { continue; }
    for (const line of text.split('\n').slice(1)) {
      const m = line.match(/TCP (\S+)->(\S+) \((\w+)\)/);
      if (!m) continue;
      const remote = m[2];
      const key = `${pid} ${remote}`;
      if (!seen.has(key)) { seen.set(key, true); fs.appendFileSync(out, JSON.stringify({ at: new Date().toISOString(), pid, local: m[1], remote, state: m[3] }) + '\n'); }
    }
  }
};
setInterval(sample, 250); sample();
