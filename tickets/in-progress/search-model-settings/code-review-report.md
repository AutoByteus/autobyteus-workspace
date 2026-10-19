# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review` (round 4: IR-003, the SR-007 rework of FO-001). Round 3 was the failure-origin review (`CRR-003`). Round-1/2 sections below are carried forward except where the Round 4 section notes a change.
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
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: 4
- Review Scope (round 4): `Full Re-Audit`. The delta `671a1e596b..70bb03632c` adds a new spine (index after Task writes, REQ-011), changes a boundary interface (`collectionStatus(collection, fingerprints)`, plus `fingerprintItems`, `fingerprintsAreCurrent` and `activeModelOnDisk`), and rewires the Task service's change marks, so the structural checks and the full scorecard were rerun. Also reviewed: the web O-2/O-4 changes and probe case `1b24f59009`.
- Review Scope: `Targeted Delta Review` (round 1: `Full Review`)
- Review Scope Evidence: the delta `e48806b035..d2bcb95d3a` touches 8 files, all within the prior findings:
  - removals in `embedding-index.ts` and `embedding-model-downloads.ts` (CR-001), with their tests;
  - one line in `embedding-model-files.ts` (the optional C-06 note);
  - an extended web spec case and two docs (CR-002 → DEC-011).

  No spine, interface used by a caller, or data shape changed, so round-1 evidence for unaffected checks is carried forward.
- Trigger: implementation engineer handoff for IR-002 (after the Solution Designer's SR-005 / DEC-011 and ARCH-REV-003 Pass)
- Prior Review Round Reviewed: round 3 (`CRR-003`, Fail — Design Impact)
- Latest Authoritative Round: 4
- Basis (round 4): requirements SR-007 (REQ-011, AC-015, QR-001 as DEC-012, DEC-013, DEC-014); design SR-007 (AR-005 inputs-not-results rule, MP-005…MP-007, R-12…R-15); ARCH-REV-005 Pass; handoff § IR-003
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

## Implementation Review Round 4 (CRR-004): IR-003, the SR-007 rework

### Behavior basis

- Confirmed against SR-007:
  - **FO-001 resolution (DEC-012):** the search service caches per-Project fingerprint inputs (`Map<projectId, ItemFingerprints>` plus `dirty`). The status is computed fresh on every poll through `collectionStatus(collection, fingerprints)`, following AR-005's inputs-not-results rule.
  - **REQ-011 / DEC-014:** Task writes schedule a debounced background `indexProject` per Project, gated by `activeModelOnDisk()` at schedule time and again at run time (R-14).
  - **O-1:** `removeIfEmpty` after a failed download.
  - **O-2:** `act()` settles after the mutation answers.
  - **O-4 / DEC-013:** "Couldn’t reach the server." for a failure with no server message.
- Status: `Confirmed`, except for CR-003 (an implementation deviation, not a basis gap).

### Structural re-audit (round 4 delta)

| Check | Result | Evidence |
| --- | --- | --- |
| Spine / ownership | Pass | The write trigger lives in `ProjectTaskSearchService` (Task search policy owner). The fan-out lives in the composition, the one binding place. The index stays the only embedding boundary; `ItemFingerprints` is opaque (decision 1, `fingerprintsAreCurrent`), so the consumer never reads fingerprint internals |
| AR-005 rule (inputs, never results) | Pass | `indexStatus` → `fingerprintsOf` (cached unless dirty, missing or stale-model) → `collectionStatus` computed fresh. MP-005…MP-007 are covered in `project-task-index-status.test.ts` |
| Invalidation correctness | Pass | `dirty` is cleared before the read, so a write during the read marks the Project again; the model switch is handled twice (`fingerprintsAreCurrent` and the `modelId` guard in `collectionStatus`); deleted Projects are dropped; `forgetProject` clears entry, dirty and timer |
| Writer isolation (REQ-011 "saving never waits / never fails") | Pass | `taskChanged` is synchronous and catches the gate; the timer callback catches everything, `PROJECT_NOT_FOUND` skipped (R-15); timers are `unref`'d; `dispose()` runs at release before the index shuts down |
| Gate (a write never starts a download) | Pass | `activeModelOnDisk()` (files present, not unavailable) at schedule time and at run time (R-14). The synchronous `stat` calls at schedule are acceptable (decision 4) |
| Debounce (decision 3) | Pass | The window is fixed from the first write, and later writes join it because Tasks are read when the run starts. A write after the run's read starts a new window. Latency ≤ 3 s plus the run, within AC-015's 10 s |
| Cost of non-description marks (decision 6, R-12) | **Fail** | **CR-003**: `indexProject` → `index.sync` → `syncCollection` creates a job (reading the collection's vectors) and calls `prepareModel` whenever the model phase is `idle`, even when no fingerprint changed. The design promised such marks "cost one `listTasks` of that Project" |
| Interface clarity | Pass | `collectionStatus(collection, fingerprints)`; read-only helpers named for what they answer |
| Dead code | Pass | No SR-006 leftovers (never implemented); `messageOf` replaced by `serverMessageOf`; nothing unused found in the delta |
| Size | Pass | `embedding-index.ts` 339 → 367; `project-task-search-service.ts` 135 → 228; composition 69 → 82; `project-task-service.ts` 500 → 500 (one-line `Pick` change; the file stays at the limit, follow-up autobyteus-147); composable 138 → 148 |
| Web O-2 / O-4 | Pass | `act()` resolves after the mutation (`void refresh()`); the error kind is `server` or `unreachable`; en/zh-CN copy per DEC-013; spec cases added |
| Tests | Pass | Warm poll with no `listTasks`; MP-005…MP-007; burst → one run; model not on disk → no download; R-14; R-15; GraphQL E2E AC-015 over the real composition; probe AC-015 on the real stack (3,106 ms) |
| Checks | Pass (recorded) | IMP-14 QR-001 (cold 773 ms, warm median 25 ms, host load ≈ 9.5), typecheck, unit suite (6,071), GraphQL E2E (52), web suite (4,539) and guards, probe 8/8. They cover the reviewed code, so none was rerun |

### Candidates (round 4)

| Candidate ID | Observation | Scenario / Contract | Independent Trigger | Consequence | Evidence | Disposition | Scope | Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-09 | A write-triggered run whose Project has no changed fingerprints still loads the model worker when the model is idle, and loads that collection's vectors into a new job | Design SR-007 "Index after writes" ("an unchanged fingerprint set schedules nothing, so marks that aren't description changes cost one `listTasks`"); DESIGN.md (keep unrelated work off the path) | After a server restart (model phase `idle`, model on disk), any Task mark without a description change fires `taskChanged`, e.g. an agent's `update_task` status change, a dependency write, or an execution-resource commit (`project-task-service.ts` L82: every assignment or adoption commit). These are normal during agent work | 3 s later, `indexProject` → `sync` → `prepareModel` loads the worker: about 0.4 GB for Granite, 1.1–1.5 GB and seconds of CPU for EmbeddingGemma 2. It is held until the 10-minute idle stop, with no search and nothing to embed. Settings briefly shows "Preparing…" | `embedding-index.ts` `syncCollection` L257–269; `project-task-search-service.ts` `indexProject` L111–113 and `indexAfterWrite`; no test covers a non-description mark | Promote | This ticket (the change introduced it; it contradicts the reviewed design) | CR-003 Local Fix: the write path skips `sync` when the Project's fresh fingerprints show nothing to index (e.g. `collectionStatus` is `ready`), so only a Project with missing or changed Tasks prepares the model. Add a unit test: a status-only mark after a restart starts no runner |
| C-10 | Over-invalidation: every Task mark (resource commits included) re-reads that Project's Tasks once and marks it dirty (R-12) | Design R-12 (kept on purpose) | Agent work | One `listTasks` per Project per 3 s window, bounded | Design | Reject (as a finding) | — | Approved trade-off; the cost becomes as designed once CR-003 is fixed |
| C-11 | The fan-out `taskChangeMarks` calls the publisher before search, so a throwing publisher would skip search | Composition | — | The publisher contract is "never throws" (existing) | Code | Reject | — | Not reachable under the existing contract |

### Scorecard (round 4, full)

- Overall: 9.2/10 (92/100)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.4 | The new write spine is clear: mark → dirty + debounced run → gate → `indexProject` | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Opaque fingerprints; the fan-out lives in the composition; search owns the policy | — | — |
| 3 | API / Interface Clarity | 9.3 | Read-only boundary helpers with exact names | — | — |
| 4 | Separation of Concerns and File Placement | 9.2 | The search service grows to 228 lines, still one owner | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.3 | `ItemFingerprints` is singular and opaque | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | — | — | — |
| 7 | API/E2E Readiness | 8.8 | AC-015 proven on the real stack; QR-001 measured | CR-003 behavior is untested | Test plus fix |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Invalidation, gate, R-14 and R-15 are correct | CR-003: non-description writes load the model, contrary to the design | Fix CR-003 |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | — | — | — |
| 10 | Cleanup Completeness | 9.3 | — | — | — |

### CR-003 — Write-triggered indexing loads the model even when nothing changed (Local Fix, implementation)

- Protects: design SR-007 "Index after writes" (non-description marks "cost one `listTasks`"); REQ-011's intent (index new or edited Tasks, a background cost proportionate to work); DESIGN.md rule 3 (no avoidable work on unrelated events).
- Evidence:
  - `ProjectTaskSearchService.indexAfterWrite` → `indexProject` → `index.sync(...)`.
  - `EmbeddingIndex.syncCollection` creates a job (`store.read`, loading vectors) and, when `model.phase.kind === "idle"` (any time after a server start, before a search or an action), calls `prepareModel` regardless of pending items.
  - `ProjectTaskService` fires `taskChanged` for status updates, dependency writes and every execution-resource commit (L82, L429, L459). So after a restart, the first agent status or assignment change loads the worker: about 0.4 GB (Granite), or 1.1–1.5 GB (EmbeddingGemma 2), held until the 10-minute idle stop.
- Required action:
  - In the write path, skip `sync` when the Project has nothing to index. For example, compute the fresh fingerprints (already done for the dirty re-read) and run `sync` only when `collectionStatus` is `notIndexed` or `needsUpdate`, or when a job with pending work exists.
  - Keep the Index now / Index all / Rebuild actions as they are: they prepare the model on purpose (REQ-006).
  - Add a unit test: with the model on disk and idle, a status-only mark creates no runner and starts no preparation; a description edit does.

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

- Round 4: `Local Fix` (CR-003). FO-001 is resolved by SR-007 / IR-003.
- Round 3: `Design Impact` (FO-001), with a possible prerequisite (Project store read cost) and a requirement question (the QR-001 scope on Docker nodes).
- Round 2: N/A — `Pass` (CR-001 resolved; CR-002 resolved upstream as DEC-011).
- Round 1: `Requirement Gap` (CR-002) and `Local Fix` (CR-001).

## Recommended Recipient

- Round 4: `/software_engineering_team/implementation_engineer` (`Local Fix` CR-003); then a targeted code review, then API/E2E.
- Round 3: `/software_engineering_team/solution_designer` (`Design Impact` FO-001).
- Round 2: `/software_engineering_team/api_e2e_engineer` (primary pass handoff); `/software_engineering_team/implementation_engineer` (informational).
- Round 1: `/software_engineering_team/solution_designer`.

## Residual Risks

- C-07 / RSK-001: the QR-001 margin at 20 × 1,000 Tasks (626 ms median on an M1 Max; Project store reads dominate). Measure on Docker and slower hardware.
- AC-008 (Docker node) and the desktop run are not executed yet.
- EmbeddingGemma 2 (346 MB) was not downloaded in the probe; the same code path was exercised with LEAF-IR.
- RSK-003: proxies (`autobyteus-168`).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review` (round 4, Full Re-Audit of IR-003)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.2/10. Below 9.0: Runtime Correctness 8.6, API/E2E Readiness 8.8.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/implementation_engineer` (`Local Fix` CR-003)
- Notes:
  - FO-001 is resolved as designed: QR-001 cold 773 ms and warm 25 ms on the host; AC-015 proven.
  - Decisions 1, 3, 4 and 6 are sound, apart from CR-003's cost on non-description marks.
  - O-1, O-2 and O-4 are applied correctly.
