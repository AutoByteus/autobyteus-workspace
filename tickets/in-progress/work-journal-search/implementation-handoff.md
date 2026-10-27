# Implementation Handoff — work-journal-search (`autobyteus-185`)

Branch `codex/work-journal-search` (base `ddd6fdcdf6`), worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search`. Paths below are relative to the worktree; the ticket folder is `tickets/in-progress/work-journal-search/`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large, High); ARCH-REV-002, ARCH-REV-003 (SR-005) and ARCH-REV-004 (SR-006) Pass; this handoff goes to the Code Reviewer.
- Requirements doc: `requirements-doc.md` (SR-001, approved by the user 2026-10-26; UD-016, UD-017; UD-020 the strength labels removed, 2026-10-27)
- Investigation notes: `investigation-notes.md` (AE-01 … AE-21)
- Solution revision record: `solution-revision-record.md` (SR-001 … SR-006)
- Design spec (required on every route): `design-spec.md` (SR-006: § Match Facts (SR-006), § Tool Contract, § Removal Plan, § Product Design Integration)
- Supplemental task artifacts: the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/work-journal-search/ui-ux-spec.md` (VIS-001 … VIS-026; revised for SR-006 and approved by the user 2026-10-27, design repository `a0b6410395`); `memory-search-evaluation-report.md`; `probes/`; `follow-ups.md`; `product-design-request.md`
- Design review report: `design-review-report.md` (ARCH-REV-004 Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: `code-review-report.md` (CRR-001: CR-001, CR-002, CR-003, note C-06); the Solution Designer's SR-004 (UD-018, UD-019, AC-007 extended) and SR-004b (the Design Impact on AC-007 resolved: option (a), corrected off-topic set). The earlier clarifications of R-5 (explicit `notSynced`), R-6 (empty-state copy, now UD-018) and R-7 (newest first) are implemented as written. Then SR-005 / SR-005b / SR-005c (meaning strength, IR-003, superseded) and SR-006 (UD-020: match facts instead of strength; ARCH-REV-004 with the Solution Designer's R-12 … R-15 resolutions and UD-022 tool wording; IR-004).

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (on IR-001 … IR-003)
- Related solution revision IDs: SR-001, SR-003, SR-004, SR-004b, SR-005, SR-005b, SR-005c, SR-006
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-004
- Related code-review revision IDs: CRR-001, CRR-002 (IR-002 Pass), CRR-003
- Related API/E2E revision IDs: F-001 (the API/E2E finding that started SR-005)
- Related delivery revision IDs: N/A
- Triggering finding IDs: UD-020, UD-021 (Product revision), UD-022; ARCH-REV-004 R-12 … R-15

**IR-004 (this round, SR-006): match facts instead of strength labels.** `e7a15930c3`, `606d13b937`.
- **Match facts** (`search/memory-search-service.ts`):
  - A text match carries `matchedWords`: the query's terms its lines hold (`containsTerm`, in query order).
  - A meaning match carries none, and the tool result omits the field.
  - Lines found by both tiers are listed once, as the text match.
  - The result carries `wordsNotFound`: each term for which `store.hasChunk(toFtsPhrase(term))` (`SELECT 1 … MATCH ? LIMIT 1`) finds no chunk, over the whole index, the asking run included (R-15).
  - `bestCardPerRun` keeps each run's first card in `nearest` order. No grade, threshold, baseline or calibration remains, and ranking is unchanged.
- **Facade** (`memory-search.ts`):
  - `wordsNotFound` is empty while the `textIndex` step is not `done`.
  - A live pass, queued or running, does not hold it back (R-13): live passes report the settled index.
  - The note, in order: no results → `No matches; try other words.`; every term not found → `None of these words appear in your memory: X, Y.`; some → `Not found in your memory: X.`; else none.
- **Tool and API:**
  - The tool result keeps `matchedWords` and `wordsNotFound` only when non-empty.
  - The description says a match without `matchedWords` was found by meaning (R-12), that `wordsNotFound` names words in no **indexed** journal, and UD-022's "open a run's first match (its newest) … and the second when the first does not answer, before searching again".
  - GraphQL: `MemorySearchMatch.strength` → `matchedWords: [String!]!`; `MemorySearchResult.wordsNotFound: [String!]!`.
- **Removed:**
  - `MemoryMatchStrength` and every `strength` field;
  - `textStrength`, `termWeights`, `MIN_TERM_WEIGHT`, `tokenChunkCounts` and the `chunk_vocab` table;
  - `termTokens`;
  - the meaning lift and baseline, `meaningCalibrationFor` and `MEANING_CALIBRATION`;
  - merge rule B and `STRENGTH_RANK`;
  - `WEAK_ONLY` and its R-10 suppression;
  - the service's `activeModelId`;
  - `meaning-strength.test.ts`, the evaluation's off-topic / `falseOnlyWeak` / `partial` checks and the meaning calibration report.
- **Evaluation (AC-007, R-14):**
  - New `evaluation/journal-term-census.ts` counts each term in the journal files independently of the index. It reads entries through `readJournalEntries`, tokenizes as `unicode61` does (NFKD, marks removed, lower case, split at non-letters/digits, each ideograph its own token), matches multi-token terms as adjacent tokens, and skips `imports/`.
  - The report's `wordsNotFound` gives the `mismatches` per question and `offTopicUnnamed`.
- **Memory page (Product revision UD-021):**
  - `Words: <words>` on text matches only, with no label on a meaning match.
  - A gray `Not found in your memory: …` note, or an amber `None of these words appear in your memory: …` note when every match is a meaning match. Neither shows while the Text index is incomplete, because the server then sends none.
  - Run ID and workspace on one line; dates without "Mentioned"; a match day only when the card's date does not say it; no Open line; hover outline.
  - The Work Journal banner shows `lines a–b · Words: …`, and the `words` address parameter replaces `strength`.
  - en and zh-CN strings follow the design repository, and the weak, kind and strength keys are removed.
  - GraphQL types regenerated.
- **Docs:** `memory_search.md`, `GLOSSARY.md` (Words / Meaning: how a match was found, not a grade), `autobyteus-web/docs/memory.md`, `scripts/evaluate-memory-search.md`.

**IR-003 (SR-005 … SR-005c, superseded by IR-004).** Meaning strength by lift over a per-query baseline, then per-model rows and merge rule B (`0f3c2a2d87`, `5617a04d02`; IMP-18 … IMP-24). Two Design Impacts (R-9) were raised and resolved. Paused at the Solution Designer's request when the user reconsidered the labels. Only `nearest`'s `{id, score}` cleanup (SR-005) and the tool's "when to use" wording (O-1) remain.

**IR-001 / IR-002 baseline:**

Stage 1 (server) and Stage 2 (web), Change Sequence steps 1–9:

1. **Journal and embedding boundaries.** `WorkJournalService` gains reads (`journalFileVersions`, `listJournalFiles`, `readJournalFile`, `readJournalLines` ≤ 400 lines, `journalFilePath`; all manifest-validated, no generation), `onJournalChanged` (only after a write or removal; listener errors logged as `WORK_JOURNAL_CHANGE_LISTENER_FAILED`, never failing `ensureCurrent`), a nullable `runtimeKind` (generic rule; manifest `runtime_kind: null`), and `reading/journal-entry-reader.ts`. `EmbeddingIndex.nearest` never creates a job, never syncs, never prepares or downloads, and answers `collection: "notSynced"` with no job in this process (R-5).
2. **`src/memory-search/`**, one public boundary (`MemorySearch`): run discovery (every run kind of § Run Kinds, `RUN_FOLDER` for folders no record names, never `imports/`), the pipeline (Find runs → Journals → Text index → Meaning index; single flight, merged requests, built marker, `meaningIndexModelId`, 20 s live debounce, catch-up without the Meaning step, `meaningSync` on the first `notSynced`), the store (contentless FTS5, CJK spaced, chunk locations, cards with parts), chunker, card builder, search (text and meaning alternated, pointer rule text chunk → best card part → first request, newest first, secrets masked, match facts (IR-004), coverage and words-not-found / no-matches notes), the default-limit setting.
3. **`search_memory`**: one contract for the native tool and the MCP adapter; the asking run is left out; argument errors are tool errors.
4. **GraphQL**: `memorySearch`, `memoryIndexStatus`, `startMemoryIndexing`, `rebuildMemoryIndex`, `runFolderWorkJournal`; the memory view's `workJournal` window; availability `hasWorkJournal`; task teams (`TaskTeamRootMemorySource`, `isTaskTeam`, `startedByAgentName`).
5. **Removal** of the per-run episodic/semantic/working-context server path (reader methods, view fields, converter, include flags, availability flags, run-history projection call).
6. **Startup**: `memory-search-loader.ts` starts the facade in the background runner (loads no model); `shutdownMemorySearch()` on close.
7. **Memory page** per the UI/UX spec: Browse · Search · Index, the Work Journal run detail (Work Journal default, Raw Traces), task-team tag, availability notes only when missing, the R-6 empty states, reduced motion; the old tabs, badges and strings removed; GraphQL types regenerated.
8. **Docs**: `docs/modules/memory_search.md` (new), `agent_memory.md`, `agent_work_journal.md`, `embeddings.md`, `README.md`; `GLOSSARY.md` § Memory; `autobyteus-web/docs/memory.md`.
9. **Evaluation command** `scripts/evaluate-memory-search.mjs` (+ `.md`), run on an isolated copy (IMP-06, IMP-07).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Classification; `design-review-report.md` ARCH-REV-004
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: a new server subsystem with a persistent derived store, a new agent tool in two entry forms, GraphQL additions and removals, a startup task, and a rebuilt web page; 140 files outside the ticket folder, about 9,000 lines added (including the regenerated GraphQL types).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: none in IR-004. Earlier ones were all resolved: IR-002's off-topic set (SR-004b); IR-003's R-9 twice (SR-005b, SR-005c), then superseded by UD-020. One question-set observation for the Solution Designer and API/E2E (N02, Known Risks), not a design problem.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| DS-001 / BEH-002 | First build and Rebuild by the user's click; every run's journal made current, then indexed | `api/graphql/types/memory-search.ts` → `memory-search/memory-search.ts` (`startIndexing`, `rebuild`) → `pipeline/memory-index-pipeline.ts` (`findRunsStep` → `runs/memory-run-discovery.ts`; `journalsStep` → `pipeline/journals-step.ts` → `WorkJournalService.ensureCurrent`; `textIndexStep` → `pipeline/run-journal-indexer.ts`, `index/journal-chunker.ts`, `index/journal-card-builder.ts`, `store/memory-search-store.ts`; `meaningStep` → `EmbeddingIndex.sync(complete card set)`) | Implemented; IMP-03 (unit), IMP-06 (3,680 real runs) |
| DS-002 / BEH-005 | Search from the tool (native, MCP) and the page; ranked run pointers | `agent-tools/memory/*` and `agent-tools/mcp/providers/memory-tools-mcp-adapter-provider.ts` → `MemorySearch.search` → `search/memory-search-service.ts` (`textCandidates` BM25 + `EmbeddingIndex.nearest`, interleave, pointer rule, newest first, `readJournalLines` snippets, `maskSecrets`) | Implemented; gates in IMP-07 |
| DS-003 / BEH-001 | A turn's journal change reaches the index | `WorkJournalService.notify` → `MemoryIndexPipeline.onJournalChanged` → 20 s quiet → `request({kind: "runs"})`; Meaning step only with the recorded model on disk | Implemented; IMP-03 (`memory-search.test.ts` live update) |
| DS-004 / BEH-003 | Open a result or a run's Work Journal at lines | `api/graphql/types/work-journal-view.ts` (`readWorkJournalView`), `memory-view.ts` `workJournal` argument, `runFolderWorkJournal`; web `stores/memoryJournalStore.ts`, `components/memory/WorkJournalTab.vue`, `pages/memory.vue` (`openSearchResult` by subject, `folder-inspector`) | Implemented; IMP-09, IMP-12 |
| DS-005 | Step state and progress | `MemoryIndexPipeline.status()` (`StepRecord`, `meaningProgress`); web `stores/memorySearchStore.ts` (`toIndexStatus`, 2 s polling while building), `composables/useMemoryIndexView.ts`, `components/memory/MemoryIndexPanel.vue` | Implemented; IMP-09, IMP-12 |
| DS-006 | Catch-up at start; meaning sync deferred to the first search or live pass | `startup/memory-search-loader.ts` → `MemorySearch.start` → `pipeline.start` (`catchUp` when built; Meaning step skipped); `MemorySearch.search` requests `meaningSync` on `notSynced` | Implemented; IMP-03 |
| R-001, R-002 | Tool contract; one entry per run, fields with a value | `memory-tool-contract.ts`, `memory-tool-manifest.ts` (`toSearchMemoryToolResult`) | IMP-03 (`search-memory-tool.test.ts`) |
| R-004, R-012, AC-006, AC-010 | Every run folder, names as recorded or by folder; no `imports/`; asking run left out | `memory-run-discovery.ts` (catalog, metadata, team/org trees, `TaskTeamRootMemorySource`, folder walk), `isAsking` in the search service | IMP-03 (`memory-run-discovery.test.ts`: every run kind, linked and detached task teams) |
| R-008, AC-005 | Secrets masked in what is shown | `search/secret-masker.ts` applied to every snippet | IMP-07: 0 unmasked |
| R-009, R-010, AC-007, UD-020 | Honest notes; days; newest first; pointers, not facts; match facts (`matchedWords`, `wordsNotFound`), no grade | `search/memory-search-service.ts` (`toMatch`, `hasChunk` per term, `bestCardPerRun`), `memory-search.ts` (`note`, Text-step rule), `memory-tool-contract.ts`; web `MemorySearchResults.vue` (`wordsNote`, `wordsLabel`) | IMP-25 (R-13, R-15, Text-step tests, mutations), IMP-27 (census: 0 mismatches), IMP-28 |
| R-013, R-014, AC-011 | Memory page per the UI/UX spec; old tabs gone; task teams listed | `autobyteus-web/pages/memory.vue`, `components/memory/*`, stores, localization | IMP-08 … IMP-10, IMP-12 |
| R-015 | One vocabulary | `GLOSSARY.md` § Memory; no "episodic"/"semantic" in UI, strings or web docs | — |
| R-016 | Repeatable quality check | `memory-search/evaluation/memory-search-evaluation.ts`, `evaluation/journal-term-census.ts`, `scripts/evaluate-memory-search.mjs` | IMP-07, IMP-27 |
| AC-008 | First build on the reference data | — | IMP-06: journals 113 s, text by 198 s, meaning about 63 min |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/`):
- `src/agent-work-journal/` — `services/work-journal-service.ts`, `store/work-journal-store.ts`, `domain/work-journal-models.ts`, `reading/journal-entry-reader.ts` (new)
- `src/embeddings/embedding-index.ts` (`nearest`)
- `src/memory-search/` (new): `memory-search.ts`, `domain/`, `pipeline/`, `runs/`, `index/`, `store/`, `search/`, `settings/`, `evaluation/`
- `src/agent-tools/memory/` (new), `src/agent-tools/mcp/providers/memory-tools-mcp-adapter-provider.ts` (new), `src/startup/agent-tool-loader.ts`, `src/startup/memory-search-loader.ts` (new), `src/compositions/build-studio-server.ts`, `src/services/server-settings-service.ts`
- `src/api/graphql/types/memory-search.ts` (new), `work-journal-view.ts` (new), `memory-view.ts`, `memory-explorer-schema.ts`, the converter and schema registration
- `src/agent-memory/` — `services/task-team-root-memory-source.ts` (new), `team-memory-explorer-service.ts`, `agent-memory-location-service.ts`, `memory-run-summary-builder.ts`, `agent-memory-service.ts`, `store/memory-file-store.ts`, `domain/models.ts`
- `src/run-history/projection/providers/local-memory-run-view-projection-provider.ts`
- `scripts/evaluate-memory-search.mjs`, `scripts/evaluate-memory-search.md` (new); `src/memory-search/evaluation/journal-term-census.ts` (new, IR-004)
- tests: `tests/unit/memory-search/` (new), `tests/helpers/memory-search-fixtures.ts`, `tests/unit/embeddings/embedding-nearest.test.ts`, `tests/unit/agent-tools/memory/search-memory-tool.test.ts`, `tests/agent-work-journal/services/work-journal-reading.test.ts`, `tests/e2e/memory/memory-search-graphql.e2e.test.ts`, and the updated memory/GraphQL tests

Web (`autobyteus-web/`):
- `pages/memory.vue`; `components/memory/` (`MemoryHome`, `MemorySearchPanel`, `MemorySearchResults`, `MemoryIndexPanel`, `WorkJournalTab`, `MemorySpinner`, `MemoryInspector`, `AgentMemoryDetail`, `CollaborationMemoryDetail`, `MemoryBadges`, `RawTracesTab`); removed `EpisodicTab`, `SemanticTab`, `WorkingContextTab` and their specs
- `stores/memorySearchStore.ts`, `stores/memoryJournalStore.ts` (new), `stores/memoryInspectorStore.ts`, `stores/memoryExplorerStore.ts`; `composables/useMemoryIndexView.ts`; `types/memorySearch.ts` (new), `types/memory.ts`
- `graphql/queries/memorySearchQueries.ts`, `graphql/mutations/memorySearchMutations.ts` (new), `memoryExplorerQueries.ts`, `memoryViewQueries.ts`; `generated/graphql.ts`
- `localization/messages/{en,zh-CN}/memory.ts`, `memory.generated.ts`
- `tests/e2e/memory-search-probe.mjs` (new; `pnpm -C autobyteus-web test:e2e:memory-search`)

Docs: `GLOSSARY.md`; `autobyteus-server-ts/docs/modules/{memory_search,agent_memory,agent_work_journal,embeddings,README}.md`; `autobyteus-web/docs/memory.md`.

## Important Assumptions

IR-004 decisions:
- **`wordsNotFound` uses the search terms** (`queryTerms`: stop words removed, ideograph runs as two-character phrases), so a Chinese cue names its absent two-character phrases (N05 names 6 of its 11 terms). A query with only stop words has no terms, no `wordsNotFound` and only the standard notes.
- **The page's amber/gray choice** follows the Product revision's rule: amber when every listed match is a meaning match, else gray. The text comes from the page's own strings; the server's `note` is for agents.
- **The words in the Work Journal address** are comma-joined (`words=ddns,home`); terms never contain a comma (a term is `[a-z0-9_\-.]+` or a run of ideographs).
- **The census reads entries' text** as the text index takes it, through `readJournalEntries`. It covers every `work_journal/*.md` file outside `imports/`, so it counts the asking run too, as absence does (R-15).
- **"No matches" wording:** the design's § Match Facts calls the no-results note "No matches in memory." and "(unchanged)". The existing string is `No matches; try other words.`, so I kept it as unchanged. The reviewer or the Solution Designer may want the quoted text instead; it is a one-line change.

IR-002 decisions:
- **Own notifications (CR-001)** are recognized by the run folder being made current by the Journals step's own `ensureCurrent` at that moment (`ownJournalCalls`). An agent's change caught in that window is still indexed: this same pass's Text step reads the run afterwards.
- **Before any build**, queued changes index nothing; while the first build runs, they follow it.
- **Quiet passes (CR-002):** a failed `runs` or `meaningSync` pass is logged and leaves the reported state unchanged; the next change or start retries it. `meaningSync` no longer moves `updatedAt`.
- **Meaning progress** counts the build's own embedding (a `full` or `rebuild` pass, or the deferred `meaningSync` after a start), not a live update's re-embedded card. The coverage note says nothing about those few cards.
- (UD-019's term weights and the false-note check were removed by IR-004.)
- **Evaluation kinds (SR-004b):** `answerable`, `offTopic`, `partial`; IR-004 checks `wordsNotFound` for all of them.

IR-001 decisions:

Decisions inside the design's room, for the reviewer to check:

- **Chunks split at day changes** as well as at 2,000 characters, so a chunk's day is exact (found while testing a day boundary).
- **Meaning candidates with score ≤ 0 are skipped**: no positive similarity is not a match.
- **A run whose journal fails in the Journals step is skipped** with a warning and retried on the next pass (raw-trace fingerprint not stored); one broken run does not fail the build.
- **The Work Journal reads and paths were added to the journal service** (`journalFileVersions`, `readJournalFile`, `journalFilePath`) so nothing else reads the journal folder; the summary builder imports the journal store's file-name constants for `hasWorkJournal`.
- **Team-member agent names** are the member address basename; agent-root collaboration members are `RUN_FOLDER` (by folder), as § Run Kinds says.
- **`MemorySearchMatch.pointer`** (which pointer rule resolved a meaning match) is an internal field for the evaluation; it is not in the tool result or GraphQL.
- **`MemorySearch.runFolderMemoryDir(runKey)`** resolves only `RUN_FOLDER` runs the index knows, inside the memory folder (`runFolderWorkJournal` returns null otherwise).
- **The `memory` agent-tool unit** joins the loader's required units.
- **Web: a run known only by its folder** opens through `view=folder-inspector&runKey=…` with the Work Journal tab only (it has no memory view).
- **Web: the inspector reads the memory view only when Raw Traces are shown**; opening a run reads one journal window. The page's one-request-per-navigation rule (REQ-011) holds: the request is the journal read.
- **Web: opened plainly, the Work Journal shows the run's first file** from line 1 (the reference behavior; the server's default is the latest file, so this takes a second read when a run has several files).
- **Web: the Meaning index embedding after a build** (server state Ready, meaning done < total) shows as `building` with the Meaning step running, as the spec's VIS-013.
- **Web: reduced motion** swaps the spinners for a still ring (`MemorySpinner`; the SVG animation cannot be paused by CSS) and stops the bar transition.
- **The evaluation command** accepts run-ID prefixes in `accept` (the probes' rule), waits until a search answers by meaning before measuring, and has `--asking-run` (IMP-07).
- **R-6 copy (UD-018, SR-004):** "No Work Journal yet." + "Index your memory to create it." linking to the Index tab; imported: "No Work Journal".

## Known Risks

- **The question file's authoring run answers every question by its own words.** This ticket's Solution Designer run quotes all the questions. Without `--asking-run` it is the text tier's #1 for 15 of them, and #1 overall falls from 18 to 11; the gates still pass either way. Any run that discusses a topic at length (reviews, designs) competes with the run that did the work. The Solution Designer kept this as is (SR-004); "self-references" stays a later R-016 candidate.
- **N02 names no word (IMP-27, question set):** every N02 word occurs in memory. Its one rare word occurs only in the journal of the run that wrote the question file, which is the `--asking-run`. By R-15 that journal counts for absence, so N02 correctly names nothing. The AC-007 check itself passes: 0 mismatches over 47 questions, and the other 11 off-topic questions name their absent words. The set needs N02 reworded with a word that occurs nowhere, or reclassified; that is the Solution Designer's call (as in SR-004b).
- **Live-update window (R-13, accepted):** a word only in the last turn's lines is named as not found until that turn is indexed (≤ 20 s debounce plus a pass). The tool says "no indexed journal"; a unit test pins it.
- **A meaning match is unlabelled.** An agent may over-trust it; the tool description says how to tell it apart and to read the lines first (design-spec § Risks).
- **Gate 2 latency was measured on a busy shared machine** (load averages 20–40): p90 575 ms, max 964 ms (IMP-07); 605 ms and 1,041 ms in IMP-27. Idle numbers should be lower; the probe report measured 0.2–0.9 s idle.
- **The first build wrote Work Journals into the isolated copy**, as building does on a user's memory (R-005, approved); building on the user's own data needs the user's go and a backup first (TESTING.md; nothing here touched `~/.autobyteus`).
- **`listJournalFiles` reads every journal file of a run** to count lines and days on each Work Journal read; for runs with many MB of journals a window read costs that read. Acceptable for the page's use; a cache keyed by `content_sha256` would remove it if needed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature` (with the in-scope cleanup of the per-run episodic/semantic path)
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed` beyond the explicit boundary additions
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the subsystem has one public boundary (`MemorySearch`); outside it only `domain/` and `settings/` are imported (server settings registration, the tool's limit). Only the journal service reads raw traces to make journals; memory search reads journals through it.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` — IR-004: all strength machinery listed in the summary, `termTokens`, `chunk_vocab`, the service's `activeModelId`, the weak/kind/strength/open_at strings, `Strength` (web), `weakOnly`; IR-001: the episodic/semantic/working-context readers, view fields, flags, converter paths, web tabs and specs; `MemoryMessage` (web type); `formatTimestamp` in `MemoryInspector.vue`; 11 memory localization keys nothing used (7 made dead by this change, 2 added unused by the reference, 2 already dead in these files).
- Dead code found elsewhere, added to `follow-ups.md`: FU-003 (library code in `autobyteus-ts`, text updated); FU-006 (Work Journal tests outside the green suite).
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — largest changed files (effective lines, base): `pages/memory.vue` 466 (356), `server-settings-service.ts` 443 (429), `memory-explorer-schema.ts` 419 (413), `memoryExplorerStore.ts` 413 (415), `build-studio-server.ts` 412 (410), `embedding-index.ts` 379 (347); none over 500. `pages/memory.vue` grew by 110 (under the 220 signal); the new files are split by responsibility (pipeline about 280 lines, store, discovery, search service each under 300).
- Notes: the GraphQL types regeneration also brought `generated/graphql.ts` up to the current schema for other features (it lagged); the only removed name was `MemoryMessage`, used nowhere.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): memory index store and meaning vectors `Discard or Rebuild`; Work Journals and manifests with `runtime_kind: null` `Directly Usable — No Migration`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: Rebuild drops the store and the card collection (`memory-search.test.ts`); an unreadable store file is deleted and recreated (`memory-search-store.test.ts`); 3,680 existing runs indexed directly (IMP-06).
- Migration implementation and focused checks, only when `Migration Required`: N/A
- IR-004: the schema no longer creates `chunk_vocab`. A store from IR-002/IR-003 keeps that unused virtual table; it was never released and Rebuild drops it. No migration, as § Match Facts says.
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- No new dependencies. Node 22's `node:sqlite` (already used by the embedding store) holds the memory index.
- The web GraphQL types were generated from the built server's schema printed to a file (no running server): `BACKEND_GRAPHQL_BASE_URL=<schema.graphql> pnpm -C autobyteus-web codegen`.
- Server tests live under `tests/unit/memory-search/` so `test:unit` runs them.

## Checks Run

All evidence files are in `evidence/`.

**Rerun plan for IR-004 (TESTING.md, rerun by impact).**
- Baseline: IR-003 validated through `5617a04d02` (IMP-22 … IMP-24).
- `git diff --name-only 5617a04d02 HEAD` outside the ticket folder lists:
  - server: `src/memory-search/**` (models, normalizer, store, service, facade, evaluation and the new census), `src/agent-tools/memory/*`, `src/api/graphql/types/memory-search.ts`, the evaluation script and docs;
  - web: the Memory search results, Work Journal tab, page, both stores, types, query, generated types, en/zh-CN memory strings, specs and the probe;
  - `GLOSSARY.md`.
- **Rerun:**
  - IMP-24 (server unit and in-process, memory e2e, typecheck, web memory specs, guards) → IMP-25;
  - IMP-22 → IMP-26;
  - the gates (IMP-23, default model) → IMP-27, with AC-007 now `wordsNotFound` against the census;
  - IMP-12 (the page) → IMP-28.
- **Superseded, not rerun:** IMP-18, IMP-20, IMP-21 and IMP-23's strength, calibration and LEAF-IR checks; nothing they measured exists any more.
- **LEAF-IR not rerun:** ranking is unchanged, `wordsNotFound` does not depend on the embedding model, and LEAF-IR's gates are as in IMP-23 (30/31).
- **Still valid:** IMP-06 (build timings: the pipeline is unchanged; `chunk_vocab` was a virtual `fts5vocab` table over `chunk_text`, with no build cost); IMP-03's suites outside the rerun set.

**Rerun plan for IR-002 (TESTING.md, rerun by impact).**
- Baseline: IR-001 validated through `c66708b44b`.
- `git diff --name-only c66708b44b HEAD -- autobyteus-server-ts/src autobyteus-web` lists only `autobyteus-server-ts/src/memory-search/**`: the pipeline, facade, search service, store, normalizer and evaluation.
- **Rerun:**
  - IMP-02 and IMP-04 (memory-search code) → IMP-13 and IMP-16;
  - IMP-05 → IMP-14;
  - IMP-07 and IMP-11 → IMP-15 and IMP-17;
  - IMP-01 → typecheck in IMP-16.
- **Still valid (nothing they exercise changed):**
  - IMP-06: build timings; the pipeline's steps and indexing are unchanged, and only status reporting and notification filtering changed;
  - IMP-08, IMP-09, IMP-10, IMP-12: no web change;
  - IMP-03's other suites: outside `src/memory-search`; the memory-search unit tests are rerun in IMP-16.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` | `9dcb4910f8` | macOS arm64, Node 22.23.1 | all server `src` | — | Pass | `IMP-01-server-typecheck.log` | `exit 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/memory-search tests/agent-work-journal tests/unit/embeddings tests/unit/agent-tools/memory tests/unit/startup --no-watch` | `ecbf5a57bd` | same | memory-search subsystem, journal reads and notification, `EmbeddingIndex.nearest`, `search_memory`, tool loader | DS-001…DS-006, R-001…R-012 | Pass | `IMP-02-server-focused-tests.log` | `Test Files  26 passed \| 1 skipped (27)`; `Tests  208 passed \| 2 skipped (210)` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` (full), then reruns of the 3 failures and the 3 edited integration files | full run `524220d02b`; reruns `ecbf5a57bd` | same; isolation of `tests/setup`; host load 14–40 | whole server unit suite | all | Pass after fix | `IMP-03-server-unit-suite.log` | full run `Tests  3 failed \| 6793 passed`. 1 failure was ours, fixed in `ecbf5a57bd`; 2 were timeouts under load in code this change doesn't touch. Reruns: `3 passed (3)`, `2 passed (2)`, `3 passed (3)` |
| IMP-04 | `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory --no-watch` | `ecbf5a57bd` | clean env | GraphQL memory search, status, actions, run-folder journal, memory views, explorers | DS-001, DS-002, DS-004, AC-011 (API) | Pass | `IMP-04-server-memory-e2e.log` | `Test Files  7 passed \| 1 skipped (8)`; `Tests  20 passed \| 3 skipped (23)` |
| IMP-05 | `pnpm -C autobyteus-server-ts build` | `ecbf5a57bd` | same | build and bootstrap smoke | — | Pass | `IMP-05-server-build.log` | `Built-in agents bootstrap smoke check passed.`; `exit 0` |
| IMP-06 | evaluation command with `--build` on the isolated copy `/tmp/wjs-copy/memory` (probe-written journals deleted first) | `0e1e9b5dde` | M1 Max; 3,680 runs, 7,426 journal files; Granite R2; shared host | the whole pipeline on real data | AC-008, R-005, DS-001 | Pass | `IMP-06-first-build-timings.log` | journals `done 3680/3680` by `[115 s]`; `Built in 198 s`; meaning done 15:08 (about 63 min after the text index) |
| IMP-07 | evaluation command (no build), runs 2 and 3; run 3 with `--asking-run solution_designer_80624588913d473bac3ef7d8c3d4d305` | `a844d4077a`, `9dcb4910f8` | same; load 30–40 | search, pointer rule, masking, latency | AC-001…AC-005, R-016, AR-002 | Pass | `IMP-07-evaluation-gates.log` | run 3: `"passed": 31`, `"oneSearchTop10": 30`, `"top3": 26`, `"p90Ms": 575`, `"maxMs": 964`, `"emptySnippet": 0`, `"unmaskedSecrets": 0`; Q01–Q03 rank 1 |
| IMP-08 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run` (full) | working tree that became `44ac4d3344` | same | whole web unit/component suite | AC-011 | Pass after fix | `IMP-08-web-suite-full.log` | `Tests  5 failed \| 4913 passed`; the 5 were stale expectations in 2 files, fixed and rerun in IMP-09 |
| IMP-09 | memory web specs + `tests/stores/memoryInspectorStore.test.ts` + `localization` tests | `c66708b44b` | same | Memory page components, stores, page routing, localization | R-013, R-014, AC-011 | Pass | `IMP-09-web-memory-specs.log` | `Test Files  28 passed (28)`; `Tests  123 passed (123)` |
| IMP-10 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `c66708b44b` | same | web boundary and localization rules | R-015 | Pass | `IMP-10-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-11 | off-topic questions N01–N03 as the authoring run on the built index | `9dcb4910f8` | same | weak/none notes | AC-007, R-009 | Pass (observation in Known Risks) | `IMP-11-off-topic.log` | `"saysNothingInMemory": false` ×3; `"note": null` |
| IMP-12 | `node autobyteus-web/tests/e2e/memory-search-probe.mjs …` (probe-owned real stack) | `c66708b44b` (web), dist `ecbf5a57bd` | headless Chrome, clean env | the Memory page end to end against the real server | R-013, R-014, AC-004, AC-011, DS-001, DS-002, DS-004, DS-005, VIS-* | Pass | `IMP-12-memory-page-probe/` | `"result": "Pass"`, 21 checks, `pageErrors: []`; screenshots named by VIS ID |
| IMP-13 | focused server tests + typecheck (as IMP-02) | `5c566766b1` | same | CR-001, CR-002, UD-019, C-06 code and tests | CR-001, CR-002, UD-019, C-06 | Pass | `IMP-13-server-focused-tests.log` | `Tests  215 passed \| 2 skipped (217)`; `typecheck exit 0` |
| IMP-14 | `pnpm -C autobyteus-server-ts build` | `8529960b80` | same | build and bootstrap smoke | — | Pass | `IMP-14-server-build.log` | `exit 0` |
| IMP-15 | evaluation with weighted strength and N01–N03 off-topic (pre-SR-004b set) | `8529960b80` | isolated copy; load 25–35 | strength rule, off-topic note | UD-019, AC-007 (extended) | Fail → Design Impact (resolved by SR-004b) | `IMP-15-evaluation-gates-weighted-strength.log` | `"offTopic": … "failed": ["N01", "N03"]`; calibration simulation |
| IMP-16 | impacted server tests (+ `tests/unit/api`), memory e2e (clean env), typecheck | `41501c5a41` | same | memory-search, GraphQL types, tools, startup, journals, embeddings | CR-001, CR-002, UD-019, C-06, DS-001…DS-006 | Pass | `IMP-16-server-tests-ir002.log` | `Test Files  58 passed \| 1 skipped (59)`; `Tests  369 passed`; e2e `Tests  20 passed \| 3 skipped (23)`; typecheck `exit 0` |
| IMP-17 | evaluation on the SR-004b set (kinds), as the authoring run | `41501c5a41` | isolated copy; load 18–20 | search, strength, notes, masking, latency | AC-001…AC-005, AC-007 (refined), R-016 | Pass | `IMP-17-evaluation-gates-sr004b.log` | `"passed": 31`, `"oneSearchTop10": 30`, `"top3": 26`, `"p90Ms": 556`, `"maxMs": 879`, `"offTopic": {"questions": 3, "passed": 3, "failed": []}`, `"falseOnlyWeak": []`, `"unmaskedSecrets": 0` |

| IMP-18 | meaning-strength calibration data (local script) on the isolated copy | `d07abb8ab2` | isolated copy | meaning scores per question | SR-005, R-9 | Superseded (SR-006) | `IMP-18-meaning-strength-calibration.log` | the R-9 trigger (OT-T3) |
| IMP-19 | `pnpm -C autobyteus-server-ts build` | `0f3c2a2d87` | same | build and bootstrap smoke | — | Pass | `IMP-19-server-build.log` | `exit 0` |
| IMP-20 | evaluation, default model, SR-005b values | `0f3c2a2d87` | isolated copy | meaning lift rule | SR-005b | Superseded (SR-006) | `IMP-20-meaning-strength-default-model.log` | gates unchanged |
| IMP-21 | evaluation, LEAF-IR | `0f3c2a2d87` | isolated copy (LEAF-IR index) | meaning lift rule on a second model | SR-005b | Fail → R-9 (resolved by SR-005c, then superseded) | `IMP-21-meaning-strength-leaf-ir.log` | `"passed": 30` |
| IMP-22 | `pnpm -C autobyteus-server-ts build` | `5617a04d02` | same | build and bootstrap smoke | — | Pass | `IMP-22-server-build.log` | `exit 0` |
| IMP-23 | evaluation, both models, SR-005c rows | `5617a04d02` | isolated copy | per-model rows, merge rule B | SR-005c | Superseded (SR-006) | `IMP-23-meaning-strength-both-models.log` | default model: 31/31, top 3 26, MRR 0.7288 |
| IMP-24 | impacted server tests, memory e2e (clean env), typecheck, web memory specs, guards | `5617a04d02` | same | IR-003 code | SR-005c | Pass (superseded by IMP-25) | `IMP-24-tests-ir003.log` | `Tests  649 passed` |
| IMP-25 | as IMP-24 (commands in the file header) | `e7a15930c3` | macOS arm64, Node 22.23.1; e2e clean env | match facts, notes, Text-step rule, tool result and description, GraphQL, evaluation and census, web results / journal banner / stores / strings | UD-020, UD-022, R-12 … R-15, AC-007, R-009, R-013, R-014 | Pass | `IMP-25-tests-ir004.log` | server `Tests  648 passed \| 2 skipped`; e2e `Tests  20 passed \| 3 skipped (23)`; typecheck `exit 0`; web `Tests  121 passed (121)`; 3 guards passed; mutations M1–M3 each fail the intended tests |
| IMP-26 | `pnpm -C autobyteus-server-ts build` | `e7a15930c3` | same | build and bootstrap smoke | — | Pass | `IMP-26-server-build.log` | `exit 0` |
| IMP-27 | evaluation (default model, no build) with `--asking-run`, private 47-question file | `e7a15930c3` (dist IMP-26) | isolated copy (3,680 runs); load 20–40 | search, ranking, pointer rule, masking, `wordsNotFound` vs. the census | AC-001, AC-002, AC-005, AC-007, R-016 | Pass (N02 observation in Known Risks) | `IMP-27-evaluation-match-facts.log` | `"passed": 31`, `"oneSearchTop10": 30`, `"number1": 18`, `"top3": 26`, `"mrr": 0.7288…`, `"unmaskedSecrets": 0`, `"mismatches": []`, `"offTopicUnnamed": ["N02"]` |
| IMP-28 | `node autobyteus-web/tests/e2e/memory-search-probe.mjs …` (probe-owned real stack, clean env) | `606d13b937` (dist `e7a15930c3`) | headless Chrome | the Memory page end to end after the Product revision | UD-020, UD-021, R-013, R-014, AC-004, AC-007 (page), VIS-006, 007, 017, 022, 024, 025 | Pass | `IMP-28-memory-page-probe/` | `Pass (23 checks passed)`; MS-PROBE-021, 025, 026; screenshots by VIS ID |
- Not run, and why:
  - IR-004: LEAF-IR evaluation (see the rerun plan); `test:unit` and the web suite in full (rerun by impact: nothing outside the memory files changed).
  - AC-012 and AC-013 (real agents; tool selection): API/E2E (UD-007).
  - The Electron shell: the probe covers the browser page only.
  - `test:integration` in full: only the 3 integration files this change edited were run (IMP-03).
  - Gated runtime e2e that query memory views (`tests/e2e/runtime/agy-*`, `grok-build-*`): not run, because they need live providers. Their GraphQL documents were updated in `ecbf5a57bd` to drop the removed arguments.
  - `test:electron`: no Electron code changed.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the Memory page (Browse, Search, Index), the run detail (Work Journal, Raw Traces), agent and team/org detail, the run-folder detail; UXJ-001 … UXJ-006.
- Approved UI/UX, interaction, requirement, or design references: `ui-ux-spec.md` (VIS-001 … VIS-026, revised for SR-006); the runnable reference at the design repository (`5dedfcd84d`, then the Product revision `a0b6410395`, whose memory component, store and string changes IR-004 follows). Its components were taken over as written and its mock stores replaced by real ones.
- Existing design system, shared components, and adjacent product surfaces reviewed: the Skills page toolbar/card language (as the spec says), `@iconify/vue` icons, Tailwind palette, the existing Raw Traces tab (unchanged except its card frame), localization runtime and guards.
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md browser probes against a probe-owned real stack (built server, SQLite, `pnpm dev`, a hand-written memory folder; never user data); headless Chrome.
- States, layouts, viewports, and interactions inspected:
  - desktop 1440×900 and narrow 390×844;
  - not indexed (Search and Index tabs), Index now, building, up to date;
  - search results (text matches with `Words:`, meaning matches unlabelled), none of the words found (amber, IMP-28), some words not found (gray, IMP-28), a Chinese cue;
  - a result opened at its lines (banner, Match 1/2, file marker, highlight), Back to the same results;
  - a large file: Go to line and later lines;
  - Raw Traces, a run known only by its folder, Browse;
  - no horizontal overflow at 390 px.
  - Failed, model-changed, coverage and error states are covered by component specs (IMP-09), not rendered against the real server.
- Visual or interaction issues found and corrected:
  - an entry's trailing raw-trace link rendered at full text color; it is now de-emphasised like link lines (`c66708b44b`);
  - the probe's fixture did not pair tool calls with results, and its ready screenshot caught the bars mid-transition (probe fixes, same commit);
  - the inspector read the memory view on every open although the Work Journal tab doesn't use it; it now reads only for Raw Traces.
- Check IDs with the supporting evidence, and remaining unverified states or limitations:
  - IMP-28 (IR-004: screenshots by VIS ID, 23 checks), IMP-12 (IR-001, 21 checks), IMP-25 (web specs, guards), IMP-09, IMP-10.
  - IR-004 not rendered: VIS-026 (Work Journal from a meaning match: the banner shows only the lines; covered by the WorkJournalTab spec); the gray/amber notes held back while the Text index is incomplete (component spec and server unit test).
  - Not rendered: VIS-002/003/004 with real task teams and agent metadata (the fixture has no run metadata; names come from folders); VIS-008/009/013/015/016 (component specs only); VIS-020 team member; zh-CN rendering (strings and guards checked).

## Downstream Coverage Hints / Suggested Scenarios

- **AC-007 words not found (SR-006):** the tool result's `wordsNotFound` for an off-topic cue in the running app; a word only in the asking agent's own journal is not named (R-15); a just-written word is named until indexed (R-13).
- **AC-012 real agents** (UD-007): a Project Task Manager (Claude or Codex) with `search_memory` selected, in the running app on an isolated copy, asks the known-answer questions (DDNS first) and reaches the right journal lines; also a definition without the tool cannot call it (AC-013).
- **AC-009 freshness** in the running app: a turn's new words are found by text within about a minute (20 s debounce + pass), by meaning after embedding.
- **Restart**: after a build, restart the server; the first search says the meaning index is loading, then answers by meaning (DS-006); nothing loads at start.
- **Model change**: switch the embedding model in Settings → the Index tab shows "Embedding model changed", search says words only, Rebuild restores it.
- **Imported source**: a run of an imported source shows "No Work Journal" when it has none; search never returns imported runs.
- **Large real runs**: open a multi-MB journal from a result; Jump to day, Go to line, earlier/later windows.
- **MCP**: `search_memory` through the MCP adapter for a Codex/Claude run leaves that run's own results out.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-012 and AC-013 (real agents, tool selection) — not run here.
- AC-002's third point (an agent reaches the lines in about 2 steps) — needs real agents.
- AC-009 in the running app (live update timing) — covered in-process by `memory-search.test.ts` only.
- The desktop (Electron) Memory page journey — the probe covers the browser page only.
