/**
 * autobyteus-638 DS-001: the running-run recorder keeps `running-runs.json` as the runs a person started whose entry
 * agent is running (an Agent run's agent, a Team's coordinator) plus the restorer's pending runs, rewriting it only on
 * change and removing it when the set is empty. The first check always reconciles the file it finds (AR-002); Org roots
 * are never recorded (R-3); an `error` entry agent is recorded (R-2); the final write waits for "started by a person"
 * reads in flight, bounded (R-1). Temporary data root only; short check interval.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RunningRunRecorder } from "../../../src/restart-resume/running-run-recorder.js";
import { readRunningRunRecord, runningRunRecordPath, writeRunningRunRecord } from "../../../src/restart-resume/running-run-record.js";

let appDataDir: string;
let recordPath: string;
const recorders: RunningRunRecorder[] = [];
const agent = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent", rootRunId });
const team = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent_team", rootRunId });
const org = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent_org", rootRunId });

type LiveRoot = { root: RootExecutionIdentity; statuses: Array<{ agentRunId: string; status: string }>; coordinator?: string };

/** The node's live roots (mutable between checks), who started each, and the restorer's pending runs. */
const world = () => {
  const live: LiveRoot[] = [];
  const person = new Map<string, boolean | (() => Promise<boolean>)>();
  const pending: RootExecutionIdentity[] = [];
  const listingFactsOf = vi.fn(async (root: RootExecutionIdentity) => {
    const fact = person.get(root.rootRunId);
    if (fact === undefined) return null;
    return { startedByPerson: typeof fact === "function" ? await fact() : fact } as never;
  });
  return {
    live, person, pending, listingFactsOf,
    deps: {
      running: {
        liveRoots: () => live.map((entry) => entry.root),
        statusesOf: (root: RootExecutionIdentity) => (live.find((entry) => entry.root.rootRunId === root.rootRunId)?.statuses ?? [])
          .filter((status) => status.status !== "offline").map((status) => ({ ...status, backgroundTasksRunning: 0 })) as never,
        teamCoordinatorOf: (teamRunId: string) => live.find((entry) => entry.root.rootRunId === teamRunId)?.coordinator ?? null,
      },
      runFiles: { listingFactsOf },
      pending: { pending: () => [...pending] },
    },
  };
};

const recorder = (w: ReturnType<typeof world>, extra: Partial<ConstructorParameters<typeof RunningRunRecorder>[0]> = {}) => {
  const created = new RunningRunRecorder({ ...w.deps, recordPath, intervalMs: 10, ...extra });
  recorders.push(created);
  return created;
};
const read = async () => {
  const result = await readRunningRunRecord(recordPath);
  return result.kind === "present" ? result.record.runs : result.kind;
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "running-run-recorder-"));
  recordPath = runningRunRecordPath(appDataDir);
});
afterEach(async () => {
  for (const created of recorders.splice(0)) await created.record();
  vi.restoreAllMocks();
  await fs.rm(appDataDir, { recursive: true, force: true });
});

describe("RunningRunRecorder", () => {
  it("records a person's idle Agent run and a Team whose coordinator runs; never a delegated run, an Org or a Team without its coordinator", async () => {
    const w = world();
    w.live.push(
      { root: agent("ptm"), statuses: [{ agentRunId: "ptm", status: "idle" }] },
      { root: agent("delegated"), statuses: [{ agentRunId: "delegated", status: "idle" }] },
      { root: team("team-live"), statuses: [{ agentRunId: "lead", status: "idle" }], coordinator: "lead" },
      { root: team("team-cold"), statuses: [{ agentRunId: "worker", status: "running" }], coordinator: "lead-cold" },
      { root: org("org-1"), statuses: [{ agentRunId: "unit", status: "idle" }] },
      { root: agent("offline"), statuses: [{ agentRunId: "offline", status: "offline" }] },
    );
    for (const id of ["ptm", "team-live", "team-cold", "org-1", "offline"]) w.person.set(id, true);
    w.person.set("delegated", false);
    recorder(w).startSession();
    await vi.waitFor(async () => expect(await read()).toEqual([agent("ptm"), team("team-live")]));
    // R-3: an Org root is skipped before its run file is read.
    expect(w.listingFactsOf).not.toHaveBeenCalledWith(org("org-1"));
  });

  it("R-2: records a run whose entry agent is in error", async () => {
    const w = world();
    w.live.push({ root: agent("broken"), statuses: [{ agentRunId: "broken", status: "error" }] });
    w.person.set("broken", true);
    recorder(w).startSession();
    await vi.waitFor(async () => expect(await read()).toEqual([agent("broken")]));
  });

  it("AR-002: the first check removes a stale or invalid file when nothing runs and nothing is pending", async () => {
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    await fs.writeFile(recordPath, "{ not a record");
    recorder(world()).startSession();
    await vi.waitFor(async () => expect(await read()).toBe("missing"));
    await writeRunningRunRecord(recordPath, { runs: [agent("stale")] });
    const second = recorder(world());
    second.startSession();
    await vi.waitFor(async () => expect(await read()).toBe("missing"));
  });

  it("rewrites the file only when the set changes, and removes it when the set is empty", async () => {
    const w = world();
    w.live.push({ root: agent("a"), statuses: [{ agentRunId: "a", status: "idle" }] });
    w.person.set("a", true); w.person.set("b", true);
    recorder(w).startSession();
    await vi.waitFor(async () => expect(await read()).toEqual([agent("a")]));
    // An unchanged set is not rewritten: a marker written into the file stays.
    await fs.writeFile(recordPath, JSON.stringify({ runs: [agent("a")], marker: true }));
    await pause(50);
    expect(JSON.parse(await fs.readFile(recordPath, "utf8")).marker).toBe(true);
    w.live.push({ root: agent("b"), statuses: [{ agentRunId: "b", status: "running" }] });
    await vi.waitFor(async () => expect(await read()).toEqual([agent("a"), agent("b")]));
    w.live.splice(0);
    await vi.waitFor(async () => expect(await read()).toBe("missing"));
    expect(w.listingFactsOf).toHaveBeenCalledTimes(2);
  });

  it("records running ∪ pending: the restorer's taken runs stay until it has handled them (AR-001)", async () => {
    const w = world();
    w.pending.push(agent("taken-1"), team("taken-team"));
    w.live.push({ root: agent("live"), statuses: [{ agentRunId: "live", status: "idle" }] });
    w.person.set("live", true);
    const created = recorder(w);
    created.startSession();
    await vi.waitFor(async () => expect(await read()).toEqual([agent("live"), agent("taken-1"), team("taken-team")]));
    w.pending.splice(0, 1);
    await vi.waitFor(async () => expect(await read()).toEqual([agent("live"), team("taken-team")]));
    await created.record();
    expect(await read()).toEqual([agent("live"), team("taken-team")]);
  });

  it("R-1: the final write waits for a read in flight; a read past the budget is left out and logged", async () => {
    const w = world();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    w.person.set("quick", () => pause(30).then(() => true));
    w.person.set("slow", () => pause(500).then(() => true));
    const created = recorder(w, { intervalMs: 60_000, startedByPersonBudgetMs: 100 });
    created.startSession();
    w.live.push(
      { root: agent("quick"), statuses: [{ agentRunId: "quick", status: "idle" }] },
      { root: agent("slow"), statuses: [{ agentRunId: "slow", status: "idle" }] },
    );
    await created.record();
    expect(await read()).toEqual([agent("quick")]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Running run 'agent:slow' was left out of the running-run record"));
  });

  it("writes nothing before startSession, and the final write is the only one after the stop", async () => {
    const w = world();
    w.live.push({ root: agent("a"), statuses: [{ agentRunId: "a", status: "idle" }] });
    w.person.set("a", true);
    const created = recorder(w);
    await pause(30);
    expect(await read()).toBe("missing");
    await created.record();
    expect(await read()).toBe("missing");
  });

  it("a run file that cannot be read leaves that root out, logged; the others are recorded", async () => {
    const w = world();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    w.live.push({ root: agent("ok"), statuses: [{ agentRunId: "ok", status: "idle" }] }, { root: agent("bad"), statuses: [{ agentRunId: "bad", status: "idle" }] });
    w.person.set("ok", true);
    w.person.set("bad", () => Promise.reject(new Error("EACCES")));
    recorder(w).startSession();
    await vi.waitFor(async () => expect(await read()).toEqual([agent("ok")]));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Running run 'agent:bad' is not recorded: its run file could not be read"));
  });
});
