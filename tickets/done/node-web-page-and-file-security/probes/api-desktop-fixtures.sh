#!/usr/bin/env bash
# autobyteus-416 API/E2E desktop fixtures (API-08…API-11): writes, into a new directory owned by the run,
#   files/      a workspace with one file per viewer type (AC-008) and the HTML page opened top-level (AC-009)
#   attack/     the local page opened as file:// in the in-app browser (AC-010)
# Nothing here is real user data. Usage: api-desktop-fixtures.sh <worktree> <new dir>
set -euo pipefail
worktree="$1"; dir="$2"
mkdir -p "$dir/files/docs" "$dir/attack"
f="$dir/files"

# AC-009: an HTML file opened top-level from F1. Its script runs, reports its origin and storage, and calls the node.
cat > "$f/page.html" <<'EOF'
<!doctype html><html><head><meta charset="utf-8"><title>api09 page</title></head>
<body><h1 id="state">API09 script did not run</h1>
<script>
const out = document.body.dataset;
document.getElementById('state').textContent = 'API09 SCRIPT RAN';
out.selfOrigin = String(self.origin);
try { localStorage.setItem('api09', '1'); out.storage = 'allowed'; } catch (e) { out.storage = 'blocked: ' + e.name; }
try { out.cookie = 'cookie read: ' + JSON.stringify(document.cookie); } catch (e) { out.cookie = 'blocked: ' + e.name; }
const node = new URL(location.href).origin;
fetch(node + '/graphql?f=api09-fetch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ __typename }"}' })
  .then(r => { out.fetch = 'status ' + r.status; }).catch(e => { out.fetch = 'error ' + e.name; });
const ws = new WebSocket(node.replace('http', 'ws') + '/ws/terminal/api09-session?f=api09-ws');
ws.onopen = () => { out.ws = 'opened'; };
ws.onclose = e => { out.ws = (out.ws === 'opened' ? 'opened then ' : '') + 'closed ' + e.code; };
</script></body></html>
EOF

# AC-007 in Electron: an SVG with a script, opened top-level.
cat > "$f/drawing.svg" <<'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="35" id="t">API09 SVG</text>
<script>document.getElementById('t').textContent = 'API09 SVG SCRIPT RAN ' + String(self.origin);</script></svg>
EOF

# AC-008 viewers.
cat > "$f/preview.html" <<'EOF'
<!doctype html><html><body><h1 id="p">API10 HTML PREVIEW</h1>
<script>document.getElementById('p').textContent = 'API10 HTML PREVIEW SCRIPT RAN';</script></body></html>
EOF
printf '# API10 MARKDOWN HEADING\n\nSome **bold** text.\n\n![pixel](image.png)\n' > "$f/notes.md"
printf 'API10 PLAIN TEXT LINE\n' > "$f/notes.txt"
cp "$worktree/test-support/file-explorer/resume-preview.pdf" "$f/report.pdf"
cp "$worktree/test-support/file-explorer/resume-preview.pdf" "$f/docs/attachment.pdf"
ffmpeg -v error -f lavfi -i color=c=red:s=64x48 -frames:v 1 "$f/image.png"
ffmpeg -v error -f lavfi -i testsrc=s=160x120:d=2:r=10 -c:v libvpx-vp9 -b:v 200k "$f/clip.webm"
ffmpeg -v error -f lavfi -i sine=f=440:d=2 "$f/sound.wav"
node -e '
const XLSX = require(require.resolve("xlsx", { paths: [process.argv[1]] }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["API10-SHEET-CELL", 42], ["second", 7]]), "Data");
XLSX.writeFile(wb, process.argv[2]);
' "$worktree/autobyteus-web" "$f/sheet.xlsx"

# AC-010: the file:// page. Every form tags its URL with ?f=<form>-<kind>, so the node log names each one.
# Forms (design D6 Entry-Form Table): the page itself, an about:blank iframe, a srcdoc iframe, an about:blank popup;
# kinds: fetch POST, XHR POST, WebSocket /ws/terminal, WebSocket /graphql.
cat > "$dir/attack/api08-attack.html" <<'EOF'
<!doctype html><html><head><meta charset="utf-8"><title>api08 local page</title></head>
<body><h1 id="loaded">API08 LOCAL PAGE LOADED</h1><pre id="out"></pre>
<script>
const node = new URLSearchParams(location.search).get('node');
const wsBase = node.replace('http', 'ws');
const results = {}; window.__api08 = results;
const show = () => { document.getElementById('out').textContent = JSON.stringify(results, null, 1); };
const trio = (w, tag) => {
  const r = results[tag] = {};
  w.fetch(node + '/graphql?f=' + tag + '-fetch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ __typename }"}' })
    .then(x => { r.fetch = 'status ' + x.status; show(); }).catch(e => { r.fetch = 'error ' + e.name; show(); });
  const x = new w.XMLHttpRequest(); x.open('POST', node + '/graphql?f=' + tag + '-xhr'); x.setRequestHeader('content-type', 'application/json');
  x.onload = () => { r.xhr = 'status ' + x.status; show(); }; x.onerror = () => { r.xhr = 'error'; show(); }; x.send('{"query":"{ __typename }"}');
  for (const [kind, url, proto] of [['ws', wsBase + '/ws/terminal/api08-' + tag + '?f=' + tag + '-ws', undefined], ['gqlws', wsBase + '/graphql?f=' + tag + '-gqlws', 'graphql-transport-ws']]) {
    try { const s = new w.WebSocket(url, proto); s.onopen = () => { r[kind] = 'opened'; show(); }; s.onclose = e => { r[kind] = (r[kind] === 'opened' ? 'opened then ' : '') + 'closed ' + e.code; show(); }; }
    catch (e) { r[kind] = 'threw ' + e.name; show(); }
  }
};
trio(window, 'top');
const f = document.createElement('iframe'); document.body.append(f); trio(f.contentWindow, 'blank');
const s = document.createElement('iframe');
s.srcdoc = '<script>parent.__srcdocReady = true; parent.trioFrom(window, "srcdoc");<\/script>';
window.trioFrom = (w, tag) => trio(w, tag);
document.body.append(s);
const p = window.open('about:blank'); results.popupOpened = !!p; if (p) trio(p, 'popup');
show();
</script></body></html>
EOF

# AC-013: a local web server an agent could start, with its own API.
cat > "$dir/attack/api11-local-server.mjs" <<'EOF'
// A localhost server like one an agent starts (AC-013): serves a page and its own POST /api/echo.
// Usage: node api11-local-server.mjs <port> <node base url>
import http from 'node:http';
const [port, node] = process.argv.slice(2);
const page = `<!doctype html><html><head><meta charset="utf-8"><title>api11 local app</title></head><body><h1 id="h">API11 LOCAL APP</h1>
<script>
const out = document.body.dataset;
fetch('/api/echo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hello: 'api11' }) })
  .then(r => r.json()).then(j => { out.own = 'own server answered ' + j.echo.hello; }).catch(e => { out.own = 'own server error ' + e.name; });
fetch('${node}/graphql?f=api11-fetch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ __typename }"}' })
  .then(r => { out.node = 'status ' + r.status; }).catch(e => { out.node = 'error ' + e.name; });
const ws = new WebSocket('${node.replace('http', 'ws')}/ws/terminal/api11-session?f=api11-ws');
ws.onopen = () => { out.ws = 'opened'; }; ws.onclose = e => { out.ws = (out.ws === 'opened' ? 'opened then ' : '') + 'closed ' + e.code; };
</script></body></html>`;
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/echo') { let b = ''; req.on('data', c => { b += c; }); req.on('end', () => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ echo: JSON.parse(b), origin: req.headers.origin ?? null })); }); return; }
  res.setHeader('content-type', 'text/html'); res.end(page);
}).listen(Number(port), 'localhost', () => console.log(`api11 local server on http://localhost:${port}`));
EOF
ls -la "$f" "$dir/attack"
