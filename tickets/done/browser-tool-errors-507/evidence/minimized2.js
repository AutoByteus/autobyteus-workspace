// Probe: tab attached to a minimized (or hidden) window. Options:
// A stayHidden/stayAwake + nudge retries; B detach from the window, nudge + retries, re-attach.
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(`<h1>${req.url}</h1>`) })
const once = async (v, opts) => Promise.race([
  (opts ? v.webContents.capturePage(undefined, opts) : v.webContents.capturePage())
    .then((i) => (i.isEmpty() ? 'empty' : 'ok'), (e) => e.message),
  sleep(2000).then(() => 'HANG>2s')])
const nudge = (v) => { const b = v.getBounds(); v.setBounds({ ...b, width: b.width + 1 }); v.setBounds(b) }
async function retry(v, opts) {
  const t0 = Date.now(); const seen = new Set()
  for (let k = 0; Date.now() - t0 < 6000; k++) {
    const r = await once(v, opts); if (r === 'ok') return `ok after ${k + 1} tries ${Date.now() - t0} ms (${[...seen]})`
    seen.add(r); nudge(v); await sleep(100)
  }
  return `FAILED (${[...seen]})`
}
app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  for (const state of ['minimized', 'hidden']) {
    const win = new BrowserWindow({ width: 1300, height: 950, show: true })
    await win.loadURL('about:blank')
    const v = new WebContentsView({ webPreferences: { sandbox: true } })
    v.setBounds({ x: 0, y: 0, width: 1280, height: 900 })
    win.contentView.addChildView(v)
    await v.webContents.loadURL(`${base}/a`)
    if (state === 'minimized') win.minimize(); else win.hide()
    await sleep(1500)
    for (let i = 0; i < 2; i++) {
      await Promise.race([v.webContents.loadURL(`${base}/${state}-A${i}`), sleep(5000)])
      console.log(`${state} A stayHidden #${i}:`, await retry(v, { stayHidden: true, stayAwake: true }))
      await Promise.race([v.webContents.loadURL(`${base}/${state}-B${i}`), sleep(5000)])
      win.contentView.removeChildView(v)
      const r = await retry(v)
      win.contentView.addChildView(v)
      console.log(`${state} B detach #${i}:`, r, 'reattached:', win.contentView.children.includes(v))
    }
    v.webContents.close(); win.destroy()
  }
  app.quit()
})
