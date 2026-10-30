import { describe, expect, it, vi } from "vitest";
import { terminateServerProcessTree, type ProcessTreeSweepDeps } from "../../../src/shutdown/server-process-tree-sweep.js";
import { parseProcessTable } from "../../../src/utils/process-tree.js";

// pid ppid pgid. Electron (50) spawned the server (100) without detaching, so they share group 50.
// 200: Claude CLI in the server's group; 201: its child in the same group.
// 300: a tool command leading its own group; 301: its child, re-parented to init after the snapshot.
// 400: a descendant in a group led by a non-descendant (900): not ours to signal as a group.
// 60: Electron's other child in group 50: never a target.
const TABLE = parseProcessTable(`
    1     0     1
   50     1    50
   60    50    50
  100    50    50
  200   100    50
  201   200    50
  300   200   300
  301   300   300
  400   100   900
  900     1   900
`);

/** A fake process table and signal surface: `alive` holds targets that still exist. */
const harness = (options: { exitsOn?: Partial<Record<number, NodeJS.Signals>>; eperm?: number[] } = {}) => {
  const alive = new Set([200, 201, -300]);
  const signals: Array<[number, NodeJS.Signals | 0]> = [];
  let clock = 0;
  const deps: Partial<ProcessTreeSweepDeps> = {
    platform: "darwin",
    rootPid: 100,
    readTable: vi.fn(() => TABLE),
    kill: vi.fn((target: number, signal: NodeJS.Signals | 0) => {
      signals.push([target, signal]);
      if (options.eperm?.includes(target) && signal !== 0) throw Object.assign(new Error("denied"), { code: "EPERM" });
      if (!alive.has(target)) throw Object.assign(new Error("gone"), { code: "ESRCH" });
      const exitsOn = options.exitsOn?.[target] ?? "SIGTERM";
      if (signal === exitsOn || signal === "SIGKILL") alive.delete(target);
    }),
    now: () => clock,
    sleep: vi.fn(async (ms: number) => { clock += ms; }),
    log: vi.fn(),
  };
  return { deps, alive, signals, sent: () => signals.filter(([, signal]) => signal !== 0) };
};

describe("server process-tree sweep", () => {
  it("records the server-group descendants and descendant-led groups, then SIGTERMs only those", async () => {
    const h = harness();
    await expect(terminateServerProcessTree(h.deps)).resolves.toEqual({ outcome: "confirmed", targets: 3 });
    expect(h.sent()).toEqual([[200, "SIGTERM"], [201, "SIGTERM"], [-300, "SIGTERM"]]);
    expect(h.deps.readTable).toHaveBeenCalledOnce();
  });

  it("never signals the server, its own group, a sibling in that group, or a group led by a non-descendant", async () => {
    const h = harness();
    await terminateServerProcessTree(h.deps);
    const targets = h.signals.map(([target]) => target);
    for (const excluded of [100, -50, 50, 60, -900, 900, 400, 1, -1]) expect(targets).not.toContain(excluded);
  });

  it("SIGKILLs only recorded survivors after the grace, without re-reading the table", async () => {
    const h = harness({ exitsOn: { 201: "SIGKILL", [-300]: "SIGKILL" } });
    await expect(terminateServerProcessTree(h.deps)).resolves.toEqual({ outcome: "confirmed", targets: 3 });
    expect(h.sent()).toEqual([
      [200, "SIGTERM"], [201, "SIGTERM"], [-300, "SIGTERM"],
      [201, "SIGKILL"], [-300, "SIGKILL"],
    ]);
    expect(h.deps.readTable).toHaveBeenCalledOnce();
    const sleptMs = vi.mocked(h.deps.sleep!).mock.calls.reduce((sum, [ms]) => sum + ms, 0);
    expect(sleptMs).toBeGreaterThanOrEqual(1_500);
  });

  it("kills a re-parented group member through its recorded group", async () => {
    // 301 is re-parented to init after the snapshot; the recorded group -300 still reaches it.
    const h = harness({ exitsOn: { [-300]: "SIGKILL" } });
    await terminateServerProcessTree(h.deps);
    expect(h.sent()).toContainEqual([-300, "SIGKILL"]);
    expect(h.alive.has(-300)).toBe(false);
  });

  it("confirms with no targets and sends nothing when the server has no descendants", async () => {
    const h = harness();
    vi.mocked(h.deps.readTable!).mockReturnValue(parseProcessTable("   50 1 50\n  100 50 50\n"));
    await expect(terminateServerProcessTree(h.deps)).resolves.toEqual({ outcome: "confirmed", targets: 0 });
    expect(h.signals).toEqual([]);
  });

  it("skips targets already gone (ESRCH) and continues past a permission failure (EPERM)", async () => {
    const h = harness({ eperm: [200] });
    h.alive.delete(201);
    const result = await terminateServerProcessTree(h.deps);
    expect(h.sent()).toEqual(expect.arrayContaining([[201, "SIGTERM"], [-300, "SIGTERM"], [200, "SIGTERM"], [200, "SIGKILL"]]));
    expect(h.alive.has(-300)).toBe(false);
    expect(h.deps.log).toHaveBeenCalledWith(expect.stringContaining("could not SIGTERM pid 200"));
    expect(result).toEqual({ outcome: "unconfirmed", targets: 3, reason: "still alive after SIGKILL: pid 200" });
  });

  it("reports unconfirmed when a recorded target is still alive after SIGKILL", async () => {
    const h = harness();
    const deps = { ...h.deps, kill: vi.fn((target: number, signal: NodeJS.Signals | 0) => {
      if (target === 200) return; // stuck: never exits
      h.deps.kill!(target, signal);
    }) };
    await expect(terminateServerProcessTree(deps)).resolves.toEqual({
      outcome: "unconfirmed", targets: 3, reason: "still alive after SIGKILL: pid 200",
    });
  });

  it("reports unconfirmed and signals nothing when the process table cannot be read", async () => {
    const h = harness();
    vi.mocked(h.deps.readTable!).mockImplementation(() => { throw new Error("spawn ps ENOENT"); });
    await expect(terminateServerProcessTree(h.deps)).resolves.toEqual({
      outcome: "unconfirmed", targets: 0, reason: "process table unreadable: Error: spawn ps ENOENT",
    });
    expect(h.signals).toEqual([]);
  });

  it("is not applicable on win32: no process table and no signals", async () => {
    const h = harness();
    await expect(terminateServerProcessTree({ ...h.deps, platform: "win32" })).resolves.toEqual({ outcome: "not-applicable" });
    expect(h.deps.readTable).not.toHaveBeenCalled();
    expect(h.signals).toEqual([]);
  });
});
