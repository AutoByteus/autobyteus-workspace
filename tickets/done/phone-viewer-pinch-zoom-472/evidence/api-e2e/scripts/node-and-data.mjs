// autobyteus-472 API/E2E (temporary): the node and the data the Android journeys use. Runs until /tmp/abtest472/stop exists,
// then removes the node and its temp root. Arg: <evidence dir>.
// - A host node from this worktree's `autobyteus-server-ts/dist/app.js` (no server change in this ticket), serving this
//   branch's phone bundle (`autobyteus-web/dist/public`) at /mobile, on 127.0.0.1:<free port>, which the emulator reaches as
//   10.0.2.2:<port>; a launch credential (the probe's, never printed), the scripted AGY CLI (`ECHO_INPUT <text>` answers
//   `ECHO:"<text>"`, so an agent message names the files).
// - Files outside the run's folder: `resume-472.pdf` (12 pages of small print), `photo-472.png` (1200×800),
//   `big-472.pdf` (~25 MB: one page with an uncompressed 2900×2900 RGB image), `notes-472.txt`.
// - A pairing link for `http://10.0.2.2:<port>` (Phone Access, local network), written to /tmp/abtest472/pairing-link.txt only.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net'; import zlib from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process'; import { randomBytes, randomUUID, createHash } from 'node:crypto';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-viewer-pinch-zoom-472';
const out = process.argv[2]; const T = '/tmp/abtest472';
const lines = []; const log = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); fs.writeFileSync(path.join(out, 'node-and-data.log'), lines.join('\n') + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const owner = `own_${randomBytes(32).toString('base64url')}`; const redact = s => String(s).split(owner).join('own_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
const pdfDoc = (pages, extra = []) => { // pages: array of content streams; extra: additional objects referenced as /Im1 on page 1
  const objs = []; const add = o => { objs.push(o); return objs.length; };
  const catalog = add(null), pagesObj = add(null), font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const imgIds = extra.map(e => add(e));
  const pageIds = pages.map((content, i) => { const c = add(`<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`);
    const xo = i === 0 && imgIds.length ? ` /XObject << /Im1 ${imgIds[0]} 0 R >>` : '';
    return add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 612 792] /Contents ${c} 0 R /Resources << /Font << /F1 ${font} 0 R >>${xo} >> >>`); });
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`; objs[pagesObj - 1] = `<< /Type /Pages /Kids [${pageIds.map(i => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const chunks = [Buffer.from('%PDF-1.4\n', 'latin1')]; let len = chunks[0].length; const offsets = [];
  objs.forEach((o, i) => { offsets.push(len); const b = Buffer.isBuffer(o) ? Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), o, Buffer.from('\nendobj\n', 'latin1')]) : Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1'); chunks.push(b); len += b.length; });
  const xref = len; chunks.push(Buffer.from(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`, 'latin1'));
  return Buffer.concat(chunks); };
const textPage = (n) => { const rows = [`BT /F1 16 Tf 40 750 Td (RESUME-472 page ${n} of 12) Tj ET`];
  for (let i = 0; i < 70; i++) rows.push(`BT /F1 7 Tf 40 ${728 - i * 10} Td (Page ${n} line ${i + 1}: small print that is hard to read at page width on a phone, PAGE-${n}-LINE-${i + 1}.) Tj ET`);
  return rows.join('\n'); };
const png = (w, h) => { const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(body) >>> 0); return Buffer.concat([l, body, c]); };
  const hd = Buffer.alloc(13); hd.writeUInt32BE(w, 0); hd.writeUInt32BE(h, 4); hd[8] = 8; hd[9] = 2;
  const rows = []; for (let y = 0; y < h; y++) { const r = Buffer.alloc(1 + w * 3); for (let x = 0; x < w; x++) { const o = 1 + x * 3; const check = ((x >> 5) + (y >> 5)) & 1; r[o] = check ? 230 : 40; r[o + 1] = (x * 255 / w) | 0; r[o + 2] = (y * 255 / h) | 0; } rows.push(r); }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', hd), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))]); };
let child = null; let ok = true;
try {
  fs.mkdirSync(T, { recursive: true });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'abtest472-node-')); const data = path.join(root, 'data'); const home = path.join(root, 'home');
  const files = path.join(root, 'shared'); const runDir = path.join(root, 'workspace', 'ws-472');
  for (const d of [data, home, files, runDir]) fs.mkdirSync(d, { recursive: true });
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  log(`# autobyteus-472 node and data; commit ${execFileSync('git', ['-C', W, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}; ${new Date().toISOString()}`);
  const f = { resume: path.join(files, 'resume-472.pdf'), photo: path.join(files, 'photo-472.png'), big: path.join(files, 'big-472.pdf'), notes: path.join(files, 'notes-472.txt') };
  fs.writeFileSync(f.resume, pdfDoc(Array.from({ length: 12 }, (_, i) => textPage(i + 1))));
  fs.writeFileSync(f.photo, png(1200, 800));
  const imgW = 2900, imgH = 2900; const raw = Buffer.alloc(imgW * imgH * 3); for (let i = 0; i < raw.length; i += 3) { raw[i] = (i / 3) % 251; raw[i + 1] = ((i / 3) >> 8) % 241; raw[i + 2] = 128; }
  const img = Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${raw.length} >>\nstream\n`, 'latin1'), raw, Buffer.from('\nendstream', 'latin1')]);
  fs.writeFileSync(f.big, pdfDoc([`q 532 0 0 532 40 200 cm /Im1 Do Q\nBT /F1 16 Tf 40 760 Td (BIG-472: a 25 MB PDF) Tj ET`, textPage(2)], [img]));
  fs.writeFileSync(f.notes, 'NOTES-472: a text file (no Download for text).\n');
  const facts = {}; for (const [k, p] of Object.entries(f)) { const b = fs.readFileSync(p); facts[k] = { name: path.basename(p), bytes: b.length, sha256: createHash('sha256').update(b).digest('hex') }; }
  log(`files: ${JSON.stringify(facts)}`);
  fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${base}\nLOG_LEVEL=WARN\n`);
  child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], { cwd: `${W}/autobyteus-server-ts`,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: 'all', AUTOBYTEUS_SERVER_HOST: base, AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner,
      ANTIGRAVITY_CLI_COMMAND: `${W}/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, AGY_FAKE_CASE: 'linked_skills' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const nodeLog = fs.createWriteStream(path.join(out, 'node.log')); child.stdout.on('data', d => nodeLog.write(redact(d))); child.stderr.on('data', d => nodeLog.write(redact(d)));
  let up = false; for (let i = 0; i < 120 && !(up = await fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(1000); if (!up) throw new Error('node did not start');
  const mobile = await fetch(`${base}/mobile`); log(`node on ${base} (emulator: http://10.0.2.2:${port}); /mobile ${mobile.status} serves the phone bundle: ${(await mobile.text()).includes('/mobile/_nuxt/')}`);
  const gql = async (q, v) => { const r = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400)); return r.data; };
  const rest = (m, r, b) => fetch(`${base}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify(b) }).then(async x => ({ status: x.status, body: await x.json().catch(() => null) }));
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const def = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Reader', role: 'assistant', description: '472 probe', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: def, workspaceRootPath: runDir, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/agent/${run.runId}?access_token=${encodeURIComponent(owner)}`); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await sleep(400);
  ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: run.runId,
    content: `ECHO_INPUT FILES-472 [resume-472.pdf](${f.resume}) [photo-472.png](${f.photo}) [big-472.pdf](${f.big}) [notes-472.txt](${f.notes})` } })); await sleep(700); ws.close();
  for (let i = 0; i < 120; i++) { const c = JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: run.runId })).getRunProjection?.conversation ?? []); if (/ECHO:[^]*FILES-472/.test(c)) break; await sleep(500); }
  log(`run ${run.runId} in ${runDir}: its own message links the four files`);
  if ((await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true })).status !== 200) throw new Error('Phone Access');
  const ps = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: `http://10.0.2.2:${port}`, serverName: 'Test Node 472', trustedPrivateHttpAcknowledged: true });
  if (ps.status !== 201 || !ps.body?.mobileUrl) throw new Error(`pairing session ${ps.status}`);
  fs.writeFileSync(`${T}/pairing-link.txt`, ps.body.mobileUrl);
  fs.writeFileSync(`${T}/state.json`, JSON.stringify({ port, base, run: run.runId, files: f, facts, owner, root }, null, 1));
  log(`pairing session 201 for http://10.0.2.2:${port} (link in ${T}/pairing-link.txt, not evidence). Waiting for ${T}/stop`);
  while (!fs.existsSync(`${T}/stop`)) await sleep(1000);
  fs.rmSync(root, { recursive: true, force: true });
} catch (e) { ok = false; log('ERROR', redact(e.stack)); }
finally { if (child) { child.kill('SIGTERM'); await sleep(2000); } log(`node-and-data ${ok ? 'done' : 'FAILED'}`); process.exitCode = ok ? 0 : 1; }
