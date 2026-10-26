import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryTerms, toFtsQuery } from "../../../src/memory-search/index/memory-text-normalizer.js";
import { MemorySearchStore } from "../../../src/memory-search/store/memory-search-store.js";

const run = (runKey: string) => ({ runKey, runId: runKey.split("/").at(-1)!, memoryDir: `/m/${runKey}`, agentName: "Codex", teamName: null, memberName: null,
  orgName: null, workspace: null, runtimeKind: null, subject: { kind: "RUN_FOLDER" as const, runKey } });
const card = { text: "Agent: Codex.\nRequest: ddns", parts: [{ kind: "request" as const, lineStart: 5, lineEnd: 5, day: "2026-08-25", offset: 23, length: 4 }] };

describe("MemorySearchStore", () => {
  let dir: string, file: string, store: MemorySearchStore;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-search-store-"));
    file = path.join(dir, "memory-search", "memory-search.sqlite");
    store = new MemorySearchStore(file);
  });
  afterEach(() => { store.close(); fs.rmSync(dir, { recursive: true, force: true }); vi.restoreAllMocks(); });

  it("indexes chunks without keeping their text, finds them by words (Chinese too), and replaces or removes them", () => {
    store.upsertRun(run("agents/a"));
    store.replaceJournalFile({ runKey: "agents/a", journalFile: "work_journal_active.md", contentSha256: "s1", card,
      chunks: [{ lineStart: 5, lineEnd: 9, day: "2026-08-25", text: "Set up the DDNS updater" }, { lineStart: 10, lineEnd: 12, day: "2026-08-26", text: "做一个兔子游戏" }] });
    expect(store.textCandidates(toFtsQuery(queryTerms("ddns")), 10)).toEqual([
      { runKey: "agents/a", journalFile: "work_journal_active.md", lineStart: 5, lineEnd: 9, day: "2026-08-25" }]);
    expect(store.textCandidates(toFtsQuery(queryTerms("兔子")), 10).map((hit) => hit.lineStart)).toEqual([10]);
    expect(store.allCards()).toEqual([{ id: "agents/a/work_journal/work_journal_active.md", runKey: "agents/a", journalFile: "work_journal_active.md", text: card.text, parts: card.parts }]);
    expect(store.runDays("agents/a")).toEqual({ firstDay: "2026-08-25", latestDay: "2026-08-26" });
    // The text index's own vocabulary: chunks per token (ideographs single tokens), absent tokens left out.
    expect(store.tokenChunkCounts(["ddns", "updater", "兔", "zebra"])).toEqual({ counts: new Map([["ddns", 1], ["updater", 1], ["兔", 1]]), chunks: 2 });
    store.close();
    const db = new DatabaseSync(file);
    expect(db.prepare("SELECT body FROM chunk_text").all()).toEqual([{ body: null }, { body: null }]);
    db.close();

    store.replaceJournalFile({ runKey: "agents/a", journalFile: "work_journal_active.md", contentSha256: "s2", card, chunks: [{ lineStart: 5, lineEnd: 6, day: null, text: "tunnel" }] });
    expect(store.textCandidates(toFtsQuery(["ddns"]), 10)).toEqual([]);
    expect(store.journalFiles("agents/a")).toEqual([{ fileId: expect.any(Number), journalFile: "work_journal_active.md", contentSha256: "s2" }]);
    store.removeRun("agents/a");
    expect(store.counts()).toEqual({ runs: 0, journalFiles: 0, chunks: 0 });
    expect(store.textCandidates(toFtsQuery(["tunnel"]), 10)).toEqual([]);
  });

  it("deletes and recreates a store it cannot open; clear drops everything", () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, "not a database");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(store.counts()).toEqual({ runs: 0, journalFiles: 0, chunks: 0 });
    expect(warn).toHaveBeenCalledWith("MEMORY_SEARCH_STORE_UNREADABLE", expect.objectContaining({ file }));
    store.upsertRun(run("agents/b"));
    store.setState("built", "1");
    store.clear();
    expect(store.counts().runs).toBe(0);
    expect(store.getState("built")).toBeNull();
  });
});
