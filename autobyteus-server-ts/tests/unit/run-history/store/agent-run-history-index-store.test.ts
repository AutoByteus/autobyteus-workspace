import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentRunHistoryIndexStore } from "../../../../src/run-history/store/agent-run-history-index-store.js";

describe("AgentRunHistoryIndexStore", () => {
  let memoryDir: string;

  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "agent-run-history-index-store-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("persists and reads TERMINATED status rows", async () => {
    const store = new AgentRunHistoryIndexStore(memoryDir);
    await store.upsertRow({
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      agentName: "Agent One",
      workspaceRootPath: "/tmp/workspace",
      summary: "done",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "TERMINATED",
    });

    await expect(store.getRow("run-1")).resolves.toEqual({
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      agentName: "Agent One",
      workspaceRootPath: "/tmp/workspace",
      summary: "done",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "TERMINATED",
    });
  });

  it("updates an existing row in place", async () => {
    const store = new AgentRunHistoryIndexStore(memoryDir);
    await store.upsertRow({
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      agentName: "Agent One",
      workspaceRootPath: "/tmp/workspace",
      summary: "old",
      lastActivityAt: "2026-03-26T10:00:00.000Z",
      lastKnownStatus: "IDLE",
    });

    await store.updateRow("run-1", {
      summary: "new",
      lastKnownStatus: "ACTIVE",
    });

    expect((await store.getRow("run-1"))?.summary).toBe("new");
    expect((await store.getRow("run-1"))?.lastKnownStatus).toBe("ACTIVE");
  });
});
