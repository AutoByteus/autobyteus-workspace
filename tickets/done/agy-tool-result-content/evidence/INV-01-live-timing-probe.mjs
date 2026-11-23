import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const argv = ["--new-project", "--add-dir", "/tmp/s377/ws", "--model", "gemini-4-neon-low", "--input-format", "stream-json", "--output-format", "stream-json", "--dangerously-skip-permissions"];
const child = spawn("agy", argv, { cwd: "/tmp/s377/capsule", stdio: ["pipe", "pipe", "pipe"] });
let buf = "", conv = null; const t0 = Date.now();
const log = (...a) => console.log(String(Date.now() - t0).padStart(6), ...a);
const rowFor = (step) => {
  if (!conv) return "no-conv";
  const p = path.join(os.homedir(), ".gemini/antigravity-cli/brain", conv, ".system_generated/logs/transcript_full.jsonl");
  try {
    const lines = fs.readFileSync(p, "utf8").split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) { const r = JSON.parse(lines[i]); if (r.step_index === step) return { found: true, type: r.type, status: r.status, bytes: (r.content || "").length, head: (r.content || "").split("\n").slice(0, 9).map((s) => s.slice(0, 48)) }; if (r.step_index < step) break; }
    return { found: false, rows: lines.length };
  } catch (e) { return "err " + e.code; }
};
child.stdout.setEncoding("utf8");
child.stdout.on("data", (c) => {
  buf += c; let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.event === "init") { conv = m.conversation_id; log("init conv set"); child.stdin.write(JSON.stringify({ event: "user", message: { content: "You have a dedicated grep_search tool. Call grep_search (not run_command, not a shell) with Query NEEDLE and SearchPath /tmp/s377/ws. Then call view_file on /tmp/s377/ws/notes.txt for lines 1 to 3. Then answer in one sentence." } }) + "\n"); }
    else if (m.event === "step_update" && m.step_update.step_type === "tool") {
      const s = m.step_update; log("tool", s.tool_name, s.state, "step", s.step_index, "stream output:", String(JSON.stringify(s.tool_info && s.tool_info.output)).slice(0, 80));
      if (s.state === "DONE") log("   transcript row right now:", JSON.stringify(rowFor(s.step_index)));
    } else if (m.event === "result") { log("result"); setTimeout(() => { child.kill("SIGTERM"); process.exit(0); }, 1500); }
  }
});
child.stderr.on("data", () => {});
setTimeout(() => { log("timeout"); child.kill("SIGKILL"); process.exit(1); }, 150000);
