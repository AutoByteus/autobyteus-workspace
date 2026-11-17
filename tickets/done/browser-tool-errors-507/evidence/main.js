// Probe: when does webContents.capturePage() reject with UnknownVizError?
// Mirrors the product's browser tab: a WebContentsView that is normally NOT
// added to any window (agent tab not focused in the UI), bounds 1280x900.
// Usage: electron main.js [repeat]
const { app, BrowserWindow, WebContentsView } = require('electron')
const http = require('http')

const REPEAT = Number(process.argv[process.argv.length - 1]) || 5
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const page = (n) => `<!doctype html><html><body style="margin:0;font:16px sans-serif">
<div id=app>page ${n}</div><script>
setTimeout(()=>{document.getElementById('app').innerHTML='<h1>rendered '+${n}+'</h1>'+'<p>x</p>'.repeat(50)},300)
</script></body></html>`

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  res.end(page(req.url))
})

const results = {}
const record = (name, outcome) => {
  results[name] = results[name] || {}
  results[name][outcome] = (results[name][outcome] || 0) + 1
}

async function capture(view, name) {
  const t0 = Date.now()
  try {
    const img = await view.webContents.capturePage()
    const empty = img.isEmpty()
    record(name, empty ? 'empty' : 'ok')
    return empty ? 'empty' : 'ok'
  } catch (e) {
    record(name, `err:${e && e.message}`)
    return `err:${e && e.message} (${Date.now() - t0}ms)`
  }
}

function newView() {
  const v = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true } })
  v.setBounds({ x: 0, y: 0, width: 1280, height: 900 })
  return v
}

async function load(view, url) {
  await view.webContents.loadURL(url)
}

app.whenReady().then(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  const win = new BrowserWindow({ width: 1300, height: 950, show: true })
  await win.loadURL('about:blank')

  for (let i = 0; i < REPEAT; i++) {
    // A: detached view, capture right after load resolves (open_tab -> screenshot)
    let v = newView()
    await load(v, `${base}/a${i}`)
    console.log('A detached after-load', await capture(v, 'A detached: right after load'))
    console.log('A detached +1s', (await sleep(1000), await capture(v, 'A detached: 1s after load')))

    // B: navigate the same detached view, capture right after (navigate_to -> screenshot)
    await load(v, `${base}/b${i}`)
    console.log('B detached after-navigate', await capture(v, 'B detached: right after navigate'))
    await sleep(1500)
    console.log('B detached +1.5s', await capture(v, 'B detached: 1.5s after navigate'))

    // C: mobile emulation as set_device_emulation applies it, then capture
    v.setBounds({ x: 437, y: 0, width: 405, height: 900 })
    v.webContents.enableDeviceEmulation({
      screenPosition: 'mobile', screenSize: { width: 412, height: 915 }, viewPosition: { x: 0, y: 0 },
      deviceScaleFactor: 2, viewSize: { width: 412, height: 915 }, scale: 405 / 412,
    })
    console.log('C detached after-emulation', await capture(v, 'C detached: right after emulation'))
    await sleep(1500)
    console.log('C detached +1.5s', await capture(v, 'C detached: 1.5s after emulation'))

    // D: idle detached view (agent thinks for a while), then capture twice
    await sleep(Number(process.env.IDLE_MS || 8000))
    console.log('D detached idle', await capture(v, 'D detached: after idle'))
    console.log('D detached idle retry', await capture(v, 'D detached: immediate retry after idle'))
    v.webContents.close()

    // E: control: the same, attached to a visible window
    const w = newView()
    win.contentView.addChildView(w)
    await load(w, `${base}/e${i}`)
    console.log('E attached after-load', await capture(w, 'E attached: right after load'))
    await load(w, `${base}/f${i}`)
    console.log('E attached after-navigate', await capture(w, 'E attached: right after navigate'))
    await sleep(Number(process.env.IDLE_MS || 8000))
    console.log('E attached idle', await capture(w, 'E attached: after idle'))
    win.contentView.removeChildView(w)
    w.webContents.close()
  }
  console.log(JSON.stringify(results, null, 2))
  app.quit()
})
