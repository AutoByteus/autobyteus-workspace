# Product Design Revision Request: Memory search without strength labels

- **From:** Solution Designer (software engineering team), 2026-10-27.
- **Ticket:** `work-journal-search`, Project Task `autobyteus-185`.
- **Approved spec to revise:** `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (approved by the user 2026-10-26).
- **Decision behind it:** UD-020, by the user on 2026-10-27: remove the Strong / Fair / Weak labels ("yess. lets remove it. otherwise later during testing we still fail"). Embedding scores have no reliable absolute meaning; three calibration rounds passed the test questions only with very thin margins. Results now state facts that the index can check.
- **Basis:** `requirements-doc.md` R-002, R-009, AC-007, UD-020; `design-spec.md` § Match Facts (SR-006), in `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/tickets/in-progress/work-journal-search/`.

## What The Server Now Returns (Fixed By The Design)

| Field | Meaning |
| --- | --- |
| match `matchedBy` | `text` or `meaning`, as before |
| match `matchedWords` | Text match only: the query's search words found in that part of the journal, in query order (stop words such as "the", "where" and "remember" are not search words; a Chinese run is searched as overlapping two-character pairs, e.g. 自动更新 → 自动, 动更, 更新). Empty for a meaning match |
| result `wordsNotFound` | The query's search words that occur in **no** journal (checked exactly in the text index). Empty while the Text index is still being built, because absence is not yet certain |
| result `note` | Text for agents. The page may use its own copy |
| no strength | No level, score or grade anywhere |

Ranking, the result card anatomy, opening a result at its lines, coverage and error notes are all unchanged.

## What Needs Revising In The Spec

1. **Decision 7 and the "Strength" mapping (spec lines about Strong / Fair / Weak, open point 4):** these are replaced by the facts above.
2. **Match label:** replace `Words` + `Strong/Fair/Weak` with the found words for a text match (suggested `Words: ddns, cloudflare`) and `Related by meaning` for a meaning match. The banner in the Work Journal (`Matched by words, strong`) needs the same change.
3. **UXJ-003 / UIS "Search weak only" / VIS-007 (the amber "Only weak matches" note):** replace it with a factual note when some search words occur in no journal:
   - all search words absent and results exist: suggested `None of these words appear in your memory: X, Y. The results below are only related by meaning.`;
   - some absent: suggested `Not found in your memory: X.`;
   - the page never says "nothing in memory" while results exist (unchanged).
4. **Visuals:** VIS-006, VIS-007, VIS-017, VIS-022, VIS-024, and any other that shows a strength label or the weak-only note. Also the exact-labels list and the "must preserve" list.
5. **Scripted cues** in the runnable reference: `purple elephant` (now shows the "none of these words" note), and the fixtures' strengths.

## Return

- When the revision is approved by the user, return `Design Completed` with the revised spec and visuals to the Solution Designer (run `solution_designer_80624588913d473bac3ef7d8c3d4d305`).
- The wording above is a suggestion; the copy is yours. The fields are fixed by the design, so tell me if the page needs data the server does not return.
