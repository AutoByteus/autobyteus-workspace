const ws = new WebSocket(process.argv[2]); let id = 0; const pending = new Map();
const log = (...a) => console.log(new Date().toISOString().slice(17,23), ...a);
const send = (method, params={}) => new Promise(r => { const i=++id; pending.set(i, r); ws.send(JSON.stringify({id:i, method, params})); log('sent', method); });
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id);} else log('event', d.method, JSON.stringify(d.params||{}).slice(0,160)); };
ws.onerror = (e) => log('ws error', e.message);
ws.onopen = async () => {
  log('open');
  const h = await send('Page.handleJavaScriptDialog', {accept: true});
  log('handle result', JSON.stringify(h));
  const ev = await send('Runtime.evaluate', {expression: "document.getElementById('r').textContent", returnByValue: true});
  log('result text now:', ev.result?.result?.value);
  ws.close();
};
