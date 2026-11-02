import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { PendingRuntimeSwitch } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { configuredRootFixture, placements } from "../../fixtures/configured-root-first-work-fixture.js";

/**
 * autobyteus-348 (REQ-003, REQ-004, AC-005, AC-006, AC-007; M-2, M-6, M-7): a Team member (standalone Team), an Org member of a
 * mounted Team and a direct Org Agent are switched through the REAL roots, their execution-tree persistence and the real
 * switch recorder on real files; only the provider and the conversation check are controlled. Each placement runs the same
 * cases: the sequence of autobyteus-316, a failed start that leaves nothing, a restore after the run ended, a member with no
 * conversation, and the commit's conflicts.
 */
const PENDING: PendingRuntimeSwitch = {
  switchId: "switch-1",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "haiku", llmConfig: null, platformAgentRunId: "claude-session" },
};
const fixtures: Awaited<ReturnType<typeof configuredRootFixture>>[] = [];
afterEach(() => { vi.restoreAllMocks(); fixtures.splice(0).forEach((f) => f.dispose()); });
const build: typeof configuredRootFixture = async (...args) => {
  const fixture = await configuredRootFixture(...args);
  fixtures.push(fixture);
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
    record("old-user", "user", "claude era question", 1), record("old-assistant", "assistant", "claude era answer", 2),
  ].map((entry) => JSON.stringify(entry)).join("\n") + "\n");
};
const active = (f: { memberDir(index: number): string }) => lines(path.join(f.memberDir(1), "raw_traces_active.jsonl"));
const segment = (f: { memberDir(index: number): string }) => lines(path.join(f.memberDir(1), "raw_traces_000001.jsonl"));
const manifest = (f: { memberDir(index: number): string }) => {
  const file = path.join(f.memberDir(1), "raw_traces_manifest.json");
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : { segments: [] };
};

for (const placement of placements) describe(`${placement}: the next input to a switched member`, () => {
  it.each([RuntimeKind.CODEX_APP_SERVER, RuntimeKind.AUTOBYTEUS])("makes the switch real in one durable write before publishing (target %s)", async (target) => {
    const f = await build(placement, { runtimeKind: target, activity: "present", pendingSwitch: PENDING });
    seedConversation(f.memberDir(1));
    expect(f.members()[1]!.platformAgentRunId).toBeNull();

    expect(await f.send()).toMatchObject({ accepted: true });

    // one fresh session; the pending switch and the session ID changed in the same durable write, before publication
    expect(f.manager.newPreparation).toHaveBeenCalledTimes(1);
    expect(f.manager.platformPreparation).not.toHaveBeenCalled();
    expect(f.order).toEqual(["durable", `publish:${f.ids[1]}`]);
    const member = f.members()[1]! as { platformAgentRunId: string | null; pendingRuntimeSwitch?: unknown };
    expect(member.platformAgentRunId).toBe(target === RuntimeKind.AUTOBYTEUS ? null : "new-thread-1");
    expect(Object.hasOwn(member, "pendingRuntimeSwitch")).toBe(false);
    expect(await f.reload()).toEqual(f.members());
    // the other members are untouched
    expect(f.members()[0]!.platformAgentRunId).toBe("old-thread");
    // the folder: the previous agent's records archived as one segment, the marker first in the active file (I-3, I-7)
    expect(segment(f).map((entry) => entry.id)).toEqual(["old-user", "old-assistant"]);
    expect(manifest(f).segments).toEqual([expect.objectContaining({
      boundary_type: "runtime_switch", runtime_kind: "claude_agent_sdk", record_count: 2, status: "complete",
      boundary_key: `runtime_switch:${f.ids[1]}:switch-1`,
    })]);
    expect(active(f)[0]).toMatchObject({ trace_type: "system_task_notification", sender_id: "system.runtime_handover", correlation_id: `runtime_switch:${f.ids[1]}:switch-1` });
    expect(active(f).map((entry) => entry.id)).not.toContain("old-user");
  });

  it("restores on the committed session when the run ended and the next input comes: no second marker, no second session (M-7)", async () => {
    const f = await build(placement, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "present", pendingSwitch: PENDING });
    seedConversation(f.memberDir(1));
    expect(await f.send()).toMatchObject({ accepted: true });

    f.stop(1);
    expect(await f.send()).toMatchObject({ accepted: true });

    expect(f.manager.newPreparation).toHaveBeenCalledTimes(1);
    expect(f.manager.platformPreparation).toHaveBeenCalledWith(expect.objectContaining({ platformAgentRunId: "new-thread-1" }));
    expect(manifest(f).segments).toHaveLength(1);
    expect(active(f).filter((entry) => entry.correlation_id === `runtime_switch:${f.ids[1]}:switch-1`)).toHaveLength(1);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
    expect(Object.hasOwn(f.members()[1]!, "pendingRuntimeSwitch")).toBe(false);
  });

  it("a start that fails after the new agent wrote its own record leaves nothing; the retry archives only the previous agent's records (I-7)", async () => {
    const f = await build(placement, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "present", pendingSwitch: PENDING });
    seedConversation(f.memberDir(1));
    const before = fs.readFileSync(path.join(f.memberDir(1), "raw_traces_active.jsonl"), "utf8");
    const original = f.manager.newPreparation.getMockImplementation()!;
    f.manager.newPreparation.mockImplementationOnce(async () => {
      fs.appendFileSync(path.join(f.memberDir(1), "raw_traces_active.jsonl"), JSON.stringify(record("candidate-instruction", "system_instruction", "You are the new agent.", 5)) + "\n");
      throw new Error("provider failed to start");
    });

    expect(await f.send()).toMatchObject({ accepted: false });
    expect(fs.readFileSync(path.join(f.memberDir(1), "raw_traces_active.jsonl"), "utf8")).toBe(before);
    expect(manifest(f).segments).toEqual([]);
    expect(f.write).not.toHaveBeenCalled();
    expect((f.members()[1] as { pendingRuntimeSwitch?: PendingRuntimeSwitch }).pendingRuntimeSwitch).toEqual(PENDING);

    f.manager.newPreparation.mockImplementation(original);
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(segment(f).map((entry) => entry.id)).toEqual(["old-user", "old-assistant"]);
    expect(manifest(f).segments).toHaveLength(1);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
  });

  it("a commit that does not land publishes nothing and keeps the member pending; sending again completes it with one marker and one segment", async () => {
    const f = await build(placement, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "present", pendingSwitch: PENDING });
    seedConversation(f.memberDir(1));
    f.control.failure = { outcome: "not_committed", file: "tree", stage: "write", cause: new Error("write refused") } as never;

    expect(await f.send()).toMatchObject({ accepted: false });
    expect(f.publish).not.toHaveBeenCalled();
    expect((f.members()[1] as { pendingRuntimeSwitch?: PendingRuntimeSwitch }).pendingRuntimeSwitch).toEqual(PENDING);
    expect(f.members()[1]!.platformAgentRunId).toBeNull();

    f.control.failure = null;
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(manifest(f).segments).toHaveLength(1);
    expect(active(f).filter((entry) => entry.correlation_id === `runtime_switch:${f.ids[1]}:switch-1`)).toHaveLength(1);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-2");
    expect(Object.hasOwn(f.members()[1]!, "pendingRuntimeSwitch")).toBe(false);
  });

  it("a member with no conversation is a plain start: no marker, no archive; the commit clears the pending switch (REQ-005)", async () => {
    const f = await build(placement, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "none", pendingSwitch: PENDING });
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(fs.existsSync(path.join(f.memberDir(1), "raw_traces_manifest.json"))).toBe(false);
    expect(active(f)).toEqual([]);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
    expect(Object.hasOwn(f.members()[1]!, "pendingRuntimeSwitch")).toBe(false);
  });

  it("unreadable conversation history fails closed: nothing starts, the member stays pending", async () => {
    const f = await build(placement, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "indeterminate", pendingSwitch: PENDING });
    expect(await f.send()).toMatchObject({ accepted: false, message: expect.stringContaining("COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE") });
    expect(f.manager.newPreparation).not.toHaveBeenCalled();
    expect(f.write).not.toHaveBeenCalled();
  });

  it("the root's commit refuses a stale switch ID, a member that is not pending and a missing member, writing nothing", async () => {
    const f = await build(placement, { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "present", pendingSwitch: PENDING });
    const rootKind = placement === "standalone_team" ? "agent_team" : "agent_org";
    const commit = (overrides: Record<string, unknown>) => ({
      kind: "runtime_switch", switchId: "switch-1", platformAgentRunId: "thread-x",
      execution: { root: { rootSubjectKind: rootKind, rootRunId: "test-root" }, memberAddress: f.addresses[1], agentRunId: f.ids[1], ...overrides },
    });
    await expect(f.root.commitAgentPlatformBindingChange({ ...commit({}), switchId: "another" } as never)).rejects.toThrow();
    await expect(f.root.commitAgentPlatformBindingChange(commit({ memberAddress: f.addresses[0], agentRunId: f.ids[0] }) as never)).rejects.toThrow();
    await expect(f.root.commitAgentPlatformBindingChange(commit({ agentRunId: "no-such-run" }) as never)).rejects.toThrow();
    expect(f.write).not.toHaveBeenCalled();
    expect((f.members()[1] as { pendingRuntimeSwitch?: PendingRuntimeSwitch }).pendingRuntimeSwitch).toEqual(PENDING);
  });
});
