// Temporary probe: raise a confirm() between operations and answer it after <holdSeconds> (plays the on-screen user).
// Usage: node dialog-fixture.mjs <port> <targetId> <holdSeconds> [answer:true|false]
const [port, targetId, hold, answer = 'true'] = process.argv.slice(2)
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.id === targetId)
const ws = new WebSocket(target.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const events = []
const call = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })) })
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id) pending.get(m.id)?.(m.result ?? { error: m.error }); else if (m.method?.startsWith('Page.javascriptDialog')) events.push({ t: Date.now(), method: m.method, message: m.params?.message }) }
ws.onopen = async () => {
  await call('Page.enable')
  await call('Runtime.evaluate', { expression: "setTimeout(() => { window.__lateAnswer = confirm('Discard draft?'); }, 200); true" })
  console.log(JSON.stringify({ t: Date.now(), raised: true }))
  await new Promise((r) => setTimeout(r, Number(hold) * 1000))
  const handled = await call('Page.handleJavaScriptDialog', { accept: answer === 'true' })
  console.log(JSON.stringify({ t: Date.now(), handled, events }))
  ws.close(); process.exit(0)
}
setTimeout(() => { console.log(JSON.stringify({ timeout: true, events })); process.exit(2) }, (Number(hold) + 20) * 1000)
