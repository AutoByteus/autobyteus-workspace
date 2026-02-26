import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { MemorySnapshotPage, MemorySnapshotSummary } from "../../../../../src/api/graphql/types/memory-index.js";

describe("memory index graphql types", () => {
  it("supports assigning fields", () => {
    const summary = new MemorySnapshotSummary();
    summary.agentId = "agent-1";
    summary.hasWorkingContext = true;
    summary.hasEpisodic = false;
    summary.hasSemantic = true;
    summary.hasRawTraces = true;
    summary.hasRawArchive = false;

    const page = new MemorySnapshotPage();
    page.entries = [summary];
    page.total = 1;
    page.page = 1;
    page.pageSize = 50;
    page.totalPages = 1;

    expect(page.entries[0]?.agentId).toBe("agent-1");
    expect(page.total).toBe(1);
  });
});
