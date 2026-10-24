import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it } from "vitest";
import chokidar from "chokidar";
import { AgentPackageFolderWatcher } from "../../src/agent-package-definitions/monitor/agent-package-folder-watcher.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const write = async (p: string, c: string) => { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, c); };

const N = Number(process.env.PROBE_N ?? 60);
const DELAY = Number(process.env.PROBE_DELAY ?? 300);
const MODE = process.env.PROBE_MODE ?? "agent+team";

it("probe", { timeout: 600_000 }, async () => {
  const stats = { miss: 0, ok: 0, lateMs: [] as number[], events: {} as Record<string, number> };
  for (let i = 0; i < N; i += 1) {
    const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "wprobe-")));
    const root = path.join(base, "pkg");
    await fs.mkdir(path.join(root, "agents", "planner"), { recursive: true });
    await fs.mkdir(path.join(root, "agent-teams"), { recursive: true });
    await write(path.join(root, "agents", "planner", "agent.md"), "x");
    const marks: Array<{ t: number; kind: string; id: string }> = [];
    const raw: string[] = [];
    const w = new AgentPackageFolderWatcher({
      createWatcher: (paths, options) => {
        const c = chokidar.watch(paths, { ignoreInitial: true, persistent: true, ignored: options.ignored });
        c.on("all", (e, f) => raw.push(`${Date.now()}:${e}:${path.relative(root, f)}`));
        c.on("raw", (ev: string, p: string, d: unknown) => raw.push(`${Date.now()}:RAW:${ev}:${path.relative(root, String(p))}:${path.relative(root, String((d as any)?.watchedPath ?? ""))}`));
        const nh = (c as any)._nodeFsHandler; const orig = nh._handleRead.bind(nh);
        nh._handleRead = (dir: string, ...rest: unknown[]) => { const th = (c as any)._throttled?.get("readdir")?.has(path.join(dir, "")); raw.push(`${Date.now()}:HR:${path.relative(root, dir)}:throttledAlready=${th}`); return orig(dir, ...rest); };
        c.on("ready", () => raw.push(`${Date.now()}:READY`));
        return c as never;
      },
      sink: { markFolderChanged: (kind, id) => marks.push({ t: Date.now(), kind, id }), markPackageFolderChanged: () => undefined },
    });
    await w.syncPackageFolders([{ rootPath: root, sourceClass: "registered_package", kindDirs: { agents: path.join(root, "agents"), "agent-teams": path.join(root, "agent-teams"), "agent-orgs": path.join(root, "agent-orgs") } } as never]);
    await w.whenReady();
    if (DELAY) await sleep(DELAY);
    const t0 = Date.now();
    if (MODE.includes("agent")) {
      await write(path.join(root, "agents", "scout", "agent.md"), "a");
      await write(path.join(root, "agents", "scout", "agent-config.json"), "{}");
    }
    await write(path.join(root, "agent-teams", "squad", "team.md"), "t");
    await write(path.join(root, "agent-teams", "squad", "team-config.json"), "{}");
    const t1 = Date.now();
    let seen: number | null = null;
    while (Date.now() - t0 < 3000) {
      const m = marks.find((x) => x.kind === "agent_team" && x.id === "squad");
      if (m) { seen = m.t - t0; break; }
      await sleep(10);
    }
    // last mark time for squad after a settle period: did we see a mark AFTER the last file write?
    await sleep(400);
    const lastSquad = [...marks].reverse().find((x) => x.kind === "agent_team" && x.id === "squad");
    const afterWrites = lastSquad ? lastSquad.t >= t1 : false;
    if (seen === null) { stats.miss += 1; 
      const armed = raw.find((x) => x.includes("READY"));
      console.log(`MISS iteration ${i} agent-marks=${marks.filter((x) => x.kind === "agent").length} t0=${t0} ready=${armed} raw=${JSON.stringify(raw.map((x) => x.replace(/^\d+/, (m) => String(Number(m) - t0))))}`);
      // is the parent live now? write another folder
      const t2 = Date.now();
      await write(path.join(root, "agent-teams", "squad2", "team.md"), "t");
      await sleep(300);
      console.log(`  AFTER-MISS squad2 marks=${marks.some((x) => x.id === "squad2")} rawNew=${JSON.stringify(raw.filter((x) => Number(x.split(":")[0]) >= t2).map((x) => x.replace(/^\d+/, (m) => String(Number(m) - t0))))}`);
 }
    else { stats.ok += 1; stats.lateMs.push(seen); if (!afterWrites) stats.events["noMarkAfterLastWrite"] = (stats.events["noMarkAfterLastWrite"] ?? 0) + 1; }
    await w.close();
    await fs.rm(base, { recursive: true, force: true });
  }
  stats.lateMs.sort((a, b) => a - b);
  console.log("RESULT", JSON.stringify({ N, DELAY, MODE, miss: stats.miss, ok: stats.ok, p50: stats.lateMs[Math.floor(stats.lateMs.length / 2)], max: stats.lateMs[stats.lateMs.length - 1], events: stats.events }));
});
