import { AgentInputUserMessage } from "autobyteus-ts";
import { describe, expect, it, vi } from "vitest";
import { ClaudeAgentSdkRuntimeAdapter } from "../../../../src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.js";
import type { ClaudeAgentSdkRuntimeService } from "../../../../src/runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";

const buildRuntimeService = () =>
  ({
    resolveWorkingDirectory: vi.fn().mockResolvedValue("/workspace/path"),
    createRunSession: vi.fn().mockResolvedValue({
      sessionId: "claude-session-1",
      metadata: { model: "claude-sonnet-4-5" },
    }),
    restoreRunSession: vi.fn().mockResolvedValue({
      sessionId: "claude-session-restored",
      metadata: { restored: true },
    }),
    sendTurn: vi.fn().mockResolvedValue({ turnId: "turn-1" }),
    injectInterAgentEnvelope: vi.fn().mockResolvedValue({ turnId: "turn-relay-1" }),
    getRunRuntimeReference: vi.fn().mockReturnValue({
      sessionId: "claude-session-1",
      metadata: { model: "claude-sonnet-4-5" },
    }),
    approveTool: vi.fn().mockRejectedValue(new Error("unsupported approval")),
    interruptRun: vi.fn().mockResolvedValue(undefined),
    terminateRun: vi.fn().mockResolvedValue(undefined),
  }) as unknown as ClaudeAgentSdkRuntimeService;

describe("ClaudeAgentSdkRuntimeAdapter", () => {
  it("creates run sessions and returns claude runtime references", async () => {
    const runtimeService = buildRuntimeService();
    const adapter = new ClaudeAgentSdkRuntimeAdapter(runtimeService);

    const result = await adapter.createAgentRun({
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "claude-sonnet-4-5",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
      skillAccessMode: null,
    });

    expect(result.runId).toBeTruthy();
    expect(result.runtimeReference).toEqual({
      runtimeKind: "claude_agent_sdk",
      sessionId: "claude-session-1",
      threadId: "claude-session-1",
      metadata: { model: "claude-sonnet-4-5" },
    });
    expect((runtimeService.resolveWorkingDirectory as any).mock.calls[0][0]).toBe("workspace-1");
    expect((runtimeService.createRunSession as any).mock.calls[0][0]).toBe(result.runId);
    expect((runtimeService.createRunSession as any).mock.calls[0][1]).toMatchObject({
      autoExecuteTools: false,
    });
  });

  it("restores run sessions from persisted runtime reference", async () => {
    const runtimeService = buildRuntimeService();
    const adapter = new ClaudeAgentSdkRuntimeAdapter(runtimeService);

    const result = await adapter.restoreAgentRun({
      runId: "run-restore-1",
      runtimeKind: "claude_agent_sdk",
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "persisted-session",
        threadId: null,
        metadata: { previous: true },
      },
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "claude-sonnet-4-5",
      autoExecuteTools: true,
      workspaceId: "workspace-1",
      llmConfig: { temperature: 0.2 },
      skillAccessMode: null,
    });

    expect(result).toEqual({
      runId: "run-restore-1",
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "claude-session-restored",
        threadId: "claude-session-restored",
        metadata: { restored: true },
      },
    });
    expect((runtimeService.restoreRunSession as any).mock.calls[0][2]).toEqual({
      sessionId: "persisted-session",
      metadata: { previous: true },
    });
    expect((runtimeService.restoreRunSession as any).mock.calls[0][1]).toMatchObject({
      autoExecuteTools: true,
    });
  });

  it("maps sendTurn failures to deterministic command failure payload", async () => {
    const runtimeService = buildRuntimeService();
    (runtimeService.sendTurn as any).mockRejectedValueOnce(new Error("sdk crashed"));
    const adapter = new ClaudeAgentSdkRuntimeAdapter(runtimeService);

    const result = await adapter.sendTurn({
      runId: "run-1",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("CLAUDE_RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("sdk crashed");
  });

  it("returns refreshed runtime reference after successful sendTurn", async () => {
    const runtimeService = buildRuntimeService();
    const adapter = new ClaudeAgentSdkRuntimeAdapter(runtimeService);

    const result = await adapter.sendTurn({
      runId: "run-1",
      mode: "agent",
      message: AgentInputUserMessage.fromDict({ content: "hello" }),
    });

    expect(result).toEqual({
      accepted: true,
      runtimeReference: {
        runtimeKind: "claude_agent_sdk",
        sessionId: "claude-session-1",
        threadId: "claude-session-1",
        metadata: { model: "claude-sonnet-4-5" },
      },
    });
  });

  it("routes inter-agent relay through Claude runtime service envelope injection", async () => {
    const runtimeService = buildRuntimeService();
    const adapter = new ClaudeAgentSdkRuntimeAdapter(runtimeService);

    const result = await adapter.relayInterAgentMessage({
      runId: "run-1",
      envelope: {
        senderAgentRunId: "agent-a",
        recipientName: "agent-b",
        messageType: "agent_message",
        content: "ping",
      },
    });

    expect(result).toEqual({ accepted: true });
    expect((runtimeService.injectInterAgentEnvelope as any).mock.calls[0][0]).toBe("run-1");
  });

  it("maps tool approval errors to deterministic command failure payload", async () => {
    const adapter = new ClaudeAgentSdkRuntimeAdapter(buildRuntimeService());
    const result = await adapter.approveTool({
      runId: "run-1",
      mode: "agent",
      invocationId: "tool-1",
      approved: true,
      reason: "unit-test",
    });

    expect(result.accepted).toBe(false);
    expect(result.code).toBe("CLAUDE_RUNTIME_COMMAND_FAILED");
    expect(result.message).toContain("unsupported approval");
  });
});
