# Design Review Report

## Review Round Meta

- **Upstream Requirements Doc**: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/requirements.md`
- **Upstream Investigation Notes**: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/investigation-notes.md`
- **Reviewed Design Spec**: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence/design-spec.md`
- **Current Review Round**: 5
- **Trigger**: Corrected Codex compaction finding after official OpenAI documentation and local Codex CLI verification.
- **Prior Review Round Reviewed**: 4
- **Latest Authoritative Round**: 5
- **Current-State Evidence Basis**:
  - Official OpenAI compaction guide: `https://developers.openai.com/api/docs/guides/compaction`
  - Official OpenAI `/responses/compact` reference: `https://developers.openai.com/api/reference/resources/responses/methods/compact`
  - Official Codex agent-loop article: `https://openai.com/index/unrolling-the-codex-agent-loop/`
  - Local Codex CLI check: `codex-cli 0.125.0`
  - Local binary/protocol strings evidence for `thread/compacted`, `ContextCompactedNotification`, `ContextCompactedEvent`, `ContextCompactionItem`, `RawResponseItemCompletedNotification`, `model_auto_compact_token_limit`, and `/responses/compact`.
  - Current server integration files:
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts`
    - `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-raw-response-event-converter.ts`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial storage-only cross-runtime persistence design | N/A | None | Pass | No | Approved recorder lifecycle, command observer seam, shared storage-only writer, native-runtime skip, Claude memoryDir fix, and runtime-neutral local memory projection provider. |
| 2 | User clarification requiring reusable memory structure/format from `autobyteus-ts` | None | None | Pass | No | Approved shared low-level memory file kit and thin server adapter over it. |
| 3 | Compaction-event investigation addendum | None | None | Pass | No | Approved non-destructive treatment of provider compaction signals; later Codex provider evidence from this round was corrected by Round 5. |
| 4 | Long-running-run active raw-trace growth / rotation refinement | None | None | Pass | No | Approved treating long-run active-file growth as future storage/log rotation, not current-scope compaction. |
| 5 | Corrected Codex compaction evidence | None | None | Pass | Yes | Codex does have provider compaction item/notification paths; the current server integration gap and non-destructive design direction are now explicit. |

## Reviewed Design Spec

The design remains a storage-only persistence change for Codex/Claude runs:

- `AgentRunManager` attaches a server-owned `AgentRunMemoryRecorder` sidecar to active non-native runs.
- `AgentRun` exposes an internal accepted-command observer so user messages are recorded only after backend acceptance.
- The recorder subscribes to normalized `AgentRunEvent` output for assistant/reasoning/tool records.
- The server writer is a thin adapter over shared low-level `autobyteus-ts` memory file primitives.
- Native Autobyteus memory remains owned by native `MemoryManager`; server recording explicitly skips native runs.
- Claude team member `memoryDir` provisioning is restored for parity.
- The local run-history memory fallback is runtime-neutral and reads explicit `memoryDir` by basename.
- Provider compaction signals/items are real for Codex and Claude, but are not local semantic-compaction triggers.
- Long-running active raw-trace growth remains future storage/log-rotation work, not current-scope compaction.

The Round 5 correction is now properly represented: Codex provider compaction exists, but current Autobyteus server Codex conversion does not normalize `thread/compacted` and drops raw compaction response items. That is an integration gap, not evidence that Codex lacks compaction.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved findings. | Round 1 passed. | N/A |
| 2 | N/A | N/A | No unresolved findings. | Round 2 passed. | N/A |
| 3 | Evidence note, not a finding | N/A | Superseded by corrected Codex evidence. | Requirements, investigation, and design spec now state Codex compaction item/notification paths exist, while current server integration misses/drops them. | The design decision still stands: no local pruning/deletion/semantic compaction from provider signals. |
| 4 | N/A | N/A | No unresolved findings. | Round 4 passed. | Long-run rotation remains future work. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Accepted user command to memory files | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Normalized runtime event stream to memory files | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Active run lifecycle to recorder attachment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Team member runtime context to member memoryDir | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Persisted local memory files to run-history projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Native Autobyteus memory path remains separate | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution` domain | Pass | Pass | Pass | Pass | Owns the command/event boundary only; does not depend on memory persistence. |
| `agent-memory` server subsystem | Pass | Pass | Pass | Pass | Correct owner for storage-only recording and writer adapter. |
| `autobyteus-ts` memory store primitives | Pass | Pass | Pass | Pass | Correct owner for shared file names and serialization/layout primitives. |
| Codex/Claude runtime converters | Pass | Pass | Pass | Pass | Continue owning provider-specific parsing; recorder consumes normalized events only. |
| Team runtime context support | Pass | Pass | Pass | Pass | Correct owner for member `memoryDir` parity. |
| Run-history projection | Pass | Pass | Pass | Pass | Correct owner for runtime-neutral local memory fallback. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Memory file names | Pass | Pass | Pass | Pass | Owned by `autobyteus-ts/src/memory/store/memory-file-names.ts`. |
| Direct memory-dir raw trace/snapshot operations | Pass | Pass | Pass | Pass | Owned by `autobyteus-ts/src/memory/store/run-memory-file-store.ts`. |
| Server memory writer | Pass | Pass | Pass | Pass | Thin adapter only; no independent schema/layout ownership. |
| Event-to-memory accumulation | Pass | N/A | Pass | Pass | Server-specific mapping belongs in `RuntimeMemoryEventAccumulator`. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Raw trace records | Pass | Pass | Pass | Pass | Pass | Use existing memory model/serialization; server should not redefine JSON keys. |
| Working context snapshot | Pass | Pass | Pass | Pass | Pass | Use shared snapshot serialization primitives. |
| Provider compaction metadata | Pass | Pass | Pass | Pass | Pass | Current scope does not add a destructive local compaction representation; future marker schema must be explicit and non-destructive. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Missing Codex/Claude memory writer behavior | Pass | Pass | Pass | Pass | Replaced by shared `AgentRunMemoryRecorder`. |
| Any proposed per-runtime `CodexMemoryManager` / `ClaudeMemoryManager` | Pass | Pass | Pass | Pass | Explicitly rejected. |
| Autobyteus-named local projection fallback | Pass | Pass | Pass | Pass | Replaced/renamed as runtime-neutral local memory provider. |
| Independent server schema/file-name definitions | Pass | Pass | Pass | Pass | Replaced by shared `autobyteus-ts` file kit. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/domain/agent-run-command-observer.ts` | Pass | Pass | N/A | Pass | Internal accepted-command observer contract. |
| `agent-execution/domain/agent-run.ts` | Pass | Pass | N/A | Pass | Command delegation plus internal observer notification. |
| `agent-memory/services/agent-run-memory-recorder.ts` | Pass | Pass | Pass | Pass | Attach/detach, runtime skip, command/event routing, error isolation. |
| `agent-memory/services/runtime-memory-event-accumulator.ts` | Pass | Pass | Pass | Pass | Per-run command/event-to-memory mapping. |
| `agent-memory/store/run-memory-writer.ts` | Pass | Pass | Pass | Pass | Thin adapter over shared `RunMemoryFileStore`. |
| `autobyteus-ts/src/memory/store/run-memory-file-store.ts` | Pass | Pass | Pass | Pass | Shared direct-memory-directory file operations. |
| `autobyteus-ts/src/memory/store/memory-file-names.ts` | Pass | Pass | Pass | Pass | Shared file-name constants. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/*` | Pass | Pass | N/A | Pass | Provider parsing remains here; current compaction gap is documented as future/non-destructive marker work unless separately scoped. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-memory` -> `agent-execution` domain | Pass | Pass | Pass | Pass | Recorder may depend on domain run/event contracts. |
| Server writer -> `autobyteus-ts` file kit | Pass | Pass | Pass | Pass | Allowed low-level storage/format reuse. |
| Server recorder -> native `MemoryManager` | Pass | Pass | Pass | Pass | Explicitly forbidden for Codex/Claude. |
| Runtime converters -> memory writer | Pass | Pass | Pass | Pass | Forbidden; adapters should not write memory directly. |
| Provider compaction signals -> local pruning/semantic compaction | Pass | Pass | Pass | Pass | Explicitly forbidden. |
| Long-run rotation in current recorder | Pass | Pass | Pass | Pass | Explicitly out of scope. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRunManager` lifecycle boundary | Pass | Pass | Pass | Pass | Correct sidecar attachment owner. |
| `AgentRun` command boundary | Pass | Pass | Pass | Pass | Observers are internal; no public stream mutation. |
| `agent-memory` writer boundary | Pass | Pass | Pass | Pass | Server callers do not bypass shared store primitives. |
| Codex/Claude provider conversion boundary | Pass | Pass | Pass | Pass | Provider-specific details remain in converters. |
| Native Autobyteus memory boundary | Pass | Pass | Pass | Pass | Native memory behavior remains encapsulated by `MemoryManager`. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunCommandObserver.onUserMessageAccepted(...)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunMemoryRecorder.attachToRun(run)` | Pass | Pass | Pass | Low | Pass |
| `AgentRunMemoryRecorder.onUserMessageAccepted(...)` | Pass | Pass | Pass | Low | Pass |
| `RuntimeMemoryEventAccumulator.recordAcceptedUserMessage(...)` | Pass | Pass | Pass | Low | Pass |
| `RuntimeMemoryEventAccumulator.recordRunEvent(event)` | Pass | Pass | Pass | Medium | Pass; consumes normalized fields and must not parse provider raw compaction internals in this scope. |
| `RunMemoryFileStore` direct memory-dir operations | Pass | Pass | Pass | Low | Pass |
| `LocalMemoryRunViewProjectionProvider` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-memory/services` | Pass | Pass | Low | Pass | Recorder/accumulator service ownership is clear. |
| `autobyteus-server-ts/src/agent-memory/store` | Pass | Pass | Low | Pass | Server adapter only. |
| `autobyteus-ts/src/memory/store` | Pass | Pass | Low | Pass | Shared low-level file kit belongs with native memory storage. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events` | Pass | Pass | Low | Pass | Correct place for future Codex compaction event normalization if separately scoped. |
| `autobyteus-server-ts/src/run-history/projection/providers` | Pass | Pass | Low | Pass | Runtime-neutral fallback placement is clear. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Active-run lifecycle attachment | Pass | Pass | Pass | Pass | Reuse `AgentRunManager`; do not attach from WebSocket. |
| User command capture | Pass | Pass | Pass | Pass | Extend `AgentRun` with observer seam. |
| Event output capture | Pass | Pass | N/A | Pass | Reuse normalized `AgentRunEvent`. |
| Memory file format | Pass | Pass | Pass | Pass | Extract/reuse low-level `autobyteus-ts` store. |
| Provider compaction metadata | Pass | Pass | N/A | Pass | Current capability is recognized but remains non-destructive/future-schema unless separately scoped. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Native Autobyteus memory | No | Pass | Pass | Preserved as authoritative; server recorder skips native. |
| Local memory projection provider naming | No | Pass | Pass | Clean runtime-neutral replacement. |
| Server-side schema duplication | No | Pass | Pass | Shared store primitives prevent drift. |
| Codex provider compaction gap | No | Pass | Pass | Not a legacy path; documented as future marker/converter work if needed. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Command observer seam | Pass | Pass | Pass | Pass |
| Shared `autobyteus-ts` file kit | Pass | Pass | Pass | Pass |
| Server recorder/writer | Pass | Pass | Pass | Pass |
| Claude team memoryDir parity | Pass | Pass | Pass | Pass |
| Local projection provider replacement | Pass | Pass | Pass | Pass |
| Provider compaction handling | Pass | Pass | Pass | Pass; current implementation should not add destructive behavior or implicit rotation. |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Storage-only recorder naming | Yes | Pass | Pass | Pass | Design contrasts recorder vs per-runtime memory manager. |
| Provider compaction handling | Yes | Pass | Pass | Pass | Design now distinguishes real Codex compaction from local semantic compaction. |
| Long-run raw trace growth | Yes | Pass | Pass | Pass | Design distinguishes future rotation from current compaction/storage-only recording. |
| Local memory provider identity | Yes | Pass | Pass | Pass | Explicit `memoryDir` basename behavior is called out. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Persisting provider compaction boundary markers | Useful for future provenance and rotation boundaries. | Future schema decision: explicit raw-trace marker or separate runtime-event file; must remain append-only/non-destructive unless runtime supplies local trace-id compaction plan. | Open / out of current scope unless separately approved. |
| Long-running external-runtime rotation | Very long runs may produce large active files. | Future generic rotation/snapshot-retention design that updates all readers to treat active + archive/chunks as complete corpus. | Open / out of current scope. |
| Working-context snapshot retention | Snapshots can grow separately from raw traces. | Future retention/windowing design. | Open / out of current scope. |
| Codex event payload variance | Codex protocol supports compaction paths, but current server converters do not normalize them. | If later needed, add converter tests and marker schema; do not let the recorder parse raw Codex protocol directly. | Open / future marker work. |

## Review Decision

**Pass.**

The corrected Codex evidence is now accurately captured. It does not invalidate the design because the architecture already draws the important boundary: provider/session compaction is not server-owned local memory compaction. The only required downstream change is guidance: implementation must not rely on the old “Codex has no compaction” statement; it must instead treat Codex compaction paths as real but currently unnormalized provider metadata that is non-destructive and future-schema-bound.

## Findings

None.

## Classification

No blocking classification. The correction is incorporated as implementation guidance and residual risk, not a requirement gap or design impact.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Codex provider compaction events/items exist, but the current server Codex integration does not normalize `thread/compacted` and does not preserve `type=compaction` raw response items. This is acceptable for current storage-only memory recording, but future marker support must be designed explicitly.
- Implementation must not interpret Codex `thread/compacted` or `type=compaction` as permission to delete, prune, rewrite, archive, semantically compact, or inject local memory.
- If implementation encounters compaction events while recording, the safe current behavior is ignore/log-only unless an explicit append-only marker schema is approved.
- If future work adds marker persistence, it must be append-only/non-destructive and must not overload tool/reasoning/user/assistant trace semantics.
- Long-running external-runtime active-file growth remains out of current scope; no opportunistic rotation/chunking/snapshot retention should be introduced here.
- Existing implementation risks remain: turn-id fallback, segment/tool finalization, shared `autobyteus-ts` export verification, native no-duplicate behavior, and historical no-backfill.

## Latest Authoritative Result

- **Review Decision**: Pass
- **Notes**: Round 5 supersedes earlier Codex compaction evidence. Codex compaction exists at the provider/protocol level; current server normalization misses it. The approved design remains storage-only and non-destructive for Codex/Claude, with compaction marker persistence and rotation deferred to future explicit design unless separately approved.
