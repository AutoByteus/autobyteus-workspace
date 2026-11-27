// autobyteus-541 AC-009: feeds the probe's wire module (`link.fromNode`) numbered Team frames at 150 ms latency while the
// clock moves 0–2 ms between any two reads (`Date.now` patched), the mechanism of investigation A: two reads of the
// clock for one frame. Counts the frames handed to the page out of order. Usage: node wire-order-stress.mjs <wire module>
const realNow = Date.now.bind(Date);
let skew = 0;
Date.now = () => { skew += Math.floor(Math.random() * 3); return realNow() + skew; };
const { createStopWire } = await import(process.argv[2]);
const wire = createStopWire();
wire.latencyMs = 150;
let total = 0, inverted = 0;
for (let round = 0; round < 20; round++) {
  const out = [];
  const n = 400;
  await new Promise((done) => {
    const link = wire.link({ url: 'ws://127.0.0.1:1/ws/agent-team/t', sendToPage: (text) => { out.push(JSON.parse(text).payload.change_sequence); if (out.length === n) done(); },
      sendToNode: () => {}, closePage: () => {}, closeNode: () => {} });
    let i = 0;
    const tick = () => { if (i < n) { link.fromNode(JSON.stringify({ type: 'AGENT_INPUT_STATE', payload: { change_sequence: ++i, agent_run_id: 'a' } })); setImmediate(tick); } };
    tick();
  });
  total += out.length;
  inverted += out.filter((v, k) => k > 0 && v < out[k - 1]).length;
}
console.log(`wire under a moving clock: ${inverted} out-of-order deliveries in ${total} frames`);
process.exit(0);
