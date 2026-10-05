#!/usr/bin/env node
// New-chat composer menus open upward probe (ticket chat-composer-menus-open-upward).
//
// Real browser (Chrome via playwright-core) → real Nuxt dev → real backend (`dist/app.js`) → the real
// runtime model catalogs. Everything runs in an owned temp data root on free ports with a sanitized
// environment, so a running desktop app or the user's `~/.autobyteus` data is never touched.
//
// Cases:
//   U01 new-chat layout at 1512x952, 1280x720, 1024x520, 1024x440: `pt-[14vh] pb-10`, flex-centered,
//       10vh − 40px lower than the previous padding, hint directly under the composer (REQ-002, AC-003)
//   U02 `@` and `/` open above the composer card at those viewports: 6px gap, height rule, never
//       below, on screen, composer uncovered, list scrolls; keyboard, choose, Escape, outside click
//       (REQ-001, REQ-003, REQ-004, AC-001, AC-004, AC-005)
//   U03 Workspace, Model (runtime flyout, search results) and Thinking open above their trigger at
//       those viewports; focus and selection still work (REQ-001, REQ-003, REQ-004, AC-002, AC-004)
//   U04 very short window with the page scrolled: menus still open above and stay on screen; a
//       Thinking menu taller than its limit scrolls (REQ-003)
//   U05 390x844: all five menus are the unchanged bottom sheet (REQ-004, AC-005)
//   U06 running conversation: `/` opens the skill menu above the run composer with the unchanged
//       automatic placement (REQ-004, AC-005)
//
// Prerequisites: `pnpm -C autobyteus-server-ts build` (its workspace contract packages need `dist/`),
// Google Chrome, and a logged-in `claude` CLI (the Thinking menu in U03–U05 and the run in U06; U06
// sends one short message to a real Claude Agent SDK run).
//
// Usage: pnpm test:e2e:chat-composer-menus-open-upward [--output-dir test-results/chat-composer-menus-open-upward]
//        [--model claude-opus-5-5] [--cases U01,U02] [--keep]
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright-core')
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(scriptDir, '../..')
const serverDir = path.join(path.resolve(webDir, '..'), 'autobyteus-server-ts')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback
}
const outDir = path.resolve(webDir, arg('output-dir', 'test-results/chat-composer-menus-open-upward'))
const preferredModel = arg('model', 'claude-opus-5-5')
const keep = process.argv.includes('--keep')
const onlyCases = arg('cases', null)?.split(',') ?? null
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH
  ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync))
const CLAUDE = 'claude_agent_sdk'

// The approved rule (UI/UX spec "Height rule"): preferred heights, 6px gap, 16px viewport margin.
const PREFERRED = { target: 300, skill: 300, workspace: 420, model: 360, thinking: 240 }
const GAP = 6
const MARGIN = 16
const FLYOUT = { listMax: 320, overhang: 5, margin: 12, chrome: 10 }
const WIDE = [{ width: 1512, height: 952 }, { width: 1280, height: 720 }, { width: 1024, height: 520 }, { width: 1024, height: 440 }]
const NARROW = { width: 390, height: 844 }
const HEADING_TOP = { '1512x952': 379, '1280x720': 246 }
const AGENT_COUNT = 9
const SKILL_COUNT = 12
const WORKSPACE_COUNT = 14

const evidence = { startedAt: new Date().toISOString(), cases: {}, processes: [], cleanup: [] }
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e } }
const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance
const label = (vp) => `${vp.width}x${vp.height}`
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.unref(); s.on('error', reject)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)) })
})
const waitFor = async (what, fn, timeout = 90000, interval = 250) => {
  const start = Date.now()
  while (Date.now() - start < timeout) { try { const v = await fn(); if (v) return v } catch {} await delay(interval) }
  throw new Error(`Timed out waiting for ${what}`)
}

// A sanitized environment: nothing from a surrounding AutoByteus process leaks into owned processes.
const baseEnv = () => Object.fromEntries(['HOME', 'PATH', 'USER', 'LANG', 'TMPDIR', 'SHELL', 'TERM']
  .filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))
const owned = []
const spawnOwned = (name, command, args, cwd, env) => {
  const log = createWriteStream(path.join(outDir, `${name}.log`))
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
  child.stdout.pipe(log); child.stderr.pipe(log)
  owned.push(child); evidence.processes.push({ label: name, pid: child.pid })
  return child
}
const stopOwned = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode) return 'already-exited'
  try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
  const exited = await Promise.race([new Promise((r) => child.once('exit', () => r(true))), delay(15000).then(() => false)])
  if (!exited) { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }
  return exited ? 'SIGTERM' : 'SIGKILL'
}

let ownedRoot, dataRoot, backendUrl, frontUrl, browser
const gql = async (query, variables = {}) => {
  const res = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) })
  const json = await res.json()
  if (json.errors?.length) throw new Error(`GraphQL: ${JSON.stringify(json.errors).slice(0, 400)}`)
  return json.data
}
const terminate = (runId) => gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runId })

// ---------------------------------------------------------------------------------------------
// Page helpers (selectors are the product's data-test attributes)
const sel = (t) => `[data-test="${t}"]`
const RUN_VIEW = '[data-testid="agent-workspace-surface"]'
const MODEL_ROW = 'button[role="menuitemradio"][data-test^="chat-model-option-"]'
const state = { agents: [], skills: [], workspaces: [], runs: [] }

/** A fresh browser context at one viewport, on the new-chat page with motion disabled. */
const openNewChat = async (vp) => {
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, locale: 'en-US' })
  const page = await context.newPage(); page.setDefaultTimeout(30000)
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto(`${frontUrl}/chat`, { waitUntil: 'domcontentloaded' })
  await page.locator(sel('chat-new')).waitFor({ timeout: 180000 })
  await page.locator(sel('chat-composer')).waitFor({ timeout: 60000 })
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  await delay(1000)
  return { context, page, pageErrors }
}
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${name}.png`) })
const activeTest = (page) => page.evaluate(() => document.activeElement?.getAttribute('data-test') ?? document.activeElement?.tagName)
const typeTrigger = async (page, char, input = page.locator(sel('chat-message-input'))) => {
  await input.click(); await input.fill(''); await page.keyboard.type(char)
}

/**
 * Geometry of one open menu: the box that is positioned (the menu or its wrapper), the box it is
 * positioned against, its scroll region and the page landmarks. `scrollToEnd` scrolls the scroll
 * region to its end first, to show that the last row can be reached inside the menu.
 */
const geometry = (page, menuSelector, { scrollToEnd = false } = {}) => page.evaluate(({ menuSelector, scrollToEnd }) => {
  const box = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height, width: r.width } }
  const q = (s) => document.querySelector(s)
  const menu = q(menuSelector)
  if (!menu) return null
  let positioned = menu
  while (positioned.parentElement && !['absolute', 'fixed'].includes(getComputedStyle(positioned).position)) positioned = positioned.parentElement
  const position = getComputedStyle(positioned).position
  const anchor = position === 'fixed' ? null : positioned.offsetParent
  const submenu = menu.querySelector('[data-test="chat-model-submenu"]')
  const own = (e) => !submenu || !submenu.contains(e)
  const scroller = [positioned, ...positioned.querySelectorAll('*')].filter(own).find((e) => ['auto', 'scroll'].includes(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1) ?? null
  if (scroller && scrollToEnd) scroller.scrollTop = scroller.scrollHeight
  const rows = [...menu.querySelectorAll('[role="option"], [role="menuitemradio"], [role="menuitem"]')].filter(own)
  const lastRow = rows.at(-1) ?? null
  const footer = menu.querySelector('footer')
  const hint = q('[data-test="chat-new-hint"]')
  return {
    vw: innerWidth, vh: innerHeight, position, classes: positioned.className, inlineMaxHeight: positioned.style.maxHeight,
    menu: box(positioned), anchor: anchor ? { test: anchor.getAttribute('data-test'), borderTop: anchor.clientTop, ...box(anchor) } : null,
    scroller: scroller ? { isMenu: scroller === menu, scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight, scrollTop: scroller.scrollTop, ...box(scroller) } : null,
    rowCount: rows.length, lastRow: lastRow ? box(lastRow) : null, rowBoxes: rows.map(box),
    header: menu.firstElementChild ? box(menu.firstElementChild) : null, footer: footer ? box(footer) : null,
    hint: hint ? box(hint) : null, backdrop: !!q('.fixed.inset-0.bg-black\\/20'),
  }
}, { menuSelector, scrollToEnd })

const heightLimit = (g, preferred) => Math.max(0, Math.min(preferred, Math.floor(g.anchor.top - GAP - MARGIN)))

/** REQ-001 / REQ-003: the menu is above its positioning box, inside the height rule and on screen. */
const aboveFails = (g, preferred, { anchorTest, rows = true } = {}) => {
  if (!g) return ['menu not open']
  const fails = []
  if (g.position !== 'absolute') fails.push(`menu is ${g.position}, not an anchored popover`)
  if (!g.anchor) return [...fails, 'no positioning box']
  if (anchorTest && g.anchor.test !== anchorTest) fails.push(`positioned against ${g.anchor.test}, not ${anchorTest}`)
  // `bottom-full mb-1.5`: 6px above the positioning box's padding edge (inside its top border).
  const gap = g.anchor.top + g.anchor.borderTop - g.menu.bottom
  if (!near(gap, GAP, 0.6)) fails.push(`menu bottom is ${gap.toFixed(1)}px above its positioning box, not ${GAP}px (it opened ${gap < 0 ? 'below' : 'elsewhere'})`)
  const limit = heightLimit(g, preferred)
  if (g.inlineMaxHeight !== `${limit}px`) fails.push(`max-height ${g.inlineMaxHeight || '(none)'} is not ${limit}px`)
  if (g.menu.height > limit + 0.5) fails.push(`height ${g.menu.height.toFixed(1)} exceeds the limit ${limit}`)
  if (g.menu.top < MARGIN - 0.5) fails.push(`top ${g.menu.top.toFixed(1)} is inside the ${MARGIN}px viewport margin`)
  if (g.menu.bottom > g.vh + 0.5 || g.menu.left < -0.5 || g.menu.right > g.vw + 0.5) fails.push('menu is not fully on screen')
  if (g.hint && g.menu.bottom > g.hint.top + 0.5) fails.push('menu covers the hint line')
  // Header, footer and list stay inside the menu. A menu that scrolls as a whole (Thinking) has no
  // fixed header; `rows: false` is for limits too small to hold the fixed rows (no minimum height).
  if (!rows) return fails
  if (g.header && !g.scroller?.isMenu && (g.header.top < g.menu.top - 0.5 || g.header.bottom > g.menu.bottom + 0.5)) fails.push('header row is outside the menu')
  if (g.footer && (g.footer.top < g.menu.top - 0.5 || g.footer.bottom > g.menu.bottom + 0.5)) fails.push('footer row is outside the menu')
  if (g.scroller && (g.scroller.top < g.menu.top - 0.5 || g.scroller.bottom > g.menu.bottom + 0.5)) fails.push('list area is outside the menu')
  return fails
}
/** The last row is inside the menu after scrolling the list to its end. */
const lastRowFails = (g) => {
  if (!g?.lastRow) return ['no rows']
  return g.lastRow.bottom <= g.menu.bottom + 0.5 && g.lastRow.top >= g.menu.top - 0.5 ? [] : ['last row cannot be scrolled into the menu']
}
/** Without a scroll region every row must already be inside the menu. */
const rowsInsideFails = (g) => (g.rowBoxes.every((r) => r.top >= g.menu.top - 0.5 && r.bottom <= g.menu.bottom + 0.5) ? [] : ['rows overflow the menu'])
/** BEH-003: the unchanged bottom sheet. */
const sheetFails = (g) => {
  if (!g) return ['menu not open']
  const fails = []
  if (g.position !== 'fixed') fails.push(`menu is ${g.position}, not a fixed bottom sheet`)
  if (Math.round(g.vh - g.menu.bottom) !== 8) fails.push(`sheet is ${(g.vh - g.menu.bottom).toFixed(1)}px from the bottom, not 8px`)
  if (Math.round(g.menu.left) !== 8 || Math.round(g.vw - g.menu.right) !== 8) fails.push('sheet is not inset 8px left and right')
  if (g.inlineMaxHeight) fails.push(`inline max-height ${g.inlineMaxHeight} on the sheet`)
  if (/\b(bottom-full|top-full)\b/.test(g.classes)) fails.push(`anchored placement classes on the sheet: ${g.classes}`)
  if (!g.backdrop) fails.push('no backdrop')
  if (g.menu.top < 0) fails.push('sheet is taller than the screen')
  return fails
}
const tagged = (where, fails) => fails.map((f) => `${where}: ${f}`)

const pickModel = async (page, runtimeKind, model) => {
  await page.locator(sel('chat-model-trigger')).click()
  await page.locator(sel(`chat-runtime-${runtimeKind}`)).click()
  await page.locator(MODEL_ROW).first().waitFor({ timeout: 120000 })
  const models = await page.locator(MODEL_ROW).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-model-option-', '')))
  const chosen = model && models.includes(model) ? model : models[0]
  await page.locator(sel(`chat-model-option-${chosen}`)).click()
  await page.locator(sel('chat-model-menu')).waitFor({ state: 'detached' })
  return chosen
}
/** Makes sure the composer shows a Thinking control (the Claude Agent SDK models have one). */
const ensureThinking = async (page) => {
  const trigger = page.locator(sel('chat-thinking-trigger'))
  if (await trigger.waitFor({ timeout: 4000 }).then(() => true).catch(() => false)) return 'preselected model'
  const chosen = await pickModel(page, CLAUDE, preferredModel)
  await trigger.waitFor({ timeout: 60000 })
  return chosen
}

const cases = []
const defineCase = (id, title, fn) => cases.push({ id, title, fn })

defineCase('U01', 'Layout at four wide viewports: pt-[14vh] pb-10, centered, 10vh−40px lower, hint under the composer (AC-003)', async () => {
  const fails = []; const results = {}
  for (const vp of WIDE) {
    const { context, page, pageErrors } = await openNewChat(vp)
    const measure = () => page.evaluate(() => {
      const root = document.querySelector('[data-test="chat-new"]'); const inner = root.firstElementChild
      const box = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom } }
      const style = getComputedStyle(inner)
      // run-settings-ui-unification: the hint line under the composer is gone (it only shows while starting).
      const parts = ['h1', '[data-test="chat-new-subtitle"]', '[data-test="chat-composer"]'].map((s) => box(inner.querySelector(s)))
      return { paddingTop: parseFloat(style.paddingTop), paddingBottom: parseFloat(style.paddingBottom), justify: style.justifyContent, display: style.display, direction: style.flexDirection, parts, area: box(root), overflow: root.scrollHeight > root.clientHeight + 1 }
    })
    const now = await measure()
    // Baseline: the same page with the padding this ticket replaced (`pt-10 pb-[6vh]`).
    await page.evaluate(() => { const s = document.querySelector('[data-test="chat-new"]').firstElementChild.style; s.paddingTop = '40px'; s.paddingBottom = '6vh' })
    const before = await measure()
    await page.evaluate(() => { const s = document.querySelector('[data-test="chat-new"]').firstElementChild.style; s.paddingTop = ''; s.paddingBottom = '' })
    const moved = now.parts[0].top - before.parts[0].top
    const [heading, , composer] = now.parts
    const f = []
    if (!near(now.paddingTop, 0.14 * vp.height, 1)) f.push(`padding-top ${now.paddingTop} is not 14vh (${(0.14 * vp.height).toFixed(1)})`)
    if (now.paddingBottom !== 40) f.push(`padding-bottom ${now.paddingBottom} is not 40px`)
    if (now.display !== 'flex' || now.direction !== 'column' || now.justify !== 'center') f.push('column is not flex-centered')
    if (!now.parts.every((b, i) => i === 0 || b.top >= now.parts[i - 1].bottom - 0.5)) f.push('heading, subtitle and composer overlap or are out of order')
    if (now.overflow) f.push('new-chat area overflows')
    if (heading.top < now.area.top - 0.5 || composer.bottom > now.area.bottom + 0.5) f.push('group is clipped by the new-chat area')
    if (!near(moved, 0.1 * vp.height - 40, 1.5)) f.push(`group moved ${moved.toFixed(1)}px versus pt-10 pb-[6vh], not 10vh−40px (${(0.1 * vp.height - 40).toFixed(1)})`)
    const reference = HEADING_TOP[label(vp)]
    if (reference && !near(heading.top, reference, 4)) f.push(`heading top ${heading.top.toFixed(1)} is not the reference ${reference}`)
    if (pageErrors.length) f.push(`page errors: ${pageErrors.join(' | ')}`)
    fails.push(...tagged(label(vp), f))
    results[label(vp)] = { paddingTop: now.paddingTop, paddingBottom: now.paddingBottom, headingTop: +heading.top.toFixed(1), composerTop: +composer.top.toFixed(1), composerBottom: +composer.bottom.toFixed(1), movedDownPx: +moved.toFixed(1), expectedMovePx: +(0.1 * vp.height - 40).toFixed(1), overflow: now.overflow }
    await shot(page, `U01-layout-${label(vp)}`)
    await context.close()
  }
  assert(!fails.length, `AC-003: ${fails.join('; ')}`, results)
  return results
})

defineCase('U02', '@ and / open above the composer card at four wide viewports; scroll, keyboard, choose, Escape, outside click (AC-001, AC-004, AC-005)', async () => {
  const fails = []; const results = {}
  for (const vp of WIDE) {
    const { context, page, pageErrors } = await openNewChat(vp)
    const input = page.locator(sel('chat-message-input'))
    const f = []; const r = {}

    // `@` on the untouched composer (the state of the visual references).
    await typeTrigger(page, '@')
    await page.locator(sel('run-mention-menu')).waitFor()
    await page.locator(sel(`run-mention-option-${state.agents.at(-1).id}`)).waitFor()
    let g = await geometry(page, sel('run-mention-menu'))
    f.push(...tagged('@', aboveFails(g, PREFERRED.target, { anchorTest: 'chat-composer' })))
    if (!g.scroller) f.push('@: the list does not scroll with a long agent list')
    await shot(page, `U02-at-${label(vp)}`)
    r.at = { menuTop: +g.menu.top.toFixed(1), menuBottom: +g.menu.bottom.toFixed(1), cardTop: +g.anchor.top.toFixed(1), maxHeight: g.inlineMaxHeight, limit: heightLimit(g, PREFERRED.target), rows: g.rowCount, scrolls: !!g.scroller }
    const atEnd = await geometry(page, sel('run-mention-menu'), { scrollToEnd: true })
    f.push(...tagged('@ scrolled', [...aboveFails(atEnd, PREFERRED.target), ...lastRowFails(atEnd)]))
    // Keyboard: the highlight follows the arrow keys and Escape closes (unchanged behavior).
    const expanded = await input.getAttribute('aria-expanded')
    const first = await input.getAttribute('aria-activedescendant')
    await page.keyboard.press('ArrowDown')
    const second = await input.getAttribute('aria-activedescendant')
    if (expanded !== 'true' || !first || !second || first === second) f.push(`@: combobox state wrong (expanded ${expanded}, highlight ${first} → ${second})`)
    await page.keyboard.press('Escape')
    if (await page.locator(sel('run-mention-menu')).count()) f.push('@: Escape did not close the menu')
    // Outside click closes.
    await typeTrigger(page, '@')
    await page.locator(sel('run-mention-menu')).waitFor()
    await page.locator(sel('chat-new')).click({ position: { x: 4, y: 4 } })
    if (await page.locator(sel('run-mention-menu')).count()) f.push('@: an outside click did not close the menu')

    // `/` before choosing an agent: the chosen agent decides which skills are offered.
    await typeTrigger(page, '/')
    await page.locator(sel('chat-skill-menu')).waitFor()
    await page.locator(sel(`chat-skill-option-${state.skills.at(-1)}`)).waitFor()
    g = await geometry(page, sel('chat-skill-menu'))
    f.push(...tagged('/', aboveFails(g, PREFERRED.skill, { anchorTest: 'chat-composer' })))
    if (!g.scroller) f.push('/: the list does not scroll with a long skill list')
    await shot(page, `U02-slash-${label(vp)}`)
    const slashEnd = await geometry(page, sel('chat-skill-menu'), { scrollToEnd: true })
    f.push(...tagged('/ scrolled', [...aboveFails(slashEnd, PREFERRED.skill), ...lastRowFails(slashEnd)]))
    r.slash = { menuTop: +g.menu.top.toFixed(1), menuBottom: +g.menu.bottom.toFixed(1), cardTop: +g.anchor.top.toFixed(1), maxHeight: g.inlineMaxHeight, limit: heightLimit(g, PREFERRED.skill), rows: g.rowCount, scrolls: !!g.scroller }
    // The last skill sits at the end of the list; a click must still reach it.
    await page.locator(sel(`chat-skill-option-${state.skills.at(-1)}`)).click()
    await page.locator(sel('chat-skill-menu')).waitFor({ state: 'detached' })
    if (!(await page.locator(sel(`chat-skill-chip-${state.skills.at(-1)}`)).count())) f.push('/: choosing a skill did not add its chip')
    if ((await input.inputValue()) !== '') f.push('/: the trigger text was not removed after choosing')

    // Mention the last agent of the list (`@` only mentions collaborators; the target is the heading switcher).
    await typeTrigger(page, '@')
    await page.locator(sel('run-mention-menu')).waitFor()
    await page.locator(sel(`run-mention-option-${state.agents.at(-1).id}`)).click()
    await page.locator(sel('run-mention-menu')).waitFor({ state: 'detached' })
    const text = await input.inputValue()
    if (!text.includes(`@${state.agents.at(-1).name}`)) f.push(`@: choosing an agent did not insert its mention (${text})`)
    if (pageErrors.length) f.push(`page errors: ${pageErrors.join(' | ')}`)
    fails.push(...tagged(label(vp), f)); results[label(vp)] = r
    await context.close()
  }
  assert(!fails.length, `AC-001/AC-004/AC-005: ${fails.join('; ')}`, results)
  return results
})

/** The Model runtime flyout: bottom-aligned with its runtime row, growing upward, list height rule. */
const flyoutState = (page, runtime) => page.evaluate((runtime) => {
  const box = (e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height } }
  const row = document.querySelector(`[data-test="chat-model-menu"] [data-runtime="${runtime}"]`)
  const sub = row?.parentElement.querySelector('[data-test="chat-model-submenu"]')
  if (!sub) return null
  const list = sub.firstElementChild
  const rows = [...sub.querySelectorAll('[role="menuitemradio"]')]
  list.scrollTop = list.scrollHeight
  return { flyout: box(sub), row: box(row), menu: box(document.querySelector('[data-test="chat-model-menu"]')), styleBottom: sub.style.bottom, styleTop: sub.style.top, listMax: list.style.maxHeight, list: box(list), listScrolls: list.scrollHeight > list.clientHeight + 1, rows: rows.length, lastRow: rows.length ? box(rows.at(-1)) : null, hintTop: document.querySelector('[data-test="chat-new-hint"]')?.getBoundingClientRect().top ?? Infinity, vw: innerWidth, vh: innerHeight }
}, runtime)
const flyoutFails = (f) => {
  if (!f) return ['flyout not open']
  const fails = []
  if (f.styleBottom !== `-${FLYOUT.overhang}px` || f.styleTop) fails.push(`flyout is not bottom-aligned (bottom ${f.styleBottom || '(none)'}, top ${f.styleTop || '(none)'})`)
  if (!near(f.flyout.bottom, f.row.bottom + FLYOUT.overhang, 0.6)) fails.push(`flyout bottom ${f.flyout.bottom.toFixed(1)} is not its row bottom + ${FLYOUT.overhang}px (${(f.row.bottom + FLYOUT.overhang).toFixed(1)})`)
  if (f.flyout.top < FLYOUT.margin - 0.5) fails.push(`flyout top ${f.flyout.top.toFixed(1)} is inside the ${FLYOUT.margin}px margin`)
  const limit = Math.max(0, Math.min(FLYOUT.listMax, Math.floor(f.row.bottom + FLYOUT.overhang - FLYOUT.margin - FLYOUT.chrome)))
  if (f.listMax !== `${limit}px`) fails.push(`flyout list max-height ${f.listMax} is not ${limit}px`)
  if (f.list.height > limit + 0.5) fails.push(`flyout list height ${f.list.height.toFixed(1)} exceeds ${limit}`)
  if (f.flyout.bottom > f.hintTop + 0.5) fails.push('flyout covers the hint line')
  if (f.flyout.left < -0.5 || f.flyout.right > f.vw + 0.5) fails.push('flyout is off screen horizontally')
  if (!(f.flyout.right <= f.menu.left + 0.5 || f.flyout.left >= f.menu.right - 0.5)) fails.push('flyout overlaps the model menu')
  if (f.lastRow && (f.lastRow.bottom > f.list.bottom + 0.5 || f.lastRow.top < f.list.top - 0.5)) fails.push('last model cannot be scrolled into the flyout list')
  return fails
}

defineCase('U03', 'Workspace, Model (flyout, search) and Thinking open above their trigger at four wide viewports (AC-002, AC-004)', async () => {
  const fails = []; const results = {}
  for (const vp of WIDE) {
    const { context, page, pageErrors } = await openNewChat(vp)
    const f = []; const r = {}

    // Workspace: search focused, footer visible, list scrolls, a filtered pick still works.
    await page.locator(sel('chat-workspace-trigger')).click()
    await page.locator(sel('chat-workspace-menu')).waitFor()
    let g = await geometry(page, sel('chat-workspace-menu'))
    f.push(...tagged('workspace', aboveFails(g, PREFERRED.workspace)))
    if ((await activeTest(page)) !== 'chat-workspace-search') f.push('workspace: the search box is not focused on open')
    if (!g.footer) f.push('workspace: no footer row')
    if (!g.scroller) f.push('workspace: the list does not scroll with many workspaces')
    if (g.rowCount !== WORKSPACE_COUNT + 1) f.push(`workspace: ${g.rowCount} rows, expected ${WORKSPACE_COUNT + 1}`)
    await shot(page, `U03-workspace-${label(vp)}`)
    const wsEnd = await geometry(page, sel('chat-workspace-menu'), { scrollToEnd: true })
    f.push(...tagged('workspace scrolled', [...aboveFails(wsEnd, PREFERRED.workspace), ...lastRowFails(wsEnd)]))
    r.workspace = { menuTop: +g.menu.top.toFixed(1), menuBottom: +g.menu.bottom.toFixed(1), anchorTop: +g.anchor.top.toFixed(1), maxHeight: g.inlineMaxHeight, limit: heightLimit(g, PREFERRED.workspace), scrolls: !!g.scroller }
    const target = state.workspaces.at(-1)
    await page.locator(sel('chat-workspace-search')).fill(target.name)
    await page.keyboard.press('Enter')
    await page.locator(sel('chat-workspace-menu')).waitFor({ state: 'detached' })
    const picked = (await page.locator(sel('chat-workspace-trigger')).innerText()).trim()
    if (!picked.includes(target.name)) f.push(`workspace: search + Enter did not select ${target.name} (${picked})`)

    // Model: search focused, runtime rows inside the menu, flyout grows upward.
    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel('chat-model-menu')).waitFor()
    await page.locator(`${sel('chat-model-menu')} [data-runtime]`).first().waitFor()
    g = await geometry(page, sel('chat-model-menu'))
    f.push(...tagged('model', [...aboveFails(g, PREFERRED.model), ...rowsInsideFails(g)]))
    if ((await activeTest(page)) !== 'chat-model-search') f.push('model: the search box is not focused on open')
    r.model = { menuTop: +g.menu.top.toFixed(1), menuBottom: +g.menu.bottom.toFixed(1), anchorTop: +g.anchor.top.toFixed(1), maxHeight: g.inlineMaxHeight, limit: heightLimit(g, PREFERRED.model), runtimes: g.rowCount }
    r.flyouts = {}
    const runtimes = await page.locator(`${sel('chat-model-menu')} [data-runtime]:not([aria-disabled="true"])`).evaluateAll((els) => els.map((e) => e.getAttribute('data-runtime')))
    if (!runtimes.length) f.push('model: no enabled runtime')
    for (const runtime of runtimes) {
      await page.locator(sel(`chat-runtime-${runtime}`)).hover()
      // This runtime's own flyout (the previous one stays for the hover-intent delay), catalog loaded.
      const own = page.locator(`${sel('chat-model-menu')} div:has(> [data-runtime="${runtime}"]) > ${sel('chat-model-submenu')}`)
      await own.waitFor()
      const loaded = await own.locator(sel(`chat-model-list-${runtime}`)).waitFor({ timeout: 90000 }).then(() => true).catch(() => false)
      await delay(200)
      const fly = await flyoutState(page, runtime)
      f.push(...tagged(`flyout ${runtime}`, flyoutFails(fly)))
      r.flyouts[runtime] = fly ? { top: +fly.flyout.top.toFixed(1), bottom: +fly.flyout.bottom.toFixed(1), rowBottom: +fly.row.bottom.toFixed(1), listMax: fly.listMax, rows: fly.rows, listScrolls: fly.listScrolls, side: fly.flyout.right <= fly.menu.left + 0.5 ? 'left' : 'right', left: +fly.flyout.left.toFixed(1), catalogLoaded: loaded } : null
      if (runtime === runtimes[0]) await shot(page, `U03-model-flyout-${label(vp)}`)
    }
    if (!Object.values(r.flyouts).some((x) => x?.listScrolls)) f.push('flyout: no runtime had enough models to scroll its list')
    await page.keyboard.press('Escape')
    await page.locator(sel('chat-model-menu')).waitFor({ state: 'detached' }).catch(() => f.push('model: Escape did not close the menu'))

    // Model search results: the result list scrolls inside the menu.
    await page.locator(sel('chat-model-trigger')).click()
    await page.locator(sel('chat-model-search')).fill('e')
    await page.locator('[data-test^="chat-model-search-option-"]').first().waitFor({ timeout: 60000 })
    await delay(1500)
    g = await geometry(page, sel('chat-model-menu'))
    f.push(...tagged('model search', aboveFails(g, PREFERRED.model)))
    await shot(page, `U03-model-search-${label(vp)}`)
    const searchEnd = await geometry(page, sel('chat-model-menu'), { scrollToEnd: true })
    f.push(...tagged('model search scrolled', searchEnd.scroller ? [...aboveFails(searchEnd, PREFERRED.model), ...lastRowFails(searchEnd)] : rowsInsideFails(searchEnd)))
    r.modelSearch = { results: g.rowCount, menuHeight: +g.menu.height.toFixed(1), limit: heightLimit(g, PREFERRED.model), scrolls: !!g.scroller }
    await page.keyboard.press('Escape')
    if (await page.locator(sel('chat-model-menu')).count()) await page.keyboard.press('Escape')

    // Choosing a model through the flyout still works, and gives the composer a Thinking control.
    const chosen = await pickModel(page, runtimes.includes(CLAUDE) ? CLAUDE : runtimes[0], preferredModel)
    const triggerTitle = await page.locator(sel('chat-model-trigger')).getAttribute('title')
    r.chosenModel = { chosen, triggerTitle }
    const hasThinking = await page.locator(sel('chat-thinking-trigger')).waitFor({ timeout: 60000 }).then(() => true).catch(() => false)
    if (!hasThinking) f.push('thinking: the chosen model shows no Thinking control (a logged-in claude CLI is a prerequisite)')
    else {
      await page.locator(sel('chat-thinking-trigger')).click()
      await page.locator(sel('chat-thinking-menu')).waitFor()
      g = await geometry(page, sel('chat-thinking-menu'))
      f.push(...tagged('thinking', [...aboveFails(g, PREFERRED.thinking), ...(g.scroller ? [] : rowsInsideFails(g))]))
      if (Math.round(g.menu.width) !== 176) f.push(`thinking: width ${g.menu.width} is not w-44`)
      await shot(page, `U03-thinking-${label(vp)}`)
      r.thinking = { menuTop: +g.menu.top.toFixed(1), menuBottom: +g.menu.bottom.toFixed(1), anchorTop: +g.anchor.top.toFixed(1), maxHeight: g.inlineMaxHeight, limit: heightLimit(g, PREFERRED.thinking), height: +g.menu.height.toFixed(1), rows: g.rowCount }
      await page.keyboard.press('Escape')
      await page.locator(sel('chat-thinking-menu')).waitFor({ state: 'detached' }).catch(() => f.push('thinking: Escape did not close the menu'))
      if ((await activeTest(page)) !== 'chat-thinking-trigger') f.push('thinking: Escape did not return focus to the trigger')
    }
    if (pageErrors.length) f.push(`page errors: ${pageErrors.join(' | ')}`)
    fails.push(...tagged(label(vp), f)); results[label(vp)] = r
    await context.close()
  }
  assert(!fails.length, `AC-002/AC-004: ${fails.join('; ')}`, results)
  return results
})

defineCase('U04', 'Very short window, page scrolled: menus still open above and stay on screen; a Thinking menu taller than its limit scrolls (REQ-003)', async () => {
  let outcome = null
  for (const height of [340, 300, 260]) {
    const vp = { width: 1024, height }
    const { context, page } = await openNewChat(vp)
    const f = []; const r = { viewport: label(vp) }
    await ensureThinking(page)
    // Scroll the new-chat area to its end: the composer moves up and leaves less room above it.
    r.scrolledBy = await page.locator(sel('chat-new')).evaluate((root) => { root.scrollTop = root.scrollHeight; return root.scrollTop })
    await delay(200)
    await page.locator(sel('chat-thinking-trigger')).click()
    await page.locator(sel('chat-thinking-menu')).waitFor()
    let g = await geometry(page, sel('chat-thinking-menu'))
    const limit = heightLimit(g, PREFERRED.thinking)
    r.thinking = { limit, maxHeight: g.inlineMaxHeight, height: +g.menu.height.toFixed(1), top: +g.menu.top.toFixed(1), scrolls: !!g.scroller, contentHeight: g.scroller?.scrollHeight ?? null }
    f.push(...tagged('thinking', aboveFails(g, PREFERRED.thinking)))
    const constrained = !!g.scroller
    if (constrained) {
      await shot(page, `U04-thinking-${label(vp)}`)
      const end = await geometry(page, sel('chat-thinking-menu'), { scrollToEnd: true })
      f.push(...tagged('thinking scrolled', [...aboveFails(end, PREFERRED.thinking), ...lastRowFails(end)]))
    }
    await page.keyboard.press('Escape')
    if (constrained) {
      for (const [name, open, menu, preferred, anchorTest] of [
        ['@', () => typeTrigger(page, '@'), 'run-mention-menu', PREFERRED.target, 'chat-composer'],
        ['workspace', () => page.locator(sel('chat-workspace-trigger')).click(), 'chat-workspace-menu', PREFERRED.workspace, undefined],
        ['model', () => page.locator(sel('chat-model-trigger')).click(), 'chat-model-menu', PREFERRED.model, undefined],
      ]) {
        await page.locator(sel('chat-new')).evaluate((root) => { root.scrollTop = root.scrollHeight })
        await open()
        await page.locator(sel(menu)).waitFor()
        await delay(300)
        g = await geometry(page, sel(menu))
        // No minimum height (DEC-003): at this size the limit can be smaller than a menu's fixed rows,
        // and the runtime list never scrolls (it must not clip its flyout), so rows are only recorded.
        f.push(...tagged(name, aboveFails(g, preferred, { anchorTest, rows: name === 'workspace' })))
        r[name] = { limit: heightLimit(g, preferred), maxHeight: g.inlineMaxHeight, height: +g.menu.height.toFixed(1), top: +g.menu.top.toFixed(1), bottom: +g.menu.bottom.toFixed(1), rowsInside: rowsInsideFails(g).length === 0, scrolls: !!g.scroller }
        await shot(page, `U04-${name === '@' ? 'at' : name}-${label(vp)}`)
        await page.keyboard.press('Escape')
        if (name === '@') await page.locator(sel('chat-message-input')).fill('')
      }
    }
    await context.close()
    outcome = { constrained, fails: f, details: r }
    if (constrained) break
  }
  assert(outcome.constrained, 'Could not make the Thinking menu taller than its limit at 1024x340, 1024x300 or 1024x260', outcome.details)
  assert(!outcome.fails.length, `REQ-003: ${outcome.fails.join('; ')}`, outcome.details)
  return outcome.details
})

defineCase('U05', 'Narrow 390x844: @, /, Workspace, Model and Thinking are the unchanged bottom sheet (AC-005)', async () => {
  const { context, page, pageErrors } = await openNewChat(NARROW)
  const f = []; const r = {}
  const layout = await page.evaluate(() => { const inner = document.querySelector('[data-test="chat-new"]').firstElementChild; const s = getComputedStyle(inner); return { paddingTop: parseFloat(s.paddingTop), paddingBottom: parseFloat(s.paddingBottom), headingTop: inner.querySelector('h1').getBoundingClientRect().top } })
  r.layout = layout
  if (!near(layout.paddingTop, 0.14 * NARROW.height, 1) || layout.paddingBottom !== 40) f.push(`padding ${layout.paddingTop}/${layout.paddingBottom} is not 14vh/40px`)
  const thinkingVia = await ensureThinking(page).catch((e) => { f.push(`thinking: no Thinking control (${e.message})`); return null })
  const sheets = [
    ['at', () => typeTrigger(page, '@'), 'run-mention-menu'],
    ['slash', () => typeTrigger(page, '/'), 'chat-skill-menu'],
    ['workspace', () => page.locator(sel('chat-workspace-trigger')).click(), 'chat-workspace-menu'],
    ['model', () => page.locator(sel('chat-model-trigger')).click(), 'chat-model-menu'],
    ...(thinkingVia ? [['thinking', () => page.locator(sel('chat-thinking-trigger')).click(), 'chat-thinking-menu']] : []),
  ]
  for (const [name, open, menu] of sheets) {
    await open()
    await page.locator(sel(menu)).waitFor()
    await delay(300)
    const g = await geometry(page, sel(menu))
    f.push(...tagged(name, sheetFails(g)))
    r[name] = { position: g.position, top: +g.menu.top.toFixed(1), bottom: +g.menu.bottom.toFixed(1), left: g.menu.left, right: g.menu.right, classes: g.classes, backdrop: g.backdrop }
    await shot(page, `U05-${name}-sheet-390x844`)
    await page.keyboard.press('Escape')
    await page.locator(sel(menu)).waitFor({ state: 'detached' }).catch(() => f.push(`${name}: Escape did not close the sheet`))
    if (name === 'at' || name === 'slash') await page.locator(sel('chat-message-input')).fill('')
  }
  if (pageErrors.length) f.push(`page errors: ${pageErrors.join(' | ')}`)
  await context.close()
  assert(!f.length, `AC-005: ${f.join('; ')}`, r)
  return r
})

defineCase('U06', 'Running conversation at 1512x952: / opens the skill menu above the run composer, placement policy unchanged (AC-005)', async () => {
  const { context, page, pageErrors } = await openNewChat(WIDE[0])
  const f = []; const r = {}
  try {
    r.model = await pickModel(page, CLAUDE, preferredModel)
    const input = page.locator(sel('chat-message-input'))
    await input.click(); await input.fill('Reply with the single word OK and nothing else.')
    await page.locator(sel('chat-primary-action')).first().click()
    await page.waitForURL((u) => /\/chat\?id=/.test(u.toString()) && !/id=temp-/.test(u.toString()), { timeout: 180000 })
    r.runId = new URL(page.url()).searchParams.get('id'); state.runs.push(r.runId)
    await page.locator(RUN_VIEW).waitFor({ timeout: 120000 })
    r.runtimeReplied = await page.waitForFunction(() => /\bOK\b/.test(document.querySelector('[data-testid="agent-workspace-surface"]')?.innerText ?? ''), null, { timeout: 180000 }).then(() => true).catch(() => false)
    const runInput = page.locator(`${RUN_VIEW} textarea`).first()
    await typeTrigger(page, '/', runInput)
    const menu = `${RUN_VIEW} ${sel('chat-skill-menu')}`
    await page.locator(menu).waitFor()
    await page.locator(`${menu} ${sel(`chat-skill-option-${state.skills[0]}`)}`).waitFor()
    await delay(300)
    const g = await geometry(page, menu)
    const textarea = await runInput.evaluate((e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom } })
    const listed = await page.locator(`${menu} [data-test^="chat-skill-option-"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-skill-option-', '')))
    r.menu = { position: g.position, classes: g.classes, inlineMaxHeight: g.inlineMaxHeight, top: +g.menu.top.toFixed(1), bottom: +g.menu.bottom.toFixed(1), anchorTop: +g.anchor.top.toFixed(1), textareaTop: +textarea.top.toFixed(1), rows: g.rowCount, vh: g.vh }
    if (g.position !== 'absolute') f.push(`menu is ${g.position}`)
    if (!/\bbottom-full\b/.test(g.classes) || /\btop-full\b/.test(g.classes)) f.push(`menu is not above the run composer: ${g.classes}`)
    if (!near(g.anchor.top + g.anchor.borderTop - g.menu.bottom, GAP, 0.6)) f.push('menu is not 6px above the run message box')
    if (g.menu.bottom > textarea.top + 0.5) f.push('menu covers the run message box')
    if (g.inlineMaxHeight) f.push(`the run menu got an inline max-height (${g.inlineMaxHeight}); its automatic placement must be unchanged`)
    if (/\bflex\b/.test(g.classes)) f.push(`the run menu wrapper classes changed: ${g.classes}`)
    if (g.menu.top < -0.5 || g.menu.bottom > g.vh + 0.5 || g.menu.left < -0.5 || g.menu.right > g.vw + 0.5) f.push('menu is not fully on screen')
    if (!state.skills.every((name) => listed.includes(name))) f.push(`the run skill menu does not list every installed skill: ${listed.join(', ')}`)
    await shot(page, 'U06-run-slash-menu-1512x952')
    // Choosing with the keyboard still adds the skill to the message.
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    await page.locator(menu).waitFor({ state: 'detached' }).catch(() => f.push('Enter did not close the run skill menu'))
    r.chips = await page.locator(`${RUN_VIEW} [data-test^="chat-skill-chip-"]`).evaluateAll((els) => els.map((e) => e.getAttribute('data-test').replace('chat-skill-chip-', '')))
    if (r.chips.length !== 1) f.push(`choosing a skill in the run view gave chips ${JSON.stringify(r.chips)}`)
    if (pageErrors.length) f.push(`page errors: ${pageErrors.join(' | ')}`)
  } finally {
    if (r.runId) await terminate(r.runId).catch(() => {})
    await context.close()
  }
  assert(!f.length, `AC-005 (running conversation): ${f.join('; ')}`, r)
  return r
})

// ---------------------------------------------------------------------------------------------
let exitCode = 0
try {
  assert(chrome && existsSync(chrome), 'Google Chrome not found (use --browser-executable)')
  assert(existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts build')
  await fs.mkdir(outDir, { recursive: true })
  ownedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'chat-composer-menus-open-upward-'))
  dataRoot = path.join(ownedRoot, 'server-data')
  await fs.mkdir(path.join(dataRoot, 'db'), { recursive: true })
  const dbUrl = pathToFileURL(path.join(dataRoot, 'db', 'probe.db')).href
  const backendPort = await freePort(); const frontendPort = await freePort()
  backendUrl = `http://127.0.0.1:${backendPort}`; frontUrl = `http://127.0.0.1:${frontendPort}`
  Object.assign(evidence, { ownedRoot, backendUrl, frontUrl })
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${dbUrl}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`)
  // Fixture: enough installed skills for the `/` list to scroll (the default agent uses every installed skill).
  for (let i = 1; i <= SKILL_COUNT; i += 1) {
    const name = `probe-skill-${String(i).padStart(2, '0')}`
    await fs.mkdir(path.join(dataRoot, 'skills', name), { recursive: true })
    await fs.writeFile(path.join(dataRoot, 'skills', name, 'SKILL.md'), `---\nname: ${name}\ndescription: Probe fixture skill ${i}\n---\n\n# ${name}\n\nProbe fixture.\n`)
    state.skills.push(name)
  }
  await new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env: { ...baseEnv(), DATABASE_URL: dbUrl, DB_TYPE: 'sqlite', APP_ENV: 'development' }, stdio: 'ignore' })
    child.once('exit', (code) => (code === 0 ? resolve() : reject(new Error(`prisma migrate deploy exited ${code}`))))
  })
  const env = { ...baseEnv(), APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: dbUrl, AUTOBYTEUS_SERVER_HOST: backendUrl, DISABLE_HTTP_REQUEST_LOGS: 'true' }
  const backend = spawnOwned('backend', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataRoot], serverDir, env)
  await waitFor('backend health', async () => { assert(backend.exitCode === null, 'backend exited'); return (await fetch(`${backendUrl}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok }, 120000, 500)
  // Fixtures: enough agents and workspaces for the `@` and Workspace lists to scroll.
  for (let i = 1; i <= AGENT_COUNT; i += 1) {
    const name = `Probe agent ${i}`
    const { createAgentDefinition } = await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id name}}', { input: { name, role: 'assistant', description: `Probe fixture agent ${i}`, instructions: 'Probe fixture.', toolNames: [] } })
    state.agents.push(createAgentDefinition)
  }
  for (let i = 1; i <= WORKSPACE_COUNT; i += 1) {
    const name = `probe-ws-${String(i).padStart(2, '0')}`
    const dir = path.join(ownedRoot, 'workspaces', name)
    await fs.mkdir(dir, { recursive: true })
    const { createWorkspace } = await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: dir } })
    state.workspaces.push({ name, workspaceId: createWorkspace.workspaceId })
  }
  spawnOwned('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...baseEnv(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl })
  await waitFor('Nuxt dev', async () => (await fetch(`${frontUrl}/chat`, { signal: AbortSignal.timeout(5000) })).ok, 240000, 1000)
  browser = await chromium.launch({ headless: true, executablePath: chrome, args: ['--no-sandbox'] })
  for (const c of cases) {
    if (onlyCases && !onlyCases.includes(c.id)) continue
    const started = Date.now()
    try {
      const details = await c.fn()
      evidence.cases[c.id] = { title: c.title, result: 'Pass', ms: Date.now() - started, details }
    } catch (error) {
      exitCode = 1
      evidence.cases[c.id] = { title: c.title, result: 'Fail', ms: Date.now() - started, error: error.message, details: error.details ?? null }
      for (const context of browser.contexts()) await context.close().catch(() => {})
    }
    console.log(`${c.id} ${evidence.cases[c.id].result} ${c.title}${evidence.cases[c.id].error ? ` — ${evidence.cases[c.id].error}` : ''}`)
    await fs.writeFile(path.join(outDir, 'chat-composer-menus-open-upward-evidence.json'), JSON.stringify(evidence, null, 2))
  }
} catch (error) {
  exitCode = 1
  evidence.fatal = String(error?.stack ?? error)
  console.error(`[chat-composer-menus-open-upward] ${error.message}`)
} finally {
  for (const runId of state.runs) await terminate(runId).catch(() => {})
  await browser?.close().catch(() => {})
  for (const child of owned.reverse()) evidence.cleanup.push({ pid: child.pid, stop: await stopOwned(child) })
  if (ownedRoot && !keep) { await fs.rm(ownedRoot, { recursive: true, force: true }); evidence.cleanup.push({ removed: ownedRoot }) }
  evidence.completedAt = new Date().toISOString()
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(path.join(outDir, 'chat-composer-menus-open-upward-evidence.json'), JSON.stringify(evidence, null, 2))
  process.exitCode = exitCode
}
