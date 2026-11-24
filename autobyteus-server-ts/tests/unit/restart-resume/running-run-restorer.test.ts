/**
 * autobyteus-638 DS-002: the running-run restorer takes the record at startup without removing it, and brings each run
 * back idle (its root restored, its entry agent made ready, nothing posted), at most 3 at a time. Archived, stopped,
 * gone, delegated and already-running runs are skipped; a failure is logged and the others go on (REQ-003, REQ-004).
 * A run leaves `pending` once handled, and a stop or crash during the restore keeps the runs not yet handled in the
 * record (AR-001, walk 4b). Temporary data root only.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { ResolvedRoot } from "../../../src/compositions/collaboration-root-resolver.js";
import type { RootHistoryState } from "../../../src/restart-resume/restart-resumer.js";
import { RunningRunRecorder } from "../../../src/restart-resume/running-run-recorder.js";
import { readRunningRunRecord, runningRunRecordPath, writeRunningRunRecord } from "../../../src/restart-resume/running-run-record.js";
import { RunningRunRestorer } from "../../../src/restart-resume/running-run-restorer.js";

let appDataDir: string;
let recordPath: string;
const agent = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent", rootRunId });
const team = (rootRunId: string): RootExecutionIdentity => ({ rootSubjectKind: "agent_team", rootRunId });
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>((r) => { resolve = r; }); return { promise, resolve }; };

/** The node: history per run, who started it, which agents run, and roots that restore (or throw). */
const node = () => {
  const history = new Map<string, RootHistoryState | RootHistoryState[]>();
  const person = new Map<string, boolean>();
  const running = new Set<string>();
  const coordinators = new Map<string, string>();
  const restoreFails = new Map<string, Error>();
  const gates = new Map<string, Promise<void>>();
  const ready: string[] = [];
  const posted: string[] = [];
  const agentRoot = (id: string) => ({
    ensureAgentReady: vi.fn(async () => { ready.push(id); running.add(id); return {} as never; }),
    postAgentUserMessage: vi.fn(async () => { posted.push(id); return { kind: "posted" } as never; }),
  });
  const teamRoot = (id: string) => ({
    ensureAgentReady: vi.fn(async (agentRunId: string) => { ready.push(`${id}/${agentRunId}`); running.add(agentRunId); return {} as never; }),
    executeAgentCommand: vi.fn(async () => { posted.push(id); return { accepted: true } as never; }),
  });
  const resolveOrRestore = vi.fn(async (root: RootExecutionIdentity): Promise<ResolvedRoot | null> => {
    await gates.get(root.rootRunId);
    const failure = restoreFails.get(root.rootRunId);
    if (failure) throw failure;
    if (!history.has(root.rootRunId)) return null;
    return (root.rootSubjectKind === "agent" ? { kind: "agent", root: agentRoot(root.rootRunId) } : { kind: "agent_team", root: teamRoot(root.rootRunId) }) as never;
  });
  const rootHistory = vi.fn(async (root: RootExecutionIdentity): Promise<RootHistoryState> => {
    const state = history.get(root.rootRunId) ?? "gone";
    return Array.isArray(state) ? (state.length > 1 ? state.shift()! : state[0]!) : state;
  });
  return {
    history, person, running, coordinators, restoreFails, gates, ready, posted, resolveOrRestore, rootHistory,
    restorer: (concurrency?: number) => new RunningRunRestorer({
      recordPath, rootHistory,
      runFiles: { listingFactsOf: async (root) => (person.has(root.rootRunId) ? { startedByPerson: person.get(root.rootRunId)! } as never : null) },
      running: {
        rootOf: (agentRunId: string) => (running.has(agentRunId) ? { root: agent(agentRunId), status: { agentRunId, status: "idle", backgroundTasksRunning: 0 } } as never : null),
        teamCoordinatorOf: (teamRunId: string) => coordinators.get(teamRunId) ?? null,
      },
      rootResolver: { resolveOrRestore } as never,
      ...(concurrency ? { concurrency } : {}),
    }),
  };
};
const personRun = (n: ReturnType<typeof node>, id: string) => { n.history.set(id, "present"); n.person.set(id, true); };
const read = async () => {
  const result = await readRunningRunRecord(recordPath);
  return result.kind === "present" ? result.record.runs : result.kind;
};

beforeEach(async () => {
  appDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "running-run-restorer-"));
  recordPath = runningRunRecordPath(appDataDir);
});
afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(appDataDir, { recursive: true, force: true });
});

describe("RunningRunRestorer.take", () => {
  it("reads the record into pending without removing the file", async () => {
    await writeRunningRunRecord(recordPath, { runs: [team("t"), agent("a")] });
    const restorer = node().restorer();
    await restorer.take();
    expect(restorer.pending()).toEqual([agent("a"), team("t")]);
    expect(await read()).toEqual([agent("a"), team("t")]);
  });

  it("an invalid record is logged and nothing is taken; a missing one takes nothing silently", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const restorer = node().restorer();
    await restorer.take();
    expect(restorer.pending()).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    await fs.mkdir(path.dirname(recordPath), { recursive: true });
    await fs.writeFile(recordPath, "{");
    await restorer.take();
    expect(restorer.pending()).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("the running-run record is invalid, so none is brought back"));
  });
});

describe("RunningRunRestorer.restore", () => {
  it("brings back an idle Agent run and a Team's coordinator without posting anything (walks 1, 3)", async () => {
    const n = node();
    personRun(n, "ptm"); personRun(n, "team-1"); n.coordinators.set("team-1", "lead");
    await writeRunningRunRecord(recordPath, { runs: [agent("ptm"), team("team-1")] });
    const restorer = n.restorer();
    await restorer.take();
    expect(await restorer.restore()).toEqual({ restored: 2, skipped: 0, failed: 0 });
    expect(n.ready.sort()).toEqual(["ptm", "team-1/lead"]);
    expect(n.posted).toEqual([]);
    expect(restorer.pending()).toEqual([]);
  });

  it("skips archived, stopped, gone, delegated and already-running runs, each logged (REQ-003, walks 4, 7)", async () => {
    const n = node();
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    n.history.set("archived", "archived"); n.person.set("archived", true);
    n.history.set("stopped", "terminated"); n.person.set("stopped", true);
    n.person.set("gone", true);
    n.history.set("delegated", "present"); n.person.set("delegated", false);
    personRun(n, "woken"); n.running.add("woken");
    personRun(n, "team-woken"); n.coordinators.set("team-woken", "lead-w"); n.running.add("lead-w");
    await writeRunningRunRecord(recordPath, { runs: ["archived", "stopped", "gone", "delegated", "woken"].map(agent).concat(team("team-woken")) });
    const restorer = n.restorer();
    await restorer.take();
    expect(await restorer.restore()).toEqual({ restored: 0, skipped: 6, failed: 0 });
    expect(n.ready).toEqual([]);
    for (const line of ["'agent:archived' skipped: it is archived", "'agent:stopped' skipped: it was stopped", "'agent:gone' skipped: it is no longer in history",
      "'agent:delegated' skipped: it was not started by a person", "'agent:woken' skipped: it is already running", "'agent_team:team-woken' skipped: it is already running"]) {
      expect(info).toHaveBeenCalledWith(expect.stringContaining(line));
    }
    expect(info).toHaveBeenCalledWith("Running runs after the restart: 0 brought back, 6 skipped, 0 failed");
  });

  it("a run archived during its restore is not made ready (walk 6)", async () => {
    const n = node();
    n.history.set("late", ["present", "archived"]); n.person.set("late", true);
    await writeRunningRunRecord(recordPath, { runs: [agent("late")] });
    const restorer = n.restorer();
    await restorer.take();
    expect(await restorer.restore()).toEqual({ restored: 0, skipped: 1, failed: 0 });
    expect(n.ready).toEqual([]);
  });

  it("a run that cannot come back is logged with its reason; the others come back (REQ-004, walk 9)", async () => {
    const n = node();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    personRun(n, "broken"); n.restoreFails.set("broken", new Error("runtime 'claude' is not installed"));
    personRun(n, "no-lead"); // a Team without a coordinator
    personRun(n, "fine");
    n.person.set("elsewhere", true); n.history.set("elsewhere", "present");
    await writeRunningRunRecord(recordPath, { runs: [agent("broken"), team("no-lead"), agent("fine")] });
    const restorer = n.restorer();
    await restorer.take();
    expect(await restorer.restore()).toEqual({ restored: 1, skipped: 0, failed: 2 });
    expect(n.ready).toEqual(["fine"]);
    expect(warn).toHaveBeenCalledWith("Running run 'agent:broken' was not brought back: runtime 'claude' is not installed");
    expect(warn).toHaveBeenCalledWith("Running run 'agent_team:no-lead' was not brought back: its Team has no coordinator");
  });

  it("restores at most 3 at a time, and each run leaves pending once handled", async () => {
    const n = node();
    const ids = ["r1", "r2", "r3", "r4", "r5"];
    const gates = ids.map(() => deferred());
    ids.forEach((id, index) => { personRun(n, id); n.gates.set(id, gates[index]!.promise); });
    await writeRunningRunRecord(recordPath, { runs: ids.map(agent) });
    const restorer = n.restorer();
    await restorer.take();
    const done = restorer.restore();
    await vi.waitFor(() => expect(n.resolveOrRestore).toHaveBeenCalledTimes(3));
    await pause(20);
    expect(n.resolveOrRestore).toHaveBeenCalledTimes(3);
    gates[0]!.resolve();
    await vi.waitFor(() => expect(restorer.pending()).not.toContainEqual(agent("r1")));
    await vi.waitFor(() => expect(n.resolveOrRestore).toHaveBeenCalledTimes(4));
    expect(restorer.pending()).toHaveLength(4);
    gates.forEach((gate) => gate.resolve());
    expect(await done).toEqual({ restored: 5, skipped: 0, failed: 0 });
    expect(restorer.pending()).toEqual([]);
  });

  it("nothing taken: nothing restored and nothing logged", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const restorer = node().restorer();
    await restorer.take();
    expect(await restorer.restore()).toEqual({ restored: 0, skipped: 0, failed: 0 });
    expect(info).not.toHaveBeenCalled();
  });
});

describe("a stop or crash during the restore window keeps the runs not yet handled (AR-001, walk 4b)", () => {
  it("the recorder's writes are running ∪ pending until every taken run is handled", async () => {
    const n = node();
    personRun(n, "slow"); personRun(n, "quick");
    const slow = deferred();
    n.gates.set("slow", slow.promise);
    await writeRunningRunRecord(recordPath, { runs: [agent("slow"), agent("quick")] });
    const restorer = n.restorer();
    await restorer.take();
    const liveRoots = () => [...n.running].map(agent);
    const recorder = new RunningRunRecorder({ recordPath, intervalMs: 10, pending: restorer,
      running: { liveRoots, statusesOf: (root) => [{ agentRunId: root.rootRunId, status: "idle", backgroundTasksRunning: 0 }] as never, teamCoordinatorOf: () => null },
      runFiles: { listingFactsOf: async () => ({ startedByPerson: true }) as never } });
    recorder.startSession();
    const restoring = restorer.restore();
    await vi.waitFor(() => expect(n.ready).toEqual(["quick"]));
    // A crash now leaves the last write: "quick" is running, "slow" is still pending.
    await vi.waitFor(async () => expect(await read()).toEqual([agent("quick"), agent("slow")]));
    // A graceful stop now writes the same.
    await recorder.record();
    expect(await read()).toEqual([agent("quick"), agent("slow")]);
    slow.resolve();
    await restoring;
  });
});
