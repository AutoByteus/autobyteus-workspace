import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";

const metadata = (): AgentRunMetadata => ({
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  memoryDir: "/tmp/agent-run-service-test/agents/run-1",
  llmModelIdentifier: "gpt-test",
  llmConfig: { reasoning_effort: "medium" },
  autoExecuteTools: false,
  skillAccessMode: null,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-old",
  preparedAt: "2026-05-17T00:00:00.000Z",
  preparedExpiresAt: "2026-05-18T00:00:00.000Z",
  startedAt: "2026-05-17T00:05:00.000Z",
});

const createSubject = () => {
  const restored = {
    run: { runId: "run-1", runtimeKind: RuntimeKind.CODEX_APP_SERVER },
    metadata: metadata(),
  };
  const lifecycleService = Object.assign(
    Object.create(StandaloneAgentRunLifecycleService.prototype) as StandaloneAgentRunLifecycleService,
    {
    restorePersistedRun: vi.fn().mockResolvedValue(restored),
    },
  );
  const service = new AgentRunService("/tmp/agent-run-service-test", {
    agentRunManager: { getActiveRun: vi.fn().mockReturnValue(null) } as never,
    metadataService: {} as never,
    historyCatalogService: {} as never,
    provisioningService: {} as never,
    lifecycleService,
  });
  return { lifecycleService, restored, service };
};

describe("AgentRunService restore", () => {
  it("normalizes identity and delegates restore to the lifecycle owner", async () => {
    const { lifecycleService, restored, service } = createSubject();

    await expect(service.restoreAgentRun(" run-1 ")).resolves.toBe(restored);
    expect(lifecycleService.restorePersistedRun).toHaveBeenCalledExactlyOnceWith("run-1");
  });

  it("preserves lifecycle-owner restore failures", async () => {
    const { lifecycleService, service } = createSubject();
    lifecycleService.restorePersistedRun.mockRejectedValueOnce(
      new Error("Run 'run-missing' was not found."),
    );

    await expect(service.restoreAgentRun("run-missing")).rejects.toThrow(
      "Run 'run-missing' was not found.",
    );
  });

  it("rejects a blank identity before entering the lifecycle owner", async () => {
    const { lifecycleService, service } = createSubject();

    await expect(service.restoreAgentRun("   ")).rejects.toThrow("runId is required.");
    expect(lifecycleService.restorePersistedRun).not.toHaveBeenCalled();
  });
});
