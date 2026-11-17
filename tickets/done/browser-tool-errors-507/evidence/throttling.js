// Probe: webPreferences.backgroundThrottling=false on the tab's view. Does the first capture
// (no retry) succeed when the tab is not shown: detached fresh, detached after navigation,
// attached to a minimized window, attached to a hidden window? Control: default (true).
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(`<h1>${req.url}</h1>`) })
const once = async (v) => Promise.race([
  v.webContents.capturePage().then((i) => (i.isEmpty() ? 'empty' : 'ok'), (e) => e.message),
  sleep(2000).then(() => 'HANG>2s')])
app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const tally = {}
  const add = (k, r) => { console.log('STEP', k, r); tally[k] = tally[k] || {}; tally[k][r] = (tally[k][r] || 0) + 1 }
  const ARGS = process.argv.slice(-2)
  for (const throttling of [ARGS[0] === 'true']) {
    for (const sit of [ARGS[1]]) {
      for (let i = 0; i < 3; i++) {
        const win = sit.startsWith('detached') ? null : new BrowserWindow({ width: 1300, height: 950, show: true })
        if (win) await win.loadURL('about:blank').catch(() => {})
        const v = new WebContentsView({ webPreferences: { sandbox: true, backgroundThrottling: throttling } })
        v.setBounds({ x: 0, y: 0, width: 1280, height: 900 })
        if (win) win.contentView.addChildView(v)
        await Promise.race([v.webContents.loadURL(`${base}/${sit}-1`).catch(() => {}), sleep(5000)])
        if (sit !== 'detached-fresh') {
          if (win) { await once(v); if (sit.startsWith('minimized')) win.minimize(); else win.hide(); await sleep(1500) }
          else { const b = v.getBounds(); v.setBounds({ ...b, width: b.width + 1 }); v.setBounds(b); await sleep(200); await once(v) }
          await Promise.race([v.webContents.loadURL(`${base}/${sit}-2`).catch(() => {}), sleep(5000)])
        }
        await sleep(300)
        add(`throttling=${throttling} ${sit}: first capture`, await once(v))
        add(`throttling=${throttling} ${sit}: second capture`, await once(v))
        // left open: destroying a view with a pending capture crashes Electron (SIGTRAP)
      }
    }
  }
  for (const [k, v] of Object.entries(tally)) console.log('RESULT', k.padEnd(58), JSON.stringify(v))
  app.exit(0)
})
