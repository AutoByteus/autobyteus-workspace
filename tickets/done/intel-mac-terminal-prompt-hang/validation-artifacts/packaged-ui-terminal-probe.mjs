#!/usr/bin/env node
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { mkdtemp, mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

const repoRoot = process.cwd()
const requireFromWeb = createRequire(path.join(repoRoot, 'autobyteus-web', 'package.json'))
const { _electron } = requireFromWeb('playwright-core')

const sourceApp = process.argv[2] ? path.resolve(process.argv[2]) : ''
const artifactsDir = process.argv[3] ? path.resolve(process.argv[3]) : ''
if (!sourceApp || !artifactsDir) {
  console.error('Usage: node packaged-ui-terminal-probe.mjs <AutoByteus.app> <artifacts-dir>')
  process.exit(2)
}

const logPath = path.join(artifactsDir, 'packaged-ui-terminal-summary-round2.json')
const screenshotPath = path.join(artifactsDir, 'packaged-ui-terminal-round2.png')
const sourcePort = '29695'
const targetPort = '29696'

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }

async function assertPortFree(port) {
  await new Promise((resolve, reject) => {
    const srv = createServer()
    srv.once('error', reject)
    srv.listen(Number(port), '127.0.0.1', () => srv.close(resolve))
  })
}

async function makePortPatchedAppCopy() {
  await assertPortFree(targetPort)
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-packaged-ui-probe-'))
  const appCopy = path.join(tmpRoot, 'AutoByteus.app')
  await cp(sourceApp, appCopy, { recursive: true, dereference: false, preserveTimestamps: true })
  const asarPath = path.join(appCopy, 'Contents', 'Resources', 'app.asar')
  const buf = await readFile(asarPath)
  const needle = Buffer.from(sourcePort)
  const replacement = Buffer.from(targetPort)
  let count = 0
  for (let offset = buf.indexOf(needle); offset !== -1; offset = buf.indexOf(needle, offset + replacement.length)) {
    replacement.copy(buf, offset)
    count++
  }
  if (count === 0) throw new Error(`Did not find port ${sourcePort} in app.asar`)
  await writeFile(asarPath, buf)
  const asarHash = createHash('sha256').update(buf).digest('hex')
  const plistPath = path.join(appCopy, 'Contents', 'Info.plist')
  await new Promise((resolve, reject) => {
    execFile('/usr/libexec/PlistBuddy', ['-c', `Set :ElectronAsarIntegrity:Resources/app.asar:hash ${asarHash}`, plistPath], (error) => {
      if (error) reject(error)
      else resolve(undefined)
    })
  })
  return { tmpRoot, appCopy, patchCount: count, port: Number(targetPort), asarHash }
}

async function collectTerminalText(page) {
  return await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('.xterm-rows div')).map((el) => el.textContent || '').join('\n')
    const helpers = Array.from(document.querySelectorAll('.terminal-container, [data-test="workspace-right-panel"], body')).map((el) => el.textContent || '').join('\n')
    return { rows, bodyText: document.body.innerText || '', helpers }
  })
}

async function tryNavigateWorkspace(page) {
  const attempts = []
  async function record(name, fn) {
    try {
      const result = await fn()
      attempts.push({ name, ok: true, result })
      await delay(1500)
      const exists = await page.locator('.terminal-container').count().catch(() => 0)
      if (exists > 0) return true
    } catch (error) {
      attempts.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) })
    }
    return false
  }

  if (await page.locator('.terminal-container').count().catch(() => 0)) return attempts

  await record('history-pushstate-popstate-/workspace', async () => page.evaluate(() => {
    window.history.pushState({}, '', '/workspace')
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))
    return window.location.href
  }))
  if (await page.locator('.terminal-container').count().catch(() => 0)) return attempts

  await record('hash-/workspace', async () => page.evaluate(() => {
    window.location.hash = '/workspace'
    return window.location.href
  }))
  if (await page.locator('.terminal-container').count().catch(() => 0)) return attempts

  await record('click-any-workspace-text', async () => {
    const loc = page.getByText(/workspace|activity|terminal/i).first()
    await loc.click({ timeout: 3000 })
    return 'clicked'
  })
  return attempts
}

async function main() {
  await mkdir(artifactsDir, { recursive: true })
  const summary = {
    startedAt: new Date().toISOString(),
    sourceApp,
    artifactsDir,
    sourcePort,
    targetPort,
    result: 'UNKNOWN',
  }
  let appCopyInfo = null
  let electronApp = null
  try {
    appCopyInfo = await makePortPatchedAppCopy()
    summary.appCopy = appCopyInfo
    const executablePath = path.join(appCopyInfo.appCopy, 'Contents', 'MacOS', 'AutoByteus')
    if (!existsSync(executablePath)) throw new Error(`Executable missing: ${executablePath}`)
    const homeDir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-packaged-ui-home-'))
    summary.homeDir = homeDir
    electronApp = await _electron.launch({
      executablePath,
      env: {
        ...process.env,
        HOME: homeDir,
        AUTOBYTEUS_UI_PROBE: '1',
      },
      timeout: 120_000,
    })
    summary.processPid = electronApp.process()?.pid ?? null
    const page = await electronApp.firstWindow({ timeout: 90_000 })
    page.setDefaultTimeout(30_000)
    const consoleMessages = []
    const pageErrors = []
    page.on('console', msg => consoleMessages.push({ type: msg.type(), text: msg.text().slice(0, 1000) }))
    page.on('pageerror', err => pageErrors.push(err.message))
    summary.initialUrl = page.url()
    summary.title = await page.title().catch(() => '')

    // Give the app/server a chance to initialize, then move to workspace if not already there.
    await delay(5000)
    summary.navigationAttempts = await tryNavigateWorkspace(page)

    await page.locator('.terminal-container').waitFor({ state: 'visible', timeout: 60_000 })
    await page.locator('.xterm').waitFor({ state: 'visible', timeout: 60_000 }).catch(() => undefined)
    await delay(8000)

    let terminalText = await collectTerminalText(page)
    const marker = `UI_PROBE_${Date.now()}`
    summary.marker = marker
    const terminal = page.locator('.terminal-container').first()
    await terminal.click({ timeout: 10_000 }).catch(() => page.keyboard.press('Tab'))
    await page.keyboard.type(`printf '${marker}:%s' "$PWD"`)
    await page.keyboard.press('Enter')
    const deadline = Date.now() + 20_000
    while (Date.now() < deadline) {
      terminalText = await collectTerminalText(page)
      if (`${terminalText.rows}\n${terminalText.bodyText}`.includes(marker)) break
      await delay(500)
    }

    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined)
    summary.finalUrl = page.url()
    summary.terminalText = {
      rows: terminalText.rows.slice(0, 4000),
      bodyText: terminalText.bodyText.slice(0, 4000),
      helpers: terminalText.helpers.slice(0, 4000),
    }
    summary.consoleMessages = consoleMessages.slice(-100)
    summary.pageErrors = pageErrors
    summary.screenshotPath = screenshotPath
    summary.terminalContainerVisible = await page.locator('.terminal-container').isVisible().catch(() => false)
    summary.markerObserved = `${terminalText.rows}\n${terminalText.bodyText}`.includes(marker)
    summary.promptOrInitialOutputObserved = /Terminal initialized|[$%#>]\s*$|The default interactive shell|autobyteus/i.test(`${terminalText.rows}\n${terminalText.bodyText}`)
    if (!summary.terminalContainerVisible) throw new Error('Terminal container was not visible')
    if (!summary.promptOrInitialOutputObserved) throw new Error('No Terminal initialized text, shell prompt, or initial output observed')
    if (!summary.markerObserved) throw new Error('Terminal marker command output was not observed in UI')
    summary.result = 'PASS'
    await rm(homeDir, { recursive: true, force: true }).catch(() => undefined)
    summary.homeDirRemovedAfterPass = true
  } catch (error) {
    summary.result = 'FAIL'
    summary.error = error instanceof Error ? error.stack ?? error.message : String(error)
    throw error
  } finally {
    if (electronApp) {
      await electronApp.close().catch(() => undefined)
    }
    if (appCopyInfo?.tmpRoot) {
      await rm(appCopyInfo.tmpRoot, { recursive: true, force: true }).catch(() => undefined)
      summary.appCopyRemoved = true
    }
    summary.completedAt = new Date().toISOString()
    await writeFile(logPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
  }
  console.log(JSON.stringify(summary, null, 2))
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))
  process.exit(1)
})
