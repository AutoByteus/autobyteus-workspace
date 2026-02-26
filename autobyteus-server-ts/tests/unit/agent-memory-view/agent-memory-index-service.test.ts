import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryFileStore } from "../../../src/agent-memory-view/store/memory-file-store.js";
import { AgentMemoryIndexService } from "../../../src/agent-memory-view/services/agent-memory-index-service.js";

const touch = (filePath: string, mtime: number) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "{}", "utf-8");
  fs.utimesSync(filePath, mtime, mtime);
};

describe("AgentMemoryIndexService", () => {
  let tempDir: string | null = null;

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("returns snapshots sorted by most recent update", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-index-"));
    const agentA = path.join(tempDir, "agents", "agent-a");
    const agentB = path.join(tempDir, "agents", "agent-b");

    touch(path.join(agentA, "raw_traces.jsonl"), 1000);
    touch(path.join(agentB, "raw_traces.jsonl"), 2000);

    const store = new MemoryFileStore(tempDir);
    const service = new AgentMemoryIndexService(store);
    const page = service.listSnapshots();

    expect(page.entries[0]?.runId).toBe("agent-b");
    expect(page.entries[1]?.runId).toBe("agent-a");
  });

  it("filters by search and paginates", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-index-"));
    const agentA = path.join(tempDir, "agents", "alpha-agent");
    const agentB = path.join(tempDir, "agents", "beta-agent");

    touch(path.join(agentA, "raw_traces.jsonl"), 1000);
    touch(path.join(agentB, "raw_traces.jsonl"), 2000);

    const store = new MemoryFileStore(tempDir);
    const service = new AgentMemoryIndexService(store);
    const page = service.listSnapshots("alpha", 1, 1);

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.runId).toBe("alpha-agent");
    expect(page.total).toBe(1);
    expect(page.totalPages).toBe(1);
  });
});
