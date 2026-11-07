// api417 (autobyteus-417 API/E2E) synthetic preview pages (QR-002: synthetic only).
// hostilePage(): a page that reports what it can reach, as a previewed page would try it, and the
// preview-usefulness checks of AC-004/AC-007. Results are kept in window.__report (read through CDP
// from the preview frame) and also posted to the parent (ignored by the app).
export function hostilePage({ label, version, nodeBase, cdnBase, markerDir }) {
  const nodeWs = nodeBase.replace(/^http/, 'ws');
  const def = (kind) => `HOSTILE-${kind}-${label}`;
  const mutation = (name) => `mutation{createAgentDefinition(input:{name:"${name}",role:"assistant",description:"api417 hostile probe",instructions:"x",toolNames:[]}){id}}`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Synthetic preview page ${label}</title>
  <link rel="stylesheet" href="style.css">
  <script src="classic.js"></script>
  <script src="${cdnBase}/cdn/lib.js"></script>
  <script type="module" src="module.js"></script>
  <style>@font-face { font-family: WsFont; src: url("font.ttf"); } .f { font-family: WsFont, serif; }</style>
</head>
<body>
  <h1 id="title">Synthetic report</h1>
  <h2 id="version">${version}</h2>
  <p class="f" id="fonttext">font sample</p>
  <img id="img" src="pixel.png" onerror="report('img-relative', 'error')" onload="report('img-relative', 'loaded ' + this.naturalWidth + 'x' + this.naturalHeight)">
  <pre id="report"></pre>
  <script>
    window.__report = { label: ${JSON.stringify(label)}, version: ${JSON.stringify(version)}, checks: {}, done: false };
    function report(name, value) {
      window.__report.checks[name] = String(value);
      document.getElementById('report').textContent = JSON.stringify(window.__report.checks, null, 1);
      try { parent.postMessage({ api417: ${JSON.stringify(label)}, name, value: String(value) }, '*'); } catch (e) {}
    }
    report('origin', self.origin);
    report('location-protocol', location.protocol);
    report('inline-script', 'ran');
    try { report('parent-document', 'readable: ' + (parent.document.title || '(no title)')); } catch (e) { report('parent-document', 'blocked: ' + e.name); }
    try { report('top-document', 'readable: ' + (top.document.title || '(no title)')); } catch (e) { report('top-document', 'blocked: ' + e.name); }
    try { report('parent-electronAPI', typeof parent.electronAPI); } catch (e) { report('parent-electronAPI', 'blocked: ' + e.name); }
    try {
      const api = parent.electronAPI;
      if (api && typeof api.readLocalTextFile === 'function') {
        api.readLocalTextFile('/etc/hosts').then(r => report('parent-electronAPI-call', 'main process answered: ' + JSON.stringify(r).slice(0, 80))).catch(e => report('parent-electronAPI-call', 'failed: ' + e));
      } else { report('parent-electronAPI-call', 'no api: ' + typeof api); }
    } catch (e) { report('parent-electronAPI-call', 'blocked: ' + e.name); }
    report('own-electronAPI', typeof window.electronAPI);
    try { localStorage.setItem('api417', 'v'); report('localStorage', 'works'); } catch (e) { report('localStorage', 'blocked: ' + e.name); }
    try { sessionStorage.setItem('api417', 'v'); report('sessionStorage', 'works'); } catch (e) { report('sessionStorage', 'blocked: ' + e.name); }
    try { const r = indexedDB.open('api417'); r.onsuccess = () => report('indexedDB', 'works'); r.onerror = () => report('indexedDB', 'error: ' + (r.error && r.error.name)); } catch (e) { report('indexedDB', 'blocked: ' + e.name); }
    try { document.cookie = 'api417=1'; report('cookie', 'readback=' + JSON.stringify(document.cookie)); } catch (e) { report('cookie', 'blocked: ' + e.name); }
    try { report('parent-localStorage-phone-credential', 'readable: ' + String(parent.localStorage.getItem('autobyteus.remote_access.mobile_session')).slice(0, 40)); } catch (e) { report('parent-localStorage-phone-credential', 'blocked: ' + e.name); }
    try { const w = new Worker('worker.js'); w.onmessage = (m) => report('worker', 'ran: ' + m.data); w.onerror = (e) => { e.preventDefault(); report('worker', 'error event'); }; } catch (e) { report('worker', 'blocked: ' + e.name); }
    fetch('data.json').then(r => r.json()).then(j => report('fetch-relative-json', 'loaded ' + j.ok)).catch(e => report('fetch-relative-json', 'failed: ' + e.name));
    // AC-003: node requests from the page.
    try {
      const ws = new WebSocket(${JSON.stringify(nodeWs)} + '/ws/terminal/hostile-' + ${JSON.stringify(label)} + '?cwd=' + encodeURIComponent(${JSON.stringify(markerDir)}));
      ws.onopen = () => { report('ws-terminal', 'opened'); ws.send(JSON.stringify({ type: 'input', data: btoa('touch ' + ${JSON.stringify(markerDir)} + '/hostile-' + ${JSON.stringify(label)} + '.marker\\r') })); };
      ws.onerror = () => report('ws-terminal-error', 'error event');
      ws.onclose = (e) => report('ws-terminal', 'closed code=' + e.code + (window.__report.checks['ws-terminal'] === 'opened' ? ' after open' : ' before open'));
    } catch (e) { report('ws-terminal', 'blocked: ' + e.name); }
    fetch(${JSON.stringify(nodeBase)} + '/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: ${JSON.stringify(mutation(def('JSON')))} }) })
      .then(r => r.text().then(t => report('graphql-post-json', 'status ' + r.status + ' ' + t.slice(0, 80)))).catch(e => report('graphql-post-json', 'failed: ' + e.name));
    fetch(${JSON.stringify(nodeBase)} + '/graphql', { method: 'POST', mode: 'no-cors', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ query: ${JSON.stringify(mutation(def('TEXT')))} }) })
      .then(r => report('graphql-post-simple', 'sent (opaque response type=' + r.type + ')')).catch(e => report('graphql-post-simple', 'failed: ' + e.name));
    fetch(${JSON.stringify(nodeBase)} + '/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ __typename }' }) })
      .then(r => r.text().then(t => report('graphql-read-json', 'status ' + r.status + ' ' + t.slice(0, 60)))).catch(e => report('graphql-read-json', 'failed: ' + e.name));
    { const g = new Image(); g.onload = () => report('graphql-get-img', 'load'); g.onerror = () => report('graphql-get-img', 'error (sent without Origin)');
      g.src = ${JSON.stringify(nodeBase)} + '/graphql?query=' + encodeURIComponent(${JSON.stringify(mutation(def('GET')))}); }
    setTimeout(() => {
      report('classic-script', window.CLASSIC_LOADED === true ? 'ran' : 'did-not-run');
      report('other-site-script', window.CDN_LOADED === true ? 'ran' : 'did-not-run');
      report('module-script', window.MODULE_LOADED === true ? 'ran' : 'did-not-run');
      report('css', getComputedStyle(document.getElementById('title')).color);
      report('font-relative', document.fonts.check('16px WsFont') ? 'loaded' : 'not loaded (' + [...document.fonts].map(f => f.family + ':' + f.status).join(',') + ')');
      window.__report.done = true;
      report('done', 'yes');
    }, 3000);
  </script>
</body>
</html>
`;
}

export const assets = {
  'classic.js': 'window.CLASSIC_LOADED = true;\n',
  'module.js': 'window.MODULE_LOADED = true;\n',
  'style.css': '#title { color: rgb(255, 0, 0); }\n',
  'data.json': '{"ok": true}\n',
  'worker.js': 'postMessage("worker-ok");\n',
};
