import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../autobyteus-server-ts/src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js";

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("AgentRun accepted-startup status timing probe", () => {
  it("currently withholds initializing until backend.postUserMessage resolves", async () => {
    let resolveBackendSend: ((value: { accepted: true }) => void) | null = null;
    const observedEvents: AgentRunEvent[] = [];
    const backend = {
      getPlatformAgentRunId: () => "platform-run-1",
      isActive: () => true,
      getStatusSnapshot: () => ({ status: "offline" as const, can_interrupt: false }),
      subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
      postUserMessage: vi.fn().mockImplementation(() => new Promise((resolve) => {
        resolveBackendSend = resolve as (value: { accepted: true }) => void;
      })),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
    const run = new AgentRun({
      context: new AgentRunContext({
        runId: "agent-run-delayed",
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
    const sendPromise = run.postUserMessage({ text: "start" } as never);
    await flushMicrotasks();

    expect(backend.postUserMessage).toHaveBeenCalledOnce();
    expect(observedEvents.filter((event) => event.eventType === AgentRunEventType.AGENT_STATUS)).toHaveLength(0);
    expect(run.getStatusSnapshot()).toEqual({ status: "offline", can_interrupt: false });

    resolveBackendSend?.({ accepted: true });
    await sendPromise;

    expect(observedEvents).toContainEqual(expect.objectContaining({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: expect.objectContaining({ status: "initializing" }),
    }));
  });
});
