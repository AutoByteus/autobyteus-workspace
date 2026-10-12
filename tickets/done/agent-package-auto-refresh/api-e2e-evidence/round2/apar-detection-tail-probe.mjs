// API/E2E temporary probe (API-REV-002): detection latency of new agent vs new Team folders (built monitor, macOS).
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const { PackageDefinitionMonitor } = await import(path.join(process.argv[2], "definition-catalog/monitor/package-definition-monitor.js"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const base = await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "apar-tail-")));
const root = path.join(base, "pkg");
for (const k of ["agents", "agent-teams", "agent-orgs"]) await fsp.mkdir(path.join(root, k), { recursive: true });
const seen = new Map();
const m = new PackageDefinitionMonitor({ sink: { noteUnitChange: (s, u) => { const k = `${s}:${u}`; if (!seen.has(k)) seen.set(k, Date.now()); }, noteRootChanged: () => {} } });
await m.syncRoots([{ rootPath: root, sourceClass: "external_read_only", kindDirs: { agents: path.join(root, "agents"), "agent-teams": path.join(root, "agent-teams"), "agent-orgs": path.join(root, "agent-orgs") } }]);
await m.whenReady(); await sleep(1500);
const agentMs = [], teamMs = [];
for (let i = 0; i < 40; i++) {
  const t0 = Date.now();
  await fsp.mkdir(path.join(root, "agents", `a${i}`), { recursive: true });
  await fsp.writeFile(path.join(root, "agents", `a${i}`, "agent.md"), "---\nname: A\ndescription: d\n---\nx\n");
  await fsp.writeFile(path.join(root, "agents", `a${i}`, "agent-config.json"), "{}");
  await fsp.mkdir(path.join(root, "agent-teams", `t${i}`), { recursive: true });
  await fsp.writeFile(path.join(root, "agent-teams", `t${i}`, "team.md"), "---\nname: T\ndescription: d\n---\nx\n");
  await fsp.writeFile(path.join(root, "agent-teams", `t${i}`, "team-config.json"), "{}");
  for (let w = 0; w < 300 && !(seen.has(`agent:a${i}`) && seen.has(`agent_team:t${i}`)); w++) await sleep(10);
  agentMs.push((seen.get(`agent:a${i}`) ?? NaN) - t0); teamMs.push((seen.get(`agent_team:t${i}`) ?? NaN) - t0);
  await sleep(i % 3 === 0 ? 50 : 1200);
}
await m.close(); await fsp.rm(base, { recursive: true, force: true });
const stats = (a) => { const s = [...a].sort((x, y) => x - y); return { min: s[0], p50: s[Math.floor(s.length / 2)], p90: s[Math.floor(s.length * 0.9)], max: s.at(-1), over300: a.filter((x) => !(x <= 300)).length }; };
console.log(JSON.stringify({ trials: 40, agent: stats(agentMs), team: stats(teamMs), agentMs, teamMs }));
