# Implementation Revision Record — work-journal-search (`autobyteus-185`)

The current code and `implementation-handoff.md` are authoritative. This record holds the initial baseline and, later, one entry per implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` ARCH-REV-002 Pass (round 2) | N/A | `Initial Baseline` | SR-001, SR-003, ARCH-REV-002 | Stage 1 (server) and Stage 2 (web) implemented; handed to code review |
| IR-002 | Solution Designer rework after CRR-001 (`code-review-report.md`), SR-004, SR-004b | CR-001, CR-002, CR-003 (UD-018), UD-019, C-06 | `Local Fix` (CR-001, CR-002, C-06); UD-019 implemented; a `Design Impact` on AC-007 was raised and resolved by SR-004b | SR-004, SR-004b, CRR-001 | Done: all checks pass (IMP-13 … IMP-17); handed to the targeted code review |

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

