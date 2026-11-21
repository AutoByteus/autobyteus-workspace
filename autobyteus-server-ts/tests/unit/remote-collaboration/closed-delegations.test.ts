import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClosedDelegations } from "../../../src/remote-collaboration/inbound/closed-delegations.js";
import { DelegatedRunStateHandler } from "../../../src/remote-collaboration/inbound/delegated-run-state-handler.js";

/**
 * autobyteus-591 DN-5 (SR-009) and DN-2: B's one record of the peer-started runs their delegating node closed, and the
 * handler that records, stops and reopens them for that node only.
 */

const A = "srv_node_a_000000000000000000000000000";
const C = "srv_node_c_000000000000000000000000000";
const AGENT = { kind: "agent" as const, runId: "publisher_r1" };
const TEAM = { kind: "agent_team" as const, runId: "studio_team_b" };
const T0 = new Date("2026-11-21T10:00:00.000Z");
const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});
const appData = async () => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), "closed-delegations-")); directories.push(dir); return dir; };
const fileOf = (dir: string) => path.join(dir, "remote-collaboration", "closed-delegations.json");
const loaded = async (dir: string) => { const record = ClosedDelegations.inAppDataDir(dir, () => T0); await record.load(); return record; };

describe("ClosedDelegations", () => {
  it("absence means open: no file is an empty record; close writes a plain list, reloaded after a restart; open removes it", async () => {
    const dir = await appData();
    const record = await loaded(dir);
    expect(record.has(AGENT)).toBe(false);
    await record.close(AGENT, A);
    await record.close(TEAM, A);
    expect(JSON.parse(await fs.readFile(fileOf(dir), "utf8"))).toEqual([
      { kind: "agent", runId: "publisher_r1", nodeId: A, closedAt: T0.toISOString() },
      { kind: "agent_team", runId: "studio_team_b", nodeId: A, closedAt: T0.toISOString() }]);
    const restarted = await loaded(dir);
    expect([restarted.has(AGENT), restarted.has(TEAM), restarted.has({ kind: "agent", runId: "studio_team_b" })]).toEqual([true, true, false]);
    await restarted.open(AGENT);
    expect(JSON.parse(await fs.readFile(fileOf(dir), "utf8"))).toEqual([{ kind: "agent_team", runId: "studio_team_b", nodeId: A, closedAt: T0.toISOString() }]);
  });

  it("is idempotent: a closed run keeps its first time; opening an open run writes nothing", async () => {
    const dir = await appData();
    let now = T0;
    const record = ClosedDelegations.inAppDataDir(dir, () => now);
    await record.load();
    await record.close(AGENT, A);
    now = new Date("2026-11-22T10:00:00.000Z");
    await record.close(AGENT, A);
    expect(JSON.parse(await fs.readFile(fileOf(dir), "utf8"))[0].closedAt).toBe(T0.toISOString());
    await record.open(TEAM);
    expect(JSON.parse(await fs.readFile(fileOf(dir), "utf8"))).toHaveLength(1);
  });

  it("S-5: only the run's delegating node opens it by a message; another node's message leaves it closed", async () => {
    const record = await loaded(await appData());
    await record.close(AGENT, A);
    await record.openedBy(AGENT, C);
    expect(record.has(AGENT)).toBe(true);
    await record.openedBy(AGENT, A);
    expect(record.has(AGENT)).toBe(false);
  });

  it("a run deleted on this node leaves the record (ARCH-REV-004 note 1); an Org is never in it", async () => {
    const dir = await appData();
    const record = await loaded(dir);
    await record.close(AGENT, A);
    await record.close(TEAM, A);
    record.runDeleted({ rootSubjectKind: "agent_team", rootRunId: TEAM.runId });
    record.runDeleted({ rootSubjectKind: "agent_org", rootRunId: "org_1" });
    expect([record.has(AGENT), record.has(TEAM)]).toEqual([true, false]);
    await vi.waitFor(async () => expect(JSON.parse(await fs.readFile(fileOf(dir), "utf8"))).toHaveLength(1));
  });

  it("reads tolerantly: an unreadable file is an empty record with a warning; unknown fields and invalid entries are skipped", async () => {
    const dir = await appData();
    await fs.mkdir(path.dirname(fileOf(dir)), { recursive: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await fs.writeFile(fileOf(dir), "{ not json");
    expect((await loaded(dir)).has(AGENT)).toBe(false);
    await fs.writeFile(fileOf(dir), JSON.stringify({ closedDelegations: [] }));
    expect((await loaded(dir)).has(AGENT)).toBe(false);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledWith("CLOSED_DELEGATIONS_UNREADABLE", expect.objectContaining({ file: fileOf(dir) }));
    await fs.writeFile(fileOf(dir), JSON.stringify([{ kind: "agent", runId: "publisher_r1", later: true }, { kind: "agent_org", runId: "o" }, { kind: "agent" }, null]));
    const record = await loaded(dir);
    expect([record.has(AGENT), record.has({ kind: "agent", runId: "o" })]).toEqual([true, false]);
    // An entry with no node is opened by any node's message (it names none).
    await record.openedBy(AGENT, C);
    expect(record.has(AGENT)).toBe(false);
  });
});

describe("DelegatedRunStateHandler", () => {
  const setup = async (input: { stored?: "proceed" | "not_linked" | "not_found"; stop?: "stopped" | "kept_open" | "not_stopped" } = {}) => {
    const closed = await loaded(await appData());
    const order: string[] = [];
    const storedLinkCheck = vi.fn(async () => input.stored ?? "proceed");
    const stop = (kind: string) => vi.fn(async (runId: string, stillClosed: () => boolean) => {
      order.push(`stop ${kind} ${runId} (recorded: ${stillClosed()})`);
      return input.stop ?? "stopped";
    });
    const agentRuns = { stopForTaskClosure: stop("agent") };
    const teamRuns = { stopForTaskClosure: stop("agent_team") };
    const handler = new DelegatedRunStateHandler({ roots: { storedLinkCheck } as never, closed, agentRuns, teamRuns });
    const from = { nodeId: A, name: "desktop", baseUrl: "http://a", addedAt: T0.toISOString(), paired: true };
    const apply = (run: typeof AGENT | typeof TEAM, open: boolean) => handler.apply({ fromNodeId: A, toNodeId: "srv_b", run, open }, from);
    return { closed, order, storedLinkCheck, agentRuns, teamRuns, apply };
  };

  it("closed: checks the caller's own delegation, records the run, then stops it (team or agent); answered after the Stop", async () => {
    const f = await setup();
    await expect(f.apply(TEAM, false)).resolves.toEqual({ accepted: true, open: false });
    expect(f.storedLinkCheck).toHaveBeenCalledWith(TEAM, { kind: "owner", fromNodeId: A, targetAgentRunId: null });
    expect(f.order).toEqual(["stop agent_team studio_team_b (recorded: true)"]);
    await expect(f.apply(AGENT, false)).resolves.toEqual({ accepted: true, open: false });
    expect(f.order.at(-1)).toBe("stop agent publisher_r1 (recorded: true)");
    expect([f.closed.has(TEAM), f.closed.has(AGENT)]).toEqual([true, true]);
  });

  it("open: removes the record and starts nothing", async () => {
    const f = await setup();
    await f.apply(AGENT, false);
    await expect(f.apply(AGENT, true)).resolves.toEqual({ accepted: true, open: true });
    expect(f.closed.has(AGENT)).toBe(false);
    expect(f.agentRuns.stopForTaskClosure).toHaveBeenCalledOnce();
  });

  it("REQ-003: a run that is not the caller's delegation, or no run, is refused; nothing is recorded or stopped", async () => {
    const notLinked = await setup({ stored: "not_linked" });
    await expect(notLinked.apply(AGENT, false)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    const missing = await setup({ stored: "not_found" });
    await expect(missing.apply(AGENT, false)).resolves.toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_FOUND" });
    expect([notLinked.closed.has(AGENT), missing.closed.has(AGENT)]).toEqual([false, false]);
    expect(notLinked.order).toEqual([]);
    expect(missing.order).toEqual([]);
  });

  it("a Stop that failed is refused (the delegating node sends it again); a run opened during its Stop answers open", async () => {
    const failed = await setup({ stop: "not_stopped" });
    await expect(failed.apply(AGENT, false)).resolves.toMatchObject({ accepted: false, code: "DELEGATED_RUN_NOT_STOPPED" });
    const reopened = await setup({ stop: "kept_open" });
    reopened.agentRuns.stopForTaskClosure.mockImplementationOnce(async () => { await reopened.closed.openedBy(AGENT, A); return "kept_open"; });
    await expect(reopened.apply(AGENT, false)).resolves.toEqual({ accepted: true, open: true });
  });
});
