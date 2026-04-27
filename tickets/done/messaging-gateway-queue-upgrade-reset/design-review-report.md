# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset/tickets/done/messaging-gateway-queue-upgrade-reset/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset/tickets/done/messaging-gateway-queue-upgrade-reset/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset/tickets/done/messaging-gateway-queue-upgrade-reset/design-spec.md`
- Current Review Round: 2
- Trigger: Superseding design update after user clarified the ticket must address the queue data-file lifecycle architecture issue, not only add a quarantine branch.
- Prior Review Round Reviewed: Round 1 in this same report path.
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Reviewed revised requirements, investigation notes, and design spec; rechecked active source paths for `FileInboxStore`, `FileOutboxStore`, `createGatewayApp`, `GatewayRuntimeLifecycle`, `FileQueueOwnerLock`, and inbox/outbox domain status models; observed in-progress old-shape implementation files currently in the worktree (`file-queue-state-quarantine.ts` and related tests) that are now superseded by the revised `FileQueueStateStore<TState>` design; active-source legacy grep (`rg -n "COMPLETED_ROUTED|\bROUTED\b" autobyteus-message-gateway/src || true`) still produced no matches.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review request | N/A | None | Pass | No | Superseded by revised requirements/design that broadened scope from quarantine helper to shared file lifecycle owner. |
| 2 | Superseding design update | Round 1 had no unresolved findings; prior pass was re-evaluated against changed scope | None | Pass | Yes | `FileQueueStateStore<TState>` is the right-sized architecture improvement and is ready for implementation. |

## Reviewed Design Spec

`/Users/normy/autobyteus_org/autobyteus-worktrees/messaging-gateway-queue-upgrade-reset/tickets/done/messaging-gateway-queue-upgrade-reset/design-spec.md`

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No prior findings to resolve | Round 1 findings were `None`; Round 1 decision is superseded by changed requirements/design scope. | Continue with Round 2 as latest authoritative result. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Inbound upgrade recovery via shared lifecycle owner | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Outbound invalid-state recovery via shared lifecycle owner | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Valid current queue file preservation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Shared queue data-file lifecycle refactor | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Runtime lock lifecycle separation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `infrastructure/queue` | Pass | Pass | Pass | Pass | Extending the existing queue infrastructure area for `FileQueueStateStore<TState>` is sound; it is a domain-specific queue data-file lifecycle owner, not a generic filesystem utility. |
| `infrastructure/inbox` | Pass | Pass | Pass | Pass | `FileInboxStore` keeps inbound state shape, record parser, status parser, and inbound operations while delegating common lifecycle mechanics. |
| `infrastructure/outbox` | Pass | Pass | Pass | Pass | `FileOutboxStore` keeps outbound state shape, parser, status parser, and outbound operations while delegating common lifecycle mechanics. |
| `application/services` / workers | Pass | Pass | Pass | Pass | Reused unchanged for business transitions and loop errors; they must not gain queue-file recovery code. |
| `bootstrap` / lifecycle | Pass | Pass | Pass | Pass | Composition and lock lifecycle remain separate from queue data-file recovery. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Queue data-file read/missing-file/JSON boundary/invalid quarantine/reset/atomic persistence lifecycle | Pass | Pass | Pass | Pass | This is the architecture issue exposed by the bug; `file-queue-state-store.ts` is the correct extraction. |
| Quarantine event/result shape | Pass | Pass | Pass | Pass | Result remains diagnostic and file-level; not promoted into runtime reliability API. |
| Store parse/record/status normalization | Pass | N/A | Pass | Pass | Correctly remains local to inbox/outbox stores to avoid a kitchen-sink parser. |
| Queue lock parsing/claim behavior | Pass | N/A | Pass | Pass | Correctly remains in `file-queue-owner-lock.ts`; not folded into data-file lifecycle. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `FileQueueStateStoreConfig<TState>` | Pass | Pass | Pass | Pass | Config is constrained to file path, queue name, empty-state factory, parser callback, and optional logger/clock/test hooks. |
| `QueueStateQuarantineResult` / event | Pass | Pass | Pass | Pass | Fields have singular diagnostic meaning: queue name, reason, original path, quarantine path, timestamp. |
| Queue-specific `parseState` callbacks | Pass | Pass | Pass | Pass | Parser callbacks preserve specialized state semantics without importing record models into the shared lifecycle owner. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Duplicated file lifecycle in `FileInboxStore` and `FileOutboxStore` | Pass | Pass | Pass | Pass | Replaced in this change by `FileQueueStateStore<TState>`. |
| Unhandled invalid queue content propagation to worker/runtime loop errors | Pass | Pass | Pass | Pass | Replaced by queue-specific parser rejection plus shared lifecycle quarantine/reset. |
| Legacy `COMPLETED_ROUTED` / old `ROUTED` compatibility temptation | Pass | Pass | Pass | Pass | Clean-cut rejection remains explicit; active source grep has no legacy matches. |
| Manual operator deletion of stale queue data | Pass | Pass | Pass | Pass | Replaced by automatic per-file quarantine/reset with preserved diagnostics. |
| Earlier narrow `file-queue-state-quarantine.ts` helper shape | Pass | Pass | Pass | Pass | Revised design rejects helper-only patching; any in-progress old-shape work must be reworked into `FileQueueStateStore<TState>`. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-message-gateway/src/infrastructure/queue/file-queue-state-store.ts` | Pass | Pass | Pass | Pass | Owns lifecycle only: load, JSON boundary, parse callback invocation, missing init, invalid quarantine/reset, atomic persist, optional mutation serialization. |
| `autobyteus-message-gateway/src/infrastructure/inbox/file-inbox-store.ts` | Pass | Pass | Pass | Pass | Owns inbound record/status schema and operations; delegates lifecycle mechanics. |
| `autobyteus-message-gateway/src/infrastructure/outbox/file-outbox-store.ts` | Pass | Pass | Pass | Pass | Owns outbound record/status schema and operations; delegates lifecycle mechanics. |
| `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` | Pass | Pass | N/A | Pass | Wiring-only changes if constructors/options change. |
| Tests under queue/inbox/outbox/application service locations | Pass | Pass | N/A | Pass | Proposed tests cover lifecycle owner, concrete stores, and current inbound processing after reset. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `FileInboxStore` / `FileOutboxStore` | Pass | Pass | Pass | Pass | Stores depend on `FileQueueStateStore`; upper layers use store interfaces only. |
| `FileQueueStateStore<TState>` | Pass | Pass | Pass | Pass | Must not import inbox/outbox domain models, parse statuses, migrate legacy records, or become a general filesystem utility. |
| Workers/routes/bootstrap | Pass | Pass | Pass | Pass | They must not parse queue JSON or catch parser text to mutate files. |
| `GatewayRuntimeLifecycle` / `FileQueueOwnerLock` | Pass | Pass | Pass | Pass | Lock boundary is independent; data-file recovery must not delete/rewrite lock/claim files. |
| Domain status models | Pass | Pass | Pass | Pass | Current statuses remain authoritative; legacy statuses stay absent. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `FileQueueStateStore<TState>` | Pass | Pass | Pass | Pass | Authoritative for one queue data file's lifecycle; parser callback keeps domain semantics outside. |
| `FileInboxStore` | Pass | Pass | Pass | Pass | Authoritative for inbound record/status semantics and operations. |
| `FileOutboxStore` | Pass | Pass | Pass | Pass | Authoritative for outbound record/status semantics and operations. |
| `FileQueueOwnerLock` | Pass | Pass | Pass | Pass | Lock and claim file lifecycle remains isolated from data-file quarantine. |
| Domain status model | Pass | Pass | Pass | Pass | No active legacy status/disposition bypass is introduced. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `new FileQueueStateStore<TState>(config)` | Pass | Pass | Pass | Low | Pass |
| `FileQueueStateStore.load()` | Pass | Pass | Pass | Low | Pass |
| `FileQueueStateStore.persist(state)` or mutation executor | Pass | Pass | Pass | Low | Pass |
| `FileInboxStore` public methods | Pass | Pass | Pass | Low | Pass |
| `FileOutboxStore` public methods | Pass | Pass | Pass | Low | Pass |
| Optional logger/clock/unique-suffix hooks | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/infrastructure/queue/` | Pass | Pass | Low | Pass | Existing queue lock owner is here; shared queue data-file lifecycle is a sibling queue infrastructure concern. |
| `src/infrastructure/queue/file-queue-state-store.ts` | Pass | Pass | Low | Pass | Correctly named as a queue state lifecycle owner, not `helper` or generic `fs` utility. |
| `src/infrastructure/inbox/file-inbox-store.ts` | Pass | Pass | Low | Pass | Existing persistence-provider owner for inbound semantics. |
| `src/infrastructure/outbox/file-outbox-store.ts` | Pass | Pass | Low | Pass | Existing persistence-provider owner for outbound semantics. |
| `src/bootstrap/create-gateway-app.ts` | Pass | Pass | Low | Pass | Composition-only participation. |
| Proposed test locations | Pass | Pass | Low | Pass | Follows current unit/integration test structure. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Queue data-file lifecycle | Pass | Pass | Pass | Pass | `infrastructure/queue` is the right extension point; new owner is justified by duplicated lifecycle and shared invalid-state policy. |
| Inbound schema parsing | Pass | Pass | N/A | Pass | `FileInboxStore` remains the parser/status authority. |
| Outbound schema parsing | Pass | Pass | N/A | Pass | `FileOutboxStore` remains the parser/status authority. |
| Worker/runtime error reporting | Pass | Pass | N/A | Pass | Existing reporting remains for unexpected non-content operational errors. |
| Public health/status API | Pass | Pass | N/A | Pass | Not extending API is consistent with requirements and keeps scope bounded. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Inbound `COMPLETED_ROUTED` queue status | No | Pass | Pass | Source grep still has no active source match; tests may use fixture strings only. |
| Server ingress `ROUTED` success disposition | No | Pass | Pass | Current `ACCEPTED | UNBOUND | DUPLICATE` contract remains. |
| Per-record legacy migration/salvage | No | Pass | Pass | Whole-file quarantine is intentional; no semantic migration. |
| Bootstrap/worker catch-delete compatibility workaround | No | Pass | Pass | Explicitly rejected. |
| Helper-only old design retaining duplicated lifecycle | N/A | Pass | Pass | Revised design supersedes helper-only implementation work. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Add `FileQueueStateStore<TState>` | Pass | Pass | Pass | Pass |
| Move common file lifecycle out of inbox/outbox stores | Pass | Pass | Pass | Pass |
| Keep queue-specific parsers/status unions local and strict | Pass | Pass | Pass | Pass |
| Preserve lock lifecycle separation | Pass | Pass | Pass | Pass |
| Add lifecycle-owner, store, and application integration coverage | Pass | Pass | Pass | Pass |
| Remove/rework in-progress `file-queue-state-quarantine` helper shape | Pass | Pass | Pass | Pass |
| Active source legacy grep validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Architecture improvement over helper-only patch | Yes | Pass | Pass | Pass | Good/bad shapes make the scope change clear. |
| Legacy inbound status recovery | Yes | Pass | Pass | Pass | Example distinguishes quarantine/reset from compatibility. |
| Quarantine scope | Yes | Pass | Pass | Pass | Example protects lock/config/session data. |
| Recovery owner | Yes | Pass | Pass | Pass | Example prevents worker/bootstrap boundary bypass. |
| Valid current file preservation | Yes | Pass | Pass | Pass | Example prevents destructive reset of healthy queues. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Concurrent first access during invalid-state recovery | Multiple accesses can race before state is cached. | Implement `FileQueueStateStore` with serialized load/mutation or idempotent ENOENT behavior after a same-directory rename; avoid repeated worker-loop failures. | Residual implementation risk; not a design blocker. |
| Parser callback error classification | The shared lifecycle owner will treat parser callback failures as invalid content. | Keep parser callbacks limited to current-state validation/parsing; do not embed non-deterministic external behavior in them. | Acceptable design constraint. |
| Whole-file quarantine drops active pending retry/dead-letter records from live processing | This is a product tradeoff in treating invalid queue state as disposable. | Preserve original file and log queue/reason/original/quarantine paths. | Accepted residual risk per requirements. |
| Lock-file corruption remains unrecovered | Lock lifecycle is a separate owner and was intentionally scoped out. | Do not delete/rewrite locks from `FileQueueStateStore`; handle lock recovery only in a lock-scoped ticket. | Accepted residual risk per requirements. |
| Current worktree contains old helper-shaped implementation artifacts | Earlier implementation began before the superseding design update. | Rework to `file-queue-state-store.ts`; remove or fold old `file-queue-state-quarantine.ts` and its tests unless they become private internals of the lifecycle owner without preserving the old public helper shape. | Implementation handoff note; not a design blocker. |

## Review Decision

Pass: the superseding design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Whole-file quarantine can remove pending retry/dead-letter queue records from active processing; preserve the original file and log queue/reason/original/quarantine paths.
- Recovery remains first-access rather than explicit startup preflight; `FileQueueStateStore` must avoid repeated worker-loop errors after the first invalid read.
- Concurrent first access requires serialization or idempotent ENOENT handling around quarantine rename and empty-state persistence.
- The generic type parameter must stay lifecycle-only. `FileQueueStateStore<TState>` must not import inbox/outbox domain models, parse statuses, migrate legacy records, or become a generic filesystem utility.
- Lock-file corruption/recovery remains intentionally out of scope; data-file quarantine must not touch lock/claim files.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 2 supersedes Round 1. The `FileQueueStateStore<TState>` boundary is right-sized: it centralizes queue data-file lifecycle mechanics while keeping inbox/outbox schema authority local and preserving the no-legacy rule. Existing old-shape `file-queue-state-quarantine` implementation work should be treated as superseded and reworked to the lifecycle-owner design.
