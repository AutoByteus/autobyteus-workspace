// autobyteus-305 step 4: drives an isolated desktop instance (a worktree build) over its control port, like a
// user on Nodes → Manage Nodes. Adds the test Docker nodes by address, checks the server line of each row, waits
// without clicking (AC-010), then clicks "Update to <version>" and records every line the row shows until the
// result (AC-001). Screenshots of each state go to <out>. Usage:
//   node drive.mjs <controlPort> <out dir> <node address> <blocked node address> <app version>
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/autobyteus-web/node_modules/playwright-core/index.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [controlPort, out, nodeAddress, blockedAddress, appVersion] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const log = []
const note = (event, detail = {}) => { const entry = { time: new Date().toISOString(), event, ...detail }; log.push(entry); console.log(JSON.stringify(entry)) }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`)
const page = browser.contexts().flatMap((context) => context.pages()).find((candidate) => candidate.url().includes('/renderer/'))
if (!page) throw new Error('no renderer page')
await page.setViewportSize({ width: 1280, height: 860 }).catch(() => {})
await page.evaluate(() => { window.location.hash = '#/nodes?nodeTab=manage' })
await page.waitForSelector('[data-testid="add-node-panel"]', { timeout: 60_000 })
note('nodes page open', { url: page.url() })

const shot = async (name) => {
  const file = path.join(out, `${name}.png`)
  await page.screenshot({ path: file })
  note('screenshot', { file: path.basename(file) })
}

async function addNode(address, name) {
  await page.fill('[data-testid="add-node-address"]', address)
  await page.fill('[data-testid="add-node-name"]', name)
  const collaborate = page.locator('[data-testid="add-node-collaborate"]')
  if (await collaborate.isChecked().catch(() => false)) await collaborate.uncheck()
  await page.click('[data-testid="add-node-submit"]')
  note('node added', { address, name })
}

/** The server line of the row named `name` (its text with spaces between parts), or null. */
const serverLine = (name) => page.evaluate((rowName) => {
  const words = (node) => node.nodeType === 3 ? node.textContent : [...node.childNodes].map(words).join(' ')
  const row = [...document.querySelectorAll('[data-testid^="node-row-"]')].find((li) => li.querySelector('[data-testid^="node-name-"]')?.textContent?.trim() === rowName)
  const line = row?.querySelector('[data-testid^="node-server-"]')
  return line ? words(line).replace(/\s+/g, ' ').trim() : null
}, name)

const waitLine = async (name, predicate, timeoutMs) => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const text = await serverLine(name)
    if (text && predicate(text)) return text
    if (Date.now() > deadline) throw new Error(`timeout waiting for the line of ${name}; last: ${text}`)
    await sleep(250)
  }
}

await addNode(nodeAddress, 'update-test')
const offered = await waitLine('update-test', (text) => text.includes('Update to'), 90_000)
note('row line', { name: 'update-test', text: offered })
await shot('S4-01-update-offered')

if (blockedAddress !== '-') {
  await addNode(blockedAddress, 'no-volume')
  const blocked = await waitLine('no-volume', (text) => text.includes('Server'), 90_000)
  note('row line', { name: 'no-volume', text: blocked })
  await shot('S4-02-blocked-no-volume')
}

note('AC-010: waiting 30 s without clicking')
await sleep(30_000)
writeFileSync(path.join(out, 'ac010-marker.txt'), new Date().toISOString())

const row = page.locator('[data-testid^="node-row-"]', { has: page.locator('[data-testid^="node-name-"]', { hasText: 'update-test' }) })
await row.locator('[data-testid^="node-server-update-"]').click()
note('clicked', { button: `Update to ${appVersion}` })
const seen = new Set()
const deadline = Date.now() + 15 * 60_000
let final = null
while (Date.now() < deadline) {
  const text = await serverLine('update-test')
  if (text && !seen.has(text)) {
    seen.add(text)
    note('row line', { name: 'update-test', text })
    await shot(`S4-03-step-${seen.size}`)
  }
  if (text && /Updated to|did not happen/.test(text)) { final = text; break }
  await sleep(200)
}
note('result', { text: final })
await shot('S4-04-result')
writeFileSync(path.join(out, 'drive-log.json'), JSON.stringify(log, null, 2))
await browser.close()
if (!final?.includes(`Updated to ${appVersion}`)) process.exit(1)
