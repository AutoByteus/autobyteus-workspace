import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = Number(process.env.N ?? 150), DELAY = Number(process.env.DELAY ?? 300);
let miss = 0, ok = 0, missAgents = 0;
for (let i = 0; i < N; i++) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "raw-")));
  const agents = path.join(base, "agents"), teams = path.join(base, "agent-teams");
  fs.mkdirSync(agents); fs.mkdirSync(teams);
  const evA = [], evT = [];
  const wA = fs.watch(agents, (e, f) => evA.push(f));
  const wT = fs.watch(teams, (e, f) => evT.push(f));
  await sleep(DELAY);
  fs.mkdirSync(path.join(agents, "scout")); fs.writeFileSync(path.join(agents, "scout", "agent.md"), "x");
  fs.mkdirSync(path.join(teams, "squad")); fs.writeFileSync(path.join(teams, "squad", "team.md"), "x");
  await sleep(1000);
  if (!evA.includes("scout")) missAgents++;
  if (evT.includes("squad")) ok++; else { miss++; console.log("RAW-MISS", i, JSON.stringify(evA), JSON.stringify(evT)); }
  wA.close(); wT.close(); fs.rmSync(base, { recursive: true, force: true });
}
console.log("RAW RESULT", JSON.stringify({ N, DELAY, ok, miss, missAgents }));
