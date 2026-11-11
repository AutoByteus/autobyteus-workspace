// autobyteus-472 API/E2E (temporary): copies the 12-page PDF into the run's own folder as `inside-472.pdf` and has the run's
// agent name it (`ECHO_INPUT … [inside-472.pdf](<path>)`), with the probe's credential from /tmp/abtest472/state.json (never
// printed). `touch` instead rewrites that file on the node (same bytes plus a trailing comment line, a real change).
import fs from 'node:fs'; import path from 'node:path'; import { randomUUID } from 'node:crypto';
const s = JSON.parse(fs.readFileSync('/tmp/abtest472/state.json', 'utf8'));
const runDir = path.join(s.root, 'workspace', 'ws-472'); const inside = path.join(runDir, 'inside-472.pdf');
if (process.argv[2] === 'touch') {
  fs.appendFileSync(inside, `% changed ${new Date().toISOString()}\n`); console.log(`rewrote ${path.basename(inside)} (${fs.statSync(inside).size} bytes)`); process.exit(0);
}
fs.copyFileSync(s.files.resume, inside);
const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws/agent/${s.run}?access_token=${encodeURIComponent(s.owner)}`);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await new Promise(r => setTimeout(r, 400));
ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: s.run,
  content: `ECHO_INPUT INSIDE-472 [inside-472.pdf](${inside})` } }));
await new Promise(r => setTimeout(r, 800)); ws.close(); console.log('the agent names inside-472.pdf (in the run folder)');
