// Owned desktop adapter for the delegated settings probe. No installed app, credentials or user data.
import { spawn, execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

export function desktopAdapter({ webDir, outDir, chromium, assert, waitFor }) {
  let instance
  const cli = (args) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(webDir, 'scripts/isolated-app/cli.mjs'), ...args], { cwd: webDir, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout.on('data', b => { stdout += b }); child.stderr.on('data', b => { stderr += b })
    child.once('error', reject)
    child.once('close', async code => {
      await fs.writeFile(path.join(outDir, `desktop-${args[0]}.log`), stderr)
      await fs.writeFile(path.join(outDir, `desktop-${args[0]}.json`), stdout)
      try { const result = JSON.parse(stdout); assert(code === 0 && result.ok, stdout); resolve(result.result) } catch (e) { reject(e) }
    })
  })
  return {
    async start(backendUrl, skipBuild) {
      const git = (...args) => execFileSync('git', args, { cwd: webDir, encoding: 'utf8' }).trim()
      instance = await cli(['start', skipBuild ? '--from-worktree' : '--build'])
      const appRoot = path.resolve(instance.executablePath, '../../..')
      const asar = path.join(appRoot, 'Contents/Resources/app.asar')
      const identity = { head: git('rev-parse', 'HEAD'), status: git('status', '--short'), instance, skipBuild,
        asar, asarSha256: createHash('sha256').update(await fs.readFile(asar)).digest('hex') }
      await fs.writeFile(path.join(outDir, 'desktop-identity.json'), JSON.stringify(identity, null, 2))
      const browser = await chromium.connectOverCDP(instance.controlEndpoint)
      const context = browser.contexts()[0]
      const main = await waitFor('owned desktop renderer', () => context.pages().find(p => p.url().includes('/renderer/index.html')))
      await main.goto(`${main.url().split('#')[0]}#/nodes`)
      await main.getByTestId('node-name-input').fill('Settings refresh owned backend')
      await main.getByTestId('node-url-input').fill(backendUrl)
      await main.getByTestId('add-node-button').click()
      const input = main.locator('[data-testid^="node-name-"]').filter({ visible: true })
      const remote = await waitFor('registered owned remote node', async () => {
        for (const node of await input.all()) if (await node.inputValue() === 'Settings refresh owned backend') return node
        return null
      })
      const id = (await remote.getAttribute('data-testid')).slice('node-name-'.length)
      const opened = context.waitForEvent('page')
      await main.getByTestId(`focus-node-${id}`).click()
      const page = await opened
      await page.waitForLoadState('domcontentloaded')
      await page.setViewportSize({ width: 1512, height: 952 })
      await page.locator('#__nuxt').waitFor()
      return { browser, context, page, frontUrl: `${page.url().split('#')[0]}#`, identity }
    },
    async stop() {
      if (!instance) return { notStarted: true }
      await fs.copyFile(instance.logPath, path.join(outDir, 'desktop-instance.log')).catch(() => {})
      const result = await cli(['stop', instance.instanceId])
      assert(result.controlPortReleased && result.serverPortReleased && result.dataRootRemoved, 'Desktop cleanup incomplete', result)
      return result
    },
  }
}
