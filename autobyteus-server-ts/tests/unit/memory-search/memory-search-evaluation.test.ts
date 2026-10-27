import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { MemorySearchMatch, MemorySearchResult } from "../../../src/memory-search/domain/memory-search-models.js";
import { indexTokens, termsAbsentFromJournals } from "../../../src/memory-search/evaluation/journal-term-census.js";
import { evaluateMemorySearch, evaluationTerms, readEvaluationQuestions } from "../../../src/memory-search/evaluation/memory-search-evaluation.js";

const match = (matchedBy: "text" | "meaning", pointer: MemorySearchMatch["pointer"], snippet = "User: something"): MemorySearchMatch => ({
  journalFile: "/m/agents/r/work_journal/work_journal_active.md", lineStart: 4, lineEnd: 6, day: "2026-08-25", snippet, matchedBy, matchedWords: [], pointer,
});
const result = (runIds: string[], matches: MemorySearchMatch[] = []): MemorySearchResult => ({
  results: runIds.map((runId, index) => ({ agent: "A", team: null, member: null, org: null, runId, workspace: null, firstDay: null, latestDay: null,
    source: runId, matches: index === 0 ? matches : [], subject: { kind: "AGENT", runId, agentDefinitionId: null } })),
  coverage: null, wordsNotFound: [], note: null,
});

describe("memory search evaluation", () => {
  it("reads a question file with kinds (default: answerable with accepted runs, else off-topic) and refuses a bad one", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-eval-"));
    const good = path.join(dir, "good.json");
    fs.writeFileSync(good, JSON.stringify([{ id: "Q1", q: "ddns", accept: ["r1"], rephrasings: ["a", "b", "c", 4] }]));
    expect(readEvaluationQuestions(good)).toEqual([{ id: "Q1", q: "ddns", kind: "answerable", accept: ["r1"], rephrasings: ["a", "b"] }]);
    const bad = path.join(dir, "bad.json");
    fs.writeFileSync(bad, JSON.stringify([{ id: "Q1", q: "ddns" }]));
    expect(() => readEvaluationQuestions(bad)).toThrow(/accept/);
    const offTopic = path.join(dir, "off-topic.json");
    fs.writeFileSync(offTopic, JSON.stringify([{ id: "N1", q: "purple elephant", accept: [] }, { id: "N2", q: "kubernetes autoscaler", kind: "partial", accept: [] }]));
    expect(readEvaluationQuestions(offTopic).map(({ id, kind }) => [id, kind])).toEqual([["N1", "offTopic"], ["N2", "partial"]]);
    for (const wrong of [{ id: "Q2", q: "x", kind: "answerable", accept: [] }, { id: "Q3", q: "x", kind: "other", accept: [] }]) {
      fs.writeFileSync(bad, JSON.stringify([wrong]));
      expect(() => readEvaluationQuestions(bad)).toThrow(/kind/);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("scores gate 1 within three searches, gate 2 on the first search, and counts meaning pointers", async () => {
    const answers: Record<string, MemorySearchResult> = {
      first: result(["r1", "x"], [{ ...match("text", null), matchedWords: ["first"] }, match("meaning", "cardPart")]),
      second: result(["x", "y", "r2_full_run_id"], [match("meaning", "textChunk")]),
      miss: result(["x"], [match("meaning", "firstRequest", " ")]),
      rephrased: result(["r3"], [match("text", null, "token: [masked] and sk-abcdefghijklmnopqrstuv")]),
      never: { ...result([]), note: "No matches; try other words." },
      // Off-topic: names its absent word; a second one names a word that occurs and leaves out an absent one.
      "purple elephant": { ...result(["x"], [match("meaning", "cardPart")]), wordsNotFound: ["elephant"] },
      "green giraffe": { ...result(["x"], [match("meaning", "firstRequest")]), wordsNotFound: ["green"] },
      "cluster autoscaler": { ...result(["x"], [match("text", null)]), wordsNotFound: ["autoscaler"] },
    };
    const askedAs: Array<string | null | undefined> = [];
    const memory = { search: async (query: string, options: { askingRunId?: string | null }) => { askedAs.push(options.askingRunId); return answers[query] ?? result([]); } };
    const report = await evaluateMemorySearch(memory, [
      { id: "Q1", q: "first", kind: "answerable", accept: ["r1"] },
      // A prefix of a run ID accepts the run (question files may hold shortened IDs).
      { id: "Q2", q: "second", kind: "answerable", accept: ["r2"] },
      { id: "Q3", q: "miss", kind: "answerable", accept: ["r3"], rephrasings: ["rephrased"] },
      { id: "Q4", q: "never", kind: "answerable", accept: ["r4"], rephrasings: ["never", "never"] },
      { id: "N1", q: "purple elephant", kind: "offTopic", accept: [] },
      { id: "N2", q: "green giraffe", kind: "offTopic", accept: [] },
      { id: "P1", q: "cluster autoscaler", kind: "partial", accept: [] },
    ], { askingRunId: "author_run", absentTerms: new Set(["elephant", "giraffe", "autoscaler"]) });
    expect(report.questions).toBe(4);
    expect(new Set(askedAs)).toEqual(new Set(["author_run"]));
    expect(report.perQuestion.map(({ id, rank, foundAtSearch }) => ({ id, rank, foundAtSearch }))).toEqual([
      { id: "Q1", rank: 1, foundAtSearch: 1 }, { id: "Q2", rank: 3, foundAtSearch: 1 },
      { id: "Q3", rank: null, foundAtSearch: 2 }, { id: "Q4", rank: null, foundAtSearch: null },
    ]);
    expect(report.gate1).toEqual({ passed: 3, oneSearchTop10: 2, withinThreeSearches: 3 });
    expect(report.gate2).toMatchObject({ number1: 1, top3: 2, top3Share: 2 / 3, mrr: (1 + 1 / 3) / 3 });
    // Each meaning match of each search counts (the off-topic and partial searches too); the blank one is flagged.
    expect(report.meaningPointers).toEqual({ total: 5, textChunk: 1, cardPart: 2, firstRequest: 2, emptySnippet: 1 });
    // Words not found against the census: N2 names "green" (it occurs) and leaves out "giraffe" (absent).
    expect(report.wordsNotFound).toEqual({
      questions: 7, offTopic: 2, offTopicUnnamed: [],
      mismatches: [{ id: "N2", named: ["green"], missing: ["giraffe"] }],
    });
    expect(report.unmaskedSecrets).toBe(1);
    // Text matches over every search; those naming no query word are counted (CR-004).
    expect(report.textMatches).toEqual({ total: 3, withoutWords: 2 });
  });

  it("counts words absent from the journals as the text index tokenizes them, independently of the index (R-14)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-census-"));
    const journal = (rel: string, body: string) => {
      fs.mkdirSync(path.join(dir, rel, "work_journal"), { recursive: true });
      fs.writeFileSync(path.join(dir, rel, "work_journal", "work_journal_active.md"),
        `# Work Journal — run x\nRuntime x · file active (open) · 2026-08-25 10:00 – 10:05 UTC · source x\nThis journal records past work.\n\n${body}\n`);
    };
    journal("agents/a", "[10:00:00] User: set up the DDNS updater for home.example.org\n[10:01:00] Agent: Café notes are done.");
    journal("agents/b", "[10:02:00] User: 做一个兔子游戏");
    journal("imports/peer/agents/c", "[10:03:00] User: zebra crossing");
    expect(indexTokens("Café home.example.org 兔子")).toEqual(["cafe", "home", "example", "org", "兔", "子"]);
    const absent = termsAbsentFromJournals(dir, ["ddns", "cafe", "home.example.org", "example.home", "兔子", "子游", "游兔", "zebra", "saxophone"]);
    // Adjacent tokens only; other nodes' imports are not this node's memory.
    expect([...absent].sort()).toEqual(["example.home", "saxophone", "zebra", "游兔"].sort());
    expect(evaluationTerms([{ id: "Q", q: "Where is the DDNS updater?", kind: "answerable", accept: ["r"] }])).toEqual(["ddns", "updater"]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
