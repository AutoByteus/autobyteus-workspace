// IMP-02 live check of the capsule written by the real createAgyRunCapsule (autobyteus-588, AC-002). Scratch folder only, synthetic prompts.
// Run: node IMP-02-capsule-live-probe.mjs /tmp/s588/real/capsule-path.json   (real agy 1.5.15; adds a small conversation to the local agy history)
import { spawn } from "node:child_process";
import fs from "node:fs";
const { path: cap, agent } = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const ws = "/tmp/s588/real/ws";
const prompts = [
  "Do not call any tool. List, as a comma separated line, the exact names of every tool you can call right now. Reply with only that line.",
  `Use your tools, one at a time: (1) create the file ${ws}/a.txt with the two lines "alpha" and "beta"; (2) edit it so that "beta" becomes "gamma"; (3) run the command: cat ${ws}/a.txt; exit 3. Then reply DONE.`,
];
const argv = ["--new-project", "--agent", agent, "--add-dir", ws, "--model", "gemini-4-neon-low", "--input-format", "stream-json", "--output-format", "stream-json", "--dangerously-skip-permissions"];
const child = spawn("agy", argv, { cwd: cap, stdio: ["pipe", "pipe", "pipe"] });
let buf = "", answer = "", turn = 0; const calls = [];
child.stdout.setEncoding("utf8");
child.stdout.on("data", (c) => {
  buf += c; let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    let m; try { m = JSON.parse(line); } catch { continue; }
    const send = () => child.stdin.write(JSON.stringify({ event: "user", message: { content: prompts[turn] } }) + "\n");
    if (m.event === "init") { console.log("init.tools:", JSON.stringify(m.init && m.init.tools)); send(); }
    else if (m.event === "step_update" && m.step_update.step_type === "agent_response" && m.step_update.text_delta) answer += m.step_update.text_delta;
    else if (m.event === "step_update" && m.step_update.step_type === "tool" && m.step_update.state === "DONE") calls.push(`${m.step_update.tool_name} -> ${JSON.stringify(m.step_update.tool_info && m.step_update.tool_info.output)}`.slice(0, 200));
    else if (m.event === "result") {
      console.log(`TURN ${turn + 1} ANSWER:`, answer.replace(/\n/g, " ").slice(0, 600)); console.log(`TURN ${turn + 1} DONE tool steps:`, calls.splice(0).join(" | ") || "none"); answer = ""; turn += 1;
      if (turn < prompts.length) send();
      else { console.log("a.txt:", JSON.stringify(fs.existsSync(`${ws}/a.txt`) ? fs.readFileSync(`${ws}/a.txt`, "utf8") : null)); setTimeout(() => { child.kill("SIGTERM"); process.exit(0); }, 800); }
    }
  }
});
child.stderr.on("data", () => {});
setTimeout(() => { console.log("timeout"); child.kill("SIGKILL"); process.exit(1); }, 240000);
