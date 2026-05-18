import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";


const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("AgentRun", () => {
  it("publishes backend-owned initializing status before a delayed accepted offline send resolves", async () => {
    let listener: ((event: AgentRunEvent) => void) | null = null;
    const observedEvents: AgentRunEvent[] = [];
    const sendDeferred = createDeferred<{ accepted: true }>();
    const backend = {
      getPlatformAgentRunId: () => "platform-run-1",
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "idle" as const, can_interrupt: false }),
      subscribeToEvents: vi.fn().mockImplementation((next: (event: AgentRunEvent) => void) => {
        listener = next;
        return () => {
          listener = null;
        };
      }),
      postUserMessage: vi.fn().mockImplementation(() => sendDeferred.promise),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const run = new AgentRun({
      context: new AgentRunContext({
        runId: "agent-run-1",
        config: new AgentRunConfig({
          runtimeKind: "codex_app_server",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-5.3-codex",
          autoExecuteTools: false,
          workspaceId: null,
          llmConfig: null,
          skillAccessMode: null,
        }),
        runtimeContext: null,
      }),
      backend: backend as never,
    });

    run.subscribeToEvents((event) => observedEvents.push(event));
    const postPromise = run.postUserMessage({ text: "start" } as never);

    expect(run.getStatusSnapshot()).toEqual({
      status: "initializing",
      can_interrupt: false,
      agent_id: "agent-run-1",
    });
    expect(observedEvents).toContainEqual(expect.objectContaining({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: expect.objectContaining({ status: "initializing", can_interrupt: false }),
    }));
    expect(backend.postUserMessage).toHaveBeenCalledTimes(1);

    sendDeferred.resolve({ accepted: true });
    await postPromise;

    listener?.({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: "agent-run-1",
      payload: { status: "running", can_interrupt: true },
      statusHint: "ACTIVE",
    });

    expect(run.getStatusSnapshot()).toEqual({
      status: "running",
      can_interrupt: true,
      agent_id: "agent-run-1",
    });
  });

  it("restores the prior terminal status when an early command-start send is rejected", async () => {
    const observedEvents: AgentRunEvent[] = [];
    const backend = {
      getPlatformAgentRunId: () => null,
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "idle" as const, can_interrupt: false }),
      subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
      postUserMessage: vi.fn().mockResolvedValue({ accepted: false, code: "REJECTED" }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const run = new AgentRun({
      context: new AgentRunContext({
        runId: "agent-run-rejected",
        config: new AgentRunConfig({
          runtimeKind: "codex_app_server",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-5.3-codex",
          autoExecuteTools: false,
          workspaceId: null,
          llmConfig: null,
          skillAccessMode: null,
        }),
        runtimeContext: null,
      }),
      backend: backend as never,
    });

    run.subscribeToEvents((event) => observedEvents.push(event));
    await run.postUserMessage({ text: "start" } as never);

    expect(observedEvents.map((event) => (event.payload as any).status)).toEqual([
      "initializing",
      "idle",
    ]);
    expect(run.getStatusSnapshot()).toEqual({ status: "idle", can_interrupt: false });
  });

  it("publishes error when a delayed command-start send throws", async () => {
    const observedEvents: AgentRunEvent[] = [];
    const backend = {
      getPlatformAgentRunId: () => null,
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "offline" as const, can_interrupt: false }),
      subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
      postUserMessage: vi.fn().mockRejectedValue(new Error("startup failed")),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const run = new AgentRun({
      context: new AgentRunContext({
        runId: "agent-run-error",
        config: new AgentRunConfig({
          runtimeKind: "codex_app_server",
          agentDefinitionId: "agent-def-1",
          llmModelIdentifier: "gpt-5.3-codex",
          autoExecuteTools: false,
          workspaceId: null,
          llmConfig: null,
          skillAccessMode: null,
        }),
        runtimeContext: null,
      }),
      backend: backend as never,
    });

    run.subscribeToEvents((event) => observedEvents.push(event));
    await expect(run.postUserMessage({ text: "start" } as never)).rejects.toThrow("startup failed");

    expect(observedEvents.map((event) => (event.payload as any).status)).toEqual([
      "initializing",
      "error",
    ]);
    expect(run.getStatusSnapshot()).toMatchObject({ status: "error", agent_id: "agent-run-error" });
  });

});
