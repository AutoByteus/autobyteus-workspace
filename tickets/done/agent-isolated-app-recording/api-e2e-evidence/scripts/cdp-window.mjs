// Temporary probe: browser-level window state for a page target. Usage: node cdp-window.mjs <port> <targetId> get|minimized|normal|bounds:<w>x<h>
const [port, targetId, action] = process.argv.slice(2)
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()
const ws = new WebSocket(version.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const call = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })) })
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m.result ?? { error: m.error }) }
ws.onopen = async () => {
  const { windowId, bounds } = await call('Browser.getWindowForTarget', { targetId })
  let result = { windowId, bounds }
  if (action === 'minimized' || action === 'normal') {
    result.set = await call('Browser.setWindowBounds', { windowId, bounds: { windowState: action } })
  } else if (action?.startsWith('bounds:')) {
    const [width, height] = action.slice(7).split('x').map(Number)
    await call('Browser.setWindowBounds', { windowId, bounds: { windowState: 'normal' } })
    result.set = await call('Browser.setWindowBounds', { windowId, bounds: { width, height } })
  }
  result.after = (await call('Browser.getWindowForTarget', { targetId })).bounds
  console.log(JSON.stringify(result)); process.exit(0)
}
setTimeout(() => process.exit(2), 10000)
