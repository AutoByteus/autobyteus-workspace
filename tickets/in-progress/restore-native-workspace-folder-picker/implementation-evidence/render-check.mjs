// Implementation-only shared-control preview interaction. Not an API/E2E/native sign-off.
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
const root = process.cwd()
const output = path.join(root, 'tickets/in-progress/restore-native-workspace-folder-picker/implementation-evidence')
const require = createRequire(path.join(root, 'autobyteus-web/package.json'))
const { chromium } = require('playwright-core')
const port = (await fs.readFile(path.join(output, 'preview-port.txt'), 'utf8')).trim()
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1512, height: 862 } })
const record = { boundary: 'actual shared component in temporary Nuxt page; synthetic host reply/data; no native chooser or full-caller journey', states: [], errors: [] }
page.on('pageerror', (error) => record.errors.push(error.message))
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const browse = page.locator('[data-test="chat-workspace-browse"]')
const field = page.locator('#chat-workspace-path')
const trigger = page.locator('[data-test="chat-workspace-trigger"]')
const form = page.locator('[data-test="chat-workspace-folder-form"]')
const open = async (query = '') => {
  await page.goto(`http://127.0.0.1:${port}/implementation-workspace-preview${query}`)
  await trigger.waitFor()
  await trigger.click()
  await page.locator('[data-test="chat-workspace-open-folder"]').click()
}
const reply = async (result) => { await page.evaluate((value) => window.__folderPreviewReply(value), result); await page.waitForFunction(() => !document.querySelector('[data-test="chat-workspace-browse"]')?.disabled) }
const focused = (locator) => locator.evaluate((el) => el === document.activeElement)
const capture = async (name) => {
  const measurements = await page.locator('[data-test="chat-workspace-menu"]').evaluate((menu) => {
    const input = menu.querySelector('#chat-workspace-path'); const button = menu.querySelector('[data-test="chat-workspace-browse"]')
    const style = getComputedStyle(input); const rect = (el) => el ? Object.fromEntries(['x','y','width','height','right'].map((key) => [key, el.getBoundingClientRect()[key]])) : null
    return { menu: rect(menu), input: rect(input), browse: rect(button), fieldStyle: { font: style.font, padding: style.padding, borderRadius: style.borderRadius, color: style.color }, overflow: document.documentElement.scrollWidth > window.innerWidth }
  })
  assert(!measurements.overflow, `${name}: horizontal overflow`)
  await page.screenshot({ path: path.join(output, `${name}.png`) })
  record.states.push({ name, measurements })
}
try {
  // No process is listening at the fixture backend URL. Block every application request so the
  // dev preview cannot accidentally use the user's app; native replies are fixture-local only.
  await page.route('**/graphql', (route) => route.fulfill({ json: { data: {} } }))
  await page.route('**/rest/**', (route) => route.fulfill({ json: {} }))
  await open()
  assert(await focused(field), 'open focuses field')
  await page.keyboard.press('Tab')
  assert(await focused(browse), 'Tab reaches Browse')
  await page.keyboard.press('Enter')
  await page.waitForFunction(() => typeof window.__folderPreviewReply === 'function')
  assert(await browse.isDisabled(), 'pending disabled')
  assert(await form.locator('button[type="submit"]').isDisabled(), 'pending apply disabled')
  await capture('render-01-pending-desktop')
  await reply({ canceled: false, path: '/owned/client-portal' })
  assert(await focused(field), 'selection focuses input')
  assert(await field.inputValue() === '/owned/client-portal', 'selected path')
  assert(await trigger.getAttribute('title') === '/owned/temp', 'not applied')
  await capture('render-02-selected-desktop')
  await browse.click()
  await reply({ canceled: true, path: null })
  assert(await focused(browse), 'cancel focuses Browse')
  assert(await field.inputValue() === '/owned/client-portal', 'cancel keeps input')
  await browse.click()
  await reply({ canceled: true, path: null, error: 'fixture failure' })
  assert(await focused(browse), 'error focuses Browse')
  assert(await page.getByRole('alert').isVisible(), 'inline alert')
  await capture('render-03-error-desktop')
  await field.fill('relative')
  assert(await page.getByRole('alert').count() === 0, 'typing clears picker error')
  await field.press('Enter')
  assert(await field.getAttribute('aria-invalid') === 'true', 'path validation')
  await capture('render-04-invalid-desktop')
  await field.fill('/owned/new-path')
  await form.locator('button[type="submit"]').click()
  assert(await trigger.getAttribute('title') === '/owned/new-path', 'explicit apply')
  await trigger.click(); await page.locator('[data-test="chat-workspace-open-folder"]').click()
  await form.getByRole('button', { name: 'Cancel', exact: true }).click()
  assert(await focused(trigger), 'Cancel focuses trigger')
  await page.locator('[data-test="chat-workspace-open-folder"]').click()
  await field.press('Escape')
  assert(await form.count() === 0, 'Escape closes menu')
  await open('?context=remote')
  assert(await browse.count() === 0, 'remote no Browse')
  await capture('render-05-remote-desktop')
  await page.setViewportSize({ width: 390, height: 844 })
  await open()
  await field.fill('/owned/a-very-long-directory-name/nested/path/without/any/wrapping')
  await capture('render-06-local-narrow')
  await open('?context=browser')
  assert(await browse.count() === 0, 'browser no Browse')
  await capture('render-07-browser-narrow')
  await open('?locale=zh-CN')
  assert(await browse.innerText() === '浏览…', 'Chinese Browse')
  await browse.click(); await reply({ canceled: true, path: null, error: '' })
  await capture('render-08-zh-error-narrow')
  await page.setViewportSize({ width: 1512, height: 862 })
  await open('?locale=zh-CN')
  await capture('render-09-zh-desktop')
  record.result = 'implementation render interactions completed'
} catch (error) {
  record.result = 'failed'; record.failure = error.stack
  await page.screenshot({ path: path.join(output, 'render-failure.png') })
  process.exitCode = 1
} finally {
  await browser.close()
  record.browserClosed = true
  await fs.writeFile(path.join(output, 'render-check.json'), JSON.stringify(record, null, 2))
  console.log(JSON.stringify(record))
}
