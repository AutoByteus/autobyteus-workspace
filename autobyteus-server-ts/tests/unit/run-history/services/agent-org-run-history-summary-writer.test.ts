import { describe, expect, it, vi } from "vitest";
import { AgentOrgRunHistorySummaryWriter } from "../../../../src/run-history/services/agent-org-run-history-summary-writer.js";
import type { AgentOrgRunIndexRowRecord } from "../../../../src/run-history/store/agent-org-run-history-index-record-types.js";

const row = (summary = ""): AgentOrgRunIndexRowRecord => Object.freeze({
  orgRunId: "org-run",
  orgDefinitionId: "org-definition",
  orgDefinitionName: "Example Org",
  workspaceRootPath: "/workspace",
  summary,
  createdAt: "2026-09-05T00:00:00.000Z",
  archivedAt: null,
  terminatedAt: null,
});

describe("AgentOrgRunHistorySummaryWriter", () => {
  it("atomically commits only the first compact non-empty summary and strictly rereads it", async () => {
    let persisted = [row()];
    const store = {
      writeIndex: vi.fn(async (rows: readonly AgentOrgRunIndexRowRecord[]) => { persisted = [...rows]; }),
      readIndex: vi.fn(async () => [...persisted]),
    };
    const writer = new AgentOrgRunHistorySummaryWriter(store as never);
    const long = `  First   accepted ${"message ".repeat(20)} `;
    const written = await writer.commitFirstNonEmpty({ rows: persisted, orgRunId: "org-run", summary: long });
    expect(written).toMatchObject({ disposition: "WRITTEN", committedSummary: expect.stringMatching(/^First accepted/) });
    expect(written.committedSummary).toHaveLength(100);
    expect(store.writeIndex).toHaveBeenCalledOnce();
    expect(store.readIndex).toHaveBeenCalledOnce();

    const unchanged = await writer.commitFirstNonEmpty({ rows: written.rows, orgRunId: "org-run", summary: "Later" });
    expect(unchanged).toMatchObject({ disposition: "UNCHANGED_EXISTING", committedSummary: written.committedSummary });
    expect(store.writeIndex).toHaveBeenCalledOnce();
  });

  it("performs no write for empty content or a missing row", async () => {
    const store = { writeIndex: vi.fn(), readIndex: vi.fn() };
    const writer = new AgentOrgRunHistorySummaryWriter(store as never);
    await expect(writer.commitFirstNonEmpty({ rows: [row()], orgRunId: "org-run", summary: " \n " }))
      .resolves.toMatchObject({ disposition: "SKIPPED_EMPTY" });
    await expect(writer.commitFirstNonEmpty({ rows: [row()], orgRunId: "missing", summary: "Hello" }))
      .resolves.toMatchObject({ disposition: "MISSING_ROW" });
    expect(store.writeIndex).not.toHaveBeenCalled();
  });

  it("fails when the atomic write cannot be confirmed by a strict reread", async () => {
    const writer = new AgentOrgRunHistorySummaryWriter({
      writeIndex: vi.fn(async () => undefined),
      readIndex: vi.fn(async () => [row()]),
    } as never);
    await expect(writer.commitFirstNonEmpty({ rows: [row()], orgRunId: "org-run", summary: "Hello" }))
      .rejects.toThrow("strict reread validation");
  });
});
