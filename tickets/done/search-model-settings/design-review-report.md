# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/requirements-doc.md` (SR-007, Approved: the SR-006 basis plus REQ-011 / AC-015 / DEC-014, index after Task writes, **approved by the user** 2026-10-19; SR-006 = the SR-005 basis plus DEC-012 (QR-001 refined) and DEC-013 ("Couldn’t reach the server."), Solution Designer within the direction, user informed; SR-005 = the SR-004 basis plus DEC-011 / REQ-010 / AC-014 (Solution Designer within the direction, user informed); SR-004 = the SR-002 baseline, where DEC-005 and the UI were decided by the user via Product, plus DEC-009/DEC-010, which the Solution Designer decided within the direction; user informed 2026-10-19)
- Upstream Investigation Notes: `.../investigation-notes.md`
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001…SR-007)
- Reviewed Design Spec: `.../design-spec.md` (SR-007: "Revision SR-007 (ARCH-REV-004 AR-005 + user-approved REQ-011)", the interface rows and G8 tests; it supersedes the SR-006 result cache and `collectionJobStatus`)
- Supplemental Task Artifacts Reviewed:
  - the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (design `4e4ac06`): State Behavior, Journeys, TR-001…TR-020, Data/Contract/Mock Boundaries, Implementation Fidelity Boundary, D-1…D-5;
  - `product-design-request.md` (history);
  - `architecture-design-handoff.md`.
- Relevant Solution Revision IDs: SR-002…SR-006, SR-007 (AR-005 resolution and the user-approved REQ-011)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 5
- Trigger: Solution Designer re-review request for SR-007 (2026-10-19). Scope: "Revision SR-007", REQ-011, AC-015, DEC-014
- Prior Review Round Reviewed: round 4 (`ARCH-REV-004`, Fail: AR-005)
- Latest Authoritative Round: 5
- Current-State Evidence Basis: worktree `codex/search-model-settings` @ `8d40ba3b6c` (only the ticket folder is uncommitted). Read:
  - `autobyteus-server-ts/src/embeddings/embedding-index.ts`: `activeModel()` switch side effects; `prepareModel`; `retryModel()` only resets to `idle`; `readinessOf` maps every non-ready, non-downloading phase, including `idle`, to `preparing/loading`; `removeOtherModels`;
  - `collection-indexing-job.ts`, `store/embedding-vector-store.ts` (`read` loads vectors), `catalog/embedding-model-catalog.ts` (`languages` `["en"]` / `["multilingual"]`; the LEAF-IR description says "About 23 MB");
  - `src/projects/search/project-task-search-service.ts` (deps `{listTasks, index}`);
  - `autobyteus-web/pages/settings.vue` (`ServerSettingsMode`, `normalizeServerSettingsMode` L357), `components/settings/ServerSettingsManager.vue`, `NfsGuideCard.vue` (external-link pattern).

  Round 2 re-read the SR-004 design spec, requirements and revision record. No code changed.

## Routing Classification Review

- Task size: `Medium`. The change extends existing owners plus one internal owner and one web sub-section; there is no new subsystem, store or runtime.
- Architectural risk: `High`. It adds new public GraphQL contracts, changes the persisted model-folder policy, and adds download/cancel concurrency next to preparation and search-triggered jobs.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None (unchanged in round 2).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved intent understood: Yes. An Embedding sub-section to see the catalog models, download ahead (with cancel and remove), switch the model, see each Project's index state and Index now / Rebuild / Index all; read-only status; downloaded models kept; server-side only.
- Round 2 basis change: SR-004 adds DEC-009, DEC-010 and AC-011…AC-013, and updates REQ-001 and REQ-005.
  - DEC-009 answers AR-002: an active model that isn't downloaded shows "Active · Not downloaded" with Download, which prepares the active model.
  - DEC-010: a Project with no Tasks shows Ready · 0 Tasks.
  - The Solution Designer approved them within the direction, recorded the options and reasoning, and informed the user. The team instruction gives the Solution Designer that authority, so this technical review does not reopen it.
  - DEC-009 composes existing spec pieces (the "Not downloaded" status, the quiet Download button, the Active tint, the D-2 non-cancellable preparing download) and keeps QR-002 (nothing starts on open).
- Existing behavior confirmed: Yes.
  - Only the raw setting switches models.
  - First-search preparation.
  - `removeOtherModels` deletes other models' files.
  - Collections exist only once touched.
  - `retryModel()` only clears `unavailable` to `idle`.
  - The model is lazy, so after every server start the phase is `idle`.
- Scope guardrail confirmed: Yes. In scope: UC-001…UC-004. Out of scope: other models, a board link, auto pre-indexing, proxies. Preserved: autobyteus-71 outcomes and exact search.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User / Operational | Pass | Pass | Pass: the active display-state table covers `idle` both with files present and with files absent | Confirmed | — (AR-001, AR-002 resolved) |
| BEH-002 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass: DS-006 Retry prepares | Confirmed | — (AR-003 resolved) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear? | Linked? | Internally Complete? | Consistent With Core Artifacts? | Status / Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| UI/UX spec (`4e4ac06`) + VIS-001…VIS-021 | Pass | Pass | Pass, with the one gap state supplied by DEC-009 in the requirements | Pass | Pass | — |
| `product-design-request.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for the posture | Pass | `Feature` | — |
| Root cause explicit and evidence-backed | Pass | `No Design Issue Found`; `embedding-index.ts` is 272 lines | — |
| Refactor decision explicit | Pass | `No`; downloads extracted to `EmbeddingModelDownloads` to keep the index under 500 lines | — |
| Supported by the design sections | Pass | Ownership map, file mapping | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade vs Owner Clear? | Naming Clear? | Ownership Clear? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Status read (two root fields, one document; 2 s while work runs, 10 s otherwise) | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Download / cancel / remove | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Switch; DEC-009 Download on a not-downloaded active model → `prepareActiveModel` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Explicit indexing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | One download (one flight owner, R-3) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Model Retry → `retryModel()` → `prepareActiveModel()` | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `EmbeddingIndex` | Pass | Pass | Pass | Pass | Downloads, files and store stay internal |
| `ProjectTaskSearchService` | Pass | Pass | Pass | Pass | Gains `listProjects` by injection |
| `ServerSettingsService` (write path) | Pass | Pass | Pass | Pass | `useEmbeddingModel` writes through it, so validation is unchanged (REQ-009) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `embeddings/**` | Pass | Pass | Pass | Pass | No `projects/` or `services/` imports |
| `api/graphql/types/embeddings.ts` | Pass | Pass | Pass | Pass | Owns `embeddingModelsStatus` only (AR-004 resolved) |
| `api/graphql/types/project-task-search.ts` | Pass | Pass | Pass | Pass | Owns `projectTaskIndexes` |
| `projects/search` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear? | Responsibility Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `EmbeddingIndex.modelsStatus()` + active display state | Pass | Pass | Pass | Low | Pass (R-8: align the interface row) |
| `downloadModel` / `cancelDownload` / `removeModel` | Pass | Pass | Pass | Low | Pass; `downloadModel(activeId)` = `prepareActiveModel()` |
| `prepareActiveModel()` | Pass | Pass | Pass | Low | Pass |
| `collectionStatus(collection, items)` | Pass | Pass | Pass | Low | Pass; no `activeModel()`, fingerprints only |
| `ProjectTaskSearchService.indexStatus/indexProject/rebuildProject/indexAllProjects` | Pass | Pass | Pass | Low | Pass |
| GraphQL `embeddingModelsStatus`, `projectTaskIndexes` | Pass | Pass | Pass | Low | Pass |
| GraphQL mutations (`retryEmbeddingModel` now prepares) | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Download, single flight | Pass | Pass | Pass | Pass | `EmbeddingModelDownloads` is the one flight owner; `files.ensure` stays an internal guard |
| Setting write | Pass | Pass | N/A | Pass | Settings owner reused |
| Polling | Pass | Pass | N/A | Pass | Board pattern, 2 s / 10 s |
| External link | Pass | Pass | N/A | Pass | `NfsGuideCard.vue` pattern answers spec F-5 |
| Sub-navigation | Pass | Pass | N/A | Pass | `ServerSettingsMode` gains `embedding` |

## Subsystem / Capability-Area Allocation Verdict

| Area | Ownership Clear? | Reuse/Extend Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/embeddings/` | Pass | Pass | Pass | Pass | — |
| `src/projects/search/` | Pass | Pass | Pass | Pass | — |
| `api/graphql/types/{embeddings,project-task-search}.ts` | Pass | Pass | Pass | Pass | One root field per owner |
| Web `components/settings/embedding/*`, composable | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Structure | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `FileState`, Project index state | Pass | Pass | Pass | Pass | One shape per subject |
| Language label and MB formatting | Pass | Pass | Pass | Pass | Web-side, from catalog data |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `modelsStatus` model entry with the active display state | Pass | Pass | Pass | N/A | Pass | One derivation table (Terminology); R-8 |
| Project index state (incl. `ready {tasks: 0}`, DEC-010) | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `embedding-index.ts`, `models/embedding-model-downloads.ts`, `models/embedding-model-files.ts`, store, job | Pass | Pass | Pass | Pass | — |
| `project-task-search-service.ts`, composition | Pass | Pass | N/A | Pass | — |
| GraphQL type files | Pass | Pass | N/A | Pass | — |
| Web files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `embeddings/models/embedding-model-downloads.ts` | Pass | Pass | Low | Pass | — |
| `autobyteus-web/components/settings/embedding/`, `composables/settings/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `EmbeddingModelFiles.removeAllExcept` and its call | Pass | Pass | Pass | Pass | Replaced by `remove(def)` |
| `normalizeServerSettingsMode` limited to three modes | Pass | Pass | Pass | Pass | Gains `embedding` |
| LEAF-IR "About 23 MB" | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retained? | Clean Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Model-file cleanup | No | Pass | Pass | One rule: keep until Remove |
| Setting write | No | Pass | Pass | — |
| `retryEmbeddingModel` semantics | No | Pass | Pass | One behavior for the board and Settings (it now prepares at once); the board's Retry outcome is preserved (autobyteus-71 REQ-010) |

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<appData>/embeddings/models/<id>/` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Existing installs hold only the active model's folder |
| `embeddings.sqlite` | Not Affected (new fingerprint-only read) | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–7 | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Avoided Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Read-only status, download then use, use while downloading | Yes | Pass | Pass | Pass | — |
| Active model after a restart, not downloaded, and Settings Retry | Yes | Pass | Pass | Pass | Display-state table; DS-006; AC-011…AC-013 with tests in G3 |

## Material Premise Validation

### `MP-001` — The active model is `idle` while the Embedding section is open

- Related requirement: REQ-001 (Active readiness: Ready / Preparing / Unavailable), REQ-005 / QR-002 (opening starts nothing), REQ-009.
- Behavior IDs: BEH-001
- Initiating basis kind: `System` + `User`
- Independent trigger: the server starts (normal desktop launch, Docker restart). `EmbeddingIndex.model` is `null` and the phase is `idle` until a search or sync needs it. The user then opens Settings → Server Settings → Embedding, a supported action (UXJ-001).
- Forward path: `useEmbeddingSettings` → `embeddingSettingsStatus` → `EmbeddingIndex.modelsStatus()`. No preparation may start (G3). The active model's phase stays `idle`. With the existing `readinessOf`, `idle` reports `{state: "preparing", phase: "loading"}`.
- Consequence: the Active row shows "Preparing… Loading the model…" indefinitely while nothing runs, on every server start. The spec's resting state is "Active · Ready" ("Default", UXJ-001, VIS-001).
- Reachability: `Reachable` (normal on every server start)
- Review consequence: AR-001

### `MP-002` — The active model is `idle` and its files are not on disk

- Related requirement: REQ-001, QR-002, REQ-009.
- Initiating basis kind: `User` / `Operational`. Two distinct triggers with the same consequence:
  - (a) a fresh install, or an install that never searched since autobyteus-71 shipped in `v1.5.6-beta.8`: the default Granite is active and was never downloaded. The user opens the Embedding section.
  - (b) an operator sets `AUTOBYTEUS_EMBEDDING_MODEL` to a not-downloaded catalog model in Advanced or an env file (REQ-009, AC-009), then opens the section.
- Forward path: `modelsStatus()` gives the active model file state `notDownloaded`, phase `idle`. Nothing may start (QR-002).
- Consequence: the approved spec has no presentation for "Active, not downloaded, nothing running". "Ready" is untrue (the first search or Index triggers a 55–346 MB download). "Preparing" is untrue (nothing runs). The Active row has no Download action.
- Reachability: `Reachable` for both triggers
- Review consequence: AR-002 (Requirement Gap: the visible state needs the Product/user basis)

### `MP-003` — Retry on "Active · Unavailable" from the Embedding section

- Related requirement: REQ-001 (Unavailable + reason + Retry), REQ-005/REQ-006 (Unavailable rows; "Retry is on the model"), AC-006; UI spec TR-019 ("Retry → Preparing…; Preparation restarts"), UXJ-008.
- Initiating basis kind: `User`
- Independent trigger: the user confirms Use this model on a not-downloaded model while the node is offline (spec UXJ-008, VIS-011), then the network returns and the user presses Retry on the Active row.
- Forward path in the design: the existing `retryEmbeddingModel` → `EmbeddingIndex.retryModel()` sets the phase to `idle` and prepares nothing. The section's polling is read-only, so nothing ever calls `sync` or `search`.
- Consequence: preparation does not restart, contradicting TR-019. Combined with MP-001, the row shows "Preparing…" with nothing running until a board search happens.
- Reachability: `Reachable`
- Review consequence: AR-003

### `MP-004` — The app quits during a download-ahead

- Initiating basis kind: `User`: the user quits the desktop app or restarts the node while a 346 MB download runs.
- Consequence: a `.part` file stays. It is counted in "On disk" (QR-003 counts partial files), and the row shows Not downloaded with no Remove. It is cleaned by the next Download (overwrite) or by Download then Cancel.
- Reachability: `Reachable`. The consequence is bounded, truthful in the UI and recoverable.
- Review consequence: non-blocking R-4 only. Interrupted execution is outside the default scope, and REQ-002 covers cancel and failure.

## Unresolved Approved-Behavior Or Current-State Gaps

None. The round 1 gap (MP-002) is resolved by DEC-009 / AC-011.

## Round 4 Basis And Code Evidence (SR-006)

- Code: `codex/search-model-settings` @ `671a1e596b`. Evidence: `evidence/api-e2e/API-L02-03-status-breakdown.txt`. Key facts:
  - `EmbeddingIndex.collectionStatus(collection, items)` (`embedding-index.ts` L150–158) returns `job.status(items)` when a job exists for the collection, else a fingerprint-only store read.
  - Jobs stay in `EmbeddingIndex.collections` **after they finish**. Entries are removed only by `dropCollection` (L123) and by a model switch or shutdown (`collections.clear()`, L204, L216). A Project that was indexed or searched once keeps a finished job for the life of the process.
  - `CollectionIndexingJob.status(items)` (L63) compares the *given current items* with its vectors. Without items, a job only knows the item set of its last `sync`.
  - Task writers: `ProjectTaskService` create (L424/429), update (L447/459), delete (L196/197), dependency writes (`task-dependency-writes.ts` L64), and resource commits (L82) all emit `ProjectChangeMarks`. The fan-out claim holds; `reclaim` (L482) rewrites the Task unchanged.
- **DEC-012** (QR-001: warm refresh ≤ 300 ms; first load ≤ 1 s on desktop; on Docker no slower than the `projects` list) and **DEC-013** ("Couldn’t reach the server.") are Solution Designer decisions within the direction, with the user informed. This review does not reopen them.
- **Follow-up FU-1** (the Project store's whole-backlog read) is correctly a follow-up, not a prerequisite. Under DEC-012 the ticket reaches its goal without it, and the slowness belongs to the Project store, which the `projects` list shares.
- **O-1, O-2, O-4 (G8):** bounded and coherent. O-1: an empty folder after a failed download, consistent with REQ-002's no partial files. O-2: release `working` once the mutation settles. O-4 is DEC-013.
- The cache structure is sound in principle: it lives in the subject owner, is invalidated through the existing post-commit marks, and needs no new store. It adds one read-only boundary method. Its invalidation rule, however, is incomplete (AR-005).

### `MP-005` — A Task is edited after its Project was indexed (finished job present), and Settings shows that Project

- Related requirement: REQ-005 (Needs update · K changed), REQ-006 / D-4 (Index all = every Not indexed or Needs update Project), AC-005, AC-006.
- Initiating basis kind: `User`. A supported sequence:
  - the user presses Index now (or searches the board) on a Project; its job completes and stays in the index;
  - later the user edits a Task's description on the board, or the Project Task Manager edits one with `update_task`;
  - the user opens Settings → Embedding, or it is already open and polling.
- Forward path in the SR-006 design:
  - The edit's `taskChanged` mark sets dirty. The next poll takes the dirty path: `listTasks` + `collectionStatus(collection, items)` → `job.status(items)` → `needsUpdate {changed: 1}`; it caches that and clears dirty.
  - The next poll takes case (2): the index has a job for the collection under the active model, so `collectionJobStatus(collection)` reports from the job's own item set. All of that set is fresh, so it reports **Ready**.
- Consequence:
  - The Project flips from "Needs update · 1 changed" to "Ready" one poll later, against REQ-005 and AC-005.
  - `indexAllProjects()` selects from `indexStatus()`, so Index all skips the Project (REQ-006, D-4, AC-006).
  - The state stays wrong until another Task write.
- Reachability: `Reachable`. The jobs persist (L123/L204/L216), and both the edit and the Index action are supported.

### `MP-006` — The cache serves a transient state after the job settles

- Initiating basis kind: `User`: Index now / Rebuild / Index all with the section open.
- Path:
  - The action marks the Project dirty.
  - The next poll's dirty path computes `indexing {done, total}` (or `waiting`) and caches it.
  - If case (2) is read as "a job that still has pending work", then once the job finishes the Project falls to case (3) and gets the cached `indexing`.
- Consequence: the Project stays "Indexing N of M" indefinitely, and polling stays at 2 s because a Project "is indexing" (R-1).
- Reachability: `Reachable` under that reading of "live job". Under the other reading, MP-005 applies. Either way the rule is incomplete.

### `MP-007` — A board search indexes a Project between two polls

- Initiating basis kind: `User`: a board search on a Project that Settings showed as Needs update. That is the existing first-search behavior, BEH-002.
- Path:
  - `ProjectTaskSearchService.search` syncs the collection, and the job indexes the changed Task in about 0.5 s.
  - `search` is not an invalidation source.
  - With polling at 10 s, the job can start and finish between two polls.
  - Under the "pending job only" reading, the cache keeps `needsUpdate`.
- Consequence: Settings shows Needs update for a Project that is Ready, and Index all re-runs it. The re-run is a no-op sync, harmless but untruthful.
- Reachability: `Reachable`

## Round 5 Basis And Verification (SR-007)

- **AR-005 is resolved (option b).** Rule: "the served status of a Project always equals `collectionStatus(collection, currentItems)` for the active model. The search service caches inputs, never results."
  - The input cache is an opaque `ItemFingerprints` from `EmbeddingIndex.fingerprintItems`, computed with the resolved active model's document prefix, without `activeModel()`.
  - It is re-read when the Project is dirty (the composed `ProjectChangeMarks` fan-out, all Task writers verified in round 4), has no entry, or has a `modelId` that differs from the active model. `forgetProject` drops it.
  - The status is computed fresh every poll: a job *with pending work* gives `indexing` or `waiting`; otherwise the current fingerprints are compared with the job's vectors or `store.readFingerprints`; `unavailable` when the model is unavailable.
  - Against the round-4 premises:
    - MP-005: finished jobs carry no status;
    - MP-006: nothing transient is cached;
    - MP-007: search-triggered indexing shows on the next poll.
  - `collectionJobStatus` is removed. G8 has a test for each premise, plus "warm poll: no `listTasks` for clean Projects" and a cost test against DEC-012's 300 ms warm target.
  - The boundary stays clean: the fingerprints are produced and interpreted only by `EmbeddingIndex`, and the consumer holds them as an opaque value.
- **REQ-011 / DEC-014 / AC-015** (index after Task writes) were approved by the user on 2026-10-19. This review does not reopen the decision. The design maps it with no new owner:
  - the same change-mark listener schedules a 3 s debounced `indexProject` (`listTasks` + `sync`) per Project;
  - it runs only if the read-only `activeModelOnDisk()` holds, so a write starts no download;
  - it runs in the background and never throws to the writer, so a save never waits (autobyteus-71 QR-006 preserved);
  - deletes keep `forgetTask` / `forgetProject`, and the search-time fingerprint check stays as the safety net;
  - nothing runs at startup, so autobyteus-71 AC-012 is preserved.
- Classification `Medium` / `High` is unchanged and confirmed.

### `MP-008` — The active model changes during a write's debounce window

- Initiating basis kind: `Operational`: an operator sets `AUTOBYTEUS_EMBEDDING_MODEL` in Advanced or an env file to a not-downloaded model (REQ-009), within 3 s of a Task write.
- Path: the gate `activeModelOnDisk()` was true for the old model when the run was scheduled. When the debounce fires, `indexProject` → `sync` → `syncCollection` → `activeModel()` → `prepareModel` downloads the new model.
- Consequence: a download starts without a user Download, against REQ-011's "a write never starts a download". The window is a 3 s coincidence of two independent actions, and the outcome is the same download the next search would start.
- Reachability: `Reachable` but needs coincidental timing. It drives a recommendation only (R-14), with no new machinery.

## Review Decision

`Pass`. AR-005 is resolved by a rule that makes the served status correct by construction. The user-approved REQ-011 is mapped onto the existing owner and marks, within its constraints. The design is ready for implementation.

## Findings

None open. AR-001…AR-004 stay resolved (ARCH-REV-002). AR-005 is resolved (ARCH-REV-005).

## Classification

N/A — `Pass`. Ticket scope: no prerequisite; FU-1 stays a follow-up.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass handoff); `/software_engineering_team/solution_designer` (informational).

## Residual Risks

- **R-14 — Re-check the gate when the debounce fires (MP-008).** Evaluate `activeModelOnDisk()` again when the debounced run fires, not only when it is scheduled. It is a cheap read-only call and closes the window.
- **R-15 — Background run hygiene.** Make the debounced callback catch everything; for example `listTasks` throws `PROJECT_NOT_FOUND` when the Project is deleted inside the window. Clear or `unref` pending timers at shutdown, so they never keep the process alive or run against a closed store.
- **R-16 — Requirements bookkeeping (Solution Designer's document, before code review).** In `requirements-doc.md`:
  - the Scope Guardrail's Out Of Scope still lists "Automatic pre-indexing at startup **or after Task writes**", which contradicts the approved REQ-011;
  - the baseline line (L13) still says "this document at `SR-005`" while Status says SR-007.

  Narrow the line to "at startup" and correct the baseline, so the code review judges against a consistent Scope Guardrail.
- **R-17 — Background model load after writes.** Under REQ-011 a Task write by the user or an agent can load the model worker (≈ 0.3–0.7 GB), which the runner's idle stop releases (autobyteus-71 QR-004). This is accepted by the user's decision; just observe it in API/E2E.
- Carried forward:
  - R-12 (keep over-invalidation);
  - R-13 (record host load in the API-L02 rerun);
  - the cost of the fingerprint comparison (20 `readFingerprints` per poll) against the 300 ms warm target;
  - R-10, R-11; RSK-002, RSK-003, ASM-001; FU-1.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. MP-005…MP-007 are resolved by construction. MP-008 is `Reachable` with coincidental timing and drives only R-14.
- Notes: round 5 checked "Revision SR-007", REQ-011, AC-015 and DEC-014 against the SR-007 artifacts and the round-4 code facts at `671a1e596b`. Other verdicts stand.
