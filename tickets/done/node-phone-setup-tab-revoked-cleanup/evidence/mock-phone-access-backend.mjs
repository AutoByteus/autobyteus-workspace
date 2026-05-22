import http from 'node:http';

const now = '2026-05-22T10:00:00.000Z';
let activeDevices = [
  {
    deviceId: 'active-1',
    displayName: 'Active Phone',
    clientFacingBaseUrl: 'https://desktop.tailnet.ts.net',
    createdAt: now,
    lastSeenAt: null,
    revokedAt: null,
  },
];
let revokedDevices = Array.from({ length: 19 }, (_, index) => ({
  deviceId: `revoked-${index + 1}`,
  displayName: `Revoked Phone ${index + 1}`,
  clientFacingBaseUrl: 'https://desktop.tailnet.ts.net',
  createdAt: '2026-05-21T10:00:00.000Z',
  lastSeenAt: null,
  revokedAt: `2026-05-22T0${Math.floor(index / 10)}:${String(index % 10).padStart(2, '0')}:00.000Z`,
}));
const observed = { pairingPosts: [] };

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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost:8000');
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (req.method === 'GET' && url.pathname === '/rest/health') return send(res, 200, { status: 'ok' });
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/settings') {
      return send(res, 200, { settings: { phoneAccessEnabled: true, updatedAt: now, updatedBy: 'loopback-desktop' } });
    }
    if (req.method === 'PUT' && url.pathname === '/rest/remote-access/settings') {
      return send(res, 200, { settings: { phoneAccessEnabled: true, updatedAt: now, updatedBy: 'loopback-desktop' } });
    }
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/address-candidates') {
      const manual = url.searchParams.get('manualServerBaseUrl')?.trim();
      return send(res, 200, { candidates: [
        ...(manual ? [{ id: 'manual', kind: 'manual', label: 'Manual URL', serverBaseUrl: manual, source: 'manual' }] : []),
        { id: 'tailnet', kind: 'tailnet_like', label: 'Tailscale HTTPS', serverBaseUrl: 'https://desktop.tailnet.ts.net/mobile', source: 'mock' },
        { id: 'lan', kind: 'lan', label: 'LAN HTTP', serverBaseUrl: 'http://192.168.1.25:29695', source: 'mock' },
      ] });
    }
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/devices') {
      return send(res, 200, { devices: activeDevices });
    }
    if (req.method === 'GET' && url.pathname === '/rest/remote-access/devices/revoked') {
      return send(res, 200, { devices: revokedDevices });
    }
    if (req.method === 'POST' && url.pathname === '/rest/remote-access/pairing-sessions') {
      const body = await readJson(req);
      observed.pairingPosts.push(body);
      const serverBaseUrl = normalizeBase(String(body.serverBaseUrl || ''));
      if (!serverBaseUrl.startsWith('https://')) {
        return send(res, 400, { code: 'REMOTE_ACCESS_HTTPS_REQUIRED', message: 'Phone Access pairing requires an HTTPS server URL.' });
      }
      const payload = {
        version: 1,
        serverBaseUrl,
        pairingCode: `code-${observed.pairingPosts.length}`,
        expiresAt: '2026-05-22T10:05:00.000Z',
        serverName: 'AutoByteus Desktop',
      };
      const pairing = encodePayload(payload);
      return send(res, 201, {
        payload,
        qrText: `${serverBaseUrl}/mobile?pairing=${pairing}`,
        mobileUrl: `${serverBaseUrl}/mobile?pairing=${pairing}`,
      });
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/rest/remote-access/devices/')) {
      const deviceId = decodeURIComponent(url.pathname.substring('/rest/remote-access/devices/'.length));
      const device = activeDevices.find((item) => item.deviceId === deviceId);
      activeDevices = activeDevices.filter((item) => item.deviceId !== deviceId);
      if (device) {
        const revoked = { ...device, revokedAt: '2026-05-22T10:01:00.000Z' };
        revokedDevices = [revoked, ...revokedDevices];
        return send(res, 200, { device: revoked });
      }
      return send(res, 404, { detail: 'Paired device not found.' });
    }
    if (req.method === 'DELETE' && url.pathname === '/rest/remote-access/devices') {
      const count = activeDevices.length;
      revokedDevices = [
        ...activeDevices.map((device) => ({ ...device, revokedAt: '2026-05-22T10:02:00.000Z' })),
        ...revokedDevices,
      ];
      activeDevices = [];
      return send(res, 200, { result: { revokedCount: count } });
    }
    if (req.method === 'GET' && url.pathname === '/__observed') return send(res, 200, observed);
    return send(res, 404, { error: `No mock route for ${req.method} ${url.pathname}` });
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(8000, '127.0.0.1', () => {
  console.log('mock phone access backend listening on http://127.0.0.1:8000');
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
