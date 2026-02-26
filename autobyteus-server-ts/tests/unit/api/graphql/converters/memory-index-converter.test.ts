import { describe, expect, it } from "vitest";
import { MemoryIndexConverter } from "../../../../../src/api/graphql/converters/memory-index-converter.js";
import type { MemorySnapshotPage } from "../../../../../src/agent-memory-view/domain/models.js";

describe("MemoryIndexConverter", () => {
  it("maps domain page to graphql page", () => {
    const domain: MemorySnapshotPage = {
      entries: [
        {
          runId: "agent-1",
          lastUpdatedAt: "2026-01-01T00:00:00Z",
          hasWorkingContext: true,
          hasEpisodic: false,
          hasSemantic: true,
          hasRawTraces: true,
          hasRawArchive: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    };

    const gql = MemoryIndexConverter.toGraphql(domain);
    expect(gql.entries[0]?.runId).toBe("agent-1");
    expect(gql.totalPages).toBe(1);
  });
});
