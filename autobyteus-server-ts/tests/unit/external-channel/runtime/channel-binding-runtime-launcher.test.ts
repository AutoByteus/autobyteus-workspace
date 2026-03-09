import { describe, expect, it, vi } from "vitest";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { ChannelBindingRuntimeLauncher } from "../../../../src/external-channel/runtime/channel-binding-runtime-launcher.js";

const createBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: "WHATSAPP" as any,
  transport: "BUSINESS_API" as any,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  targetType: "AGENT",
  agentDefinitionId: "agent-definition-1",
  launchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS",
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  agentRunId: "agent-run-1",
  teamRunId: null,
  targetNodeName: null,
  allowTransportFallback: false,
  createdAt: new Date("2026-03-09T00:00:00.000Z"),
  updatedAt: new Date("2026-03-09T00:00:00.000Z"),
});

describe("ChannelBindingRuntimeLauncher", () => {
  it("reuses a cached active run when the runtime session is still alive", async () => {
    const binding = createBinding();
    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
      },
      runtimeCompositionService: {
        getRunSession: vi.fn().mockReturnValue({
          runId: "agent-run-1",
          runtimeKind: "AUTOBYTEUS",
          mode: "agent",
          runtimeReference: { runtimeKind: "AUTOBYTEUS", sessionId: "session-1", threadId: null, metadata: null },
        }),
        createAgentRun: vi.fn(),
      } as any,
      runtimeCommandIngressService: {
        bindRunSession: vi.fn(),
      } as any,
      runtimeAdapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          isRunActive: vi.fn().mockReturnValue(true),
        }),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath: vi.fn(),
      } as any,
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-1");
  });

  it("creates a new run, binds it, and persists the cached run id when no active run exists", async () => {
    const binding = createBinding();
    const upsertBindingAgentRunId = vi.fn().mockResolvedValue({
      ...binding,
      agentRunId: "agent-run-2",
    });
    const createAgentRun = vi.fn().mockResolvedValue({
      runId: "agent-run-2",
      runtimeKind: "AUTOBYTEUS",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "AUTOBYTEUS",
        sessionId: "session-2",
        threadId: null,
        metadata: null,
      },
    });
    const bindRunSession = vi.fn();
    const ensureWorkspaceByRootPath = vi.fn().mockResolvedValue({
      workspaceId: "workspace-1",
    });

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: { upsertBindingAgentRunId },
      runtimeCompositionService: {
        getRunSession: vi.fn().mockReturnValue(null),
        createAgentRun,
      } as any,
      runtimeCommandIngressService: {
        bindRunSession,
      } as any,
      runtimeAdapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          isRunActive: vi.fn().mockReturnValue(false),
        }),
      } as any,
      workspaceManager: {
        ensureWorkspaceByRootPath,
      } as any,
    });

    const runId = await launcher.resolveOrStartAgentRun(binding);

    expect(runId).toBe("agent-run-2");
    expect(ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/workspace");
    expect(createAgentRun).toHaveBeenCalledWith({
      runtimeKind: "AUTOBYTEUS",
      agentDefinitionId: "agent-definition-1",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      workspaceId: "workspace-1",
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY",
    });
    expect(bindRunSession).toHaveBeenCalledOnce();
    expect(upsertBindingAgentRunId).toHaveBeenCalledWith("binding-1", "agent-run-2");
  });

  it("rejects bindings that do not carry an AGENT launch target", async () => {
    const binding = createBinding();
    binding.targetType = "TEAM";

    const launcher = new ChannelBindingRuntimeLauncher({
      bindingService: {
        upsertBindingAgentRunId: vi.fn(),
      },
      runtimeCompositionService: {} as any,
      runtimeCommandIngressService: {} as any,
      runtimeAdapterRegistry: {} as any,
      workspaceManager: {} as any,
    });

    await expect(launcher.resolveOrStartAgentRun(binding)).rejects.toThrow(
      "Only AGENT bindings can auto-start runtimes.",
    );
  });
});
