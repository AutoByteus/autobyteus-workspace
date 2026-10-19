# Code Review Report

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review` (round 3). Round 2 (`CRR-002`, Pass) is the latest implementation-review result; its sections below are carried forward.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-005; DEC-001…DEC-011; REQ-010, AC-014 added for CR-002)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (as indexed by the design)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-005; DS-001…DS-006, G1–G7, AR-001…AR-004, R-1…R-7)
- Supplemental Task Artifacts Reviewed As Context: the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (behavior-defining; § Implementation Fidelity Boundary, journeys UXJ-*, transitions TR-*, state table)
- Relevant Solution Revision IDs: SR-004, SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-002)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Current Review Round: 3 (failure-origin; Review Scope `N/A`)
- Review Scope: `Targeted Delta Review` (round 1: `Full Review`)
- Review Scope Evidence: the delta `e48806b035..d2bcb95d3a` touches 8 files, all within the prior findings:
  - removals in `embedding-index.ts` and `embedding-model-downloads.ts` (CR-001), with their tests;
  - one line in `embedding-model-files.ts` (the optional C-06 note);
  - an extended web spec case and two docs (CR-002 → DEC-011).

  No spine, interface used by a caller, or data shape changed, so round-1 evidence for unaffected checks is carried forward.
- Trigger: implementation engineer handoff for IR-002 (after the Solution Designer's SR-005 / DEC-011 and ARCH-REV-003 Pass)
- Prior Review Round Reviewed: round 2 (`CRR-002`, Pass)
- Latest Authoritative Round: 3
- Failure-origin context (round 3):
  - trigger: API-REV-001 (`/software_engineering_team/api_e2e_engineer`), F-001 / case API-L02, QR-001 on a Docker node (the round-1 hold C-07);
  - validated code: `d2bcb95d3a`; API/E2E commits `c02a54bc3e` (test) and `671a1e596b` (reports);
  - reports: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`;
  - evidence: `evidence/api-e2e/API-L02-01-qr001-status-timing.txt`, `API-L02-03-status-breakdown.txt`, `probes/API-PROBE-status-timing.mjs`, `probes/API-PROBE-status-breakdown.mjs`, `API-R04-qr001-host-load.log`;
  - testing guideline: the worktree `TESTING.md`.
- Code reviewed (round 2): `e48806b035..d2bcb95d3a`; IR-002 handoff and evidence `8cbbf9afe8`
- Code reviewed (round 1): worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings`, branch `codex/search-model-settings`, `8d40ba3b6c..e48806b035` (server `9c73c22672`, web `8469d4bcf5`, E2E `56cb7be36a`, ticket `e48806b035`)
- Coverage / API/E2E / delivery artifacts: N/A (implementation review)

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The change extends the existing owners named in the design (`EmbeddingIndex`, `EmbeddingModelFiles`, `ProjectTaskSearchService`, two GraphQL type files and one web sub-section) and adds the one internal owner the design named, `EmbeddingModelDownloads`. No design escalation trigger fired: QR-001 measured 626 ms against 1 s, cancel leaves no partial files, and polling was sufficient.

## Review Scope

- Changed implementation and behavior reviewed: all server source under `src/embeddings/`, `src/projects/search/`, the composition and both GraphQL type files; all web source (page wiring, `ServerSettingsManager`, the four components, `embeddingPresentation.ts`, the composable, GraphQL documents, types and the en/zh-CN catalogs); the docs.
- Tests reviewed proportionately: the new unit tests (downloads, model management with the G3 spies, files), the changed index and search tests, the GraphQL E2E test, the gated QR-001 load test, the web panel spec and the browser probe script.
- Checks: the implementer's Checks Run (IMP-01…IMP-08) were recorded on the code under review. None was rerun (skill rule: no rerun to confirm).
- Explicit exclusions: the Docker node run (AC-008) and the desktop run, which are downstream; the probe's screenshots, which were compared by the implementer and are owned by API/E2E for the visual sign-off.

## API/E2E Failure-Origin Review (Round 3, CRR-003)

### The failing scenario represents approved behavior

- QR-001: "The section's status loads within 1 s, up to 20 Projects with 1,000 Tasks each". QR-004: "Same behavior on desktop and Docker nodes". REQ-008 / AC-008: a Docker node works from a browser.
- So opening Embedding on a Docker node with a large backlog is a supported scenario (SCN-001/SCN-003). API-L02 used the panel's real status document over GraphQL and real page opens on a test-owned container built from `d2bcb95d3a`, with no bind mount (data in the container's overlay file system), and 24 Projects / 20,039 Tasks seeded through GraphQL.
- This is not an invalid or stale test. One part of the environment needs care, though: the host was under heavy load while measuring (load averages 9.7 / 17.6 / 44.0 on 10 CPUs). The minimums are still well above 1 s: `projectTaskIndexes` 1,588 ms and the panel document 1,614 ms. The miss is therefore credible, but its true size on an unloaded node is not yet known.

### Origin analysis

- **Where the time goes:**
  - `embeddingModelsStatus` takes 4 ms; the embedding layer is not the cost.
  - `projectTaskIndexes` takes a 1,797 ms median: `ProjectTaskSearchService.indexStatus()` → `listProjects` → `listTasks` for every Project (reading about 20,000 `task.json` files and building views) → `collectionStatus` (fingerprints only).
  - The **existing** `projects` list query on the same node takes 1,805 ms (minimum 1,519). The Project store's whole-backlog file read already costs that much there, independent of this ticket.
- **The code does what was reviewed:** DS-001 specifies `indexStatus() → listProjects + listTasks → collectionStatus` on every read, and RSK-001 anticipated this cost.
  - On the host disk, the same path passes (626 ms; API-R04).
  - Source review recorded the margin as `Hold for Evidence` (C-07) for exactly this measurement. It was not detectable as a code defect.
- **Origin: the design basis.** The design reads every Task of every Project on every status read (polled every 2 s while work runs, 10 s otherwise) and relies on the Project store being fast enough. On a Docker node at the full QR-001 size, it isn't. The remedy needs a design decision, and the evidence shows two possible owners:
  - **In this ticket's functionality:** a cheaper read of Task state for the status. For example, Task fingerprints cached per Project in the search service and invalidated by the existing change marks or delete hooks. This is the deferred "fingerprint cache" in the IR-001 handoff.
  - **A prerequisite in other functionality** (prerequisite test in `references/ticket-scope.md`: it blocks QR-001, and it belongs to the Project store, whose existing `projects` list is equally slow): make the Project store's whole-backlog read cheaper. That would also speed up the Projects list.
- **A requirement question:** must QR-001 hold at the full 20 × 1,000 size on Docker nodes (QR-004 suggests yes), and on which reference hardware or load?
- **Classification:** `Design Impact`, with a possible prerequisite and a requirement question, all for the Solution Designer.
  - Not an implementation defect: the code follows DS-001.
  - Not a test, fixture or environment problem: the scenario and setup are valid. The host load inflates the numbers, but even the best cases miss the target.
  - Not an earlier review gap: the risk was held (C-07) for runtime measurement.
- **Recommendation for the evidence basis:** before choosing, have API/E2E re-measure API-L02 on an unloaded host (load average near idle), so the decision rests on the true margin. If it still misses, measure the `projects` list too: that decides whether a store-level prerequisite is warranted.

### Candidate gate updates (round 3)

| Candidate ID | Observation | Disposition | Scope | Reason |
| --- | --- | --- | --- | --- |
| C-07 | QR-001 is missed on a Docker node: 2,017 ms median, minimum 1,588 ms, at 20 × 1,000 | Promote (was Hold for Evidence) → FO-001 | This ticket (Design Impact), or a prerequisite, as decided upstream | See the origin analysis |
| O-1 (API/E2E) | An empty model folder stays after a failed download | Reject (as a finding) | — | Not a partial file (REQ-002 holds); "On disk" counts files only. Cosmetic; can join the rework |
| O-2 (API/E2E) | While the node is unreachable, the row whose action failed keeps its buttons disabled until a read succeeds (`act()` awaits `refresh()`, which waits for the node) | Note | — | The approved alert line shows (AC-014). The rework may release `working` after the mutation instead of after the follow-up read; the Solution Designer decides whether to include it |
| O-3 (API/E2E) | Settings reads `section`/`mode` only on mount | Reject | — | Base behavior for every mode; outside this entry point |
| O-4 (API/E2E) | The unreachable-node alert text is the browser's "Failed to fetch" | Reject (as a finding) | — | REQ-010 says "the server's message"; with no server reachable, the transport message is what exists. The Solution Designer may want friendlier copy |

The durable test change API-D01 (`projects-graphql.e2e.test.ts`, commit `c02a54bc3e`) is not reviewed in this failure-origin round. It is listed for the next proportional test review.

The full scorecard is not repeated (round 2: 9.4/10); no implementation category changes.

## Round 2 (CRR-002): targeted delta review of IR-002

| Prior finding | Resolution | Verification |
| --- | --- | --- |
| CR-001 (dead code) | **Resolved** | `modelStatus()`, `EmbeddingModelState`, `EmbeddingModelStatus` and `isRunning()` are removed. `grep` finds no reference in `src/embeddings`, `tests/unit/embeddings`, `docs/modules/embeddings.md` or the web. The two index tests assert through `modelsStatus().…activeDisplay`; the downloads test asserts through `progress()`. The assertions keep their meaning (switch → Active READY on model B; embed failure → UNAVAILABLE with the reason) |
| CR-002 (undefined action-error state) | **Resolved upstream** as DEC-011, REQ-010 and AC-014 (SR-005, Solution Designer within the direction; ARCH-REV-003 Pass) | The code is unchanged and matches REQ-010: one red `role="alert"` line above the cards with the server's message, cleared by the next action. The approved surfaces (Download failed, Unavailable, load error) are untouched. The web spec now also asserts `role="alert"`, an unreachable-node failure, and clearing by the next action (AC-014). `docs/settings.md` states the rule |
| C-06 (optional note) | Applied | `EmbeddingModelFiles.download` calls `cancel()` right after adding the listener when the signal is already aborted, so the fetch is aborted at once and the `.part` path is cleaned as before |

- Checks: IMP-09 (typecheck), IMP-10 (server unit suite on `d2bcb95d3a`: 6,060 passed, 1 failed), IMP-11 (GraphQL E2E, 9) and IMP-12 (web settings tests, 44 files / 253) cover the changed code, so none was rerun. IMP-13 (dead-code grep) matches my own grep.
- The one IMP-10 failure is outside this change. In `tests/unit/agent-execution/native-compaction-terminal-drain.test.ts`, the assertion `expected [ 'failed', 'started', 'stopped' ] to deeply equal [ 'started', 'stopped' ]` failed under full-suite load. `git diff 8d40ba3b6c..d2bcb95d3a -- src/agent-execution` is empty, and the test passed 5/5 in isolation (IMP-10b). The same test failed intermittently in autobyteus-71 (its C-14). Recorded as follow-up FU-CR-1.
- The web source is unchanged in round 2, so the full web suite, guards and probe from round 1 still apply.

### Score update (round 2)

- Cleanup Completeness 8.4 → 9.4: dead code removed.
- API/E2E Readiness 8.6 → 9.3: no undecided state; AC-014 is covered.
- Runtime Correctness 9.0 → 9.3: the implementation is now aligned with the approved basis (REQ-010), and the early-cancel window is closed.
- Other categories unchanged. Overall 9.4/10; every category ≥ 9.0.

## Upstream Behavior And Production-Path Basis Confirmation (round 1)

- Approved requirements basis understood: Yes. The ticket adds a Server Settings → Embedding sub-section. Users can see the catalog models, download a model ahead with Cancel, remove a model, choose the active model, and see each Project's index state with Index now, Rebuild and Index all. Status reads never start work. Downloaded files are kept until the user removes them.
- Design-spec behavior map verified against the implementation: Yes.
- Design review report and round confirmed: ARCH-REV-002, Pass.
- Behavior-basis status: `Confirmed`, except for one state the approved UI spec does not define (CR-002, below).

| Behavior ID | Status | Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `useEmbeddingModel` → `ServerSettingsService.updateSetting` (validated, `config.set`) → `prepareActiveModel()`. `modelsStatus()` resolves the setting on every read (REQ-009) | — |
| BEH-002 | Confirmed | First-search preparation is unchanged (`syncCollection` → `prepareModel`, now through the shared `downloads.ensure`) | — |
| BEH-003 | Confirmed | `downloadModel` → `EmbeddingModelDownloads.start` → `files.ensure(def, progress, signal)`. Cancel aborts; the folder is deleted; the state returns to `notDownloaded` | — |
| BEH-004 | Confirmed | `removeOtherModelsVectors` deletes vectors only; `removeAllExcept` is removed; `removeModel` is refused for the active model and while downloading | — |
| BEH-005 | Confirmed | `indexStatus` → `collectionStatus` (in-memory job only if it belongs to the active model, else `readFingerprints`); `indexProject` / `rebuildProject` / `indexAllProjects` through `sync` / `dropCollection` | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal | Entry | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001…SCN-004 | REQ-001…REQ-009 | User | User | As in the requirements | Settings → Server Settings → Embedding | Normal | DS-001…DS-006 | As in the requirements | Requirements, UI/UX spec | Supported Normal Scenario | Use |
| SCN-CR-1 | REQ-002, REQ-004, REQ-006; spec "errors use `role=alert`" | User / Operational | User | Learn that an action they pressed didn't take effect | Any action button. The request fails because the node connection drops (a supported node binding, `waitForBoundBackendReady`) or the server refuses a race, e.g. Cancel pressed as the download finishes → `EMBEDDING_DOWNLOAD_NOT_CANCELLABLE` | Explicit Edge | `act()` → mutate throws or returns errors → `actionError` → red alert line | The user sees why nothing happened (without it, the failure is silent) | Code `useEmbeddingSettings.ts` L106–118, `EmbeddingSettingsPanel.vue` L27; the spec has no surface for it | Supported Explicit Edge Scenario | Use (gap) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract | Independent Trigger | Forward Path / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `EmbeddingIndex.modelStatus()` and its types `EmbeddingModelStatus` / `EmbeddingModelState` have no production caller. They were kept in autobyteus-71 for the future model UI (FU-1), which this ticket builds on `modelsStatus()` instead | Core Principle 7 (dead code in touched files) | — | Only `embedding-index.test.ts` (L111, L135) calls it | `grep` over `src`/`tests`/web | Promote | This ticket | CR-001: remove them and assert those two tests through `modelsStatus()` (`activeDisplay`) |
| C-02 | `EmbeddingModelDownloads.isRunning()` (new) has no production caller | Core Principle 7 | — | Only its own test (`embedding-model-downloads.test.ts` L44, L48) calls it | `grep` | Promote | This ticket | CR-001: remove it; the test can assert through `fileState()` / `progress()` |
| C-03 | Decision 2: the action-error alert line (`embedding-action-error`) is a visible state the approved, normative UI spec does not define. The spec's Implementation Fidelity Boundary doesn't list it as a permitted variation | SCN-CR-1; UI/UX spec (normative); Review Authority ("new behavior … is a `Requirement Gap`") | User presses an action and the request fails | Without a surface, a failed action is silent; with it, the user sees the server's message | Handoff decision 2; spec §§ States, Implementation Fidelity Boundary; the precedent DEC-009 (a gap the approved design left, decided by the Solution Designer) | Promote | Requirement Gap | CR-002: the Solution Designer decides the missing state, as for DEC-009. Recommendation: approve it as built, since it uses only the spec's existing error treatment (red text, `role="alert"`, server-provided reason) and adds no new component |
| C-04 | Decision 1: copy in a new `embeddingSettings.ts` per locale instead of `settings.ts`; language labels keyed by catalog language code; "Hugging Face" as a key | Design G6 (< 500 lines); spec F-1 (the label is a UI mapping of catalog values) | — | `settings.ts` at 428 lines plus about 70 keys would pass 500. Keys and copy equal the spec's | Catalogs; `memorySyncSettings.ts` precedent | Reject (as a finding) | — | A placement within the design's intent; keys match the spec |
| C-05 | Decision 3: a late-joining listener replays received bytes | DS-003 / R-9 (use while downloading ahead) | A user uses a model that is downloading ahead | Without it, the Active row shows 0 bytes until the next chunk | `embedding-model-downloads.ts` L49–54; the model-management test | Reject (as a finding) | — | A correct fix; it replays only when `done > 0`, so verify-only stays `loading` |
| C-06 | A cancel that lands between `ensureFiles`' abort check and `download()`'s `addEventListener` is not seen by that file's fetch (a listener added to an already-aborted signal never fires). The file downloads in full, then the pre-rename check rejects it and the `.part` is deleted | DS-002; REQ-002 (no partial files) | Cancel within a few milliseconds after a file boundary | No partial file is kept, so REQ-002 holds; only bandwidth and time are wasted | `embedding-model-files.ts` L90–93, L113–115, L146 | Reject | — | Artificial timing; the guarantee holds. Non-blocking note: checking `signal.aborted` right after adding the listener would close the window |
| C-07 | QR-001 margin: 626 ms median at 20 × 1,000, dominated by `listTasks` reading 20,000 `task.json` files | QR-001, RSK-001 | — | A slow disk may pass 1 s | IMP-04 | Hold for Evidence | — | API/E2E measures on target environments (Docker) |
| C-08 | `indexStatus` fails as a whole if a Project is deleted between `listProjects` and its `listTasks` | REQ-005 | A delete inside one status read | That poll fails; the panel keeps the last status and retries (decision 7) | Code | Reject | — | Artificial timing; it is already contained by the polling policy |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is preserved | Pass | Downloads were extracted into `EmbeddingModelDownloads` as designed; the index stays the only public boundary | — |
| Implementation matches the approved behavior-defining supplement | Fail | It matches except for the undefined action-error state (CR-002). Copy, states, transitions, focus and the single filled button match the spec, and the probe screenshots were compared with VIS-001…VIS-021 | Solution Designer decision (CR-002) |
| Data-flow spine inventory | Pass | DS-001…DS-006 map one-to-one onto resolvers, index and service methods, and the composable | — |
| Ownership boundary preservation | Pass | Flights live only in `EmbeddingModelDownloads`; files only in `EmbeddingModelFiles`; index-all policy in the search service; polling in the composable | — |
| Off-spine concern clarity | Pass | MB formatting, percent and the language mapping are in `embeddingPresentation.ts`; disk usage is in the files owner | — |
| Existing capability reuse | Pass | Settings write through `ServerSettingsService`; the polling pattern of `useProjectTaskSearch`; the existing `RetryEmbeddingModel` document; the `memorySyncSettings` catalog pattern | — |
| Reusable owned structures | Pass | `fingerprintOf` / `statusFromFingerprints` are shared by the job and the read-only path | — |
| Shared-structure tightness | Pass | One status shape per subject (`EmbeddingModelsStatus`, `ProjectTaskIndex`); `activeDisplay` only on the active model | — |
| Repeated coordination ownership | Pass | One flight per model across download-ahead and preparation | — |
| Empty indirection | Pass | — | — |
| Separation of concerns and file responsibility | Pass | — | — |
| Ownership-driven dependency check | Pass | `embeddings/**` imports neither `projects/**` nor `services/**`; resolvers depend on the index or the search service only; the composition passes `listProjects` | — |
| Authoritative Boundary Rule | Pass | No caller reaches `EmbeddingModelFiles`, `EmbeddingModelDownloads` or the store directly | — |
| File placement | Pass | `models/embedding-model-downloads.ts`, `components/settings/embedding/*`, `composables/settings/` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | Catalog-id and projectId identities; refusals carry `extensions.code` | — |
| Naming quality | Pass | `Embedding*` names per G1; `removeOtherModelsVectors` states its narrowed job | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files and modules | Fail | `modelStatus()` + 2 types; `isRunning()` (CR-001) | Remove |
| Test scenarios and assertions are clear and requirement-aligned | Pass | G3 spy test; AC-011/012/013; refusals; kept files after a switch; web states | — |
| Test fixtures/helpers reusable and coherent | Pass | `fake-embedding-model.ts` grows a files fake with per-model presence and held downloads | — |
| No stale, duplicated or compatibility-only tests | Pass | `removeAllExcept` tests replaced | — |
| API/E2E readiness | Fail | Blocked by CR-002 (an undecided visible state) and CR-001 (small cleanup) | After the decision and the fix |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `src/embeddings/embedding-index.ts` | 248 | 346 | Pass (design target < 400) | +98 | Pass | Pass | Dead `modelStatus()` (CR-001) | Remove |
| `src/embeddings/models/embedding-model-downloads.ts` | 0 | 117 | Pass | Pass | Pass | Pass | Dead `isRunning()` (CR-001) | Remove |
| `src/embeddings/models/embedding-model-files.ts` | 120 | 142 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/collection-indexing-job.ts` | 112 | 138 | Pass | Pass | Pass | Pass | OK | — |
| `src/embeddings/{embedding-readiness,embedding-model-error}.ts`, store, catalog | — | 32 / 12 / 104 / 96 | Pass | Pass | Pass | Pass | OK | — |
| `src/projects/search/project-task-search-service.ts` | 106 | 135 | Pass | Pass | Pass | Pass | OK | — |
| `src/api/graphql/types/{embeddings,project-task-search}.ts` | 11 / 52 | 122 / 104 | Pass | Pass | Pass | Pass | OK | — |
| Composition | 65 | 69 | Pass | Pass | Pass | Pass | OK | — |
| Web components (`EmbeddingModelCard` 141, `ProjectIndexesCard` 157, panel 62, dialog 61) and the composable (138) | 0 | as listed | Pass | Pass | Pass | Pass | Action-error line (CR-002) | Decision |
| `pages/settings.vue`, `ServerSettingsManager.vue`, `localization/*/settings.ts` | 407 / 316 / 427 | 416 / 319 / 428 | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | — |
| No legacy old-behavior retention | Pass | `removeAllExcept` and its call are removed |
| Dead code removed in touched files | Fail | CR-001 |
| Approved persisted-data transition decision followed | Pass | `Directly Usable — No Migration`: kept folders are read as is; `embeddings.sqlite` is unchanged (new fingerprint-only read) |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why | Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/embeddings/embedding-index.ts` `modelStatus()` (L129) and the types `EmbeddingModelState` / `EmbeddingModelStatus` (L35–36) | DeadCode | No caller in `src` or web; only `tests/unit/embeddings/embedding-index.test.ts` L111, L135. Its intended consumer (FU-1) is this ticket, which uses `modelsStatus()` | Core Principle 7 (touched file) | Remove; move those two assertions to `modelsStatus()` (`activeDisplay`) |
| `autobyteus-server-ts/src/embeddings/models/embedding-model-downloads.ts` `isRunning()` (L79) | UnusedHelper | No production caller; only `embedding-model-downloads.test.ts` L44, L48 | Core Principle 7 (code only its own tests call) | Remove; assert through `fileState()` / `progress()` |

## Docs-Impact Verdict

- Docs impact: `Yes`. They are already updated: server `docs/modules/embeddings.md` (model management, kept downloads); web `docs/settings.md` and `docs/projects.md`. A decision on CR-002 may need one line in `docs/settings.md` if the alert line stays.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

None recorded as premises in ARCH-REV-002 beyond the findings AR-001…AR-004, all confirmed in the code:
- AR-001: the display state is derived;
- AR-002: Active · Not downloaded with Download;
- AR-003: Retry prepares;
- AR-004: two root fields fetched in one document.

New: SCN-CR-1 (above). The rejected premises are C-06 and C-08.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.1
- Overall score (`/100`): 91

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | DS-001…DS-006 are traceable end to end | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One owner of flights; the index is the only boundary; the read-only status is separated from scheduling | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit identities; coded refusals; two root fields in one document | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | The localization split respects the 500-line limit | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.2 | Shared fingerprint helpers; one status shape per subject | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | Clear names and comments | — | — |
| 7 | API/E2E Readiness | 8.6 | Thorough unit, E2E and probe coverage | An undecided visible state (CR-002) | Solution Designer decision |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.0 | Cancel guarantees, single flight, the late-listener fix and the G3 read-only proof are correct | A deviation from the normative spec until decided (CR-002) | Decision |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | `removeAllExcept` is removed cleanly | — | — |
| 10 | Cleanup Completeness | 8.4 | — | Dead `modelStatus()` + types and `isRunning()` (CR-001) | Remove |

## Findings

### CR-001 — Dead code in the touched embedding files (Local Fix, implementation)

- Protects: Core Principle 7 (no dead code in the files and modules a change touches).
- Evidence:
  - `embedding-index.ts`: `modelStatus()` (L129) and its types (L35–36) are called only by `embedding-index.test.ts` L111 and L135. Its intended consumer, the model UI, now uses `modelsStatus()`.
  - `embedding-model-downloads.ts`: `isRunning()` (L79) is called only by its own test.
- Required action: remove all three. Move the two `embedding-index.test.ts` assertions to `modelsStatus()`'s `activeDisplay` (`READY`; `UNAVAILABLE` with the reason). Assert the downloads test through `fileState()` or `progress()`.

### CR-002 — The action-error line is a visible state the approved UI spec does not define (Requirement Gap → Solution Designer)

- Protects: the normative UI/UX spec (REQ-001…REQ-006 "Layout and copy as in the approved UI/UX spec"; § Implementation Fidelity Boundary) and the Review Authority rule that new visible behavior is a `Requirement Gap`.
- Evidence:
  - `EmbeddingSettingsPanel.vue` L27 shows `actionError` in a red `role="alert"` line above the cards, set by `useEmbeddingSettings.ts` `act()` (L106–118) when a mutation fails or is refused.
  - The spec's error surfaces are the load error (VIS-016), Download failed (VIS-003) and Unavailable (VIS-011). None covers a failed or refused action request, and the fidelity boundary does not list this as a permitted variation. The implementer flagged it (handoff decision 2).
- Why it needs a decision rather than a local fix: the state is reachable and needs a surface (SCN-CR-1). Removing the line would make failed actions silent; keeping it adds unapproved visible behavior. This is the same kind of gap as DEC-009, which the Solution Designer decided.
- Recommendation: approve it as built, as a new DEC entry. It reuses the spec's own error treatment (red text, `role="alert"`, server-provided message), adds no new component, and is cleared by the next action. Record the copy rule ("the server's message") and whether `docs/settings.md` mentions it.

Non-blocking note: C-06, the abort-listener window in `EmbeddingModelFiles.download`. The no-partial-file guarantee holds; adding `if (signal?.aborted) cancel()` after `addEventListener` would avoid downloading a whole file after a well-timed Cancel.

## Follow-ups

| Follow-up ID | What | Evidence | Why outside | Suggested Task |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

- Round 1: `None`.
- Round 2: FU-CR-1 sent to `/project_task_manager` (the requirements doc's "Requested by"). It is recorded as Part 4 of the existing Task `autobyteus-103` (load-sensitive tests; TODO, flagged as a possible product race in native compaction shutdown):

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-CR-1 | `autobyteus-server-ts/tests/unit/agent-execution/native-compaction-terminal-drain.test.ts` ("drains stopped through the real dispatch queue before returning…") fails intermittently under full-suite load: the observed compaction phases include an extra `'failed'` before `'started'`/`'stopped'` (L19) | This ticket's IMP-10 log (`evidence/implementation/IMP-10-ir002-server-unit-suite.log`, the FAIL block); 5/5 isolated passes (IMP-10b); the same intermittent failure in autobyteus-71 IR-004 (its C-14), on different base commits | This ticket changes nothing in `agent-execution` (empty diff), and everything it delivers works without the fix | "Investigate the intermittent failure of `native-compaction-terminal-drain.test.ts` under full server unit-suite load (an extra `failed` compaction phase). Decide whether it is a product race in native compaction shutdown or test timing, and fix the owner so the full suite is reliably green." |

## Classification

- Round 3: `Design Impact` (FO-001), with a possible prerequisite (Project store read cost) and a requirement question (the QR-001 scope on Docker nodes).
- Round 2: N/A — `Pass` (CR-001 resolved; CR-002 resolved upstream as DEC-011).
- Round 1: `Requirement Gap` (CR-002) and `Local Fix` (CR-001).

## Recommended Recipient

- Round 3: `/software_engineering_team/solution_designer` (`Design Impact` FO-001).
- Round 2: `/software_engineering_team/api_e2e_engineer` (primary pass handoff); `/software_engineering_team/implementation_engineer` (informational).
- Round 1: `/software_engineering_team/solution_designer`.

## Residual Risks

- C-07 / RSK-001: the QR-001 margin at 20 × 1,000 Tasks (626 ms median on an M1 Max; Project store reads dominate). Measure on Docker and slower hardware.
- AC-008 (Docker node) and the desktop run are not executed yet.
- EmbeddingGemma 2 (346 MB) was not downloaded in the probe; the same code path was exercised with LEAF-IR.
- RSK-003: proxies (`autobyteus-168`).

## Latest Authoritative Result

- Review Decision: `Fail` (failure-origin review of API-REV-001)
- Review Entry Point: `API/E2E Failure-Origin Review` (round 3)
- Supported Product Scenario Gate: `Pass` (QR-001 with QR-004 / REQ-008 on a Docker node)
- Material-Premise Gate: `Pass`
- Score Summary: no new scorecard for a failure-origin round (round 2: 9.4/10, unchanged)
- Failure Origin: `Design Impact`, FO-001. The status design reads every Task of every Project per read (DS-001). That misses QR-001 on a Docker node at 20 × 1,000 Tasks (median 2,017 ms, minimum 1,588 ms). The cost is the Project store's file reads; the existing `projects` list is equally slow there. It is not an implementation defect, not a test problem, and not a review gap (it was held as C-07)
- Recommended Recipient: `/software_engineering_team/solution_designer`
- Notes for the Solution Designer:
  - choose the remedy owner: this ticket (a status fingerprint cache), or a prerequisite (Project store read cost);
  - settle the QR-001 scope on Docker;
  - consider having API/E2E re-measure on an unloaded host first, since the measurement ran under a host load average of 9.7 to 44;
  - API/E2E's O-1, O-2 and O-4 can optionally join the rework.
