import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";

const createSubject = () => {
  const runId = "support_agent_00000000000000000000000000000001";
  const activeRun = { runId, runtimeKind: RuntimeKind.CODEX_APP_SERVER };
  const agentRunManager = {
    getActiveRun: vi.fn().mockReturnValue(null),
  };
  const metadataService = {
    readMetadata: vi.fn(),
    readMetadataState: vi.fn(),
  };
  const historyCatalogService = {
    recordRunSummary: vi.fn().mockResolvedValue(undefined),
  };
  const provisioningService = {
    prepareAgentRun: vi.fn().mockResolvedValue({
      runId,
      activationState: "PREPARED",
      preparedExpiresAt: "2026-08-26T00:00:00.000Z",
    }),
  };
  const lifecycleService = {
    activatePreparedRun: vi.fn().mockResolvedValue(activeRun),
  };
  const service = new AgentRunService("/tmp/agent-run-service-test", {
    agentRunManager: agentRunManager as never,
    metadataService: metadataService as never,
    historyCatalogService: historyCatalogService as never,
    provisioningService: provisioningService as never,
    lifecycleService: lifecycleService as never,
  });

  return {
    activeRun,
    service,
    mocks: {
      historyCatalogService,
      lifecycleService,
      metadataService,
      provisioningService,
    },
  };
};

describe("AgentRunService create", () => {
  it("prepares through the provisioning owner before activating through the lifecycle owner", async () => {
    const { service, mocks } = createSubject();
    const input = {
      agentDefinitionId: "agent-def-1",
      workspaceRootPath: "/tmp/workspace",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      llmConfig: null,
      skillAccessMode: "PRELOADED_ONLY" as never,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    };

    await expect(service.createAgentRun(input)).resolves.toEqual({
      runId: "support_agent_00000000000000000000000000000001",
    });

    expect(mocks.provisioningService.prepareAgentRun).toHaveBeenCalledExactlyOnceWith(input);
    expect(mocks.lifecycleService.activatePreparedRun).toHaveBeenCalledExactlyOnceWith(
      "support_agent_00000000000000000000000000000001",
    );
    expect(mocks.provisioningService.prepareAgentRun.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.lifecycleService.activatePreparedRun.mock.invocationCallOrder[0]!);
  });

  it("records activity through the history catalog without rewriting resume metadata", async () => {
    const { activeRun, service, mocks } = createSubject();

    await service.recordRunActivity(activeRun as never, {
      summary: "First external message",
    });

    expect(mocks.historyCatalogService.recordRunSummary).toHaveBeenCalledExactlyOnceWith({
      runId: activeRun.runId,
      summary: "First external message",
    });
    expect(mocks.metadataService.readMetadata).not.toHaveBeenCalled();
    expect(mocks.metadataService.readMetadataState).not.toHaveBeenCalled();
  });
});
