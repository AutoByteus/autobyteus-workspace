import fs from "node:fs";
import type { MemorySearchResult } from "../domain/memory-search-models.js";
import { maskSecrets } from "../search/secret-masker.js";

/**
 * What a question checks: `answerable` (gates 1 and 2), `offTopic` (its key words occur in no run: it must end
 * with the only-weak note, AC-007) or `partial` (some of its words describe real work: reported, not gated).
 */
export type EvaluationQuestionKind = "answerable" | "offTopic" | "partial";
const KINDS: readonly EvaluationQuestionKind[] = ["answerable", "offTopic", "partial"];

/**
 * One known-answer question (R-016): the cue as an agent or the user would write it, the runs that did the
 * work (any one of them answers it; a run ID or a prefix of one), and optionally up to two rephrasings an agent
 * would try next. Without a `kind`, a question with accepted runs is answerable and one without is off-topic.
 */
export type EvaluationQuestion = Readonly<{
  id: string;
  q: string;
  kind: EvaluationQuestionKind;
  accept: readonly string[];
  rephrasings?: readonly string[];
  note?: string;
}>;

export type EvaluationQuestionResult = Readonly<{
  id: string;
  /** Rank (1-based) of the first accepted run in the first search, or null when not in its results. */
  rank: number | null;
  /** The search (1–3) whose top 10 held an accepted run, or null. */
  foundAtSearch: number | null;
  /** Milliseconds of the first search. */
  ms: number;
}>;

export type EvaluationReport = Readonly<{
  /** Answerable questions (gates 1 and 2). */
  questions: number;
  gate1: Readonly<{ passed: number; oneSearchTop10: number; withinThreeSearches: number }>;
  gate2: Readonly<{ number1: number; top3: number; top3Share: number; mrr: number; p90Ms: number; maxMs: number }>;
  meaningPointers: Readonly<{ total: number; textChunk: number; cardPart: number; firstRequest: number; emptySnippet: number }>;
  /** Snippets, over every search, in which a secret pattern is still visible (R-008; should be 0). */
  unmaskedSecrets: number;
  /**
   * Off-topic questions (UD-019, AC-007): each must end with the only-weak note (every match weak; no matches
   * also passes). `failed` lists the IDs that did not.
   */
  offTopic: Readonly<{ questions: number; passed: number; failed: readonly string[] }>;
  /** Answerable questions whose first search ended with the only-weak (or no-match) note: false notes (AC-007). */
  falseOnlyWeak: readonly string[];
  /** Partial-match questions: reported (did the first search end with the note), not gated. */
  partial: readonly Readonly<{ id: string; onlyWeak: boolean }>[];
  perQuestion: readonly EvaluationQuestionResult[];
}>;

type Search = { search(query: string, options: { limit?: number | null; askingRunId?: string | null }): Promise<MemorySearchResult> };

export type EvaluationOptions = Readonly<{
  /**
   * Search as this run, which leaves its own results out (as for an agent searching). Use the run that wrote the
   * question file: its journal quotes every question and would otherwise answer them all by its own words.
   */
  askingRunId?: string | null;
}>;

/** A question file: a JSON array of `{id, q, kind?, accept: [runId or run ID prefix, …], rephrasings?: [text, …], note?}`. */
export const readEvaluationQuestions = (filePath: string): EvaluationQuestion[] => {
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!Array.isArray(parsed)) throw new Error("A question file is a JSON array.");
  return parsed.map((value, index) => {
    const question = value as Record<string, unknown>;
    const accept = question.accept;
    if (typeof question.id !== "string" || typeof question.q !== "string" || !question.q.trim()
      || !Array.isArray(accept) || !accept.every((id) => typeof id === "string")) {
      throw new Error(`Question ${index + 1} needs an id, a non-blank q and an accept list of run IDs (empty for an off-topic question).`);
    }
    const kind = question.kind ?? (accept.length ? "answerable" : "offTopic");
    if (!KINDS.includes(kind as EvaluationQuestionKind) || (kind === "answerable" && !accept.length)) {
      throw new Error(`Question ${question.id}: kind must be one of ${KINDS.join(", ")}, and an answerable question needs accepted runs.`);
    }
    const rephrasings = Array.isArray(question.rephrasings) ? question.rephrasings.filter((text): text is string => typeof text === "string") : [];
    return { id: question.id, q: question.q, kind: kind as EvaluationQuestionKind, accept: accept as string[], rephrasings: rephrasings.slice(0, 2) };
  });
};

const percentile = (values: readonly number[], share: number): number => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(share * sorted.length) - 1)]!;
};

/**
 * Runs the questions against a built memory index (R-016): gate 1 (the right run in the top 10 within at most 3
 * searches; the first search's top 10 as its proxy), gate 2 (rank and latency of the first search, for the
 * questions that pass gate 1), and the meaning-pointer check (every meaning match points into its file with a
 * snippet; how many each rule resolved), that no snippet shows a secret pattern, that each off-topic question
 * ends with the only-weak note and that no answerable question's first search does (AC-007).
 */
export const evaluateMemorySearch = async (memory: Search, questions: readonly EvaluationQuestion[], options: EvaluationOptions = {}): Promise<EvaluationReport> => {
  const perQuestion: EvaluationQuestionResult[] = [];
  const pointers = { total: 0, textChunk: 0, cardPart: 0, firstRequest: 0, emptySnippet: 0 };
  let unmaskedSecrets = 0;
  const countSnippets = (result: MemorySearchResult): void => {
    for (const match of result.results.flatMap((run) => run.matches)) {
      if (maskSecrets(match.snippet) !== match.snippet) unmaskedSecrets++;
      if (match.matchedBy !== "meaning" || !match.pointer) continue;
      pointers.total++;
      pointers[match.pointer]++;
      if (!match.snippet.trim()) pointers.emptySnippet++;
    }
  };
  // The note is set exactly when every match is weak (or nothing matched).
  const endsOnlyWeak = async (question: EvaluationQuestion): Promise<boolean> => {
    const result = await memory.search(question.q, { limit: 10, askingRunId: options.askingRunId ?? null });
    countSnippets(result);
    return result.note !== null;
  };
  const offTopic = questions.filter((question) => question.kind === "offTopic");
  const offTopicFailed: string[] = [];
  for (const question of offTopic) if (!await endsOnlyWeak(question)) offTopicFailed.push(question.id);
  const partial: Array<{ id: string; onlyWeak: boolean }> = [];
  for (const question of questions.filter((item) => item.kind === "partial")) partial.push({ id: question.id, onlyWeak: await endsOnlyWeak(question) });
  const falseOnlyWeak: string[] = [];
  for (const question of questions.filter((item) => item.kind === "answerable")) {
    const isAccepted = (runId: string): boolean => question.accept.some((accepted) => runId.startsWith(accepted));
    let rank: number | null = null;
    let foundAtSearch: number | null = null;
    let ms = 0;
    const searches = [question.q, ...(question.rephrasings ?? [])].slice(0, 3);
    for (const [index, text] of searches.entries()) {
      const started = performance.now();
      const result = await memory.search(text, { limit: 10, askingRunId: options.askingRunId ?? null });
      if (index === 0) {
        ms = performance.now() - started;
        if (result.note !== null) falseOnlyWeak.push(question.id);
      }
      countSnippets(result);
      const position = result.results.findIndex((run) => isAccepted(run.runId));
      if (index === 0 && position >= 0) rank = position + 1;
      if (position >= 0) {
        foundAtSearch = index + 1;
        break;
      }
    }
    perQuestion.push({ id: question.id, rank, foundAtSearch, ms: Math.round(ms) });
  }
  const passed = perQuestion.filter((item) => item.foundAtSearch !== null);
  const ranks = passed.map((item) => item.rank);
  const top3 = ranks.filter((rank) => rank !== null && rank <= 3).length;
  const times = perQuestion.map((item) => item.ms);
  return {
    questions: perQuestion.length,
    gate1: { passed: passed.length, oneSearchTop10: perQuestion.filter((item) => item.rank !== null).length, withinThreeSearches: passed.length },
    gate2: {
      number1: ranks.filter((rank) => rank === 1).length,
      top3,
      top3Share: passed.length ? top3 / passed.length : 0,
      mrr: passed.length ? ranks.reduce<number>((sum, rank) => sum + (rank ? 1 / rank : 0), 0) / passed.length : 0,
      p90Ms: percentile(times, 0.9),
      maxMs: times.length ? Math.max(...times) : 0,
    },
    meaningPointers: pointers,
    unmaskedSecrets,
    offTopic: { questions: offTopic.length, passed: offTopic.length - offTopicFailed.length, failed: offTopicFailed },
    falseOnlyWeak,
    partial,
    perQuestion,
  };
};
