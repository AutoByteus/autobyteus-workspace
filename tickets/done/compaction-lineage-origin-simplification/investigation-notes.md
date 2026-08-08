# Investigation Notes — Compaction Lineage Origin Simplification

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Complete — ready for architecture review`
- Investigation Goal: identify every current consumer and ownership boundary for compacted-output-to-raw origin, prove what current compaction actually needs, determine the safe removal boundary, and make an evidence-backed persisted-data decision.
- Scope Classification: `Medium`
- Scope Classification Rationale: behavior is predominantly preserved, but the clean removal crosses `autobyteus-ts`, `autobyteus-server-ts`, core schema/interface types, persisted JSONL reading/writing, tests, exports, and durable docs.
- Scope Summary: contract `CompactionLineageRecord`, decouple exact raw archival from compacted outputs, remove unused direct/recursive origin resolution, preserve current head/output loading and raw evidence, and perform no app-data migration.
- Primary Questions Resolved:
  - Does normal compaction or continuation read `rawTraceArchiveFile`? `No`.
  - Is direct/recursive output-origin resolution currently used by a product API/UI/service? `No supported consumer found`.
  - Which lineage fields remain operationally necessary? Scope, compaction/predecessor identity, output membership, and current audit fields.
  - Can raw archival remain exact without returning archive identity to compaction? `Yes`; the raw archive owner already validates and persists its own manifest segment.
  - Can existing lineage rows be read without migration? `Yes`; valid stored supersets can be projected to retained fields by the normal reader.

## Request Context

The user reconsidered the recently delivered direct relationship between raw trace archives and compacted episodic/semantic outputs. Their approved model is:

- current compaction owns bounded current-context replacement, accepted-output identity/membership, head/predecessor order, and the exact raw records to retire from active storage;
- raw traces and archives remain independent evidence;
- a future memory-maintenance effort may inspect the raw corpus, derive Work Evidence, and build hierarchical memory under a separately designed subsystem; and
- current code must not preserve unused provenance machinery merely because it could be useful later.

The user explicitly asked for a new ticket and plan to remove the relevant unused code and simplify the system. The user did not ask to reopen external-runtime snapshot behavior, runtime switching, or the completed external-runtime ticket.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification`
- Current Branch: `codex/compaction-lineage-origin-simplification`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: successful; worktree created from refreshed `origin/personal` commit `647b1119a9dc3ba2ba301243e1b5e752943454db`
- Task Branch: `codex/compaction-lineage-origin-simplification`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: the shared `personal` checkout had unrelated modified/untracked work and must not be used for ticket edits; all authoritative ticket work belongs in this dedicated worktree.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/persisted-lineage-inventory.md` | Read-only aggregate inspection of representative current lineage/output/archive data and target retained-field probe | File/row volume, shapes, output membership, archive presence, absence of verified record hashes, and direct-use result | Requirements persisted-data outcome; design transition decision | REQ-004, REQ-006 / AC-003, AC-004, AC-006, AC-007 | Complete | N/A — evidence only | Retain in all downstream cumulative handoffs. |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-08 | Setup | `git fetch origin personal`; dedicated worktree created from `origin/personal` | Ensure isolation and current base | Base and worktree both resolve to `647b1119...`; no bootstrap blocker | No |
| 2026-08-08 | Code | `autobyteus-ts/src/memory/compaction/accepted-compaction-builder.ts`; `accepted-compaction-committer.ts`; `working-context-compaction-proposal.ts` | Trace where archive identity enters the accepted record | Builder creates every lineage field except archive filename; committer archives, receives a descriptor, and injects only `archive.fileName`. This split exists solely because of the origin relation. | No |
| 2026-08-08 | Code | `autobyteus-ts/src/memory/memory-manager-compaction-coordinator.ts`; `compaction/pending-compaction-executor.ts`; `agent/llm-request-assembler.ts`; `agent/loop/llm-phase.ts` | Establish supported compaction trigger and main spine | Normal pending-compaction execution captures baseline, proposes, validates, commits, reports completion, then permits provider dispatch. Head identity and current output are live invariants. | No |
| 2026-08-08 | Code | `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts`; `compaction-lineage-store.ts`; `store/file-compaction-lineage-store.ts` | Identify persisted schema and store API ownership | Record currently requires safe `rawTraceArchiveFile`; store validates all rows and predecessor continuity. `getByCompactionId` and `findProducingRecord` support only the origin resolver. | No |
| 2026-08-08 | Code | `autobyteus-ts/src/memory/projection/current-compaction-output-loader.ts`; `projection/compacted-memory-projection-bundle.ts`; `memory-manager-compaction-coordinator.ts` | Verify current continuation dependency | Current load reads head, then exact episode/semantic rows. No archive path or origin resolver is consulted. | No |
| 2026-08-08 | Code | `autobyteus-ts/src/memory/store/base-store.ts`; `file-store.ts`; `run-memory-file-store.ts`; `raw-trace-archive-manager.ts`; `raw-trace-archive-manifest.ts` | Determine raw archive owner and whether descriptor is needed | Only the compaction committer consumes the high-level exact-archive descriptor. Raw store/manager already validates selected active IDs, creates/validates a complete segment, rewrites active storage, and owns boundary idempotency. | No |
| 2026-08-08 | Code | `autobyteus-ts/src/memory/lineage/compaction-lineage-resolver.ts`; `memory-origin-resolution.ts`; `autobyteus-server-ts/src/memory-lineage/services/agent-memory-origin-service.ts` | Inspect origin capability and server boundary | Resolver walks predecessors/archives and validates outputs; server only locates run/member memory and constructs it. No other responsibility exists in these files. | No |
| 2026-08-08 | Command | Repository-wide `rg` for `rawTraceArchiveFile`, `CompactionLineageResolver`, `AgentMemoryOriginService`, `MemoryOriginResolution`, `MemoryArtifactRef`, `findProducingRecord`, and `getByCompactionId` excluding build dependencies | Establish call graph and removal inventory | No supported origin production caller, GraphQL endpoint, or frontend consumer found. Consumers are resolver/service themselves, dedicated tests, one origin assertion in a broader integration test, exports, fixtures, and docs. | No |
| 2026-08-08 | Code | `autobyteus-ts/src/memory/index.ts`; `autobyteus-ts/package.json` exports | Verify public exposure | Root memory barrel exports origin symbols and wildcard package exports make deep source modules importable after build. Clean removal must delete exports/files, not leave stubs. | No |
| 2026-08-08 | Tests | `autobyteus-ts/tests/unit/memory/compaction-lineage-resolver.test.ts`; `file-compaction-lineage-store.test.ts`; `tests/integration/agent/memory-compaction-strategy-tool-lifecycle.test.ts`; server origin service test | Classify durable coverage | Two dedicated suites are origin-only; one broad integration test has a removable origin block but also important retained lifecycle/archive/output assertions. Store/fixture tests require contraction plus direct-use coverage. | API/E2E engineer owns final coverage investigation after implementation/code review. |
| 2026-08-08 | Docs | `autobyteus-ts/docs/agent_memory_design.md`; `agent_memory_design_nodejs.md`; `autobyteus-server-ts/docs/modules/agent_memory.md`; `autobyteus-server-ts/docs/ARCHITECTURE.md` | Find durable contract descriptions | All four explicitly describe the field and/or direct/recursive origin capability; they must describe independent raw archival and current-head output membership instead. | Delivery engineer owns final durable docs sync against integrated state. |
| 2026-08-08 | Code | `autobyteus-server-ts/src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.ts` plus lineage filename search | Check migration coupling | Migration checks only absent/zero/nonempty lineage file state and never parses record fields. Target contraction does not change eligibility. | No |
| 2026-08-08 | Doc | `tickets/done/memory-lineage-provenance-analysis/{requirements.md,investigation-notes.md,design-spec.md}` | Understand why current machinery exists | Origin relation/resolver was deliberately built as future/internal capability; no frontend provenance screen existed. Current user direction explicitly supersedes this unused portion, not the retained compaction recurrence/head model. | No |
| 2026-08-08 | Data | Read-only aggregate Python probe over `/Users/normy/.autobyteus/server-data/memory/**/compaction_lineage.jsonl` | Determine migration need without exposing user content | One file, two valid rows, 3,387 bytes; all retained validations and output references pass; generic retained-field projection omits obsolete extra; no file mutation observed. | Results promoted to `persisted-lineage-inventory.md`. |
| 2026-08-08 | Command | `rg 'recordSha256|integrity'` across source/tests | Check whether ignored field changes verified hashes | Optional hash is structurally parsed only; no computation or verification exists. Existing representative rows contain no integrity field. | No |
| 2026-08-08 | Command | `wc -l` on resolver/model/server service and dedicated tests | Estimate direct removal | 706 direct implementation/test lines before fixture, export, integration, and documentation cleanup. | No |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | System | A native run reaches a pending compaction before its next LLM request. | `LlmPhase` / `LLMRequestAssembler` -> `PendingCompactionExecutor.executeIfRequired` -> `MemoryManager` public compaction API -> `MemoryManagerCompactionCoordinator` -> builder/validator -> `AcceptedCompactionCommitter` -> raw/output/lineage/context/snapshot stores -> completed status/provider continuation. | Successful commit advances exactly one head, installs one complete replacement, clears pending only after effects, and reports failure rather than dispatching on an invalid proposal. | Pending executor, coordinator, committer, and runtime integration tests. |
| BEH-002 | System | A native run with a lineage head validates/loads current compacted context during baseline capture, restore, or projection. | `MemoryManagerCompactionCoordinator` -> `CurrentCompactionOutputLoader` -> `CompactionLineageStore.readHead` -> exact episodic/semantic store lookups -> projection bundle / WorkingContext invariant. | The tail is the only current replacement; exact membership/order must exist; archive identity is not read. | Current loader/coordinator and file-store/snapshot tests. |
| BEH-003 | Operational | Accepted native compaction supplies unique selected new raw IDs. | `AcceptedCompactionCommitter` -> `MemoryStore.archiveExactRawTraces` -> `RunMemoryFileStore` validates active membership -> `RawTraceArchiveManager.archiveRecords` -> complete manifest/file -> active rewrite. | Exactly selected rows leave active storage and remain in complete archive; unselected rows remain active. | Store source and runtime/snapshot/tool-lifecycle integration tests. |
| BEH-004 | Contract | Internal library/server code can be invoked with explicit scope plus `{kind, id}`; no supported initiating product surface/caller was found. | `AgentMemoryOriginService` -> location services -> `FileCompactionLineageStore` / `RawTraceArchiveManager` / `RunMemoryFileStore` -> `CompactionLineageResolver` predecessor/archive traversal. | Mechanically returns direct/recursive roots or typed errors, but it has no observed/supported product consequence. Product reachability classification for a real origin lookup is `Not Reachable` from current supported surfaces. | Repository-wide call graph; no GraphQL/UI/service consumer; dedicated tests are synthetic callers and do not establish product reachability. |
| BEH-005 | Operational | Normal target runtime opens an existing nonempty schema-version-1 lineage file. | `FileCompactionLineageStore.list/readHead` -> JSON parse -> `normalizeCompactionLineageRecord` -> scope/unique-ID/predecessor validation -> current loader. | Existing valid rows carry all retained head/output/audit meaning. Current normalizer selects known attributes; target can stop requiring/projecting the obsolete extra. | Current reader source and read-only representative probe. |
| BEH-006 | Contract | No current supported Work Evidence/hierarchical-memory maintenance trigger exists in this scope. | `No Current Path` for a future maintenance subsystem. Historical documentation only describes Work Evidence as a view/future concern. | Current compaction must not pre-build or bind that future subsystem. | User direction and historical ticket review. |

## Design Health Assessment Evidence

- Change posture: `Cleanup` / `Refactor`
- Candidate root cause classification: `Boundary Or Ownership Issue`
- Refactor posture evidence summary: refactor is needed now because raw archive identity crosses from the raw storage owner into the compaction record only to serve an unused origin owner. A complete accepted lineage record cannot currently exist until commit receives a storage descriptor. Removing that coupling makes both boundaries singular again.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Accepted builder/committer/type | `lineageDraft` is `Omit<CompactionLineageRecord, 'rawTraceArchiveFile'>`; committer patches the omitted field. | Shared shape is loose around a concern the accepted candidate does not own. Target should carry a complete `lineageRecord`. | Design exact rename/removal. |
| MemoryStore exact archive API | Returns an eight-field descriptor; only `fileName` has one caller, and no caller remains after contraction. | High-level command boundary exposes unused storage detail. Target should return `void`; raw manager retains its internal segment result. | Design interface contraction. |
| Origin resolver/server service | Entire server capability exists to locate and compose one unused core resolver. | Clear clean-cut removal; no replacement owner required. | Delete production files/exports/tests/docs. |
| Lineage store interface | `getByCompactionId` and `findProducingRecord` are used only by origin traversal. | Remove origin-only query responsibilities; preserve append/list/head ordering owner. | Design interface/store contraction. |
| Current output loader | Uses only head output IDs. | Contracted record is sufficient for supported behavior. | Preserve and regression-test. |
| Persisted probe | Existing stored objects are supersets of target and all retained validations pass. | No migration, version branch, or compatibility model is justified. | Add direct-use durable fixture coverage. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/memory-manager-compaction-coordinator.ts` | Baseline/head/current-context invariants and accepted commit entry | Requires head identity/output, not archive identity | Preserve as governing compaction owner. |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-builder.ts` | Build deterministic outputs, finalized context, almost-complete record | Archive omission forces a draft type | Build full contracted `lineageRecord`. |
| `autobyteus-ts/src/memory/compaction/accepted-compaction-committer.ts` | Sequence durable accepted effects | Couples archive descriptor into record | Call raw archive command independently, then append accepted record. |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-proposal.ts` | Proposal/accepted candidate types | `AcceptedCompactionLineageDraft` exists only for archive field | Remove alias; rename property to `lineageRecord`. |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-record.ts` | Current persisted record shape/normalizer | Mixes head/output/audit state with archive origin | Remove field and validation; retain generic recognized-field projection. |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-store.ts` | Lineage persistence contract | Includes two origin-only queries | Remove queries; preserve append/list/head. |
| `autobyteus-ts/src/memory/store/file-compaction-lineage-store.ts` | JSONL read/append/head/chain validation plus origin search | Origin search is separable and unused | Remove origin import/methods; retain ordered store. |
| `autobyteus-ts/src/memory/projection/current-compaction-output-loader.ts` | Hydrate current head output | Already independent of raw archives | Preserve. |
| `autobyteus-ts/src/memory/store/{base-store,file-store,run-memory-file-store}.ts` | Exact selected raw archival boundary/implementation | High-level descriptor and compaction ID cross the boundary only for prior linkage/idempotency | Contract to selected-ID command; raw owner derives boundary identity and validates completion. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Generic manifest/file archive mechanism | Internal result still needed for manifest/active rewrite; completed descriptor wrapper becomes unused | Keep generic manager; remove only unused high-level descriptor type. |
| `autobyteus-ts/src/memory/lineage/compaction-lineage-resolver.ts` | Direct/recursive output-origin traversal | No production consumer | Remove. |
| `autobyteus-ts/src/memory/lineage/memory-origin-resolution.ts` | Origin request/response/error shapes | Only resolver/service/tests use it | Remove. |
| `autobyteus-server-ts/src/memory-lineage/services/agent-memory-origin-service.ts` | Run/member location plus origin resolver composition | No production caller; folder contains only this service | Remove source file; no server replacement. |
| `autobyteus-ts/src/memory/index.ts` | Memory package barrel | Exposes removed contract | Remove origin exports; preserve lineage record/scope/store exports. |
| Four durable memory docs | Describe schema/origin contracts | Stale after target | Update to current head/output membership plus independent raw archives. |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-08 | Trace | Static trace from `LlmPhase` through pending executor/coordinator/committer | Archive filename flows only from archive result into lineage; continuation does not read it. | Remove cross-boundary return/field without changing supported continuation. |
| 2026-08-08 | Trace | Static trace from restore/baseline to `CurrentCompactionOutputLoader` | Tail output IDs and exact output rows are the current-context authority. | Preserve lineage head/output membership and predecessor validation. |
| 2026-08-08 | Probe | Aggregate-only Python script over current app-data lineage/output/manifest files | 2/2 rows valid under retained shape; 9/9 episodes and 58/58 semantics found; 2/2 historical archives present; zero errors; no concurrent file change. | `Directly Usable — No Migration`. |
| 2026-08-08 | Trace | Repository-wide origin call graph | Only synthetic tests and origin owners call the resolver/service. | Remove; tests cannot establish product reachability. |

## External / Public Source Findings

`N/A.` This cleanup is governed by current repository behavior and explicit user intent. No time-sensitive external API or standard is needed.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for investigation.
- Required config, feature flags, env vars, or accounts: none.
- External repos, samples, or artifacts cloned/downloaded: none.
- Setup commands that materially affected the investigation: remote refresh and dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: no scratch source files or data copies were created; persisted-data probes were read-only.

## Findings From Code / Docs / Data / Logs

1. The direct relation was real and deliberately implemented, not accidental dead text; removal must cover both the schema and the resolver composition path.
2. The relation is not needed by current compaction. Accepted recurrence needs predecessor/head and exact outputs; raw retirement needs selected raw IDs; these responsibilities need not share an archive locator.
3. Removing episodic/semantic outputs would break current-context loading and is therefore not part of simplification.
4. Removing raw archives would destroy independent evidence and current Event Monitor/history capabilities; archives remain first-class under the raw storage subsystem.
5. The raw archive manifest's generic boundary metadata is storage-owned. New native exact-archive operations can derive a stable key from selected raw IDs rather than receive a compacted-output/compaction identity. Existing manifest rows remain untouched.
6. The name `compaction_lineage.jsonl` still truthfully describes predecessor/head history and exact output membership. Renaming it would create unnecessary persisted-data and documentation churn.
7. Schema version 1 can remain: the target current reader recognizes the same authoritative record subject and retained invariants, accepts stored supersets generically, and writes the clean contracted shape. Introducing version 2 would either make existing rows unreadable or force prohibited dual-version runtime logic/migration.
8. The broader tool-lifecycle integration suite must retain compaction, raw archive, current projection, and tool-protocol assertions while deleting only its origin resolver block/imports.
9. No startup migration reads the removed field. The existing native snapshot migration's nonempty-lineage gate is unaffected.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: one representative run-local `compaction_lineage.jsonl`, two schema-version-1 rows, 3,387 bytes, each with scope, compaction/predecessor IDs, `rawTraceArchiveFile`, output IDs, derivation time, and execution metadata. Full aggregate evidence is in `persisted-lineage-inventory.md`.
- Relevant code-model, serialization, semantic, or physical-store change: remove one recognized/required origin field from the in-memory type and new JSONL writes; ignore it as an unknown extra in existing JSON objects. Raw manifests/files are not changed.
- Normal readers and writers, including unknown/extra-field behavior: `normalizeCompactionLineageRecord` builds a new object from recognized fields and does not reject unknown root keys. Target removes the read/validation/return of the obsolete field. `FileCompactionLineageStore` then validates retained scope/order. The writer JSON-serializes the normalized target record.
- Representative direct-read or compatibility evidence: all representative rows pass target retained-field validation, output membership resolution, scope consistency, unique/linear-chain checks, and recognized-only projection. The obsolete key disappears from projected objects without disk mutation.
- Required semantics and invariants preserved by direct use: `Yes` — current head, order, scope, output membership, derivation/execution audit, and raw archive contents all remain available.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: lineage is append-only; raw archives are evidence and must not be rewritten/deleted. Ignoring extra JSON is safer than rewriting. No privacy-driven erasure requirement applies to the obsolete filename.
- Concrete benefit, cost, and risk of migration if it remains a candidate: no correctness benefit. It would only remove dormant bytes while adding I/O, interruption/corruption exposure, backup/rollback work, deployment sequencing, and migration-ledger complexity.
- Existing migration framework or lifecycle constraints: server has a startup migration runner, but no migration is justified and none should be added.

## Constraints / Dependencies / Compatibility Facts

- Clean-cut target only: no deprecated origin exports, stubs, legacy fields, dual readers/writers, version-specific branches, fallback API, or schema-rewrite migration.
- Generic unknown-extra projection is normal current-reader behavior, not a historical compatibility layer.
- Retained native compaction effect ordering and failure behavior must not be weakened.
- External runtime raw-only recording and provider compaction boundaries share raw archive infrastructure but do not use native lineage; their APIs/behavior must remain unchanged.
- `RawTraceArchiveManager.archiveRecords` remains generic because external/provider archive flows use it. Only the native exact-archive high-level wrapper is contracted.
- `previousCompactionId` remains required for ordered successful-head continuity and concurrent baseline checks, even though recursive origin traversal is removed.
- Output IDs remain required because the newest head selects the exact current replacement bundle.
- No user-data content was included in investigation artifacts.

## Open Unknowns / Risks

- No blocking unknown remains.
- Implementation risk: over-deleting generic raw archive APIs used by external runtimes. The design must remove only the native exact-archive descriptor/coupling and leave generic boundary APIs intact.
- Coverage risk: deleting a broad integration suite instead of its origin-only block would lose important compaction/tool lifecycle evidence. The suite must be edited proportionately.
- Documentation risk: `agent_memory_design.md` and `agent_memory_design_nodejs.md` are not byte-identical, so both require intentional updates rather than copying one over the other blindly.

## Notes For Architecture Reviewer

- Treat the user-approved scope as a clean removal of an unused capability, not a request to invent replacement provenance.
- Review particularly whether the accepted candidate is complete before commit, whether raw archival owns its command identity/return type, and whether any target dependency can still join compacted output to a raw archive.
- The approved persisted-data outcome is `Directly Usable — No Migration`; the evidence supplement is part of the cumulative package.
- Historic `rawTraceArchiveFile` bytes and archive boundary keys may remain on disk. Target business code must not branch on or expose them.
- The expected next decision is `Pass` or a precise design/requirement finding; implementation must not begin until architecture review passes.
