import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";
import { AgentRunCommandStatusOverlayStore } from "../../../src/agent-execution/services/agent-run-command-status-overlay-store.js";
import { AgentRunStatusProjectionService } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const buildMetadata = (overrides: Partial<AgentRunMetadata> = {}): AgentRunMetadata => ({
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: "/tmp/memory/agents/run-1",
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  lastKnownStatus: "IDLE",
  activationState: "ACTIVATED",
  archivedAt: null,
  applicationExecutionContext: null,
  ...overrides,
});

const buildService = (options: {
  metadata?: AgentRunMetadata | null;
  activeRun?: { getStatusSnapshot: () => { status: "offline" | "initializing" | "idle" | "running" | "error"; can_interrupt: boolean } } | null;
  overlayStore?: AgentRunCommandStatusOverlayStore;
  registry?: AgentRunCommandRegistry;
}) => new AgentRunStatusProjectionService({
  agentRunManager: {
    getActiveRun: vi.fn(() => options.activeRun ?? null),
  } as any,
  metadataService: {
    readMetadata: vi.fn(async () => options.metadata ?? null),
  } as any,
  overlayStore: options.overlayStore ?? new AgentRunCommandStatusOverlayStore(),
  commandRegistry: options.registry ?? new AgentRunCommandRegistry(),
});

describe("AgentRunStatusProjectionService", () => {
  it("projects command overlay initializing as reconnectable active status", async () => {
    const overlayStore = new AgentRunCommandStatusOverlayStore();
    const registry = new AgentRunCommandRegistry();
    registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "dedupe-1" });
    overlayStore.publishInitializing({ runId: "run-1", messageId: "msg-1" });

    const projection = await buildService({
      metadata: buildMetadata(),
      overlayStore,
      registry,
    }).getRunStatusProjection("run-1");

    expect(projection).toMatchObject({
      status: "initializing",
      canInterrupt: false,
      isActive: true,
      shouldConnectStream: true,
      lastKnownStatus: "ACTIVE",
      statusSource: "COMMAND_OVERLAY",
      command: { messageId: "msg-1", state: "STARTING" },
    });
  });

  it("projects prepared identity as offline without starting runtime", async () => {
    const projection = await buildService({
      metadata: buildMetadata({ activationState: "PREPARED" }),
    }).getRunStatusProjection("run-1");

    expect(projection).toMatchObject({
      status: "offline",
      isActive: false,
      shouldConnectStream: false,
      lastKnownStatus: "IDLE",
      statusSource: "PREPARED_IDENTITY",
    });
  });

  it("uses active runtime status when no overlay is present", async () => {
    const projection = await buildService({
      metadata: buildMetadata(),
      activeRun: { getStatusSnapshot: () => ({ status: "idle", can_interrupt: false }) },
    }).getRunStatusProjection("run-1");

    expect(projection).toMatchObject({
      status: "idle",
      isActive: true,
      shouldConnectStream: true,
      lastKnownStatus: "ACTIVE",
      statusSource: "ACTIVE_RUNTIME",
    });
  });

  it("projects command error overlay ahead of active runtime status", async () => {
    const overlayStore = new AgentRunCommandStatusOverlayStore();
    const registry = new AgentRunCommandRegistry();
    registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "dedupe-1" });
    registry.markFailed({
      runId: "run-1",
      messageId: "msg-1",
      code: "RUNTIME_REJECTED",
      message: "runtime rejected",
    });
    overlayStore.publishError({
      runId: "run-1",
      messageId: "msg-1",
      errorMessage: "runtime rejected",
    });

    const projection = await buildService({
      metadata: buildMetadata(),
      activeRun: { getStatusSnapshot: () => ({ status: "running", can_interrupt: true }) },
      overlayStore,
      registry,
    }).getRunStatusProjection("run-1");

    expect(projection).toMatchObject({
      status: "error",
      canInterrupt: false,
      isActive: false,
      shouldConnectStream: false,
      lastKnownStatus: "ERROR",
      statusSource: "COMMAND_OVERLAY",
      command: { messageId: "msg-1", state: "FAILED" },
    });
  });
});
