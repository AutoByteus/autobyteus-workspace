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
import { runtimeSessionReopenFailedResult } from "../../../src/agent-execution/backends/shared/runtime-session-reopen.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testActivationManager } from "../../fixtures/agent-run-preparation-fixtures.js";

// autobyteus-324 SR-009 / AC-007: a Team member whose runtime session could not be reopened with its
// new tools. Its direct input is admitted, then the turn start fails: the member's Team stream gets a
// run ERROR with the plain message, through the real handle, a real AgentRun and the real
// presentation adapter. The other member's stream gets nothing.

const root = createTeamRootExecutionIdentity("team-run");
const scope = createRootExecutionPhysicalScope({ root, ancestorTeamRunIds: [] });

/** A real AgentRun over a fake idle backend; `failReopen` makes every turn start fail as a failed reopen does. */
const createRun = (identity: CollaborationMemberExecutionIdentity, memberExecutionContext: MemberExecutionContext, failReopen: boolean) => {
  const context = new AgentRunContext({
    runId: identity.agentRunId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, agentDefinitionId: "def", llmModelIdentifier: "gpt",
      autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: null, memberExecutionContext,
    }),
    runtimeContext: null,
  });
  const dispatchUserInput = vi.fn(async (_dispatch: AgentRunBackendInputDispatch) => failReopen
    ? runtimeSessionReopenFailedResult(new Error("thread/resume refused"))
    : { forwarded: true, turnId: "turn-1" });
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
    subscribeToSourceEventBatches: () => () => undefined,
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

const createMember = (address: string, failReopen: boolean, publishAgentEvent: (...args: unknown[]) => void) => {
  const identity = createCollaborationMemberExecutionIdentity({ root, memberAddress: address, agentRunId: `run${address.replace("/", "-")}` });
  const memberExecutionContext = new MemberExecutionContext({
    teamScoped: true, collaborationRole: "team_member", identity,
    collaboration: new MemberCollaborationContext({ deliverLogicalMessage: async () => ({ accepted: true }) }),
    tasks: { root, delegateToNewCopy: vi.fn(), ownedTaskOf: () => null, assignToExistingCopy: vi.fn(), submitTaskResult: vi.fn(), reviewTaskResult: vi.fn() } as never,
  });
  const { run, dispatchUserInput } = createRun(identity, memberExecutionContext, failReopen);
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

describe("a Team member's failed reopen reaches its Team stream (AC-007)", () => {
  it("publishes a run ERROR with the plain message for that member only", async () => {
    // The Team stream: every member event goes through the real presentation adapter.
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
    const failing = createMember("/Coder", true, publishAgentEvent);
    const healthy = createMember("/Reviewer", false, publishAgentEvent);
    members.set(failing.identity.agentRunId, failing.identity);
    members.set(healthy.identity.agentRunId, healthy.identity);

    // Direct input is admitted for both members (the failure comes after admission).
    expect(await failing.handle.postMessage(new AgentInputUserMessage("Use the new tool."))).toMatchObject({ accepted: true });
    expect(await healthy.handle.postMessage(new AgentInputUserMessage("Review this."))).toMatchObject({ accepted: true });
    await vi.waitFor(() => expect(failing.dispatchUserInput).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(healthy.dispatchUserInput).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(stream.filter((entry) => entry.type === "ERROR")).toHaveLength(1));

    const errors = stream.filter((entry) => entry.type === "ERROR");
    expect(errors).toEqual([{
      agentRunId: failing.identity.agentRunId,
      type: "ERROR",
      payload: expect.objectContaining({
        code: expect.stringMatching(/^(RUNTIME_SESSION_REOPEN_FAILED|RUNTIME_REJECTED)$/),
        message: "Couldn't give this run its new tools (thread/resume refused). Send your message again to retry, or stop and resume the run.",
        error_scope: null,
        error_effect: null,
      }),
    }]);
    expect(stream.filter((entry) => entry.agentRunId === healthy.identity.agentRunId && entry.type === "ERROR")).toEqual([]);
  });
});
