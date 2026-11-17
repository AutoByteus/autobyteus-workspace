// Probe: does the first capture after a navigation fail regardless of the wait,
// and does the failing capture itself make the next one succeed?
// Cases: detached view; attached to a shown window; attached to a hidden window.
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
const tryCapture = async (v) => {
  const t = new Promise((r) => setTimeout(() => r('HANG>5s'), 5000))
  const c = v.webContents.capturePage().then((img) => (img.isEmpty() ? 'empty' : 'ok'), (e) => e.message)
  return Promise.race([c, t])
}

app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const win = new BrowserWindow({ width: 1300, height: 950, show: true })
  await win.loadURL('about:blank')
  const tally = {}
  const add = (k, r) => { console.log(k, '=>', r); tally[k] = tally[k] || {}; tally[k][r] = (tally[k][r] || 0) + 1 }

  for (const mode of ['detached', 'attached-shown', 'attached-hidden']) {
    if (mode === 'attached-hidden') win.hide(); else win.show()
    const v = newView()
    if (mode !== 'detached') win.contentView.addChildView(v)
    console.log('mode', mode); await Promise.race([v.webContents.loadURL(`${base}/start`), sleep(8000)])
    // get the view into a capturable state first (as on a tab that already took screenshots)
    for (let k = 0; k < 50 && (await tryCapture(v)) !== 'ok'; k++) {
      v.setBounds({ x: 0, y: 0, width: 1280 - (k % 2), height: 900 })
      await sleep(100)
    }
    add(`${mode}: baseline capture`, await tryCapture(v))
    for (const waitMs of [0, 500, 2000, 5000]) {
      for (let i = 0; i < 3; i++) {
        await v.webContents.loadURL(`${base}/n${waitMs}-${i}`)
        await sleep(waitMs)
        const first = await tryCapture(v)
        await sleep(300)
        const retry = await tryCapture(v)
        add(`${mode}: navigate, wait ${waitMs} ms, capture`, first)
        add(`${mode}: ...retry 300 ms later`, retry)
      }
      for (let i = 0; i < 3; i++) {
        await sleep(waitMs)
        add(`${mode}: no navigation, wait ${waitMs} ms, capture`, await tryCapture(v))
      }
      for (let i = 0; i < 3; i++) {
        await v.webContents.executeJavaScript(`document.body.insertAdjacentHTML('beforeend','<p>changed ${i}</p>')`, true)
        await sleep(waitMs)
        add(`${mode}: DOM change (run_script), wait ${waitMs} ms, capture`, await tryCapture(v))
      }
    }
    if (mode !== 'detached') win.contentView.removeChildView(v)
    v.webContents.close()
  }
  for (const [k, v] of Object.entries(tally)) console.log(k.padEnd(62), JSON.stringify(v))
  app.quit()
})
