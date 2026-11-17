// Probe: which bounds nudge wakes a tab that has not drawn: a 1 px resize or a 1 px move?
// Does the page see a resize event, and does it work with mobile emulation on?
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  res.end(`<!doctype html><body><h1>${req.url}</h1><script>window.resizes=0;addEventListener('resize',()=>window.resizes++)</script></body>`)
})
const once = async (v) => {
  const t = new Promise((r) => setTimeout(() => r('HANG'), 3000))
  return Promise.race([v.webContents.capturePage().then((i) => (i.isEmpty() ? 'empty' : 'ok'), (e) => e.message), t])
}
const NUDGE = {
  resize: (v, b) => { v.setBounds({ ...b, width: b.width + 1 }); v.setBounds(b) },
  move: (v, b) => { v.setBounds({ ...b, x: b.x + 1 }); v.setBounds(b) },
}
async function run(v, kind) {
  const b = v.getBounds(); const t0 = Date.now()
  for (let k = 0; Date.now() - t0 < 3000; k++) {
    const r = await once(v)
    if (r === 'ok') return { ok: true, tries: k + 1, ms: Date.now() - t0 }
    NUDGE[kind](v, b); await sleep(100)
  }
  return { ok: false }
}
app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  for (let rep = 0; rep < 3; rep++) {
    for (const kind of ['resize', 'move']) {
      for (const emulated of [false, true]) {
        const v = new WebContentsView({ webPreferences: { sandbox: true } })
        v.setBounds({ x: 0, y: 0, width: 1280, height: 900 })
        await v.webContents.loadURL(`${base}/${kind}`)
        if (emulated) {
          v.setBounds({ x: 437, y: 0, width: 405, height: 900 })
          v.webContents.enableDeviceEmulation({ screenPosition: 'mobile', screenSize: { width: 412, height: 915 },
            viewPosition: { x: 0, y: 0 }, deviceScaleFactor: 2, viewSize: { width: 412, height: 915 }, scale: 405 / 412 })
          await run(v, 'resize') // as after set_device_emulation, the tab has drawn once
          await v.webContents.loadURL(`${base}/${kind}-2`) // then the agent navigates
        }
        const before = await v.webContents.executeJavaScript('[innerWidth, window.resizes]')
        const r = await run(v, kind)
        const after = await v.webContents.executeJavaScript('[innerWidth, window.resizes]')
        console.log(JSON.stringify({ rep, kind, emulated, ...r, innerWidthBefore: before[0], innerWidthAfter: after[0], resizeEvents: after[1] - before[1] }))
        v.webContents.close()
      }
    }
  }
  app.quit()
})
