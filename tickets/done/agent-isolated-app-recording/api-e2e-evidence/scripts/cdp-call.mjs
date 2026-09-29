// Temporary probe: send one CDP command to a page target. Usage: node cdp-call.mjs <port> <targetId> <method> [paramsJson]
const [port, targetId, method, params = '{}'] = process.argv.slice(2)
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const target = targets.find((t) => t.id === targetId)
const ws = new WebSocket(target.webSocketDebuggerUrl)
ws.onopen = () => ws.send(JSON.stringify({ id: 1, method, params: JSON.parse(params) }))
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id === 1) { console.log(JSON.stringify(m.result ?? m.error)); ws.close(); process.exit(0) } }
setTimeout(() => process.exit(2), 10000)
