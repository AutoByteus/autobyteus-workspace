import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { markTaskDelegationSystemTaskNotificationMetadata } from "../../../src/agent-collaboration/execution/events/task-system-input-presentation.js";
import { CollaborationAgentPresentationEventAdapter } from "../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { ConfiguredAgentExecutionHandle } from "../../../src/agent-collaboration/execution/backends/configured-agent-execution-handle.js";
import {
  createAgentOrgRootExecutionIdentity,
  createCollaborationMemberExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import {
  MemberCollaborationContext,
  MemberExecutionContext,
} from "../../../src/agent-collaboration/execution/domain/member-execution-context.js";

const taskCommands = (root: ReturnType<typeof createTeamRootExecutionIdentity>) => ({
  root,
  delegateToNewCopy: vi.fn(),
  assignToExistingCopy: vi.fn(),
  submitTaskResult: vi.fn(),
  reviewTaskResult: vi.fn(),
});

const build = (
  kind: "agent_team" | "agent_org", runtimeKind = RuntimeKind.AUTOBYTEUS, mode: "fresh" | "restore" = "fresh",
  assertInputAllowed?: () => void,
) => {
  const root = kind === "agent_team"
    ? createTeamRootExecutionIdentity("root-run")
    : createAgentOrgRootExecutionIdentity("root-run");
  const identity = createCollaborationMemberExecutionIdentity({
    root,
    memberAddress: kind === "agent_team" ? "/Worker" : "/ReviewTeam/Worker",
    agentRunId: "agent-run",
  });
  const scope = createRootExecutionPhysicalScope({
    root,
    ancestorTeamRunIds: kind === "agent_team" ? [] : ["mounted-team-run"],
  });
  const memberExecutionContext = new MemberExecutionContext({
    teamScoped: true,
    identity,
    authoredEnclosingScopeInstruction: "Stay in scope.",
    collaboration: new MemberCollaborationContext({
      deliverLogicalMessage: async () => ({ accepted: true }),
    }),
    tasks: taskCommands(root),
  });
  const activity = { kind: "none" as "none" | "present" };
  const fakeRun = {
    runId: identity.agentRunId,
    bindExecutionAdmissionFence: vi.fn(),
    getInputStateSnapshot: vi.fn(() => ({ kind: "idle" })),
    isActive: vi.fn(() => true),
    getStatusSnapshot: () => ({ status: "idle" }),
    subscribeToEvents: vi.fn(() => () => undefined),
    reserveUserMessage: vi.fn(),
    postUserMessage: vi.fn(),
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(async () => ({ accepted: true as const })),
    fenceInputAndInterruptForRootShutdown: vi.fn(async () => ({ accepted: true as const })),
  };
  const abort = vi.fn(async () => ({ kind: "aborted" as const }));
  const prepareNewAgentRun = vi.fn(async ({ runId, config }) => ({
    runId,
    runtimeKind: config.runtimeKind,
    platformAgentRunId: runtimeKind === RuntimeKind.AUTOBYTEUS ? null : "external-thread",
    commitPublication: () => fakeRun,
    abort,
  }));
  const prepareRestoreAgentRunFromPlatformState = vi.fn(async ({ platformAgentRunId }) => ({
    runId: identity.agentRunId, runtimeKind, platformAgentRunId,
    commitPublication: () => fakeRun, abort,
  }));
  const prepareRestoreAgentRun = vi.fn(async () => ({
    runId: identity.agentRunId, runtimeKind, platformAgentRunId: null,
    commitPublication: () => fakeRun, abort,
  }));
  const getActiveRun = vi.fn((): typeof fakeRun | null => fakeRun.isActive() ? fakeRun : null);
  const localFinish = vi.fn(async () => ({ accepted: true as const }));
  const prepareAgentRunTermination = vi.fn(async () => ({
    cancel: vi.fn(), commit: () => ({ finish: localFinish }),
  }));
  const tryPrepareAgentRunTerminationIfQuiescent = vi.fn(async () => null);
  const releaseExactRun = vi.fn(async () => { await localFinish(); return { accepted: true }; });
  const publishAgentEvent = vi.fn();
  const commitPlatformBindingChange = vi.fn();
  const handle = new ConfiguredAgentExecutionHandle({
    identity,
    physicalScope: scope,
    execution: {
      agentDefinitionId: "agent-definition",
      llmModelIdentifier: "model",
      llmConfig: null,
      autoExecuteTools: false,
      runtimeKind,
      workspaceRootPath: null,
      platformAgentRunId: null,
    },
    activationMode: mode,
    memberExecutionContext,
    callbacks: { publishAgentEvent, commitPlatformBindingChange },
    agentRunManager: testActivationManager({
      newPreparation: prepareNewAgentRun, platformPreparation: prepareRestoreAgentRunFromPlatformState, restorePreparation: prepareRestoreAgentRun,
      getActiveRun, prepareAgentRunTermination, tryPrepareAgentRunTerminationIfQuiescent,
      releaseExactRun,
    }) as never,
    memoryLocator: {
      getLocation: (physicalScope: typeof scope, agentRunId: string) => ({
        scope: physicalScope,
        agentRunId,
        memoryDir: `/memory/${physicalScope.root.rootSubjectKind}/${physicalScope.root.rootRunId}/${physicalScope.ancestorTeamRunIds.join("/")}/${agentRunId}`,
      }),
    } as never,
    activityInspector: { inspect: () => activity } as never,
    ...(assertInputAllowed ? { assertInputAllowed } : {}),
  });
  return {
    activity, commitPlatformBindingChange, prepareRestoreAgentRunFromPlatformState, prepareRestoreAgentRun, handle, root,
    identity, scope, memberExecutionContext, prepareNewAgentRun, fakeRun, abort, publishAgentEvent, getActiveRun,
    prepareAgentRunTermination, tryPrepareAgentRunTerminationIfQuiescent, localFinish, releaseExactRun,
    /** The runtime died: AgentRunManager discovers it inactive and stops publishing it. */
    crash: () => { fakeRun.isActive.mockReturnValue(false); },
  };
};

describe("ConfiguredAgentExecutionHandle", () => {
  it.each(["agent_team", "agent_org"] as const)(
    "prepares and publishes one root-neutral configured Agent under %s",
    async (kind) => {
      const fixture = build(kind);
      const prepared = await fixture.handle.prepareConfiguredActivation();
      expect(prepared.stagedPlatformBindings).toEqual([]);
      expect(prepared.stagedNoConversationBindingReplacements).toEqual([]);
      expect(fixture.handle.isActive()).toBe(false);
      const preparedInput = fixture.prepareNewAgentRun.mock.calls[0]![0];
      expect(preparedInput.runId).toBe("agent-run");
      expect(preparedInput.config.memberExecutionContext).toBe(fixture.memberExecutionContext);
      expect(preparedInput.config.memoryDir).toContain(`/${kind}/root-run/`);
      prepared.commitAfterDurability();
      expect(fixture.handle.isActive()).toBe(true);
      await expect(fixture.handle.getOrCreateAgentRun()).resolves.toBe(fixture.fakeRun);
    },
  );

  it("aborts a prepared candidate without publishing it", async () => {
    const fixture = build("agent_org");
    const prepared = await fixture.handle.prepareConfiguredActivation();
    await prepared.abort();
    expect(fixture.abort).toHaveBeenCalledTimes(1);
    expect(fixture.handle.isActive()).toBe(false);
    expect(() => prepared.commitAfterDurability()).toThrow("is not publishable");
  });

  it("rejects identity, physical scope, and sender-bound context mismatches", () => {
    const fixture = build("agent_team");
    const otherRoot = createAgentOrgRootExecutionIdentity("root-run");
    expect(() => new ConfiguredAgentExecutionHandle({
      identity: fixture.identity,
      physicalScope: createRootExecutionPhysicalScope({ root: otherRoot, ancestorTeamRunIds: [] }),
      execution: {} as never,
      activationMode: "fresh",
      memberExecutionContext: fixture.memberExecutionContext,
      callbacks: { publishAgentEvent: vi.fn(), commitPlatformBindingChange: vi.fn() },
    })).toThrow("same root");
  });
});

describe("accepted task-system input presentation", () => {
  it.each(Object.values(RuntimeKind))("publishes only genuinely accepted marked input through the shared %s handle", async (runtimeKind) => {
    const f = build("agent_org", runtimeKind);
    const prepared = await f.handle.prepareConfiguredActivation();
    prepared.commitAfterDurability();
    f.publishAgentEvent.mockClear();
    const input = new AgentInputUserMessage("Saved task result is ready.", SenderType.SYSTEM, null,
      markTaskDelegationSystemTaskNotificationMetadata({ task_id: "task-one" }));
    expect(input.metadata["suppress_system_task_notification"]).toBe(true);
    f.fakeRun.postUserMessage.mockResolvedValueOnce({ accepted: false, code: "NOT_ACTIVE" });
    expect(await f.handle.postMessage(input)).toMatchObject({ accepted: false });
    expect(f.publishAgentEvent.mock.calls.filter(([, event]) => event.kind === "member_input")).toHaveLength(0);
    f.fakeRun.postUserMessage.mockResolvedValueOnce({ accepted: true });
    expect(await f.handle.postMessage(input)).toMatchObject({ accepted: true });
    const inputs = f.publishAgentEvent.mock.calls.filter(([, event]) => event.kind === "member_input");
    expect(inputs).toHaveLength(1);
    const adapter = new CollaborationAgentPresentationEventAdapter(() => f.identity);
    expect(adapter.adapt(f.identity, inputs[0]![1])).toMatchObject({ kind: "publish", message: {
      type: "SYSTEM_TASK_NOTIFICATION", payload: { sender: { kind: "system" }, content: input.content },
    } });
    const human = new AgentInputUserMessage("Same words, human input.", SenderType.USER, null,
      markTaskDelegationSystemTaskNotificationMetadata({}));
    expect(adapter.adapt(f.identity, { kind: "member_input", message: human })).toMatchObject({
      kind: "publish", message: { type: "MEMBER_INPUT_MESSAGE" },
    });
  });
});


describe("member start failure: one step for both input entry points", () => {
  type Fixture = ReturnType<typeof build>;
  type Outcome = Readonly<{ ok: boolean; code?: string; message?: string }>;
  const work = () => new AgentInputUserMessage("First work");
  const entryPoints: Record<"postMessage" | "reserveInput", (f: Fixture) => Promise<Outcome>> = {
    postMessage: async (f) => {
      const result = await f.handle.postMessage(work());
      return result.accepted ? { ok: true } : { ok: false, code: result.code, message: result.message };
    },
    reserveInput: async (f) => {
      const result = await f.handle.reserveInput(work());
      return result.reserved ? { ok: true } : { ok: false, code: result.code, message: result.message };
    },
  };
  const entries = Object.keys(entryPoints) as (keyof typeof entryPoints)[];
  const cards = (f: Fixture) => f.publishAgentEvent.mock.calls.filter(([, event]) => event.kind === "readiness_failure");
  const providerFailure = () => Object.assign(new Error("model retired"), { code: "AGY_MODEL_UNAVAILABLE" });
  const closable = () => {
    const gate = { closed: null as string | null };
    const f = build("agent_team", RuntimeKind.AUTOBYTEUS, "fresh", () => { if (gate.closed) throw new Error(gate.closed); });
    return { gate, f };
  };

  it.each(entries)("%s: a start failure returns AGENT_RUN_ACTIVATION_FAILED naming the cause, shows error and emits exactly one conversation card", async (entry) => {
    const f = build("agent_team");
    f.fakeRun.postUserMessage.mockResolvedValue({ accepted: true });
    f.fakeRun.reserveUserMessage.mockResolvedValue({ reserved: true, reservation: { agentRunId: f.identity.agentRunId, cancel: vi.fn(), commit: vi.fn() } });
    f.prepareNewAgentRun.mockRejectedValueOnce(providerFailure());
    expect(await entryPoints[entry](f)).toEqual({ ok: false, code: "AGENT_RUN_ACTIVATION_FAILED", message: "AGY_MODEL_UNAVAILABLE: model retired" });
    expect(f.handle.getStatusSnapshot().details).toMatchObject({ status: "error", errorMessage: "AGY_MODEL_UNAVAILABLE: model retired" });
    expect(cards(f)).toEqual([[f.identity, { kind: "readiness_failure", code: "AGY_MODEL_UNAVAILABLE", message: "model retired" }]]);
    // The member starts on a later input once it can.
    expect(await entryPoints[entry](f)).toEqual({ ok: true });
    expect(cards(f)).toHaveLength(1);
  });

  it.each(entries)("%s: input closed during the start is not accepting input, with no error status and no card", async (entry) => {
    const { gate, f } = closable();
    f.prepareNewAgentRun.mockImplementationOnce(async () => { gate.closed = "The Task was marked DONE."; throw new Error("start interrupted"); });
    expect(await entryPoints[entry](f)).toEqual({ ok: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "The Task was marked DONE." });
    expect(f.handle.getStatusSnapshot().details.status).toBe("offline");
    expect(cards(f)).toEqual([]);
  });

  it.each(entries)("%s: a closed-input outcome never withdraws an existing error status", async (entry) => {
    const { gate, f } = closable();
    f.prepareNewAgentRun.mockRejectedValueOnce(providerFailure());
    await entryPoints[entry](f);
    gate.closed = "The Task was marked DONE.";
    expect(await entryPoints[entry](f)).toEqual({ ok: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "The Task was marked DONE." });
    expect(f.handle.getStatusSnapshot().details.status).toBe("error");
    expect(cards(f)).toHaveLength(1);
  });

  it.each(entries)("%s: a failure while the run is live is rethrown", async (entry) => {
    const { gate, f } = closable();
    await f.handle.getOrCreateAgentRun();
    gate.closed = "The root is shutting down.";
    await expect(entryPoints[entry](f)).rejects.toThrow("The root is shutting down.");
    expect(cards(f)).toEqual([]);
  });

  it("names the underlying cause when a start fails after its binding was committed durably", async () => {
    const f = build("agent_org", RuntimeKind.CODEX_APP_SERVER);
    f.fakeRun.subscribeToEvents.mockImplementation(() => { throw Object.assign(new Error("publication failed"), { code: "PUBLICATION_FAILED" }); });
    expect(await f.handle.postMessage(work())).toMatchObject({ accepted: false, code: "AGENT_RUN_ACTIVATION_FAILED",
      message: "PUBLICATION_FAILED: Provider binding committed durably but Agent readiness publication failed: publication failed" });
  });

  it("presents readiness_failure as the member's runtime ERROR card through an explicit adapter branch", () => {
    const f = build("agent_team");
    const adapter = new CollaborationAgentPresentationEventAdapter(() => f.identity);
    expect(adapter.adapt(f.identity, { kind: "readiness_failure", code: "AGY_MODEL_UNAVAILABLE", message: "model retired" })).toMatchObject({
      kind: "publish",
      message: { type: "ERROR", payload: { code: "AGY_MODEL_UNAVAILABLE", message: "model retired", error_scope: "runtime", error_effect: "terminal" } },
    });
  });
});

describe("on-demand binding readiness", () => {
  it("plans later readiness from the committed binding, not the constructor's null binding", async () => {
    const f = build("agent_org", RuntimeKind.CODEX_APP_SERVER, "restore");
    await f.handle.getOrCreateAgentRun();
    expect(f.commitPlatformBindingChange).toHaveBeenCalledWith(expect.objectContaining({
      kind: "adopt_or_retain", binding: expect.objectContaining({ platformAgentRunId: "external-thread" }),
    }));
    f.fakeRun.isActive.mockReturnValue(false);
    f.activity.kind = "present";
    await f.handle.getOrCreateAgentRun();
    expect(f.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledWith(expect.objectContaining({ platformAgentRunId: "external-thread" }));
    expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
  });

  it("marks publication failure after durability indeterminate and never repeats candidate preparation", async () => {
    const f = build("agent_org", RuntimeKind.CODEX_APP_SERVER);
    f.fakeRun.subscribeToEvents.mockImplementation(() => { throw new Error("publication failed"); });
    await expect(f.handle.getOrCreateAgentRun()).rejects.toMatchObject({ indeterminate: true });
    await expect(f.handle.getOrCreateAgentRun()).rejects.toMatchObject({ indeterminate: true });
    expect(f.commitPlatformBindingChange).toHaveBeenCalledTimes(1);
    expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
    expect(f.abort).not.toHaveBeenCalled();
    expect(f.releaseExactRun).toHaveBeenCalledWith(f.fakeRun);
  });

  it("retains cleanup quarantine as nonretryable even on a definite root rejection", async () => {
    const f = build("agent_org", RuntimeKind.CODEX_APP_SERVER);
    f.commitPlatformBindingChange.mockRejectedValue(new Error("rejected"));
    f.abort.mockResolvedValue({ kind: "quarantined", error: new Error("cleanup unavailable") } as never);
    await expect(f.handle.getOrCreateAgentRun()).rejects.toMatchObject({ indeterminate: true, code: "AGENT_RUN_ACTIVATION_CLEANUP_FAILED" });
    await expect(f.handle.getOrCreateAgentRun()).rejects.toMatchObject({ indeterminate: true });
    expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
  });
});

describe("dead member (stale run) termination", () => {
  const activate = async (f: ReturnType<typeof build>) => { await f.handle.getOrCreateAgentRun(); };

  it("terminates a published run through the AgentRunManager as before", async () => {
    const f = build("agent_org");
    await activate(f);
    const prepared = await f.handle.prepareTermination();
    await expect(prepared.commit().finish()).resolves.toEqual({ accepted: true });
    expect(f.prepareAgentRunTermination).toHaveBeenCalledWith(f.fakeRun);
    expect(f.localFinish).toHaveBeenCalledOnce();
  });

  it("completes termination of a run the manager no longer publishes and disposes the handle", async () => {
    const f = build("agent_org", RuntimeKind.ANTIGRAVITY_CLI);
    await activate(f);
    f.crash();
    const prepared = await f.handle.prepareTermination();
    await expect(prepared.commit().finish()).resolves.toEqual({ accepted: true });
    expect(f.prepareAgentRunTermination).toHaveBeenCalledWith(f.fakeRun);
    expect(f.handle.getStatusSnapshot().details.status).toBe("offline");
    await expect(f.handle.terminate()).resolves.toEqual({ accepted: true });
  });

  it("completes quiescent termination of a stale run", async () => {
    const f = build("agent_team", RuntimeKind.ANTIGRAVITY_CLI);
    await activate(f);
    f.crash();
    f.tryPrepareAgentRunTerminationIfQuiescent.mockResolvedValue(await f.prepareAgentRunTermination() as never);
    const prepared = await f.handle.tryPrepareTerminationIfQuiescent();
    expect(prepared).not.toBeNull();
    await expect(prepared!.commit().finish()).resolves.toEqual({ accepted: true });
    expect(f.tryPrepareAgentRunTerminationIfQuiescent).toHaveBeenCalledWith(f.fakeRun);
  });

  it("accepts the root-shutdown fence for a stale run and never re-activates it afterwards", async () => {
    const f = build("agent_org", RuntimeKind.ANTIGRAVITY_CLI);
    await activate(f);
    f.crash();
    await expect(f.handle.fenceForRootShutdown()).resolves.toEqual({ accepted: true });
    expect(f.fakeRun.fenceInputAndInterruptForRootShutdown).not.toHaveBeenCalled();
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow("closed for input");
    expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(1);
    expect(f.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();
  });

  it("fences a published run through the run as before", async () => {
    const f = build("agent_org");
    await activate(f);
    await expect(f.handle.fenceForRootShutdown()).resolves.toEqual({ accepted: true });
    expect(f.fakeRun.fenceInputAndInterruptForRootShutdown).toHaveBeenCalledOnce();
  });

  it("surfaces a stale-discovery cleanup failure once, then completes on retry", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const f = build("agent_org", RuntimeKind.ANTIGRAVITY_CLI);
      await activate(f);
      f.crash();
      f.localFinish.mockRejectedValueOnce(new Error("resource release failed"));
      const prepared = await f.handle.prepareTermination();
      await expect(prepared.commit().finish()).rejects.toThrow("resource release failed");
      await expect(prepared.commit().finish()).resolves.toEqual({ accepted: true });
      expect(f.prepareAgentRunTermination).toHaveBeenCalledWith(f.fakeRun);
    } finally { warn.mockRestore(); }
  });
});

describe("re-activation after the member's runtime died", () => {
  it("resumes the persisted external conversation in a fresh-created Org instead of rejecting it", async () => {
    const f = build("agent_org", RuntimeKind.ANTIGRAVITY_CLI, "fresh");
    await f.handle.getOrCreateAgentRun();
    expect(f.prepareNewAgentRun).toHaveBeenCalledOnce();
    f.activity.kind = "present";
    f.fakeRun.isActive.mockReturnValueOnce(false); // the member's runtime died
    await expect(f.handle.getOrCreateAgentRun()).resolves.toBe(f.fakeRun);
    expect(f.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledWith(expect.objectContaining({
      runId: "agent-run", platformAgentRunId: "external-thread",
    }));
    expect(f.prepareNewAgentRun).toHaveBeenCalledOnce();
  });

  it("switches to restore after eager (prepared) publication too", async () => {
    const f = build("agent_team", RuntimeKind.AUTOBYTEUS, "fresh");
    const prepared = await f.handle.prepareConfiguredActivation();
    prepared.commitAfterDurability();
    f.activity.kind = "present";
    f.fakeRun.isActive.mockReturnValueOnce(false);
    await f.handle.getOrCreateAgentRun();
    expect(f.prepareRestoreAgentRun).toHaveBeenCalledOnce();
    expect(f.prepareNewAgentRun).toHaveBeenCalledOnce();
  });

  it.each([
    ["throws", (f: ReturnType<typeof build>) =>
      f.releaseExactRun.mockRejectedValueOnce(new AggregateError([new Error("provider stop unconfirmed")], "Exact release failed."))],
    ["is not accepted", (f: ReturnType<typeof build>) =>
      f.releaseExactRun.mockResolvedValueOnce({ accepted: false, code: "BUSY", message: "still stopping" } as never)],
  ] as const)("retries the previous runtime's release on the next work after it %s once (AC-006)", async (_label, failOnce) => {
    const f = build("agent_team", RuntimeKind.ANTIGRAVITY_CLI, "fresh");
    await f.handle.getOrCreateAgentRun();
    f.activity.kind = "present";
    f.crash(); // e.g. an Antigravity interrupt stopped the member's process
    failOnce(f);

    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow();
    expect(f.releaseExactRun).toHaveBeenLastCalledWith(f.fakeRun);
    expect(f.prepareRestoreAgentRunFromPlatformState).not.toHaveBeenCalled();

    f.fakeRun.isActive.mockReturnValue(true);
    f.fakeRun.isActive.mockReturnValueOnce(false);
    await expect(f.handle.getOrCreateAgentRun()).resolves.toBe(f.fakeRun);
    expect(f.releaseExactRun).toHaveBeenCalledTimes(2);
    expect(f.releaseExactRun).toHaveBeenNthCalledWith(2, f.fakeRun);
    expect(f.prepareRestoreAgentRunFromPlatformState).toHaveBeenCalledOnce();
  });

  it("keeps the constructor mode when the first activation fails", async () => {
    const f = build("agent_org", RuntimeKind.AUTOBYTEUS, "fresh");
    f.prepareNewAgentRun.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(f.handle.getOrCreateAgentRun()).rejects.toThrow("provider unavailable");
    f.activity.kind = "present";
    await expect(f.handle.getOrCreateAgentRun()).resolves.toBe(f.fakeRun);
    expect(f.prepareNewAgentRun).toHaveBeenCalledTimes(2);
    expect(f.prepareRestoreAgentRun).not.toHaveBeenCalled();
  });
});
