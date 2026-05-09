import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { AutoByteusAgentRunBackend } from "../../../../../src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.js";

const createBackend = (overrides: {
  agent?: Partial<ConstructorParameters<typeof AutoByteusAgentRunBackend>[1]>;
  isActive?: () => boolean;
  removeAgent?: (runId: string) => Promise<boolean>;
} = {}) => {
  const agent = {
    agentId: "agent-1",
    currentStatus: "idle",
    postUserMessage: vi.fn().mockResolvedValue(undefined),
    postToolExecutionApproval: vi.fn().mockResolvedValue({
      accepted: true,
      code: "posted",
      turnId: "turn-1",
      invocationId: "invoke-1",
    }),
    interrupt: vi.fn().mockResolvedValue({
      accepted: true,
      status: "accepted",
      turnId: "turn-1",
    }),
    stop: vi.fn().mockResolvedValue(undefined),
    ...overrides.agent,
  };
  const removeAgent = overrides.removeAgent ?? vi.fn().mockResolvedValue(true);
  const context = new AgentRunContext({
    runId: "agent-1",
    config: new AgentRunConfig({
      agentDefinitionId: "def-1",
      llmModelIdentifier: "model-1",
      autoExecuteTools: false,
    }),
    runtimeContext: null,
  });

  const backend = new AutoByteusAgentRunBackend(context, agent as any, {
    isActive: overrides.isActive ?? (() => true),
    removeAgent,
  });

  return {
    backend,
    agent,
    removeAgent,
    context,
  };
};

describe("AutoByteusAgentRunBackend", () => {
  it("delegates send and approval commands to the native agent", async () => {
    const { backend, agent, context } = createBackend();

    const sendResult = await backend.postUserMessage(new AgentInputUserMessage("hello backend"));
    const approveResult = await backend.approveToolInvocation("invoke-1", true, "approved");

    expect(agent.postUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: "hello backend" }),
    );
    expect(agent.postToolExecutionApproval).toHaveBeenCalledWith("invoke-1", true, "approved");
    expect(sendResult).toEqual({ accepted: true });
    expect(approveResult).toEqual({
      accepted: true,
      code: "posted",
      message: undefined,
      turnId: "turn-1",
    });
    expect(backend.getStatus()).toBe("idle");
    expect(backend.getPlatformAgentRunId()).toBe("agent-1");
    expect(backend.getContext()).toBe(context);
  });

  it("keeps dispatch enqueue-oriented even when the native runtime already has an active turn", async () => {
    const { backend } = createBackend({
      agent: {
        context: {
          state: {
            activeTurn: {
              turnId: "turn-1",
            },
          },
        },
      },
    });

    const result = await backend.postUserMessage(new AgentInputUserMessage("hello backend"));

    expect(result).toEqual({ accepted: true });
  });

  it("interrupts the active native run through native interrupt()", async () => {
    const { backend, agent } = createBackend({
      agent: {
        currentStatus: "running",
      },
    });

    const result = await backend.interrupt();

    expect(agent.interrupt).toHaveBeenCalledWith({
      turnId: null,
      reason: "user_interrupt",
    });
    expect(agent.stop).not.toHaveBeenCalled();
    expect(result).toEqual({
      accepted: true,
      code: "accepted",
      message: undefined,
      turnId: "turn-1",
    });
  });

  it("maps stale native tool approval results without treating them as command failures", async () => {
    const { backend } = createBackend({
      agent: {
        postToolExecutionApproval: vi.fn().mockResolvedValue({
          accepted: false,
          code: "no_active_turn",
          invocationId: "invoke-2",
          message: "no active turn",
        }),
      },
    });

    await expect(
      backend.approveToolInvocation("invoke-2", false, "denied"),
    ).resolves.toEqual({
      accepted: false,
      code: "no_active_turn",
      message: "no active turn",
      turnId: null,
    });
  });

  it("terminates the run by removing it from the native registry", async () => {
    const removeAgent = vi.fn().mockResolvedValue(true);
    const { backend } = createBackend({
      removeAgent,
    });

    const result = await backend.terminate();

    expect(removeAgent).toHaveBeenCalledWith("agent-1");
    expect(result).toEqual({ accepted: true });
  });

  it("returns RUN_NOT_FOUND when the run is no longer active", async () => {
    const { backend, agent } = createBackend({
      isActive: () => false,
    });

    const sendResult = await backend.postUserMessage(
      new AgentInputUserMessage("hello inactive run"),
    );
    const interruptResult = await backend.interrupt();

    expect(agent.postUserMessage).not.toHaveBeenCalled();
    expect(agent.interrupt).not.toHaveBeenCalled();
    expect(agent.stop).not.toHaveBeenCalled();
    expect(sendResult).toEqual({
      accepted: false,
      code: "RUN_NOT_FOUND",
      message: "Run 'agent-1' is not active.",
    });
    expect(interruptResult).toEqual({
      accepted: false,
      code: "RUN_NOT_FOUND",
      message: "Run 'agent-1' is not active.",
    });
  });

  it("wraps native command failures as runtime command failures", async () => {
    const { backend } = createBackend({
      agent: {
        interrupt: vi.fn().mockRejectedValue(new Error("interrupt failed")),
      },
    });

    const result = await backend.interrupt();

    expect(result).toEqual({
      accepted: false,
      code: "RUNTIME_COMMAND_FAILED",
      message: "Failed to interrupt run: Error: interrupt failed",
    });
  });
});
