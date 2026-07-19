const { app, net, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const webRoot = process.env.PROBE_WEB_ROOT;
const probeRoot = process.env.PROBE_ROOT;
const fixturePath = process.env.PROBE_MATRIX_FILE;
const outputPath = process.env.PROBE_OUTPUT;
const scheme = 'local-file';
const authority = 'local';
app.setName('AutoByteusFixedAuthorityMatrixProbe');
app.setPath('userData', path.join(probeRoot, 'user-data-fixed-matrix'));
protocol.registerSchemesAsPrivileged([{ scheme, privileges: { standard: true, stream: true } }]);
const { createLocalFileResponse } = require(path.join(webRoot, 'dist/electron/local-file-protocol/local-file-response.js'));
const buildUrl = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  const encoded = normalized.split('/').map((segment, index) => (
    index === 0 && /^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)
  )).join('/');
  return `${scheme}://${authority}${encoded.startsWith('/') ? encoded : `/${encoded}`}`;
};
const result = { runtime: null, fixturePath, rendererUrl: buildUrl(fixturePath), handlerRequests: [], scenarios: [] };
const read = async (label, url, init = {}) => {
  let response;
  try {
    response = await net.fetch(url, init);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const item = { label, request: { url, method: init.method || 'GET', headers: init.headers || {} }, response: { status: response.status, headers: Object.fromEntries(response.headers.entries()), byteLength: bytes.length, bytesHex: Buffer.from(bytes).toString('hex') } };
    result.scenarios.push(item);
    return item;
  } catch (error) {
    const item = { label, request: { url, method: init.method || 'GET', headers: init.headers || {} }, threw: String(error && error.message || error) };
    result.scenarios.push(item);
    return item;
  }
};
app.whenReady().then(async () => {
  result.runtime = { electron: process.versions.electron, chrome: process.versions.chrome, node: process.versions.node, platform: process.platform, arch: process.arch };
  protocol.handle(scheme, async (request) => {
    const parsed = new URL(request.url);
    const record = { url: request.url, method: request.method, range: request.headers.get('range'), parsed: { hostname: parsed.hostname, pathname: parsed.pathname, port: parsed.port, username: parsed.username, search: parsed.search, hash: parsed.hash } };
    result.handlerRequests.push(record);
    if (parsed.hostname !== authority || parsed.port || parsed.username || parsed.password || parsed.search || parsed.hash) {
      record.responseStatus = 404;
      return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    const translated = `${scheme}://${parsed.pathname}`;
    record.probeOnlyTranslatedRequestUrl = translated;
    const response = await createLocalFileResponse(new Request(translated, { method: request.method, headers: request.headers }));
    record.responseStatus = response.status;
    return response;
  });
  const url = result.rendererUrl;
  await read('full-get', url);
  await read('range-2-5', url, { headers: { Range: 'bytes=2-5' } });
  await read('suffix-3', url, { headers: { Range: 'bytes=-3' } });
  await read('head', url, { method: 'HEAD' });
  await read('post', url, { method: 'POST' });
  await read('malformed-multi-range', url, { headers: { Range: 'bytes=0-1,4-5' } });
  await read('unsatisfiable', url, { headers: { Range: 'bytes=10-' } });
  await read('wrong-authority', url.replace('://local/', '://relative/'));
  await read('missing', buildUrl(path.join(probeRoot, 'Missing Case %.bin')));
  await read('directory', buildUrl(path.dirname(fixturePath)));
  result.result = 'Complete';
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  app.exit(0);
}).catch((error) => {
  result.error = { message: error.message, stack: error.stack };
  try { fs.writeFileSync(outputPath, JSON.stringify(result, null, 2)); } catch {}
  console.error(error);
  app.exit(2);
});
