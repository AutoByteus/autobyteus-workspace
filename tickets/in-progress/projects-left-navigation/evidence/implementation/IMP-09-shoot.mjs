// IMP-09 rendered check driver (projects-left-navigation). Usage: node shoot.mjs <outDir>
import { chromium } from '/Users/normy/autobyteus_org/autobyteus-worktrees/projects-left-navigation/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs'
const out = process.argv[2]
const base = 'http://127.0.0.1:3000'
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const log = []
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${name}.png` }); log.push(`shot ${name}`) }
const note = (k, v) => log.push(`${k}: ${JSON.stringify(v)}`)

await page.goto(`${base}/workspace`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-test="run-section-switch"]', { timeout: 60000 })
await page.waitForTimeout(1500)
note('switch tabs', await page.$$eval('[data-test="run-section-switch"] [role="tab"]', (els) => els.map((e) => [e.textContent.trim(), e.getAttribute('aria-selected')])))
await shot('IMP-09-01-workspaces-mode')

await page.click('[data-test="run-section-tab-projects"]')
await page.waitForSelector('[data-test="project-row"]', { timeout: 30000 })
note('project rows', await page.$$eval('[data-test="project-row"]', (els) => els.map((e) => e.textContent.trim())))
note('header + label', await page.getAttribute('[data-test="run-section-new-project"]', 'aria-label'))
await shot('IMP-09-02-projects-mode-collapsed')

// Name selects (board follows) and opens; the chevron of the other only opens.
await page.click('[data-test="project-row"][data-project-id] >> nth=0 >> [data-test="project-row-select"]')
await page.waitForTimeout(500)
note('first project expanded', await page.getAttribute('[data-test="project-row"] >> nth=0 >> [data-test="project-row-disclosure"]', 'aria-expanded'))
note('first project aria-current', await page.getAttribute('[data-test="project-row"] >> nth=0 >> [data-test="project-row-select"]', 'aria-current'))
await page.click('[data-test="project-row"] >> nth=1 >> [data-test="project-row-disclosure"]')
await page.waitForTimeout(300)
note('no-runs hint', await page.textContent('[data-test="project-no-runs"]'))
// Expand the agent group under the first Project.
await page.click('[data-test="workspace-agent-row"] >> nth=0')
await page.waitForTimeout(300)
note('runs under first project', await page.$$eval('[data-test="workspace-agent-run-row"]', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' '))))
await shot('IMP-09-03-projects-mode-expanded')

// Hover shows "+"; keyboard focus ring on a Project name.
await page.hover('[data-test="project-row"] >> nth=0')
await shot('IMP-09-04-project-row-hover')
await page.focus('[data-test="project-row"] >> nth=1 >> [data-test="project-row-select"]')
await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab')
await shot('IMP-09-05-project-row-keyboard-focus')

// Archive all on the Project's agent group: the confirmation names the group and count.
await page.hover('[data-test="workspace-agent-row"] >> nth=0')
await page.click('[data-test^="workspace-agent-group-archive-"] >> nth=0')
await page.waitForTimeout(400)
note('archive dialog', (await page.textContent('body')).match(/Archive all runs\?[^]{0,120}/)?.[0]?.replace(/\s+/g, ' '))
await shot('IMP-09-06-group-archive-all-in-project')
await page.keyboard.press('Escape')
const cancel = page.locator('button', { hasText: 'Cancel' }).last(); if (await cancel.isVisible()) await cancel.click()

// "+" on the first Project: New chat under it.
await page.hover('[data-test="project-row"] >> nth=0')
await page.click('[data-test="project-row"] >> nth=0 >> [data-test="project-run-add"]')
await page.waitForURL('**/chat**', { timeout: 30000 })
await page.waitForSelector('[data-test="chat-workspace-trigger"]')
await page.waitForTimeout(800)
note('chip after +', (await page.textContent('[data-test="chat-workspace-trigger"]')).trim())
note('chip aria', await page.getAttribute('[data-test="chat-workspace-trigger"]', 'aria-label'))
await shot('IMP-09-07-start-under-project')

await page.click('[data-test="chat-workspace-trigger"]')
await page.waitForSelector('[data-test="chat-project-options"]')
note('project options', await page.$$eval('[data-test="chat-project-options"] [role="option"]', (els) => els.map((e) => [e.textContent.trim().replace(/\s+/g, ' '), e.getAttribute('aria-selected')])))
await shot('IMP-09-08-chip-menu-projects-tab')
await page.click('[data-test="chat-target-tab-workspaces"]')
await page.waitForTimeout(300)
note('project folder badge', await page.$$eval('[data-test="chat-workspace-project-badge"]', (els) => els.map((e) => e.closest('[role="option"]').textContent.trim().replace(/\s+/g, ' '))))
await shot('IMP-09-09-chip-menu-workspaces-tab')
await page.click('[data-test="chat-target-tab-projects"]')
await page.click('[data-test="chat-project-options"] [role="option"] >> nth=2')
await page.waitForTimeout(400)
note('chip after choosing second project', (await page.textContent('[data-test="chat-workspace-trigger"]')).trim())
await shot('IMP-09-10-start-project-without-folder')
// Pick a folder, then choose the first Project again: the folder is kept.
await page.click('[data-test="chat-workspace-trigger"]')
await page.click('[data-test="chat-target-tab-workspaces"]')
await page.click('[data-test="chat-workspace-option-temp"]')
await page.click('[data-test="chat-workspace-trigger"]')
await page.click('[data-test="chat-target-tab-projects"]')
await page.click('[data-test="chat-project-options"] [role="option"] >> nth=1')
await page.waitForTimeout(400)
note('chip after folder picked then project', (await page.textContent('[data-test="chat-workspace-trigger"]')).trim())
await shot('IMP-09-11-start-project-with-folder-overridden')
// Agent picker under a Project lists Agents and Teams only.
await page.click('[data-test="chat-new-target"] button >> nth=0')
await page.waitForTimeout(400)
note('target search placeholder', await page.getAttribute('[role="combobox"]', 'placeholder'))
await shot('IMP-09-12-project-agent-picker')
await page.keyboard.press('Escape')

// Mode remembered after reload; the strip label in Projects mode.
await page.goto(`${base}/workspace`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-test="run-section-switch"]')
await page.waitForTimeout(1000)
note('mode after reload', await page.getAttribute('[data-test="run-section-tab-projects"]', 'aria-selected'))
note('strip run-tree label', await page.getAttribute('[data-nav-key="workspaces"]', 'aria-label').catch(() => null))

// Narrow window: strip and drawer.
await page.setViewportSize({ width: 600, height: 800 })
await page.waitForTimeout(800)
await shot('IMP-09-13-narrow-strip')
const strip = page.locator('[data-nav-key="workspaces"]').first()
if (await strip.isVisible()) { await strip.click(); await page.waitForTimeout(800) }
note('narrow drawer switch visible', await page.isVisible('[data-test="run-section-switch"]'))
await shot('IMP-09-14-narrow-drawer-projects')

note('page errors', errors)
console.log(log.join('\n'))
await browser.close()
