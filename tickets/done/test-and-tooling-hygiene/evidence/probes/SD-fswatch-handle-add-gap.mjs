import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const N = Number(process.env.N ?? 150), ADD = process.env.ADD !== "0", GAP = Number(process.env.GAP ?? 0);
let miss = 0, ok = 0;
for (let i = 0; i < N; i++) {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "raw-")));
  const agents = path.join(base, "agents"), teams = path.join(base, "agent-teams");
  fs.mkdirSync(agents); fs.mkdirSync(teams);
  const evT = []; const extra = [];
  const wA = fs.watch(agents, (e, f) => { if (ADD && f === "scout" && !extra.length) extra.push(fs.watch(path.join(agents, "scout"), () => {})); });
  const wT = fs.watch(teams, (e, f) => evT.push(f));
  await sleep(300);
  fs.mkdirSync(path.join(agents, "scout")); fs.writeFileSync(path.join(agents, "scout", "agent.md"), "x");
  if (GAP) await sleep(GAP);
  fs.mkdirSync(path.join(teams, "squad")); fs.writeFileSync(path.join(teams, "squad", "team.md"), "x");
  await sleep(800);
  if (evT.includes("squad")) ok++; else miss++;
  wA.close(); wT.close(); extra.forEach((w) => w.close()); fs.rmSync(base, { recursive: true, force: true });
}
console.log("RAW2", JSON.stringify({ N, ADD, GAP, ok, miss }));
