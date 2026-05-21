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

  it("persists and reads V2 catalog rows without live status fields", async () => {
    const store = new AgentRunHistoryIndexStore(memoryDir);
    await store.writeIndex({
      version: 2,
      rows: [
        {
          runId: "run-1",
          agentDefinitionId: "agent-def-1",
          agentName: "Agent One",
          workspaceRootPath: "/tmp/workspace",
          summary: "done",
          createdAt: "2026-03-26T10:00:00.000Z",
          archivedAt: null,
          terminatedAt: "2026-03-26T11:00:00.000Z",
        },
      ],
    });

    await expect(store.getRow("run-1")).resolves.toEqual({
      runId: "run-1",
      agentDefinitionId: "agent-def-1",
      agentName: "Agent One",
      workspaceRootPath: "/tmp/workspace",
      summary: "done",
      createdAt: "2026-03-26T10:00:00.000Z",
      archivedAt: null,
      terminatedAt: "2026-03-26T11:00:00.000Z",
    });
  });

  it("does not treat legacy V1 status rows as a normal source catalog", async () => {
    await fs.writeFile(
      path.join(memoryDir, "run_history_index.json"),
      JSON.stringify({
        version: 1,
        rows: [
          {
            runId: "run-1",
            agentDefinitionId: "agent-def-1",
            agentName: "Agent One",
            workspaceRootPath: "/tmp/workspace",
            summary: "legacy",
            lastActivityAt: "2026-03-26T10:00:00.000Z",
            lastKnownStatus: "ACTIVE",
          },
        ],
      }),
      "utf-8",
    );

    await expect(storeRows(memoryDir)).resolves.toEqual([]);
  });
});

const storeRows = async (memoryDir: string) => new AgentRunHistoryIndexStore(memoryDir).listRows();
