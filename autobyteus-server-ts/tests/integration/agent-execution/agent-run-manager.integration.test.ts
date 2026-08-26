import { createRecordingAgentToolMcpRunSessionReleaser } from "../../fixtures/agent-tool-mcp-run-session-releaser-fixtures.js";
import { createAgentRunManagerInfrastructureFixture } from "../../fixtures/agent-run-manager-infrastructure-fixtures.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import type { AgentRunBackend } from "../../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentCreationError, AgentTerminationError } from "../../../src/agent-execution/errors.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentToolMcpRunSessionReleaser } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";

const createConfig = (runtimeKind: RuntimeKind): AgentRunConfig =>
  new AgentRunConfig({
    runtimeKind,
    agentDefinitionId: `agent-${runtimeKind}`,
    llmModelIdentifier: `model-${runtimeKind}`,
    autoExecuteTools: true,
    workspaceId: `workspace-${runtimeKind}`,
    llmConfig: { mode: runtimeKind },
    skillAccessMode: SkillAccessMode.NONE,
  });

const createBackend = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  active?: boolean;
  platformAgentRunId?: string | null;
  status?: string | null;
  context?: AgentRunContext<unknown | null>;
}) => {
  const state = {
    active: input.active ?? true,
    platformAgentRunId: input.platformAgentRunId ?? null,
    status: input.status ?? "idle",
  };
  const context =
    input.context ??
    new AgentRunContext({
      runId: input.runId,
      config: createConfig(input.runtimeKind),
      runtimeContext: null,
    });

  const backend: AgentRunBackend = {
    runId: input.runId,
    runtimeKind: input.runtimeKind,
    getContext: () => context,
    isActive: () => state.active,
    getPlatformAgentRunId: () => state.platformAgentRunId,
    getLifecycleSnapshot: () => ({
      availability: state.active ? "active" : "offline",
      phase: state.status as "idle" | "running" | "error",
      currentTurn: { kind: "NONE" },
    }),
    subscribeToSourceEventBatches: () => () => undefined,
    postUserMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockImplementation(async () => {
      state.active = false;
      return { accepted: true };
    }),
  };

  return {
    backend,
    state,
  };
};

const createFactory = (backend: AgentRunBackend): AgentRunBackendFactory => ({
  createBackend: vi.fn().mockResolvedValue(backend),
  restoreBackend: vi.fn().mockResolvedValue(backend),
});

const createManager = (input: {
  autoByteusBackendFactory: AgentRunBackendFactory;
  codexBackendFactory: AgentRunBackendFactory;
  claudeBackendFactory: AgentRunBackendFactory;
  agentToolMcpRunSessionReleaser: AgentToolMcpRunSessionReleaser;
}): AgentRunManager => {
  const infrastructure = createAgentRunManagerInfrastructureFixture({
    agentToolMcpRunSessionReleaser: input.agentToolMcpRunSessionReleaser,
  });
  return new AgentRunManager({
    autoByteusBackendFactory: input.autoByteusBackendFactory,
    codexBackendFactory: input.codexBackendFactory,
    claudeBackendFactory: input.claudeBackendFactory,
    activationRegistry: infrastructure.activationRegistry,
    memoryRecorder: infrastructure.memoryRecorder,
    providerInputNormalizer: infrastructure.providerInputNormalizer,
    agentToolMcpRunSessionReleaser: input.agentToolMcpRunSessionReleaser,
  });
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("AgentRunManager integration", () => {
  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])("creates and registers an active %s run through the matching backend factory", async (runtimeKind) => {
    const auto = createFactory(createBackend({ runId: "run-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend);
    const codex = createFactory(createBackend({ runId: "run-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend);
    const claude = createFactory(createBackend({ runId: "run-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend);
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: auto,
      codexBackendFactory: codex,
      claudeBackendFactory: claude,
    });

    const expectedRunId =
      runtimeKind === RuntimeKind.AUTOBYTEUS
        ? "run-auto"
        : runtimeKind === RuntimeKind.CODEX_APP_SERVER
          ? "run-codex"
          : "run-claude";
    const candidate = await manager.prepareNewAgentRun({
      config: createConfig(runtimeKind),
      runId: expectedRunId,
    });
    const run = candidate.commitPublication();

    expect(run.runtimeKind).toBe(runtimeKind);
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);
    expect(manager.listActiveRuns()).toContain(run.runId);
    expect(auto.createBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.AUTOBYTEUS ? 1 : 0);
    expect(codex.createBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CODEX_APP_SERVER ? 1 : 0);
    expect(claude.createBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? 1 : 0);
  });

  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])("restores a %s run through the matching backend factory", async (runtimeKind) => {
    const restoredContext = new AgentRunContext({
      runId: `restored-${runtimeKind}`,
      config: createConfig(runtimeKind),
      runtimeContext:
        runtimeKind === RuntimeKind.CODEX_APP_SERVER
          ? { threadId: "thread-1", activeTurnId: null }
          : runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
            ? { sessionId: "session-1", hasCompletedTurn: true, activeTurnId: null }
            : null,
    });
    const backend = createBackend({
      runId: restoredContext.runId,
      runtimeKind,
      context: restoredContext,
    }).backend;
    const auto = createFactory(backend);
    const codex = createFactory(backend);
    const claude = createFactory(backend);
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: auto,
      codexBackendFactory: codex,
      claudeBackendFactory: claude,
    });

    const candidate = await manager.prepareRestoreAgentRun(restoredContext);
    const run = candidate.commitPublication();

    expect(run.runId).toBe(restoredContext.runId);
    expect(run.context).toBe(restoredContext);
    expect(auto.restoreBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.AUTOBYTEUS ? 1 : 0);
    expect(codex.restoreBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CODEX_APP_SERVER ? 1 : 0);
    expect(claude.restoreBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? 1 : 0);
  });

  it("restores Claude platform state with auto approval separate from provider permission mode", async () => {
    const claude = {
      createBackend: vi.fn(),
      restoreBackend: vi.fn(async (context: AgentRunContext<unknown | null>) =>
        createBackend({
          runId: context.runId,
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          context,
          platformAgentRunId: "claude-session-restored",
        }).backend,
      ),
    };
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend),
      codexBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend),
      claudeBackendFactory: claude,
    });

    const candidate = await manager.prepareRestoreAgentRunFromPlatformState({
      runId: "run-restore-claude-platform",
      config: createConfig(RuntimeKind.CLAUDE_AGENT_SDK),
      platformAgentRunId: "claude-session-restored",
    });
    candidate.commitPublication();

    const restoredContext = claude.restoreBackend.mock.calls[0]?.[0] as AgentRunContext<any>;
    expect(restoredContext.runtimeContext.sessionConfig.permissionMode).toBe("default");
    expect(restoredContext.runtimeContext.sessionConfig.autoExecuteTools).toBe(true);
    expect(restoredContext.runtimeContext.autoExecuteTools).toBe(true);
  });

  it("evicts inactive runs when queried or listed", async () => {
    const active = createBackend({ runId: "run-active", runtimeKind: RuntimeKind.AUTOBYTEUS });
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: createFactory(active.backend),
      codexBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend),
      claudeBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend),
    });

    const candidate = await manager.prepareNewAgentRun({
      config: createConfig(RuntimeKind.AUTOBYTEUS),
      runId: "run-active",
    });
    const run = candidate.commitPublication();
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);

    active.state.active = false;
    expect(manager.getActiveRun(run.runId)).toBeNull();
    expect(manager.listActiveRuns()).toEqual([]);
  });

  it("terminates and unregisters active runs on accepted termination", async () => {
    const created = createBackend({
      runId: "run-terminate-ok",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend),
      codexBackendFactory: createFactory(created.backend),
      claudeBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend),
    });

    const candidate = await manager.prepareNewAgentRun({
      config: createConfig(RuntimeKind.CODEX_APP_SERVER),
      runId: "run-terminate-ok",
    });
    const run = candidate.commitPublication();
    const success = await manager.terminateAgentRun(run.runId);

    expect(success).toBe(true);
    expect(created.backend.terminate).toHaveBeenCalledTimes(1);
    expect(manager.getActiveRun(run.runId)).toBeNull();
  });

  it("returns false for missing runs and for unaccepted termination without unregistering", async () => {
    const created = createBackend({
      runId: "run-terminate-no",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    created.backend.terminate = vi.fn().mockResolvedValue({
      accepted: false,
      code: "DENIED",
      message: "still active",
    });
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend),
      codexBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend),
      claudeBackendFactory: createFactory(created.backend),
    });

    const candidate = await manager.prepareNewAgentRun({
      config: createConfig(RuntimeKind.CLAUDE_AGENT_SDK),
      runId: "run-terminate-no",
    });
    const run = candidate.commitPublication();

    await expect(manager.terminateAgentRun("missing-run")).resolves.toBe(false);
    await expect(manager.terminateAgentRun(run.runId)).resolves.toBe(false);
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);
  });

  it("wraps termination failures in AgentTerminationError", async () => {
    const created = createBackend({
      runId: "run-terminate-error",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    created.backend.terminate = vi.fn().mockRejectedValue(new Error("boom"));
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: createFactory(created.backend),
      codexBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend),
      claudeBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend),
    });

    const candidate = await manager.prepareNewAgentRun({
      config: createConfig(RuntimeKind.AUTOBYTEUS),
      runId: "run-terminate-error",
    });
    const run = candidate.commitPublication();

    await expect(manager.terminateAgentRun(run.runId)).rejects.toThrow(AgentTerminationError);
  });

  it("rejects unsupported runtime kinds for create and restore", async () => {
    const manager = createManager({
      agentToolMcpRunSessionReleaser: createRecordingAgentToolMcpRunSessionReleaser().releaser,
      autoByteusBackendFactory: createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend),
      codexBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend),
      claudeBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend),
    });
    const unsupportedKind = "unsupported_runtime" as RuntimeKind;
    const config = createConfig(unsupportedKind);
    const context = new AgentRunContext({
      runId: "unsupported-run",
      config,
      runtimeContext: null,
    });

    await expect(manager.prepareNewAgentRun({ config, runId: "unsupported-run" })).rejects.toThrow(AgentCreationError);
    await expect(manager.prepareRestoreAgentRun(context)).rejects.toThrow(AgentCreationError);
  });
});
