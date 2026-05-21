import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentRunHistoryIndexService } from "../../../../src/run-history/services/agent-run-history-index-service.js";
import { AgentRunHistoryIndexStore } from "../../../../src/run-history/store/agent-run-history-index-store.js";

describe("AgentRunHistoryIndexService", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-history-index-service-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("is a read-only adapter over the V2 standalone index store", async () => {
    const indexStore = new AgentRunHistoryIndexStore(memoryDir);
    await indexStore.writeIndex([
      {
        runId: "run-1",
        agentDefinitionId: "agent-def-1",
        agentName: "Agent One",
        workspaceRootPath: "/tmp/workspace",
        summary: "hello",
        createdAt: "2026-03-26T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: null,
      },
    ]);

    const service = new AgentRunHistoryIndexService(memoryDir, { indexStore });
    await expect(service.listRows()).resolves.toEqual([
      {
        runId: "run-1",
        agentDefinitionId: "agent-def-1",
        agentName: "Agent One",
        workspaceRootPath: "/tmp/workspace",
        summary: "hello",
        createdAt: "2026-03-26T10:00:00.000Z",
        archivedAt: null,
        terminatedAt: null,
      },
    ]);
  });
});
