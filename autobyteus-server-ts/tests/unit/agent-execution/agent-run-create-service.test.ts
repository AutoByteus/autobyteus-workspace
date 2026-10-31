import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";

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
    cancelPreparedAgentRun: vi.fn().mockResolvedValue({ success: true, message: "cancelled" }),
  };
  const lifecycleService = Object.assign(
    Object.create(StandaloneAgentRunLifecycleService.prototype) as StandaloneAgentRunLifecycleService,
    {
    activateHost: vi.fn().mockResolvedValue({ run: activeRun, metadata: {} }),
    },
  );
  const service = new AgentRunService("/tmp/agent-run-service-test", {
    agentRunManager: agentRunManager as never,
    metadataService: metadataService as never,
    historyCatalogService: historyCatalogService as never,
    provisioningService: provisioningService as never,
    lifecycleService,
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
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    };

    await expect(service.createAgentRun(input)).resolves.toEqual({
      runId: "support_agent_00000000000000000000000000000001",
    });

    expect(mocks.provisioningService.prepareAgentRun).toHaveBeenCalledExactlyOnceWith(input);
    expect(mocks.lifecycleService.activateHost).toHaveBeenCalledExactlyOnceWith(
      "support_agent_00000000000000000000000000000001",
      { memberExecutionContext: null },
    );
    expect(mocks.provisioningService.prepareAgentRun.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.lifecycleService.activateHost.mock.invocationCallOrder[0]!);
  });

  const createInput = {
    agentDefinitionId: "agent-def-1",
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    autoExecuteTools: false,
    llmConfig: null,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  };

  it("AC-001: undoes the prepared run when activation fails, then rethrows the activation error", async () => {
    const { service, mocks } = createSubject();
    const activationError = new Error("AgentRun activation admission is closed for process shutdown.");
    mocks.lifecycleService.activateHost.mockRejectedValueOnce(activationError);

    await expect(service.createAgentRun(createInput)).rejects.toBe(activationError);

    expect(mocks.provisioningService.cancelPreparedAgentRun).toHaveBeenCalledExactlyOnceWith(
      "support_agent_00000000000000000000000000000001");
  });

  it("AC-002: a refused undo (the run started) is logged with the run ID and reason; the activation error stands", async () => {
    const { service, mocks } = createSubject();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const activationError = new Error("runtime failed after start");
    mocks.lifecycleService.activateHost.mockRejectedValueOnce(activationError);
    mocks.provisioningService.cancelPreparedAgentRun.mockResolvedValueOnce({
      success: false, message: "Only unactivated prepared runs can be cancelled.",
    });

    await expect(service.createAgentRun(createInput)).rejects.toBe(activationError);

    expect(warn).toHaveBeenCalledWith("Run 'support_agent_00000000000000000000000000000001' failed to activate and was kept: "
      + "Only unactivated prepared runs can be cancelled.");
    warn.mockRestore();
  });

  it("an undo that throws is logged; the activation error, not the undo's, reaches the caller", async () => {
    const { service, mocks } = createSubject();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const activationError = new Error("activation failed");
    mocks.lifecycleService.activateHost.mockRejectedValueOnce(activationError);
    mocks.provisioningService.cancelPreparedAgentRun.mockRejectedValueOnce(new Error("catalog flush failed"));

    await expect(service.createAgentRun(createInput)).rejects.toBe(activationError);

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("catalog flush failed"));
    warn.mockRestore();
  });

  it("does not undo a run that activated", async () => {
    const { service, mocks } = createSubject();
    await service.createAgentRun(createInput);
    expect(mocks.provisioningService.cancelPreparedAgentRun).not.toHaveBeenCalled();
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

  it("records a run's title by its ID (autobyteus-269: a peer's work packet), through the same catalog rule", async () => {
    const { service, mocks } = createSubject();
    await service.recordRunTitle("publisher_r1", "Publish the video draft.");
    expect(mocks.historyCatalogService.recordRunSummary).toHaveBeenCalledExactlyOnceWith({
      runId: "publisher_r1",
      summary: "Publish the video draft.",
    });
    expect(mocks.metadataService.readMetadata).not.toHaveBeenCalled();
  });
});
