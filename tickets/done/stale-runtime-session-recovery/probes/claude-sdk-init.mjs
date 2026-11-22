// PRB-007: does the SDK's initialization settle before any input, and how, for a resume binding?
const sdk = await import(process.argv[2]);
const sessionId = process.argv[3]; const cwd = process.argv[4];
let stop; const never = new Promise((r) => { stop = r; });
async function* prompt() { await never; }
const t0 = Date.now();
const q = sdk.query({ prompt: prompt(), options: { resume: sessionId, cwd, pathToClaudeCodeExecutable: process.argv[5], env: { ...process.env, ...(process.argv[6] ? { CLAUDE_CONFIG_DIR: process.argv[6] } : {}) } } });
const frames = []; (async () => { try { for await (const f of q) frames.push(f.type + "/" + (f.subtype ?? "") + (f.errors ? " " + JSON.stringify(f.errors) : "")); } catch (e) { frames.push("THROW " + String(e.message).slice(0, 200)); } })();
try { const r = await Promise.race([q.initializationResult(), new Promise((_, j) => setTimeout(() => j(new Error("init timeout 20s")), 20000))]);
  console.log("init OK after", Date.now() - t0, "ms; keys", Object.keys(r).slice(0, 8).join(","));
} catch (e) { console.log("init REJECTED after", Date.now() - t0, "ms:", String(e.message).slice(0, 300)); }
await new Promise((r) => setTimeout(r, 1500)); console.log("frames:", frames); stop(); q.close?.(); process.exit(0);
