import { describe, expect, it, vi } from "vitest";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";

describe("AgentRun", () => {
  it("publishes backend-owned initializing status after an accepted offline send", async () => {
    let listener: ((event: AgentRunEvent) => void) | null = null;
    const observedEvents: AgentRunEvent[] = [];
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
      postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
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
    await run.postUserMessage({ text: "start" } as never);

    expect(run.getStatusSnapshot()).toEqual({
      status: "initializing",
      can_interrupt: false,
      agent_id: "agent-run-1",
    });
    expect(observedEvents).toContainEqual(expect.objectContaining({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: expect.objectContaining({ status: "initializing", can_interrupt: false }),
    }));

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
});
