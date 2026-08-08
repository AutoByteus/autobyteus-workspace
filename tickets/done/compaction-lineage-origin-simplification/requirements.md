# Requirements — Compaction Lineage Origin Simplification

## Status

`Design-ready`

- Ticket: `compaction-lineage-origin-simplification`
- User approval: approved in conversation on `2026-08-08`
- Approval scope: remove unused direct compacted episodic/semantic-to-raw provenance, preserve current compaction and independent raw evidence, and keep future memory maintenance separate

## Goal / Problem Statement

Current native compaction persists a direct association from each compaction's episodic and semantic output membership to one raw-trace archive file, then exposes library and server machinery that can walk that association as direct and recursive origin. Repository-wide production-path investigation found no supported product consumer, API, or UI for that origin lookup. The association mixes current-context compaction with a possible future memory-maintenance concern and adds avoidable code, schema, interface, tests, and documentation.

Simplify the current system cleanly: retain only the compaction record needed to order accepted replacements and load the current episodic/semantic output bundle; retain raw traces and raw archives as independent evidence; remove the unused output-origin capability and the coupling created solely to support it. Future raw-trace-to-Work-Evidence-to-hierarchical-memory work is a separate product and architecture concern.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A pending native compaction is proposed, accepted against a stable WorkingContext/head baseline, and committed by archiving selected raw traces, persisting output rows, appending lineage, installing finalized context, writing the snapshot, and clearing pending state. The archive result currently supplies a filename to the lineage row. | Commit the same accepted replacement without feeding archive identity into the compaction record. The accepted candidate carries one complete lineage record before commit, and raw archival is a separate commit side effect. | Ordering, validation, output membership, snapshot, failure propagation, and pending-state behavior remain unchanged. | REQ-001, REQ-002, REQ-005 / AC-001, AC-002, AC-003 |
| BEH-002 | Normal current-output loading reads the lineage tail and exact `episodeIds` / `semanticIds`, then hydrates and validates the current replacement bundle. | Continue using the contracted lineage tail without consulting raw archive identity. | Only the newest successful output bundle is current; predecessor/head continuity and exact output-row validation remain unchanged. | REQ-001, REQ-004 / AC-001, AC-004, AC-006 |
| BEH-003 | Selected raw traces are moved from active storage into complete manifest-backed archive segments as part of accepted native compaction. | Keep raw retention independent of compacted output identity; exact selected membership still archives successfully and remains available through the raw archive subsystem. | Raw content, complete archive files, archive enumeration, unselected active traces, and external-runtime raw recording remain unchanged. | REQ-002, REQ-005 / AC-002, AC-007 |
| BEH-004 | Core `CompactionLineageResolver` and server `AgentMemoryOriginService` resolve typed episode/semantic artifacts to direct and recursive raw origin. Static call-graph investigation found only their own tests and one origin-only assertion inside a broader integration test; no supported GraphQL, UI, or production service caller exists. | Remove this unsupported/unused origin contract completely. | No replacement provenance API, fallback, placeholder, or UI is introduced. | REQ-003, REQ-005 / AC-005, AC-008 |
| BEH-005 | Existing schema-version-1 lineage rows require `rawTraceArchiveFile` under the current normalizer. Stored rows otherwise contain all fields needed by the current head/output loader. | The target version-agnostic normalizer recognizes the retained schema-version-1 fields and ignores the obsolete stored extra field. New rows omit it. | Valid scope, compaction identity, predecessor chain, output membership, derivation/audit metadata, and integrity-shape checks remain enforced. | REQ-004, REQ-006 / AC-003, AC-004, AC-006 |
| BEH-006 | Future Work Evidence and hierarchical memory are discussed in prior design material, but no current supported maintenance subsystem or origin UI uses this direct resolver. | Do not create or pre-design that future subsystem in this ticket. Preserve independent raw evidence so a future ticket can investigate the right pipeline from first principles. | Current compaction outputs, working context, raw corpus, and raw archives remain available. | REQ-005 / AC-007, AC-008 |

## Investigation Findings

- `AcceptedCompactionCommitter` is the only caller that uses the result of `MemoryStore.archiveExactRawTraces`, and it uses only `archive.fileName` to populate the lineage row.
- `CurrentCompactionOutputLoader` uses only the lineage head and exact episodic/semantic IDs; raw archive identity is not on the normal current-context load path.
- `MemoryManagerCompactionCoordinator` needs `compactionId` and `previousCompactionId` for baseline/concurrency and successful-head continuity; those fields must remain.
- `CompactionLineageResolver`, `MemoryOriginResolution`, `MemoryArtifactRef`, and the server `AgentMemoryOriginService` have no supported production consumer. Their direct source and dedicated test implementation totals approximately 706 lines before related fixtures/docs are counted.
- `CompactionLineageStore.getByCompactionId` and `.findProducingRecord` exist solely for the origin resolver. `list`, `readHead`, and `appendNext` still support retained ordering/head behavior.
- Representative app data contains one 3,387-byte lineage file with two valid records. Both are valid under the target retained shape; all 9 episode and 58 semantic references resolve; no record hash is verified; the obsolete field can be ignored without mutation.
- Raw archive manifests/files are independently enumerable. Compaction-output loading does not depend on a lineage-to-archive pointer.
- The startup snapshot migration checks whether lineage is non-empty but does not inspect lineage record fields, so this contraction does not change migration eligibility or sequencing.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-lineage-origin-simplification/tickets/in-progress/compaction-lineage-origin-simplification/persisted-lineage-inventory.md` | Read-only aggregate persisted-data inventory and direct-use probe | REQ-004, REQ-006 | AC-003, AC-004, AC-006, AC-007 | Complete / approval N/A | Supplies the evidence basis for `Directly Usable — No Migration`. |

## Design Health Assessment

- Change posture: `Cleanup` and `Refactor`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Likely Needed`
- Evidence basis: the compaction record and commit boundary currently carry raw archive identity solely for an unused future-facing resolver. This makes accepted-candidate typing incomplete until an unrelated storage result is injected, and causes server/location logic to exist only to reassemble that relation.
- Requirement or scope impact: the fix must be a clean removal and schema contraction across core memory, server, tests, exports, and docs. It must not replace the origin capability or disturb retained compaction/archive owners.

## Recommendations

1. Remove the raw archive field from `CompactionLineageRecord` and make accepted candidates carry a complete `lineageRecord` before commit.
2. Make exact raw archival a command-style `void` boundary that accepts selected raw IDs and owns its own archive idempotency identity; do not return archive identity to compaction.
3. Remove origin resolver/model types, origin-only store queries, core exports, server service, and dedicated origin tests.
4. Preserve the existing lineage file name, schema version, scope, predecessor chain, output membership, and audit fields; older stored JSON supersets remain directly readable.
5. Keep current compaction and raw-archive integration coverage, add explicit old-row-direct-read/new-row-no-origin assertions, and remove only origin-specific coverage.
6. Update durable memory documentation to describe current-head/output membership and independent raw retention, with no direct/recursive origin contract.

## Scope Classification

`Medium`

The observable runtime outcome is mostly preserved, but the cleanup crosses the core memory schema, compaction commit boundary, raw archive command interface, server source, exports, tests, persisted-data reasoning, and durable documentation.

## In-Scope Use Cases

- **UC-001 — Accept and commit native compaction:** current replacement outputs, head ordering, exact raw archive movement, WorkingContext replacement, and snapshot persistence continue successfully without output-origin linkage.
- **UC-002 — Resume/load current compacted context:** current and existing native runs load the exact lineage-head episodic/semantic output bundle without requiring a raw archive field.
- **UC-003 — Retain and inspect raw evidence independently:** raw active/archive storage continues to enumerate and preserve complete archive records independently of compacted output records.
- **UC-004 — Remove unused origin contract:** unsupported direct/recursive episode/semantic-to-raw lookup code and its documentation/coverage cease to exist.

## Out Of Scope

- Removing episodic or semantic compacted-context outputs.
- Removing raw trace storage, raw archives, manifests, Event Monitor projection, or external-runtime raw-only recording.
- Changing how WorkingContext provenance chooses the exact newly selected raw IDs for archival.
- Work Evidence persistence, raw-to-Work-Evidence conversion, hierarchical memory, memory maintenance, relevance/forgetting, citations, or provenance UI/API.
- External-runtime WorkingContext snapshots, cross-runtime model/runtime switching, or portable handoff.
- Broad memory terminology/file renames unrelated to the removed origin concern.
- Repairing malformed lineage, missing output rows, unsupported schema versions, or manually corrupted data.
- Removing retained lineage execution/audit metadata; its usefulness may be evaluated separately.

## Functional Requirements

- **REQ-001 — Preserve current compacted-output authority.** Accepted native compaction must continue appending one successful run-scoped record whose tail identifies the exact current episodic and semantic output membership, whose predecessor matches the prior successful tail, and whose outputs can be loaded and validated as one complete current-context replacement.
- **REQ-002 — Make raw retention independent.** Accepted native compaction must continue carrying the selected new raw trace IDs long enough to command exact archival and must leave unselected raw traces active. That transient selection is operational input, not persisted compacted-output provenance: the lineage record must contain no raw archive filename, archive descriptor, raw-ID list, or other compacted-output-to-raw-origin relation; the accepted candidate must receive no archive locator/descriptor back from storage. The raw archive subsystem must own its operation identity and completion validation.
- **REQ-003 — Remove the unused origin capability.** Remove the core direct/recursive origin resolver, its origin response/reference/error types and exports, the server memory-origin service and target types, origin-only lineage-store queries, and code/tests/docs whose sole contract is that lookup. Do not retain deprecated stubs or throwing placeholders.
- **REQ-004 — Contract the current lineage shape.** New lineage rows must retain schema version 1, scope, compaction/predecessor identity, episode/semantic membership, derivation time, execution/prompt audit metadata, and optional integrity shape, while omitting `rawTraceArchiveFile`. Normal reads must keep existing validation for all retained invariants.
- **REQ-005 — Keep concerns bounded.** The implementation must not add Work Evidence, hierarchical-memory, provenance UI/API, runtime switching, external snapshot behavior, dual paths, version-specific runtime logic, or a substitute origin abstraction. Raw archiving, current-output loading, and compaction ordering remain with their existing owners.
- **REQ-006 — Reuse existing data without migration.** The target reader must directly consume valid existing schema-version-1 JSONL rows that include the obsolete extra field, project only recognized retained fields, and never require a startup/deployment rewrite solely to remove that field.
- **REQ-007 — Keep durable descriptions and coverage truthful.** Documentation and retained coverage must describe and verify current-head output membership plus independent raw archival, not direct/recursive compacted-output origin.

## Acceptance Criteria

- **AC-001:** Given an eligible native WorkingContext, a successful accepted compaction still persists its episodic/semantic rows, appends exactly one linear head record, installs the finalized current context, persists the current snapshot when configured, clears pending state, and permits the next normal provider request.
- **AC-002:** The same successful compaction moves exactly its selected new raw trace IDs to a complete raw archive segment, leaves unselected active traces active, and succeeds without receiving an archive filename/descriptor back through the compaction candidate or lineage record.
- **AC-003:** A newly appended `compaction_lineage.jsonl` row contains no `rawTraceArchiveFile`, raw trace ID membership, archive descriptor, or replacement origin field; it retains all fields enumerated in REQ-004.
- **AC-004:** Current-output loading returns the exact lineage-tail episodes and semantics, rejects missing/misordered output rows as before, and does not open or resolve a raw archive.
- **AC-005:** Repository search after implementation finds no `CompactionLineageResolver`, `MemoryOriginResolution`, `MemoryArtifactRef`, `MemoryOriginIntegrityError`, `AgentMemoryOriginService`, origin-only `getByCompactionId` / `findProducingRecord`, or public exports/documented contracts for them.
- **AC-006:** A representative stored schema-version-1 row containing `rawTraceArchiveFile` is read successfully by the normal lineage store; the returned current record preserves every retained field/invariant and does not expose the obsolete extra property. No migration ledger entry or app-data rewrite is introduced.
- **AC-007:** Existing raw trace, raw manifest, raw archive, episodic, semantic, snapshot, and valid lineage data is not deleted or rewritten by this change; existing archive segments remain enumerable through the normal raw archive path.
- **AC-008:** No new Work Evidence/hierarchical-memory implementation, provenance UI/API, runtime switching, external-runtime snapshot behavior, compatibility wrapper, or legacy origin fallback is present.
- **AC-009:** Durable tests retain successful compaction/current-output/raw-archive coverage, remove origin-only expectations, and cover both new-row contraction and old-row direct use; durable docs match the target contract.

## Constraints / Dependencies

- Work must remain in the dedicated ticket worktree/branch and ultimately integrate to `personal`.
- Preserve the existing accepted-compaction effect order unless implementation evidence requires an explicit correction: archive selected raw -> persist outputs -> append current head -> install current context -> persist snapshot -> clear pending.
- Keep one current-schema runtime path. Generic ignored-extra-field projection is allowed; version-specific lineage branches, dual reads/writes, fallback resolvers, and migration-only fields in business code are prohibited.
- The raw archive manager remains the owner of manifest segment creation and completion. The compaction record must not import raw archive types.
- Existing external-runtime raw recording and provider compaction-boundary behavior are out of scope and must remain unaffected.

## Persisted Data Outcome

- Stored subject / location: run-local `compaction_lineage.jsonl` under native standalone/team-member memory directories; representative current data is summarized in `persisted-lineage-inventory.md`.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve: record order, scope, compaction/predecessor IDs, episode/semantic membership, derivation/execution audit fields, optional integrity shape, all output rows, and all raw archive files/manifests. Existing obsolete field bytes may remain on disk and are ignored on read.
- Unacceptable data loss or corruption: loss of the current head, inability to hydrate its exact output bundle, deletion/rewrite of raw evidence, or mutation of append-only rows merely for representational cleanup.
- Relevant availability, maintenance-window, or rollout constraints: no maintenance window, startup migration, rewrite, backup, or mixed-version mode is justified. Current code is replaced atomically by the normal application release.
- Related requirement and acceptance-criteria IDs: REQ-004, REQ-006 / AC-003, AC-004, AC-006, AC-007.

## Assumptions

- `compaction_lineage.jsonl` remains the current successful-compaction head/output-membership authority; its name is not changed in this ticket.
- Valid raw trace IDs are run-local and unique enough for the raw archive owner to derive its own stable selection identity without using compacted output identity.
- No supported external consumer depends on wildcard-importing the removed deep origin modules. Repository-wide production search found none, and the clean-cut policy rejects retaining them speculatively.
- Execution/prompt metadata is retained as current operational audit state even though direct product reads are limited; removing it would be a separate scope decision.

## Risks / Open Questions

- No blocking requirement question remains.
- A downstream implementation must ensure the broader compaction integration test loses only its origin assertion, not its retained tool lifecycle, raw archive, current output, or provider-dispatch coverage.
- Historic prior tickets describe direct/recursive origin as intentional. This user-approved ticket explicitly supersedes only that unused origin portion; retained compaction and migration decisions remain authoritative.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| REQ-001 | Yes | Yes | — | — |
| REQ-002 | Yes | — | Yes | — |
| REQ-003 | — | — | — | Yes |
| REQ-004 | Yes | Yes | — | — |
| REQ-005 | Yes | Yes | Yes | Yes |
| REQ-006 |  | Yes | Yes |  |
| REQ-007 | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | End-to-end native successful compaction and continuation remains operational. |
| AC-002 | Raw archive side effect remains exact and independent. |
| AC-003 | New persisted row proves the schema contraction. |
| AC-004 | Current compacted-context load proves retained authority and no raw dependency. |
| AC-005 | Static source/export/docs absence proves clean removal of the unused contract. |
| AC-006 | Fixture or representative-copy read proves existing JSON supersets need no migration. |
| AC-007 | Stored-data and archive regression checks prove no destructive side effect. |
| AC-008 | Diff/static inspection proves non-goals and compatibility mechanisms were not added. |
| AC-009 | Coverage/documentation review proves truthfulness after removal. |

## Approval Status

`Approved / Design-ready.` The user explicitly confirmed that the direct semantic/episodic-to-raw relation is unnecessary for current compaction, belongs to a separate future memory-maintenance discussion, and should be removed in a dedicated simplification ticket. The persisted-data supplement is evidence-only and does not require separate approval.
