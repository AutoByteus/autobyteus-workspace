#!/usr/bin/env node
// API/E2E (autobyteus-516) temporary probe, AC-009 / SCN-A4: does a node window read this computer's Voice Input again
// when it gets real focus? Raw CDP (Playwright's CDP attachment turns on focus emulation, which hides OS focus events).
// Focus moves through the desktop's own window focus (electronAPI.openNodeWindow on an open window → shell focus).
//   node focus-reread.mjs <control port> <node entry id> [--wait-ms=4000]
const [port, entryId] = process.argv.slice(2)
const waitMs = Number(process.argv.find((a) => a.startsWith('--wait-ms='))?.slice(10) ?? 4000)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const targets = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).filter((t) => t.type === 'page')
const open = (url) => new Promise((resolve, reject) => {
  const ws = new WebSocket(url); let id = 0; const pending = new Map()
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
  ws.onopen = () => resolve({ ws, eval: (expression) => new Promise((res) => { const i = ++id; pending.set(i, (d) => res(d.result?.result?.value ?? d)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })) }) })
  ws.onerror = reject
})
const sessions = await Promise.all(targets.map((t) => open(t.webSocketDebuggerUrl)))
let main, node
for (const s of sessions) { const c = await s.eval('window.electronAPI.getWindowContext()'); if (c?.entryId === entryId) node = s; else if (c?.entryId === 'embedded-local') main = s }
const state = () => node.eval(`(() => { const v = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia.state.value.voiceInput;
  return { focusEvents: window.__apiE2eFocus ?? null, hasFocus: document.hasFocus(), readGeneration: v.availabilityGeneration,
    voiceInput: v.voiceInput && { state: v.voiceInput.state, enabled: v.voiceInput.enabled, ready: v.voiceInput.ready },
    micButtons: document.querySelectorAll('button[aria-label="Start voice input"]').length, route: location.hash } })()`)
await node.eval(`window.__apiE2eFocus = 0; window.addEventListener('focus', () => { window.__apiE2eFocus++ }); true`)
const out = { at: new Date().toISOString(), entryId, before: await state() }
await main.eval(`window.electronAPI.openNodeWindow('embedded-local').then(() => 'main focused')`)
await sleep(1500)
out.mainFocused = { mainHasFocus: await main.eval('document.hasFocus()'), node: await state() }
await node.eval('true')
await main.eval(`window.electronAPI.openNodeWindow(${JSON.stringify(entryId)}).then(() => 'node window focused')`)
await sleep(waitMs)
out.nodeFocused = await state()
console.log(JSON.stringify(out, null, 2))
for (const s of sessions) s.ws.close()
