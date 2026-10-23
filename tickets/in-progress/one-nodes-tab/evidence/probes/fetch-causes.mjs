const tries = { refused: "http://127.0.0.1:9/x", notFound: "http://no-such-host.invalid:8000/x", blackhole: "http://10.255.255.1:8000/x" };
for (const [k, url] of Object.entries(tries)) {
  try { await fetch(url, { signal: AbortSignal.timeout(3000) }); console.log(k, "ok"); }
  catch (e) { console.log(k, e.name, e.message, "| cause:", e.cause?.code, e.cause?.name); }
}
