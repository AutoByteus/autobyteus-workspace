import { describe, expect, it } from "vitest";
import { DEFAULT_EMBEDDING_MODEL_ID } from "../../../src/embeddings/catalog/embedding-model-catalog.js";
import {
  MEANING_CALIBRATION,
  meaningCalibrationFor,
  rateMeaningCandidates as rateWith,
} from "../../../src/memory-search/search/memory-search-service.js";

/** These tests use a fixed row so their arithmetic stays readable; the table's rows are checked below. */
const ROW = { baselineRank: 200, fairLift: 0.0477, strongLift: 0.0567 };
const MEANING_FAIR_LIFT = ROW.fairLift;
const MEANING_STRONG_LIFT = ROW.strongLift;
const rateMeaningCandidates = (candidates: Parameters<typeof rateWith>[0], keep: Parameters<typeof rateWith>[1]) => rateWith(candidates, keep, ROW);

const card = (runKey: string, file = "work_journal_active.md") => `${runKey}/work_journal/${file}`;
/** 300 candidates scored 0.90, 0.8995, …: rank r (1-based) scores 0.90 − 0.0005·(r − 1). */
const ladder = (idAt: (rank: number) => string) =>
  Array.from({ length: 300 }, (_, i) => ({ id: idAt(i + 1), score: +(0.9 - 0.0005 * i).toFixed(4) }));
const keepAll = () => true;

describe("meaning strength (SR-005: lift over the query's rank-k baseline)", () => {
  it("has a row per calibrated model; a model without one uses the default model's row, unverified (SR-005c)", () => {
    expect(MEANING_CALIBRATION[DEFAULT_EMBEDDING_MODEL_ID]).toEqual({ baselineRank: 200, fairLift: 0.0689, strongLift: 0.0999 });
    expect(MEANING_CALIBRATION["mdbr-leaf-ir"]).toEqual({ baselineRank: 20, fairLift: 0.0429, strongLift: 0.159 });
    expect(meaningCalibrationFor("mdbr-leaf-ir")).toMatchObject({ row: "mdbr-leaf-ir", verified: true });
    expect(meaningCalibrationFor("embeddinggemma-2")).toEqual({ row: DEFAULT_EMBEDDING_MODEL_ID, calibration: MEANING_CALIBRATION[DEFAULT_EMBEDDING_MODEL_ID], verified: false });
    // A row's k is used: rank 20 of a 300-candidate ladder (0.8905) instead of rank 200.
    const candidates = ladder((rank) => card(`agents/run_${rank}`));
    expect(rateWith(candidates, keepAll, MEANING_CALIBRATION["mdbr-leaf-ir"]!).get("agents/run_1")?.strength).toBe("weak");
  });

  it("rates a card by its lift over the score at rank 200: Strong, Fair, Weak at the calibrated lifts", () => {
    // Rank 200 scores 0.8005. Rank 1 lifts 0.0995, rank 100 lifts 0.0495, rank 150 lifts 0.0245.
    const candidates = ladder((rank) => card(`agents/run_${rank}`));
    const rated = rateMeaningCandidates(candidates, keepAll);
    expect(rated.get("agents/run_1")?.strength).toBe("strong");
    expect(rated.get("agents/run_100")?.strength).toBe("fair");
    expect(rated.get("agents/run_150")?.strength).toBe("weak");
    // At the thresholds themselves (1e-9 above, past floating-point rounding of score − baseline).
    const at = (lift: number) => rateMeaningCandidates([{ id: card("agents/a"), score: 0.8 + lift + 1e-9 }, ...Array.from({ length: 199 }, (_, i) => ({ id: card(`agents/f${i}`), score: 0.8 }))], keepAll).get("agents/a")?.strength;
    expect(at(MEANING_STRONG_LIFT)).toBe("strong");
    expect(at(MEANING_FAIR_LIFT)).toBe("fair");
    expect(at(MEANING_FAIR_LIFT - 0.001)).toBe("weak");
  });

  it("computes the baseline over all candidates before the asking run's cards are left out (R-11)", () => {
    // The asking run holds ranks 1-60. Another run at rank 100 lifts 0.0495 over the true baseline (Fair);
    // with the asking run removed first, the baseline would fall to rank 260's 0.7705 and it would read Strong.
    const candidates = ladder((rank) => (rank <= 60 ? card("agents/asker", `work_journal_${String(rank).padStart(6, "0")}.md`) : card(`agents/run_${rank}`)));
    const rated = rateMeaningCandidates(candidates, (runKey) => runKey !== "agents/asker");
    expect(rated.has("agents/asker")).toBe(false);
    expect(rated.get("agents/run_100")?.strength).toBe("fair");
    // The same card is rated the same without an asking run (agent and page agree).
    expect(rateMeaningCandidates(candidates, keepAll).get("agents/run_100")?.strength).toBe("fair");
  });

  it("with fewer candidates than the baseline rank, uses the last candidate (R-10: a partly embedded index)", () => {
    const few = [
      { id: card("agents/a"), score: 0.85 },
      { id: card("agents/b"), score: 0.82 },
      { id: card("agents/c"), score: 0.8 },
    ];
    // The baseline is the last candidate's 0.80: a lifts 0.05 (Fair), b 0.02 (Weak), c itself 0 (Weak).
    const rated = rateMeaningCandidates(few, keepAll);
    expect([...rated].map(([runKey, match]) => [runKey, match.strength])).toEqual([["agents/a", "fair"], ["agents/b", "weak"], ["agents/c", "weak"]]);
  });

  it("keeps each run's best card, and leaves out unknown runs and cards with no positive similarity", () => {
    const rated = rateMeaningCandidates([
      { id: card("agents/a", "work_journal_000002.md"), score: 0.9 },
      { id: card("agents/a", "work_journal_000001.md"), score: 0.88 },
      { id: card("agents/gone"), score: 0.87 },
      { id: "not-a-card-id", score: 0.86 },
      { id: card("agents/z"), score: 0 },
    ], (runKey) => runKey !== "agents/gone");
    expect([...rated.keys()]).toEqual(["agents/a"]);
    expect(rated.get("agents/a")?.journalFile).toBe("work_journal_000002.md");
    expect(rateMeaningCandidates([], keepAll).size).toBe(0);
  });
});
