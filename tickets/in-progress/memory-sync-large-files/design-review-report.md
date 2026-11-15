# Design Review Report — memory-sync-large-files

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `…/memory-sync-large-files/investigation-notes.md`
- Upstream Solution Revision Record: `…/memory-sync-large-files/solution-revision-record.md`
- Reviewed Design Spec: `…/memory-sync-large-files/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed: `probes/large-file-sync-probe.e2e.test.ts.txt` (evidence only); `follow-ups.md`; `handoff-sr-002.md`
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `…/memory-sync-large-files/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer handoff SR-002 (Architecture Design Complete, `Large` / `High`)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `task/memory-sync-large-files` @ `4c3e47f76` (base `origin/personal` @ `3d738de6e`). Opened: `memory-sync-service.ts`, `local-memory-export-scanner.ts`, `memory-file-change-planner.ts`, `memory-hub-client.ts`, `memory-hub-response-parser.ts`, `local-file-memory-sync-state-store.ts`, `memory-sync-worker.ts`, `local-file-memory-import-store.ts`, `memory-hub-ingestion-service.ts`, `memory-sync-batch-identity.ts`, `memory-hub-config.ts`, `api/rest/memory-sync.ts`, `shared/memory-sync-types.ts`, `api/graphql/types/memory-sync.ts`, `persistence/file/store-utils.ts:213-228`, `context-files/store/context-file-layout.ts`, `context-files/services/context-file-finalization-service.ts`, `memory-hub-credential-service.ts:28-29`, `MemorySyncCard.vue:122`, root `DESIGN.md` rules 1–12.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three subsystems (source, hub, owner surface; ~20 files), a new node-to-node contract (staged-file routes, `staged` encoding), a new hub persistence area with lifecycle, an additive source-state field, a changed run lifecycle. Confirmed against the code read.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. Design approval `Not required` (not `Pending`).

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes — transfer (not skip) large files as raw bounded pieces, keep every request < 50 MiB, stream-hash changed files and skip unchanged ones, per-file outcomes with backoff, owner visibility, same-release contract (rule 9), nothing partial visible on the hub.
- Relevant existing behavior and evidence confirmed: Yes. Run is all-or-nothing (`memory-sync-service.ts:66-119`); scanner reads and hashes every file whole (`local-memory-export-scanner.ts:83-105`); planner caps at `maxOperations` and base64s (`memory-file-change-planner.ts:43-46,58-80`); route `bodyLimit: 50 MiB` (`api/rest/memory-sync.ts:43`); hub writes operations one by one inside the manifest lock, so a later failure leaves earlier files written but unrecorded (`local-file-memory-import-store.ts:139-154`); digest covers metadata only (`memory-sync-batch-identity.ts:5-16`).
- Scope guardrail confirmed: Yes (UC-001..UC-004; delete/delta/compression, size-exclusion setting, proxies, context-file limits out of scope; preserved BEH-007/BEH-008, AC-006/AC-007).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`
- Remaining material ambiguity: SCN-004 vs design on connection drops (AR-005; both artifacts owned by the Solution Designer).
- Statements about existing code the design relies on, opened at their cited lines: all cited lines checked and accurate (service 52-120, scanner 83-105, planner 27-80 / 43-46 / 58-80, client 32-50, route 41-54, store 104-212 / 139-154, store-utils 213-228, route-permissions prefix rule, batch identity 5-16, ingestion import at line 3). One uncited premise is missing from the design: Sync now and the background tick reach the same `startSync()`/`runOnce()` with no trigger distinction (`memory-sync-service.ts:38-50`, worker `:62`, resolver `memory-sync.ts:151`) — see AR-002.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Fail | Needs Correction | AR-002 (Sync now path), AR-006 (outcome recording per batch) |
| BEH-002 | System | Pass | Pass | Fail | Needs Correction | AR-001 (duplicate SHA-256 staged ops), AR-004 (resume read-hash) |
| BEH-003/004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | Contract | Pass | Pass | Fail | Needs Correction | AR-001 (verify-all-then-write invariant), AR-003 (abandoned partial removal) |
| BEH-008 | System | Pass | Pass | Pass | Confirmed | AR-005 only aligns SCN-004 wording |

Basis is `Confirmed` (approved intent, trigger and current state are clear); the `Needs Correction` rows are target-path defects in the design, reported below.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/large-file-sync-probe.e2e.test.ts.txt` | Pass | Pass | Pass | Pass | Pass (evidence only) | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Bug Fix + Larger Requirement | — |
| Root-cause classification is explicit and evidence-backed | Pass | Missing Invariant + Responsibility Drift, cited at planner 43-46/58-80, service 73-93/148-154 (verified) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes, refactor now | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Scanner/change planner/batch planner/transfer/stager/failure policy split reflected in ownership, file mapping and removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary run | Pass | Fail (when outcomes are recorded; how Sync now reaches the due rule) | Pass | Pass | Pass | Pass | Fail (AR-002, AR-006) |
| DS-002 | Primary staged transfer | Pass | Fail (resume hash) | N/A | Pass | Pass | Pass | Fail (AR-004) |
| DS-003 | Primary commit | Pass | Fail (duplicate SHA-256 take) | Pass | Pass | Pass | Pass | Fail (AR-001) |
| DS-004 | Bounded local change plan | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Return/event owner visibility | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `MemorySyncService` | Pass | Pass | Pass | Pass | Worker and resolver depend only on it; AR-002 adds a trigger argument, not a bypass |
| `MemoryHubIngestionService` | Pass | Pass | Pass | Pass | Routes call only ingestion; same enabled + binding checks for staged calls |
| `LocalFileMemoryImportStore.commitBatch` | Pass | Pass | Pass | Pass | Import store calls staged store verify/take; ingestion does not commit staged files |
| `MemoryHubStagedFileStore` | Pass | Pass | Pass | Pass | Nothing outside `hub/` touches staging |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `source/*` → `shared/*`, `hub/memory-hub-config.ts` | Pass | Pass | Pass | Pass | As today |
| `hub/*` → `shared/*` (+ existing config service import) | Pass | Pass | Pass | Pass | — |
| `shared/memory-sync-transfer-limits.ts` | Pass | Pass | Pass | Pass | Imports nothing |
| `api/rest/memory-sync.ts` | Pass | Pass | Pass | Pass | Ingestion, errors, limits only |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `GET …/sources/:id/staged-files/:sha256` | Pass | Pass | Pass | Low | Pass (sweep scope: AR-003) |
| `PUT …/staged-files/:sha256?offset=` | Pass | Pass | Pass | Low | Pass |
| `POST …/batches` (`base64` \| `staged`) | Pass | Pass | Pass | Low | Pass (duplicate-SHA rule: AR-001) |
| `MemoryHubIngestionService.getStagedFileStatus / receiveStagedFilePiece` | Pass | Pass | Pass | Low | Pass |
| `MemoryHubStagedFileStore.*` | Pass | Pass | Pass | Low | Pass |
| `MemorySyncBatchTransfer.send(batch, context)` | Pass | Pass | Pass | Low | Pass |
| `MemorySyncService.startManualSync / startSync` | Pass | Fail | Fail | Medium | Fail (AR-002: no trigger reaches the due rule) |
| GraphQL `fileFailureCount`, `fileFailures`, `failedFiles` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-file status | Pass | Pass | N/A | Pass | Extends source state + GraphQL status |
| Locked atomic JSON | Pass | Pass | N/A | Pass | `store-utils` |
| Hub commit | Pass | Pass | N/A | Pass | One manifest owner |
| Access control | Pass | Pass | N/A | Pass | Prefix rule `/rest/memory-sync` |
| Binary parsing | Pass | Pass | N/A | Pass | Scoped Fastify parser, premise probed |
| Streaming hash | Pass | Pass | Pass | Pass | Shared by source planner and hub staged store |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `memory-sync/source` | Pass | Pass | Pass | Pass | Service calls each mechanism itself; transfer calls stager; no passed-in collaborator functions |
| `memory-sync/hub` | Pass | Pass | Pass | Pass | — |
| `memory-sync/shared` | Pass | Pass | Pass | Pass | Only truly shared items |
| `api/rest`, `api/graphql/types` | Pass | Pass | Pass | Pass | — |
| `autobyteus-web` settings | Pass | Pass | Pass | Pass | — |

Both entry forms of a run (background tick, Sync now) are not traced separately to the due rule — AR-002 (Principle 1, several entry forms).

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Transfer limits | Pass | Pass | Pass | Pass | Source budget and hub limit from one file |
| Streaming SHA-256 | Pass | Pass | Pass | Pass | Replaces three `sha256Buffer` copies on touched paths |
| Operation union | Pass | Pass | Pass | Pass | Discriminated by `contentEncoding` |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `MemoryFileOperation` union | Pass | Pass | Pass | Pass | Pass | — |
| `MemorySyncFileFailure` | Pass | Pass | Pass | N/A | Pass | `size`/`mtimeMs` = fingerprint the failure applies to |
| `MemoryFileEntry` / `ChangedMemoryFile` | Pass | Pass | Pass | Pass | Pass | Replaces `MemoryFileDescriptor` |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (state readers, wire digest, run result, manifest).

Each domain word keeps one meaning (Principle 15): `Pass` (staged file / piece / file failure / due; no glossary entry needed, recorded).

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Matches Owner/Boundary? | Re-Tightened After Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `shared/memory-sync-transfer-limits.ts` | Pass | Pass | N/A | Pass | — |
| `shared/memory-sync-file-hash.ts` | Pass | Pass | N/A | Pass | — |
| `shared/memory-sync-types.ts` | Pass | Pass | Pass | Pass | — |
| `source/local-memory-export-scanner.ts` | Pass | Pass | Pass | Pass | Stat only |
| `source/memory-file-change-planner.ts` | Pass | Pass | Pass | Pass | — |
| `source/memory-sync-batch-planner.ts` | Pass | Pass | N/A | Pass | Natural home for an AR-001 source-side rule if chosen |
| `source/memory-sync-batch-transfer.ts` | Pass | Pass | N/A | Pass | — |
| `source/memory-file-stager.ts` | Pass | Pass | N/A | Pass | AR-004 |
| `source/memory-sync-file-failure-policy.ts` | Pass | Pass | N/A | Pass | — |
| `source/memory-sync-service.ts` | Pass | Pass | Pass | Pass | AR-002, AR-006 |
| `hub/memory-hub-staged-file-store.ts` | Pass | Pass | N/A | Pass | AR-003 |
| `hub/local-file-memory-import-store.ts` | Pass | Pass | Pass | Pass | AR-001 |
| Remaining mapped files | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Flat `source/`, `hub/`, `shared/` | Pass | Pass | Low | Pass | Existing pattern |
| `<memoryDir>/memory-sync-staging/<sourceId>/<sha256>.partial` | Pass | Pass | Low | Pass | Same file system as `imports/`, outside every reader (explorer root is `imports/<id>`, scanner roots `agents/`, `agent_teams/`) |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Scanner whole-file read + `sha256Buffer` | Pass | Pass | Pass | Pass | — |
| Planner `buildReplaceOperation`, `maxOperations`, "batch limit reached" | Pass | Pass | Pass | Pass | — |
| `MemorySyncService.chunkOperations` | Pass | Pass | Pass | Pass | — |
| Route literal `50 * 1024 * 1024` | Pass | Pass | Pass | Pass | — |
| `MemoryFileDescriptor.sha256` | Pass | Pass | Pass | Pass | — |
| Import store `sha256Buffer` / base64-only guard (`:42`, `:194-196`) | Pass (implied by "extended" commit) | Pass | Pass | Pass | Implementation removes the "requires base64" guard as part of the union |
| Dead code in touched files | Pass | N/A | Pass | Pass | Grep evidence recorded |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Inline vs staged encodings | No (two encodings of one current protocol, each with a size rule) | Pass | Pass | — |
| Old-hub detection / base64 fallback / v2 route | No (rejected, rule 9) | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Source state `fileFailures` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Absence = no failure = every changed file due (today's behavior); existing `files` records keep sha256 + mtime so the size+mtime fast path works without a re-sync |
| Hub staging | Not Affected (new, disposable) | Pass | Pass | N/A | Pass | Removal rule incomplete — AR-003 |
| Hub manifest / imports | Not Affected | Pass | Pass | N/A | Pass | Shape unchanged |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Shared → hub → source → GraphQL/web → tests/docs | Pass | Pass (none needed) | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Batch cutting | Yes | Pass | Pass | Pass | Arithmetic checked |
| Isolation / run-level | Yes | Pass | Pass | Pass | — |
| Resume | Yes | Fail | N/A | Fail | Example omits hashing the received prefix (AR-004) |
| Card | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### MP-001 — Two staged operations with the same SHA-256 in one batch

- Related approved requirement or established contract: REQ-009, REQ-005; preserved invariant "a file appears only after verification; nothing partial"; design's own "verify every operation before writing any".
- Relevant behavior ID(s): BEH-002, BEH-007
- Initiating basis kind: `User`
- Independent trigger: the owner attaches the same video (> 8 MiB) to two runs (composer attach → `ContextFileFinalizationService.finalizeDraftAttachments` stores a copy under each run's `context_files/`, `context-file-layout.ts:58-70`). Also SCN-003 (first sync of a corpus that already holds such duplicates).
- Support evidence: attach is an exposed product surface; nothing prevents attaching one file to two runs.
- Forward path: both files are changed in one sync → change planner hashes both to the same SHA-256 → batch planner puts both in one batch when they fall within `batchSize` → stager: first `GET` 0 and uploads, second `GET` = size, "done" → `POST` batch → hub verifies both (staged file exists for both) → write phase: first `takeStagedFile` renames `<sha>.partial` into imports; second take finds no staged file → throws inside the manifest lock.
- Lifecycle preconditions and consequence: manifest not written, first file already in `imports/` but unrecorded (exactly what the verify-first change is meant to prevent, investigation notes on `local-file-memory-import-store.ts:139-154`); staging consumed; batch answered 400 → split → single posts find no staged file → both recorded as failures, and the next run repeats the full upload into the same collision (unless the split re-stages, which the design does not say).
- Reachability: `Reachable`
- Review consequence: AR-001.

### MP-002 — A partial transfer whose source never calls the staged-file status route again

- Related approved requirement: REQ-009 ("partial transfers … are removed when abandoned"), AC-009 ("abandoned partials removed after their expiry").
- Relevant behavior ID(s): BEH-007
- Initiating basis kind: `Operational`
- Independent trigger: the hub owner revokes the source's credential (`revokeMemoryHubSourceCredential`, `api/graphql/types/memory-sync.ts`), or the source owner turns Memory Sync off / changes hub, during or after an interrupted large transfer.
- Forward path: pieces appended to `memory-sync-staging/<sourceId>/<sha>.partial` → no further requests from that source → the only sweep is in `GET …/sources/:id/staged-files/:sha256` for that same source (design Interface table) → never runs.
- Consequence: up to the file size (2 GiB default, 10 GiB max) stays on the hub's disk indefinitely, contrary to REQ-009/AC-009.
- Reachability: `Reachable`
- Review consequence: AR-003.

### MP-003 — Long hub-side verification of a batch with many large staged files exceeds the source's HTTP timeouts

- Related approved requirement: REQ-001/REQ-002 (all files sync), AC-003.
- Initiating basis kind: `User` (several multi-GiB attachments changed in one interval, or SCN-003 first sync).
- Forward path: up to `batchSize` (≤ 200, default 25) staged files in one batch → hub hashes every staged file inside the one `POST` before answering → Node `fetch` (undici) default response-headers timeout.
- Consequence would be a timeout seen as a run-level error while the hub still commits; whether it occurs depends on hub disk throughput and the total staged bytes per batch, which the design does not bound.
- Reachability: `Unclear` (throughput/timeout not measured).
- Review consequence: non-blocking recommendation R-AR-1 below; not a finding.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| SCN-004 lists "connection drops" with outcome "failing file recorded; others continue"; the design classifies network errors as run-level | Cross-artifact inconsistency on one supported scenario | AR-005 | Open |

## Review Decision

`Fail` — the behavior basis is confirmed and the overall architecture (owners, boundaries, encodings, persisted-data decision, removal plan) is sound, but the target path has reachable defects in DS-001/DS-002/DS-003 that need a design revision before implementation.

## Findings

### AR-001 — Two staged files with the same content in one batch break the verify-then-write commit

- Type: `Design Impact`; Severity: High; blocking
- Protects: REQ-009 and the preserved invariant (nothing visible unless verified and recorded); REQ-005 / AC-004 (one file never blocks others); AC-001
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: MP-001. Staging name is the content SHA-256 per source (design Terminology, Interface table); `takeStagedFile` renames the staged file (Ownership Map); verify-all runs before any take, so two ops sharing one SHA both pass verification and the second take fails during the write phase.
- Required update: define one rule for a SHA-256 used by several staged operations, owned by one node, so the write phase cannot fail on it. For example: the batch planner puts at most one staged operation per SHA-256 into a batch (the later file goes to the next batch and is staged again), **or** the import store's commit places the staged content at every target of that SHA (link/copy, then remove the staged file once). Also state that the import store's verification refuses a batch whose staged operations it cannot all write, before writing anything. Add the case to the batch planner or import store unit tests.
- Proportionate because: one pure-function rule or one commit-side rule; without it, a normal attach pattern produces an unrecorded file in imports and a repeating multi-GiB re-upload loop.
- Recipient: Solution Designer

### AR-002 — The Sync now path to the due rule is not designed

- Type: `Design Impact`; Severity: Medium; blocking
- Protects: REQ-005, AC-004 ("next background run does not retry it before its delay; Sync now retries it"), DEC-005
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: `startManualSync()` only calls `startSync()` (`memory-sync-service.ts:38-40`); the worker calls `startSync()` (`memory-sync-worker.ts:62`); `runOnce()` has no trigger argument; `startSync()` returns the in-flight run when one is running (`:43-45`). The design's due rule says "or the run is Sync now" (Terminology; DS-004) but no spine, interface or ownership entry says how the run learns its trigger. The design also says a run with a 2 GiB file lasts minutes, so Sync now during a background run is a normal case: as coded today it joins that run and the failing file is not retried.
- Required update: name the trigger in DS-001 and the interface table (for example `runOnce({ trigger: "manual" | "background" })` from `startManualSync` / `startSync`, passed by the service to the change planner's due decision), and decide what Sync now does while a background run is in progress (join it and state that failing files wait for the next Sync now; or start a manual run after it). Who drives: `MemorySyncService` decides the trigger and calls the change planner with it; the failure policy's `isDue` takes it as data.
- Proportionate because: one argument and one stated rule; without it AC-004 is not implementable from the design.
- Recipient: Solution Designer

### AR-003 — Abandoned partials are removed only when the same source comes back

- Type: `Design Impact`; Severity: Medium; blocking
- Protects: REQ-009 ("removed when abandoned"), AC-009 ("abandoned partials removed after their expiry")
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: MP-002. The only sweep is in the staged-file `GET` for the requesting source (Interface table: "sweeps that source's stale partials"); `MemoryHubStagedFileStore.sweepStale` has no other caller in the design.
- Required update: give the sweep a trigger that does not depend on that source returning — for example, the staged store sweeps every source folder under `memory-sync-staging/` (partials older than `MEMORY_SYNC_STAGED_FILE_MAX_AGE_MS`, and empty source folders) whenever any staged-file request or batch commit reaches the hub, and/or at hub start. Name the caller (the ingestion service, which already guards every hub call) and add the case to the staged store tests.
- Proportionate because: a directory listing under one folder; without it the hub keeps up to 10 GiB per abandoned transfer forever.
- Recipient: Solution Designer

### AR-004 — Resume and the source-side read-hash check contradict each other

- Type: `Design Impact`; Severity: Low; blocking (spec error)
- Protects: REQ-003, AC-005 ("next attempt sends only the remaining bytes; result identical")
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: DS-002 narrative and the stager's bounded local spine: read from the hub's received offset, "hash what it reads", then compare with the planned SHA-256 → a resumed transfer hashes only the tail, never matches, and would always be deferred "changed while being read". The spine also does not say the stager reads exactly the planned `size` bytes (an actively appended trace, SCN-002, grows past it).
- Required update: state that on resume the stager hashes the already-received prefix `[0, receivedBytes)` from the local file without sending it, then continues; that it reads exactly `size` bytes; and fix the resume example. (Alternatively drop the source-side check and rely on hub verification with its file-failure outcome — but say which.)
- Recipient: Solution Designer

### AR-005 — Connection drops: SCN-004 and the design disagree

- Type: `Design Impact` (cross-artifact consistency; both artifacts owned by the Solution Designer); Severity: Low; blocking
- Protects: REQ-005, REQ-006, AC-005, AC-006
- Scope status: `Within Approved Scope`; changes approved behavior: No if the design wording is kept and SCN-004 is aligned
- Evidence: requirements SCN-004 lists "connection drops" with outcome "failing file recorded; others continue; retry later, resume large". The design's Concrete Examples treat any network error as run-level (rethrow, job `error`), which matches REQ-006 ("hub unreachable") and still satisfies AC-005 through resume on the next run.
- Required update: make one statement in both documents — the design's classification (network error during a piece or batch = run-level, the next run resumes from the hub's received bytes) is coherent with REQ-006; align SCN-004's trigger/outcome wording, or design the alternative explicitly.
- Recipient: Solution Designer

### AR-006 — When the run records synced files is not stated

- Type: `Design Impact`; Severity: Low; blocking (clarity of DS-001)
- Protects: REQ-002/REQ-003 (large files are not re-sent after a run-level error), preserved per-batch recording (`memory-sync-service.ts:91`, `markOperationsSynced` after each batch)
- Scope status: `Within Approved Scope`; changes approved behavior: No
- Evidence: DS-001 shows `send (per batch) -> records outcomes` without saying whether recording happens after each batch or at the end. With network errors run-level (AR-005), a multi-GiB run that fails late would lose every synced record if recording is at the end; the staged files already taken on the hub would then be uploaded again in full.
- Required update: state that `MemorySyncService` records each batch's outcomes (`files`, `fileFailures`) right after that batch's `send` returns, before the next batch, as today.
- Recipient: Solution Designer

## Classification

`Design Impact` (all findings). No `Requirement Gap`: every fix stays within the approved requirements.

## Recommended Recipient

Solution Designer (`/software_engineering_team/solution_designer`).

## Residual Risks

- R-AR-1 (recommendation, non-blocking; MP-003 `Unclear`): the hub hashes every staged file of a batch inside one `POST`. With `batchSize` up to 200 and files up to 10 GiB, the total per batch is unbounded. Consider a staged-bytes budget per batch in the pure batch planner (as for inline bytes), or measure verification time against the source's fetch timeouts during the AC-003 run.
- Non-blocking clarification: Key Tradeoffs says staged hashing happens "before taking the manifest lock", while DS-003 and today's commit check duplicates inside the lock. Fine as long as the order is stated (outside the lock: verify all; inside: duplicate check, write, manifest). The source never resends a `batchId`, so a duplicate staged batch is not produced by the product.
- Non-blocking: the staged store should apply the same `requireMemorySyncReady()` guard as the import store (`local-file-memory-import-store.ts:48-50`) so staging is not touched while Memory Sync is held back.
- R-003 release order with `autobyteus-workspace-6` (carried by the design; must reach delivery).
- `generated/graphql.ts` fresh-start build at delivery (design Risks).

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-001, MP-002 reachable with independent triggers; MP-003 `Unclear`, kept out of the findings)
- Notes: AR-001..AR-006, all `Design Impact`, all for the Solution Designer. Classification `task_size: Large`, `architectural_risk: High` unchanged.
