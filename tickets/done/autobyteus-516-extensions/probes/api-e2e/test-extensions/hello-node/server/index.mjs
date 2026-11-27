// API/E2E test extension (autobyteus-516): reports which computer and folder it runs in.
import os from 'node:os'
import fs from 'node:fs/promises'
import path from 'node:path'
export default {
  async install(ctx) {
    ctx.progress({ message: 'Writing a marker file', percent: null })
    await fs.writeFile(path.join(ctx.dir, 'installed-on.txt'), `${os.hostname()} ${ctx.platform}\n`)
    ctx.log(`install: marker written on ${os.hostname()} (${ctx.platform})`)
  },
  async status() { return { ready: true, message: 'Ready.' } },
  async stop() {},
  actions: {
    async whereAmI(ctx) { return { hostname: os.hostname(), platform: ctx.platform, dir: ctx.dir } },
  },
}
