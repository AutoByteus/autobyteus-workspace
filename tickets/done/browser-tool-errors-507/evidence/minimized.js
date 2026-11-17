// Probe: tab attached to a minimized window: does capture fail, hang, or work, and does the nudge help?
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(`<h1>${req.url}</h1>`) })
const once = async (v) => Promise.race([
  v.webContents.capturePage().then((i) => (i.isEmpty() ? 'empty' : 'ok'), (e) => e.message),
  sleep(3000).then(() => 'HANG>3s')])
app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const win = new BrowserWindow({ width: 1300, height: 950, show: true })
  await win.loadURL('about:blank')
  const v = new WebContentsView({ webPreferences: { sandbox: true } })
  v.setBounds({ x: 0, y: 0, width: 1280, height: 900 })
  win.contentView.addChildView(v)
  await v.webContents.loadURL(`${base}/a`)
  console.log('shown, after load:', await once(v))
  win.minimize(); await sleep(1500)
  for (let i = 0; i < 3; i++) {
    await Promise.race([v.webContents.loadURL(`${base}/m${i}`), sleep(5000)])
    const first = await once(v)
    const b = v.getBounds(); v.setBounds({ ...b, width: b.width + 1 }); v.setBounds(b); await sleep(100)
    const afterNudge = await once(v)
    console.log(`minimized, navigate #${i}: first=${first} afterNudge=${afterNudge}`)
  }
  win.restore()
  app.quit()
})
