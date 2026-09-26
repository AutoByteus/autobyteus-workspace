import { openSession, ts, sleep } from "./lib.mjs";
import { execSync } from "node:child_process";
const s = openSession({}, "J");
s.send("Do exactly two steps in this one turn. Step 1: use Bash with run_in_background true to run: sleep 6; echo BG_DONE . Step 2: immediately after, use Bash in the foreground (not background) to run: python3 -c 'import time; time.sleep(20); print(\"FG_DONE\")' . After step 2 finishes, reply with one short sentence saying what you know about both commands.");
await s.nextResult(); await sleep(20000);
console.log(ts(), "--- J done; now L (crash)");
s.send("Remember the codeword PAPAYA. Then use Bash in the foreground to run: python3 -c 'import time; time.sleep(30); print(\"X\")' and reply with its output.");
await sleep(9000);
const pids = execSync(`pgrep -P ${process.pid} || true`).toString().trim().split("\n").filter(Boolean);
console.log(ts(), "L: killing claude child pids", pids.join(","));
for (const p of pids) try { process.kill(Number(p), "SIGKILL"); } catch {}
const r = await s.nextResult(15000); console.log(ts(), "L: after kill, nextResult =", r===null?"null (stream ended)":r==="TIMEOUT"?"TIMEOUT":r.subtype);
await s.done; const sid = s.sid; console.log(ts(), "L: session id", sid);
const s2 = openSession({ resume: sid }, "L2");
s2.send("What codeword did I ask you to remember? One word.");
await s2.nextResult(60000); s2.close(); await sleep(500); process.exit(0);
