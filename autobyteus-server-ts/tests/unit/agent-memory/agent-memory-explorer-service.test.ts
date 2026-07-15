import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentMemoryExplorerService } from "../../../src/agent-memory/services/agent-memory-explorer-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";
import { AgentRunMetadataStore } from "../../../src/run-history/store/agent-run-metadata-store.js";

const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

describe("AgentMemoryExplorerService", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  const createService = () => {
    if (!tempDir) {
      throw new Error("tempDir not initialized");
    }
    return new AgentMemoryExplorerService(new MemoryFileStore(tempDir), tempDir);
  };

  const writeMetadata = async (runId: string, agentDefinitionId: string, startedAt: string) => {
    if (!tempDir) {
      throw new Error("tempDir not initialized");
    }
    await new AgentRunMetadataStore(tempDir).writeMetadata(runId, {
      runId,
      agentDefinitionId,
      workspaceRootPath: "/workspace/project",
      memoryDir: path.join(tempDir, "agents", runId),
      llmModelIdentifier: "model-a",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      startedAt,
    });
  };

  it("lists only agents with memory and groups runs by agent definition", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-"));
    await writeMetadata("codex-run-1", "codex", "2026-01-01T00:00:00Z");
    await writeMetadata("codex-run-2", "codex", "2026-01-02T00:00:00Z");
    await writeMetadata("empty-run", "empty-agent", "2026-01-03T00:00:00Z");
    touch(path.join(tempDir, "agents", "codex-run-1", "raw_traces_active.jsonl"), 1000);
    touch(path.join(tempDir, "agents", "codex-run-2", "semantic.jsonl"), 2000);

    const page = await createService().listAgentsWithMemory();

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.agentDefinitionId).toBe("codex");
    expect(page.entries[0]?.runCount).toBe(2);
    expect(page.entries[0]?.memory.hasRawTraces).toBe(true);
    expect(page.entries[0]?.memory.hasSemantic).toBe(true);
  });

  it("keeps metadata-less standalone memory under Unattributed runs", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-"));
    touch(path.join(tempDir, "agents", "legacy-run", "working_context_snapshot.json"), 1000);

    const service = createService();
    const agentsPage = await service.listAgentsWithMemory();
    const runsPage = await service.listAgentRunsWithMemory({ attribution: "UNATTRIBUTED" });

    expect(agentsPage.entries[0]?.displayName).toBe("Unattributed runs");
    expect(agentsPage.entries[0]?.attribution).toBe("UNATTRIBUTED");
    expect(runsPage.entries[0]?.runId).toBe("legacy-run");
  });

  it("filters selected-agent runs without returning other agents", async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-explorer-"));
    await writeMetadata("alpha-run", "alpha", "2026-01-01T00:00:00Z");
    await writeMetadata("beta-run", "beta", "2026-01-02T00:00:00Z");
    touch(path.join(tempDir, "agents", "alpha-run", "raw_traces_active.jsonl"), 1000);
    touch(path.join(tempDir, "agents", "beta-run", "raw_traces_active.jsonl"), 2000);

    const page = await createService().listAgentRunsWithMemory(
      { attribution: "DEFINITION", agentDefinitionId: "alpha" },
      "run",
    );

    expect(page.entries.map((entry) => entry.runId)).toEqual(["alpha-run"]);
  });
});
