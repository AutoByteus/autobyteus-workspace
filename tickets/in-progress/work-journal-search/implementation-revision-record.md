# Implementation Revision Record — work-journal-search (`autobyteus-185`)

The current code and `implementation-handoff.md` are authoritative. This record holds the initial baseline and, later, one entry per implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` ARCH-REV-002 Pass (round 2) | N/A | `Initial Baseline` | SR-001, SR-003, ARCH-REV-002 | Stage 1 (server) and Stage 2 (web) implemented; handed to code review |
| IR-002 | Solution Designer rework after CRR-001 (`code-review-report.md`), SR-004, SR-004b | CR-001, CR-002, CR-003 (UD-018), UD-019, C-06 | `Local Fix` (CR-001, CR-002, C-06); UD-019 implemented; a `Design Impact` on AC-007 was raised and resolved by SR-004b | SR-004, SR-004b, CRR-001 | Done: all checks pass (IMP-13 … IMP-17); handed to the targeted code review |
| IR-003 | Architecture Reviewer ARCH-REV-003 Pass (SR-005: meaning strength after API/E2E F-001 / CRR-003) and the Solution Designer's R-8…R-11; SR-005b | F-001, R-8, R-9, R-10, R-11, O-1 | `Design Impact` raised twice (R-9): first OT-T3 (resolved by SR-005b), then LEAF-IR verification | SR-005, SR-005b, ARCH-REV-003, CRR-003 | Implemented (`0f3c2a2d87`); the default model meets all three constraints (IMP-20). LEAF-IR fails constraint 2 for any values because of how a match found by both tiers is merged (IMP-21); returned to the Solution Designer |

## Revision Entries

### IR-001 — Memory search over Work Journals: server, `search_memory`, Memory page

- Triggering role, report path, and round: Architecture Reviewer, `tickets/in-progress/work-journal-search/design-review-report.md`, ARCH-REV-002 (Pass), with the Solution Designer's clarifications of R-5, R-6 and R-7.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: branch `codex/work-journal-search` from `ddd6fdcdf6`; commits `02ea886678` … `c66708b44b` (source) plus the ticket-folder commit named in the handoff.
- Related solution revision IDs: SR-001 (requirements), SR-003 (design)
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved package.
- Approved behavior or requirement IDs affected: R-001 to R-016; AC-001 to AC-013; DS-001 to DS-006; VIS-001 to VIS-024.
- Implementation delta (Change Sequence steps 1–9, Staged Plan Stages 1–2):
  - journal service reads, change notification, nullable runtime, entry reader; `EmbeddingIndex.nearest`;
  - `src/memory-search/` (pipeline, discovery, text and meaning index, search, facade, setting, evaluation);
  - `search_memory` (native and MCP), the `memory` tool unit, the default-limit setting;
  - GraphQL search, status, actions and Work Journal reads; `TaskTeamRootMemorySource`; removal of the per-run episodic/semantic/working-context server path and availability flags;
  - module docs and the `GLOSSARY.md` Memory section; the evaluation command;
  - the Memory page per the approved UI/UX spec, the Work Journal run detail, and the removal of the old tabs and strings.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` § Checks Run (IMP-01 … IMP-12).
- Next recipient or routing: Code Reviewer (Large, High risk).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks (the question file's authoring run; word-share strength on off-topic cues; latency measured under load).

### IR-002 — Rework after CRR-001 (SR-004); Design Impact on the off-topic gate

- Triggering role, report path, and round: Solution Designer (SR-004) after code review CRR-001 (`code-review-report.md`), round 1.
- Triggering finding IDs: CR-001, CR-002, CR-003 (resolved as UD-018), UD-019, C-06.
- Classification: `Local Fix` for CR-001, CR-002 and C-06; UD-019 implemented as decided; `Design Impact` raised on AC-007 (extended by UD-019).
- Prior authoritative result: IR-001 (`02ea886678` … `c66708b44b`).
- Current authoritative result: IR-001 plus `0ca22eaa1c` (CR-001, CR-002), `8529960b80` (UD-019, C-06, the evaluation's off-topic check) and `41501c5a41` (evaluation question kinds, SR-004b).
- Related solution revision IDs: SR-004, SR-004b
- Related code-review revision IDs: CRR-001
- Implementation delta:
  - **CR-001:** only the Journals step's own `ensureCurrent` notifications are dropped (`ownJournalCalls`, held while that call is in flight); every other journal change is queued, also during a pass or the first build. A queued change waits for the running pass; with no build and none running, nothing is indexed.
  - **CR-002:** only `full`, `rebuild` and `catchUp` show as `building` with their own steps. `runs` and `meaningSync` work on their own step records, so the status reports the settled index. A failure in them changes nothing reported. `meaningSync` is requested only when the Meaning step would embed (`canSyncMeaning`), and it no longer moves `updatedAt`. Only the build's own meaning embedding counts as meaning progress, not a live update's few cards; the facade's coverage note says the same.
  - **UD-018:** the copy was already as built; the handoff's "awaits confirmation" notes were removed.
  - **UD-019:**
    - `chunk_vocab` (`fts5vocab` over `chunk_text`) and `MemorySearchStore.tokenChunkCounts`;
    - `termTokens` in the normalizer;
    - `MemorySearchService.termWeights` (BM25 IDF, floor 1e-6; a multi-token term counts as its rarest token) and the weighted `textStrength`;
    - the evaluation takes off-topic questions (`accept: []`) and reports `offTopic {questions, passed, failed}`.
  - **C-06:** each snippet line is masked, then cut to 200 characters.
  - **Docs:** `memory_search.md` (pass kinds and status, live changes during a pass, strength, snippet); `scripts/evaluate-memory-search.md`.
- Local validation and result:
  - IMP-13: focused server tests 215 passed; typecheck 0. Six new tests; the CR-001, CR-002, UD-019 and C-06 ones fail on the previous code.
  - IMP-14: build passes.
  - IMP-15: gates 1 and 2 unchanged. Off-topic 1 of 3 (N01, N03 failed), so a Design Impact went to the Solution Designer. SR-004b decided option (a): keep UD-019 and correct the off-topic set; N01 and N03 become `partial`, and N04 and N05 are added.
  - `41501c5a41`: the evaluation reads question kinds and reports `falseOnlyWeak` and `partial`.
  - IMP-16: impacted server tests, memory e2e and typecheck pass.
  - IMP-17: gate 1 31/31; top 3 26/31; off-topic 3/3 (N02, N04, N05); `falseOnlyWeak` []; 0 unmasked.
  - The optional CJK weighting was not added: N05 already passes.
- Next recipient or routing: Code Reviewer (targeted review of IR-002; Large/High).
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks.

### IR-003 — SR-005 meaning strength: calibration stopped by R-9 (Design Impact)

- Triggering role, report path, and round: Architecture Reviewer ARCH-REV-003 (Pass) for SR-005; Solution Designer clarification R-8…R-11.
- Classification: `Design Impact` (R-9 trigger), raised before any source change.
- Evidence: `evidence/IMP-18-meaning-strength-calibration.log`.
  - The new off-topic cues' key words are absent in the isolated copy.
  - The lift rule is feasible for the meaning tier at k ≥ 100 (Lf windows with margins ±0.005).
  - OT-T3 has a fair text match (UD-019 rule; "supplier" is rare but present), so constraint 1 fails for any k, Ls, Lf.
- Next recipient or routing: Solution Designer; implementation continues after the decision.
- **After SR-005b (option (a): OT-T3 partial; k 200, Lf 0.0477, Ls in the upper range):**
  - Implemented in `0f3c2a2d87`:
    - `nearest` returns `{id, score}` only; the relevance field and its computation are removed.
    - `rateMeaningCandidates` takes the baseline over all candidates, then leaves out unknown and asking runs (R-11); with fewer candidates than *k*, the last one (R-10).
    - Named constants: `MEANING_BASELINE_RANK` 200, `MEANING_FAIR_LIFT` 0.0477, `MEANING_STRONG_LIFT` 0.0567 (the answerable best lifts' 75th percentile).
    - R-10: the only-weak note is held back while coverage is incomplete; the page takes only-weak from the server's note.
    - O-1: the tool description says when to use it.
    - Tests: R-11 and R-10 discriminate (a mutation run confirmed R-10); embedding test updated; docs updated.
  - IMP-20 (default model): off-topic 12/12; falseOnlyWeak []; gates unchanged (31/31, top 3 26/31). Margins: Lf +0.0057 (N04) / +0.0058 (Q08); Ls +0.0147 over the largest off-topic lift. Partial-coverage simulation: 50% embedded clean; at 25% and 10%, one off-topic cue rates Fair (R-10 holds the note back).
  - IMP-21 (LEAF-IR): with the same values, off-topic 0/12 and Q08 a false note. Per-model values can't fix Q08: its best meaning card belongs to a run with weak text matches, and `toResult` drops a meaning pointer that duplicates a text pointer (a merge the design does not define). With a merge where a match found by both tiers carries the stronger strength (rule B), both models are feasible: Granite k 200 Lf ≈ 0.0689 ±0.0078, and LEAF-IR only at k 20 (±0.0022) or k 50 (±0.0011). R-9: returned to the Solution Designer.

