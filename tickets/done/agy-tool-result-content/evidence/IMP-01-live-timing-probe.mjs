// IMP-01 probe (check ID IMP-01), commit 7069972efe, 2026-11-23, real agy 1.5.15. Run: node probe.mjs. Scratch/synthetic only.
// autobyteus-377 D-3 / AC-012 live timing probe (scratch, synthetic files only). For every tool step's DONE event it reads the step's row from
// transcript_full.jsonl at once and, when it is absent, polls every 5 ms (up to 3 s) and records the lag; it also records the rows' shapes.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const WS = "/tmp/atrc-live/ws";
const argv = ["--new-project", "--agent", "atrcprobe", "--add-dir", WS, "--model", "gemini-4-neon-low", "--input-format", "stream-json", "--output-format", "stream-json", "--dangerously-skip-permissions"];
const child = spawn("agy", argv, { cwd: "/tmp/atrc-live/capsule2", stdio: ["pipe", "pipe", "pipe"] });
let buf = "", conv = null, turn = 0; const t0 = Date.now();
const allTypes = {}; const steps = []; const shapes = {}; let pending = 0;
const prompts = [
  `Use ONLY the dedicated file tools (read_file, write_file, edit_file), never a shell. Call read_file once for each of f01.txt .. f10.txt in ${WS} for lines 2 to 6. Then answer in one sentence.`,
  `Call run_command once for each of these command lines, one call per line, never combined: "grep -n NEEDLE ${WS}/f01.txt", "grep -c NEEDLE ${WS}/f02.txt", "ls ${WS}", "wc -l ${WS}/f03.txt", "head -n 2 ${WS}/f04.txt", "find ${WS} -name 'f1*'", "cat ${WS}/f05.txt". Then answer in one sentence.`,
  `Call write_file to create ${WS}/new1.txt, ${WS}/new2.txt, ${WS}/new3.txt each with three short lines, then call edit_file once on each of those three files to change "line" to "row". Then answer in one sentence.`,
  `Call read_file once for each of f11.txt .. f16.txt in ${WS} for lines 10 to 20, and once more for new1.txt, new2.txt, new3.txt (whole file). Then answer in one sentence.`,
  `Call read_file for f01.txt lines 1 to 40, then f02.txt lines 30 to 40, then f03.txt lines 1 to 3, one call per file, then run_command "cat ${WS}/new1.txt". Then answer in one sentence.`,
  `Call read_file once for each of f04.txt .. f09.txt for lines 20 to 25, then run_command "grep -rn row ${WS}". Then answer in one sentence.`,
];
const rowFile = () => path.join(os.homedir(), ".gemini/antigravity-cli/brain", conv, ".system_generated/logs/transcript_full.jsonl");
const readRow = (step) => {
  try {
    const lines = fs.readFileSync(rowFile(), "utf8").split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) { const r = JSON.parse(lines[i]); if (r.step_index === step) return r; if (r.step_index < step) break; }
    return null;
  } catch { return null; }
};
const send = (text) => child.stdin.write(JSON.stringify({ event: "user", message: { content: text } }) + "\n");
child.stdout.setEncoding("utf8");
child.stdout.on("data", async (c) => {
  buf += c; let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.event === "step_update" && m.step_update.step_type === "agent_response" && m.step_update.state === "DONE") fs.appendFileSync("/tmp/atrc-live/agent-text.txt", JSON.stringify(m.step_update).slice(0, 700) + "\n");
    if (m.event === "step_update" && m.step_update.step_type === "tool") fs.appendFileSync("/tmp/atrc-live/tool-events.txt", `${m.step_update.state} ${m.step_update.tool_name} ${m.step_update.step_index}\n`);
    if (m.event === "init") { conv = m.conversation_id; send(prompts[turn++]); }
    else if (m.event === "step_update" && m.step_update.state === "DONE" && m.step_update.step_type !== "tool") { allTypes[m.step_update.step_type] = (allTypes[m.step_update.step_type] ?? 0) + 1; }
    else if (m.event === "step_update" && m.step_update.step_type === "tool" && m.step_update.state === "DONE") {
      const s = m.step_update; const at = Date.now();
      let row = readRow(s.step_index); let lag = 0;
      while (!row && lag < 3000) { await new Promise((r) => setTimeout(r, 5)); lag = Date.now() - at; row = readRow(s.step_index); }
      steps.push({ tool: s.tool_name, step: s.step_index, presentAtDone: lag === 0 && !!row, lagMs: row ? lag : null, streamOutput: String(JSON.stringify(s.tool_info?.output ?? null)).slice(0, 60) });
      if (row && !shapes[s.tool_name]) shapes[s.tool_name] = { type: row.type, status: row.status, head: String(row.content ?? "").split("\n").slice(0, 8).map((x) => x.slice(0, 70)), bytes: String(row.content ?? "").length };
    } else if (m.event === "result") {
      if (turn < prompts.length && steps.length < 55) send(prompts[turn++]);
      else { finish(); }
    }
  }
});
const finish = () => {
  const present = steps.filter((x) => x.presentAtDone).length;
  const out = { otherStepTypes: allTypes, conv: "(not recorded)", total: steps.length, presentAtDone: present, missingAtDone: steps.length - present, lagsMs: steps.filter((x) => !x.presentAtDone).map((x) => x.lagMs),
    byTool: Object.fromEntries([...new Set(steps.map((x) => x.tool))].map((t) => [t, { n: steps.filter((x) => x.tool === t).length, present: steps.filter((x) => x.tool === t && x.presentAtDone).length }])), shapes,
    streamOutputs: Object.fromEntries([...new Set(steps.map((x) => x.tool))].map((t) => [t, [...new Set(steps.filter((x) => x.tool === t).map((x) => x.streamOutput.replace(/\d+/g, "N")))].slice(0, 4)])) };
  fs.writeFileSync("/tmp/atrc-live/result.json", JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2));
  child.kill("SIGTERM"); setTimeout(() => process.exit(0), 500);
};
child.stderr.on("data", () => {});
setTimeout(() => { console.log("TIMEOUT"); if (steps.length) finish(); else { child.kill("SIGKILL"); process.exit(1); } }, 600000);
