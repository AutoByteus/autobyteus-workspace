import { describe, expect, it } from "vitest";
import { buildRuntimeHandoverNoticeText } from "../../../src/runtime-handover-notices/services/runtime-handover-notice-builder.js";
import type { WorkJournalFileSummary } from "../../../src/agent-work-journal/domain/work-journal-models.js";

const file = (journalFile: string, day: string, extra: Partial<WorkJournalFileSummary> = {}): WorkJournalFileSummary => ({
  journalFile, state: journalFile.includes("active") ? "open" : "closed", sizeBytes: 2048, lineCount: 40, days: [{ day, line: 5 }], ...extra,
});

describe("the hand-over notice text (AC-004, contract 3.6)", () => {
  const facts = {
    journalFolder: "/mem/agents/run-1/work_journal",
    files: [file("work_journal_000001.md", "2026-10-28", { days: [{ day: "2026-10-28", line: 5 }, { day: "2026-10-29", line: 90 }], sizeBytes: 512 }),
      file("work_journal_000002.md", "2026-10-29"), file("work_journal_active.md", "2026-10-30", { sizeBytes: 3 * 1024 * 1024 })],
  };

  it("names where the journals are, starts at the latest, lists the earlier ones oldest first with period, size and lines", () => {
    const text = buildRuntimeHandoverNoticeText(facts);
    expect(text.split("\n")[0]).toBe("[System: runtime hand-over]");
    expect(text).toContain("Another agent worked on this run before you and kept a work journal as it went. You are taking over.");
    expect(text).toContain("The journals are in /mem/agents/run-1/work_journal/. The latest one, work_journal_active.md, shows what was done most recently, so it is a good place to start.");
    expect(text).toContain("The earlier ones are there too, oldest first, if you want to look further back:");
    const listed = text.split("\n").filter((line) => line.startsWith("  work_journal_"));
    expect(listed).toEqual([
      "  work_journal_000001.md | 2026-10-28 to 2026-10-29 | 512 B, 40 lines",
      "  work_journal_000002.md | 2026-10-29 | 2.0 KB, 40 lines",
      "  work_journal_active.md | 2026-10-30 | 3.0 MB, 40 lines",
    ]);
    expect(text).toContain("Each entry is one line");
  });

  it("with one journal file there is nothing earlier to mention", () => {
    const text = buildRuntimeHandoverNoticeText({ journalFolder: "/mem/r/work_journal", files: [file("work_journal_active.md", "2026-10-30")] });
    expect(text).not.toContain("earlier ones");
    expect(text).toContain("  work_journal_active.md | 2026-10-30 | 2.0 KB, 40 lines");
  });

  it("names no agent runtime or model, does not tell the agent how to proceed and repeats no request", () => {
    const text = buildRuntimeHandoverNoticeText(facts);
    for (const word of ["Claude", "Codex", "Antigravity", "Grok", "AutoByteus", "claude_agent_sdk", "codex_app_server", "search_memory", "summary"]) {
      expect(text).not.toContain(word);
    }
    expect(text).not.toMatch(/you must|you should|please continue|last request/i);
  });
});
