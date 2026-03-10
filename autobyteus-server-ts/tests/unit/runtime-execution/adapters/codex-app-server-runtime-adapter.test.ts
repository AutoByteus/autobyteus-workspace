import { describe, expect, it, vi } from "vitest";
import type { CodexAppServerRuntimeService } from "../../../../src/runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import { CodexAppServerRuntimeAdapter } from "../../../../src/runtime-execution/adapters/codex-app-server-runtime-adapter.js";

vi.mock("../../../../src/runtime-execution/single-agent-runtime-context.js", () => ({
  resolveSingleAgentRuntimeContext: vi.fn().mockResolvedValue({
    runtimeMetadata: {
      agentInstructions: "Use tools when needed.",
      memberInstructionSources: {
        agentInstructions: "Use tools when needed.",
      },
      skillAccessMode: "PRELOADED_ONLY",
      configuredSkillNames: ["code-review"],
    },
    configuredSkills: [
      {
        name: "code-review",
        description: "Review code carefully.",
        content: "Always verify edge cases before approving changes.",
        rootPath: "/skills/code-review",
        skillFilePath: "/skills/code-review/SKILL.md",
      },
    ],
    skillAccessMode: "PRELOADED_ONLY",
  }),
}));

describe("CodexAppServerRuntimeAdapter", () => {
  it("forwards llmConfig into createRunSession options", async () => {
    const runtimeService = {
      resolveWorkingDirectory: vi.fn().mockResolvedValue("/tmp/workspace"),
      createRunSession: vi.fn().mockResolvedValue({
        threadId: "thread-1",
        metadata: { model: "gpt-5.3-codex", reasoning_effort: "high" },
      }),
      restoreRunSession: vi.fn(),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    } as unknown as CodexAppServerRuntimeService;

    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    await adapter.createAgentRun({
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: { reasoning_effort: "high" },
      skillAccessMode: null,
    });

    expect((runtimeService.resolveWorkingDirectory as any)).toHaveBeenCalledWith("workspace-1");
    expect((runtimeService.createRunSession as any)).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        modelIdentifier: "gpt-5.3-codex",
        workingDirectory: "/tmp/workspace",
        autoExecuteTools: false,
        llmConfig: { reasoning_effort: "high" },
        runtimeMetadata: {
          agentInstructions: "Use tools when needed.",
          memberInstructionSources: {
            agentInstructions: "Use tools when needed.",
          },
          skillAccessMode: "PRELOADED_ONLY",
          configuredSkillNames: ["code-review"],
        },
        configuredSkills: [
          expect.objectContaining({
            name: "code-review",
            rootPath: "/skills/code-review",
          }),
        ],
        skillAccessMode: "PRELOADED_ONLY",
      }),
    );
  });

  it("forwards llmConfig into restoreRunSession options", async () => {
    const runtimeService = {
      resolveWorkingDirectory: vi.fn().mockResolvedValue("/tmp/workspace"),
      createRunSession: vi.fn(),
      restoreRunSession: vi.fn().mockResolvedValue({
        threadId: "thread-9",
        metadata: { model: "gpt-5.3-codex", reasoning_effort: "medium" },
      }),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    } as unknown as CodexAppServerRuntimeService;

    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    await adapter.restoreAgentRun({
      runId: "run-9",
      agentDefinitionId: "agent-def-1",
      llmModelIdentifier: "gpt-5.3-codex",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: { reasoning_effort: "medium" },
      skillAccessMode: null,
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "run-9",
        threadId: "thread-old",
        metadata: { model: "gpt-5.3-codex" },
      },
    });

    expect((runtimeService.restoreRunSession as any)).toHaveBeenCalledWith(
      "run-9",
      expect.objectContaining({
        modelIdentifier: "gpt-5.3-codex",
        workingDirectory: "/tmp/workspace",
        autoExecuteTools: false,
        llmConfig: { reasoning_effort: "medium" },
        runtimeMetadata: {
          model: "gpt-5.3-codex",
          agentInstructions: "Use tools when needed.",
          memberInstructionSources: {
            agentInstructions: "Use tools when needed.",
          },
          skillAccessMode: "PRELOADED_ONLY",
          configuredSkillNames: ["code-review"],
        },
        configuredSkills: [
          expect.objectContaining({
            name: "code-review",
            rootPath: "/skills/code-review",
          }),
        ],
        skillAccessMode: "PRELOADED_ONLY",
      }),
      expect.objectContaining({
        threadId: "thread-old",
        metadata: {
          model: "gpt-5.3-codex",
          agentInstructions: "Use tools when needed.",
          memberInstructionSources: {
            agentInstructions: "Use tools when needed.",
          },
          skillAccessMode: "PRELOADED_ONLY",
          configuredSkillNames: ["code-review"],
        },
      }),
    );
  });

  it("uses runtime service liveness for isRunActive()", () => {
    const runtimeService = {
      hasRunSession: vi.fn().mockReturnValue(true),
      resolveWorkingDirectory: vi.fn(),
      createRunSession: vi.fn(),
      restoreRunSession: vi.fn(),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    } as unknown as CodexAppServerRuntimeService;
    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    expect(adapter.isRunActive("run-1")).toBe(true);
    expect((runtimeService.hasRunSession as any)).toHaveBeenCalledWith("run-1");
  });

  it("surfaces live runtime reference from the runtime service", async () => {
    const runtimeService = {
      getRunRuntimeReference: vi.fn().mockReturnValue({
        threadId: "thread-live",
        metadata: { model: "gpt-5.3-codex" },
      }),
      sendTurn: vi.fn().mockResolvedValue({ turnId: "turn-1" }),
      hasRunSession: vi.fn().mockReturnValue(true),
      resolveWorkingDirectory: vi.fn(),
      createRunSession: vi.fn(),
      restoreRunSession: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
      getRunStatus: vi.fn().mockReturnValue("RUNNING"),
    } as unknown as CodexAppServerRuntimeService;
    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    expect(adapter.getRunRuntimeReference("run-1")).toEqual({
      runtimeKind: "codex_app_server",
      sessionId: "run-1",
      threadId: "thread-live",
      metadata: { model: "gpt-5.3-codex" },
    });
    expect(adapter.getRunStatus("run-1")).toBe("RUNNING");

    const result = await adapter.sendTurn({
      runId: "run-1",
      mode: "agent",
      message: { content: "hello", contextFiles: [] } as any,
    });
    expect(result).toEqual({
      accepted: true,
      turnId: "turn-1",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: "run-1",
        threadId: "thread-live",
        metadata: { model: "gpt-5.3-codex" },
      },
    });
  });

  it("normalizes runtime events into status/thread hints", () => {
    const runtimeService = {
      resolveWorkingDirectory: vi.fn(),
      createRunSession: vi.fn(),
      restoreRunSession: vi.fn(),
      sendTurn: vi.fn(),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    } as unknown as CodexAppServerRuntimeService;
    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    const interpretation = adapter.interpretRuntimeEvent({
      method: "turn.started",
      params: {
        threadId: "thread-2",
      },
    });

    expect(interpretation).toEqual({
      normalizedMethod: "turn/started",
      statusHint: "ACTIVE",
      runtimeReferenceHint: {
        threadId: "thread-2",
      },
    });
  });

  it("returns accepted turnId after successful sendTurn", async () => {
    const runtimeService = {
      resolveWorkingDirectory: vi.fn(),
      createRunSession: vi.fn(),
      restoreRunSession: vi.fn(),
      sendTurn: vi.fn().mockResolvedValue({ turnId: "turn-99" }),
      getRunRuntimeReference: vi.fn().mockReturnValue(null),
      approveTool: vi.fn(),
      interruptRun: vi.fn(),
      terminateRun: vi.fn(),
    } as unknown as CodexAppServerRuntimeService;
    const adapter = new CodexAppServerRuntimeAdapter(runtimeService);

    const result = await adapter.sendTurn({
      runId: "run-1",
      mode: "agent",
      message: {
        content: "hello",
      } as any,
    });

    expect(result).toEqual({
      accepted: true,
      turnId: "turn-99",
      runtimeReference: null,
    });
  });
});
