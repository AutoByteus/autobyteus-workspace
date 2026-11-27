// Replays the probe wire's `schedule('down', …)` (stop-generation-wire.mjs) for frames arriving ~0–2 ms apart and
// counts deliveries out of arrival order. Old: two Date.now() reads; New: one FIFO queue per link.
const latency = 150;
const runOld = (n) => new Promise((done) => {
  const link = { dueDown: 0 }; const out = []; let sent = 0;
  const schedule = (deliver) => {
    const due = Math.max(Date.now() + latency, link.dueDown);
    link.dueDown = due;
    // busy-wait a little so the ms clock can tick between the two reads, as under load
    const until = performance.now() + Math.random() * 0.3; while (performance.now() < until) { /* spin */ }
    setTimeout(deliver, Math.max(0, due - Date.now()));
  };
  const arrive = (i) => { schedule(() => { out.push(i); if (out.length === n) done(out); }); };
  const tick = () => { if (sent < n) { arrive(sent++); setImmediate(tick); } };
  tick();
});
const outOfOrder = (out) => out.filter((v, i) => i > 0 && v < out[i - 1]).length;
let total = 0;
for (let r = 0; r < 20; r++) total += outOfOrder(await runOld(400));
console.log(`old schedule: ${total} out-of-order deliveries in 8000 frames`);
