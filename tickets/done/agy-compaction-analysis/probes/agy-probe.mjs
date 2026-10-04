import { spawn } from "node:child_process";
import fs from "node:fs";
const [scenario, model = "gemini-3.8-flash-low", conversationId = null] = process.argv.slice(2);
const out = fs.createWriteStream(`/tmp/agy-probe/raw-${scenario}.jsonl`);
const t0 = Date.now(); const log = (label, data) => out.write(JSON.stringify({ label, dt: Date.now() - t0, data }) + "\n");
const filler = (n) => Array.from({ length: n }, (_, i) => `Record ${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");
const steps = {
  manual: ["Reply with exactly: OK ONE", "/compact", "Reply with exactly: OK AFTER"],
  manualbig: [`Data dump. Do not analyze. Reply with exactly: OK DUMP\n${filler(1500)}`, "/compact", "Reply with exactly: OK AFTER"],
  autobig: [1,2,3,4,5,6].map(i => `Data dump ${i}. Do not analyze. Reply with exactly: OK DUMP${i}\n${filler(2200)}`).concat(["Reply with exactly: OK AFTER"]),
}[scenario];
const argv = [...(conversationId ? ["--conversation", conversationId] : ["--new-project"]), "--add-dir", "/tmp/agy-probe/work",
  "--model", model, "--input-format", "stream-json", "--output-format", "stream-json", "--dangerously-skip-permissions"];
log("ARGV", argv);
const child = spawn("agy", argv, { cwd: "/tmp/agy-probe/work", stdio: ["pipe", "pipe", "pipe"] });
let buf = ""; let i = 0; let initSeen = false;
const send = () => { if (i >= steps.length) { log("CLOSE_STDIN", {}); child.stdin.end(); return; }
  const content = steps[i++]; log("SEND", { content: content.slice(0, 80), len: content.length });
  child.stdin.write(JSON.stringify({ event: "user", message: { content } }) + "\n"); };
child.stdout.setEncoding("utf8"); child.stderr.setEncoding("utf8");
child.stderr.on("data", (d) => log("STDERR", d));
child.stdout.on("data", (chunk) => { buf += chunk; let n; while ((n = buf.indexOf("\n")) >= 0) { const line = buf.slice(0, n).trim(); buf = buf.slice(n + 1); if (!line) continue;
  let msg = null; try { msg = JSON.parse(line); } catch { log("RAW_NONJSON", line); continue; }
  log("OUT", msg);
  if (msg.event === "init" && !initSeen) { initSeen = true; send(); }
  else if (msg.event === "result") send(); } });
child.on("close", (code, sig) => { log("EXIT", { code, sig }); out.end(); });
setTimeout(() => { log("TIMEOUT", {}); child.kill("SIGTERM"); }, 900000).unref();
