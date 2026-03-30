import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../../../../src/run-history/store/agent-run-metadata-types.js";
import { AgentRunMetadataStore } from "../../../../src/run-history/store/agent-run-metadata-store.js";
import { AgentRunHistoryIndexStore } from "../../../../src/run-history/store/agent-run-history-index-store.js";

vi.mock("../../../../src/agent-definition/services/agent-definition-service.js", () => ({
  AgentDefinitionService: {
    getInstance: () => ({
      getAgentDefinitionById: vi.fn(),
    }),
  },
}));

vi.mock("../../../../src/agent-execution/services/agent-run-manager.js", () => ({
  AgentRunManager: {
    getInstance: () => ({
      hasActiveRun: vi.fn().mockReturnValue(false),
      listActiveRuns: vi.fn().mockReturnValue([]),
    }),
  },
}));

const buildMetadata = (
  overrides: Partial<AgentRunMetadata> = {},
): AgentRunMetadata => ({
  runId: "run-1",
  agentDefinitionId: "agent-def-1",
  workspaceRootPath: "/tmp/workspace",
  llmModelIdentifier: "model-1",
  llmConfig: null,
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: "thread-1",
  lastKnownStatus: "IDLE",
  ...overrides,
});

describe("AgentRunHistoryIndexService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-history-index-service-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("records created runs using metadata and resolved agent names", async () => {
    const { AgentRunHistoryIndexService } = await import(
      "../../../../src/run-history/services/agent-run-history-index-service.js"
    );
    const indexStore = new AgentRunHistoryIndexStore(memoryDir);
    const service = new AgentRunHistoryIndexService(memoryDir, {
      indexStore,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }),
      },
      agentRunManager: {
        hasActiveRun: vi.fn().mockReturnValue(false),
        listActiveRuns: vi.fn().mockReturnValue([]),
      },
    });

    await service.recordRunCreated({
      runId: "run-1",
      metadata: buildMetadata({ workspaceRootPath: "/tmp/workspace/" }),
      summary: "  hello\nworld ",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
    });

    expect(await indexStore.getRow("run-1")).toEqual({
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      agentName: "Agent One",
      workspaceRootPath: "/tmp/workspace",
      summary: "hello world",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "ACTIVE",
    });
  });

  it("marks runs as TERMINATED on recordRunTerminated", async () => {
    const { AgentRunHistoryIndexService } = await import(
      "../../../../src/run-history/services/agent-run-history-index-service.js"
    );
    const indexStore = new AgentRunHistoryIndexStore(memoryDir);
    await indexStore.upsertRow({
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      agentName: "Agent One",
      workspaceRootPath: "/tmp/workspace",
      summary: "",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "ACTIVE",
    });
    const service = new AgentRunHistoryIndexService(memoryDir, {
      indexStore,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn(),
      },
      agentRunManager: {
        hasActiveRun: vi.fn().mockReturnValue(false),
        listActiveRuns: vi.fn().mockReturnValue([]),
      },
    });

    await service.recordRunTerminated("run-1");

    expect((await indexStore.getRow("run-1"))?.lastKnownStatus).toBe("TERMINATED");
  });

  it("preserves metadata lastKnownStatus during rebuild for inactive runs", async () => {
    const { AgentRunHistoryIndexService } = await import(
      "../../../../src/run-history/services/agent-run-history-index-service.js"
    );
    const metadataStore = new AgentRunMetadataStore(memoryDir);
    await metadataStore.writeMetadata("run-terminated", buildMetadata({
      runId: "run-terminated",
      platformAgentRunId: null,
      lastKnownStatus: "TERMINATED",
    }));
    const service = new AgentRunHistoryIndexService(memoryDir, {
      metadataStore,
      agentDefinitionService: {
        getAgentDefinitionById: vi.fn().mockResolvedValue({ name: "Agent One" }),
      },
      agentRunManager: {
        hasActiveRun: vi.fn((runId: string) => runId === "run-active"),
        listActiveRuns: vi.fn().mockReturnValue(["run-active"]),
      },
    });
    await metadataStore.writeMetadata("run-active", buildMetadata({
      runId: "run-active",
      lastKnownStatus: "IDLE",
    }));

    const rows = await service.rebuildIndexFromDisk();
    const terminated = rows.find((row) => row.runId === "run-terminated");
    const active = rows.find((row) => row.runId === "run-active");

    expect(terminated?.lastKnownStatus).toBe("TERMINATED");
    expect(active?.lastKnownStatus).toBe("ACTIVE");
  });
});
