// Ticket-only live validation helper: exact own current-build receipt, trusted UI actions,
// read-only actual Apollo/cache/Pinia observations and public API reads; no doubles/hooks.
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const out = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(out, '../../../..')
const require = createRequire(path.join(root, 'autobyteus-web/package.json'))
const { chromium } = require('playwright-core')
// Apollo/GraphQL are dependencies of the installed Nuxt module, not web direct deps.
const apolloRequire = createRequire(await fs.realpath(path.join(root, 'autobyteus-web/node_modules/@nuxtjs/apollo/package.json')))
const { gql } = apolloRequire('@apollo/client/core')
const clone = value => JSON.parse(JSON.stringify(value))
const statePath = path.join(out, 'observed-state.json')
const readState = async () => { try { return JSON.parse(await fs.readFile(statePath, 'utf8')) } catch (e) { if (e.code === 'ENOENT') return { queries: {} }; throw e } }
export async function run(label, body) {
  const target = path.join(out, label + '.json')
  try { await fs.access(target); throw new Error('Use fresh step label; evidence exists: ' + label) } catch (e) { if (e.code !== 'ENOENT') throw e }
  const receipt = JSON.parse(await fs.readFile(path.join(out, 'isolated-start.json'), 'utf8'))
  assert(receipt.ok, 'Own start failed')
  const instance = receipt.result
  assert(instance.executablePath.startsWith(root + '/autobyteus-web/electron-dist/'), 'Wrong worktree app')
  assert(instance.ownsDataRoot && !instance.keepDataRoot, 'Own disposable root required')
  const state = await readState()
  state.queries ||= {}
  const record = { startedAt: new Date().toISOString(), label, instanceId: instance.instanceId, purpose: 'Integrated delivery smoke and human-check setup; NOT human acceptance', events: [], operations: [] }
  const browser = await chromium.connectOverCDP(instance.controlEndpoint)
  const page = browser.contexts().flatMap(context => context.pages()).find(p => p.url().includes('/renderer/index.html'))
  assert(page, 'Own packaged renderer missing')
  page.setDefaultTimeout(45000)
  const pending = new Set(), requests = new Map()
  page.on('pageerror', error => record.events.push({ type: 'pageerror', message: error.message, at: new Date().toISOString() }))
  page.on('console', message => { if (['warning', 'error'].includes(message.type())) record.events.push({ type: message.type(), message: message.text(), at: new Date().toISOString() }) })
  page.on('requestfailed', request => record.events.push({ type: 'requestfailed', url: request.url(), reason: request.failure(), at: new Date().toISOString() }))
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname !== '/graphql' || request.method() !== 'POST') return
    assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && Number(url.port) === instance.serverPort, 'Renderer GraphQL must target ONLY own isolated backend')
    const input = request.postDataJSON()
    const operation = { at: new Date().toISOString(), request: input }
    requests.set(request, operation); record.operations.push(operation)
    if (input.operationName === 'GetAgentDefinitions' || input.operationName === 'GetAgentOrgDefinitions') state.queries[input.operationName] = input.query
  })
  page.on('response', response => {
    const operation = requests.get(response.request())
    if (!operation) return
    const task = (async () => { operation.httpStatus = response.status(); try { operation.response = await response.json() } catch (error) { operation.responseReadError = error.message } })()
    pending.add(task); task.finally(() => pending.delete(task))
  })
  const flush = async () => { await page.waitForTimeout(150); await Promise.all([...pending]) }
  const observed = async () => ({ url: page.url(), headings: await page.locator('h1,h2').allTextContents(), buttons: await page.getByRole('button').allTextContents(), links: await page.getByRole('link').allTextContents(), body: await page.locator('body').innerText() })
  const publicRead = async (query, variables = {}) => {
    const response = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
    const json = await response.json(); assert(response.ok && !json.errors, JSON.stringify(json.errors)); return json.data
  }
  const cache = async kind => {
    const name = kind === 'Agent' ? 'GetAgentDefinitions' : 'GetAgentOrgDefinitions'
    const source = state.queries[name]; assert(source, 'Need real observed list query: ' + name)
    const document = JSON.parse(JSON.stringify(gql(source), (key, value) => key === 'loc' ? undefined : value))
    const rootField = kind === 'Agent' ? 'agentDefinitions' : 'agentOrgDefinitions'
    const before = record.operations.filter(op => op.request.operationName === name).length
    const result = await page.evaluate(async ({ document, rootField, kind }) => {
      const app = document ? globalThis.document.querySelector('#__nuxt')?.__vue_app__ : null
      const nuxt = app?.$nuxt
      const client = nuxt?.__boundApolloClient
      if (!client) throw new Error('Actual registered Apollo client unavailable')
      const cached = client.cache.readQuery({ query: document })
      if (!cached) throw new Error('Loaded full query cache incomplete')
      const reread = await client.query({ query: document, fetchPolicy: 'cache-first' })
      const store = nuxt.$pinia?.state.value[kind === 'Agent' ? 'agentDefinition' : 'agentOrgDefinition']
      return { cached, cacheFirst: reread.data, store, normalized: Object.fromEntries(Object.entries(client.cache.extract()).filter(([key]) => key.startsWith(kind === 'Agent' ? 'AgentDefinition:' : 'AgentOrgDefinition:'))) }
    }, { document, rootField, kind })
    await flush()
    assert.equal(record.operations.filter(op => op.request.operationName === name).length, before, 'Cache-first reread unexpectedly crossed HTTP')
    assert.deepEqual(result.cacheFirst, result.cached)
    return result
  }
  const waitOperation = async field => {
    const deadline = Date.now() + 45000
    while (Date.now() < deadline) {
      await flush()
      const matches = record.operations.filter(op => op.response?.data && Object.hasOwn(op.response.data, field))
      if (matches.length) return matches.at(-1)
      await page.waitForTimeout(100)
    }
    throw new Error('No complete real response: ' + field)
  }
  try {
    record.pages = await observed()
    record.details = await body({ page, browser, assert, state, record, instance, out, observed, publicRead, cache, waitOperation, flush, clone })
    await flush()
    const errors = record.events.filter(event => ['pageerror', 'error', 'requestfailed'].includes(event.type))
    assert.deepEqual(errors, [], 'Live browser errors; classify rather than hide')
    assert(record.operations.every(op => !op.response?.errors && (!op.httpStatus || op.httpStatus === 200)), 'GraphQL/HTTP errors')
    record.result = 'Pass'
  } catch (error) {
    record.result = 'Fail'; record.failure = { message: error.message, stack: error.stack }
    await page.screenshot({ path: path.join(out, label + '-failure.png') }).catch(() => {})
    await fs.writeFile(path.join(out, label + '-failure.html'), await page.content()).catch(() => {})
    throw error
  } finally {
    await flush().catch(() => {})
    record.finishedAt = new Date().toISOString(); record.finalUrl = page.url()
    await fs.writeFile(target, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' })
    await fs.writeFile(statePath, JSON.stringify(state, null, 2) + '\n')
    await fs.appendFile(path.join(out, 'delivery-execution-ledger.md'), `\n${record.finishedAt} Desktop step ${label} Completed ${record.result}; ${record.events.length} browser events; ${target}. Step checkpoint, not round result.\n`)
    await browser.close() // Inspected CDP adapter: disconnect only. Lifecycle stop is separate.
  }
  return record
}
