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

function startNode(id, { variant = 'good', image = testImage } = {}) {
  const name = `ab305-api4-${id}`
  for (const v of ['data', 'packages']) docker('volume', 'create', '--label', LABEL, `${name}-${v}`)
  docker('run', '-d', '--name', name, '--label', LABEL, '-p', '127.0.0.1::8000', '--cap-add', 'SYS_ADMIN', '--security-opt', 'seccomp=unconfined',
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
note('nodes page open', { url: page.url() })
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

// ---- I: an older node that stays in the list the whole session and is never clicked (AC-010) ----
startNode('i'); await waitHealth('i'); await addNode('i', 'idle-node')
const iOffer = await waitLine('idle-node', (t) => t.includes(`Update to ${APP}`), 90_000)
check('I: the row offers the update', Boolean(iOffer), { line: iOffer }); await shot('API-41-I-offered')
const sessionStart = Date.now()

// ---- P: a pre-starter image (N-4) ----
startNode('p', { image: step1Image }); await waitHealth('p'); await addNode('p', 'pre-starter')
const pLine = await waitLine('pre-starter', (t) => t.length > 0, 90_000)
note('row line', { label: 'pre-starter', text: pLine }); await shot('API-41-P-pre-starter')
check('P: a pre-starter node shows the generic "Not reachable." (N-4) and no button', pLine === 'Not reachable.' && !(await hasButton('pre-starter')), { line: pLine })

// ---- L: NEEDS_NEW_IMAGE from the row ----
startNode('l', { variant: 'lvl99' }); await waitHealth('l'); await addNode('l', 'needs-image')
await waitLine('needs-image', (t) => t.includes('Update to'), 90_000); await click('needs-image')
const lSeen = await follow('needs-image', (t) => t.includes('did not happen'), 5 * 60_000, 'API-41-L')
const lFinal = lSeen.at(-1) ?? ''
const copyBtn = rowOf('needs-image').locator('[data-testid^="node-server-copy-"]')
const copyTitle = (await copyBtn.count()) ? await copyBtn.getAttribute('title') : null
check('L: "did not happen" with the new-image reason', /did not happen/.test(lFinal) && /needs a new Docker image/.test(lFinal), { line: lFinal })
check('L: copy button carries `autobyteus-docker upgrade --all --tag 1.5.11-beta.6`', copyTitle === `autobyteus-docker upgrade --all --tag ${APP}`, { copyTitle })
if (copyTitle) { await copyBtn.click(); const after = await copyBtn.textContent(); check('L: copy button confirms "Copied"', after?.trim() === 'Copied', { after }) }
check('L: the button stays after the refusal', await hasButton('needs-image'))
await shot('API-41-L-result')
check('L: node still 1.5.11-beta.5, update refused NEEDS_NEW_IMAGE', (() => { const s = starterStatus('l'); return s?.version === '1.5.11-beta.5' && s?.update?.code === 'NEEDS_NEW_IMAGE' })(), { status: starterStatus('l')?.update })

// ---- F: a verified build that fails after the switch ----
startNode('f', { variant: 'fail' }); await waitHealth('f'); await addNode('f', 'fails-after')
await waitLine('fails-after', (t) => t.includes('Update to'), 90_000); await click('fails-after')
const fSeen = await follow('fails-after', (t) => t.includes('did not happen'), 10 * 60_000, 'API-41-F')
const fFinal = fSeen.at(-1) ?? ''
check('F: "did not happen" with the reason (did not come up; old version runs again)', /did not happen/.test(fFinal) && /did not come up/.test(fFinal), { line: fFinal })
check('F: the row shows the old version again and the button stays', fFinal.startsWith('Server 1.5.11-beta.5') && await hasButton('fails-after'))
check('F: node runs 1.5.11-beta.5 built-in, FAILED_AFTER_SWITCH, migration undone', (() => { const s = starterStatus('f'); return s?.version === '1.5.11-beta.5' && s?.server?.source === 'builtIn' && s?.update?.code === 'FAILED_AFTER_SWITCH' })() && dbHas('f', 'Test305_1_5_11_beta_6') === 0, { update: starterStatus('f')?.update })
await shot('API-41-F-result')

// ---- G: slow download ----
startNode('g'); await waitHealth('g'); await addNode('g', 'slow-download')
await waitLine('slow-download', (t) => t.includes('Update to'), 90_000)
const gContainer = docker('inspect', '--format', '{{.Id}} {{.Image}}', nodes.g.name)
await click('slow-download')
const gSeen = await follow('slow-download', (t) => /Updated to|did not happen/.test(t), 15 * 60_000, 'API-41-G')
check('G: "Downloading 1.5.11-beta.6…" was shown', gSeen.some((t) => t.includes(`Downloading ${APP}…`)), { lines: gSeen })
check('G: steps in order and "Updated to 1.5.11-beta.6."', gSeen.at(-1) === `Server ${APP} Updated to ${APP}.`, { last: gSeen.at(-1) })
check('G: same container and image (AC-001)', docker('inspect', '--format', '{{.Id}} {{.Image}}', nodes.g.name) === gContainer)
const gReq = starterLog('g', 'update-requested')
note('G starter request log', { lines: gReq })
check('G: the request is logged with the client address (AC-009)', /"requestedFrom":"(\d+\.){3}\d+"/.test(gReq), { gReq })

// ---- H: an update started from the host while the row is visible ----
startNode('h'); await waitHealth('h'); await addNode('h', 'host-update')
await waitLine('host-update', (t) => t.includes('Update to'), 90_000); await shot('API-41-H-before')
const stateDir = path.join(out, '..', 'h-launcher-state'); mkdirSync(path.join(stateDir, 'nodes'), { recursive: true })
writeFileSync(path.join(stateDir, 'nodes', `${nodes.h.name}.env`), `NODE_NAME=${nodes.h.name}\nCONTAINER_NAME=${nodes.h.name}\nBACKEND_PORT=${nodes.h.port}\nVNC_PORT=\nNOVNC_PORT=\nDEBUG_PORT=\nIMAGE_REF=${testImage}\nCREATED_AT=\nCONFIG_HASH=\n`)
const launcherOut = []
const launcher = spawn('/bin/bash', [path.join(worktree, 'scripts/public/docker/autobyteus-docker.sh'), 'update', '--name', nodes.h.name, '--version', APP],
  { env: { ...env, AUTOBYTEUS_DOCKER_STATE_DIR: stateDir } })
launcher.stdout.on('data', (d) => { launcherOut.push(String(d)); note('host launcher', { out: String(d).trim() }) })
launcher.stderr.on('data', (d) => note('host launcher stderr', { out: String(d).trim() }))
await sleep(8_000)
const hIdle = await serverLine('host-update'); note('row line', { label: 'host-update', text: hIdle, while: 'host update running, page not reopened' })
await page.evaluate(() => { window.location.hash = '#/settings' }); await sleep(1_500); await openManage()
note('page reopened')
const hSeen = await follow('host-update', (t) => /Updated to|did not happen/.test(t), 15 * 60_000, 'API-41-H')
await new Promise((r) => (launcher.exitCode !== null ? r() : launcher.on('exit', r)))
check('H: after reopening, the row follows the host-started update (progress shown)', hSeen.some((t) => /Downloading|Preparing|Checking|Restarting/.test(t)), { lines: hSeen })
check('H: the row ends "Updated to 1.5.11-beta.6."', hSeen.at(-1) === `Server ${APP} Updated to ${APP}.`, { last: hSeen.at(-1) })
check('H: the host launcher reported the same result', launcherOut.join('').includes(`Updated to ${APP}.`) && launcher.exitCode === 0)
check('H: the node logged the request as the host command', /"requestedFrom":"host command"/.test(starterLog('h', 'update-requested')))

// ---- R: a long outage during an update ----
startNode('r'); await waitHealth('r'); await addNode('r', 'long-restart')
await waitLine('long-restart', (t) => t.includes('Update to'), 90_000); await click('long-restart')
let stoppedAt = null, unreachableAt = null
const rSeen = await follow('long-restart', (t) => stoppedAt !== null && /^Not reachable\. Last known/.test(t), 15 * 60_000, 'API-41-R', async (t) => {
  if (stoppedAt === null && t.includes('Restarting…')) { note('docker stop (the node goes away mid-update)', { status: starterStatus('r')?.update }); dockerQuiet('stop', nodes.r.name); stoppedAt = Date.now() }
})
unreachableAt = Date.now()
check('R: Restarting… while the node is down, then "Not reachable. Last known: updating to 1.5.11-beta.6." after about 5 min',
  rSeen.some((t) => t === 'Restarting…' || t.endsWith('Restarting…')) && rSeen.at(-1) === `Not reachable. Last known: updating to ${APP}.` && (unreachableAt - stoppedAt) > 4.5 * 60_000,
  { lines: rSeen, secondsDownBeforeUnreachable: Math.round((unreachableAt - stoppedAt) / 1000) })
await sleep(30_000)
dockerQuiet('start', nodes.r.name); note('docker start (the node comes back)')
const rBack = await follow('long-restart', (t) => /^Server /.test(t) && !/Restarting/.test(t), 10 * 60_000, 'API-41-R-back')
note('R node after the outage', { status: starterStatus('r') })
check('R: the row recovers by itself (no reload, no click) and shows the node again', /^Server /.test(rBack.at(-1) ?? ''), { last: rBack.at(-1) })
check('R: the outcome is shown: the old version with the reason, and the button, or the new version', /did not happen|Updated to/.test(rBack.at(-1) ?? ''), { last: rBack.at(-1), button: await hasButton('long-restart') })

// ---- zh-CN ----
await page.evaluate(() => { window.location.hash = '#/settings' }); await page.waitForSelector('[data-testid="settings-nav-language"]', { timeout: 30_000 })
await page.click('[data-testid="settings-nav-language"]'); await page.selectOption('[data-testid="settings-language-select"]', 'zh-CN'); await sleep(1_000)
await openManage(); await sleep(4_000)
const zh = {}
for (const label of ['idle-node', 'pre-starter', 'needs-image', 'fails-after', 'slow-download', 'host-update', 'long-restart']) zh[label] = await serverLine(label)
note('zh-CN lines', zh); await shot('API-41-zhCN-manage'); await page.screenshot({ path: path.join(out, 'API-41-zhCN-manage-full.png'), fullPage: true })
check('zh-CN: the offer reads 更新到 1.5.11-beta.6 with 与本应用版本相同', /更新到 1\.5\.11-beta\.6/.test(zh['idle-node'] ?? '') && /与本应用版本相同/.test(zh['idle-node'] ?? ''), { line: zh['idle-node'] })
check('zh-CN: the pre-starter row reads 无法访问。', zh['pre-starter'] === '无法访问。', { line: zh['pre-starter'] })
check('zh-CN: version lines read 服务器 <version>', /^服务器 /.test(zh['needs-image'] ?? ''), { line: zh['needs-image'] })
await page.evaluate(() => { window.location.hash = '#/settings' }); await page.waitForSelector('[data-testid="settings-nav-language"]')
await page.click('[data-testid="settings-nav-language"]'); await page.selectOption('[data-testid="settings-language-select"]', 'en'); await sleep(500); await openManage()

// ---- AC-010 over the session ----
const iPosts = requests.filter((r) => r.method === 'POST' && r.url.startsWith(nodes.i.address))
const iGets = requests.filter((r) => r.method === 'GET' && r.url.startsWith(nodes.i.address))
const minutes = Math.round((Date.now() - sessionStart) / 60_000)
note('AC-010 record', { minutes, iGets: iGets.length, iPosts: iPosts.length, allPosts: requests.filter((r) => r.method === 'POST').map((r) => r.url) })
check(`AC-010: ${minutes} min with an older node never clicked: no POST to it, and it was asked (GET > 0)`, iPosts.length === 0 && iGets.length > 0)
check('AC-010: its starter never logged an update request; it still runs 1.5.11-beta.5', starterLog('i', 'update-requested') === '' && starterStatus('i')?.version === '1.5.11-beta.5')
const posts = requests.filter((r) => r.method === 'POST').map((r) => r.url.split('/rest')[0])
check('AC-010: POSTs only to the four nodes clicked in this window (L, F, G, R), one each', JSON.stringify(posts.sort()) === JSON.stringify([nodes.l, nodes.f, nodes.g, nodes.r].map((n) => n.address).sort()), { posts })
writeFileSync(path.join(out, 'requests.json'), JSON.stringify(requests, null, 2))
note('result', { checkFailures: fails })
await browser.close()
process.exit(fails ? 1 : 0)
