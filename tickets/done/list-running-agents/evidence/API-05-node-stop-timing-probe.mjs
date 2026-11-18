// Starts the project-mutation fixture node (built dist), waits for its ready message, sends SIGTERM and times the exit.
import { spawn } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
const serverRoot = process.argv[2]; const runs = Number(process.argv[3] ?? 2);
const { builtServerLaunchEnvironment } = await import(path.join(serverRoot, "tests/e2e/helpers/built-server-launch-credential.ts")).catch(() => ({ builtServerLaunchEnvironment: () => ({}) }));
for (let i = 0; i < runs; i++) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pmn-")); fs.writeFileSync(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
  const child = spawn(process.execPath, ["tests/fixtures/project-mutation-http-node.mjs", root], { cwd: serverRoot, env: { PATH: process.env.PATH, HOME: root, TMPDIR: process.env.TMPDIR, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe", "ipc"] });
  let logs = ""; child.stdout.on("data", (d) => { logs += d; }); child.stderr.on("data", (d) => { logs += d; });
  const t0 = Date.now();
  const ready = await new Promise((r) => { child.once("message", () => r(true)); child.once("exit", () => r(false)); setTimeout(() => r(false), 90000); });
  const readyMs = Date.now() - t0; const s0 = Date.now();
  const exit = new Promise((r) => child.once("exit", (code, signal) => r({ code, signal })));
  child.kill("SIGTERM"); const force = setTimeout(() => child.kill("SIGKILL"), 30000);
  const result = await exit; clearTimeout(force);
  console.log(JSON.stringify({ run: i + 1, ready, readyMs, stopMs: Date.now() - s0, ...result, logTail: ready ? undefined : logs.slice(-600) }));
  fs.rmSync(root, { recursive: true, force: true });
}
