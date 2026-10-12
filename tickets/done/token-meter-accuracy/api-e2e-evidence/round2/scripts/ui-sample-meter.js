async (arg) => {
  // Samples the focused run's Token Meter while a turn runs. Returns the distinct states seen.
  const samples = [];
  const t0 = Date.now();
  const read = () => {
    const body = document.body.innerText;
    const i = body.indexOf("Token Meter");
    const t = i >= 0 ? body.slice(i, i + 4000) : "";
    const statusMatch = body.match(/\n(Running|Idle|Offline|Initializing|Thinking|Working|Executing tool|Processing)\n/);
    return {
      t: Date.now() - t0,
      status: statusMatch ? statusMatch[1] : "?",
      unavailable: /temporarily unavailable|Token usage unavailable/.test(t),
      prompt: (t.match(/([\d.]+) \/ ([\d.]+) context tokens/) || [])[0] || null,
      calls: (t.match(/Usage reports\n([^\n]+)/) || [])[1] || null,
      model: (t.match(/Latest model\n([^\n]+)/) || [])[1] || null,
      runtime: (t.match(/Runtime\n([^\n]+)/) || [])[1] || null,
      threshold: (t.match(/Auto-compacts at ([^\n]+)/) || [])[1] || null,
      hash: location.hash,
    };
  };
  while (Date.now() - t0 < (arg && arg.ms ? arg.ms : 45000)) {
    samples.push(read());
    await new Promise((r) => setTimeout(r, 600));
  }
  const distinct = [];
  let prev = null;
  for (const s of samples) {
    const key = JSON.stringify([s.status, s.unavailable, s.prompt, s.calls, s.model]);
    if (key !== prev) { distinct.push(s); prev = key; }
  }
  return distinct;
}
