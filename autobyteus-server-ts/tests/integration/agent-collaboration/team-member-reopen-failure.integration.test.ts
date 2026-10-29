import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import { ConfiguredAgentExecutionHandle } from "../../../src/agent-collaboration/execution/backends/configured-agent-execution-handle.js";
import { CollaborationAgentPresentationEventAdapter } from "../../../src/agent-collaboration/execution/events/collaboration-agent-presentation-event-adapter.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
  type CollaborationMemberExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { MemberCollaborationContext, MemberExecutionContext } from "../../../src/agent-collaboration/execution/domain/member-execution-context.js";
import { runPartPlacement } from "../../../src/agent-memory/domain/agent-run-memory-placement.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import type { AgentRunBackendInputDispatch } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { runtimeSessionReopenFailedResult } from "../../../src/agent-execution/backends/shared/runtime-session-reopen.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";

// autobyteus-324 SR-009 / AC-007: a Team member whose runtime session could not be reopened with its
// new tools. Its direct input is admitted, then the turn start fails: the member's Team stream gets a
// run ERROR with the plain message, through the real handle, a real AgentRun and the real
// presentation adapter. The other member's stream gets nothing.

const root = createTeamRootExecutionIdentity("team-run");
const scope = createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [] });

/**
 * How the member's fake backend handles a turn start: `reopen_fails` fails it before sending (as a
 * failed reopen does); `forwards` sends it; `turn_fails` sends it, then the turn fails with a
 * turn-terminal ERROR the run publishes itself (an ordinary failed turn).
 */
type Behavior = "reopen_fails" | "forwards" | "turn_fails";

/** A real AgentRun over a fake idle backend with the given turn-start behavior. */
const createRun = (identity: CollaborationMemberExecutionIdentity, memberExecutionContext: MemberExecutionContext, behavior: Behavior) => {
  const context = new AgentRunContext({
    runId: identity.agentRunId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: "def", llmModelIdentifier: "gpt",
      autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: null, memberExecutionContext,
    }),
    runtimeContext: null,
  });
  const listeners = new Set<(events: readonly AgentRunEvent[]) => void | Promise<void>>();
  const emit = (eventType: AgentRunEventType, payload: Record<string, unknown>) => {
    for (const listener of listeners) void listener([{ eventType, runId: identity.agentRunId, payload, statusHint: null }]);
  };
  const dispatchUserInput = vi.fn(async (_dispatch: AgentRunBackendInputDispatch) => {
    if (behavior === "reopen_fails") return runtimeSessionReopenFailedResult(new Error("thread/resume refused"));
    if (behavior === "turn_fails") {
      setTimeout(() => {
        emit(AgentRunEventType.TURN_STARTED, { turn_id: "turn-1" });
        emit(AgentRunEventType.ERROR, {
          code: "PROVIDER_ERROR", message: "rate limited", error_scope: "turn", error_effect: "terminal", turn_id: "turn-1",
        });
      }, 0);
    }
    return { forwarded: true, turnId: "turn-1" };
  });
  const backend = {
    runId: identity.agentRunId,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    compactionRecovery: { kind: "unsupported" } as const,
    backgroundTaskInspection: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: "supported" },
    getContext: () => context,
    getPlatformAgentRunId: () => "thread-1",
    isActive: () => true,
    getLifecycleSnapshot: () => ({ availability: "active", phase: "idle", currentTurn: { kind: "NONE" } }),
    hasRunningBackgroundTasks: () => false,
    subscribeToSourceEventBatches: (listener: (events: readonly AgentRunEvent[]) => void | Promise<void>) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatchUserInput,
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
    applyDefinitionTools: vi.fn(),
    getToolNames: () => [],
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context,
    backend: backend as never,
  });
  return { run, dispatchUserInput };
};

const createMember = (address: string, behavior: Behavior, publishAgentEvent: (...args: unknown[]) => void) => {
  const identity = createCollaborationMemberExecutionIdentity({ root, memberAddress: address, agentRunId: `run${address.replace("/", "-")}` });
  const memberExecutionContext = new MemberExecutionContext({
    teamScoped: true, collaborationRole: "team_member", identity,
    collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }),
    tasks: { root, delegateToNewCopy: vi.fn(), ownedTaskOf: () => null, assignToExistingCopy: vi.fn(), submitTaskResult: vi.fn(), reviewTaskResult: vi.fn() } as never,
  });
  const { run, dispatchUserInput } = createRun(identity, memberExecutionContext, behavior);
  const preparation = async ({ runId }: { runId: string }) => ({
    runId, runtimeKind: RuntimeKind.CODEX_APP_SERVER, platformAgentRunId: "thread-1",
    commitPublication: () => run, abort: async () => ({ kind: "aborted" as const }),
  });
  const handle = new ConfiguredAgentExecutionHandle({
    identity,
    physicalScope: scope,
    memoryPlacement: runPartPlacement(scope),
    execution: {
      agentDefinitionId: "def", llmModelIdentifier: "gpt", llmConfig: null, autoExecuteTools: false,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, workspaceRootPath: null, platformAgentRunId: null,
    },
    activationMode: "fresh",
    memberExecutionContext,
    callbacks: { publishAgentEvent, commitPlatformBindingChange: vi.fn() },
    agentRunManager: testActivationManager({
      newPreparation: preparation, platformPreparation: preparation, restorePreparation: preparation,
      getActiveRun: () => run,
      prepareAgentRunTermination: vi.fn(), tryPrepareAgentRunTerminationIfQuiescent: vi.fn(async () => null),
      releaseExactRun: vi.fn(async () => ({ accepted: true })),
    }) as never,
    memoryLocator: { getMemoryDir: (_placement: unknown, agentRunId: string) => `/memory/team-run/${agentRunId}` } as never,
    activityInspector: { inspect: () => ({ kind: "none" }) } as never,
  });
  return { identity, handle, run, dispatchUserInput };
};

/** The Team stream: every member event goes through the real presentation adapter. */
const createTeamStream = () => {
  const members = new Map<string, CollaborationMemberExecutionIdentity>();
  const adapter = new CollaborationAgentPresentationEventAdapter((agentRunId) => members.get(agentRunId) ?? null);
  const stream: Array<{ agentRunId: string; type: string; payload: Record<string, unknown> }> = [];
  const publishAgentEvent = (identity: unknown, event: unknown) => {
    const memberIdentity = identity as CollaborationMemberExecutionIdentity;
    const result = adapter.adapt(memberIdentity, event as never);
    if (result.kind === "publish") {
      stream.push({ agentRunId: memberIdentity.agentRunId, type: result.message.type, payload: result.message.payload as Record<string, unknown> });
    }
  };
  const add = (address: string, behavior: Behavior) => {
    const member = createMember(address, behavior, publishAgentEvent);
    members.set(member.identity.agentRunId, member.identity);
    return member;
  };
  const errors = () => stream.filter((entry) => entry.type === "ERROR");
  return { add, errors };
};

describe("a Team member's failed message reaches its Team stream once (AC-007)", () => {
  it("publishes a run ERROR for a message that was not sent (a failed reopen), for that member only", async () => {
    const team = createTeamStream();
    const failing = team.add("/Coder", "reopen_fails");
    const healthy = team.add("/Reviewer", "forwards");

    // Direct input is admitted for both members (the failure comes after admission).
    expect(await failing.handle.postMessage(new AgentInputUserMessage("Use the new tool."))).toMatchObject({ accepted: true });
    expect(await healthy.handle.postMessage(new AgentInputUserMessage("Review this."))).toMatchObject({ accepted: true });
    await vi.waitFor(() => expect(failing.dispatchUserInput).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(healthy.dispatchUserInput).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(team.errors()).toHaveLength(1));

    expect(team.errors()).toEqual([{
      agentRunId: failing.identity.agentRunId,
      type: "ERROR",
      payload: expect.objectContaining({
        code: "RUNTIME_SESSION_REOPEN_FAILED",
        message: "Couldn't give this run its new tools (thread/resume refused). Send your message again to retry, or stop and resume the run.",
        error_scope: null,
        error_effect: null,
      }),
    }]);
  });

  it("adds nothing for a message that was sent and whose turn then failed: the run's own ERROR is the only one", async () => {
    const team = createTeamStream();
    const member = team.add("/Coder", "turn_fails");

    expect(await member.handle.postMessage(new AgentInputUserMessage("Do the work."))).toMatchObject({ accepted: true });
    await vi.waitFor(() => expect(team.errors()).toHaveLength(1));
    // Let any second (duplicate) publication arrive before counting.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(team.errors()).toEqual([{
      agentRunId: member.identity.agentRunId,
      type: "ERROR",
      payload: expect.objectContaining({ code: "PROVIDER_ERROR", message: "rate limited" }),
    }]);
  });
});
