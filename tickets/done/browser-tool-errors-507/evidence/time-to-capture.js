// Probe: how long after load / navigation / emulation does capturePage() first succeed?
// Polls every 100 ms up to 15 s. Detached view (agent tab not shown) and attached view.
// Also replays the founder's sequence: open, set emulation, screenshot at +1.7 s, +6 s.
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  const empty = req.url.includes('empty')
  res.end(empty ? '<!doctype html><html><body></body></html>'
    : `<!doctype html><body><h1>${req.url}</h1>${'<p>x</p>'.repeat(40)}</body>`)
})

const newView = () => {
  const v = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true } })
  v.setBounds({ x: 0, y: 0, width: 1280, height: 900 })
  return v
}
const tryCapture = async (v) => {
  try { const img = await v.webContents.capturePage(); return img.isEmpty() ? 'empty' : 'ok' }
  catch (e) { return e.message }
}
async function firstOk(v, label) {
  const t0 = Date.now()
  const seen = new Set()
  while (Date.now() - t0 < 15000) {
    const r = await tryCapture(v)
    if (r === 'ok') { console.log(`${label}: first ok after ${Date.now() - t0} ms; errors seen: ${[...seen].join(' | ') || 'none'}`); return }
    seen.add(r)
    await sleep(100)
  }
  console.log(`${label}: NO successful capture in 15 s; errors: ${[...seen].join(' | ')}`)
}
const emulate = (v) => {
  v.setBounds({ x: 437, y: 0, width: 405, height: 900 })
  v.webContents.enableDeviceEmulation({
    screenPosition: 'mobile', screenSize: { width: 412, height: 915 }, viewPosition: { x: 0, y: 0 },
    deviceScaleFactor: 2, viewSize: { width: 412, height: 915 }, scale: 405 / 412,
  })
}

app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const win = new BrowserWindow({ width: 1300, height: 950, show: true })
  await win.loadURL('about:blank')

  for (let i = 0; i < 3; i++) {
    let v = newView(); await v.webContents.loadURL(`${base}/a${i}`)
    await firstOk(v, `detached fresh load #${i}`)
    await v.webContents.loadURL(`${base}/b${i}`)
    await firstOk(v, `detached after navigate #${i}`)
    emulate(v)
    await firstOk(v, `detached after emulation #${i}`)
    v.webContents.close()

    v = newView(); win.contentView.addChildView(v); await v.webContents.loadURL(`${base}/c${i}`)
    await firstOk(v, `attached fresh load #${i}`)
    await v.webContents.loadURL(`${base}/d${i}`)
    await firstOk(v, `attached after navigate #${i}`)
    win.contentView.removeChildView(v); v.webContents.close()

    // Founder's sequence, detached, on an empty-body page and a normal page.
    for (const path of ['/empty', '/mobile']) {
      v = newView(); await v.webContents.loadURL(`${base}${path}${i}`)
      const t0 = Date.now()
      await sleep(20); emulate(v)
      await sleep(1700 - (Date.now() - t0)); const s1 = await tryCapture(v)
      await sleep(6000 - (Date.now() - t0)); const s2 = await tryCapture(v)
      console.log(`founder sequence ${path} #${i}: shot@1.7s=${s1} shot@6s=${s2}`)
      v.webContents.close()
    }
  }
  app.quit()
})
