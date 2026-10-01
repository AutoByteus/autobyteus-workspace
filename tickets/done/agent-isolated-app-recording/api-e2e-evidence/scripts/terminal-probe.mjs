// Temporary probe: open a terminal session on an isolated backend and run a command.
const [base, cwd, cmd] = process.argv.slice(2)
const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws/terminal/api-e2e-${Date.now()}?cwd=${encodeURIComponent(cwd)}`)
let out = ''
const done = (code) => { console.log(out); process.exit(code) }
ws.onopen = () => setTimeout(() => ws.send(JSON.stringify({ type: 'input', data: Buffer.from(`${cmd}\r`).toString('base64') })), 1500)
ws.onmessage = (event) => {
  const text = typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString()
  try {
    const msg = JSON.parse(text)
    const data = msg.data ?? msg.output ?? ''
    out += Buffer.from(data, 'base64').toString()
  } catch { out += text }
  if (out.includes('PROBE_END')) { ws.close(); done(0) }
}
ws.onerror = (e) => { out += `\n[ws error ${e.message ?? ''}]`; done(1) }
setTimeout(() => done(2), 15000)
