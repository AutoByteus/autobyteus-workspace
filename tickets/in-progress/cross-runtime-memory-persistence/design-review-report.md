# Design Review Report

## Review Round Meta

- **Upstream Requirements Doc**: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/requirements.md`
- **Upstream Investigation Notes**: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/investigation-notes.md`
- **Reviewed Design Spec**: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/design-spec.md`
- **Current Review Round**: 9
- **Trigger**: Re-review after design-principles pass refined the segmented raw-trace archive architecture into an authoritative `RunMemoryFileStore` facade with internal `RawTraceArchiveManager` archive-lifecycle owner.
- **Prior Review Round Reviewed**: 8
- **Latest Authoritative Round**: 9
- **Current-State Evidence Basis**:
  - Requirements REQ-013 through REQ-016 and AC-012 through AC-015.
  - Investigation notes documenting the design-principles conclusion: `RunMemoryFileStore` is the memory-directory facade; `RawTraceArchiveManager` owns manifest/segment lifecycle.
  - Design spec sections: Provider Boundary And Archive Segment Contracts, Design Principles Recheck / Refactor Decision, DS-007 spine, Ownership Map, Boundary Encapsulation Map, Dependency Rules, Interface Boundary Mapping, target file mapping, and migration/refactor sequence.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial storage-only cross-runtime persistence design | N/A | None | Pass | No | Approved baseline recorder/writer design. |
| 2 | Shared `autobyteus-ts` memory file kit refinement | None | None | Pass | No | Approved common low-level file primitives and thin server adapter. |
| 3 | Initial compaction-event investigation addendum | None | None | Pass | No | Non-destructive treatment approved; Codex evidence later corrected. |
| 4 | Long-running-run active-file growth discussion | None | None | Pass | No | Rotation kept future/out of scope at that time. |
| 5 | Corrected Codex compaction evidence | None | None | Pass | No | Codex compaction paths acknowledged. |
| 6 | Provider-boundary marker + active rotation moved into scope | None | AR-006-001, AR-006-002, AR-006-003 | Fail | No | Needed clearer scope, marker schema, and rotation safety contract. |
| 7 | Single archive file naming clarification | AR-006-001, AR-006-002, AR-006-003 | None | Fail | No | Single-archive decision was clear but later superseded. |
| 8 | Segmented archive architecture rework | AR-006-001, AR-006-002, AR-006-003 | None | Pass | No | Prior blockers resolved by segmented layout, manifest, marker, algorithm, and reader contract. |
| 9 | Design-principles ownership recheck | Prior blockers and Round 8 residual risks | None | **Pass** | Yes | Confirms `RunMemoryFileStore` facade + internal `RawTraceArchiveManager` satisfies ownership and Authoritative Boundary Rule. |

## Reviewed Design Spec

The revised design is implementation-ready under the segmented archive/refactor scope.

The target architecture is now clear:

- `RunMemoryFileStore` is the authoritative per-memory-directory facade for active raw traces, snapshots, full-corpus reads, and rotation/prune entrypoints.
- `RawTraceArchiveManager` is an internal storage owner under `autobyteus-ts/src/memory/store` for archive manifest schema, segment filename policy, pending/complete lifecycle, idempotent segment creation, and complete segment reads.
- Callers above the facade use `RunMemoryFileStore` or the server `RunMemoryWriter`; they must not directly scan `raw_traces_archive/` or mutate `raw_traces_archive_manifest.json`.
- Native Autobyteus compaction and Codex/Claude provider-boundary rotation share the same segmented archive manager.
- Codex/Claude provider compaction remains provider-owned and is used only as non-destructive storage boundary metadata.
- Complete-corpus readers reconstruct from completed archive segments plus active `raw_traces.jsonl`, dedupe by raw trace id, and order deterministically.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 6/7 | AR-006-001 | Blocking | Resolved | Requirements and design now consistently define segmented archive files, decommission monolithic archive writes, and make provider boundary markers in scope. | No stale single-archive/future-marker direction remains materially blocking. |
| 6/7 | AR-006-002 | Blocking | Resolved | `ProviderCompactionBoundaryPayload`, Codex dedup rule, Claude safe-boundary rule, and `provider_compaction_boundary` raw trace shape are specified. | Provider parsing remains in runtime converters. |
| 6/7 | AR-006-003 | Blocking | Resolved | Active-to-archive segment algorithm, pending/complete manifest states, retry/idempotency, marker placement, and complete-corpus reader contract are specified. | Implementation watch remains for crash/retry edge cases. |
| 8 | Residual ownership risk | Watch item | Resolved by design recheck | Design now explicitly extracts `RawTraceArchiveManager` behind `RunMemoryFileStore` and forbids callers/tests above the facade from touching archive internals. | Satisfies Authoritative Boundary Rule. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Accepted user command to memory files | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Normalized Codex/Claude runtime events to memory files | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Active run lifecycle to recorder attachment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Team member runtime context to member memoryDir | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Persisted local memory files to historical projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Native Autobyteus memory remains separate from server recorder | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-007 | Native/provider boundary to segmented archive + active rewrite | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Codex/Claude converters | Pass | Pass | Pass | Pass | Provider parsing/dedup stays in adapters; no storage ownership. |
| `agent-memory` recorder/accumulator | Pass | Pass | Pass | Pass | Owns storage-only recording behavior and marker/rotation trigger selection. |
| `RunMemoryWriter` | Pass | Pass | Pass | Pass | Thin server adapter over shared memory-directory facade. |
| `RunMemoryFileStore` | Pass | Pass | Pass | Pass | Correct authoritative memory-directory facade. |
| `RawTraceArchiveManager` | Pass | Pass | Pass | Pass | Correct internal archive manifest/segment lifecycle owner. |
| Native `MemoryManager` / `FileMemoryStore` | Pass | Pass | Pass | Pass | Native memory remains authoritative; archive writing delegates to shared manager through facade. |
| Run-history and memory readers | Pass | Pass | Pass | Pass | Consume complete-corpus facade; do not scan archive internals directly. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Raw trace/snapshot file primitives | Pass | Pass | Pass | Pass | Shared low-level kit remains correct. |
| Archive manifest schema | Pass | Pass | Pass | Pass | `raw-trace-archive-manifest.ts` is the right typed schema owner. |
| Archive segment lifecycle | Pass | Pass | Pass | Pass | `raw-trace-archive-manager.ts` prevents store god-object drift and provider-specific archive logic. |
| Memory-directory facade | Pass | Pass | Pass | Pass | `RunMemoryFileStore` owns active membership and complete-corpus facade methods. |
| Provider compaction marker model | Pass | Pass | Pass | Pass | Marker shape is concrete and storage-only. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RawTraceArchiveManifest` / segment entry | Pass | Pass | Pass | Pass | Pass | One entry equals one immutable boundary segment. |
| `ProviderCompactionBoundaryPayload` | Pass | Pass | Pass | Pass | Pass | Distinguishes provider metadata from server semantic compaction. |
| `provider_compaction_boundary` raw trace | Pass | Pass | Pass | Pass | Pass | Uses tags/correlation/tool_result metadata without overloading tool traces. |
| Active + archive segment complete corpus | Pass | Pass | Pass | Pass | Pass | Dedupe/order rules are explicit. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Monolithic `raw_traces_archive.jsonl` write path | Pass | Pass | Pass | Pass | Clean-cut replacement with segmented archive manager. |
| Direct archive-manifest scanning/mutation by callers | Pass | Pass | Pass | Pass | Forbidden by Authoritative Boundary Rule. |
| Per-runtime archive helpers | Pass | Pass | Pass | Pass | Replaced by shared `RawTraceArchiveManager`. |
| Autobyteus-named local memory fallback | Pass | Pass | Pass | Pass | Replaced by runtime-neutral local provider. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `raw-trace-archive-manifest.ts` | Pass | Pass | Pass | Pass | Manifest and segment entry types only. |
| `raw-trace-archive-manager.ts` | Pass | Pass | Pass | Pass | Archive lifecycle internals only. |
| `run-memory-file-store.ts` | Pass | Pass | Pass | Pass | Facade and active-file coordinator; delegates archive internals. |
| `file-store.ts` | Pass | Pass | Pass | Pass | Native adapter preserving `MemoryStore` contract. |
| Server `run-memory-writer.ts` | Pass | Pass | Pass | Pass | Thin server adapter; no schema/layout ownership. |
| Runtime converters | Pass | Pass | N/A | Pass | Provider parsing/dedup only. |
| `RuntimeMemoryEventAccumulator` | Pass | Pass | Pass | Pass | Mapping and rotation trigger selection only. |
| Memory/run-history readers | Pass | Pass | Pass | Pass | Use complete-corpus facade. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Callers -> `RunMemoryFileStore` facade | Pass | Pass | Pass | Pass | Callers must not also depend on `RawTraceArchiveManager` internals. |
| `RunMemoryFileStore` -> `RawTraceArchiveManager` | Pass | Pass | Pass | Pass | Facade owns active membership; archive manager owns segment lifecycle. |
| Server recorder -> `RunMemoryWriter` -> facade | Pass | Pass | Pass | Pass | No direct file-schema or archive-manifest dependency. |
| Runtime converters -> normalized events | Pass | Pass | Pass | Pass | No storage writes in adapters. |
| Native memory -> shared storage | Pass | Pass | Pass | Pass | Native memory remains authoritative, storage is shared. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunManager` lifecycle boundary | Pass | Pass | Pass | Pass | Correct recorder attachment owner. |
| `AgentRun` command boundary | Pass | Pass | Pass | Pass | Captures accepted user commands once. |
| Runtime converter boundary | Pass | Pass | Pass | Pass | Provider payloads do not leak into recorder/storage. |
| `AgentRunMemoryRecorder` / accumulator boundary | Pass | Pass | Pass | Pass | Storage-only behavior only. |
| `RunMemoryFileStore` facade | Pass | Pass | Pass | Pass | Correct authoritative boundary above archive internals. |
| `RawTraceArchiveManager` internals | Pass | Pass | Pass | Pass | Only facade and focused unit tests should touch directly. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunCommandObserver.onUserMessageAccepted(...)` | Pass | Pass | Pass | Low | Pass |
| `RuntimeMemoryEventAccumulator.recordRunEvent(event)` | Pass | Pass | Pass | Medium | Pass |
| `RunMemoryFileStore` active/rotation/full-corpus APIs | Pass | Pass | Pass | Low | Pass |
| `RawTraceArchiveManager.createSegmentIfAbsent(...)` | Pass | Pass | Pass | Low | Pass |
| Provider converter compaction event output | Pass | Pass | Pass | Medium | Pass |
| Local memory projection provider | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts` | Pass | Pass | Low | Pass | Correct manifest schema owner. |
| `autobyteus-ts/src/memory/store/raw-trace-archive-manager.ts` | Pass | Pass | Low | Pass | Correct internal archive owner. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Pass | Pass | Low | Pass | Correct memory-directory facade. |
| `autobyteus-server-ts/src/agent-memory` | Pass | Pass | Low | Pass | Correct recorder/writer adapter owner. |
| Runtime converter folders | Pass | Pass | Low | Pass | Correct provider parsing owner. |
| Run-history projection folders | Pass | Pass | Low | Pass | Correct local fallback/transformer owner. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native archive behavior | Pass | Pass | Pass | Pass | Refactored under shared archive manager without moving native memory management. |
| Provider compaction boundaries | Pass | Pass | Pass | Pass | Normalized as storage boundaries only. |
| Memory/run-history readers | Pass | Pass | Pass | Pass | Use complete-corpus facade. |
| Shared `autobyteus-ts` memory package | Pass | Pass | Pass | Pass | Correct place for reusable file format/archive primitives. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Monolithic archive append path | No target dual path | Pass | Pass | Replaced by manifest-indexed segments. |
| Direct archive internals access | No | Pass | Pass | Bypasses are explicitly forbidden. |
| Autobyteus-named local fallback | No | Pass | Pass | Replaced by runtime-neutral local fallback. |
| Codex/Claude memory manager wrappers | No | Pass | Pass | Rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Shared file kit + archive manager extraction | Pass | Pass | Pass | Pass |
| Native store delegation | Pass | Pass | Pass | Pass |
| Provider compaction conversion | Pass | Pass | Pass | Pass |
| Marker write + segmented rotation | Pass | Pass | Pass | Pass |
| Archive-aware projection/readers | Pass | Pass | Pass | Pass |
| Validation sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Archive file layout | Yes | Pass | Pass | Pass | Concrete paths and segment names are present. |
| Provider boundary payload | Yes | Pass | N/A | Pass | Type shape is explicit. |
| Provider marker raw trace | Yes | Pass | Pass | Pass | Concrete shape and no-snapshot rule are present. |
| Rotation algorithm | Yes | Pass | Pass | Pass | Steps and retry behavior are defined. |
| Ownership split | Yes | Pass | Pass | Pass | Good/bad example names facade vs archive manager responsibilities. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Historical Codex/Claude runs without memory files | Out of scope. | No backfill expected. | Accepted |
| Existing historical native `raw_traces_archive.jsonl` files | No-compatibility policy allows clean target for new writes. | Do not add compatibility wrappers unless the user reopens migration scope. | Accepted residual risk |
| Archive compression / retention | Segmented archives can still grow. | Future policy. | Out of scope |
| Snapshot windowing | Snapshot file can still grow. | Future policy. | Out of scope |

## Review Decision

**Pass.**

The revised design is implementation-ready. The ownership split satisfies the design principles: `RunMemoryFileStore` is the authoritative memory-directory facade, `RawTraceArchiveManager` owns archive internals, provider converters own provider parsing, server recorder owns storage-only external-runtime recording, and native Autobyteus remains the runtime memory authority.

## Findings

None.

## Classification

No blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks / Implementation Watch Items

- Verify implementation does not let server code, provider converters, readers, or facade-level tests directly scan/mutate `raw_traces_archive/` or `raw_traces_archive_manifest.json`; use `RunMemoryFileStore` facade methods instead.
- Implement `RawTraceArchiveManager` pending-entry retry deterministically and keep readers ignoring `pending` segments.
- Ensure the shared archive manager supports both provider “move records before marker” and native “archive selected raw trace ids” use cases without duplicating manifest/segment policy.
- Ensure sequence initialization reads active + completed archive segments so restored external runs do not reuse sequence numbers.
- Ensure `status: compacting` for Claude never rotates by itself; only `compact_boundary` rotates.
- Ensure Codex dual surfaces dedupe before recorder storage, with `thread/compacted` preferred.
- Ensure no Codex/Claude semantic/episodic memory files are produced by the server recorder.

## Latest Authoritative Result

- **Review Decision**: Pass
- **Notes**: Proceed to implementation with the segmented archive design and the `RunMemoryFileStore` facade + internal `RawTraceArchiveManager` ownership split.
