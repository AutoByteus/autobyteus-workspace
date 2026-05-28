#!/usr/bin/env node
/* Temporary Round 3 API/E2E runtime probe. Writes redacted scenario evidence only. */
const fs = require('fs');
const { execFileSync } = require('child_process');
const WebSocket = require('ws');

const statePath = process.argv[2];
const outputPath = process.argv[3];
if (!statePath || !outputPath) {
  console.error('usage: node api-e2e-round3-runtime-probe.cjs <launcher-state.env> <output.json>');
  process.exit(2);
}

function readEnvFile(path) {
  const result = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    result[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return result;
}

const state = readEnvFile(statePath);
const base = `http://127.0.0.1:${state.BACKEND_PORT}`;
const wsBase = `ws://127.0.0.1:${state.BACKEND_PORT}`;
const lmn = state.LOCAL_MANAGEMENT_CREDENTIAL || '';
const lmnHash = state.LOCAL_MANAGEMENT_CREDENTIAL_HASH || '';
const container = state.CONTAINER_NAME || state.NODE_NAME || 'autobyteus-server-2';

if (!lmn.startsWith('lmn_')) throw new Error('launcher state does not contain an lmn_ credential');
if (!/^[0-9a-f]{64}$/i.test(lmnHash)) throw new Error('launcher state does not contain a sha256 local management credential hash');

let mra = '';
let deviceId = '';
let pairingPayload = null;
let beforeRestartServerInstanceId = '';
let afterRestartServerInstanceId = '';

const startedAt = new Date().toISOString();
const results = [];

function redactUrl(url) {
  return String(url || '').replace(/(access_token=)([^&]+)/g, '$1[REDACTED]');
}
function summarizeBody(body) {
  if (body == null) return body;
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return text
    .replace(/lmn_[A-Za-z0-9_-]+/g, '[REDACTED_LMN]')
    .replace(/mra_[A-Za-z0-9_-]+/g, '[REDACTED_MRA]')
    .replace(/rao_[A-Za-z0-9_-]+/g, '[REDACTED_RAO]')
    .replace(/nac_[A-Za-z0-9_-]+/g, '[REDACTED_NAC]')
    .replace(/nas_[A-Za-z0-9_-]+/g, '[REDACTED_NAS]');
}
function record(id, ok, summary, extra = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(extra)) {
    if (key.toLowerCase().includes('credential') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
      safe[key] = typeof value === 'string' ? value.replace(/^(lmn_|mra_|rao_|nac_|nas_).*/, '$1[REDACTED]') : value;
    } else if (key.toLowerCase().includes('url')) {
      safe[key] = redactUrl(value);
    } else {
      safe[key] = value;
    }
  }
  results.push({ id, ok: Boolean(ok), at: new Date().toISOString(), summary, ...safe });
}
function authHeader(kind) {
  if (kind === 'lmn') return { Authorization: `Bearer ${lmn}` };
  if (kind === 'mra') return { Authorization: `Bearer ${mra}` };
  if (kind === 'invalid-lmn') return { Authorization: 'Bearer lmn_invalid_validation_credential' };
  if (kind === 'invalid-mra') return { Authorization: 'Bearer mra_invalid_validation_credential' };
  if (kind === 'rao') return { Authorization: 'Bearer rao_invalid_validation_credential' };
  return {};
}
async function http(method, path, { body, auth, headers = {} } = {}) {
  const finalHeaders = { ...headers };
  if (body !== undefined) finalHeaders['content-type'] = 'application/json';
  Object.assign(finalHeaders, authHeader(auth));
  const res = await fetch(`${base}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let parsed = text;
  if (contentType.includes('application/json')) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }
  return { status: res.status, contentType, body: parsed, text };
}
async function graphql(query, auth) {
  return http('POST', '/graphql', { auth, body: { query } });
}
function closeCodeName(code) { return code ? String(code) : 'none'; }
function wsProbe(path, { token, expectMessageType, timeoutMs = 2500 } = {}) {
  return new Promise((resolve) => {
    const fullUrl = `${wsBase}${path}${token ? `${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(fullUrl);
    const events = { opened: false, messages: [], closeCode: null, closeReason: '', error: '' };
    const timer = setTimeout(() => {
      events.timeout = true;
      try { ws.close(1000, 'validation complete'); } catch {}
      resolve(events);
    }, timeoutMs);
    ws.on('open', () => { events.opened = true; });
    ws.on('message', (raw) => {
      const text = raw.toString();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch {}
      events.messages.push(parsed || summarizeBody(text));
      if (expectMessageType && parsed && parsed.type === expectMessageType) {
        clearTimeout(timer);
        try { ws.close(1000, 'validation complete'); } catch {}
        resolve(events);
      }
    });
    ws.on('close', (code, reason) => {
      clearTimeout(timer);
      events.closeCode = code;
      events.closeReason = reason.toString();
      resolve(events);
    });
    ws.on('error', (error) => { events.error = error.message; });
  });
}
function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf8' });
}
async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const health = await http('GET', '/rest/health');
      if (health.status === 200) return health;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('health did not recover after restart');
}

(async () => {
  const health = await http('GET', '/rest/health');
  record('VAL-001-health', health.status === 200 && health.body.status === 'ok', `status=${health.status}`, { status: health.status, body: health.body });

  const mobile = await http('GET', '/mobile');
  record('VAL-002-mobile-shell', mobile.status === 200 && /text\/html/.test(mobile.contentType) && /\/mobile\/_nuxt\//.test(mobile.text), `status=${mobile.status}, content-type=${mobile.contentType}`, { status: mobile.status, contentType: mobile.contentType, bodyStart: summarizeBody(mobile.text.slice(0, 180)) });

  const status = await http('GET', '/rest/remote-access/status');
  beforeRestartServerInstanceId = status.body.serverInstanceId;
  record('VAL-003-public-status', status.status === 200 && Boolean(beforeRestartServerInstanceId), `status=${status.status}, serverInstanceId=${beforeRestartServerInstanceId}`, { status: status.status, body: status.body });

  const unauthGraphql = await graphql('query GetAgentDefinitions { agentDefinitions { id name } }');
  record('VAL-004-graphql-requires-auth', unauthGraphql.status === 401 && unauthGraphql.body.code === 'REMOTE_ACCESS_AUTH_REQUIRED', `status=${unauthGraphql.status}, code=${unauthGraphql.body.code}`, { status: unauthGraphql.status, body: unauthGraphql.body });

  const unauthSettings = await http('GET', '/rest/remote-access/settings');
  record('VAL-005-owner-rest-requires-lmn', unauthSettings.status === 401 && unauthSettings.body.code === 'REMOTE_ACCESS_AUTH_REQUIRED', `status=${unauthSettings.status}, code=${unauthSettings.body.code}`, { status: unauthSettings.status, body: unauthSettings.body });

  const invalidLmn = await http('GET', '/rest/remote-access/settings', { auth: 'invalid-lmn' });
  record('VAL-006-invalid-lmn-rejected', invalidLmn.status === 401 && invalidLmn.body.code === 'REMOTE_ACCESS_AUTH_INVALID', `status=${invalidLmn.status}, code=${invalidLmn.body.code}`, { status: invalidLmn.status, body: invalidLmn.body });

  const rao = await graphql('query GetAgentDefinitions { agentDefinitions { id } }', 'rao');
  record('VAL-007-old-owner-token-prefix-rejected', rao.status === 401 && rao.body.code === 'REMOTE_ACCESS_AUTH_INVALID', `status=${rao.status}, code=${rao.body.code}`, { status: rao.status, body: rao.body });

  const spoof = await http('GET', '/rest/remote-access/settings', {
    headers: {
      Host: 'localhost',
      Origin: 'http://localhost',
      'X-Forwarded-For': '127.0.0.1',
      'X-Real-IP': '127.0.0.1',
      'X-Autobyteus-Local-Trust': '1',
      'X-Autobyteus-Node-Admin-Claim-Id': 'nac_validation_spoof',
      'X-Autobyteus-Node-Admin-Claim-Secret': 'nas_validation_spoof',
    },
  });
  record('VAL-008-spoofed-local-and-claim-headers-rejected', spoof.status === 401 && spoof.body.code === 'REMOTE_ACCESS_AUTH_REQUIRED', `status=${spoof.status}, code=${spoof.body.code}`, { status: spoof.status, body: spoof.body });

  const settingsEnable = await http('PUT', '/rest/remote-access/settings', { auth: 'lmn', body: { phoneAccessEnabled: true } });
  record('VAL-009-lmn-authorizes-owner-rest', settingsEnable.status === 200 && settingsEnable.body.settings?.phoneAccessEnabled === true, `status=${settingsEnable.status}, enabled=${settingsEnable.body.settings?.phoneAccessEnabled}`, { status: settingsEnable.status, body: settingsEnable.body });

  const protectedRestNoAuth = await http('GET', '/rest/files/__validation_missing__');
  const protectedRestLmn = await http('GET', '/rest/files/__validation_missing__', { auth: 'lmn' });
  record('VAL-010-lmn-passes-protected-rest-policy', protectedRestNoAuth.status === 401 && protectedRestLmn.status !== 401 && protectedRestLmn.status !== 403, `noAuth=${protectedRestNoAuth.status}, lmn=${protectedRestLmn.status}`, { noAuthStatus: protectedRestNoAuth.status, noAuthCode: protectedRestNoAuth.body.code, lmnStatus: protectedRestLmn.status, lmnBody: protectedRestLmn.body });

  const gqlLmn = await graphql('query GetAgentDefinitions { agentDefinitions { id name } }', 'lmn');
  const gqlCount = Array.isArray(gqlLmn.body.data?.agentDefinitions) ? gqlLmn.body.data.agentDefinitions.length : null;
  record('VAL-011-lmn-authorizes-graphql', gqlLmn.status === 200 && gqlCount !== null, `status=${gqlLmn.status}, count=${gqlCount}`, { status: gqlLmn.status, count: gqlCount });

  const pairingSession = await http('POST', '/rest/remote-access/pairing-sessions', { auth: 'lmn', body: { serverBaseUrl: 'https://docker-validation.example', serverName: 'Validation Docker Node' } });
  const mobileUrl = pairingSession.body.mobileUrl || '';
  const encodedPairing = new URL(mobileUrl).searchParams.get('pairing');
  pairingPayload = JSON.parse(Buffer.from(encodedPairing, 'base64url').toString('utf8'));
  const pairingSerialized = JSON.stringify(pairingSession.body);
  const noManagementLeak = !pairingSerialized.includes(lmn) && !pairingSerialized.includes(lmnHash) && !/lmn_|rao_|nac_|nas_|NODE_ADMIN|CLAIM|OWNER/.test(pairingSerialized);
  record('VAL-012-lmn-creates-mobile-pairing-with-separated-payload', pairingSession.status === 201 && noManagementLeak && pairingPayload.pairingCode, `status=${pairingSession.status}, noManagementLeak=${noManagementLeak}`, { status: pairingSession.status, mobileUrl: mobileUrl.replace(encodedPairing, '[REDACTED_PAIRING_PAYLOAD]'), pairingPayload: { ...pairingPayload, pairingCode: '[REDACTED_PAIRING_CODE]' } });

  const exchange = await http('POST', '/rest/remote-access/pairing-exchanges', { body: { pairingCode: pairingPayload.pairingCode, deviceName: 'Validation Android', serverBaseUrl: pairingPayload.serverBaseUrl } });
  mra = exchange.body.credential || '';
  deviceId = exchange.body.device?.deviceId || '';
  record('VAL-013-pairing-exchange-returns-mobile-credential', exchange.status === 201 && mra.startsWith('mra_') && Boolean(deviceId), `status=${exchange.status}, credentialPrefix=${mra.slice(0, 4)}`, { status: exchange.status, credentialPrefix: mra.slice(0, 4), device: exchange.body.device });

  const mobileOwnerGet = await http('GET', '/rest/remote-access/devices', { auth: 'mra' });
  const mobileOwnerPost = await http('POST', '/rest/remote-access/pairing-sessions', { auth: 'mra', body: { serverBaseUrl: 'https://docker-validation.example' } });
  record('VAL-014-mobile-credential-not-owner-management-auth', mobileOwnerGet.status === 401 && mobileOwnerPost.status === 401, `GET devices=${mobileOwnerGet.status}, POST pairing=${mobileOwnerPost.status}`, { getStatus: mobileOwnerGet.status, getCode: mobileOwnerGet.body.code, postStatus: mobileOwnerPost.status, postCode: mobileOwnerPost.body.code });

  const gqlMra = await graphql('query GetAgentDefinitions { agentDefinitions { id name } }', 'mra');
  const gqlMraCount = Array.isArray(gqlMra.body.data?.agentDefinitions) ? gqlMra.body.data.agentDefinitions.length : null;
  record('VAL-015-mobile-credential-authorizes-graphql', gqlMra.status === 200 && gqlMraCount !== null, `status=${gqlMra.status}, count=${gqlMraCount}`, { status: gqlMra.status, count: gqlMraCount });

  const appNoAuth = await http('GET', '/rest/applications/__validation_missing__/backend/status');
  const appLmn = await http('GET', '/rest/applications/__validation_missing__/backend/status', { auth: 'lmn' });
  const appMra = await http('GET', '/rest/applications/__validation_missing__/backend/status', { auth: 'mra' });
  record('VAL-016-protected-application-backend-rest-auth-policy', appNoAuth.status === 401 && ![401, 403].includes(appLmn.status) && ![401, 403].includes(appMra.status), `noAuth=${appNoAuth.status}, lmn=${appLmn.status}, mra=${appMra.status}`, { noAuthStatus: appNoAuth.status, lmnStatus: appLmn.status, lmnBody: appLmn.body, mraStatus: appMra.status, mraBody: appMra.body });

  const wsNoAuth = await wsProbe('/ws/terminal/__missing__/session');
  const wsBad = await wsProbe('/ws/terminal/__missing__/session', { token: 'lmn_invalid_validation_credential' });
  const wsLmn = await wsProbe('/ws/terminal/__missing__/session', { token: lmn });
  const wsMra = await wsProbe('/ws/terminal/__missing__/session', { token: mra });
  record('VAL-017-websocket-terminal-auth-matrix', wsNoAuth.closeCode === 4401 && wsBad.closeCode === 4401 && wsLmn.closeCode === 4004 && wsMra.closeCode === 4004, `noAuth=${closeCodeName(wsNoAuth.closeCode)}, bad=${closeCodeName(wsBad.closeCode)}, lmn=${closeCodeName(wsLmn.closeCode)}, mra=${closeCodeName(wsMra.closeCode)}`, { noAuth: wsNoAuth, invalidLmn: wsBad, lmn: wsLmn, mra: wsMra });

  const appWsNoAuth = await wsProbe('/ws/applications/__validation_missing__/backend/notifications');
  const appWsLmn = await wsProbe('/ws/applications/__validation_missing__/backend/notifications', { token: lmn, expectMessageType: 'connected' });
  const appWsMra = await wsProbe('/ws/applications/__validation_missing__/backend/notifications', { token: mra, expectMessageType: 'connected' });
  const lmnConnected = appWsLmn.messages.some((m) => m && m.type === 'connected');
  const mraConnected = appWsMra.messages.some((m) => m && m.type === 'connected');
  record('VAL-018-protected-application-backend-notification-ws-auth-policy', appWsNoAuth.closeCode === 4401 && lmnConnected && mraConnected, `noAuth=${closeCodeName(appWsNoAuth.closeCode)}, lmnConnected=${lmnConnected}, mraConnected=${mraConnected}`, { noAuth: appWsNoAuth, lmn: appWsLmn, mra: appWsMra });

  docker('restart', container);
  await waitForHealth();
  const restartStatus = await http('GET', '/rest/remote-access/status');
  afterRestartServerInstanceId = restartStatus.body.serverInstanceId;
  const restartMobile = await http('GET', '/mobile');
  const restartLmn = await graphql('query GetAgentDefinitions { agentDefinitions { id } }', 'lmn');
  const restartMra = await graphql('query GetAgentDefinitions { agentDefinitions { id } }', 'mra');
  record('VAL-019-container-restart-preserves-lmn-mra-and-mobile-shell', beforeRestartServerInstanceId === afterRestartServerInstanceId && restartMobile.status === 200 && restartLmn.status === 200 && restartMra.status === 200, `serverInstanceSame=${beforeRestartServerInstanceId === afterRestartServerInstanceId}, mobile=${restartMobile.status}, lmnGraphql=${restartLmn.status}, mraGraphql=${restartMra.status}`, { beforeRestartServerInstanceId, afterRestartServerInstanceId, mobileStatus: restartMobile.status, lmnGraphqlStatus: restartLmn.status, mraGraphqlStatus: restartMra.status });

  const disabled = await http('PUT', '/rest/remote-access/settings', { auth: 'lmn', body: { phoneAccessEnabled: false } });
  const disabledGql = await graphql('query GetAgentDefinitions { agentDefinitions { id } }', 'mra');
  const disabledWs = await wsProbe('/ws/terminal/__missing__/session', { token: mra });
  record('VAL-020-disabled-phone-access-rejects-mobile-credential', disabled.status === 200 && disabledGql.status === 403 && disabledGql.body.code === 'PHONE_ACCESS_DISABLED' && disabledWs.closeCode === 4403, `disable=${disabled.status}, gql=${disabledGql.status}/${disabledGql.body.code}, ws=${closeCodeName(disabledWs.closeCode)}`, { disableStatus: disabled.status, gqlStatus: disabledGql.status, gqlBody: disabledGql.body, ws: disabledWs });

  await http('PUT', '/rest/remote-access/settings', { auth: 'lmn', body: { phoneAccessEnabled: true } });
  const revoked = await http('DELETE', `/rest/remote-access/devices/${encodeURIComponent(deviceId)}`, { auth: 'lmn' });
  const revokedGql = await graphql('query GetAgentDefinitions { agentDefinitions { id } }', 'mra');
  const revokedWs = await wsProbe('/ws/terminal/__missing__/session', { token: mra });
  record('VAL-021-revoked-mobile-credential-rejected', revoked.status === 200 && revokedGql.status === 403 && revokedGql.body.code === 'REMOTE_ACCESS_DEVICE_REVOKED' && revokedWs.closeCode === 4403, `revoke=${revoked.status}, gql=${revokedGql.status}/${revokedGql.body.code}, ws=${closeCodeName(revokedWs.closeCode)}`, { revokeStatus: revoked.status, revokedDeviceId: deviceId, gqlStatus: revokedGql.status, gqlBody: revokedGql.body, ws: revokedWs });

  // Restore enabled setting for manual user testing against the still-running Docker node.
  const restored = await http('PUT', '/rest/remote-access/settings', { auth: 'lmn', body: { phoneAccessEnabled: true } });
  record('VAL-022-restored-phone-access-enabled-for-manual-testing', restored.status === 200 && restored.body.settings?.phoneAccessEnabled === true, `status=${restored.status}, enabled=${restored.body.settings?.phoneAccessEnabled}`, { status: restored.status, body: restored.body });

  const inspectEnv = docker('inspect', container, '--format', '{{json .Config.Env}}');
  const inspectRaw = docker('inspect', container);
  const logs = docker('logs', container);
  const launcherStdout = fs.existsSync('tickets/mobile-safe-container-401/validation-evidence/api-e2e-round3-launcher-start.log')
    ? fs.readFileSync('tickets/mobile-safe-container-401/validation-evidence/api-e2e-round3-launcher-start.log', 'utf8')
    : '';
  const leakCounts = {
    rawLmnInInspectEnv: inspectEnv.includes(lmn) ? 1 : 0,
    rawLmnInInspectJson: inspectRaw.includes(lmn) ? 1 : 0,
    rawLmnInDockerLogs: logs.includes(lmn) ? 1 : 0,
    rawMraInDockerLogs: logs.includes(mra) ? 1 : 0,
    rawLmnInLauncherStdout: launcherStdout.includes(lmn) ? 1 : 0,
    oldClaimOwnerInNewState: /NODE_ADMIN|OWNER|CLAIM|rao_|nac_|nas_/.test(fs.readFileSync(statePath, 'utf8')) ? 1 : 0,
  };
  record('VAL-023-no-raw-local-management-or-mobile-secret-leakage-observed', Object.values(leakCounts).every((value) => value === 0), `leakCounts=${JSON.stringify(leakCounts)}`, { leakCounts });

  const ok = results.every((result) => result.ok);
  const output = {
    generatedAt: new Date().toISOString(),
    startedAt,
    base,
    container,
    statePath,
    credentialPrefixesObserved: { localManagement: lmn.slice(0, 4), mobile: mra.slice(0, 4) || null },
    serverInstanceIds: { beforeRestart: beforeRestartServerInstanceId, afterRestart: afterRestartServerInstanceId },
    result: ok ? 'pass' : 'fail',
    results,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  if (!ok) {
    console.error(`Runtime probe failed; see ${outputPath}`);
    process.exit(1);
  }
})().catch((error) => {
  record('VAL-999-probe-error', false, summarizeBody(error && error.stack ? error.stack : String(error)));
  fs.writeFileSync(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), base, container, result: 'fail', results }, null, 2)}\n`);
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
