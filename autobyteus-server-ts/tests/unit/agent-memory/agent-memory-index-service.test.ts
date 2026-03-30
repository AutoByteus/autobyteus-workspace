import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AgentMemoryIndexService } from "../../../src/agent-memory/services/agent-memory-index-service.js";
import { MemoryFileStore } from "../../../src/agent-memory/store/memory-file-store.js";

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
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-index-"));
    touch(path.join(tempDir, "agents", "agent-a", "raw_traces.jsonl"), 1000);
    touch(path.join(tempDir, "agents", "agent-b", "raw_traces.jsonl"), 2000);

    const service = new AgentMemoryIndexService(new MemoryFileStore(tempDir));
    const page = service.listSnapshots();

    expect(page.entries[0]?.runId).toBe("agent-b");
    expect(page.entries[1]?.runId).toBe("agent-a");
  });

  it("filters by search and paginates", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-memory-index-"));
    touch(path.join(tempDir, "agents", "alpha-agent", "raw_traces.jsonl"), 1000);
    touch(path.join(tempDir, "agents", "beta-agent", "raw_traces.jsonl"), 2000);

    const service = new AgentMemoryIndexService(new MemoryFileStore(tempDir));
    const page = service.listSnapshots("alpha", 1, 1);

    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.runId).toBe("alpha-agent");
    expect(page.total).toBe(1);
    expect(page.totalPages).toBe(1);
  });
});
