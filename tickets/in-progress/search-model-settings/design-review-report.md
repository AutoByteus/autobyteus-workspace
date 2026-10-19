# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/search-model-settings/tickets/in-progress/search-model-settings/requirements-doc.md` (SR-004, Approved: the SR-002 baseline, where DEC-005 and the UI were decided by the user via Product, plus DEC-009/DEC-010, which the Solution Designer decided within the direction; user informed 2026-10-19)
- Upstream Investigation Notes: `.../investigation-notes.md`
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001…SR-004)
- Reviewed Design Spec: `.../design-spec.md` (SR-004; incl. "Architecture Review Resolution (ARCH-REV-001 → SR-004)")
- Supplemental Task Artifacts Reviewed:
  - the approved UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/search-model-settings/ui-ux-spec.md` (design `4e4ac06`): State Behavior, Journeys, TR-001…TR-020, Data/Contract/Mock Boundaries, Implementation Fidelity Boundary, D-1…D-5;
  - `product-design-request.md` (history);
  - `architecture-design-handoff.md`.
- Relevant Solution Revision IDs: SR-002, SR-003 (design round 1), SR-004 (requirement gap decisions plus the design revision answering ARCH-REV-001)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer re-review request for SR-004 (2026-10-19)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail: AR-001…AR-004)
- Latest Authoritative Round: 2
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

## Review Decision

`Pass`. The behavior basis (SR-004) is confirmed, AR-001…AR-004 are resolved in the current design spec, and no in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None open. Round 2 verification (details in `ARCH-REV-002`):

- **AR-001 — Resolved.**
  - Terminology § "Active model display state" derives the shown state from the internal phase and the files:
    - `unavailable` → Unavailable plus Retry;
    - a running `downloading`/`loading` → Preparing with progress;
    - `idle`/`ready` with all files → Ready;
    - `idle` without all files → Not downloaded.
  - "Nothing else maps to Preparing."
  - A restart test (AC-013) and the G3 spy test keep the status read-only, with no `activeModel()` call.
- **AR-002 — Resolved by an approved requirement decision.**
  - DEC-009 (SR-004): "Active · Not downloaded" plus Download → `prepareActiveModel()` (preparing, no Cancel, per D-2). Index now and Index all also prepare first (REQ-005).
  - AC-011 covers a fresh data root and an Advanced switch.
  - The Solution Designer approved it within the direction, with the options recorded; the user was informed.
- **AR-003 — Resolved.**
  - DS-006: `retryEmbeddingModel` → `retryModel()` → `prepareActiveModel()`, for Settings and the board alike.
  - The board's Retry outcome is unchanged; it now restarts at once.
  - AC-012 covers it.
- **AR-004 — Resolved.**
  - Two root fields with one owner each: `embeddingModelsStatus` (`embeddings.ts` → `EmbeddingIndex`) and `projectTaskIndexes` (`project-task-search.ts` → `ProjectTaskSearchService`), fetched in one web document.
  - The dependency rules are updated.
- **R-1…R-7 — applied:**
  - R-1: poll 2 s while work runs, else 10 s; QR-001 measured at 20 × 1,000;
  - R-2: `collectionStatus` without `activeModel()`, fingerprints only, active-model jobs only;
  - R-3: `EmbeddingModelDownloads` is the one flight owner, and `prepareModel` uses `downloads.ensure(def, {cancellable: false})`;
  - R-4: `.part` handling;
  - R-5: DEC-010;
  - R-6: `downloadModel(activeId)` = `prepareActiveModel()`;
  - R-7: concurrent jobs acknowledged.

## Classification

N/A — `Pass`.

Ticket scope (`references/ticket-scope.md`): no prerequisite or follow-up.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass handoff); `/software_engineering_team/solution_designer` (informational).

## Residual Risks

- **R-8 — Interface row consistency (implementation note).** The `EmbeddingIndex.modelsStatus()` interface row still shows `readiness?: EmbeddingReadiness`, while the GraphQL row adds `activeDisplay` and Terminology defines the derivation. Implement the GraphQL `activeDisplay` from the Terminology table, as the one active-state field the web reads.
- **R-9 — An active model with a running flight in `EmbeddingModelDownloads`.** Example: a model downloading ahead becomes active through Advanced or an env file (REQ-009) before the index has observed the switch. Its display should be Preparing with that flight's progress, not "Not downloaded". Derive "actually running" from the flight owner as well as the internal phase.
- **RSK-001 — Status cost:** measure QR-001 at 20 × 1,000. The escalation trigger stays binding.
- **RSK-002 — Cancel during rename:** the abort is checked before the rename.
- **RSK-003 — Proxies** (`autobyteus-168`).
- **ASM-001 — Disk use** for kept models, with a visible Remove.
- The design's escalation triggers stay binding.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. MP-001…MP-003 are addressed by AR-001 (display-state table), DEC-009 (AC-011) and DS-006 (AC-012). MP-004 is handled per R-4.
- Notes: round 2 checked AR-001…AR-004 and the R-1…R-7 changes against the SR-004 design spec, requirements and revision record. The round 1 verdicts for unaffected sections stand.
