import http from 'node:http';

const now = '2026-05-22T17:30:00.000Z';
const observed = { pairingPosts: [], candidateRequests: [] };
let activeDevices = [];
let revokedDevices = [];

function send(res, status, body) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function encodePayload(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function normalizeBase(value) {
  const parsed = new URL(value);
  const parts = parsed.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  const reserved = new Set(['mobile', 'rest', 'graphql', 'ws']);
  const idx = parts.findIndex((part) => reserved.has(part.toLowerCase()));
  const baseParts = idx >= 0 ? parts.slice(0, idx) : parts;
  parsed.pathname = baseParts.length ? `/${baseParts.join('/')}` : '';
  parsed.search = '';
  parsed.hash = '';
  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
}

function candidateList(manualServerBaseUrl) {
  const candidates = [
    { id: 'tailnet-ip-http', kind: 'tailnet_like', label: 'Tailnet-like address (diagnostic)', serverBaseUrl: 'http://100.64.1.2:29695', source: 'mock' },
    { id: 'lan-http', kind: 'lan', label: 'Private/LAN address (diagnostic)', serverBaseUrl: 'http://192.168.1.25:29695', source: 'mock' },
  ];
  if (manualServerBaseUrl?.trim()) {
    candidates.push({ id: 'manual', kind: 'manual', label: 'Manual URL', serverBaseUrl: normalizeBase(manualServerBaseUrl), source: 'manual' });
  }
  return candidates;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost:8000');
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (req.method === 'GET' && url.pathname === '/rest/health') return send(res, 200, { status: 'ok' });
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/settings') return send(res, 200, { settings: { phoneAccessEnabled: true, updatedAt: now, updatedBy: 'loopback-desktop' } });
    if (req.method === 'PUT' && url.pathname === '/rest/remote-access/settings') return send(res, 200, { settings: { phoneAccessEnabled: true, updatedAt: now, updatedBy: 'loopback-desktop' } });
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/address-candidates') {
      const manualServerBaseUrl = url.searchParams.get('manualServerBaseUrl') || '';
      observed.candidateRequests.push({ manualServerBaseUrl });
      return send(res, 200, { candidates: candidateList(manualServerBaseUrl) });
    }
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/devices') return send(res, 200, { devices: activeDevices });
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/devices/revoked') return send(res, 200, { devices: revokedDevices });
    if (req.method === 'POST' && url.pathname === '/rest/remote-access/pairing-sessions') {
      const body = await readJson(req);
      observed.pairingPosts.push(body);
      const serverBaseUrl = normalizeBase(String(body.serverBaseUrl || ''));
      if (!serverBaseUrl.startsWith('https://')) {
        return send(res, 400, { code: 'REMOTE_ACCESS_HTTPS_REQUIRED', message: 'Phone Access pairing requires an HTTPS server URL.' });
      }
      const payload = { version: 1, serverBaseUrl, pairingCode: `round6-${observed.pairingPosts.length}`, expiresAt: '2026-05-22T17:35:00.000Z', serverName: 'AutoByteus Desktop' };
      const pairing = encodePayload(payload);
      return send(res, 201, { payload, qrText: `${serverBaseUrl}/mobile?pairing=${pairing}`, mobileUrl: `${serverBaseUrl}/mobile?pairing=${pairing}` });
    }
    if (req.method === 'GET' && url.pathname === '/__observed') return send(res, 200, observed);
    return send(res, 404, { error: `No mock route for ${req.method} ${url.pathname}` });
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(8000, '127.0.0.1', () => {
  console.log('round6 mock phone access backend listening on http://127.0.0.1:8000');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
