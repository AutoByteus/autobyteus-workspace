#!/usr/bin/env node
// API/E2E (autobyteus-516) temporary probe: drives a packaged isolated AutoByteus instance over its CDP control port.
//
//   node packaged-driver.mjs <step> --control-port=<n> --out=<evidence folder> [step options]
//
// Each step connects, acts like a user on one window (chosen by its node entry id: --window=embedded-local or a remote
// node's id), prints one JSON result and writes it (and any screenshot) under --out with the --name prefix.
// The microphone is emulated only for `fake-mic`: getUserMedia returns a Web Audio stream that plays --clip (a WAV);
// the store, recorder worklet, transport and the node are the product's own.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-extensions/autobyteus-web/package.json')
const { chromium } = require('playwright-core')
const [step] = process.argv.slice(2)
const arg = (name, fallback) => process.argv.find((item) => item.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback
const out = arg('out')
const name = arg('name', step)
const windowId = arg('window', 'embedded-local')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const result = { step, name, window: windowId, at: new Date().toISOString() }

const browser = await chromium.connectOverCDP(`http://127.0.0.1:${arg('control-port')}`)
const pages = browser.contexts().flatMap((context) => context.pages())
const contextOf = async (page) => page.evaluate(() => window.electronAPI?.getWindowContext?.()).catch(() => null)
const findWindow = async (entryId) => {
  for (const page of pages) {
    const context = await contextOf(page)
    if (context?.entryId === entryId) return page
  }
  throw new Error(`no window for ${entryId}; windows: ${JSON.stringify(await Promise.all(pages.map(async (p) => ({ url: p.url().slice(0, 80), ctx: await contextOf(p) }))))}`)
}
const waitFor = async (description, fn, ms = 30000) => {
  const deadline = Date.now() + ms
  let last
  while (Date.now() < deadline) {
    try { const value = await fn(); if (value) return value } catch (error) { last = error }
    await sleep(250)
  }
  throw new Error(`Timed out waiting for ${description}${last ? `: ${last.message}` : ''}`)
}
const text = async (page, testId) => (await page.locator(`[data-testid="${testId}"]`).first().innerText()).replace(/\s+/g, ' ').trim()
const shot = async (page, label) => {
  const file = path.join(out, `${name}${label ? `-${label}` : ''}.png`)
  await page.screenshot({ path: file })
  ;(result.screenshots ??= []).push(path.basename(file))
}
const routerPush = (page, target) => page.evaluate((to) => document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(to), target)
const openExtensions = async (page) => {
  // Like a user coming back to the page: leave it first, so opening it reads the node (and its catalog) again.
  await routerPush(page, '/settings?section=extensions')
  if (arg('reopen', '1') === '1') {
    await page.locator('[data-testid="settings-nav-display"]').click({ timeout: 30000 })
    await sleep(500)
    await page.locator('[data-testid="settings-nav-extensions"]').click({ timeout: 30000 })
  }
  await waitFor('the extensions list', async () => (await page.locator('[data-testid^="extension-card-"], [data-testid="extensions-catalog-unverified"], [data-testid="extensions-catalog-offline"], [data-testid="extensions-error"]').count()) > 0, 60000)
  await sleep(800)
}
const cards = async (page) => page.evaluate(() => {
  const read = (el, id) => el.querySelector(`[data-testid="${id}"]`)?.innerText.replace(/\s+/g, ' ').trim() ?? null
  const list = [...document.querySelectorAll('[data-testid^="extension-card-"]')].map((card) => {
    const id = card.getAttribute('data-testid').slice('extension-card-'.length)
    return {
      id, title: card.querySelector('h3')?.innerText.trim(), state: read(card, `extension-state-${id}`), version: read(card, `extension-version-${id}`),
      message: read(card, `extension-message-${id}`), failed: read(card, `extension-failed-${id}`), notAvailable: read(card, `extension-not-available-${id}`),
      progress: read(card, `extension-progress-${id}`), updateBadge: read(card, `extension-update-badge-${id}`),
      starting: Boolean(card.querySelector(`[data-testid="extension-starting-${id}"]`)),
      buttons: [...card.querySelectorAll('button')].map((b) => b.getAttribute('data-testid') ?? b.innerText.trim()).filter(Boolean),
    }
  })
  const note = (id) => document.querySelector(`[data-testid="${id}"]`)?.innerText.replace(/\s+/g, ' ').trim() ?? null
  return { nodeLine: note('extensions-node-line'), voiceNote: note('extensions-voice-note'), unverified: note('extensions-catalog-unverified'),
    offline: note('extensions-catalog-offline'), error: note('extensions-error'), cards: list }
})
const watchResponses = (page) => {
  const seen = []
  page.on('response', (response) => {
    const url = response.url()
    if (url.includes('/rest/extensions/') || url.includes('/graphql')) seen.push({ status: response.status(), method: response.request().method(), url: url.replace(/\?.*$/, '') })
  })
  return seen
}
const fakeMic = async (page, clip) => {
  const base64 = (await fs.readFile(clip)).toString('base64')
  await page.evaluate((data) => {
    const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
    const device = { deviceId: 'api-e2e-fake-mic', groupId: 'api-e2e', kind: 'audioinput', label: 'API/E2E fake microphone', toJSON() { return this } }
    navigator.mediaDevices.enumerateDevices = async () => [device]
    const query = navigator.permissions.query.bind(navigator.permissions)
    navigator.permissions.query = async (descriptor) => descriptor?.name === 'microphone' ? { state: 'granted', onchange: null, addEventListener() {}, removeEventListener() {} } : query(descriptor)
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext({ sampleRate: 48000 })
      const buffer = await context.decodeAudioData(bytes.buffer.slice(0))
      const source = context.createBufferSource()
      source.buffer = buffer
      const destination = context.createMediaStreamDestination()
      source.connect(destination)
      source.start()
      window.__apiE2eFakeMicCalls = (window.__apiE2eFakeMicCalls ?? 0) + 1
      return destination.stream
    }
    window.__apiE2eFakeMic = true
  }, base64)
}

try {
  if (step === 'windows') {
    result.windows = await Promise.all(pages.map(async (page) => ({ url: page.url().replace(/\?.*$/, ''), context: await contextOf(page) })))
  } else if (step === 'extensions') {
    const page = await findWindow(windowId)
    await page.bringToFront()
    await openExtensions(page)
    if (arg('wait-card')) {
      const [id, state] = arg('wait-card').split(':')
      await waitFor(`${id} ${state}`, async () => {
        const view = await cards(page)
        const card = view.cards.find((c) => c.id === id)
        return card && card.state === state && !card.starting && !card.progress
      }, Number(arg('timeout', '60000')))
    }
    Object.assign(result, await cards(page))
    await shot(page)
  } else if (step === 'click') {
    const page = await findWindow(windowId)
    await page.bringToFront()
    const seen = watchResponses(page)
    await page.locator(`[data-testid="${arg('testid')}"]`).first().click()
    await sleep(Number(arg('settle', '1500')))
    result.responses = seen
    Object.assign(result, await cards(page))
    await shot(page)
  } else if (step === 'install-and-wait') {
    // Install (or Update) from the card and follow the phases to On without spinner.
    const page = await findWindow(windowId)
    await page.bringToFront()
    const id = arg('id')
    const seen = watchResponses(page)
    const started = Date.now()
    await page.locator(`[data-testid="${arg('testid', `extension-install-${id}`)}"]`).first().click()
    const phases = []
    let busyShot = false
    await waitFor(`${id} on and ready`, async () => {
      const card = (await cards(page)).cards.find((c) => c.id === id)
      const phase = card?.progress ? `${card.state}: ${card.progress}` : card?.starting ? `${card.state}: starting: ${card.message}` : `${card?.state}: ${card?.message ?? ''}`
      if (phase && phases.at(-1)?.phase !== phase) phases.push({ s: Math.round((Date.now() - started) / 1000), phase })
      if (!busyShot && card?.progress) { busyShot = true; await shot(page, 'busy') }
      return card && (card.state === 'On' || card.state === 'Off' || card.state === 'Failed' || card.state === 'Not ready') && !card.starting && !card.progress && Date.now() - started > 3000
    }, Number(arg('timeout', '1800000')))
    result.seconds = Math.round((Date.now() - started) / 1000)
    result.phases = phases
    result.refused = seen.filter((r) => r.status >= 400)
    Object.assign(result, await cards(page))
    await shot(page)
  } else if (step === 'page-check') {
    // The extension's own page in its sandboxed frame, through the window's node, with the desktop's real credential attacher.
    const page = await findWindow(windowId)
    await page.bringToFront()
    const id = arg('id', 'voice-input')
    const seen = watchResponses(page)
    await openExtensions(page)
    const frameHost = page.locator(`[data-testid="extension-page-${id}"] iframe`)
    if (!(await frameHost.count())) await page.locator(`[data-testid="extension-toggle-page-${id}"]`).click()
    await frameHost.waitFor({ timeout: 30000 })
    const frame = page.frameLocator(`[data-testid="extension-page-${id}"] iframe`)
    if (id === 'voice-input') {
      await frame.locator('#facts').getByText('0.3.2').waitFor({ timeout: 30000 })
      result.pageFacts = await frame.locator('#facts').innerText()
      if (arg('language')) {
        await frame.locator('#lang').selectOption(arg('language'))
        await frame.getByText('Saved').waitFor({ timeout: 15000 })
        result.languageSaved = arg('language')
      }
    } else {
      await waitFor('the page answer', async () => !(await frame.locator('#out').innerText()).includes('asking'), 30000)
      result.pageAnswer = await frame.locator('#out').innerText()
    }
    result.frameSrc = await frameHost.getAttribute('src')
    result.frameSandbox = await frameHost.getAttribute('sandbox')
    result.frameHeight = await frameHost.evaluate((el) => el.getBoundingClientRect().height)
    await sleep(1000)
    result.responses = seen.filter((r) => r.url.includes('/rest/extensions/'))
    result.refused = seen.filter((r) => r.status >= 400)
    await frameHost.scrollIntoViewIfNeeded()
    await shot(page)
  } else if (step === 'fake-mic') {
    const page = await findWindow(windowId)
    await fakeMic(page, arg('clip'))
    result.installed = await page.evaluate(() => window.__apiE2eFakeMic === true)
  } else if (step === 'test') {
    // Settings → Extensions → the microphone panel's Test (records, transcribes with this computer's Voice Input).
    const page = await findWindow(windowId)
    await page.bringToFront()
    await fakeMic(page, arg('clip'))
    await openExtensions(page)
    const seen = watchResponses(page)
    const button = page.locator('[data-testid="voice-test-button"]')
    await button.scrollIntoViewIfNeeded()
    await button.click()
    await waitFor('recording', async () => (await button.innerText()).includes('Stop'), 20000)
    await sleep(6500)
    await button.click()
    const started = Date.now()
    await page.locator('[data-testid="voice-test-result"]').waitFor({ timeout: 180000 })
    result.ms = Date.now() - started
    result.transcript = await text(page, 'voice-test-result')
    result.fakeMicCalls = await page.evaluate(() => window.__apiE2eFakeMicCalls ?? 0)
    result.transcribeRequests = seen.filter((r) => r.url.includes('/actions/transcribe'))
    await shot(page)
  } else if (step === 'memory-mic') {
    // A voice surface (Memory search) in the chosen window: is the microphone button there? With --dictate, dictate.
    const page = await findWindow(windowId)
    await page.bringToFront()
    // bringToFront gives the window real focus (the store's focus listener reads availability again); no synthetic event.
    result.hasFocus = await page.evaluate(() => document.hasFocus())
    // The voice surface: Memory search by default; --route=/chat (no --preclick) for the Chat composer.
    await routerPush(page, arg('route', '/memory'))
    const preclick = arg('preclick', arg('route') ? 'none' : '[data-test="memory-section-search"]')
    if (preclick !== 'none') await page.locator(preclick).click({ timeout: 60000 })
    await sleep(Number(arg('settle', '3000')))
    const mic = page.getByRole('button', { name: 'Start voice input' })
    result.micButtons = await mic.count()
    result.micButtonsEnabled = await page.locator('button[aria-label="Start voice input"]:not([disabled])').count()
    if (arg('dictate')) {
      await fakeMic(page, arg('clip'))
      const seen = watchResponses(page)
      await mic.first().click()
      await page.getByRole('button', { name: /Stop voice input|Stop recording/ }).first().waitFor({ timeout: 20000 }).catch(() => undefined)
      await sleep(6500)
      await page.getByRole('button', { name: /Stop voice input|Stop recording/ }).first().click()
      const started = Date.now()
      const input = page.locator('[data-test="memory-section-search"]').locator('xpath=ancestor-or-self::*[1]').locator('input, textarea')
      result.inserted = await waitFor('text in the search field', async () => {
        const values = await page.evaluate(() => [...document.querySelectorAll('input, textarea')].map((el) => el.value).filter((v) => /\w{4,}/.test(v)))
        return values.length ? values : null
      }, 180000)
      result.ms = Date.now() - started
      result.transcribeRequests = seen.filter((r) => r.url.includes('/actions/transcribe'))
      void input
    }
    await shot(page)
  } else if (step === 'add-node') {
    // The user's "Add node" with a setup code: registry entry, connect (setup exchange), open its window.
    const page = await findWindow('embedded-local')
    const code = (await fs.readFile(arg('code-file'), 'utf8')).trim()
    const now = new Date().toISOString()
    const node = { id: arg('id'), name: arg('node-name'), baseUrl: arg('url'), nodeType: 'remote', createdAt: now, updatedAt: now }
    result.upsert = await page.evaluate((n) => window.electronAPI.upsertNodeRegistry({ type: 'add', node: n }).then(() => 'ok'), node)
    result.connect = await page.evaluate(([id, c]) => window.electronAPI.connectNode(id, c).then((r) => (r && typeof r === 'object' ? Object.keys(r) : r)), [node.id, code])
    result.open = await page.evaluate((id) => window.electronAPI.openNodeWindow(id).then(() => 'opened'), node.id)
    result.node = { ...node }
  } else if (step === 'eval') {
    const page = await findWindow(windowId)
    result.value = await page.evaluate(arg('js'))
  } else {
    throw new Error(`unknown step ${step}`)
  }
  result.ok = true
} catch (error) {
  result.ok = false
  result.error = error.message
  try { const page = await findWindow(windowId); await shot(page, 'failure') } catch { /* no window */ }
}
if (out) await fs.writeFile(path.join(out, `${name}.json`), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
// No browser.close(): the instance is the user's app under test; exiting only drops this CDP connection.
process.exit(result.ok ? 0 : 1)
