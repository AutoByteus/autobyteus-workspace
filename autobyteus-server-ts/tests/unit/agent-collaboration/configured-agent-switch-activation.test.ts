import { describe, expect, it, vi } from "vitest";
import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ConfiguredAgentExecutionHandle } from "../../../src/agent-collaboration/execution/backends/configured-agent-execution-handle.js";
import { runPartPlacement } from "../../../src/agent-memory/domain/agent-run-memory-placement.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import type { PendingRuntimeSwitch } from "../../../src/run-history/store/agent-run-metadata-types.js";

/**
 * autobyteus-348 (REQ-003, REQ-004, REQ-005, AC-005, AC-006, AC-007, M-6, M-7): the shared configured-agent handle runs the
 * sequence of autobyteus-316 for a member with a pending agent runtime switch: ticket, candidate, archive step, the root's
 * durable commit, publication; a failed attempt removes only what it wrote; with no conversation it is a plain start.
 */
const PENDING: PendingRuntimeSwitch = {
  switchId: "switch-1",
  from: { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "haiku", llmConfig: null, platformAgentRunId: "sess-1" },
};

const build = (input: { target?: RuntimeKind; history?: "none" | "present" | "indeterminate"; pending?: PendingRuntimeSwitch | null } = {}) => {
  const target = input.target ?? RuntimeKind.CODEX_APP_SERVER;
  const root = createTeamRootExecutionIdentity("root-run");
  const identity = createCollaborationMemberExecutionIdentity({ root, memberAddress: "/Worker", agentRunId: "agent-run" });
  const scope = createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [] });
  const memberExecutionContext = new MemberExecutionContext({
    teamScoped: true, collaborationRole: "team_member", identity, authoredEnclosingScopeInstruction: "Stay in scope.",
    collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }),
    tasks: { root, delegateToNewCopy: vi.fn(), ownedTaskOf: () => null, assignToExistingCopy: vi.fn(), submitTaskResult: vi.fn(), reviewTaskResult: vi.fn() },
  });
  const order: string[] = [];
  const activity = { kind: input.history ?? "present" } as { kind: string; error?: Error };
  if (activity.kind === "indeterminate") activity.error = new Error("raw traces damaged");
  const fakeRun = {
    runId: "agent-run", bindExecutionAdmissionFence: vi.fn(), getInputStateSnapshot: vi.fn(() => ({ kind: "idle" })),
    isActive: vi.fn(() => true), getStatusSnapshot: () => ({ status: "idle" }), subscribeToEvents: vi.fn(() => () => undefined),
    interrupt: vi.fn(async () => ({ accepted: true as const })),
  };
  const abort = vi.fn(async () => { order.push("abort"); return { kind: "aborted" as const }; });
  const external = target !== RuntimeKind.AUTOBYTEUS;
  const candidate = (platformAgentRunId: string | null) => ({
    runId: "agent-run", runtimeKind: target, platformAgentRunId,
    commitPublication: () => { order.push("publish"); return fakeRun; }, abort,
  });
  const prepareNewAgentRun = vi.fn(async () => { order.push("prepare"); return candidate(external ? "thread-9" : null); });
  const prepareRestoreFromPlatform = vi.fn(async ({ platformAgentRunId }) => { order.push("platform_restore"); return candidate(platformAgentRunId); });
  const prepareRestore = vi.fn(async () => { order.push("restore"); return candidate(null); });
  const memory = {
    begin: vi.fn((_dir: string, runtimeSwitch: unknown) => { order.push("begin"); return { runtimeSwitch, watermarkTraceId: "last" }; }),
    record: vi.fn(() => { order.push("record"); }),
    discard: vi.fn(() => { order.push("discard"); }),
  };
  const commitPlatformBindingChange = vi.fn(async () => { order.push("commit"); });
  const releaseExactRun = vi.fn(async () => ({ accepted: true }));
  const pending = input.pending === null ? undefined : input.pending ?? PENDING;
  const handle = new ConfiguredAgentExecutionHandle({
    identity, physicalScope: scope, memoryPlacement: runPartPlacement(scope),
    execution: {
      agentDefinitionId: "agent-definition", llmModelIdentifier: "gpt-5", llmConfig: null, autoExecuteTools: false,
      runtimeKind: target, workspaceRootPath: null, platformAgentRunId: null, ...(pending ? { pendingRuntimeSwitch: pending } : {}),
    },
    activationMode: "restore", memberExecutionContext,
    callbacks: { publishAgentEvent: vi.fn(), commitPlatformBindingChange },
    agentRunManager: testActivationManager({
      newPreparation: prepareNewAgentRun, platformPreparation: prepareRestoreFromPlatform, restorePreparation: prepareRestore,
      getActiveRun: vi.fn(() => (fakeRun.isActive() ? fakeRun : null)), releaseExactRun,
    }) as never,
    memoryLocator: { getMemoryDir: () => "/memory/member" } as never,
    activityInspector: { inspect: () => activity } as never,
    runtimeSwitchMemory: memory,
  });
  return { handle, order, memory, commitPlatformBindingChange, prepareNewAgentRun, prepareRestoreFromPlatform, prepareRestore, abort, fakeRun, activity, identity, releaseExactRun };
};

describe("a member with a pending switch and a conversation (autobyteus-316's sequence in the shared handle)", () => {
  it("takes the ticket before the candidate, archives behind the marker, commits the switch, then publishes (external target)", async () => {
    const f = build();
    await f.handle.getOrCreateAgentRun();
    expect(f.order).toEqual(["begin", "prepare", "record", "commit", "publish"]);
    expect(f.memory.begin).toHaveBeenCalledWith("/memory/member", expect.objectContaining({
      key: "runtime_switch:agent-run:switch-1", markerText: "Agent runtime changed from Claude Agent SDK (haiku) to Codex App Server (gpt-5).",
    }));
    expect(f.commitPlatformBindingChange).toHaveBeenCalledWith(expect.objectContaining({
      kind: "runtime_switch", switchId: "switch-1", platformAgentRunId: "thread-9", execution: f.identity,
    }));
    expect(f.prepareRestore).not.toHaveBeenCalled();
    expect(f.prepareRestoreFromPlatform).not.toHaveBeenCalled();
  });

  it("commits a native target with no provider session (null)", async () => {
    const f = build({ target: RuntimeKind.AUTOBYTEUS });
    await f.handle.getOrCreateAgentRun();
    expect(f.order).toEqual(["begin", "prepare", "record", "commit", "publish"]);
    expect(f.commitPlatformBindingChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "runtime_switch", platformAgentRunId: null }));
  });

  it("after the commit the handle restores on the committed session instead of switching again (M-7)", async () => {
    const f = build();
    await f.handle.getOrCreateAgentRun();
    f.order.length = 0;
    f.fakeRun.isActive.mockReturnValue(false);
    await f.handle.getOrCreateAgentRun();
    // a restore retains the committed binding (the existing commit kind); it is not a second switch
    expect(f.order).toEqual(["platform_restore", "commit", "publish"]);
    expect(f.prepareRestoreFromPlatform).toHaveBeenCalledWith(expect.objectContaining({ platformAgentRunId: "thread-9" }));
    expect(f.memory.begin).toHaveBeenCalledOnce();
    expect(f.commitPlatformBindingChange.mock.calls.map(([change]) => (change as { kind: string }).kind)).toEqual(["runtime_switch", "adopt_or_retain"]);
  });

  it("a candidate that fails to start leaves nothing: aborted and released first, then discarded, no marker, no commit", async () => {
    const f = build();
    f.prepareNewAgentRun.mockImplementationOnce(async () => { f.order.push("prepare"); throw new Error("provider unavailable"); });
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow("provider unavailable");
    expect(f.order).toEqual(["begin", "prepare", "discard"]);
    expect(f.memory.record).not.toHaveBeenCalled();
    expect(f.commitPlatformBindingChange).not.toHaveBeenCalled();
    // sending again is a new attempt with a new ticket and completes the switch
    f.order.length = 0;
    await f.handle.getOrCreateAgentRun();
    expect(f.order).toEqual(["begin", "prepare", "record", "commit", "publish"]);
  });

  it("a failed archive step aborts the candidate first and only then discards", async () => {
    const f = build();
    f.memory.record.mockImplementationOnce(() => { f.order.push("record"); throw new Error("disk full"); });
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow("disk full");
    expect(f.order).toEqual(["begin", "prepare", "record", "abort", "discard"]);
    expect(f.commitPlatformBindingChange).not.toHaveBeenCalled();
  });

  it("discards nothing when the failed candidate's release cannot be confirmed (it may still write)", async () => {
    const f = build();
    f.memory.record.mockImplementationOnce(() => { throw new Error("disk full"); });
    f.abort.mockResolvedValue({ kind: "quarantined", error: new Error("stop unconfirmed") } as never);
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow();
    expect(f.memory.discard).not.toHaveBeenCalled();
  });

  it("a commit that conflicts (stale switch) after the archive step discards nothing and publishes nothing; the member stays pending", async () => {
    const f = build();
    f.commitPlatformBindingChange.mockRejectedValueOnce(Object.assign(new Error("switch_id_mismatch"), { code: "TEAM_AGENT_PLATFORM_BINDING_CONFLICT" }));
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow();
    expect(f.order).toEqual(["begin", "prepare", "record", "abort"]);
    expect(f.memory.discard).not.toHaveBeenCalled();
    expect(f.order).not.toContain("publish");
  });

  it("unreadable conversation history fails closed before anything starts", async () => {
    const f = build({ history: "indeterminate" });
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow(/cannot be inspected safely/);
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled();
    expect(f.memory.begin).not.toHaveBeenCalled();
  });
});

describe("a member with a pending switch and no conversation (REQ-005, M-6)", () => {
  it("is a plain start: no ticket, no marker, no archive; the commit still clears the pending switch", async () => {
    const f = build({ history: "none" });
    await f.handle.getOrCreateAgentRun();
    expect(f.order).toEqual(["prepare", "commit", "publish"]);
    expect(f.memory.begin).not.toHaveBeenCalled();
    expect(f.memory.record).not.toHaveBeenCalled();
    expect(f.commitPlatformBindingChange).toHaveBeenCalledWith(expect.objectContaining({ kind: "runtime_switch", switchId: "switch-1", platformAgentRunId: "thread-9" }));
  });
});

describe("the explicit pending field decides, and the staged path refuses it", () => {
  it("a member without a pending switch restores as before", async () => {
    const f = build({ pending: null, history: "present" });
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow(/no provider binding/);
    expect(f.memory.begin).not.toHaveBeenCalled();
  });

  it("the staged activation of a fresh task copy refuses a spec with a pending switch", async () => {
    const f = build();
    await expect(f.handle.prepareConfiguredActivation()).rejects.toThrow(/pending agent runtime switch/);
    expect(f.prepareNewAgentRun).not.toHaveBeenCalled();
  });

  it("replaceSelection gives a stopped retained handle the node's runtime, session and pending switch; a running one refuses", async () => {
    const f = build({ pending: null, history: "present" });
    f.handle.replaceSelection({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "gpt-5", llmConfig: null, platformAgentRunId: null, pendingRuntimeSwitch: PENDING,
    });
    await f.handle.getOrCreateAgentRun();
    expect(f.order).toEqual(["begin", "prepare", "record", "commit", "publish"]);
    expect(() => f.handle.replaceSelection({ runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "x", llmConfig: null, platformAgentRunId: null })).toThrow(/running/);
  });
});
