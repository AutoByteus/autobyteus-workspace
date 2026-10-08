async (arg) => {
  const samples = []; const seen = new Set(); const t0 = performance.now();
  location.hash = `#/chat?id=${arg.runId}`;
  for (let i = 0; i < 80; i += 1) {
    const s = [location.hash.split('?')[0], document.querySelector('[data-test="chat-missing"]') ? 'MISSING' : '', document.querySelector('[data-test="chat-opening"]') ? 'OPENING' : '', document.querySelector('[data-test="chat-run-frame"]') ? 'RUNFRAME' : '', document.querySelector('[data-test="workspace-empty-state"]') ? 'EMPTY' : ''].filter(Boolean).join('|');
    if (!seen.has(s)) { seen.add(s); samples.push({ ms: Math.round(performance.now() - t0), s }); }
    await new Promise((r) => setTimeout(r, 25));
  }
  return { transitions: samples, finalHash: location.hash };
}
