// Probe: which capture strategy reliably gets an image, and how fast?
// Situations: detached view right after first load; detached right after navigation;
// attached (shown window) right after navigation; attached to a hidden window after navigation.
// Strategies: plain retry; invalidate()+retry; stayHidden/stayAwake options + retry; bounds nudge + retry.
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  res.end(`<!doctype html><body><h1>${req.url}</h1>${'<p>x</p>'.repeat(40)}</body>`)
})
const newView = () => {
  const v = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true } })
  v.setBounds({ x: 0, y: 0, width: 1280, height: 900 })
  return v
}
const once = async (v, opts) => {
  const t = new Promise((r) => setTimeout(() => r('HANG'), 3000))
  const c = (opts ? v.webContents.capturePage(undefined, opts) : v.webContents.capturePage())
    .then((img) => (img.isEmpty() ? 'empty' : 'ok'), (e) => e.message)
  return Promise.race([c, t])
}
const STRATEGIES = {
  plain: async (v) => once(v),
  invalidate: async (v) => { v.webContents.invalidate(); return once(v) },
  stayHidden: async (v) => once(v, { stayHidden: true, stayAwake: true }),
  nudge: async (v) => {
    const b = v.getBounds()
    v.setBounds({ ...b, width: b.width + 1 }); v.setBounds(b)
    return once(v)
  },
}
async function run(v, name) {
  const t0 = Date.now(); const errs = new Set()
  for (let k = 0; Date.now() - t0 < 4000; k++) {
    const r = await STRATEGIES[name](v)
    if (r === 'ok') return { ok: true, ms: Date.now() - t0, tries: k + 1, errs: [...errs] }
    errs.add(r); await sleep(100)
  }
  return { ok: false, ms: Date.now() - t0, errs: [...errs] }
}

app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const win = new BrowserWindow({ width: 1300, height: 950, show: true })
  await win.loadURL('about:blank')
  const rows = []
  for (let rep = 0; rep < 3; rep++) {
    for (const name of Object.keys(STRATEGIES)) {
      for (const sit of ['detached-fresh', 'detached-navigate', 'shown-navigate']) {
        if (sit === 'hidden-navigate') win.hide(); else win.show()
        const v = newView()
        if (sit.startsWith('shown') || sit.startsWith('hidden')) win.contentView.addChildView(v)
        await Promise.race([v.webContents.loadURL(`${base}/${sit}-1`), sleep(5000)])
        if (sit !== 'detached-fresh') {
          await run(v, 'nudge') // become capturable once, as a tab that already took screenshots
          await Promise.race([v.webContents.loadURL(`${base}/${sit}-2`), sleep(5000)])
        }
        const r = await run(v, name)
        rows.push({ rep, name, sit, ...r })
        console.log(JSON.stringify({ rep, name, sit, ...r }))
        try { win.contentView.removeChildView(v) } catch {}
        v.webContents.close()
      }
    }
  }
  win.show()
  app.quit()
})
