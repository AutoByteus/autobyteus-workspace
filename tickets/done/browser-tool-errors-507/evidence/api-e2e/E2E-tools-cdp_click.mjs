// Real mouse click at CSS coordinates in one CDP page target. Usage: node cdp_click.mjs <port> <targetId> <x> <y>
const [port, targetId, x, y] = process.argv.slice(2)
const ws = new WebSocket(`ws://127.0.0.1:${port}/devtools/page/${targetId}`)
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
let id = 0
const send = (method, params) => new Promise((r) => { const i = ++id; ws.addEventListener('message', function h(e) { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener('message', h); r(m) } }); ws.send(JSON.stringify({ id: i, method, params })) })
for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
  await send('Input.dispatchMouseEvent', { type, x: Number(x), y: Number(y), button: 'left', clickCount: type === 'mouseMoved' ? 0 : 1 })
}
console.log('clicked', x, y); ws.close(); process.exit(0)
