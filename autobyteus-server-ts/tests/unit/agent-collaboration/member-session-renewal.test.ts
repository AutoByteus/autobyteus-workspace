import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { SavedRuntimeSessionMissingError } from "../../../src/agent-execution/errors.js";
import { buildSessionRenewal } from "../../../src/agent-execution/domain/runtime-switch.js";
import { FlatAgentExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { FlatTeamAgentExecutionHandle } from "../../../src/agent-team-execution/local/flat-team-agent-execution-handle.js";
import { configuredRootFixture, placements } from "../../fixtures/configured-root-first-work-fixture.js";

/**
 * autobyteus-599 (DS-002; REQ-006, AC-005, with AC-001, AC-003, AC-004 for members): a Team member (standalone Team), an Org
 * member of a mounted Team and a direct Org Agent whose saved runtime session is lost, through the REAL roots, their
 * execution-tree persistence, the Flat Team cache and the real switch recorder on real files; only the provider and the
 * conversation check are controlled. The restore of the saved session fails with the runtime's own "not found", and the same
 * activation continues in a fresh session of the same runtime behind the lost-session marker, committed as a compare-and-set
 * of the lost ID (`replace_lost_session`).
 */
const LOST = "old-thread";
const fixtures: Awaited<ReturnType<typeof configuredRootFixture>>[] = [];
afterEach(() => { vi.restoreAllMocks(); fixtures.splice(0).forEach((f) => f.dispose()); });
const build = async (placement: (typeof placements)[number]) => {
  const fixture = await configuredRootFixture(placement, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "present", binding: LOST });
  fixtures.push(fixture);
  seedConversation(fixture.memberDir(1));
  return fixture;
};

const record = (id: string, traceType: string, content: string, ts: number) => ({
  id, ts, turn_id: "turn_0001", seq: ts, trace_type: traceType, content, source_event: "test",
});
const lines = (file: string): Array<Record<string, any>> =>
  fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
const seedConversation = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "raw_traces_active.jsonl"), [
    record("old-user", "user", "earlier question", 1), record("old-assistant", "assistant", "earlier answer", 2),
  ].map((entry) => JSON.stringify(entry)).join("\n") + "\n");
};
type Fixture = Awaited<ReturnType<typeof build>>;
const activeFile = (f: Fixture) => path.join(f.memberDir(1), "raw_traces_active.jsonl");
const active = (f: Fixture) => lines(activeFile(f));
const segment = (f: Fixture) => lines(path.join(f.memberDir(1), "raw_traces_000001.jsonl"));
const manifest = (f: Fixture) => {
  const file = path.join(f.memberDir(1), "raw_traces_manifest.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { segments: [] };
};
const renewal = (f: Fixture, lost = LOST) => buildSessionRenewal({ runId: f.ids[1],
  side: { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "unused" }, lostPlatformAgentRunId: lost });
/** The runtime's own "not found" for the session the restore asked for. */
const loseSessionOnce = (f: Fixture) => f.manager.platformPreparation.mockImplementationOnce(async ({ platformAgentRunId }: { platformAgentRunId?: string }) => {
  throw new SavedRuntimeSessionMissingError(RuntimeKind.CODEX_APP_SERVER, platformAgentRunId!);
});

for (const placement of placements) describe(`${placement}: a member whose saved runtime session is lost`, () => {
  const setup = () => build(placement);

  it("continues in a fresh session behind the lost-session marker, committed as a compare-and-set of the lost ID (AC-005)", async () => {
    const f = await setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const cacheUpdate = vi.spyOn(FlatAgentExecutionContext.prototype, "replaceCommittedPlatformAgentRunId");
    loseSessionOnce(f);

    expect(await f.send()).toMatchObject({ accepted: true });

    expect(f.manager.platformPreparation).toHaveBeenCalledWith(expect.objectContaining({ platformAgentRunId: LOST }));
    expect(f.manager.newPreparation).toHaveBeenCalledTimes(1);
    expect(f.order).toEqual(["durable", `publish:${f.ids[1]}`]);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
    expect(f.members()[0]!.platformAgentRunId).toBe(LOST); // the other members are untouched
    expect(await f.reload()).toEqual(f.members());
    if (placement !== "direct_org") expect(cacheUpdate).toHaveBeenCalledWith(LOST, "new-thread-1");
    // the previous records kept as one closed segment, the lost-session marker first in the active file
    expect(segment(f).map((entry) => entry.id)).toEqual(["old-user", "old-assistant"]);
    expect(manifest(f).segments).toEqual([expect.objectContaining({
      boundary_type: "runtime_switch", boundary_key: `session_renewal:${f.ids[1]}:${LOST}`, record_count: 2, status: "complete",
    })]);
    expect(active(f)[0]).toMatchObject({ sender_id: "system.runtime_handover", correlation_id: `session_renewal:${f.ids[1]}:${LOST}`,
      content: "The saved Codex App Server session of this run was no longer available, so a new session continues from the work journal." });
    expect(warn.mock.calls.filter((call: unknown[]) => call[0] === "RUNTIME_SESSION_LOST")).toEqual([
      ["RUNTIME_SESSION_LOST", { runId: f.ids[1], runtimeKind: RuntimeKind.CODEX_APP_SERVER, lostPlatformAgentRunId: LOST }]]);
  });

  it("a later re-activation restores the renewed session: no second marker, no second fresh session", async () => {
    const f = await setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    loseSessionOnce(f);
    expect(await f.send()).toMatchObject({ accepted: true });

    f.stop(1);
    expect(await f.send()).toMatchObject({ accepted: true });

    expect(f.manager.platformPreparation).toHaveBeenLastCalledWith(expect.objectContaining({ platformAgentRunId: "new-thread-1" }));
    expect(f.manager.newPreparation).toHaveBeenCalledTimes(1);
    expect(manifest(f).segments).toHaveLength(1);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
  });

  if (placement !== "direct_org") it("a re-created configured handle restores the renewed session (Change Scope #3)", async () => {
    // The Flat Team handle re-creates its configured handle from its own config and cache, as after a disposal.
    const created: FlatTeamAgentExecutionHandle[] = [];
    const createHandle = (FlatTeamAgentExecutionHandle.prototype as any).createHandle;
    vi.spyOn(FlatTeamAgentExecutionHandle.prototype as any, "createHandle").mockImplementation(function (this: FlatTeamAgentExecutionHandle) {
      created.push(this);
      return createHandle.call(this);
    });
    const f = await setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    loseSessionOnce(f);
    expect(await f.send()).toMatchObject({ accepted: true });
    const worker = created.find((handle) => (handle as any).context.agentRunId === f.ids[1])!;
    expect((worker as any).config.platformAgentRunId).toBe("new-thread-1");

    f.stop(1);
    worker.dispose();
    expect(await f.send()).toMatchObject({ accepted: true });

    expect(created.filter((handle) => handle === worker)).toHaveLength(2);
    expect(f.manager.platformPreparation).toHaveBeenLastCalledWith(expect.objectContaining({ platformAgentRunId: "new-thread-1" }));
    expect(f.manager.newPreparation).toHaveBeenCalledTimes(1);
    expect(manifest(f).segments).toHaveLength(1);
  });

  it.each([
    ["an auth error", () => new Error("401 Unauthorized")],
    ["a network error", () => new Error("connect ECONNREFUSED")],
    ["the not-found answer for another session", () => new SavedRuntimeSessionMissingError(RuntimeKind.CODEX_APP_SERVER, "another-thread")],
    ["a quarantined cleanup (AggregateError)", () => new AggregateError([new SavedRuntimeSessionMissingError(RuntimeKind.CODEX_APP_SERVER, LOST),
      new Error("cleanup failed")], "AgentRun preparation and cleanup failed.")],
  ])("fails as today for %s: no fresh session, no marker, the binding unchanged (AC-003)", async (_label, makeError) => {
    const f = await setup();
    const before = fs.readFileSync(activeFile(f), "utf8");
    f.manager.platformPreparation.mockImplementationOnce(async () => { throw makeError(); });

    expect(await f.send()).toMatchObject({ accepted: false });
    expect(f.manager.newPreparation).not.toHaveBeenCalled();
    expect(fs.readFileSync(activeFile(f), "utf8")).toBe(before);
    expect(manifest(f).segments).toEqual([]);
    expect(f.write).not.toHaveBeenCalled();
    expect(f.members()[1]!.platformAgentRunId).toBe(LOST);
  });

  it("a commit that does not land after the marker publishes nothing; the next input completes it with one marker and one segment (AC-004)", async () => {
    const f = await setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    loseSessionOnce(f);
    f.control.failure = { outcome: "not_committed", file: "tree", stage: "write", cause: new Error("write refused") } as never;

    expect(await f.send()).toMatchObject({ accepted: false });
    expect(f.publish).not.toHaveBeenCalled();
    expect(f.members()[1]!.platformAgentRunId).toBe(LOST);
    expect(active(f)[0]!.id).toBe(renewal(f).markerTraceId);

    f.control.failure = null;
    loseSessionOnce(f);
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(manifest(f).segments).toHaveLength(1);
    expect(segment(f).map((entry) => entry.id)).toEqual(["old-user", "old-assistant"]);
    expect(active(f).filter((entry) => entry.id === renewal(f).markerTraceId)).toHaveLength(1);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-2");
  });

  it("a fresh session that fails to start leaves nothing; the next input tries again (AC-004)", async () => {
    const f = await setup();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const before = fs.readFileSync(activeFile(f), "utf8");
    loseSessionOnce(f);
    f.manager.newPreparation.mockImplementationOnce(async () => { throw new Error("provider failed to start"); });

    expect(await f.send()).toMatchObject({ accepted: false });
    expect(fs.readFileSync(activeFile(f), "utf8")).toBe(before);
    expect(manifest(f).segments).toEqual([]);
    expect(f.write).not.toHaveBeenCalled();

    loseSessionOnce(f);
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(manifest(f).segments).toHaveLength(1);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
  });

  it("the root's compare-and-set refuses a renewal whose lost ID is no longer the stored one, writing nothing", async () => {
    const f = await setup();
    const root = placement === "standalone_team" ? { rootSubjectKind: "agent_team", rootRunId: "test-root" } : { rootSubjectKind: "agent_org", rootRunId: "test-root" };
    const change = { kind: "replace_lost_session", replacement: { expectedPreviousPlatformAgentRunId: "not-current",
      binding: { execution: { root, memberAddress: f.addresses[1], agentRunId: f.ids[1] }, platformAgentRunId: "renewed" } } };
    await expect(f.root.commitAgentPlatformBindingChange(change as never)).rejects.toThrow();
    expect(f.write).not.toHaveBeenCalled();
    change.replacement.expectedPreviousPlatformAgentRunId = LOST;
    await f.root.commitAgentPlatformBindingChange(change as never);
    expect(f.members()[1]!.platformAgentRunId).toBe("renewed");
  });
});
