import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunHistoryCatalogService } from "../../../../src/run-history/services/agent-run-history-catalog-service.js";
import { AgentRunResumeConfigService } from "../../../../src/run-history/services/agent-run-resume-config-service.js";
import { AgentRunHistoryIndexStore } from "../../../../src/run-history/store/agent-run-history-index-store.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";

// The web client refuses to open a stored agent run whose resume config reports
// `modelConfigEditability.reason === "RUN_ARCHIVED"` and `isActive === false`
// (archived-open-run-disappears, REQ-008). This pins that server contract on the real
// catalog archive path: archiving a stopped run makes its resume config say so.

const WORKSPACE_ROOT = "/tmp/autobyteus-resume-config-workspace";

const buildMetadata = (runId: string, memoryDir: string): AgentRunMetadata => ({
  runId,
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: WORKSPACE_ROOT,
  memoryDir: path.join(memoryDir, "agents", runId),
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  applicationExecutionContext: null,
});

describe("AgentRunResumeConfigService archived-run editability", () => {
  let memoryDir: string;
  let metadataStore: AgentRunMetadataStore;
  const activeRunIds = new Set<string>();

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-resume-config-"));
    metadataStore = new AgentRunMetadataStore(memoryDir);
    activeRunIds.clear();
    const runIds = ["run-stopped", "run-kept", "run-live"];
    for (const runId of runIds) {
      await fs.mkdir(path.join(memoryDir, "agents", runId), { recursive: true });
      await metadataStore.writeMetadata(runId, buildMetadata(runId, memoryDir));
    }
    await new AgentRunHistoryIndexStore(memoryDir).writeIndex(runIds.map((runId, index) => ({
      runId,
      agentDefinitionId: "agent-def-1",
      agentName: "Agent One",
      workspaceRootPath: WORKSPACE_ROOT,
      summary: runId,
      createdAt: `2026-10-08T08:0${index}:00.000Z`,
      archivedAt: runId === "run-live" ? "2026-10-08T09:00:00.000Z" : null,
      terminatedAt: null,
    })));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  const buildServices = () => {
    const historyCatalog = new AgentRunHistoryCatalogService(memoryDir, {
      metadataStore,
      agentDefinitionService: { getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }) } as never,
      agentRunManager: { hasActiveRun: vi.fn((runId: string) => activeRunIds.has(runId)) } as never,
      collaborationRoots: { hasRoot: vi.fn().mockReturnValue(false), endRoot: vi.fn(async () => undefined) },
    });
    const resumeConfigService = new AgentRunResumeConfigService(memoryDir, {
      metadataStore,
      historyCatalog,
      statusProjectionService: {
        getRunStatusProjection: vi.fn(async (runId: string) => ({ isActive: activeRunIds.has(runId) })),
      } as never,
    });
    return { historyCatalog, resumeConfigService };
  };

  it("reports RUN_ARCHIVED for a stopped run after it is archived, and nothing for an unarchived stopped run", async () => {
    const { historyCatalog, resumeConfigService } = buildServices();

    await expect(resumeConfigService.getAgentRunResumeConfig("run-stopped")).resolves.toMatchObject({
      isActive: false,
      modelConfigEditability: { editable: true, reason: null },
    });

    await expect(historyCatalog.archiveRun("run-stopped")).resolves.toMatchObject({ success: true });

    await expect(resumeConfigService.getAgentRunResumeConfig("run-stopped")).resolves.toMatchObject({
      runId: "run-stopped",
      isActive: false,
      modelConfigEditability: { editable: false, reason: "RUN_ARCHIVED" },
    });
    await expect(resumeConfigService.getAgentRunResumeConfig("run-kept")).resolves.toMatchObject({
      isActive: false,
      modelConfigEditability: { editable: true, reason: null },
    });
  });

  it("keeps an archived run that is active distinguishable by isActive", async () => {
    activeRunIds.add("run-live");
    const { resumeConfigService } = buildServices();

    await expect(resumeConfigService.getAgentRunResumeConfig("run-live")).resolves.toMatchObject({
      isActive: true,
      modelConfigEditability: { editable: false, reason: "RUN_ARCHIVED" },
    });
  });
});
