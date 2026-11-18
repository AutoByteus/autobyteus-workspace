# Design Case Entry For `docs/design-cases.md` (Delivered At Finalization)

Append this as the next case number on the then-current `personal` (Case 11 on `origin/personal` as of 2026-10-27, after Case 10). If a newer case already covers "a requirement kept although evidence showed it cannot be achieved", add `autobyteus-185, UD-020` to that case instead.

---

### Case 11: A Requirement Kept Against Its Own Evidence (autobyteus-185, R-002, F-001, UD-020)

Principle 1.

- **The requirement said:** each memory search result shows "each match with its strength" (R-002 of `work-journal-search`). The Task asked for "how strong and by what kind of match (text or meaning)".
- **The evidence already said otherwise:**
  - The ticket's evaluation report (§ 5.3) measured meaning scores: unrelated questions scored 0.74–0.83 and real answers 0.80–0.92, so no absolute cut separates them.
  - `autobyteus-71` had recorded the same lesson (FO-001).
- **What happened:**
  - The requirement was kept and reinterpreted as "a strength in words, not a number". The Product design turned it into Strong / Fair / Weak, and the user approved the page.
  - API/E2E then found unrelated cues rated as matches (F-001).
  - Three calibration rounds followed (SR-005, SR-005b, SR-005c): a lift over a rank baseline, a merge rule, and per-model threshold tables. They passed the known questions only with margins of ±0.0078 (Granite) and ±0.0022 (LEAF-IR), each round with an implementation escalation.
  - The implementation was paused. The user asked whether a strong or weak match can be known from embeddings at all, and removed the labels (UD-020).
- **The fix:** results state facts the index can check:
  - a text match lists the query words found in it ("Words: …");
  - a meaning match carries no grade;
  - the search names the query words that occur in no journal ("Not found in your memory: X.", or "None of these words appear in your memory: X, Y."), checked by an exact match per word, and not shown while the text index is incomplete.
  - Ranking was unchanged, so both quality gates still held.
- **Why it mattered:** the challenge on day one would have offered the final solution. Keeping the wording cost a failed E2E round, three calibration rounds, three reviews and a paused implementation, all on machinery a new question or a growing memory could break.
- **Notice it by:**
  - a grade, label, "confidence" or filter computed from model scores without measured scores of real matches and of verified non-matches;
  - evidence explained away by changing the presentation ("words, not a number");
  - a second failed tuning of the same behavior.
- **Skill change:** `autobyteus-agents-67` (PR #128): feasibility evidence per requirement, the challenge rule, and the stop rule.
