// API-01 helper (temporary): sends one message to A's run that attaches a file outside the run's folder by its absolute path
// (context_file_paths, as the desktop composer sends a path attachment), with the probe's launch credential from
// /tmp/abtest471/state.json (never printed).
import fs from 'node:fs'; import { randomUUID } from 'node:crypto';
const s = JSON.parse(fs.readFileSync('/tmp/abtest471/state.json', 'utf8'));
const ws = new WebSocket(`ws://127.0.0.1:${s.pA}/ws/agent/${s.run}?access_token=${encodeURIComponent(s.owner)}`);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await new Promise(r => setTimeout(r, 400));
ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [s.files.notes], image_urls: [], agent_run_id: s.run, content: 'PATH-ATTACH-471 read the notes' } }));
await new Promise(r => setTimeout(r, 800)); ws.close();
console.log(`sent PATH-ATTACH-471 with the attachment ${s.files.notes}`);
