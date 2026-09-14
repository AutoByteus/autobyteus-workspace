import { afterEach, describe, expect, it, vi } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { FlatAgentExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { configuredRootFixture, deferred, placements } from "../../fixtures/configured-root-first-work-fixture.js";

const fixtures: Awaited<ReturnType<typeof configuredRootFixture>>[] = [];
afterEach(() => { vi.restoreAllMocks(); fixtures.splice(0).forEach((f) => f.dispose()); });
const build: typeof configuredRootFixture = async (...args) => {
  const fixture = await configuredRootFixture(...args); fixtures.push(fixture); return fixture;
};

for (const placement of placements) describe(`${placement} configured first work`, () => {
  it.each([
    { runtimeKind: RuntimeKind.AUTOBYTEUS, activity: "none", binding: null, method: "prepareNewAgentRun" },
    { runtimeKind: RuntimeKind.AUTOBYTEUS, activity: "present", binding: null, method: "prepareRestoreAgentRun" },
    { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "present", binding: "old-thread", method: "prepareRestoreAgentRunFromPlatformState" },
    { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "none", binding: null, method: "prepareNewAgentRun" },
    { runtimeKind: RuntimeKind.CODEX_APP_SERVER, activity: "none", binding: "old-thread", method: "prepareNewAgentRun" },
    { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, activity: "present", binding: "old-thread", method: "prepareRestoreAgentRunFromPlatformState" },
  ] as const)("scope stays Offline; $runtimeKind / $activity / $binding readies only receivers", async (row) => {
    const f = await build(placement, row);
    expect(f.statuses().map((s) => s.details.status)).toEqual(["offline", "offline", "offline"]);
    Object.values(f.manager).forEach((prepare) => expect(prepare).not.toHaveBeenCalled());
    expect(f.write).not.toHaveBeenCalled();
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(f.manager[row.method]).toHaveBeenCalledTimes(1);
    expect(f.publish.mock.calls).toEqual([[f.ids[1]]]);
    expect(f.statuses().map((s) => s.details.status)).toEqual(["offline", "idle", "offline"]);
    expect(f.configs.get(f.ids[1])!.memberExecutionContext!.identity.agentRunId).toBe(f.ids[1]);
    if (row.activity === "present" && row.binding) {
      expect(f.manager.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledWith(expect.objectContaining({ platformAgentRunId: row.binding }));
    }
    expect(await f.reload()).toEqual(f.members());
    expect(await f.send(f.ids[0])).toMatchObject({ accepted: true });
    expect(f.statuses().map((s) => s.details.status)).toEqual(["idle", "idle", "offline"]);
  });

  it("later legitimate peer work starts only the new receiver and retains attachment references", async () => {
    const f = await build(placement);
    expect(await f.send()).toMatchObject({ accepted: true });
    const context = f.configs.get(f.ids[1])!.memberExecutionContext!;
    const referenceFiles = ["/test-owned/attached-note.md"];
    const result = await context.collaboration.deliverLogicalMessage({
      recipientAddress: f.addresses[0] as never, content: "Review this note", referenceFiles,
    });
    expect(result).toMatchObject({ accepted: true });
    expect(f.publish.mock.calls).toEqual([[f.ids[1]], [f.ids[0]]]);
    expect(f.statuses().map((s) => s.details.status)).toEqual(["idle", "idle", "offline"]);
    expect(f.root.getCommunicationSnapshot().messages).toHaveLength(1);
    expect(f.root.getCommunicationSnapshot().messages[0]).toMatchObject({
      senderAgentRunId: f.ids[1], receiverAgentRunId: f.ids[0], referenceFiles, content: "Review this note",
    });
    expect(f.root.getTaskRecordsSnapshot().records).toEqual([]);
  });

  it("preserves fresh zero-work laziness and targeted first input", async () => {
    const f = await build(placement, { mode: "fresh", binding: null });
    expect(f.manager.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(f.statuses().every((s) => s.details.status === "offline")).toBe(true);
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(f.manager.prepareNewAgentRun).toHaveBeenCalledTimes(1);
  });

  it("coalesces same-member first work, holding publication, cache and input until root durability", async () => {
    const f = await build(placement);
    const hold = deferred(); f.control.hold = hold.promise;
    const cacheUpdate = vi.spyOn(FlatAgentExecutionContext.prototype, "replaceCommittedPlatformAgentRunId");
    const first = f.send(); const second = f.send();
    await vi.waitFor(() => expect(f.write).toHaveBeenCalledTimes(1));
    expect(f.manager.prepareNewAgentRun).toHaveBeenCalledTimes(1);
    expect(f.publish).not.toHaveBeenCalled(); expect(f.acceptInput).not.toHaveBeenCalled();
    expect(cacheUpdate).not.toHaveBeenCalled();
    expect(f.members()[1]!.platformAgentRunId).toBe("old-thread");
    hold.resolve();
    expect(await first).toMatchObject({ accepted: true }); expect(await second).toMatchObject({ accepted: true });
    expect(f.order).toEqual(["durable", `publish:${f.ids[1]}`]);
    expect(f.acceptInput).toHaveBeenCalledTimes(2);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
    if (placement !== "direct_org") expect(cacheUpdate).toHaveBeenCalledWith("old-thread", "new-thread-1");
  });

  it("serializes different-member commits against the current tree, not the pre-await snapshot", async () => {
    const f = await build(placement);
    const hold = deferred(); f.control.hold = hold.promise;
    const first = f.send(); const second = f.send(f.ids[0]);
    await vi.waitFor(() => expect(f.manager.prepareNewAgentRun).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(f.write).toHaveBeenCalledTimes(1));
    hold.resolve();
    expect(await first).toMatchObject({ accepted: true }); expect(await second).toMatchObject({ accepted: true });
    expect(f.members().filter((member) => member.platformAgentRunId?.startsWith("new-thread"))).toHaveLength(2);
    expect(await f.reload()).toEqual(f.members());
  });

  it("aborts a definite failed write and safely retries the unchanged binding", async () => {
    const f = await build(placement);
    f.control.failure = { outcome: "not_renamed", file: "tree", stage: "write", cause: new Error("write refused") } as never;
    expect(await f.send()).toMatchObject({ accepted: false });
    expect(f.abort).toHaveBeenCalledTimes(1); expect(f.publish).not.toHaveBeenCalled();
    expect(f.members()[1]!.platformAgentRunId).toBe("old-thread");
    f.control.failure = null;
    expect(await f.send()).toMatchObject({ accepted: true });
    expect(f.manager.prepareNewAgentRun).toHaveBeenCalledTimes(2);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-2");
  });

  it("does not retry or publish after indeterminate rename", async () => {
    const f = await build(placement);
    f.control.failure = { outcome: "renamed_finalization_indeterminate", file: "tree", stage: "directory_sync", cause: new Error("uncertain") } as never;
    expect(await f.send()).toMatchObject({ accepted: false });
    await f.send().catch(() => null);
    expect(f.manager.prepareNewAgentRun).toHaveBeenCalledTimes(1);
    expect(f.publish).not.toHaveBeenCalled(); expect(f.acceptInput).not.toHaveBeenCalled();
  });

  it.each([
    { activity: "present", binding: null, code: "COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING" },
    { activity: "indeterminate", binding: "old-thread", code: "COLLABORATION_AGENT_CONTINUATION_STATE_UNREADABLE" },
  ] as const)("fails closed on $code at first work, not scope restore", async (row) => {
    const f = await build(placement, row);
    expect(await f.send()).toMatchObject({ accepted: false, code: row.code });
    Object.values(f.manager).forEach((prepare) => expect(prepare).not.toHaveBeenCalled());
    expect(f.write).not.toHaveBeenCalled(); expect(f.publish).not.toHaveBeenCalled();
  });

  it("rejects stale expected-old and foreign-root changes without writing", async () => {
    const f = await build(placement);
    const root = placement === "standalone_team" ? { rootSubjectKind: "agent_team", rootRunId: "test-root" } : { rootSubjectKind: "agent_org", rootRunId: "test-root" };
    const change = { kind: "replace_without_conversation", replacement: { expectedPreviousPlatformAgentRunId: "not-current",
      binding: { execution: { root, memberAddress: f.addresses[1], agentRunId: f.ids[1] }, platformAgentRunId: "replacement" },
    } };
    await expect(f.root.commitAgentPlatformBindingChange(change as never)).rejects.toThrow();
    change.replacement.expectedPreviousPlatformAgentRunId = "old-thread";
    root.rootRunId = "foreign";
    await expect(f.root.commitAgentPlatformBindingChange(change as never)).rejects.toThrow();
    expect(f.write).not.toHaveBeenCalled();
  });

  if (placement !== "direct_org") it("latches a post-root Flat cache failure as nonretryable without rolling back the tree", async () => {
    const f = await build(placement);
    vi.spyOn(FlatAgentExecutionContext.prototype, "replaceCommittedPlatformAgentRunId").mockImplementation(() => { throw new Error("cache failed"); });
    expect(await f.send()).toMatchObject({ accepted: false, code: "COLLABORATION_AGENT_BINDING_CACHE_COMMIT_FAILED" });
    expect(await f.send()).toMatchObject({ accepted: false, code: "COLLABORATION_AGENT_BINDING_CACHE_COMMIT_FAILED" });
    expect(f.manager.prepareNewAgentRun).toHaveBeenCalledTimes(1);
    expect(f.members()[1]!.platformAgentRunId).toBe("new-thread-1");
    expect(await f.reload()).toEqual(f.members());
    expect(f.publish).not.toHaveBeenCalled(); expect(f.acceptInput).not.toHaveBeenCalled();
  });
});


describe("Flat committed binding cache", () => {
  it("keeps ordinary adoption strict and requires an exact old binding for replacement", () => {
    const context = new FlatAgentExecutionContext({ address: assertAgentTeamAddress("/Worker"), agentRunId: "worker",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: "old-thread" });
    expect(() => context.adoptPlatformAgentRunId("another-thread")).toThrow();
    expect(() => context.replaceCommittedPlatformAgentRunId("not-current", "new-thread")).toThrow();
    expect(context.getPlatformAgentRunId()).toBe("old-thread");
    context.replaceCommittedPlatformAgentRunId("old-thread", "new-thread");
    expect(context.getPlatformAgentRunId()).toBe("new-thread");
    expect(() => context.adoptPlatformAgentRunId("new-thread")).not.toThrow();
  });
});
