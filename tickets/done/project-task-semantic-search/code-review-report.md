# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 5: merge resolutions of the DR-001 latest-base integration, IR-004). Round 4 reviewed the SR-007 rework of FO-001. Round 3 was the failure-origin review (`CRR-003`, Design Impact). The round-2 implementation sections below are carried forward except where the Round 4 section notes a change.
- Requirements Doc Reviewed As Context: `tickets/in-progress/project-task-semantic-search/requirements-doc.md` (SR-007: SR-004 + the Delta SR-007, approved by the user 2026-10-18: DEC-002 Granite default, DEC-011, QR-003/QR-004 re-based)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (consulted for catalog pins and runtime facts)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001…SR-006)
- Design Spec Reviewed As Context: `design-spec.md` (SR-007; § Failure-Origin Resolution FO-001 → SR-007, G2, G7)
- Supplemental Task Artifacts Reviewed As Context: `model-evaluation-report.md` (evidence), `implementation-evidence/catalog-verification/quality-and-calibration.json` (evidence)
- Relevant Solution Revision IDs: SR-004, SR-006, SR-007
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002, IR-003, IR-004
- Code Review Revision Record: `tickets/in-progress/project-task-semantic-search/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-006` (CRR-005 was the separate test review in `api-e2e-test-review-report.md`)
- Current Review Round: 5
- Review Scope (round 5): `Targeted Delta Review` of the merge `600d079b9c` (`origin/personal` @ `2b04a9971d` into the branch at `9f0df7eab3`).
  - Comparing the ticket's delta against its base before (`55bff1f5ee..9f0df7eab3`) and after (`2b04a9971d..600d079b9c`): the same file set plus the base test `project-task-tools.test.ts`.
  - Patch content is identical except in the five declared resolution files (tool contract, manifest, `project-service.ts`, `project-task-service.ts`, that test). The MCP docs merged to the base list plus `search_project_tasks`.
  - No embedding-layer, web or packaging file changed in the merge.
- Review Scope (round 4): `Targeted Delta Review`. The delta `68441864d1..9f0df7eab3` (13 files) has three parts, all within the embedding layer FO-001 and O-1 implicated:
  - catalog data: the default id, the order of the entries and LEAF-IR's calibration;
  - O-1: `prepareModel`'s initial phase and `EmbeddingModelFiles.hasAllFiles` plus the progress timing of `ensure`;
  - tests, fixture and docs.

  No data-flow spine, public boundary or shared data shape changed: `hasAllFiles` is internal to the layer, and `EmbeddingIndex`'s API and the readiness union are unchanged. Unaffected round-2 evidence is carried forward. Round 2 scope (also `Targeted Delta Review`):
- Review Scope Evidence (round >1): the delta `b27dd7b284..722b9b3918` touches 4 files: `useProjectTaskSearch.ts` (CR-001), `ProjectsPanelTaskLocate.spec.ts` (CR-001 spec), `embedding-readiness.ts` (CR-002) and `embedding-worker.ts` (C-03, type-only). It stays within the prior findings' files and behavior; no spine, shared interface or data shape changed. Round-1 evidence for unaffected checks is carried forward.
- Trigger (round 5): delivery Local Fix DR-001 → implementation engineer IR-004 (latest-base merge).
- Trigger (round 4): implementation engineer handoff for IR-003 (SR-007 rework of FO-001, plus the optional O-1). Round 3's trigger was API-REV-001 F-001; round 2's was the IR-002 local fix.
- Prior Review Round Reviewed: round 4 (`CRR-004`, Pass) and the test review `CRR-005` (Pass)
- Latest Authoritative Round: 5
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md` (testing guideline: the worktree `TESTING.md`)
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (API-L04, F-001)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Delivery Revision Record / IDs: `delivery-revision-record.md` (DR-001, Blocked — Local Fix: integration conflicts); `release-deployment-report.md`
- Failing Scenario IDs: API-L04 / F-001 (AC-004; AC-001 at 1,000-Task scale)
- Exact Failing Commands / Execution Mode: the execution report's API-L04 row. `evidence/probes/API-PROBE-search-driver.mjs quality` on Backlog 1000 over the instance's GraphQL (ENV-2, packaged macOS arm64 app at `722b9b3918`), and `evidence/probes/API-PROBE-score-analysis.mjs` with the production `dist` runner, catalog and `selectRelevant` (ENV-4; generator seed 20261018)
- Failure Evidence Paths: `evidence/quality/API-L04-01-backlog1000-leaf-ir.json.txt`, `API-L04-03-score-analysis-mdbr-leaf-ir.json.txt`, `API-L04-05-score-analysis-{granite-embedding-small-english-r2,embeddinggemma-2}.json.txt`, `API-L04-07-board-unrelated-b1000.png`
- Source commit under validation (round 3): `722b9b3918`; evidence commits `8981a99256`, `68441864d1`
- Code reviewed (round 4): `68441864d1..9f0df7eab3`; IR-003 handoff and evidence `2e9e358b5b`
- Code reviewed (round 5): `9f0df7eab3..600d079b9c` (resolutions) and `2b04a9971d..600d079b9c` (ticket delta on the new base); IR-004 handoff and evidence `c823cf27a8`
- Code reviewed (round 2 delta: `b27dd7b284..722b9b3918`; ticket docs `358b7f0123`): worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search`, branch `codex/project-task-semantic-search`, `55bff1f5ee..b27dd7b284` (feature `54e26d76ee`, licensing `d83ec5235a`); companion `/Users/normy/autobyteus_org/autobyteus-agents-project-task-semantic-search` `887e79d..344da76`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review` (rounds 1, 2 and 4); `API/E2E Failure-Origin Review` (round 3)
- Independent source review required by the classification: `Yes`. The classification still holds; the failure does not change it
- Classification evidence or correction required: None. The implementation matches the design's listed surfaces: a new subsystem, a persisted store, a download, a worker lifecycle, new contracts and packaging. None of the design's escalation triggers was hit. The new `TASK_SEARCH_QUERY_REQUIRED` error code is additive.

## Implementation Review Round 5 (CRR-006): latest-base merge resolutions (DR-001, IR-004)

### Behavior basis

Unchanged: SR-007 / ARCH-REV-003. The base brought in two changes that touch this ticket's surfaces:

- `create_or_update_project` and `effectiveProjectTaskToolName` were removed (`6ba0389741`, `4807095aed`);
- Task-adoption reverts now run after Task and Project delete (`ef807beb6d`, autobyteus-11).

Both are base-owned behavior. The ticket must keep REQ-005/006 (the tool) and REQ-007 (delete cleanup) on top of them, and it does.

### Resolution checks

| Area | Result | Evidence |
| --- | --- | --- |
| Tool contract | Pass | Seven tools: the base's six plus `search_project_tasks`. The parser dispatches on `name`; `parseSearchProjectTasksInput` is unchanged. No reference to `create_or_update_project` or `effectiveProjectTaskToolName` remains in `src`, `docs` or the companion `agents/` |
| Manifest | Pass | The search branch now uses `name` (the base removed `tool`); its body is identical to the reviewed one |
| Native tools | Pass | `SearchProjectTasksTool` is registered; `CreateOrUpdateProjectTool` is gone with the base |
| `ProjectService.deleteProject` | Pass | Order: `projectRemoved`, then the synchronous best-effort `forgetProject` (never throws or waits; REQ-010/QR-006), then the base's awaited best-effort `afterDelete` adoption revert. Neither hook can block or fail the other. Imports: `project-service` → `projects/search` (value), `project-task-service` (base); `projects/search` imports no service, so there is no cycle |
| `ProjectTaskService.deleteTask` and initializer | Pass | `forgetTask` and then the base's `revertUnfinishedAdoptionsOfDeleted`. The initializer `Pick` includes both `revertUnfinishedAdoption` and `searchCleanup`; the composition passes both. 492 effective lines (base 490) |
| Base test `project-task-tools.test.ts` | Pass | It now expects seven tools on the contract, the MCP adapters and the native registry, and still proves `create_or_update_project` is unknown. The assertion is extended, not weakened |
| MCP docs | Pass | The base's tool list plus `search_project_tasks`, with its contract line |
| Checks | Pass (recorded) | IMP-08…IMP-12 on `600d079b9c`: typecheck, the server unit suite (737 files), the Projects E2E folder in a clean environment (6 files, including both search E2E tests and `project-task-boundaries`), web Projects tests (111 files), and the gated adoption-revert and change-feed E2E tests (11). These cover the merged code, so I did not rerun them |

### Candidates (round 5)

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-14 | `native-compaction-terminal-drain.test.ts` failed once in a batch run, then passed 10 reruns and the full suite | Not reviewed / note | Base compaction code untouched by this ticket and the merge. One unexplained intermittent failure is not enough evidence for a follow-up here; it is recorded in the IR-004 handoff |
| C-04 (carried) | `project-task-service.ts` L52 still joins the `searchCleanup` JSDoc and field on one line; the file is now 492 lines, so normal formatting would fit | Note (non-blocking) | Readability only. Tracked with follow-up autobyteus-147 (the `ProjectTaskService` split); restoring normal formatting is optional |

### Score update

Round-4 scorecard stands: 9.4/10, every category ≥ 9.0. The resolutions are mechanical, preserve ownership and add no new mechanism.

## Implementation Review Round 4 (CRR-004): SR-007 rework

### Behavior basis

- Confirmed against SR-007:
  - DEC-002 makes `granite-embedding-small-english-r2` the default; a blank setting means Granite.
  - LEAF-IR stays in the catalog as the fast option for small Projects, with floor 0.30 and margin 0.045 and a description warning about large Projects.
  - DEC-011: AC-001/AC-002/AC-004 hold for the default up to 1,000 Tasks.
  - G2: the default is verified at 60 and 1,000 Tasks.
  - G7 / O-1: present files are reported as `loading`.
- Status: `Confirmed`. No contradicted or new behavior.

### Prior finding recheck

FO-001 is resolved upstream (SR-007, user-approved) and implemented:
- `embedding-model-catalog.ts` sets `DEFAULT_EMBEDDING_MODEL_ID = GRANITE_SMALL_ENGLISH_R2.id` and lists Granite first, so the setting description and the error list show it first.
- Granite's calibration is unchanged (0.78/0.02), with the 1,000-Task evidence recorded in the comment.
- The implementation evidence matches the FO-001 numbers: IMP-03, fixture 96.8% / 95.8%, generated 93.7% / 95.8%, repository 92.1% / 95.8%. The implementer recorded this check on `9f0df7eab3`, so I did not rerun it.

### Delta checks

| Area | Result | Evidence |
| --- | --- | --- |
| Catalog data only; no per-model code branch | Pass | Only the id, order, descriptions and LEAF-IR's `relevance` changed. `resolveActiveEmbeddingModel` and the normalizer read the catalog unchanged |
| O-1 readiness (`embedding-index.ts` `prepareModel`) | Pass | Starts as `loading` when `hasAllFiles` holds, else `downloading 0 of N`. The progress callback may move `loading` → `downloading` when a present file fails its checksum and is re-downloaded. After `ensure` the phase is set to `loading` as before, and model-switch and failure guards are unchanged. The readiness union is unchanged, so the board's existing texts apply |
| `EmbeddingModelFiles.hasAllFiles` / `ensure` progress | Pass | Four `statSync` calls once per preparation; size-only, documented as cheap, with `ensure` still verifying SHA-256. Progress is reported only for downloaded bytes, and the final value per downloaded file is kept. Unit-tested |
| Persisted data | Pass | Not affected. A server whose setting is blank now resolves to Granite; the existing switch path (DS-007) rebuilds without mixing vectors, which is the approved behavior on a default change. The feature is unreleased |
| Dead code / legacy | Pass | None introduced. `hasAllFiles` is used by `EmbeddingIndex` |
| File size | Pass | `embedding-index.ts` 243 → 248, `embedding-model-files.ts` 106 → 120, catalog 89 → 96 effective lines |
| Tests (proportionate) | Pass | O-1 unit tests for both phases and for `hasAllFiles`. Catalog/setting tests assert the default and its order. The gated quality test now measures AC-001 as "shown among the first 5" (as the AC says) and soft-asserts AC-001/AC-004 for the default on both 1,000-Task backlogs. The fixture has 24 unrelated queries, a superset of the 12 API/E2E used |
| Docs (`docs/modules/embeddings.md`) | Pass | New default, per-model measured table at 60 and 1,000 Tasks, readiness wording for present files |

### Candidates (round 4)

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| C-10 | `repositoryBacklog` reads `tickets/done/*`, currently 627 tickets, so its 940 texts change as tickets close; later gated runs will not reproduce today's numbers exactly | Reject (as a finding); non-blocking note | Opt-in gated measurement named by design G2. The generated backlog is deterministic. A future rerun measures the then-current product-domain text, which still serves the DEC-011 intent |
| C-11 | Implementation changed the API/E2E-owned `project-task-search-model-unavailable.e2e.test.ts` (model folder now from `DEFAULT_EMBEDDING_MODEL_ID`) | Reject (as a finding); note | A one-line consequence of the default change, with no assertion weakened. It is part of the next proportional test review |
| C-12 | Granite at 92.1% vs the 90% target on the repository backlog (R-9) | Hold for Evidence (API/E2E) | Meets the target. API/E2E reruns API-L04 on the built app |
| C-13 | QR-003/QR-004 re-based on Granite (≤ 3 min / 170 Tasks, ≤ 20 min / 1,000; ≤ 800 MB / ≤ 450 MB) | Hold for Evidence (API/E2E) | Cost reruns API-L03b/c/d belong to API/E2E |

### Score update

The round-2 scorecard stands; no category changes, since the rework is data plus one small readiness refinement. Runtime Correctness stays at 9.3; Cleanup at 9.3. Overall 9.4/10, every category ≥ 9.0.

## API/E2E Failure-Origin Review (Round 3, CRR-003)

### Failing scenario still represents approved behavior

- Scenario: SCN-001 (Supported Normal Scenario). The user types a query on the board.
  - An unrelated query must show the existing no-match state rather than forced weak matches (REQ-003: meaning matches "only when the best one is clearly relevant"; AC-004: ≥ 90% of the defined unrelated set).
  - A paraphrase must show its Task in the first 5 (AC-001).
- Supported entry surface: the board search box, exercised through normal production execution. API-L04 ran the instance's GraphQL `searchProjectTasks` on the packaged desktop app, and the board screenshot shows 16 Tasks for "weather in Berlin tomorrow".
- Backlog size: 1,000 Tasks is within the supported scale. The approved QRs scope search to "a Project with up to 1,000 Tasks" (QR-001) and require indexing 1,000 Tasks (QR-003), and AC-015 validates on a synthetic 1,000-Task backlog. The test entered through the real trigger with production code. The 1,000-Task backlogs are synthetic test data, but they are an approved basis (AC-015), not an unsupported setup. The real product-domain text backlog does worse than the generated one, which rules out a test-data artifact.
- AC-004 and AC-001 name the defined query set but not a backlog size. They are read here together with the QR-001/QR-003 scale, consistent with REQ-003's wording. Whether the user wants a different scale for these two ACs is a question for the Solution Designer and may need the user (noted below).
- Conclusion: the failing scenario represents approved behavior. The failure is not an invalid or stale test, nor a fixture, environment or execution problem.

### Origin analysis

- **Code path (smallest relevant):** `ProjectTaskSearchService.search` → `EmbeddingIndex.query` → `selectRelevant(scored, definition.relevance, 20)` (`src/embeddings/relevance.ts`) with LEAF-IR's catalog calibration `{clearMatchFloor: 0.24, nearBestMargin: 0.045}` (`src/embeddings/catalog/embedding-model-catalog.ts` L37–39).
- **The implementation behaves as designed.** `selectRelevant` is exactly the approved DEC-001 / design rule: no matches when the best score is below the model's floor; otherwise items within the margin of the best, capped at 20. The score probe imports the production `dist` modules (`selectRelevant`, catalog, runner), and its results equal the in-app GraphQL results.
- **The calibration basis is too small.** Design § G2 tells the implementation to derive each model's floor and margin "over the synthetic test data package" (the 60-Task fixture) and the probe procedure. The implementation followed G2: it raised LEAF-IR's floor to 0.24, the lowest value meeting AC-004 on that fixture. An absolute floor calibrated at 60 Tasks does not transfer to 1,000:
  - With more Tasks, the best score an unrelated query reaches by chance rises (unrelated median 0.200 → 0.248–0.273; max up to 0.343).
  - The 0.045 margin then admits up to the 20-match cap.
  - LEAF-IR's on-topic and unrelated best-score distributions overlap at this scale: on-topic p05 0.356 against an unrelated maximum of 0.343 (real text). So re-tuning only this absolute floor trades AC-004 against AC-001 recall. The evidence suggests a choice between:
    - recalibrating the floor at the supported scale;
    - a size- or distribution-relative relevance rule;
    - changing the default model (DEC-002 is the user's decision). Granite and EmbeddingGemma 2 pass 12/12 at 1,000 Tasks.
- **Escalation trigger hit:** design § Task Size And Architectural Risk names "measured latency, indexing time or memory miss QR-001…QR-005 on the built app" and binds catalog-entry verification failures to a `Design Impact` (G2, RSK-006). A relevance-quality miss on the built app for the default entry falls under the same G2 contract.
- **Was this an earlier review gap?** No. The source cannot show it: the code follows the reviewed rule and the G2 procedure, and the failure appears only when the real model is measured on a 1,000-Task backlog. Code review recorded it as `Hold for Evidence` (C-08, RSK-004) and routed it to API/E2E for exactly this measurement. Architecture review (ARCH-REV-002) accepted G2's fixture-based calibration basis; the inadequacy is in that design basis, not in an implementation step.
- **Origin classification:** `Design Impact`. The reviewed design's relevance calibration basis (G2, possibly the rule shape) is inadequate for the supported backlog scale. There is a related requirement question for the Solution Designer: at which backlog size AC-001 and AC-004 must hold, and whether a change of default model (DEC-002) needs the user.

### Candidate gate updates (round 3)

| Candidate ID | Observation | Scenario / Contract ID | Evidence | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| C-08 | LEAF-IR's absolute floor (0.24), calibrated on 60 Tasks, lets unrelated queries through at 1,000 Tasks (4–6 of 12 unmatched; target in the first 5 for 87.3%/90.5%) | SCN-001; REQ-003, AC-004, AC-001; QR-001/QR-003 scale | API-L04 evidence above | Promote (was Hold for Evidence) | This ticket | `Design Impact` FO-001 → Solution Designer. Not an implementation defect |
| O-1 (API/E2E) | After a restart, readiness briefly reports `PREPARING/DOWNLOADING 0 of N` while existing files are only verified (`embedding-index.ts` `prepareModel` sets `downloading` before `files.ensure`) | REQ-009 status text | Execution report O-1 (≈1 s) | Reject (as a finding) | — | Cosmetic, about 1 s, no wrong outcome. The Solution Designer may fold it into the rework if desired |
| R04 cadence | Two `agent-status-websocket` integration cases fail | — | `repository/API-R04-server-integration.log` | Not reviewed | — | API/E2E already recorded them as pre-existing and out of scope. This branch changes no streaming or status file; outside this failure-origin review's entry point |

### Score rationale update

The full scorecard is not repeated for a failure-origin round (round 2: 9.4/10). Affected rationale: the Runtime Correctness score (9.3) judged the code against the reviewed rule and is unchanged. C-08 now has evidence of a design-basis inadequacy, which is routed as `Design Impact` rather than scored against the implementation.

## Review Scope

- Changed implementation and behavior reviewed:
  - the server embedding layer (`src/embeddings/**`);
  - `ProjectTaskSearchService`, the delete hooks and the composition wiring;
  - the GraphQL resolvers and the agent-tool contract, manifest and native class;
  - the setting registration;
  - the web composable, board, types, GraphQL documents and localization;
  - the packaging module and its two hooks;
  - the licensing allowlist;
  - the companion Project Task Manager config and skill.
- Tests reviewed proportionately: the new server unit, E2E and gated integration tests, the fixtures and fake model, and the web board and panel specs.
- Focused suites rerun by the reviewer at `b27dd7b284`: server `tests/unit/embeddings`, `project-task-search`, `search-project-tasks-tool` (6 files, 38 tests pass); web `components/projects` (14 files, 112 tests pass).
- Round 2 delta reviewed: the `refresh` flag on `schedule()`/`run()` in `useProjectTaskSearch.ts`; the new CR-001 spec; the removal of `isSettledReadiness`; the worker's `import type` of `EmbeddingModelOutput`.
  - Reviewer reran at `722b9b3918`: server `typecheck` (clean) and `tests/unit/embeddings` (27 pass); web `components/projects/panel` (12 pass, including the new CR-001 case).
  - The uncommitted `design-spec.md` edit (FU-1 wording, owned by the Solution Designer) is outside this review.
- Explicit exclusions: ticket probes and evidence files, which are not production source; `pnpm-lock.yaml` beyond the two pinned additions; docs only for accuracy at the touched claims (docs sync belongs to delivery).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. Board and agent meaning search run on a reusable server-side embedding layer. The exact tier is preserved. First use is lazy and never blocks anything. The model is switched through a server setting (REQ-001…REQ-015).
- Design-spec behavior map verified against the implementation: Yes (DS-001…DS-008).
- Design review report and round confirmed: ARCH-REV-002, Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `ProjectTaskBoard.vue` L64–89 → `useProjectTaskSearch.ts` (250 ms debounce, latest wins, 2 s readiness refresh that keeps the answer settled) → `searchProjectTasks` (`project-task-search.ts`) → `ProjectTaskSearchService.search` → `listTasks` + `EmbeddingIndex.search`. The predicate is removed. The locator works while preparing (CR-001 resolved in round 2). | — |
| BEH-002 | Confirmed | Contract (`project-task-tool-contract.ts` description/schema/parser) → manifest (30 s wait, `taskKey` as `taskId`, 160-char summary, `meaningSearch` note) → service; native class; MCP through the manifest; companion selects the tool | — |
| BEH-003 | Confirmed | Fingerprint sync on every search (`collection-indexing-job.ts` `sync`/`freshVectors`); generation-checked writes; `deleteTask` → `forgetTask`, `deleteProject` → `forgetProject`; vectors persist in `embeddings.sqlite` | — |
| BEH-004 | Confirmed | Readiness state machine (`embedding-index.ts` `prepareModel`/`failModel`/`retryModel`); `EmbeddingModelFiles` (idle timeout, `.part`, SHA-256, rename, single flight); the runner's idle stop; nothing is built at startup (lazy accessor in the composition) | — |
| BEH-005 | Confirmed | Generic `EmbeddingIndex` keyed by collection; catalog data; setting resolved at every operation; `activeModel()` switch; `removeOtherModels` on ready | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001/002 | BEH-001; REQ-001…REQ-004 | User | User | Find a Task by meaning or by remembered words | Board search box (Projects page; right panel) | Normal | DS-001 | Exact first, then meaning, best-first per lane | Requirements SCN-001/002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-002; REQ-005/006 | Contract | Agent selecting the tool | Check whether a Task exists | `search_project_tasks` | Normal | DS-002 | Compact list + `meaningSearch` | Requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-003; REQ-007/008 | System | Task writers, restart | Keep search truthful | Task/Project writes; restart | Normal | Search-time sync; delete hooks | Never stale | Requirements SCN-004 | Supported Normal Scenario | Use |
| SCN-005/006 | BEH-004; REQ-009/010 | System / User | First search; offline | Prepare on first use; explain failure | First board search or tool call | Normal / Explicit Edge | DS-004, DS-003, DS-005 | Preparing line with progress; unavailable + Retry; nothing else waits | Requirements SCN-005/006 | Supported Normal / Explicit Edge | Use |
| SCN-008 | BEH-005; REQ-015 | Operational | Operator | Use another catalog model | `AUTOBYTEUS_EMBEDDING_MODEL` | Normal | DS-007 | Rebuild; only the active model kept | Requirements SCN-008 | Supported Normal Scenario | Use |
| SCN-CR-1 | BEH-001; REQ-004 / AC-005 (locator preserved behavior); REQ-010 ("the board … never wait[s] for … meaning search") | User | User | Reveal a Task with "Show Task in Projects" while that Project's right-panel board has a search text and meaning search is preparing | Existing locate action (compact board); the preparing state that REQ-009 supports (first use, model switch; QR-003 allows up to 2 min for ≈170 Tasks and 10 min for 1,000) | Explicit Edge (a lifecycle state the requirements explicitly support, plus an existing action; no race or artificial timing: the window lasts minutes) | Locator request (`taskLocatorStore`, expires after `TASK_LOCATE_EXPIRY_MS` = 10 s) → board `settled` (L103–104) → `search.settled` → `pending` | The Task is revealed: a hiding search is cleared, Cancelled is shown, the card is marked visible | REQ-004 preserved-behavior list; AC-005; REQ-009/REQ-010; code L39–43/L60–61/L95 of `useProjectTaskSearch.ts` | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The locator never acts while meaning search is preparing | SCN-CR-1 | The user clicks "Show Task in Projects" | `run()` sets `pending=false`, then `schedule(PREPARING_POLL_MS)` sets `pending=true` in the same tick (`useProjectTaskSearch.ts` L39–43, L60–61). So `settled` (L95) stays false for the whole preparing phase. The board's `settled` (L103–104) gates the locator watch, and the request expires after 10 s, so the Task is neither revealed nor highlighted. During indexing after an edit, the delay is only one poll (≈2 s), which is acceptable | Code reading; `taskLocatorStore.ts` L11/L45; no spec covers locate while preparing | Promote | This ticket | CR-001 Local Fix (round 2: **Resolved**). A readiness poll refreshes the answer for the *same* query and should not count as unsettled. Only a new query or Project, a task-list re-search, or the first request should hold the locator |
| C-02 | `isSettledReadiness` in `embedding-readiness.ts` L15 has no caller | Core Principle 7 (dead code in new files) | — | — | `grep` over `src` and `tests`: no reference | Promote | This ticket | CR-002 Local Fix: remove it (round 2: **Resolved**) |
| C-03 | `EmbeddingWorkerOutput` duplicates `EmbeddingModelOutput` | Design dependency rule (the worker may use erasable type-only imports) | — | One-line union; TypeScript flags divergence at the `workerData` assignment | `embedding-worker.ts` L16, `embedding-model-definition.ts` L10 | Reject (as a finding) | — | Non-blocking note: an `import type` would remove the copy (round 2: applied; the copy is gone) |
| C-04 | `ProjectTaskService` `searchCleanup` field and its JSDoc joined on one line (L49) with an inline `import()` type; the file sits at exactly 500 effective lines (base 498) | `>500` engineering contract; readability | — | Normal formatting would give 501–502 lines | Line count; diff | Promote | Follow-up (size pressure) + non-blocking readability note | The measured count is 500, so the hard limit passes. The file was already at the limit, and the design itself noted its overload. The next change must split it, so this is recorded as follow-up FU-CR-1 rather than forcing a refactor of an existing owner here |
| C-05 | A deleted Task can be re-indexed when a tool call's 30 s wait re-syncs its earlier item snapshot after the delete | SCN-004 | Agent tool on first use + a user delete inside that window | The orphan row is removed by the Project's next search sync; the response is a snapshot of request time | `embedding-index.ts` L81–87 | Reject | — | Artificial timing; no lasting stale result (REQ-007 holds at the next search) |
| C-06 | Runner `stop()` during a worker restart after idle could leave a worker alive | DS-008 | Model switch inside the ≈0.3–1 s restart window | Memory only | `embedding-model-runner.ts` L70–76, L78–125 | Reject | — | Contrived timing |
| C-07 | A store open or write failure (unwritable app data) | — | Infrastructure failure | The search service catches index errors (`meaningSearch` → `unavailable`); a failed job write is retried on the next search | `project-task-search-service.ts` L76–87; `collection-indexing-job.ts` L111–116 | Reject | — | Outside scope by default; behavior is already contained |
| C-08 | LEAF-IR floor 0.24 was tuned on the 12 synthetic unrelated queries; the real on-topic minimum is 0.210 | AC-001/AC-004, QR-007 | — | Some real paraphrases may show no meaning match | `embedding-model-catalog.ts` L37–39; handoff RSK-004 | Hold for Evidence → **Promoted in round 3** | This ticket | A calibration value under design G2. Round 3: API-L04 confirmed it fails at 1,000 Tasks; `Design Impact` FO-001 (see the Failure-Origin section) |
| C-09 | `listTasks` builds full views on every search | QR-001 | — | Possible latency at 1,000 Tasks | RSK-008 / FU-4 | Hold for Evidence | — | Measure in AC-015 |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Search has its own service and composable. The existing owners got additive hooks only | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining; the catalog matches DEC-002 and the pins | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-008 map one-to-one onto files and methods | — |
| Ownership boundary preservation and clarity | Pass | `EmbeddingIndex` owns readiness, collections, query and relevance; `ProjectTaskSearchService` owns the Task policy; Task data stays with `ProjectTaskService` | — |
| Off-spine concern clarity | Pass | Setting, files, relevance, summary and packaging each sit with their owner | — |
| Existing capability/subsystem reuse | Pass | Reuses `node:sqlite`, server settings, the tool manifest and MCP adapter, Apollo, `searchByProjectId` and `withProjectErrors` | — |
| Reusable owned structures | Pass | One definition type, one readiness union, worker protocol types in the worker | — |
| Shared-structure/data-model tightness | Pass | The GraphQL result carries ids and match kinds only. The service result carries views (decision 2) so the tool needs no second read; this is justified | — |
| Repeated coordination ownership | Pass | Readiness and waiting are owned once (`EmbeddingIndex.search` `waitForReadyMs`) | — |
| Empty indirection | Pass | The resolvers and the manifest entry translate and project; they are not pass-throughs | — |
| Separation of concerns and file responsibility | Pass | The index is split along the design's job seam (`collection-indexing-job.ts`) | — |
| Ownership-driven dependency check | Pass | `embeddings/**` imports nothing from `projects/`, `api/` or `agent-tools/`; the worker imports only `node:*` and the two dependencies; no ESM cycle (search service → types only) | — |
| Authoritative Boundary Rule | Pass | Consumers use only `EmbeddingIndex`; the composition imports only `getEmbeddingIndex`/`shutdownEmbeddingIndex`; no caller reaches the store, runner or files | — |
| File placement | Pass | Matches the design's folder map | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | Explicit `projectId`/collection keys; tool `project_id`, `query`, `limit` | — |
| Naming quality | Pass | Clear domain names. Minor: the jammed line in `project-task-service.ts` L49 (C-04) | Optional |
| No unjustified duplication | Pass | Round 2: the duplicate worker output type was replaced by a type-only import (C-03) | — |
| Patch-on-patch complexity control | Pass | Initial implementation | — |
| Dead code removed in the touched files and modules | Pass | Round 2: `isSettledReadiness` removed (CR-002); no other unused exports in the delta | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Named by requirement; AC-013 second collection; switch; restart; late batch discarded | — |
| Test fixtures/helpers reusable, structure coherent | Pass | `fake-embedding-model.ts`, `projectTaskSearchServer.ts` | — |
| No stale, duplicated, or compatibility-only tests | Pass | Predicate-based board tests were updated, not kept | — |
| API/E2E readiness for the next workflow stage | Pass | Round 2: CR-001 is fixed and covered by a spec; the package is ready for API/E2E | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/embeddings/embedding-index.ts` | 0 | 243 | Pass | New file >220: reviewed; one owner, split along the design seam | Pass | Pass | OK | — |
| `src/embeddings/runtime/embedding-model-runner.ts` | 0 | 175 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/runtime/embedding-worker.ts` | 0 | 118 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/collection-indexing-job.ts` | 0 | 112 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/models/embedding-model-files.ts` | 0 | 106 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/store/embedding-vector-store.ts` | 0 | 98 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/catalog/*` (3 files) | 0 | 89 / 40 / 32 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/{relevance,embedding-readiness}.ts` | 0 | 12 / 10 | Pass | Pass | Pass | Pass | OK (CR-002 resolved) | — |
| `src/projects/search/project-task-search-service.ts` | 0 | 106 | Pass | Pass | Pass | Pass | OK | — |
| `src/projects/services/project-task-service.ts` | 498 | 500 | Pass (at the limit; C-04) | +2 | Pass | Pass | Follow-up FU-CR-1 | — |
| `src/projects/services/project-service.ts` | 251 | 257 | Pass | Pass | Pass | Pass | OK | — |
| `src/services/server-settings-service.ts` | 352 | 365 | Pass | Pass | Pass | Pass | OK | — |
| `src/agent-tools/project-tasks/{contract,manifest,native}` | 226 / 112 / 60 | 246 / 139 / 65 | Pass | Pass | Pass | Pass | OK | — |
| `src/api/graphql/types/{project-task-search,embeddings}.ts`, `schema.ts`, composition | — | 52 / 11 / 91 / 65 | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-web/composables/projects/useProjectTaskSearch.ts` | 0 | 108 | Pass | Pass | Pass | Pass | OK (CR-001 resolved) | — |
| `autobyteus-web/components/projects/ProjectTaskBoard.vue` | 97 | 120 | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-web/scripts/onnxruntime-web-packaging.mjs` | 0 | 67 | Pass | Pass | Pass | Pass | OK | — |
| `autobyteus-web/scripts/prepare-server.{mjs,sh}` | 487 / 312 | 491 / 314 | Pass | Pass | Pass | Pass | OK | — |
| `scripts/check_licensing.py` | 239 | 242 | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No client fallback predicate, no reading of old-model vectors, no version column |
| No legacy old-behavior retention in changed scope | Pass | `matchesSearch` and the predicate `matchingTasks`/`isNoMatch` are removed |
| Dead code removed in the touched files and modules | Pass | CR-002 resolved in round 2 |
| Approved persisted-data transition decision is followed | Pass | Discard or Rebuild: rename-aside + recreate (`embedding-vector-store.ts` L70–102); removals never create the file |
| No version-specific dual reads/writes or old-shape fallback | Pass | Rows are read by `model_id` only |
| Approved transition mechanics match the reviewed design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/embeddings/embedding-readiness.ts` L14–15 `isSettledReadiness` | UnusedHelper | No reference in `src/` or `tests/` (grep); not in the design's interface map | Core Principle 7: a new export that nothing reaches | **Removed in `722b9b3918`** |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new module and behavior; the docs are already updated in the change (`docs/modules/embeddings.md`, `projects.md`, `agent_tools_mcp_server.md`, `search.md`, `README.md`; web `docs/projects.md`).
- Files or areas likely affected: same. Delivery syncs any change caused by CR-001 (the locator wording in web `docs/projects.md`, if it is affected).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 (Project deleted during an in-flight batch) | Confirmed | `CollectionIndexingJob.cancel` bumps the generation; `run` checks generation and pending fingerprint before `upsert` (L108–110); unit test "discards a batch that finishes after…" |
| MP-002 (out-of-order responses) | Confirmed | `latest` sequence + `bindingRevision` check (`useProjectTaskSearch.ts` L46–56); web spec "keeps only the latest request" |

New premise: SCN-CR-1 (recorded in the scenario table above; Supported Explicit Edge, Reachable). Its trigger is the existing locate action, and its lifecycle state is the preparing phase that REQ-009 supports, lasting minutes. It is not a race.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average for trend only; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every spine is traceable from the board and tool down to the worker and store | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | `EmbeddingIndex` is the only boundary; product-agnostic layer; Task policy in one service; no bypass | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit identities; compact tool result; ids-only GraphQL result | — | — |
| 4 | Separation of Concerns and File Placement | 9.2 | Seams match the design; the packaging module is shared by both scripts | `project-task-service.ts` sits at the 500 limit (follow-up) | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | One definition, one readiness union; round 2 removed the duplicate worker output type | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear names and comments | Jammed field+JSDoc line in `project-task-service.ts` L49 | Optional |
| 7 | API/E2E Readiness | 9.3 | Strong unit and E2E coverage; gated real-model check; round 2 adds the locate-while-preparing spec | Real-backlog calibration still to be measured (C-08) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | Generation-checked writes, single-flight download, query priority, lazy startup, error containment. Round 2: readiness refreshes keep the answer settled, while a new query, Project or Task list, Retry and reload still unsettle it; superseded refreshes are dropped (`seq`/`latest`) | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut; no fallback | — | — |
| 10 | Cleanup Completeness | 9.3 | Predicate, docs statements and the dead export removed | — | — |

## Findings

Round 2: CR-001 and CR-002 are **Resolved**. No finding is open. The round-1 records below are kept for history.

### CR-001 — The "Show Task in Projects" locator stops working while meaning search is preparing (Local Fix, implementation) — Resolved (CRR-002)

- Protects: REQ-004 / AC-005 (the locator clears a search that hides its Task, on the right-panel board) and REQ-010 (the board never waits for meaning search). Scenario SCN-CR-1, candidate C-01.
- Evidence:
  - `autobyteus-web/composables/projects/useProjectTaskSearch.ts` L60–61: after a `PREPARING` answer, `pending.value = false` is followed by `schedule(PREPARING_POLL_MS)`. `schedule` (L39–43) sets `pending.value = true` again.
  - `settled` (L95) is therefore false for the whole preparing phase.
  - `ProjectTaskBoard.vue` L103–105 gates the locator on `search.settled`, and `taskLocatorStore` expires the request after 10 s (`TASK_LOCATE_EXPIRY_MS`).
  - During first use or after a model switch, preparing lasts tens of seconds to minutes (QR-003). In that window, locating a Task on a board that has a search text does nothing: no search clear, no Cancelled reveal, no highlight.
- Required action: a readiness poll for the same Project and query must not make the search unsettled. Keep "unsettled" for a new query or Project, the debounce, a task-list re-search, and the first request. For example, the poll could re-run without setting `pending`, or the poll timer could be tracked separately.
  - Add a web spec: a locate with an active search while the answer is `PREPARING` reveals the Task within the expiry.
  - Keep the existing locate and latest-wins specs green.

### CR-002 — Dead export `isSettledReadiness` (Local Fix, implementation) — Resolved (CRR-002)

- Protects: Core Principle 7 (no dead code in touched and new files).
- Evidence: `autobyteus-server-ts/src/embeddings/embedding-readiness.ts` L14–15; no reference anywhere in `src/` or `tests/`.
- Required action: remove it.

Non-blocking notes (no action required):

- C-03: applied in round 2.
- C-04: `project-task-service.ts` L49 joins the JSDoc and the `searchCleanup` field on one line with an inline `import()` type, keeping the count at 500 (see FU-CR-1).

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-CR-1 | `autobyteus-server-ts/src/projects/services/project-task-service.ts` is at exactly 500 effective non-empty lines, the hard limit. It was already 498 at base `55bff1f5ee`, and the design spec already called it overloaded ("505 lines"). This ticket kept it at 500 by joining a field and its comment on one line | Line counts before/after; `design-spec.md` § Task Design Health Assessment | This ticket adds only a 2-line delete hook, which it needs. Splitting an existing owner is not needed for this ticket's behavior; the size pressure predates it | "Split `ProjectTaskService` along its existing concerns (e.g. Task reads/views vs. create/update/delete commands vs. assignment/execution-resource queries) so it is comfortably under 500 lines; restore normal formatting of the `searchCleanup` dependency field. No behavior change." |

- Sent to: `/project_task_manager` (the requirements doc's "Requested by"), in one follow-up message after this review. It is recorded as Task `autobyteus-147` (TODO, depends on autobyteus-71). The implementation handoff's FU-1…FU-6 are the implementer's and designer's follow-ups and are not re-sent here.

## Classification

- Round 5: N/A — `Pass` (merge resolutions).
- Round 4: N/A — `Pass`. FO-001 is resolved by SR-007 and IR-003.
- Round 3: `Design Impact` (FO-001): the default model's relevance calibration (design G2) does not hold at the supported 1,000-Task scale, with a related requirement question on the scale AC-001/AC-004 must hold at. Earlier rounds: round 2 `Pass`; round 1 `Local Fix` for CR-001/CR-002, both resolved.

## Recommended Recipient

- Round 5: `/software_engineering_team/api_e2e_engineer` (primary pass handoff: rerun on the merged state, as delivery expects); `/software_engineering_team/implementation_engineer` (informational)
- Round 4: `/software_engineering_team/api_e2e_engineer` (primary pass handoff); `/software_engineering_team/implementation_engineer` (informational)
- Round 3: `/software_engineering_team/solution_designer` (`Design Impact`, FO-001)
- Routing note: after the design revision (and any user decision on DEC-002 or the AC scale), the work returns through implementation (catalog/rule change), source review and API/E2E (rerun API-L04 and API-R06).

## Residual Risks

- RSK-004 / C-08: LEAF-IR floor 0.24 was tuned on 12 synthetic unrelated queries. Real paraphrases whose best score is in 0.21–0.24 show no meaning match. API/E2E should measure AC-001/AC-004 on a realistic synthetic backlog (AC-015).
- RSK-008 / C-09: `listTasks` cost per search at 1,000 Tasks (QR-001), to measure.
- RSK-002: downloads ignore HTTP proxies. RSK-005/RSK-009: WASM memory; EmbeddingGemma 2 peaks around 1.5 GB.
- Packaging: the Windows path (`prepare-server.mjs`) was not run locally. Docker keeps the unpruned `onnxruntime-web` (FU-5); a Docker smoke embed is advisable (AC-014).
- AC-007 companion change reviewed: the tool is selected and the skill guidance matches REQ-006 (`autobyteus-agents` @ `344da76`, not pushed).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 5, targeted delta of the DR-001 merge resolutions, IR-004)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10; every category ≥ 9.0 (unchanged)
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes for API/E2E:
  - rerun on the merged state `600d079b9c`, with priority on the Project tool surface (seven tools; native and MCP) and the Task and Project delete paths, where the search cleanup and the base's adoption revert now run together;
  - embedding, web and packaging code is unchanged since API-REV-002, so earlier quality and cost evidence carries over except where the base changes affect it.
