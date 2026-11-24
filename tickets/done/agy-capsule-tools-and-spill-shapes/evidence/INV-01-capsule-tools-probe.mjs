import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [label, toolsArg] = process.argv.slice(2);
const cap = `/tmp/s588/capsule-${label}`;
fs.rmSync(cap, { recursive: true, force: true });
const name = "probe-agent";
const dir = path.join(cap, ".agents", "agents", name);
fs.mkdirSync(dir, { recursive: true });
const toolsLine = toolsArg === "NONE" ? "" : `tools: [${toolsArg}]\n`;
fs.writeFileSync(path.join(dir, "agent.md"), `---\nname: ${name}\ndescription: probe\nmainAgent: true\n${toolsLine}---\n\nYou are a probe agent. Answer exactly what is asked.\n`);
fs.mkdirSync("/tmp/s588/ws", { recursive: true });
const argv = ["--new-project", "--agent", name, "--add-dir", "/tmp/s588/ws", "--model", "gemini-4-neon-low", "--input-format", "stream-json", "--output-format", "stream-json", "--dangerously-skip-permissions"];
const child = spawn("agy", argv, { cwd: cap, stdio: ["pipe", "pipe", "pipe"] });
let buf = "", answer = "", tools = [];
child.stdout.setEncoding("utf8");
child.stdout.on("data", (c) => {
  buf += c; let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.event === "init") {
      console.log(label, "init.tools:", JSON.stringify(m.init && m.init.tools), "| permission_mode:", m.init && m.init.permission_mode);
      child.stdin.write(JSON.stringify({ event: "user", message: { content: "Do not call any tool. List, as a comma separated line, the exact names of every tool you can call right now. Reply with only that line." } }) + "\n");
    } else if (m.event === "step_update" && m.step_update.step_type === "agent_response" && m.step_update.text_delta) answer += m.step_update.text_delta;
    else if (m.event === "step_update" && m.step_update.step_type === "tool") tools.push(m.step_update.tool_name);
    else if (m.event === "result") { console.log(label, "ANSWER:", answer.replace(/\n/g, " ").slice(0, 600)); console.log(label, "tool calls made:", [...new Set(tools)].join(",") || "none"); setTimeout(() => { child.kill("SIGTERM"); process.exit(0); }, 800); }
  }
});
child.stderr.on("data", () => {});
setTimeout(() => { console.log(label, "timeout"); child.kill("SIGKILL"); process.exit(1); }, 120000);
