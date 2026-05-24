#!/usr/bin/env node
const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const WebSocket = require('ws');

const statePath = process.env.AUTOBYTEUS_VALIDATION_STATE_PATH;
const containerName = process.env.AUTOBYTEUS_VALIDATION_CONTAINER || 'autobyteus-server-2';
if (!statePath) throw new Error('AUTOBYTEUS_VALIDATION_STATE_PATH is required.');
const stateText = fs.readFileSync(statePath, 'utf8');
const state = Object.fromEntries(stateText.trim().split(/\n+/).map((line) => line.split(/=(.*)/s).slice(0, 2)));
const port = state.BACKEND_PORT;
if (!port) throw new Error(`BACKEND_PORT missing from ${statePath}`);
const baseUrl = `http://127.0.0.1:${port}`;
const wsBaseUrl = `ws://127.0.0.1:${port}`;

const sensitive = new Set();
const secretHashes = [];
const tokenPattern = /\b(?:mra_|lmn_|rao_|nac_|nas_)[A-Za-z0-9._:-]+/g;
const oldTermPattern = /lmn_|rao_|nac_|nas_|NODE_ADMIN|nodeAdmin|node-admin|owner-session|owner session|local-management|AUTOBYTEUS_LOCAL|LOCAL_MANAGEMENT|remote-node-admin|RemoteNodeAdmin|claimId|claimSecret|adminClaim|AUTOBYTEUS_NODE_ADMIN_CLAIM/;

function rememberSecret(value, label) {
  if (!value || typeof value !== 'string') return;
  sensitive.add(value);
  secretHashes.push({ label, sha256: crypto.createHash('sha256').update(value).digest('hex') });
}
function redact(value) {
  if (value == null) return value;
  let text = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of sensitive) text = text.split(secret).join('[REDACTED]');
  text = text.replace(tokenPattern, (m) => `${m.slice(0, 4)}[REDACTED]`);
  return typeof value === 'string' ? text : JSON.parse(text);
}
function redactText(text) {
  let out = String(text ?? '');
  for (const secret of sensitive) out = out.split(secret).join('[REDACTED]');
  return out.replace(tokenPattern, (m) => `${m.slice(0, 4)}[REDACTED]`);
}
const results = [];
async function step(id, description, fn) {
  const started = new Date().toISOString();
  try {
    const detail = await fn();
    results.push({ id, description, status: 'pass', started, detail: redact(detail) });
  } catch (error) {
    results.push({ id, description, status: 'fail', started, error: redactText(error && error.stack ? error.stack : String(error)) });
  }
}
function expect(condition, message, details) {
  if (!condition) {
    throw new Error(`${message}${details ? ` :: ${redactText(JSON.stringify(details))}` : ''}`);
  }
}
async function http(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
}
async function graphql(query, token) {
  return http('/graphql', { method: 'POST', token, body: { query } });
}
async function waitForHealth(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try {
      const res = await http('/rest/health');
      if (res.status === 200) return res;
      last = res;
    } catch (error) {
      last = String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`server did not become healthy: ${redactText(JSON.stringify(last))}`);
}
async function wsProbe(url, opts = {}) {
  return await new Promise((resolve) => {
    const protocols = opts.protocols;
    const ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url);
    const outcome = { opened: false, messages: [], close: null, error: null, timeout: false };
    const timer = setTimeout(() => {
      outcome.timeout = true;
      try { ws.close(1000, 'validation-timeout'); } catch {}
      resolve(outcome);
    }, opts.timeoutMs || 2500);
    const finish = () => { clearTimeout(timer); resolve(outcome); };
    ws.on('open', () => {
      outcome.opened = true;
      if (opts.sendOnOpen) {
        for (const msg of opts.sendOnOpen) ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
      if (opts.resolveOnOpen) {
        setTimeout(() => { try { ws.close(1000, 'validation-complete'); } catch {}; finish(); }, opts.openHoldMs || 150);
      }
    });
    ws.on('message', (message) => {
      outcome.messages.push(message.toString());
      if (opts.resolveOnMessage) {
        try { ws.close(1000, 'validation-message-received'); } catch {}
        finish();
      }
    });
    ws.on('close', (code, reason) => {
      outcome.close = { code, reason: reason.toString() };
      finish();
    });
    ws.on('error', (error) => {
      outcome.error = error.message;
    });
  });
}
async function pairDevice(label) {
  const session = await http('/rest/remote-access/pairing-sessions', {
    method: 'POST',
    body: { serverBaseUrl: 'https://docker-validation.example/mobile?pairing=old', serverName: 'Round4 Docker Validation' },
  });
  expect(session.status === 201, 'pairing session should be created by trusted owner route', session);
  const serialized = JSON.stringify(session.body);
  expect(!oldTermPattern.test(serialized), 'pairing session payload must not contain removed claim/lmn/owner credential terms', session.body);
  expect(session.body.mobileUrl.startsWith('https://docker-validation.example/mobile?pairing='), 'pairing mobile URL should keep HTTPS mobile shell path', session.body);
  const exchange = await http('/rest/remote-access/pairing-exchanges', {
    method: 'POST',
    body: { pairingCode: session.body.payload.pairingCode, deviceName: label, serverBaseUrl: 'https://docker-validation.example/mobile' },
  });
  expect(exchange.status === 201, 'pairing exchange should return mobile credential', exchange);
  const credential = exchange.body.credential;
  expect(typeof credential === 'string' && credential.startsWith('mra_'), 'pairing exchange credential should use mra_ prefix', exchange.body);
  rememberSecret(credential, `${label} credential`);
  return { session, exchange, credential, deviceId: exchange.body.device.deviceId };
}
function dockerLogs() {
  try {
    return execFileSync('docker', ['logs', '--tail', '600', containerName], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    return `${error.stdout || ''}\n${error.stderr || ''}`;
  }
}
function restartContainer() {
  execFileSync('docker', ['restart', containerName], { encoding: 'utf8' });
}

(async () => {
  await step('R4-RT-001', 'fresh Docker monorepo image serves health and packaged /mobile shell', async () => {
    const health = await waitForHealth();
    const mobile = await http('/mobile');
    expect(mobile.status === 200, '/mobile should return HTTP 200', mobile);
    const body = typeof mobile.body === 'string' ? mobile.body : JSON.stringify(mobile.body);
    expect(body.includes('/mobile/_nuxt/') || body.includes('_nuxt/'), '/mobile shell should reference built Nuxt assets', { sample: body.slice(0, 500) });
    return { healthStatus: health.status, mobileStatus: mobile.status, contentType: mobile.headers['content-type'], mobileAssetReferenceFound: true };
  });

  await step('R4-RT-002', 'launcher state and container environment have no claim/lmn/owner-token material', async () => {
    const env = execFileSync('docker', ['inspect', containerName, '--format', '{{range .Config.Env}}{{println .}}{{end}}'], { encoding: 'utf8' });
    expect(!oldTermPattern.test(stateText), 'launcher state contains removed owner/local-management material', { stateText: redactText(stateText) });
    expect(!oldTermPattern.test(env), 'container env contains removed owner/local-management material', { env: redactText(env) });
    return { stateKeys: Object.keys(state).sort(), envLineCount: env.trim().split(/\n/).filter(Boolean).length, oldMaterialFound: false };
  });

  await step('R4-RT-003', 'trusted-network owner REST routes work without claim/lmn credentials', async () => {
    const status = await http('/rest/remote-access/status');
    const settings = await http('/rest/remote-access/settings');
    const enable = await http('/rest/remote-access/settings', { method: 'PUT', body: { phoneAccessEnabled: true } });
    const devices = await http('/rest/remote-access/devices');
    const address = await http('/rest/remote-access/address-candidates?manualServerBaseUrl=https%3A%2F%2Fdocker-validation.example%2Fmobile');
    for (const [name, response] of Object.entries({ status, settings, enable, devices, address })) {
      expect(response.status === 200, `${name} trusted owner route should be HTTP 200`, response);
    }
    expect(status.body.serverInstanceId && /^srv_/.test(status.body.serverInstanceId), 'status should expose stable server instance id', status.body);
    return { status: status.body, settings: enable.body.settings, devicesCount: devices.body.devices.length, addressCandidates: address.body.candidates.length };
  });

  let active;
  await step('R4-RT-004', 'mobile mra credential is issued and accepted on mobile-bearing protected REST/GraphQL/WebSocket surfaces', async () => {
    await http('/rest/remote-access/devices', { method: 'DELETE' });
    active = await pairDevice('Round4 Active Phone');
    const protectedRest = await http('/rest/files/no-such-category/no-such-file.txt', { token: active.credential });
    expect(protectedRest.status === 404, 'mobile credential should pass auth and reach protected REST handler (404 resource is expected)', protectedRest);
    const gql = await graphql('query Round4AgentDefinitions { agentDefinitions { id name } }', active.credential);
    expect(gql.status === 200 && !gql.body.errors, 'mobile credential should authorize GraphQL POST', gql);
    const term = await wsProbe(`${wsBaseUrl}/ws/terminal/__missing_workspace__/round4?access_token=${encodeURIComponent(active.credential)}`);
    expect(term.opened && term.close && term.close.code === 4004, 'mobile credential should pass terminal WS auth and then close for missing workspace', term);
    const notif = await wsProbe(`${wsBaseUrl}/ws/applications/__validation_app__/backend/notifications?access_token=${encodeURIComponent(active.credential)}`, { resolveOnMessage: true, timeoutMs: 2500 });
    expect(notif.opened && notif.messages.some((m) => m.includes('"type":"connected"')), 'mobile credential should pass app notification WS auth and receive connected message', notif);
    const gqlWs = await wsProbe(`${wsBaseUrl}/graphql?access_token=${encodeURIComponent(active.credential)}`, { protocols: ['graphql-ws'], resolveOnOpen: true, openHoldMs: 150, timeoutMs: 2500 });
    expect(gqlWs.opened && !String(gqlWs.error || '').includes('401') && !String(gqlWs.error || '').includes('403'), 'mobile credential should allow GraphQL-WS upgrade/auth', gqlWs);
    return { deviceId: active.deviceId, protectedRestStatus: protectedRest.status, graphqlAgentDefinitionCount: gql.body.data.agentDefinitions.length, terminalClose: term.close, appNotificationMessage: JSON.parse(notif.messages[0]), graphQlWsOpened: gqlWs.opened };
  });

  await step('R4-RT-005', 'mobile mra credential is rejected on owner-management REST routes', async () => {
    const settings = await http('/rest/remote-access/settings', { token: active.credential });
    const devices = await http('/rest/remote-access/devices', { token: active.credential });
    const session = await http('/rest/remote-access/pairing-sessions', { method: 'POST', token: active.credential, body: { serverBaseUrl: 'https://docker-validation.example', serverName: 'Forbidden' } });
    const revoke = await http(`/rest/remote-access/devices/${encodeURIComponent(active.deviceId)}`, { method: 'DELETE', token: active.credential });
    for (const [name, response] of Object.entries({ settings, devices, session, revoke })) {
      expect(response.status === 403 && response.body.code === 'REMOTE_ACCESS_AUTH_INVALID', `${name} should reject mra on owner route`, response);
    }
    return { checkedRoutes: ['GET settings', 'GET devices', 'POST pairing-sessions', 'DELETE devices/:id'], statusCodes: { settings: settings.status, devices: devices.status, session: session.status, revoke: revoke.status } };
  });

  await step('R4-RT-006', 'trusted-network no-credential REST/GraphQL/WebSocket and GraphQL-WS work without claim/lmn', async () => {
    const protectedRest = await http('/rest/files/no-such-category/no-such-file.txt');
    expect(protectedRest.status === 404, 'no-credential protected REST should reach route handler, not auth failure', protectedRest);
    const appBackend = await http('/rest/applications/__validation_app__/backend/status');
    expect(![401, 403].includes(appBackend.status), 'no-credential app backend protected REST should not fail auth', appBackend);
    const gql = await graphql('query Round4RuntimeAvailability { runtimeAvailabilities { runtimeKind enabled reason } }');
    expect(gql.status === 200 && !gql.body.errors, 'no-credential GraphQL POST should succeed in trusted-network model', gql);
    const graphQlGet = await http('/graphql');
    expect(graphQlGet.status === 404 || graphQlGet.status === 405, 'non-WS GraphQL GET should remain unavailable to remote clients', graphQlGet);
    const term = await wsProbe(`${wsBaseUrl}/ws/terminal/__missing_workspace__/round4`);
    expect(term.opened && term.close && term.close.code === 4004, 'no-credential /ws terminal should pass trusted-network auth and close for missing workspace', term);
    const notif = await wsProbe(`${wsBaseUrl}/ws/applications/__validation_app_no_token__/backend/notifications`, { resolveOnMessage: true, timeoutMs: 2500 });
    expect(notif.opened && notif.messages.some((m) => m.includes('"type":"connected"')), 'no-credential app notification WS should pass trusted-network auth', notif);
    const gqlWs = await wsProbe(`${wsBaseUrl}/graphql`, { protocols: ['graphql-ws'], resolveOnOpen: true, openHoldMs: 150, timeoutMs: 2500 });
    expect(gqlWs.opened && !String(gqlWs.error || '').includes('401') && !String(gqlWs.error || '').includes('403'), 'no-credential GraphQL-WS should allow trusted-network upgrade', gqlWs);
    return { protectedRestStatus: protectedRest.status, appBackendStatus: appBackend.status, graphqlStatus: gql.status, graphQlGetStatus: graphQlGet.status, terminalClose: term.close, appNotificationMessage: JSON.parse(notif.messages[0]), graphQlWsOpened: gqlWs.opened };
  });

  let serverInstanceBeforeRestart;
  await step('R4-RT-007', 'container restart preserves trusted-network and mobile credential behavior', async () => {
    const before = await http('/rest/remote-access/status');
    expect(before.status === 200, 'status before restart should succeed', before);
    serverInstanceBeforeRestart = before.body.serverInstanceId;
    restartContainer();
    await waitForHealth();
    const after = await http('/rest/remote-access/status');
    expect(after.status === 200, 'status after restart should succeed', after);
    expect(after.body.serverInstanceId === serverInstanceBeforeRestart, 'serverInstanceId should persist across restart', { before: serverInstanceBeforeRestart, after: after.body.serverInstanceId });
    const noCredGql = await graphql('query Round4AfterRestart { runtimeAvailabilities { runtimeKind enabled reason } }');
    expect(noCredGql.status === 200 && !noCredGql.body.errors, 'no-credential GraphQL should still work after restart', noCredGql);
    const mobileGql = await graphql('query Round4MobileAfterRestart { agentDefinitions { id } }', active.credential);
    expect(mobileGql.status === 200 && !mobileGql.body.errors, 'mobile credential should still work after restart', mobileGql);
    const mobile = await http('/mobile');
    expect(mobile.status === 200, '/mobile should still be served after restart', mobile);
    return { serverInstanceIdStable: true, noCredentialGraphqlStatus: noCredGql.status, mobileGraphqlStatus: mobileGql.status, mobileStatus: mobile.status };
  });

  await step('R4-RT-008', 'disabled Phone Access rejects existing mra credentials on HTTP and WS surfaces', async () => {
    const disabled = await http('/rest/remote-access/settings', { method: 'PUT', body: { phoneAccessEnabled: false } });
    expect(disabled.status === 200 && disabled.body.settings.phoneAccessEnabled === false, 'trusted owner should disable phone access', disabled);
    const gql = await graphql('query Round4Disabled { agentDefinitions { id } }', active.credential);
    expect(gql.status === 403 && gql.body.code === 'PHONE_ACCESS_DISABLED', 'disabled phone access should reject mra GraphQL', gql);
    const protectedRest = await http('/rest/files/no-such-category/no-such-file.txt', { token: active.credential });
    expect(protectedRest.status === 403 && protectedRest.body.code === 'PHONE_ACCESS_DISABLED', 'disabled phone access should reject mra protected REST', protectedRest);
    const ws = await wsProbe(`${wsBaseUrl}/ws/applications/__validation_disabled__/backend/notifications?access_token=${encodeURIComponent(active.credential)}`, { timeoutMs: 2500 });
    expect(ws.opened && ws.close && ws.close.code === 4403 && ws.close.reason === 'PHONE_ACCESS_DISABLED', 'disabled phone access should close mra /ws with PHONE_ACCESS_DISABLED', ws);
    const noCredGql = await graphql('query Round4TrustedAfterDisabled { runtimeAvailabilities { runtimeKind enabled reason } }');
    expect(noCredGql.status === 200 && !noCredGql.body.errors, 'trusted-network no-credential GraphQL should remain allowed while phone access is disabled', noCredGql);
    return { disabled: disabled.body.settings.phoneAccessEnabled, graphqlStatus: gql.status, protectedRestStatus: protectedRest.status, wsClose: ws.close, noCredentialGraphqlStatus: noCredGql.status };
  });

  let revoked;
  await step('R4-RT-009', 'revoked mra credentials fail while trusted-network owner access remains available', async () => {
    const reenabled = await http('/rest/remote-access/settings', { method: 'PUT', body: { phoneAccessEnabled: true } });
    expect(reenabled.status === 200 && reenabled.body.settings.phoneAccessEnabled === true, 'trusted owner should re-enable phone access', reenabled);
    revoked = await pairDevice('Round4 Revoked Phone');
    const revoke = await http(`/rest/remote-access/devices/${encodeURIComponent(revoked.deviceId)}`, { method: 'DELETE' });
    expect(revoke.status === 200, 'trusted owner should revoke paired device without credential', revoke);
    const gql = await graphql('query Round4Revoked { agentDefinitions { id } }', revoked.credential);
    expect(gql.status === 403 && gql.body.code === 'REMOTE_ACCESS_DEVICE_REVOKED', 'revoked mra GraphQL should fail', gql);
    const protectedRest = await http('/rest/files/no-such-category/no-such-file.txt', { token: revoked.credential });
    expect(protectedRest.status === 403 && protectedRest.body.code === 'REMOTE_ACCESS_DEVICE_REVOKED', 'revoked mra protected REST should fail', protectedRest);
    const ws = await wsProbe(`${wsBaseUrl}/ws/applications/__validation_revoked__/backend/notifications?access_token=${encodeURIComponent(revoked.credential)}`, { timeoutMs: 2500 });
    expect(ws.opened && ws.close && ws.close.code === 4403 && ws.close.reason === 'REMOTE_ACCESS_DEVICE_REVOKED', 'revoked mra /ws should close as revoked', ws);
    const devices = await http('/rest/remote-access/devices');
    expect(devices.status === 200, 'trusted owner device list should remain available without credential', devices);
    return { revokedDeviceId: revoked.deviceId, graphqlStatus: gql.status, protectedRestStatus: protectedRest.status, wsClose: ws.close, activeDeviceCount: devices.body.devices.length };
  });

  await step('R4-RT-010', 'invalid mra URL tokens are rejected and raw mra credentials are absent from Docker logs/evidence payload', async () => {
    const invalidCredential = `mra_${crypto.randomBytes(24).toString('hex')}`;
    rememberSecret(invalidCredential, 'invalid probe credential');
    const invalidGraphqlWs = await wsProbe(`${wsBaseUrl}/graphql?access_token=${encodeURIComponent(invalidCredential)}`, { protocols: ['graphql-ws'], timeoutMs: 2500 });
    expect(!invalidGraphqlWs.opened && String(invalidGraphqlWs.error || '').includes('401'), 'invalid mra on GraphQL-WS should fail the upgrade with HTTP 401', invalidGraphqlWs);
    const invalidWs = await wsProbe(`${wsBaseUrl}/ws/applications/__validation_invalid__/backend/notifications?access_token=${encodeURIComponent(invalidCredential)}`, { timeoutMs: 2500 });
    expect(invalidWs.opened && invalidWs.close && invalidWs.close.code === 4401 && invalidWs.close.reason === 'REMOTE_ACCESS_AUTH_INVALID', 'invalid mra on /ws should close as auth invalid', invalidWs);
    const logs = dockerLogs();
    const rawSecretsInLogs = [...sensitive].filter((secret) => logs.includes(secret));
    expect(rawSecretsInLogs.length === 0, 'raw mra secrets should not appear in Docker logs', { secretCount: rawSecretsInLogs.length });
    const outputPreview = JSON.stringify(results);
    const rawSecretsInAccumulatedResults = [...sensitive].filter((secret) => outputPreview.includes(secret));
    expect(rawSecretsInAccumulatedResults.length === 0, 'raw mra secrets should not appear in accumulated JSON results', { secretCount: rawSecretsInAccumulatedResults.length });
    return { invalidGraphqlWs: { opened: invalidGraphqlWs.opened, error: invalidGraphqlWs.error }, invalidWsClose: invalidWs.close, rawSecretsInLogs: 0, secretHashes };
  });

  const failed = results.filter((r) => r.status !== 'pass');
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      containerName,
      statePath,
      baseUrl,
      imageRef: state.IMAGE_REF,
      profile: state.PROFILE,
      note: 'Credential values are redacted; hashes identify unique runtime-only secrets without exposing them.',
    },
    summary: { passed: results.length - failed.length, failed: failed.length },
    results,
  };
  process.stdout.write(`${JSON.stringify(redact(output), null, 2)}\n`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  const output = { summary: { passed: results.filter((r) => r.status === 'pass').length, failed: results.filter((r) => r.status !== 'pass').length + 1 }, results, fatal: redactText(error && error.stack ? error.stack : String(error)) };
  process.stdout.write(`${JSON.stringify(redact(output), null, 2)}\n`);
  process.exit(1);
});
