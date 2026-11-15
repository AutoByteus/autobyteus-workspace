# Design Review Report — memory-sync-large-files

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/requirements-doc.md` (SR-003, Approved)
- Upstream Investigation Notes: `…/memory-sync-large-files/investigation-notes.md` (SR-003 rows added)
- Upstream Solution Revision Record: `…/memory-sync-large-files/solution-revision-record.md` (SR-003)
- Reviewed Design Spec: `…/memory-sync-large-files/design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed: `probes/large-file-sync-probe.e2e.test.ts.txt` (evidence only, unchanged); `handoff-sr-003.md`; `follow-ups.md`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `…/memory-sync-large-files/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer handoff SR-003 (design revised for ARCH-REV-001)
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: branch `task/memory-sync-large-files` @ `c9563a9b3` (ticket documents only changed since round 1; source unchanged). Round-1 code reads still valid. Opened this round: `persistence/file/store-utils.ts:40-125` (`withFilePathLock` = in-process queue **plus** a cross-process `wx` lock file with retry), `startup/background-runner.ts:1-40`, `startup/memory-sync-worker-loader.ts`, `startup/app-data-capability-readiness.ts:15-26`, `local-file-memory-import-store.ts:208-211` (inline write = temp + rename).

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`
- Classification rationale reviewed: unchanged and still accurate (SR-003 adds one startup loader).
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Design approval `Not required`.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. SR-003 clarified REQ-005, SCN-004, DEC-006 and AC-005 (a lost connection is run-level and the next run resumes). This matches REQ-006, which was already approved, and adds no new behavior.
- Relevant existing behavior and evidence confirmed: Yes (round 1, plus the reads above).
- Scope guardrail confirmed: Yes, unchanged.
- Every prospective blocking `Design Impact` finding is traceable to an approved ID: `Yes`
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: the SR-003 citations hold. `memory-sync-service.ts:38-50` and `:91`, `memory-sync-worker.ts:62`, resolver `:151`, `store-utils.ts:101` (`withFilePathLock`) and `background-runner.ts:18` were all checked. `context-file-layout.ts:58-70` confirms that each run keeps its own copy.

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Fail | Needs Correction | AR-008 (each piece waits on other sources' commit locks) |
| BEH-003/004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Fail | Needs Correction | AR-007 (copy target not written atomically) |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope | Linked | Complete | Consistent | Status / Approval | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/large-file-sync-probe.e2e.test.ts.txt` | Pass | Pass | Pass | Pass | Pass (evidence only) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for the task posture | Pass | Unchanged from round 1 | — |
| Root cause explicit and evidence-backed | Pass | Unchanged | — |
| Refactor decision explicit | Pass | Yes, now | — |
| Decision reflected in design sections | Pass | Plus run gate, staged placement, DS-006 | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade vs Owner | Naming | One Owner Per Node, In Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary run | Pass | Pass (trigger, per-batch recording, run gate) | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary staged transfer | Pass | Pass (prefix hash, exact `size`, 409) | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Primary commit | Pass | Fail (the copy branch of `placeStagedFile` writes the target in place) | Pass | Pass | Pass | Pass | Fail (AR-007) |
| DS-004 | Bounded local change plan | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Return/event | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Bounded local sweep | Pass | Fail (runs before every hub request and takes every source's manifest lock) | N/A | Pass | Pass | Fail (global work on every piece's critical path) | Fail (AR-008) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySyncService` | Pass | Pass | Pass | Pass | Trigger is a parameter of the service entry; worker/resolver still depend only on it |
| `MemoryHubIngestionService` | Pass | Pass | Pass | Pass | — |
| `LocalFileMemoryImportStore.commitBatch` | Pass | Pass | Pass | Pass | Owns the grouping and the verify-all-then-write rule |
| `MemoryHubStagedFileStore` | Pass | Pass | Pass | Pass | `placeStagedFile` only inside the commit lock; startup loader calls only `sweepStale()` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Shortcuts Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| source / hub / shared / api rules | Pass | Pass | Pass | Pass | Unchanged |
| `startup/memory-hub-staging-sweep-loader.ts` → hub staged store, capability check | Pass | Pass | Pass | Pass | Same shape as `memory-sync-worker-loader.ts` |

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Staged-file GET/PUT, batches POST | Pass | Pass | Pass | Low | Pass |
| `startSync(trigger)`, `runOnce(trigger)`, `planChangedFiles(…, trigger, now)`, `isDue(…, trigger, now)` | Pass | Pass | Pass | Low | Pass (AR-002 resolved) |
| `placeStagedFile(sourceId, sha256, targetPaths[])` | Pass | Pass | Pass | Low | Pass (write mechanics: AR-007) |
| `sweepStale()` (all sources) | Pass | Pass | Pass | Low | Pass (call cadence: AR-008) |
| GraphQL fields | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Startup job | Pass | Pass | Pass | Pass | Reuses the `background-runner.ts` task list |
| Lock for sweep vs commit | Pass | Pass | N/A | Pass | Reuses `withFilePathLock`; how often it is called is AR-008 |
| Others | Pass | Pass | — | Pass | Unchanged from round 1 |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-sync/source`, `hub`, `shared`, `api`, web | Pass | Pass | Pass | Pass | — |
| `startup/` | Pass | Pass | Pass | Pass | One loader |

Both entry forms (background, manual) are now traced through the run gate to `isDue`.

## Reusable Owned Structures Verdict

Unchanged from ARCH-REV-001: `Pass` (limits gain `MEMORY_SYNC_BATCH_STAGED_BYTES_BUDGET`; one owner).

## Shared Structure / Data Model Tightness Verdict

Unchanged: `Pass`. Derived consumers: `Pass`. Vocabulary (adds "run trigger"): `Pass`.

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-sync-service.ts` (run gate with trigger) | Pass | Pass | Pass | Pass | — |
| `memory-sync-worker.ts` | Pass | Pass | N/A | Pass | — |
| `memory-hub-staged-file-store.ts` | Pass | Pass | N/A | Pass | AR-007 |
| `memory-hub-ingestion-service.ts` | Pass | Pass | N/A | Pass | AR-008 |
| `startup/memory-hub-staging-sweep-loader.ts` | Pass | Pass | N/A | Pass | — |
| Remaining | Pass | Pass | — | Pass | Unchanged |

## Subsystem / Folder / File Placement Verdict

`Pass` (unchanged; one startup loader beside `memory-sync-worker-loader.ts`).

## Removal / Decommission Completeness Verdict

`Pass` (unchanged; nothing new becomes obsolete).

## Legacy / Backward-Compatibility Verdict

`Pass` (unchanged; no mixed-version handling, per rule 9).

## Persisted-Data Transition Verdict

| Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Source state `fileFailures` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| Hub staging | Not Affected (disposable; lifetime stated) | Pass | Pass | N/A | Pass | — |
| Manifest / imports | Not Affected | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

`Pass` (sequence unchanged; startup loader in step 2/3 implied by the file mapping).

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Same content twice | Yes | Pass | Pass | Pass | — |
| Staged budget | Yes | Pass | Pass | Pass | — |
| Sync now during a background run | Yes | Pass | Pass | Pass | — |
| Resume | Yes | Pass | Pass | Pass | Fixed |
| Others | — | Pass | Pass | Pass | Unchanged |

## Material Premise Validation

MP-001 (same SHA-256 twice in one batch) and MP-002 (abandoned partial whose source never returns) are unchanged and now handled. MP-003 (verification time) is bounded by the 4 GiB staged budget; it stays `Unclear` and will be measured in the AC-003 run, which is acceptable.

### MP-004 — A source's piece upload waits behind another source's commit

- Related approved requirement: REQ-002, REQ-003 (large files transfer and resume); project `DESIGN.md` rule 3 (justify critical-path dependencies and global work).
- Relevant behavior ID(s): BEH-002
- Initiating basis kind: `System`
- Independent trigger: several sources sync to one hub, each on its own background interval (the hub is "a central read-only corpus … from several nodes", investigation notes, Product understanding). Source B commits a batch that has staged files while source A is uploading pieces.
- Forward path: A `PUT` piece → `MemoryHubIngestionService.receiveStagedFilePiece` → `sweepStale()` **before** handling (DS-006) → for every source folder, `withFilePathLock(<that source's manifest path>)`. This is an in-process queue plus a cross-process `wx` lock file with retry (`store-utils.ts:40-125`). B's folder lock is held by B's `commitBatch`, which hashes up to 4 GiB, or one file up to 10 GiB, inside that lock (DS-003, Key Tradeoffs) → A's `PUT` waits for B's whole verification and write.
- Consequence: every piece of A (1,280 pieces for a 10 GiB file) can wait tens of seconds behind another source's commit. Sources that the per-source lock was meant to keep independent become coupled. Every hub request also takes and releases one lock file per source. A long wait reaches the source as a slow or timed-out request, which counts as a run-level error.
- Reachability: `Reachable` (several sources per hub is the product's purpose; background runs overlap in normal operation).
- Review consequence: AR-008.

### MP-005 — A reader sees a partly copied imported file

- Related approved requirement: REQ-009; preserved invariant "nothing partial is ever visible in the imported Memory view"; AC-009.
- Relevant behavior ID(s): BEH-007
- Initiating basis kind: `User` + `System`
- Independent trigger: the same > 8 MiB content committed to two targets in one batch (MP-001 trigger) while the hub owner has the imported source open in the Memory page (`memory-explorer-source-service.ts:83`, root `imports/<id>`).
- Forward path: `placeStagedFile(S, [t1, t2])` → "copy to all but the last" writes `t1` in place (no temp + rename stated) for the length of a multi-GiB copy → the explorer lists and reads `t1` during the copy.
- Consequence: a truncated file is visible under imports while the copy runs, which breaks the stated invariant. Inline writes and the rename branch are atomic (`local-file-memory-import-store.ts:208-211`).
- Reachability: `Reachable` (the window is short but real).
- Review consequence: AR-007.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Fail`. All six ARCH-REV-001 findings and R-AR-1 are resolved in the current spec. Two new defects come from the SR-003 changes: one Medium, one Low wording fix. Both are small.

## Findings

### AR-007 — `placeStagedFile` copies are not atomic

- Type: `Design Impact`; Severity: Low; blocking (one-line spec fix)
- Protects: REQ-009, AC-009, preserved invariant "nothing partial visible"
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: MP-005. DS-003 narrative, Ownership Map and the "Same content twice" example say "copy to all but the last, rename to the last", with no temp step for the copies. Today's inline write uses temp + rename (`local-file-memory-import-store.ts:208-211`).
- Required update: state that each copy goes to a temp file next to its target (the same naming as inline writes) and is then renamed onto the target. Only the last target takes the staged file by rename. Add an assertion to the import store test.
- Recipient: Solution Designer

### AR-008 — The all-source sweep runs before every hub request and waits on other sources' commit locks

- Type: `Design Impact`; Severity: Medium; blocking
- Protects: REQ-002, REQ-003 (large transfers complete and resume), REQ-005 (one source's large file must not stall others); project `DESIGN.md` rule 3
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: MP-004. DS-006 and the Ownership Map say `sweepStale()` runs "before handling any staged-file request or batch commit (any source)" and takes each source's manifest lock. That lock is held during multi-GiB verification (DS-003). `withFilePathLock` also creates a cross-process lock file (`store-utils.ts:40-125`).
- Required update: take the sweep off the request path. The sweep's purpose is removing partials older than 24 h, so a sweep every few minutes is enough. Either:
  - let the ingestion service start a sweep at most once per interval (for example once an hour) without the request waiting for it, plus the startup run; or
  - run it from the startup loader and on a timer.

  Keep the per-source manifest lock inside the sweep, so it still cannot remove a staged file between a commit's verify and write. Say who owns the interval (the staged store or the ingestion service; one owner). Update the DS-006 trigger, the Ownership Map, the Interface notes, the Risks "Sweep cadence" line and the unit test ("a piece request does not wait for a sweep").
- Proportionate because: it is a call-site change. Without it, large uploads from one source are throttled whenever another source commits.
- Recipient: Solution Designer

## Classification

`Design Impact` (both findings).

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- R-AR-1 (reduced): verification time per batch is bounded by the 4 GiB budget or one file. The AC-003 run records the actual time against the 300 s fetch default.
- Sync now holds the GraphQL mutation open until the queued manual run ends. Today it already waits for the whole run, so this is the same pattern with a longer worst case.
- Copying one content to several targets costs one extra write per extra target, inside one source's lock. This is acceptable.
- R-003 release order with `autobyteus-workspace-6`; `generated/graphql.ts` fresh-start build at delivery.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-004 and MP-005 are reachable with independent triggers)
- Notes: AR-001..AR-006 resolved; new AR-007 (Low) and AR-008 (Medium), both `Design Impact`. Classification `Large` / `High` unchanged.
