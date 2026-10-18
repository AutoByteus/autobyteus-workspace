# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-semantic-search/tickets/in-progress/project-task-semantic-search/requirements-doc.md` (SR-004, Approved by user 2026-10-18)
- Upstream Investigation Notes: `.../investigation-notes.md` (incl. "Architecture-phase evidence")
- Upstream Solution Revision Record: `.../solution-revision-record.md` (SR-001…SR-005)
- Reviewed Design Spec: `.../design-spec.md` (SR-006; incl. "Architecture Review Resolution" table)
- Supplemental Task Artifacts Reviewed: `model-evaluation-report.md` (evidence for DEC-002), `probes/` (evidence; round 2 adds `probes/egemma2-wasm-q8.json` and `probes/worker-thread-probe/`), `architecture-design-handoff.md`
- Relevant Solution Revision IDs: SR-004 (approved requirements), SR-005 (design round 1), SR-006 (design revision answering ARCH-REV-001)
- Architecture Review Revision Record: `.../architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer re-review request for SR-006 (2026-10-18)
- Prior Review Round Reviewed: round 1 (`ARCH-REV-001`, Fail — Design Impact, AR-001…AR-003)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `codex/project-task-semantic-search` @ base `55bff1f5ee` (only ticket docs uncommitted). Read: `autobyteus-web/components/projects/ProjectTaskBoard.vue` (predicate L60–67, Cancelled filter L55–59, locator L82–87); `autobyteus-server-ts/package.json` (ESM, `tsc` build to `dist`); `src/services/server-settings-service.ts` (`allowedValues` rejection L324, runtime `config.set`); `src/config/streaming-content-flush-interval-setting.ts` (resolve-or-default pattern); `src/projects/services/project-task-service.ts` (`listTasks` L95 builds views; `deleteTask` L194); `project-service.ts` (`deleteProject` L185); `project-task-views.ts`; `stores/project-store.ts` (`listTasks` L92); `agent-tools/project-tasks/project-task-tool-manifest.ts` (error mapping); `autobyteus-web/scripts/prepare-server.mjs` (`pruneNativePrebuilds`); `LICENSING.md`, `scripts/check_licensing.py`, `autobyteus-web/public/THIRD_PARTY_NOTICES/`; web `composables/projects/`, `graphql/queries/`, `localization/messages/{en,zh-CN}`; root `DESIGN.md`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: new product-agnostic subsystem (~10 files), new service, GraphQL + tool contracts, server setting, new dependencies with desktop packaging change, new derived persisted store, network download, worker/background lifecycle. Matches the design-principles definitions.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes — board and agent meaning search over a reusable server-side embedding layer; exact tier preserved; lazy first use; failure never blocks Task management; switchable model by server setting (REQ-001…REQ-015, DEC-001…DEC-010).
- Relevant existing behavior and evidence confirmed: Yes. Board predicate is client-side over `visibleTasks` (Cancelled hidden by default); `list_project_tasks` returns full Tasks; Task files are the source of truth; delete owners are `ProjectTaskService.deleteTask` / `ProjectService.deleteProject`; settings validate `allowedValues` and apply at runtime.
- Scope guardrail confirmed: Yes (UC-001…UC-006; Out of Scope incl. temp-task board, key lookup, highlighting, front-end model chooser; Preserved Behavior Boundary; Review Authority).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity, if any: None at the requirements level (see recommendation R-1 for a design clarification).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — (R-1, R-2, R-3 applied in G4 and the `EmbeddingIndex.search` row) |
| BEH-002 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass | Confirmed | — (AR-003 resolved) |
| BEH-004 | System / User | Pass | Pass | Pass | Confirmed | — (AR-002 resolved) |
| BEH-005 | Contract / Operational | Pass | Pass | Pass | Confirmed | — (AR-001 resolved) |

Round 2: requirements unchanged (SR-004). The SR-006 changes are confined to evidence, risks, guidance and DS-003/DS-006 detail, so unaffected structural verdicts from round 1 stand.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `model-evaluation-report.md` | Pass | Pass | Pass | Pass (EmbeddingGemma 2 WASM cost now in `probes/egemma2-wasm-q8.json` and the design evidence table / RSK-009) | Pass | — |
| `probes/*` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | `Larger Requirement`, structural triggers listed | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`; owners confirmed in code (`ProjectTaskService` 505 lines, board 100 lines) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | `No`; FU-4 deferred with measurement | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Search gets its own service/composable instead of growing `ProjectTaskService`/board | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Board search | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Agent tool | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Collection indexing job | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Model readiness state machine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Readiness refresh (polling) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Delete cleanup | Pass | Pass (see AR-003 on waiting) | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Model switch | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 | Worker request loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `EmbeddingIndex` | Pass | Pass | Pass | Pass | Store/runner/worker/files internal; only catalog/definition types exported for settings registration |
| `ProjectTaskSearchService` | Pass | Pass | Pass | Pass | Resolver/tool never build collection keys |
| `ProjectTaskService.listTasks` | Pass | Pass | Pass | Pass | Search never reads `task.json` directly |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/embeddings/**` | Pass | Pass | Pass | Pass | Product-agnostic; worker imports only `node:*` + two deps |
| `projects/search` ↔ `projects/services` | Pass | Pass | Pass | Pass | R-5 applied: constructor injection plus a type-only cleanup port through `deps`; no module cycle |
| Transport → `projects/search` / `embeddings` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `EmbeddingIndex.search/sync/removeItems/dropCollection` | Pass | Pass | Pass | Low | Pass (R-2 on scores for exact candidates) |
| `EmbeddingIndex.modelStatus/retryModel` | Pass | Pass | Pass | Low | Pass |
| `ProjectTaskSearchService.search/forgetTask/forgetProject` | Pass | Pass | Pass | Low | Pass |
| GraphQL `searchProjectTasks`, `retryEmbeddingModel` | Pass | Pass | Pass | Low | Pass |
| Tool `search_project_tasks` | Pass | Pass | Pass | Low | Pass |
| Setting `AUTOBYTEUS_EMBEDDING_MODEL` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SQLite storage | Pass | Pass | Pass | Pass | `node:sqlite` own file; Prisma rejected with reason |
| Settings | Pass | Pass | N/A | Pass | Matches existing resolve-or-default pattern |
| Tool exposure | Pass | Pass | N/A | Pass | Manifest reaches MCP adapter |
| Download | Pass | Pass | Pass | Pass | Existing downloaders lack checksum/atomic rename; their callers untouched |
| Model runtime | Pass | Pass | Pass | Pass | Voice-input mechanism is Electron-only (REQ-012) |
| Board search state | Pass | Pass | N/A | Pass | `searchByProjectId` reused |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/embeddings/` | Pass | Pass | Pass | Pass | — |
| `src/projects/search/` | Pass | Pass | Pass | Pass | — |
| `api/graphql/types`, `agent-tools/project-tasks`, settings | Pass | Pass | Pass | Pass | — |
| Web board/composable | Pass | Pass | Pass | Pass | — |
| Packaging `prepare-server.mjs` | Pass | Pass | Pass | Pass | See AR-002 for licence files |
| Companion `autobyteus-agents` | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `EmbeddingModelDefinition` | Pass | Pass | Pass | Pass | — |
| `EmbeddingReadiness` | Pass | Pass | Pass | Pass | — |
| Worker protocol types | Pass | Pass | Pass | Pass | Type-only exports keep worker standalone |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `EmbeddingModelDefinition` | Pass | Pass | Pass | N/A | Pass | `files` is the single verify list; roles named within it |
| `EmbeddingReadiness` | Pass | Pass | Pass | N/A | Pass | `phase` disambiguates bytes vs items |
| `embedding_vectors` table | Pass | Pass | Pass | N/A | Pass | PK `(collection, item_id)`; `model_id` filter on read |
| `ProjectTaskSearchResult` | Pass | Pass | Pass | N/A | Pass | ids + match kind only |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/embeddings/**` (10 files) | Pass | Pass | Pass | Pass | Split seam for `embedding-index.ts` named |
| `src/projects/search/project-task-search-service.ts` | Pass | Pass | N/A | Pass | — |
| Delete hooks in two services | Pass | Pass | N/A | Pass | AR-003 |
| GraphQL / tool files | Pass | Pass | N/A | Pass | — |
| Web composable / board / docs / localization | Pass | Pass | N/A | Pass | — |
| `prepare-server.mjs` prune | Pass | Pass | N/A | Pass | AR-002 |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/embeddings/{catalog,models,runtime,store}` + root files | Pass | Pass | Low | Pass | — |
| `src/projects/search/` | Pass | Pass | Low | Pass | — |
| `autobyteus-web/composables/projects/useProjectTaskSearch.ts` | Pass | Pass | Low | Pass | Folder exists |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `matchesSearch` / `matchingTasks` / `isNoMatch` predicate in `ProjectTaskBoard.vue` | Pass | Pass | Pass | Pass | Locator (L86) re-pointed to the result set |
| Outdated docs statements (`web/docs/projects.md`, server `search.md`) | Pass | Pass | Pass | Pass | — |
| Dead code in touched files | Pass | N/A | Pass | Pass | None found; implementation re-checks |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Client predicate fallback | No | Pass | Pass | Rejected explicitly |
| Old-model vectors during switch | No | Pass | Pass | — |
| Schema-version column | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Task/Project files, `production.db` | Not Affected | Pass | Pass | N/A | Pass | — |
| New `embeddings.sqlite` | Discard or Rebuild (rename-aside + recreate) | Pass | Pass | N/A | Pass | Matches AC-009 and requirements' acceptable-loss statement |
| Model files | Discard or Rebuild | Pass | Pass | N/A | Pass | Inactive models removed after switch (QR-005) |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–10 | Pass (catalog verification early, step 2) | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Future collection, model switch, catalog entry, board merge, first-use readiness | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### `MP-001` — A Project is deleted while its collection's indexing job has a batch in flight

- Related approved requirement or established contract: requirements Data Continuity ("deleting a Task or Project removes its index entries"); REQ-007.
- Relevant behavior ID(s): BEH-003, BEH-004
- Initiating basis kind: `User`
- Independent trigger: the user deletes a Project from the Projects page (existing delete action) shortly after searching it for the first time, or after an operator model switch (UC-004/UC-006), while background indexing runs (QR-003 allows minutes for 1,000 Tasks).
- Forward path: board search → `ProjectTaskSearchService.search` → `EmbeddingIndex.search` schedules DS-003 job → user deletes Project → `ProjectService.deleteProject` commit → `forgetProject` → `dropCollection` while a batch is in `runner.embed`.
- Lifecycle consequence: if the batch's `store.upsert` runs after the drop, orphan rows remain for a collection that will never be searched again (small, but contradicts the delete-removes-entries statement).
- Reachability: `Reachable`
- Review consequence: AR-003 asked the design to state that a cancelled/dropped job never writes after cancellation. Resolved in SR-006: a collection generation check runs before each store write and cache update (DS-003). This is a counter on the cancellation the design already had, proportionate to the premise.

### `MP-002` — Board shows results of an earlier query after a later one (out-of-order responses)

- Related approved requirement: REQ-003, REQ-007 (results reflect the current query).
- Initiating basis kind: `User`; trigger: normal typing with a pause longer than the ~250 ms debounce, then more typing; the first request may be slower (sync/indexing/worker start).
- Reachability: `Reachable`
- Review consequence: non-blocking recommendation R-3. Applied in G4: the latest request wins.

## Unresolved Approved-Behavior Or Current-State Gaps

None. The round-1 gap (EmbeddingGemma 2 unverified on WASM) is closed by `probes/egemma2-wasm-q8.json`: ort-web, 4 threads, r@5 0.957, r@10 0.986 (QR-007 met).

## Review Decision

`Pass` — the behavior basis is confirmed, AR-001…AR-003 are resolved in the current canonical design spec (SR-006), and no in-scope machinery depends on an unsupported premise. The design is ready for implementation.

## Findings

None open. Round-2 verification of the round-1 findings (details in `ARCH-REV-002`):

- **AR-001 — Resolved.**
  - EmbeddingGemma 2 was run on the production WASM stack: r@1 0.913, r@5 0.957, r@10 0.986, MRR 0.940; 4,270 ms per Task; RSS 1,134 MB loaded / 1,522 MB peak.
  - The catalog keeps all three approved entries unconditionally: file mapping, sequence step 2, G2.
  - The contingency is now consistent everywhere (RSK-006, G2, step 2, escalation trigger): any verification failure goes back to the Solution Designer as a `Design Impact` for the user's decision.
  - Model-specific cost is stated for operators (RSK-009; setting description; `embeddings.md`), which QR-003 allows ("other catalog models may be slower, stated per model").
  - The empty-modality-input handling (G2) is generic, driven by the session's input metadata, not a per-model branch. It fits the design's "everything model-specific is data" rule.
- **AR-002 — Resolved.**
  - G11 maps REQ-013/AC-014:
    - npm `LICENSE*`/`NOTICE*`/`package.json` are kept through the G6 prune;
    - no `THIRD_PARTY_NOTICES` entry is needed, consistent with `LICENSING.md`, which keeps that folder for vendored code;
    - models are not shipped, and each one's licence and source are recorded in the catalog and `docs/modules/embeddings.md`;
    - `check_licensing.py` and the hygiene check run in validation.
- **AR-003 — Resolved.**
  - DS-006 and the `forgetTask`/`forgetProject` interface row: the hooks are synchronous calls that never throw and never await indexing (QR-006).
  - DS-003: per-collection generations are bumped synchronously by drop, remove, model switch and sync removals, and checked before every store write and cache update. A late batch is discarded (MP-001).

## Classification

N/A — `Pass`.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary pass handoff); `/software_engineering_team/solution_designer` (informational).

## Residual Risks

- Round-1 recommendations, all now in the design:
  - R-1, R-3 and R-7 in G4;
  - R-2 in the `EmbeddingIndex.search` row (`scoreIds` → `scores`);
  - R-4 probed (`probes/worker-thread-probe/`: 4 threads in a `worker_thread`, 2.4× faster than 1 thread);
  - R-5 in the Dependency Rules;
  - R-6 in the setting row;
  - R-8 recorded as follow-up FU-5.
- For implementation and validation to watch:
  - RSK-002: model download behind proxies (FU-2).
  - RSK-004: per-model calibration margin. Calibrate all three entries per G2.
  - RSK-005 / RSK-009: WASM memory. EmbeddingGemma 2 reaches about 1.5 GB at peak and about 12 min to index today's backlog on an M1 Max. This is acceptable as an opt-in, operator-chosen model with its cost stated.
  - RSK-008: `listTasks` builds full views per search; measure under QR-001 (FU-4).
- The implementation-time escalation triggers in the design spec stay binding:
  - a catalog entry fails verification;
  - QR-001…QR-005 are missed on the built app;
  - a server-push channel is needed;
  - an existing owner must change beyond the listed hooks.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 and MP-002 are `Reachable`; both are addressed by bounded statements in DS-003 and G4; no machinery depends on an unsupported premise)
- Notes: Round 2 checked AR-001…AR-003 and the R-1…R-8 changes against the SR-006 design spec, investigation notes and new probe evidence. The round-1 structural verdicts for unaffected sections stand.
