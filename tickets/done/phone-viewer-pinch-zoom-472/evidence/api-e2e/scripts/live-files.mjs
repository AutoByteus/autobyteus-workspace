// autobyteus-472 API/E2E round 3 (temporary): files in the run's own folder (a workspace, which autobyteus-452 watches) for
// AC-005 live. Uses /tmp/abtest472/state.json (the probe's credential, never printed).
//   node live-files.mjs setup            copy the 12-page PDF to live-472.pdf and write live-472.png (1200×800, colour A) in
//                                        the run's folder; the run's agent names both (ECHO_INPUT)
//   node live-files.mjs rewrite <pdf|png> rewrite that file on disk in place (PDF: a comment line appended; PNG: colour B,
//                                        same size), as an editor or a tool would
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { randomUUID } from 'node:crypto';
const s = JSON.parse(fs.readFileSync('/tmp/abtest472/state.json', 'utf8'));
const runDir = path.join(s.root, 'workspace', 'ws-472'); const pdf = path.join(runDir, 'live-472.pdf'), png = path.join(runDir, 'live-472.png');
const makePng = (w, h, shade) => { const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(body) >>> 0); return Buffer.concat([l, body, c]); };
  const hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 2; const rows = [];
  for (let y = 0; y < h; y++) { const r = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) { const o = 1 + x * 3; const check = ((x >> 5) + (y >> 5)) & 1; r[o] = check ? shade : 40; r[o + 1] = (x * 255 / w) | 0; r[o + 2] = (y * 255 / h) | 0; } rows.push(r); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]); };
const [cmd, which] = process.argv.slice(2);
if (cmd === 'rewrite') {
  if (which === 'pdf') fs.appendFileSync(pdf, `% rewritten ${new Date().toISOString()}\n`); else fs.writeFileSync(png, makePng(1200, 800, 120));
  console.log(`rewrote ${path.basename(which === 'pdf' ? pdf : png)} in place`); process.exit(0);
}
fs.copyFileSync(s.files.resume, pdf); fs.writeFileSync(png, makePng(1200, 800, 230));
const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws/agent/${s.run}?access_token=${encodeURIComponent(s.owner)}`);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await new Promise(r => setTimeout(r, 400));
ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: s.run,
  content: `ECHO_INPUT LIVE-472 [live-472.pdf](${pdf}) [live-472.png](${png})` } }));
await new Promise(r => setTimeout(r, 800)); ws.close(); console.log('the agent names live-472.pdf and live-472.png (in the run folder)');
