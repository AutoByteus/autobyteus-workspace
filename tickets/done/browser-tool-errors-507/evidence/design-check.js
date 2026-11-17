// Probe of the designed mechanism, in Electron 42.11.16:
//  (1) capture with bounded retry: on a failed or empty capture, resize the view by 1 px and back,
//      wait 100 ms, try again, give up after 2 s;
//  (2) window rule: a minimized or hidden window does not hold its browser view (detached on
//      'minimize'/'hide', attached again on 'restore'/'show').
// Prints per situation: ok?, attempts, ms; and for the emulated case innerWidth before/after.
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  res.end(`<!doctype html><body style="margin:0"><h1>${req.url}</h1>${'<p>row</p>'.repeat(200)}</body>`)
})
const load = (v, u) => Promise.race([v.webContents.loadURL(u).catch(() => {}), sleep(5000)])

async function captureWithRetry(view, bounds) {
  const t0 = Date.now(); let reason = ''
  for (let attempt = 1; ; attempt++) {
    const r = await Promise.race([
      view.webContents.capturePage().then((i) => (i.isEmpty() ? 'empty image' : i), (e) => e.message),
      sleep(3000).then(() => 'HANG>3s (probe guard)')])
    if (typeof r !== 'string') return { ok: true, attempt, ms: Date.now() - t0, size: r.getSize() }
    reason = r
    if (Date.now() - t0 >= 2000) return { ok: false, attempt, ms: Date.now() - t0, reason }
    view.setBounds({ ...bounds, width: bounds.width + 1 }); view.setBounds(bounds)
    await sleep(100)
  }
}
function holdOnlyWhileVisible(win, view) {
  const apply = () => {
    const visible = win.isVisible() && !win.isMinimized()
    const has = win.contentView.children.includes(view)
    if (visible && !has) win.contentView.addChildView(view)
    if (!visible && has) win.contentView.removeChildView(view)
  }
  for (const e of ['minimize', 'restore', 'hide', 'show']) win.on(e, apply)
  apply()
}

app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const B = { x: 0, y: 0, width: 1280, height: 900 }
  const out = (o) => console.log('RESULT', JSON.stringify(o))
  for (let rep = 0; rep < 3; rep++) {
    let v = new WebContentsView({ webPreferences: { sandbox: true } }); v.setBounds(B)
    await load(v, `${base}/fresh`)
    out({ rep, sit: 'not shown, fresh tab', ...(await captureWithRetry(v, B)) })
    await load(v, `${base}/next`)
    out({ rep, sit: 'not shown, after navigate', ...(await captureWithRetry(v, B)) })
    // full page: enlarge to the document height like the product, capture, restore
    const h = await v.webContents.executeJavaScript('document.documentElement.scrollHeight')
    const big = { ...B, height: Math.min(4000, h) }; v.setBounds(big); await sleep(60)
    out({ rep, sit: 'not shown, full page', ...(await captureWithRetry(v, big)) }); v.setBounds(B)

    // founder's sequence: open, mobile emulation 412x915 (presentation 405x900), screenshot
    v = new WebContentsView({ webPreferences: { sandbox: true } }); v.setBounds(B)
    await load(v, `${base}/mobile`)
    const E = { x: 437, y: 0, width: 405, height: 900 }; v.setBounds(E)
    v.webContents.enableDeviceEmulation({ screenPosition: 'mobile', screenSize: { width: 412, height: 915 },
      viewPosition: { x: 0, y: 0 }, deviceScaleFactor: 2, viewSize: { width: 412, height: 915 }, scale: 405 / 412 })
    const before = await v.webContents.executeJavaScript('[innerWidth, innerHeight]')
    const r = await captureWithRetry(v, E)
    const after = await v.webContents.executeJavaScript('[innerWidth, innerHeight]')
    out({ rep, sit: "founder's sequence (emulated)", ...r, before, after })

    for (const state of ['minimized', 'hidden']) {
      const win = new BrowserWindow({ width: 1300, height: 950, show: true }); await win.loadURL('about:blank')
      const w = new WebContentsView({ webPreferences: { sandbox: true } }); w.setBounds(B)
      holdOnlyWhileVisible(win, w)
      await load(w, `${base}/${state}`)
      if (state === 'minimized') win.minimize(); else win.hide()
      await sleep(1500)
      await load(w, `${base}/${state}-2`)
      out({ rep, sit: `${state} window (rule applied), after navigate`, attachedWhile: win.contentView.children.includes(w), ...(await captureWithRetry(w, B)) })
      if (state === 'minimized') win.restore(); else win.show()
      await sleep(500)
      out({ rep, sit: `${state} window restored`, attachedAgain: win.contentView.children.includes(w), ...(await captureWithRetry(w, B)) })
    }
  }
  app.exit(0)
})
