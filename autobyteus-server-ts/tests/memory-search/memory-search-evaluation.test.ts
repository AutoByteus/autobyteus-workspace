import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { MemorySearchMatch, MemorySearchResult } from "../../src/memory-search/domain/memory-search-models.js";
import { evaluateMemorySearch, readEvaluationQuestions } from "../../src/memory-search/evaluation/memory-search-evaluation.js";

const match = (matchedBy: "text" | "meaning", pointer: MemorySearchMatch["pointer"], snippet = "User: something"): MemorySearchMatch => ({
  journalFile: "/m/agents/r/work_journal/work_journal_active.md", lineStart: 4, lineEnd: 6, day: "2026-08-25", snippet, matchedBy, strength: "fair", pointer,
});
const result = (runIds: string[], matches: MemorySearchMatch[] = []): MemorySearchResult => ({
  results: runIds.map((runId, index) => ({ agent: "A", team: null, member: null, org: null, runId, workspace: null, firstDay: null, latestDay: null,
    source: runId, matches: index === 0 ? matches : [], subject: { kind: "AGENT", runId, agentDefinitionId: null } })),
  coverage: null, note: null,
});

describe("memory search evaluation", () => {
  it("reads a question file and refuses a question without accepted runs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-eval-"));
    const good = path.join(dir, "good.json");
    fs.writeFileSync(good, JSON.stringify([{ id: "Q1", q: "ddns", accept: ["r1"], rephrasings: ["a", "b", "c", 4] }]));
    expect(readEvaluationQuestions(good)).toEqual([{ id: "Q1", q: "ddns", accept: ["r1"], rephrasings: ["a", "b"] }]);
    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(bad, JSON.stringify([{ id: "Q1", q: "ddns", accept: [] }]));
    expect(() => readEvaluationQuestions(bad)).toThrow(/accept/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("scores gate 1 within three searches, gate 2 on the first search, and counts meaning pointers", async () => {
    const answers: Record<string, MemorySearchResult> = {
      first: result(["r1", "x"], [match("text", null), match("meaning", "cardPart")]),
      second: result(["x", "y", "r2_full_run_id"], [match("meaning", "textChunk")]),
      miss: result(["x"], [match("meaning", "firstRequest", " ")]),
      rephrased: result(["r3"], [match("text", null, "token: [masked] and sk-abcdefghijklmnopqrstuv")]),
      never: result([]),
    };
    const askedAs: Array<string | null | undefined> = [];
    const memory = { search: async (query: string, options: { askingRunId?: string | null }) => { askedAs.push(options.askingRunId); return answers[query] ?? result([]); } };
    const report = await evaluateMemorySearch(memory, [
      { id: "Q1", q: "first", accept: ["r1"] },
      // A prefix of a run ID accepts the run (question files may hold shortened IDs).
      { id: "Q2", q: "second", accept: ["r2"] },
      { id: "Q3", q: "miss", accept: ["r3"], rephrasings: ["rephrased"] },
      { id: "Q4", q: "never", accept: ["r4"], rephrasings: ["never", "never"] },
    ], { askingRunId: "author_run" });
    expect(new Set(askedAs)).toEqual(new Set(["author_run"]));
    expect(report.perQuestion.map(({ id, rank, foundAtSearch }) => ({ id, rank, foundAtSearch }))).toEqual([
      { id: "Q1", rank: 1, foundAtSearch: 1 }, { id: "Q2", rank: 3, foundAtSearch: 1 },
      { id: "Q3", rank: null, foundAtSearch: 2 }, { id: "Q4", rank: null, foundAtSearch: null },
    ]);
    expect(report.gate1).toEqual({ passed: 3, oneSearchTop10: 2, withinThreeSearches: 3 });
    expect(report.gate2).toMatchObject({ number1: 1, top3: 2, top3Share: 2 / 3, mrr: (1 + 1 / 3) / 3 });
    // Each meaning match of each search counts (Q2's search, Q1's, Q3's first search); the blank one is flagged.
    expect(report.meaningPointers).toEqual({ total: 3, textChunk: 1, cardPart: 1, firstRequest: 1, emptySnippet: 1 });
    expect(report.unmaskedSecrets).toBe(1);
  });
});
