import path from "node:path";
import type { WorkJournalService } from "../../agent-work-journal/services/work-journal-service.js";
import type { EmbeddingIndex, EmbeddingReadiness, NearestMatch } from "../../embeddings/embedding-index.js";
import type {
  JournalCardPart,
  MemoryRun,
  MemorySearchMatch,
  MemorySearchRunResult,
} from "../domain/memory-search-models.js";
import { containsTerm, queryTerms, toFtsPhrase, toFtsQuery } from "../index/memory-text-normalizer.js";
import { MEMORY_CARD_COLLECTION } from "../pipeline/memory-index-pipeline.js";
import type { MemorySearchStore, StoredCard, TextCandidate } from "../store/memory-search-store.js";
import { maskSecrets } from "./secret-masker.js";

/** Chunks the text index returns per search (report § 8). */
const TEXT_CANDIDATES = 4_000;
/** Cards the meaning index returns per search. */
const MEANING_CANDIDATES = 300;
const MATCHES_PER_RUN = 2;
const SNIPPET_LINES = 3;
const SNIPPET_LINE_CHARACTERS = 200;

type Journals = Pick<WorkJournalService, "readJournalLines" | "journalFilePath">;

export type MemorySearchServiceDependencies = Readonly<{
  store: MemorySearchStore;
  journals: Journals;
  embeddings: () => Pick<EmbeddingIndex, "nearest">;
}>;

/** What one search found, before the facade adds coverage and the note: the meaning tier's state with it. */
export type MemorySearchOutcome = Readonly<{
  results: MemorySearchRunResult[];
  /** The query's search terms (stop words removed; ideograph runs as two-character phrases). */
  terms: string[];
  /** The query's search terms that no chunk holds, over the whole index (the asking run's journal included). */
  wordsNotFound: string[];
  meaning: Readonly<{ collection: "notSynced" | "synced"; readiness: EmbeddingReadiness }>;
}>;

type Pointer = {
  journalFile: string; lineStart: number; lineEnd: number; day: string | null; matchedBy: "text" | "meaning";
  rule?: MemorySearchMatch["pointer"];
};

/**
 * Each kept run's first card in `nearest` order (the best by similarity), with no grade (UD-020). Unknown runs and
 * the asking run are left out; a card with no positive similarity is not a match at all.
 */
export const bestCardPerRun = (candidates: readonly NearestMatch[], keep: (runKey: string) => boolean): Map<string, string> => {
  const byRun = new Map<string, string>();
  for (const match of candidates) {
    if (match.score <= 0) continue;
    const card = parseCardId(match.id);
    if (!card || !keep(card.runKey) || byRun.has(card.runKey)) continue;
    byRun.set(card.runKey, card.journalFile);
  }
  return byRun;
};

const RAW_LINK = / ?\[↗\]\([^)]*\)/g;

/** Newest day first, then by line (R-010, review R-7). */
const newestFirst = (a: Pointer, b: Pointer): number =>
  (b.day ?? "").localeCompare(a.day ?? "") || a.journalFile.localeCompare(b.journalFile) || a.lineStart - b.lineStart;

/** `runKey/work_journal/journalFile` → its parts. */
const parseCardId = (id: string): { runKey: string; journalFile: string } | null => {
  const at = id.lastIndexOf("/work_journal/");
  return at > 0 ? { runKey: id.slice(0, at), journalFile: id.slice(at + "/work_journal/".length) } : null;
};

/**
 * The search sequence (DS-002): the text index's best chunks and the meaning index's nearest cards, the two
 * lists alternated run by run, the best match per run (the asking run left out), each run's matches newest
 * first with a 2–3 line snippet read from the journal, secrets masked; a text match names the query words it holds,
 * and the outcome names the words no chunk holds (UD-020). It only reads the indexes: nothing is scheduled here.
 */
export class MemorySearchService {
  constructor(private readonly deps: MemorySearchServiceDependencies) {}

  async search(query: string, options: { limit: number; askingRunId?: string | null }): Promise<MemorySearchOutcome> {
    const terms = queryTerms(query);
    const runs = new Map(this.deps.store.listRuns().map(({ run }) => [run.runKey, run]));
    const isAsking = (runKey: string): boolean => Boolean(options.askingRunId) && runs.get(runKey)?.runId === options.askingRunId;

    const textByRun = new Map<string, TextCandidate[]>();
    for (const candidate of this.deps.store.textCandidates(toFtsQuery(terms), TEXT_CANDIDATES)) {
      if (!runs.has(candidate.runKey) || isAsking(candidate.runKey)) continue;
      const list = textByRun.get(candidate.runKey);
      if (list) list.push(candidate);
      else textByRun.set(candidate.runKey, [candidate]);
    }

    const nearest = await this.deps.embeddings().nearest(MEMORY_CARD_COLLECTION, query, { limit: MEANING_CANDIDATES });
    const meaningByRun = bestCardPerRun(nearest.matches, (runKey) => runs.has(runKey) && !isAsking(runKey));

    const results: MemorySearchRunResult[] = [];
    for (const runKey of this.interleave([...textByRun.keys()], [...meaningByRun.keys()], options.limit)) {
      results.push(await this.toResult(runs.get(runKey)!, terms, textByRun.get(runKey) ?? [], meaningByRun.get(runKey) ?? null));
    }
    // Absence is a fact about the whole memory: one exact phrase MATCH per term (R-15: the asking run counts).
    const wordsNotFound = terms.filter((term) => !this.deps.store.hasChunk(toFtsPhrase(term)));
    return { results, terms, wordsNotFound, meaning: { collection: nearest.collection, readiness: nearest.readiness } };
  }

  /** Text and meaning runs, alternated (text first), each run once, at most `limit`. */
  private interleave(textRuns: readonly string[], meaningRuns: readonly string[], limit: number): string[] {
    const order: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; order.length < limit && (i < textRuns.length || i < meaningRuns.length); i++) {
      for (const runKey of [textRuns[i], meaningRuns[i]]) {
        if (runKey && !seen.has(runKey) && order.length < limit) {
          seen.add(runKey);
          order.push(runKey);
        }
      }
    }
    return order;
  }

  private async toResult(
    run: MemoryRun,
    terms: readonly string[],
    textCandidates: readonly TextCandidate[],
    meaningFile: string | null,
  ): Promise<MemorySearchRunResult> {
    const pointers: Pointer[] = textCandidates.slice(0, MATCHES_PER_RUN).map((candidate) => ({ ...candidate, matchedBy: "text" }));
    if (meaningFile) {
      const pointer = this.meaningPointer(run, meaningFile, terms, textCandidates);
      // Found by both tiers: those lines are listed once, as the text match with its words (SR-006).
      const duplicate = pointers.some((existing) => existing.journalFile === pointer.journalFile && existing.lineStart === pointer.lineStart);
      if (!duplicate) {
        if (pointers.length >= MATCHES_PER_RUN) pointers.pop();
        pointers.push({ ...pointer, matchedBy: "meaning" });
      }
    }
    pointers.sort(newestFirst);
    const matches: MemorySearchMatch[] = [];
    for (const pointer of pointers) matches.push(await this.toMatch(run, pointer, terms));

    const days = [...textCandidates.map((candidate) => candidate.day), ...pointers.map((pointer) => pointer.day)].filter((day): day is string => Boolean(day)).sort();
    const fallback = days.length ? null : this.deps.store.runDays(run.runKey);
    const first = matches[0];
    const who = [run.orgName, run.teamName].filter(Boolean).map((name) => `${name} / `).join("") + run.agentName;
    return {
      agent: run.agentName, team: run.teamName, member: run.memberName, org: run.orgName, runId: run.runId, workspace: run.workspace,
      firstDay: days[0] ?? fallback?.firstDay ?? null, latestDay: days.at(-1) ?? fallback?.latestDay ?? null,
      source: first
        ? `${who} · run ${run.runId} · ${first.day ?? "day not recorded"} · ${path.basename(first.journalFile)}:${first.lineStart}-${first.lineEnd}`
        : `${who} · run ${run.runId}`,
      matches, subject: run.subject,
    };
  }

  /**
   * Where a meaning match points (AR-002): the best text chunk of the same journal file; else the card part
   * holding the most query terms (at least one); else the card's first request (or its first part, or line 1).
   */
  private meaningPointer(run: MemoryRun, journalFile: string, terms: readonly string[], textCandidates: readonly TextCandidate[]): Omit<Pointer, "matchedBy"> {
    const sameFile = textCandidates.find((candidate) => candidate.journalFile === journalFile);
    if (sameFile) return { ...sameFile, rule: "textChunk" };
    const card: StoredCard | null = this.deps.store.card(run.runKey, journalFile);
    const parts = card?.parts ?? [];
    const scored = parts.map((part) => ({ part, hits: terms.filter((term) => containsTerm(card!.text.slice(part.offset, part.offset + part.length), term)).length }));
    const best = scored.reduce<{ part: JournalCardPart; hits: number } | null>((top, item) => (item.hits > (top?.hits ?? 0) ? item : top), null);
    const part = best?.part ?? parts.find((candidate) => candidate.kind === "request") ?? parts[0];
    const rule = best ? "cardPart" : "firstRequest";
    return part ? { journalFile, lineStart: part.lineStart, lineEnd: part.lineEnd, day: part.day, rule } : { journalFile, lineStart: 1, lineEnd: 1, day: null, rule };
  }

  private async toMatch(run: MemoryRun, pointer: Pointer, terms: readonly string[]): Promise<MemorySearchMatch> {
    const read = await this.deps.journals.readJournalLines(run.memoryDir, pointer.journalFile, { start: pointer.lineStart, end: pointer.lineEnd });
    const lines = (read?.lines ?? []).map((line) => line.replace(RAW_LINK, "").trim());
    const text = lines.join("\n");
    const firstHit = Math.max(0, lines.findIndex((line) => terms.some((term) => containsTerm(line, term))));
    // Masked before a line is cut to its display length, so a cut never leaves part of a secret (C-06).
    const snippet = lines.slice(firstHit).filter((line) => line.length > 0).slice(0, SNIPPET_LINES)
      .map((line) => maskSecrets(line).slice(0, SNIPPET_LINE_CHARACTERS)).join("\n");
    return {
      journalFile: this.deps.journals.journalFilePath(run.memoryDir, pointer.journalFile),
      lineStart: pointer.lineStart, lineEnd: pointer.lineEnd, day: pointer.day,
      snippet,
      matchedBy: pointer.matchedBy,
      // A text match names the query words its lines hold, in query order (UD-020); a meaning match names none.
      matchedWords: pointer.matchedBy === "text" ? terms.filter((term) => containsTerm(text, term)) : [],
      pointer: pointer.matchedBy === "meaning" ? pointer.rule ?? null : null,
    };
  }
}
