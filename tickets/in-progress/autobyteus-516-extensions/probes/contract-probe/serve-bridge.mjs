// Probe-only: serves a host page with the extension's ui/index.html in a sandboxed iframe (contract part 5).
// Usage: node serve-bridge.mjs <scratch-dir> <port>   (scratch prepared like run-probe.sh: data clone in node/voice-input/data)
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ExtensionHost, loadCatalog } from './host.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [scratch, port] = [process.argv[2], Number(process.argv[3] ?? 4516)];
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const archive = path.join(scratch, 'voice-input-1.0.0.tar.gz');
execFileSync('tar', ['-czf', archive, '-C', path.join(here, 'voice-input-extension'), 'extension.json', 'server', 'ui']);
const description = JSON.parse(await fs.readFile(path.join(here, 'voice-input-extension', 'extension.json'), 'utf8'));
const catalogBytes = Buffer.from(JSON.stringify({ extensions: [{ ...description, packageUrl: pathToFileURL(archive).href, sha256: createHash('sha256').update(await fs.readFile(archive)).digest('hex') }] }));
await fs.writeFile(path.join(scratch, 'c.json'), catalogBytes);
await fs.writeFile(path.join(scratch, 'c.json.sig'), sign(null, catalogBytes, privateKey));
const host = new ExtensionHost({ root: path.join(scratch, 'node'), catalog: await loadCatalog(path.join(scratch, 'c.json'), path.join(scratch, 'c.json.sig'), publicKey), isDesktopNode: true });
await host.install('voice-input');
await host.setEnabled('voice-input', true);

const EXTENSION_PAGE_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; sandbox allow-scripts";
const HOST_PAGE = `<!doctype html><html><body style="font-family:system-ui">
<h3>Voice Input card (probe host)</h3>
<iframe id="ext" sandbox="allow-scripts" src="/extensions/voice-input/ui/index.html" style="width:420px;height:120px;border:1px solid #ccc"></iframe>
<pre id="results">waiting…</pre>
<script>
  const frame = document.getElementById('ext');
  window.addEventListener('message', async (event) => {
    if (event.source !== frame.contentWindow) return;           // only our extension's frame
    const m = event.data;
    if (m && m.probe) { document.getElementById('results').textContent = JSON.stringify(m.probe, null, 2); return; }
    if (!m || typeof m.id !== 'string' || typeof m.call !== 'string') return;
    const response = await fetch('/api/extensions/voice-input/actions/' + encodeURIComponent(m.call), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(m.input ?? null) });
    const body = await response.json();
    frame.contentWindow.postMessage({ id: m.id, ...body }, '*');  // opaque origin: target the frame's window itself
  });
</script></body></html>`;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(HOST_PAGE); return; }
  if (url.pathname === '/probe/secret') { res.writeHead(200); res.end('secret'); return; }
  if (url.pathname === '/extensions/voice-input/ui/index.html') {
    res.writeHead(200, { 'content-type': 'text/html', 'content-security-policy': EXTENSION_PAGE_CSP });
    res.end(await fs.readFile(path.join(scratch, 'node', 'voice-input', 'package', 'ui', 'index.html')));
    return;
  }
  const action = url.pathname.match(/^\/api\/extensions\/voice-input\/actions\/([^/]+)$/);
  if (action && req.method === 'POST') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    try { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, output: await host.callAction('voice-input', decodeURIComponent(action[1]), { json: JSON.parse(raw || 'null') }) })); }
    catch (e) { res.end(JSON.stringify({ ok: false, error: e.message })); }
    return;
  }
  res.writeHead(404); res.end();
}).listen(port, '127.0.0.1', () => console.log(`bridge probe on http://127.0.0.1:${port}/`));
process.on('SIGTERM', async () => { await host.stopAll(); process.exit(0); });
