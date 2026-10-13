// Ticket-only complementary real-desktop observation/actions; not a fixture-renderer probe.
// Exact assigned isolated receipt only; real trusted UI actions, no API/WS doubles or internal-store writes.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const output = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(output, '../../../..')
const { chromium } = createRequire(path.join(root, 'autobyteus-web/package.json'))('playwright-core')
export const instance = JSON.parse(await fs.readFile(path.join(output, '../delivery-01/isolated-start.json'), 'utf8')).result
assert.equal(instance.instanceId, 'iso-52535-8486', 'Only explicit assigned instance')
assert.equal(instance.controlEndpoint, 'http://127.0.0.1:52535')
assert(instance.executablePath.startsWith(root + '/autobyteus-web/electron-dist/'), 'Source-worktree executable required')
assert(instance.ownsDataRoot && instance.dataRoot.includes('autobyteus-isolated-root-'), 'Disposable assigned root required')
export async function gql(query, variables = {}) {
  const response = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  assert(response.ok, `GraphQL HTTP ${response.status}`)
  const value = await response.json(); assert(!value.errors, JSON.stringify(value.errors)); return value.data
}
export async function run(label, action) {
  const filename = path.join(output, label + '.json')
  await fs.access(filename).then(() => { throw new Error('Do not overwrite existing step evidence') }, error => { if (error.code !== 'ENOENT') throw error })
  const evidence = { startedAt: new Date().toISOString(), instanceId: instance.instanceId, events: [], operations: [] }
  let browser, page
  try {
    browser = await chromium.connectOverCDP(instance.controlEndpoint)
    const pages = browser.contexts().flatMap(context => context.pages())
    evidence.pages = pages.map(page => ({ url: page.url() }))
    page = pages.find(page => page.url().includes('/renderer/index.html'))
    assert(page, 'Assigned Electron renderer required')
    page.setDefaultTimeout(30000)
    page.on('console', event => { if (['warning', 'error'].includes(event.type())) evidence.events.push({ type: event.type(), text: event.text() }) })
    page.on('pageerror', event => evidence.events.push({ type: 'pageerror', text: event.message }))
    page.on('requestfailed', request => evidence.events.push({ type: 'requestfailed', url: request.url(), failure: request.failure() }))
    page.on('request', request => { if (request.url() === instance.graphqlUrl) { const body = request.postDataJSON(); evidence.operations.push({ name: body?.operationName, query: body?.query?.split('\n')[1]?.trim() }) } })
    evidence.details = await action({ browser, page, assert, output, instance, gql })
    evidence.result = 'Pass'
  } catch (error) {
    evidence.result = 'Fail'; evidence.failure = { message: error.message, stack: error.stack }; process.exitCode = 1
    if (page) {
      await page.screenshot({ path: path.join(output, label + '-failure.png') }).catch(() => {})
      await fs.writeFile(path.join(output, label + '-failure.html'), await page.content()).catch(() => {})
    }
  } finally {
    if (page) evidence.finalUrl = page.url()
    await browser?.close() // disconnect CDP transport; assigned Electron instance remains alive
    evidence.finishedAt = new Date().toISOString()
    await fs.writeFile(filename, JSON.stringify(evidence, null, 2) + '\n')
    await fs.appendFile(path.join(output, '../api-e2e-test-case-ledger.md'), `\n${evidence.finishedAt} Desktop step ${label} Completed ${evidence.result}; browser events ${evidence.events.length}; ${filename}. This is a case checkpoint, not automatic clean round sign-off.\n`)
    console.log(JSON.stringify(evidence))
  }
  return evidence
}
