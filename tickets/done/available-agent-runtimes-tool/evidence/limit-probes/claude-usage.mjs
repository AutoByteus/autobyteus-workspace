const sdkPath = process.argv[2];
const { query } = await import(sdkPath);
let release; const idle = new Promise(r => { release = r; });
async function* input() { await idle; }
const t0 = Date.now();
const q = query({ prompt: input(), options: { pathToClaudeCodeExecutable: "/Users/normy/.local/bin/claude", cwd: "/tmp/routing-probes" } });
try {
  const usage = await q.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET({ skipBehaviors: true });
  console.log("ms", Date.now() - t0);
  console.log(JSON.stringify({ subscription_type: usage.subscription_type, rate_limits_available: usage.rate_limits_available, rate_limits: usage.rate_limits }, null, 1));
} catch (e) { console.log("ERR", e?.message ?? e); }
release(); q.close?.();
process.exit(0);
