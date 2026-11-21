import { describe, expect, it } from "vitest";
import { buildRuntimeHandoverNoticeText } from "../../../src/runtime-handover-notices/services/runtime-handover-notice-builder.js";
import type { WorkJournalFileSummary } from "../../../src/agent-work-journal/domain/work-journal-models.js";

const file = (journalFile: string, day: string, extra: Partial<WorkJournalFileSummary> = {}): WorkJournalFileSummary => ({
  journalFile, state: journalFile.includes("active") ? "open" : "closed", sizeBytes: 2048, lineCount: 40, workEntryCount: 12,
  days: [{ day, line: 5 }], ...extra,
});

const DIR = "/mem/agents/run-1/work_journal";
/** The open file at a hand-over: the switch marker alone (one notice, no work entry). */
const openAtHandover = file("work_journal_active.md", "2026-10-30", { sizeBytes: 444, lineCount: 5, workEntryCount: 0 });

const listed = (text: string) => text.split("\n").filter((line) => line.startsWith("  work_journal_"));

describe("the hand-over notice text (autobyteus-583; contract 3.6)", () => {
  const facts = {
    journalFolder: DIR,
    files: [
      file("work_journal_000001.md", "2026-10-28", { days: [{ day: "2026-10-28", line: 5 }, { day: "2026-10-29", line: 90 }], sizeBytes: 512 }),
      file("work_journal_000002.md", "2026-10-29", { sizeBytes: 3 * 1024 * 1024, lineCount: 2_400, workEntryCount: 900 }),
      openAtHandover,
    ],
  };

  it("names the previous agent's most recent work and asks for a complete read before replying (AC-001)", () => {
    const text = buildRuntimeHandoverNoticeText(facts);
    expect(text.split("\n")[0]).toBe("[System: runtime hand-over]");
    expect(text).toContain("Another agent worked on this run before you and kept a work journal as it went. You are taking over.");
    expect(text).toContain(`The journals are in ${DIR}/. The previous agent's most recent work is in work_journal_000002.md.`);
    expect(text).toContain(`Before you reply or continue the work, read ${DIR}/work_journal_000002.md completely, from its first line to its last.`);
    expect(text).toContain("If it is long, read it in parts until you reach the end.");
  });

  it("does not present the open file as the recent work: it starts with this hand-over (AC-001, REQ-003)", () => {
    const text = buildRuntimeHandoverNoticeText(facts);
    expect(text).toContain("work_journal_active.md starts with this hand-over; your own work is recorded there from now on.");
    expect(text).not.toMatch(/good place to start|The latest one/);
    expect(text).not.toContain(`read ${DIR}/work_journal_active.md`);
  });

  it("skips a newer closed file that holds only a hand-over notice (AC-002, two switches with no input between them)", () => {
    const text = buildRuntimeHandoverNoticeText({
      journalFolder: DIR,
      files: [file("work_journal_000001.md", "2026-09-22"), file("work_journal_000002.md", "2026-11-21", { lineCount: 5, workEntryCount: 0 }), openAtHandover],
    });
    expect(text).toContain("The previous agent's most recent work is in work_journal_000001.md.");
    expect(text).toContain(`read ${DIR}/work_journal_000001.md completely`);
    expect(text).not.toContain(`read ${DIR}/work_journal_000002.md`);
  });

  it("lists every file oldest first with period, size and lines, after the instruction (AC-003, REQ-004)", () => {
    const text = buildRuntimeHandoverNoticeText(facts);
    expect(text).toContain("All journal files, oldest first (the earlier ones are there if you need to look further back):");
    expect(listed(text)).toEqual([
      "  work_journal_000001.md | 2026-10-28 to 2026-10-29 | 512 B, 40 lines",
      "  work_journal_000002.md | 2026-10-29 | 3.0 MB, 2400 lines",
      "  work_journal_active.md | 2026-10-30 | 444 B, 5 lines",
    ]);
    expect(text.indexOf("completely")).toBeLessThan(text.indexOf("  work_journal_000001.md"));
    expect(text).toContain("Each entry is one line");
  });

  it("has no read instruction when no closed file holds work: a switch before any work (AC-004, REQ-005)", () => {
    const onlyOpen = buildRuntimeHandoverNoticeText({ journalFolder: DIR, files: [openAtHandover] });
    expect(onlyOpen).toContain(`The journals are in ${DIR}/:`);
    expect(listed(onlyOpen)).toEqual(["  work_journal_active.md | 2026-10-30 | 444 B, 5 lines"]);
    expect(onlyOpen).not.toMatch(/completely|most recent work|starts with this hand-over|All journal files/);

    const noticeOnlyClosed = buildRuntimeHandoverNoticeText({
      journalFolder: DIR, files: [file("work_journal_000001.md", "2026-11-21", { lineCount: 5, workEntryCount: 0 }), openAtHandover],
    });
    expect(noticeOnlyClosed).not.toMatch(/completely|most recent work/);
    expect(listed(noticeOnlyClosed)).toHaveLength(2);
  });

  it("leaves out the open-file sentence when there is no open file", () => {
    const text = buildRuntimeHandoverNoticeText({ journalFolder: DIR, files: [file("work_journal_000001.md", "2026-10-28")] });
    expect(text).toContain(`read ${DIR}/work_journal_000001.md completely`);
    expect(text).not.toContain("starts with this hand-over");
  });

  it("names no agent runtime or model and repeats no request (AC-003, REQ-006)", () => {
    const text = buildRuntimeHandoverNoticeText(facts);
    for (const word of ["Claude", "Codex", "Antigravity", "Grok", "AutoByteus", "claude_agent_sdk", "codex_app_server", "search_memory", "summary"]) {
      expect(text).not.toContain(word);
    }
    expect(text).not.toMatch(/please continue|last request/i);
  });
});
