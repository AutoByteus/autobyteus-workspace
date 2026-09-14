import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { markTaskDelegationSystemTaskNotificationMetadata } from "../../../src/agent-collaboration/execution/events/task-system-input-presentation.js";
import { CollaborationAgentPresentationEventAdapter } from "../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
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
  delegateTask: vi.fn(),
  submitTaskResult: vi.fn(),
  reviewTaskResult: vi.fn(),
});

const build = (kind: "agent_team" | "agent_org", runtimeKind = RuntimeKind.AUTOBYTEUS, mode: "fresh" | "restore" = "fresh") => {
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
    isActive: vi.fn(() => true),
    getStatusSnapshot: () => ({ status: "idle" }),
    subscribeToEvents: vi.fn(() => () => undefined),
    reserveUserMessage: vi.fn(),
    postUserMessage: vi.fn(),
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(async () => ({ accepted: true as const })),
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
      skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
      runtimeKind,
      workspaceRootPath: null,
      platformAgentRunId: null,
    },
    activationMode: mode,
    memberExecutionContext,
    callbacks: { publishAgentEvent, commitPlatformBindingChange },
    agentRunManager: { prepareNewAgentRun, prepareRestoreAgentRunFromPlatformState } as never,
    memoryLocator: {
      getLocation: (physicalScope: typeof scope, agentRunId: string) => ({
        scope: physicalScope,
        agentRunId,
        memoryDir: `/memory/${physicalScope.root.rootSubjectKind}/${physicalScope.root.rootRunId}/${physicalScope.ancestorTeamRunIds.join("/")}/${agentRunId}`,
      }),
    } as never,
    activityInspector: { inspect: () => activity } as never,
  });
  return { activity, commitPlatformBindingChange, prepareRestoreAgentRunFromPlatformState, handle, root, identity, scope, memberExecutionContext, prepareNewAgentRun, fakeRun, abort, publishAgentEvent };
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
    expect(f.abort).toHaveBeenCalledTimes(1);
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
