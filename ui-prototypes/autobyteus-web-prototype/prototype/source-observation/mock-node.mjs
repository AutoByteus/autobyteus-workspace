#!/usr/bin/env node
import http from 'node:http'
import { URL } from 'node:url'
import { WebSocketServer } from 'ws'
import { baseState, operationFixture, scenarioCatalog, syntheticApplicationHtml } from './fixtures.mjs'

const port = Number(process.env.PROTOTYPE_MOCK_PORT || 4310)
const host = process.env.PROTOTYPE_MOCK_HOST || '127.0.0.1'
const state = baseState()
const requestLog = []

function applyScenario(name) {
  if (!scenarioCatalog[name]) throw new Error(`Unknown scenario: ${name}`)
  state.scenario = name
  state.requestDelayMs = name === 'loading' ? 1500 : 0
}

applyScenario(process.env.PROTOTYPE_SCENARIO || 'populated')

const send = (res, status, body, contentType = 'application/json; charset=utf-8') => {
  res.writeHead(status, {
    'content-type': contentType,
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization, x-autobyteus-mobile-session',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'cache-control': 'no-store',
  })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

const readBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  const text = Buffer.concat(chunks).toString('utf8')
  try { return JSON.parse(text) } catch { return { raw: text } }
}

const operationNameFrom = (payload) => payload.operationName || String(payload.query || '').match(/\b(?:query|mutation)\s+([A-Za-z0-9_]+)/)?.[1] || 'AnonymousOperation'
const rootFieldFrom = (payload, operationName) => {
  const query = String(payload.query || '')
  const start = query.search(new RegExp(`\\b(?:query|mutation)\\s+${operationName}\\b`))
  if (start < 0) return operationName[0].toLowerCase() + operationName.slice(1)
  const brace = query.indexOf('{', start)
  const body = brace >= 0 ? query.slice(brace + 1) : ''
  const match = body.match(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|\{|$)/)
  return match?.[1] || (operationName[0].toLowerCase() + operationName.slice(1))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`)
  if (req.method === 'OPTIONS') return send(res, 204, '')

  if (url.pathname === '/__prototype/health') {
    return send(res, 200, { ok: true, adapter: 'autobyteus-prototype-mock-node', state, scenarios: scenarioCatalog, requestCount: requestLog.length })
  }
  if (url.pathname === '/__prototype/requests') return send(res, 200, { requests: requestLog.slice(-500) })
  if (url.pathname === '/__prototype/scenario') {
    if (req.method === 'GET') return send(res, 200, { state, scenarios: scenarioCatalog })
    try {
      const input = await readBody(req)
      if (input.scenario) applyScenario(input.scenario)
      if (Number.isFinite(input.requestDelayMs)) state.requestDelayMs = Math.max(0, Number(input.requestDelayMs))
      if (typeof input.applicationsEnabled === 'boolean') state.applicationsEnabled = input.applicationsEnabled
      if (typeof input.managedGatewayEnabled === 'boolean') state.managedGatewayEnabled = input.managedGatewayEnabled
      if (input.operationFailures && typeof input.operationFailures === 'object') state.operationFailures = { ...input.operationFailures }
      return send(res, 200, { ok: true, state })
    } catch (error) {
      return send(res, 400, { ok: false, message: error.message })
    }
  }

  if (state.scenario === 'loading' || state.requestDelayMs) {
    await new Promise(resolve => setTimeout(resolve, state.requestDelayMs || 1500))
  }

  if (url.pathname === '/rest/health' || url.pathname === '/health') {
    return state.scenario === 'bootstrap_error'
      ? send(res, 503, { status: 'error', message: 'Synthetic node bootstrap failure.' })
      : send(res, 200, { status: 'ok', version: 'prototype-1.0.0', fixture: true })
  }

  if (url.pathname === '/graphql') {
    const payload = req.method === 'GET'
      ? { query: url.searchParams.get('query'), operationName: url.searchParams.get('operationName'), variables: JSON.parse(url.searchParams.get('variables') || '{}') }
      : await readBody(req)
    const operationName = operationNameFrom(payload)
    requestLog.push({ at: new Date().toISOString(), method: req.method, path: url.pathname, operationName, scenario: state.scenario })
    if (state.scenario === 'permission_denied') return send(res, 403, { errors: [{ message: 'Synthetic permission denied.', extensions: { code: 'FORBIDDEN' } }] })
    if (state.scenario === 'error' || state.operationFailures[operationName]) {
      return send(res, 200, { data: null, errors: [{ message: state.operationFailures[operationName] || 'Synthetic recoverable GraphQL failure.', extensions: { code: 'PROTOTYPE_FIXTURE_ERROR', operationName } }] })
    }
    const fixture = operationFixture(operationName, payload.variables || {}, state)
    const data = fixture || { [rootFieldFrom(payload, operationName)]: null }
    return send(res, 200, { data, extensions: { prototypeFixture: true, operationName, scenario: state.scenario } })
  }

  if (state.scenario === 'permission_denied' && url.pathname.startsWith('/rest/')) {
    return send(res, 403, { detail: 'Synthetic permission denied.', code: 'PROTOTYPE_FORBIDDEN' })
  }

  if (url.pathname.startsWith('/rest/')) requestLog.push({ at: new Date().toISOString(), method: req.method, path: url.pathname, scenario: state.scenario })

  if (url.pathname === '/rest/remote-access/status') {
    return send(res, 200, { phoneAccessEnabled: true, pairingAvailable: true, compatibilityVersion: 1, serverInstanceId: 'prototype-node', serverName: 'Prototype Node' })
  }
  if (url.pathname === '/rest/remote-access/pairing-exchanges' && req.method === 'POST') {
    const input = await readBody(req)
    if (input.pairingToken === 'denied') return send(res, 401, { detail: 'Synthetic pairing token rejected.' })
    return send(res, 200, {
      credential: 'prototype_mobile_session',
      serverBaseUrl: `http://${host}:${port}`,
      device: { deviceId: 'prototype-phone', displayName: input.deviceName || 'Phone', clientFacingBaseUrl: `http://${host}:${port}`, createdAt: '2026-08-22T04:00:00.000Z', lastSeenAt: '2026-08-22T04:00:00.000Z', revokedAt: null },
    })
  }
  if (url.pathname === '/rest/media') {
    const category = url.searchParams.get('category') || 'images'
    const data = state.scenario === 'empty' ? [] : [{ filename: `prototype-${category}.svg`, category, url: `http://${host}:${port}/rest/media/${category}/prototype-${category}.svg`, size: 2400, createdAt: '2026-08-22T04:00:00.000Z' }]
    return send(res, 200, { files: data, pagination: { currentPage: 1, totalPages: data.length ? 1 : 0, totalFiles: data.length, limit: 20 } })
  }
  if (/^\/rest\/media\//.test(url.pathname)) {
    if (req.method === 'DELETE') return send(res, 200, { success: true })
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><rect width="640" height="640" fill="#dbeafe"/><circle cx="320" cy="250" r="110" fill="#2563eb"/><text x="320" y="430" text-anchor="middle" font-family="system-ui" font-size="42" fill="#0f172a">Prototype media</text></svg>`
    return send(res, 200, svg, 'image/svg+xml')
  }
  if (url.pathname.includes('/execution-resource-configurations')) return send(res, 200, { configurations: [] })
  if (url.pathname.includes('/available-execution-resources')) return send(res, 200, { agentDefinitions: [operationFixture('GetAgentDefinitions', {}, state).agentDefinitions[0]], agentTeamDefinitions: [operationFixture('GetAgentTeamDefinitions', {}, state).agentTeamDefinitions[0]] })
  if (url.pathname.includes('/application-bundles/') && url.pathname.endsWith('/ui/index.html')) return send(res, 200, syntheticApplicationHtml(), 'text/html; charset=utf-8')
  if (url.pathname.includes('/application-bundles/') && url.pathname.endsWith('prototype-app.svg')) {
    return send(res, 200, '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#2563eb"/><path d="M18 20h28v24H18z" fill="white"/><path d="M23 27h18M23 33h14M23 39h10" stroke="#2563eb" stroke-width="3"/></svg>', 'image/svg+xml')
  }
  if (url.pathname.includes('/application-bundles/') || url.pathname.includes('/applications/')) return send(res, 200, { ok: true, fixture: true })
  if (url.pathname.includes('/content') || url.pathname.includes('/file-change-content')) return send(res, 200, '# Synthetic file\n\nFixture content only.', 'text/plain; charset=utf-8')
  if (url.pathname.startsWith('/rest/drafts/') || url.pathname.startsWith('/rest/context-files/')) return send(res, 200, { storedFilename: 'ctx_prototype__fixture.txt', originalFilename: 'fixture.txt', locator: '/rest/context-files/ctx_prototype__fixture.txt', mediaType: 'text/plain', size: 42 })
  if (url.pathname.startsWith('/rest/')) return send(res, 200, { ok: true, fixture: true, path: url.pathname })

  return send(res, 404, { message: 'Prototype mock route not found.', path: url.pathname })
})

const wss = new WebSocketServer({ noServer: true })
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req))
})
wss.on('connection', (ws, req) => {
  const pathname = new URL(req.url || '/', `http://${req.headers.host || `${host}:${port}`}`).pathname
  if (pathname.startsWith('/ws/file-explorer/')) {
    ws.send(JSON.stringify({ type: 'CONNECTED', payload: { session_id: `fixture-${pathname.split('/').pop() || 'workspace'}` } }))
  }
  ws.on('message', raw => {
    let message = null
    try { message = JSON.parse(raw.toString()) } catch {}
    if (message?.type === 'connection_init') return ws.send(JSON.stringify({ type: 'connection_ack', payload: { fixture: true } }))
    if (message?.type === 'ping') return ws.send(JSON.stringify({ type: 'pong' }))
    if (pathname.includes('/terminal')) return ws.send(JSON.stringify({ type: 'output', data: String(message?.data || message?.input || '') }))
    if (message?.type === 'subscribe' && message.id) return ws.send(JSON.stringify({ id: message.id, type: 'next', payload: { data: {} } }))
  })
  ws.on('error', () => {})
})

server.listen(port, host, () => {
  process.stdout.write(`[prototype-mock-node] listening on http://${host}:${port} scenario=${state.scenario}\n`)
})

const close = () => server.close(() => process.exit(0))
process.on('SIGINT', close)
process.on('SIGTERM', close)
