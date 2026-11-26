const targets = (await (await fetch('http://127.0.0.1:56338/json')).json()).filter(t => t.type === 'page')
const sleep = ms => new Promise(r => setTimeout(r, ms))
for (const t of targets) {
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r)
  let id = 0; const ev = (expression) => new Promise(res => { const i = ++id; ws.addEventListener('message', function h(m) { const d = JSON.parse(m.data); if (d.id === i) { ws.removeEventListener('message', h); res(d.result?.result?.value) } }); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })) })
  const ctx = await ev('window.electronAPI.getWindowContext()')
  if (ctx.entryId !== process.argv[2]) { ws.close(); continue }
  const st = `(() => { const v = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia.state.value.voiceInput; return { readGeneration: v.availabilityGeneration, voiceInput: v.voiceInput && { enabled: v.voiceInput.enabled, ready: v.voiceInput.ready }, micButtons: document.querySelectorAll('button[aria-label="Start voice input"]').length } })()`
  const before = await ev(st)
  await ev(`window.dispatchEvent(new Event('focus')); true`)
  await sleep(Number(process.argv[3] ?? 3000))
  console.log(JSON.stringify({ window: ctx, before, afterFocusEvent: await ev(st) }, null, 2))
  ws.close()
}
