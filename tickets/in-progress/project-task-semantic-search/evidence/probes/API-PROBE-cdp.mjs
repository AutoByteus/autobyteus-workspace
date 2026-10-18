// API/E2E probe (ticket evidence, not product code): minimal Chrome DevTools Protocol client for an isolated
// AutoByteus desktop instance's control port (loopback only). Uses Node's built-in WebSocket; no dependencies.
// Usage:
//   node API-PROBE-cdp.mjs <controlPort> eval '<async () => {...}>'     evaluates in the main window, prints the JSON result
//   node API-PROBE-cdp.mjs <controlPort> evalfile <file.js>             same, the file holds one async arrow function
//   node API-PROBE-cdp.mjs <controlPort> screenshot <out.png>
import fs from 'node:fs'

const [port, command, arg] = process.argv.slice(2)
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const page = targets.find((t) => t.type === 'page' && /renderer\/index\.html|localhost|127\.0\.0\.1/.test(t.url)) ?? targets.find((t) => t.type === 'page')
if (!page) throw new Error('no page target')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject })
let nextId = 1
const pending = new Map()
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id) }
}
const send = (method, params = {}) => new Promise((resolve) => { const id = nextId++; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })) })

if (command === 'eval' || command === 'evalfile') {
  const source = command === 'eval' ? arg : fs.readFileSync(arg, 'utf8')
  const response = await send('Runtime.evaluate', { expression: `(${source})()`, awaitPromise: true, returnByValue: true, userGesture: true })
  if (response.result?.exceptionDetails) {
    console.error(JSON.stringify(response.result.exceptionDetails, null, 1))
    process.exitCode = 1
  } else {
    console.log(JSON.stringify(response.result?.result?.value ?? null, null, 1))
  }
} else if (command === 'screenshot') {
  const response = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(arg, Buffer.from(response.result.data, 'base64'))
  console.log(arg)
} else {
  throw new Error(`unknown command ${command}`)
}
ws.close()
