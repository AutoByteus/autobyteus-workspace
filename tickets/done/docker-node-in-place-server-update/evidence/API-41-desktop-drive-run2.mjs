// API-41 (autobyteus-305 step 4): drives an isolated desktop instance (this worktree's build) over its control port,
// like a user on Nodes → Manage Nodes, against test-owned Docker nodes on the host daemon (names ab305-api4-*,
// label autobyteus.ab305-api=round4, fresh volumes, 127.0.0.1 ports; never the user's autobyteus-server-0/1/2).
// Based on IMP4-proof-drive.mjs. Scenarios: I idle (AC-010 over the session), P pre-starter, L NEEDS_NEW_IMAGE,
// F failed after the switch, G slow download, H update from the host command, R long outage mid-update, zh-CN render.
// Usage: node drive.mjs <controlPort> <out dir> <test image> <step1 image> <source port> <worktree>
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/autobyteus-web/node_modules/playwright-core/index.mjs'
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import path from 'node:path'

const [controlPort, out, testImage, step1Image, sourcePort, worktree] = process.argv.slice(2)
const APP = '1.5.11-beta.6'
mkdirSync(out, { recursive: true })
const logFile = path.join(out, 'drive-log.jsonl')
let fails = 0
const note = (event, detail = {}) => { const e = { time: new Date().toISOString(), event, ...detail }; appendFileSync(logFile, JSON.stringify(e) + '\n'); console.log(JSON.stringify(e)) }
const check = (desc, ok, detail = {}) => { if (!ok) fails += 1; note(ok ? 'CHECK PASS' : 'CHECK FAIL', { desc, ...detail }) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const env = { ...process.env }; delete env.DOCKER_HOST; delete env.DOCKER_CONTEXT
const docker = (...a) => execFileSync('docker', a, { env, encoding: 'utf8' }).trim()
const dockerQuiet = (...a) => { try { return docker(...a) } catch (e) { return `ERR ${String(e.stderr ?? e.message).trim()}` } }
const LABEL = 'autobyteus.ab305-api=round4'
const nodes = {}

function startNode(id, { variant = 'good', image = testImage, hostPort = '' } = {}) {
  const name = `ab305-api4-${id}`
  for (const v of ['data', 'packages']) docker('volume', 'create', '--label', LABEL, `${name}-${v}`)
  docker('run', '-d', '--name', name, '--label', LABEL, '-p', `127.0.0.1:${hostPort}:8000`, '--cap-add', 'SYS_ADMIN', '--security-opt', 'seccomp=unconfined',
    '-v', `${name}-data:/home/autobyteus/data`, '-v', `${name}-packages:/home/autobyteus/server-packages`,
    '-e', `AUTOBYTEUS_SERVER_PACKAGE_SOURCE=http://host.docker.internal:${sourcePort}/${variant}/releases`, image)
  const port = docker('port', name, '8000/tcp').split('\n')[0].split(':').pop()
  nodes[id] = { name, port, address: `http://127.0.0.1:${port}` }
  note('node started', { id, name, variant, image, address: nodes[id].address })
  return nodes[id]
}
async function waitHealth(id, ms = 240_000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try { const r = await fetch(`${nodes[id].address}/rest/health`, { signal: AbortSignal.timeout(3000) }); if (r.ok) return true } catch {}
    await sleep(1000)
  }
  return false
}
const starterStatus = (id) => { try { return JSON.parse(docker('exec', nodes[id].name, 'node', '/opt/autobyteus/starter/cli.mjs', 'status')) } catch { return null } }
const starterLog = (id, pattern) => dockerQuiet('exec', nodes[id].name, 'sh', '-c', `grep -E '${pattern}' /var/log/supervisor/autobyteus_server.log || true`)
const dbHas = (id, table) => Number(dockerQuiet('exec', nodes[id].name, 'sh', '-c', `cat /home/autobyteus/data/db/production.db* 2>/dev/null | grep -a -c 'CREATE TABLE "${table}"' || true`)) || 0

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${controlPort}`)
const page = browser.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('/renderer/'))
if (!page) throw new Error('no renderer page')
await page.setViewportSize({ width: 1280, height: 900 }).catch(() => {})
const requests = []
page.on('request', (r) => { if (r.url().includes('/rest/node-update')) requests.push({ time: new Date().toISOString(), method: r.method(), url: r.url() }) })
const openManage = async () => {
  await page.evaluate(() => { window.location.hash = '#/nodes?nodeTab=manage' })
  await page.waitForSelector('[data-testid="add-node-panel"]', { timeout: 60_000 })
}
await openManage()
note('nodes page open (second run in the same window)', { url: page.url() })
const shot = async (name) => { await page.screenshot({ path: path.join(out, `${name}.png`) }); note('screenshot', { file: `${name}.png` }) }
async function addNode(id, label) {
  await page.fill('[data-testid="add-node-address"]', nodes[id].address)
  await page.fill('[data-testid="add-node-name"]', label)
  const collaborate = page.locator('[data-testid="add-node-collaborate"]')
  if (await collaborate.isChecked().catch(() => false)) await collaborate.uncheck()
  await page.click('[data-testid="add-node-submit"]')
  nodes[id].label = label
  note('node added', { id, label, address: nodes[id].address })
}
const rowOf = (label) => page.locator('[data-testid^="node-row-"]', { has: page.locator('[data-testid^="node-name-"]', { hasText: new RegExp(`^\\s*${label}\\s*$`) }) })
const serverLine = (label) => page.evaluate((rowName) => {
  const words = (n) => n.nodeType === 3 ? n.textContent : [...n.childNodes].map(words).join(' ')
  const row = [...document.querySelectorAll('[data-testid^="node-row-"]')].find((li) => li.querySelector('[data-testid^="node-name-"]')?.textContent?.trim() === rowName)
  const line = row?.querySelector('[data-testid^="node-server-"]')
  return line ? words(line).replace(/\s+/g, ' ').trim() : null
}, label)
async function waitLine(label, predicate, ms) {
  const deadline = Date.now() + ms; let text = null
  for (;;) { text = await serverLine(label); if (text && predicate(text)) return text; if (Date.now() > deadline) return null; await sleep(250) }
}
const hasButton = async (label) => (await rowOf(label).locator('[data-testid^="node-server-update-"]').count()) > 0
/** Follows a row after a click: records every distinct line, with a screenshot, until `done` matches. */
async function follow(label, done, ms, prefix, onLine = async () => {}) {
  const seen = []; const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const text = await serverLine(label)
    if (text && seen.at(-1) !== text) { seen.push(text); note('row line', { label, text }); await shot(`${prefix}-${String(seen.length).padStart(2, '0')}`); await onLine(text) }
    if (text && done(text)) return seen
    await sleep(200)
  }
  note('follow timeout', { label, last: seen.at(-1) }); return seen
}
const click = async (label) => { await rowOf(label).locator('[data-testid^="node-server-update-"]').click(); note('clicked', { label }) }


// ---- copy button diagnosis (L row from run 1) ----
const copyBtn = rowOf('needs-image').locator('[data-testid^="node-server-copy-"]')
const clip = await page.evaluate(async () => { try { await navigator.clipboard.writeText('ab305-probe'); return 'writeText ok' } catch (e) { return 'writeText rejected: ' + e.name + ': ' + e.message } })
note('clipboard probe', { clip })
await copyBtn.click(); await sleep(500)
const after = (await copyBtn.textContent())?.trim()
check('L: copy button confirms "Copied" (read 500 ms after the click)', after === 'Copied', { after, clip })
await shot('API-41-L-copied')

// ---- R2: a long outage during an update, with a fixed host port as the launcher gives ----
const fixed = String(await new Promise((r) => { import('node:net').then(({ createServer }) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)) }) }) }))
startNode('r2', { hostPort: fixed }); await waitHealth('r2'); await addNode('r2', 'long-restart-2')
await waitLine('long-restart-2', (t) => t.includes('Update to'), 90_000); await click('long-restart-2')
let stoppedAt = null
const rSeen = await follow('long-restart-2', (t) => stoppedAt !== null && /^Not reachable\. Last known/.test(t), 15 * 60_000, 'API-41-R2', async (t) => {
  if (stoppedAt === null && t.includes('Restarting…')) { note('docker stop (the node goes away mid-update)', { status: starterStatus('r2')?.update }); dockerQuiet('stop', nodes.r2.name); stoppedAt = Date.now() }
})
const unreachableAt = Date.now()
check('R2: Restarting… while down, then "Not reachable. Last known: updating to 1.5.11-beta.6." after about 5 min',
  rSeen.at(-1) === `Not reachable. Last known: updating to ${APP}.` && (unreachableAt - stoppedAt) > 4.5 * 60_000, { lines: rSeen, secondsDownBeforeUnreachable: Math.round((unreachableAt - stoppedAt) / 1000) })
await sleep(30_000)
dockerQuiet('start', nodes.r2.name); const startedAt = Date.now(); note('docker start (the node comes back)', { port: docker('port', nodes.r2.name, '8000/tcp') })
const rBack = await follow('long-restart-2', (t) => /^Server /.test(t) && !/Restarting/.test(t), 10 * 60_000, 'API-41-R2-back')
note('R2 node after the outage', { status: starterStatus('r2'), secondsToRecover: Math.round((Date.now() - startedAt) / 1000) })
check('R2: the row recovers by itself (no reload, no click)', /^Server /.test(rBack.at(-1) ?? ''), { last: rBack.at(-1) })
check('R2: the outcome is shown with the old version, the reason and the button', /^Server 1\.5\.11-beta\.5 /.test(rBack.at(-1) ?? '') && /did not happen/.test(rBack.at(-1) ?? '') && await hasButton('long-restart-2'), { last: rBack.at(-1) })
await shot('API-41-R2-result')
note('result', { checkFailures: fails })
await browser.close()
process.exit(fails ? 1 : 0)
