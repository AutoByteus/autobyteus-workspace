/**
 * autobyteus-349 REQ-001 (AC-001, AC-002): a one-call `createAgentRun` is all or nothing. Real
 * provisioning, metadata store and history catalog on a temporary data root; only activation is a double.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentRunProvisioningService } from "../../../src/agent-execution/services/agent-run-provisioning-service.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { StandaloneAgentRunLifecycleService } from "../../../src/agent-execution/services/standalone-agent-run-lifecycle-service.js";
import { AgentRunHistoryCatalogService } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

vi.mock("../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: { getInstance: () => ({ getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }) }) },
}));

const RUN_ID = "support_agent_00000000000000000000000000000349";
let memoryDir: string;
let catalog: AgentRunHistoryCatalogService;
let activateHost: ReturnType<typeof vi.fn>;

const buildService = () => {
  const agentRunManager = { hasActiveRun: vi.fn().mockReturnValue(false), getActiveRun: vi.fn().mockReturnValue(null) };
  const metadataService = new AgentRunMetadataService(memoryDir);
  const provisioningService = new AgentRunProvisioningService(memoryDir, {
    agentRunManager: agentRunManager as never,
    metadataService,
    historyCatalogService: catalog,
    workspaceManager: {
      ensureWorkspaceByRootPath: vi.fn().mockResolvedValue({ workspaceId: "workspace-1" }),
      getWorkspaceById: vi.fn().mockReturnValue({ getBasePath: () => "/tmp/workspace-one" }),
    } as never,
    agentRunIdentityAllocator: { allocateForAgentDefinition: vi.fn(async () => RUN_ID) },
  });
  const lifecycleService = Object.assign(
    Object.create(StandaloneAgentRunLifecycleService.prototype) as StandaloneAgentRunLifecycleService,
    { activateHost },
  );
  return new AgentRunService(memoryDir, {
    agentRunManager: agentRunManager as never,
    metadataService,
    historyCatalogService: catalog,
    provisioningService,
    lifecycleService,
  });
};

const input = {
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace-one",
  llmModelIdentifier: "model-1",
  autoExecuteTools: false,
  llmConfig: null,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  initialSummary: "please summarize the report",
};
const exists = (target: string) => fs.lstat(target).then(() => true, () => false);

beforeEach(async () => {
  memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-create-undo-"));
  catalog = new AgentRunHistoryCatalogService(memoryDir, {
    agentDefinitionService: { getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }) } as never,
    agentRunManager: { hasActiveRun: vi.fn().mockReturnValue(false) } as never,
    collaborationRoots: { hasRoot: vi.fn().mockReturnValue(false), endRoot: vi.fn(async () => undefined) },
  });
  activateHost = vi.fn();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(memoryDir, { recursive: true, force: true });
});

describe("createAgentRun on a temporary data root", () => {
  it("AC-001: a failed activation leaves no history row and no run folder; the caller gets the activation error", async () => {
    const activationError = new Error("AgentRun activation admission is closed for process shutdown.");
    activateHost.mockImplementation(async () => {
      expect(await exists(path.join(memoryDir, "agents", RUN_ID, "run_metadata.json"))).toBe(true); // it was prepared
      throw activationError;
    });

    await expect(buildService().createAgentRun(input)).rejects.toBe(activationError);

    expect(await exists(path.join(memoryDir, "agents", RUN_ID))).toBe(false);
    expect(await catalog.listCatalogRows()).toEqual([]);
  });

  it("AC-002: a run whose start was committed before activation failed is kept, and the refusal is logged", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const activationError = new Error("runtime failed after start");
    activateHost.mockImplementation(async (runId: string) => {
      await catalog.recordRunStarted({ runId, platformAgentRunId: "thread-1", startedAt: "2026-10-31T10:01:00.000Z" });
      throw activationError;
    });

    await expect(buildService().createAgentRun(input)).rejects.toBe(activationError);

    expect(await exists(path.join(memoryDir, "agents", RUN_ID, "run_metadata.json"))).toBe(true);
    expect((await catalog.listCatalogRows()).map((row) => row.runId)).toEqual([RUN_ID]);
    expect(warn).toHaveBeenCalledWith(`Run '${RUN_ID}' failed to activate and was kept: Only unactivated prepared runs can be cancelled.`);
  });
});
