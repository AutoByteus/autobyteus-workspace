// Feeds the probe's own wire (`fixtures/stop-generation-wire.mjs`, link.fromNode) numbered Team frames ~0–2 ms apart at
// 150 ms latency and counts the frames it hands to the page out of order. Usage: node real-wire-order.mjs <wire module path>
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
    const tick = () => { if (i < n) { link.fromNode(JSON.stringify({ type: 'AGENT_INPUT_STATE', payload: { change_sequence: ++i, agent_run_id: 'a' } }));
      const until = performance.now() + Math.random() * 0.3; while (performance.now() < until) { /* load */ } setImmediate(tick); } };
    tick();
  });
  total += out.length;
  inverted += out.filter((v, k) => k > 0 && v < out[k - 1]).length;
}
console.log(`real wire: ${inverted} out-of-order deliveries in ${total} frames`);
process.exit(0);
