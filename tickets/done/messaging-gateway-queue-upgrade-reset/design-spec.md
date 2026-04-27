# Design Spec

## Current-State Read

The managed gateway constructs file-backed reliability queues in `createGatewayApp(...)`:

- inbound data: `runtimeDataRoot/reliability-queue/inbox/inbound-inbox.json`
- outbound data: `runtimeDataRoot/reliability-queue/outbox/outbound-outbox.json`
- locks: `runtimeDataRoot/reliability-queue/locks/{inbox,outbox}.lock.json`

`FileInboxStore` and `FileOutboxStore` are lazy file-backed stores. Both duplicate the same data-file lifecycle shape:

`readFile(queue-json) -> JSON.parse -> parseState -> parseRecord -> parseStatus -> cache state -> persist with temp file + rename`

If the file does not exist, each store initializes an empty state. If any other read/parse/schema/status error occurs, each store throws. This makes old transient queue files fatal to worker loops or enqueue paths. The observed upgrade breakage is one stale `inbound-inbox.json` containing `COMPLETED_ROUTED`, while the current domain model intentionally supports only current statuses such as `COMPLETED_ACCEPTED`.

This bug exposed a larger architecture problem, not only a missing status branch:

- queue data-file lifecycle work is duplicated across inbox and outbox stores;
- invalid transient queue state has no governing owner;
- any narrow patch in one store would invite parallel patches and drift in the other store;
- bootstrap or worker-level fixes would bypass the store/schema boundary and create mixed-level recovery logic.

`GatewayRuntimeLifecycle` already owns queue lock acquisition, heartbeat, release, worker start/stop, and rollback. That boundary is separate from queue data-file lifecycle. Lock files are not user queue data and must not be deleted by queue data-file reset.

Constraints the target design must respect:

- Do not re-add `COMPLETED_ROUTED` or old `ROUTED` success semantics.
- Preserve config, bindings, secrets, provider session/auth state, and queue lock lifecycle.
- Preserve invalid queue files for diagnostics.
- Valid current queue files must load unchanged.
- Improve the queue file architecture by extracting one reusable data-file lifecycle owner instead of applying parallel mechanical patches.

## Intended Change

Add a reusable file-backed queue data lifecycle owner and have the queue-specific stores delegate common file mechanics to it.

Target shape:

1. `FileQueueStateStore<TState>` under `src/infrastructure/queue/file-queue-state-store.ts` owns the common file lifecycle:
   - read the queue data file;
   - distinguish missing file from invalid content;
   - JSON parse at the file boundary;
   - call a queue-specific `parseState` callback for current schema validation;
   - quarantine invalid content;
   - initialize and persist a fresh empty current-version state;
   - persist updates atomically with temp file + rename;
   - optionally serialize mutations if implementation chooses to move the existing mutation queue into this owner.
2. `FileInboxStore` remains the inbound record/status schema owner. It supplies the store path, queue name, empty inbound state factory, and inbound `parseState` callback to `FileQueueStateStore`.
3. `FileOutboxStore` remains the outbound record/status schema owner and supplies the equivalent outbox-specific callbacks.
4. The gateway logs the queue name, reason, original path, and quarantine path when the lifecycle owner quarantines invalid data.
5. Future/new messages use the current `ACCEPTED -> COMPLETED_ACCEPTED` inbound contract and current outbox contract.

This is architecture cleanup plus reset/quarantine of disposable runtime state. It is not compatibility migration.

## Terminology

- `Queue data file`: one persisted JSON file owned by a queue store, e.g. `inbound-inbox.json` or `outbound-outbox.json`.
- `Queue data-file lifecycle owner`: shared infrastructure owner that governs loading, invalid-state quarantine/reset, and atomic persistence for one queue data file.
- `Queue-specific store`: `FileInboxStore` or `FileOutboxStore`, which owns record schema, status parsing, and queue business operations.
- `Queue lock file`: lock/claim files owned by `FileQueueOwnerLock` under `reliability-queue/locks`.
- `Invalid queue state`: a queue data file that exists but fails JSON parse, state schema validation, status parsing, record validation, or file version validation.
- `Quarantine`: rename the invalid queue data file to a timestamped/collision-resistant diagnostic path in the same directory, leaving original contents intact.
- `Reset`: initialize and persist `{ version: 1, records: [] }` for the affected queue after quarantine.

## Design Reading Order

Read and implement this design from abstract to concrete:

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: keep legacy statuses/dispositions absent from active source.
- No obsolete active legacy path currently exists in `autobyteus-message-gateway/src`; this ticket must not reintroduce one.
- Treat the old persisted file as invalid transient runtime data, not as an old schema to translate.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Gateway inbound queue first access after upgrade | New inbound work is accepted/forwarded under `COMPLETED_ACCEPTED` after reset | `FileInboxStore` using `FileQueueStateStore` | This is the user's broken path and proves the shared lifecycle owner serves a real use case. |
| DS-002 | Primary End-to-End | Gateway outbound queue first access with invalid outbox state | Outbox file is reset so future outbound work can enqueue/send | `FileOutboxStore` using `FileQueueStateStore` | Outbox has the same strict lazy-load failure shape; architecture should not drift. |
| DS-003 | Primary End-to-End | Valid current inbox/outbox file load | Current records remain available with no quarantine | Queue-specific store + `FileQueueStateStore` | Prevents destructive reset of healthy queue state. |
| DS-004 | Bounded Local | Shared queue data-file lifecycle | File read/missing/invalid/persist behavior is governed in one reusable owner | `FileQueueStateStore` | This is the architecture improvement exposed by the bug. |
| DS-005 | Bounded Local | Runtime lifecycle queue lock startup | Locks are acquired/heartbeat/released independently of queue-data quarantine | `GatewayRuntimeLifecycle` + `FileQueueOwnerLock` | Makes explicit that quarantine must not delete or rewrite lock files. |

## Primary Execution Spine(s)

DS-001 inbound upgrade recovery:

`Gateway worker/webhook first queue access -> FileInboxStore -> FileQueueStateStore.load -> inbound parseState rejects legacy status -> FileQueueStateStore quarantines/logs/resets -> FileInboxStore continues with empty current state -> Inbound enqueue/forwarder uses ACCEPTED contract -> inbound record completes as COMPLETED_ACCEPTED`

DS-002 outbound invalid outbox recovery:

`Outbound worker/callback first queue access -> FileOutboxStore -> FileQueueStateStore.load -> outbox parseState rejects invalid content -> FileQueueStateStore quarantines/logs/resets -> FileOutboxStore continues with empty current state -> future outbound enqueue/sender uses current outbox statuses`

DS-003 valid preservation:

`Gateway first queue access -> queue-specific store -> FileQueueStateStore.load -> parseState accepts version/status/schema -> cached state returned -> callers observe existing records -> no quarantine file is created`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The first inbound queue access reads the existing data file through the shared lifecycle owner. If the inbound parser rejects stale data such as `COMPLETED_ROUTED`, the lifecycle owner quarantines the file, writes a fresh empty state, and returns it to the inbox store. New inbound work then flows through existing inbox service/forwarder code and completes as `COMPLETED_ACCEPTED` when the server returns `ACCEPTED`. | Queue access, inbound store, shared file lifecycle, current inbound processing | `FileInboxStore` + `FileQueueStateStore` | Inbound parser, quarantine path generation, operator log event, current server disposition parser, tests |
| DS-002 | The outbox store uses the same shared lifecycle owner for file mechanics. Invalid outbound persisted data is handled by the same governing owner, while outbox status parsing remains outbox-specific. | Queue access, outbound store, shared file lifecycle, current outbound processing | `FileOutboxStore` + `FileQueueStateStore` | Outbox parser, quarantine path generation, operator log event, tests |
| DS-003 | Valid current files still parse as current queue state. No reset happens, so pending/dead-letter/terminal current records remain visible to services and runtime reliability routes. | Queue access, shared file lifecycle, queue-specific parser, store state | Queue-specific store + `FileQueueStateStore` | Valid-fixture regression coverage |
| DS-004 | Common file lifecycle is no longer repeated. The shared owner handles missing-file initialization, invalid-content quarantine/reset, atomic persistence, and any mutation serialization moved from the stores. | Read, parse callback, classify invalid, quarantine, persist | `FileQueueStateStore` | Error message normalization, concurrent ENOENT handling, deterministic hooks for tests |
| DS-005 | Runtime lifecycle acquires and heartbeats queue locks before workers run. Queue-data quarantine does not own or reset these files; lock recovery remains lease/claim behavior in `FileQueueOwnerLock`. | Runtime lifecycle, lock pair, worker loops | `GatewayRuntimeLifecycle` | Existing lock tests should remain unchanged unless constructor wiring changes |

## Spine Actors / Main-Line Nodes

- Gateway queue first access: worker loop, webhook enqueue, callback enqueue, or runtime reliability query that causes a store load.
- `FileInboxStore`: authoritative inbound queue record/status schema and inbound queue operations owner.
- `FileOutboxStore`: authoritative outbound queue record/status schema and outbound queue operations owner.
- `FileQueueStateStore`: authoritative reusable owner for queue data-file lifecycle, invalid-state quarantine/reset, and atomic persistence.
- Current queue services/workers: existing business processing after a fresh/valid state is available.
- `GatewayRuntimeLifecycle` / `FileQueueOwnerLock`: bounded lock lifecycle owner, explicitly not part of data-file reset.

## Ownership Map

| Node / Owner | Owns | Notes |
| --- | --- | --- |
| `createGatewayApp` | Wiring of runtime data root, stores, locks, services, workers, routes | Thin composition boundary; should not catch and delete invalid queue files. |
| `FileQueueStateStore<TState>` | One queue data file's common lifecycle: path, loading, JSON parse boundary, missing-file empty state, invalid-state quarantine/reset, atomic persistence, optional serialized mutation executor | New architecture owner. It must not know inbox/outbox record semantics or legacy statuses. |
| `FileInboxStore` | Inbound queue business operations, inbound state shape, inbound record parser, inbound status parser | It decides what is a valid current inbox state by supplying `parseState`; it must not accept legacy statuses. |
| `FileOutboxStore` | Outbound queue business operations, outbound state shape, outbound record parser, outbound status parser | Same model as inbox to avoid fragmented queue recovery. |
| `InboundInboxService` / `OutboundOutboxService` | Current business status transitions and replay semantics | Should not know about file quarantine or paths. |
| `InboundForwarderWorker` / `OutboundSenderWorker` | Worker loop, retry/dead-letter behavior, provider/server calls | Should not catch parse errors and mutate files. |
| `GatewayRuntimeLifecycle` | Lock pair acquisition, worker/supervisor start/stop, lock heartbeat, rollback | Keeps lock lifecycle separate from queue data reset. |
| Domain status model files | Current supported statuses only | Must remain free of `COMPLETED_ROUTED` and old `ROUTED` success support. |

If a public facade or entry wrapper exists, it remains thin unless listed as a governing owner above.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `/webhooks/:provider` route | `InboundMessageService` -> `InboundInboxService` -> `FileInboxStore` -> `FileQueueStateStore` | HTTP provider ingress | Queue-file schema recovery or legacy mapping |
| `/api/runtime-reliability/v1/*` routes | Queue services and `ReliabilityStatusService` | Admin visibility/replay | Quarantine policy or file mutation |
| `createGatewayApp` | Concrete store/worker/lock owners | Dependency composition | Compatibility mapping, parse-error catch/delete logic |
| Worker `onLoopError` callbacks | Worker + `ReliabilityStatusService` | Report unexpected runtime errors | Recovering invalid queue data files |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Duplicated load/missing-file/persist lifecycle in `FileInboxStore` and `FileOutboxStore` | The same queue data-file lifecycle policy should not be repeated in two stores | `FileQueueStateStore<TState>` | In This Change | Queue-specific parsers remain local. |
| Unhandled invalid queue content propagation from stores | Invalid transient queue files should not repeatedly bubble into worker loops after upgrade | Store-owned parser + shared lifecycle owner quarantine/reset | In This Change | Permission/read IO errors still throw. |
| Any temptation to re-add `COMPLETED_ROUTED` to current status parsing | Would preserve legacy behavior and violate scope | Quarantine/reset invalid old file | In This Change | Active source must remain clean. |
| Manual operator deletion of stale queue data after this upgrade failure | Product should recover automatically | Automatic data-file quarantine/reset | In This Change | Operators can still inspect quarantined files. |

## Return Or Event Spine(s) (If Applicable)

Quarantine diagnostic event:

`FileQueueStateStore detects invalid content -> same-directory rename succeeds -> quarantine event/result built -> warning logger emits queue/reason/originalPath/quarantinePath -> operator can inspect preserved file`

This event is not a public API event in this ticket. It is an operator-visible log entry.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `FileQueueStateStore`
  - `read queue file -> JSON.parse -> parseState callback -> on parse/validation error quarantine -> set state to empty -> persist empty -> return empty state`
  - This matters because it centralizes the architecture boundary that was missing.

- Parent owner: `FileInboxStore` / `FileOutboxStore`
  - `public queue operation -> load state through FileQueueStateStore -> apply queue-specific record/status logic -> persist through FileQueueStateStore if mutated`
  - This matters because file lifecycle and record schema are separated without hiding domain logic in a generic helper.

- Parent owner: `GatewayRuntimeLifecycle`
  - `acquire inbox lock -> acquire outbox lock -> start workers/supervisors -> heartbeat locks -> stop/release`
  - This matters because data-file quarantine must not take over lock lifecycle.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Collision-resistant quarantine path generation | DS-001, DS-002, DS-004 | `FileQueueStateStore` | Build same-directory diagnostic path with sanitized timestamp and unique suffix | Avoid overwriting earlier quarantines and keep rename atomic | Store files duplicate naming policy or bootstrap starts managing file internals |
| Operator warning log payload | DS-001, DS-002, DS-004 | `FileQueueStateStore` | Emit queue name, reason, original path, quarantine path | Makes reset visible | Worker/service logs generic loop errors without recovery detail |
| Current inbound status parsing | DS-001, DS-003 | `FileInboxStore` | Enforce current inbound status union only | Keeps no-legacy contract | Shared lifecycle owner becomes a hidden compatibility parser |
| Current outbound status parsing | DS-002, DS-003 | `FileOutboxStore` | Enforce current outbound status union only | Keeps record semantics queue-specific | Shared lifecycle owner becomes a mixed record parser |
| Queue lock lifecycle | DS-005 | `GatewayRuntimeLifecycle`, `FileQueueOwnerLock` | Acquire/heartbeat/release locks | Prevents concurrent workers | Data recovery deletes active lock state and breaks ownership safety |
| Regression fixtures | All | Test suites | Minimal invalid/valid files in temp dirs | Proves upgrade behavior without live user data | Tests depend on local runtime data or provider accounts |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Queue data-file lifecycle | `src/infrastructure/queue` | Extend | Existing queue infrastructure owns file queue locks; a sibling state-store owner is the correct queue-level file concern. | N/A |
| Inbound schema parsing | `src/infrastructure/inbox` | Reuse | `FileInboxStore` is already the inbound file schema authority. | N/A |
| Outbound schema parsing | `src/infrastructure/outbox` | Reuse | `FileOutboxStore` is already the outbound file schema authority. | N/A |
| Worker/runtime loop error reporting | `src/application/services/*worker*`, `ReliabilityStatusService` | Reuse unchanged | They should continue handling unexpected operational errors, not data-file quarantine. | N/A |
| Public health/status event | Runtime reliability API | Do not extend for this ticket | Not required by acceptance criteria; logs and preserved files are sufficient. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `infrastructure/queue` | Shared queue data-file lifecycle and queue locks | DS-001, DS-002, DS-004, DS-005 | `FileQueueStateStore`, `FileQueueOwnerLock` | Extend | State-store owner lives beside lock owner but does not alter lock ownership. |
| `infrastructure/inbox` | Inbound queue record schema, status parsing, queue operations | DS-001, DS-003 | `FileInboxStore` | Reuse/Refactor | Delegate common file lifecycle to `FileQueueStateStore`. |
| `infrastructure/outbox` | Outbound queue record schema, status parsing, queue operations | DS-002, DS-003 | `FileOutboxStore` | Reuse/Refactor | Delegate common file lifecycle to `FileQueueStateStore`. |
| `application/services` | Current inbound/outbound business transitions and worker loops | DS-001, DS-002 | Existing services/workers | Reuse unchanged except tests may exercise them | Do not add queue file handling here. |
| `bootstrap` | Wiring stores/locks/workers/routes | DS-005 | `createGatewayApp` | Reuse/minor wiring only if constructor config changes | Avoid a bootstrap recovery coordinator. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/infrastructure/queue/file-queue-state-store.ts` | Queue infrastructure | Queue data-file lifecycle | Generic over state type; owns file read/JSON parse/missing init/invalid quarantine/reset/atomic write and optional serialized mutation executor | This is the missing lifecycle owner exposed by the bug | N/A |
| `src/infrastructure/inbox/file-inbox-store.ts` | Inbox infrastructure | Inbound file store | Supply inbound state parser/empty factory; implement inbound operations against shared state owner; keep strict status parser | Inbound record schema is specific to inbox | `FileQueueStateStore` |
| `src/infrastructure/outbox/file-outbox-store.ts` | Outbox infrastructure | Outbound file store | Supply outbox state parser/empty factory; implement outbound operations against shared state owner; keep strict status parser | Outbound record schema is specific to outbox | `FileQueueStateStore` |
| `tests/unit/infrastructure/queue/file-queue-state-store.test.ts` | Queue tests | Queue state lifecycle owner test boundary | Verify missing-file init, invalid JSON/schema quarantine/reset, valid load, atomic persist/quarantine result, lock files untouched if in sibling path | Lifecycle owner has logic independent of inbox/outbox schemas | N/A |
| `tests/integration/infrastructure/inbox/file-inbox-store.integration.test.ts` | Inbox tests | Store recovery/preservation | Verify legacy status quarantine, invalid version/schema/JSON reset, valid file preservation | File IO behavior through concrete store | `FileQueueStateStore` |
| `tests/integration/infrastructure/outbox/file-outbox-store.integration.test.ts` | Outbox tests | Store recovery/preservation | Verify invalid outbox quarantine/reset and valid preservation | Mirrors outbox failure shape | `FileQueueStateStore` |
| `tests/integration/application/services/inbound-forwarder-worker.integration.test.ts` | Application integration tests | Current inbound path after reset | Verify after invalid inbox reset, a newly enqueued record is forwarded and marked `COMPLETED_ACCEPTED` | Proves AC-002 without live Telegram/server | Store lifecycle indirectly |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Queue data-file read/missing/invalid/quarantine/reset/atomic persist lifecycle | `src/infrastructure/queue/file-queue-state-store.ts` | Queue infrastructure | Both stores duplicate this lifecycle today and need one invalid-state policy | Yes | Yes | A parser, migrator, or compatibility mapper |
| Quarantine event/result shape | same file | Queue infrastructure | Logs/tests need stable fields | Yes | Yes | A broad reliability status model |
| Store parse/record normalization helpers | Keep local in inbox/outbox files | Inbox/outbox infrastructure | Schemas differ; sharing would create a mixed optional base | N/A | N/A | A kitchen-sink queue record parser |
| Queue lock parsing/claim behavior | Keep in `file-queue-owner-lock.ts` | Queue infrastructure | Lock lifecycle is separate from data-file lifecycle | N/A | N/A | Part of data-file reset |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `FileQueueStateStoreConfig<TState>` | Yes | Yes | Low | Include only file path/queue name, parse callback, empty-state factory, optional logger/clock/unique suffix supplier. Do not include queue records beyond `TState`. |
| `QueueStateQuarantineResult` / event | Yes | Yes | Low | Fields should be `queueName`, `reason`, `originalFilePath`, `quarantineFilePath`, `quarantinedAt`. Avoid duplicate path aliases. |
| Queue-specific `parseState` callbacks | Yes | Yes | Low | Keep inbound/outbound parser code local to stores; callbacks return one concrete current state type. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-message-gateway/src/infrastructure/queue/file-queue-state-store.ts` | Queue infrastructure | `FileQueueStateStore<TState>` | Shared queue data-file lifecycle: load, JSON parse, queue-specific parse callback, missing-file empty state, invalid-content quarantine/reset, atomic persistence, optional serialized mutation executor | One cohesive lifecycle owner; fixes architecture issue exposed by bug | N/A |
| `autobyteus-message-gateway/src/infrastructure/inbox/file-inbox-store.ts` | Inbox infrastructure | `FileInboxStore` | Strict current inbound queue parsing and inbound operations using shared lifecycle owner | Inbound queue schema and operations remain cohesive | `FileQueueStateStore` |
| `autobyteus-message-gateway/src/infrastructure/outbox/file-outbox-store.ts` | Outbox infrastructure | `FileOutboxStore` | Strict current outbound queue parsing and outbound operations using shared lifecycle owner | Outbound queue schema and operations remain cohesive | `FileQueueStateStore` |
| `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` | Bootstrap | Composition root | Only update constructor wiring if store constructors gain explicit lifecycle/logger config | Bootstrap is not recovery owner | Store config types if needed |
| Tests listed above | Test suites | Executable acceptance coverage | Verify shared lifecycle owner, invalid recovery, valid preservation, and current forwarding contract | Each test file follows existing package structure | N/A |

## Ownership Boundaries

- `FileQueueStateStore` is authoritative for common queue data-file lifecycle mechanics, including invalid-state quarantine/reset and atomic writes.
- `FileInboxStore` and `FileOutboxStore` are authoritative for deciding whether their own parsed JSON is valid current queue state, because they supply the current schema parser.
- Application services and workers depend on store interfaces. They must not inspect file paths, legacy statuses, or quarantine locations.
- `GatewayRuntimeLifecycle` and `FileQueueOwnerLock` are authoritative for lock state. Queue data-file recovery must not delete/rewrite lock files or claim files.
- Domain models remain authoritative for current statuses. They must not grow legacy-only values to make old files parse.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `FileQueueStateStore` | data-file path, load/parse JSON, missing-file init, quarantine/reset, atomic persist | `FileInboxStore`, `FileOutboxStore` | Stores duplicate quarantine/reset and atomic file lifecycle | Strengthen lifecycle owner API without adding record semantics |
| `FileInboxStore` | inbound record parser/status parser and inbound queue operations | `InboundInboxService`, worker, routes via service | Worker catches `Unsupported inbound inbox status` and deletes files | Strengthen store/lifecycle composition |
| `FileOutboxStore` | outbound record parser/status parser and outbound queue operations | `OutboundOutboxService`, worker, routes via service | Outbound worker catches parse errors and deletes outbox files | Strengthen store/lifecycle composition |
| `FileQueueOwnerLock` | lock and claim file semantics | `GatewayRuntimeLifecycle` | Data-file quarantine removes `reliability-queue/locks` | Add explicit lock API only in a lock-scoped ticket |
| Domain status model | current status union | Store parser and services | Add `COMPLETED_ROUTED` only to make old files parse | Keep parser strict; quarantine invalid files |

## Dependency Rules

Allowed dependencies:

- `FileInboxStore` -> `FileQueueStateStore`
- `FileOutboxStore` -> `FileQueueStateStore`
- `createGatewayApp` -> concrete stores/locks/services/workers for composition
- Application services/workers -> store interfaces and domain models
- Tests -> concrete stores/lifecycle owner as needed

Forbidden shortcuts:

- Workers, routes, bootstrap, or server client code must not parse queue JSON or quarantine/delete queue files directly.
- `FileQueueStateStore` must not import inbox/outbox domain record models or parse statuses.
- Store parsers must not accept `COMPLETED_ROUTED` or `ROUTED` as current successful semantics.
- Queue data-file recovery must not delete `reliability-queue/locks` or provider session/auth/config directories.
- Do not create a vague generic filesystem utility outside the queue subsystem for this domain-specific lifecycle.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `new FileQueueStateStore<TState>(config)` | One queue data file | Configure lifecycle owner with queue name, file path, empty-state factory, parser, optional logger/test hooks | Concrete file path plus queue name | No legacy behavior flag. |
| `FileQueueStateStore.load()` | One queue data file state | Load current state or recover invalid queue data file | Store's configured file path | JSON parse is shared; state parse callback is queue-specific. |
| `FileQueueStateStore.persist(state)` or mutation executor | One queue data file state | Write current state atomically | `TState` returned by queue-specific parser/factory | May include serialized mutation API if implementation moves mutation queue here. |
| `FileInboxStore` public methods | Inbound queue records | Upsert, get, lease, update, list current records | Ingress key / record ID / current statuses | Public behavior unchanged after recovery. |
| `FileOutboxStore` public methods | Outbound queue records | Upsert, get, lease, update, list current records | Dispatch key / record ID / current statuses | Public behavior unchanged after recovery. |

Rule applied: no generic mixed queue API is introduced for inbox/outbox record operations. The only shared boundary is file-level lifecycle, where the subject is explicitly one queue data file.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `FileQueueStateStore` config/load/persist | Yes | Yes | Low | Keep generic only over state type; do not add status-specific logic. |
| `InboxStore` | Yes | Yes | Low | No public interface change required. |
| `OutboxStore` | Yes | Yes | Low | No public interface change required. |
| Store constructor lifecycle options if added | Yes | Yes | Low | Options must be logger/clock only; no legacy compatibility flag. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared queue data-file lifecycle | `FileQueueStateStore` | Yes | Low | Name should reflect lifecycle/state store, not vague helper. |
| Inbound file store | `FileInboxStore` | Yes | Low | Keep. |
| Outbound file store | `FileOutboxStore` | Yes | Low | Keep. |
| Queue lock owner | `FileQueueOwnerLock` | Yes | Low | Keep separate from data lifecycle owner. |
| Current inbound terminal success | `COMPLETED_ACCEPTED` | Yes | Low | Do not reintroduce `COMPLETED_ROUTED`. |

## Applied Patterns (If Any)

- Repository/store pattern: `FileInboxStore` and `FileOutboxStore` are queue-specific persistence boundaries for current records.
- Reusable owned structure: `FileQueueStateStore<TState>` extracts the repeated file lifecycle concern under the queue subsystem.
- Worker loop pattern: inbound and outbound workers lease/process/update queue records; they are not recovery owners.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-message-gateway/src/infrastructure/queue/` | Folder | Queue infrastructure | Queue-level file concerns, including locks and state lifecycle | Existing queue lock owner already lives here; shared state lifecycle is another queue-file concern | Inbox/outbox record schema parsing |
| `autobyteus-message-gateway/src/infrastructure/queue/file-queue-state-store.ts` | File | Queue data-file lifecycle | Load, validate via callback, quarantine/reset invalid content, persist atomically | Shared by inbox/outbox and not app/bootstrap-specific | Legacy status mapping, record parsing, lock deletion |
| `autobyteus-message-gateway/src/infrastructure/inbox/file-inbox-store.ts` | File | Inbound file store | Strict inbound schema parsing and operations using shared lifecycle owner | Existing owner of inbound data file semantics | Bootstrap logic, lock lifecycle, old status support |
| `autobyteus-message-gateway/src/infrastructure/outbox/file-outbox-store.ts` | File | Outbound file store | Strict outbound schema parsing and operations using shared lifecycle owner | Existing owner of outbound data file semantics | Bootstrap logic, lock lifecycle |
| `autobyteus-message-gateway/src/bootstrap/create-gateway-app.ts` | File | Composition root | Wire store constructor changes only if needed | Store creation happens here | Quarantine policy or parse-error catch/delete logic |
| `autobyteus-message-gateway/tests/unit/infrastructure/queue/` | Folder | Queue infrastructure tests | Unit coverage for shared lifecycle owner | Matches source folder | Store integration fixtures |
| `autobyteus-message-gateway/tests/integration/infrastructure/inbox/` | Folder | Inbox integration tests | File-backed inbound store recovery and preservation | Existing test location | Outbox-specific tests |
| `autobyteus-message-gateway/tests/integration/infrastructure/outbox/` | Folder | Outbox integration tests | File-backed outbound store recovery and preservation | Existing test location | Inbound-specific tests |
| `autobyteus-message-gateway/tests/integration/application/services/` | Folder | Application integration tests | Current forwarding contract after reset | Existing worker integration location | Low-level lifecycle path generation tests |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/infrastructure/queue` | Off-Spine Concern / Persistence infrastructure | Yes | Low | Queue-level file support is distinct from queue-specific record stores. |
| `src/infrastructure/inbox` | Persistence-Provider | Yes | Low | Inbound queue records and parser only. |
| `src/infrastructure/outbox` | Persistence-Provider | Yes | Low | Outbound queue records and parser only. |
| `src/bootstrap` | Mixed Justified composition | Yes | Low | Construction only; no new policy. |
| `src/application/services` | Main-Line Domain-Control / worker loops | Yes | Low | Existing services should not gain file recovery. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Architecture improvement | `FileInboxStore` and `FileOutboxStore` both use `FileQueueStateStore` for load/quarantine/reset/persist, while each keeps its own parser | Add a quarantine branch only to `FileInboxStore` and leave outbox/lifecycle duplication untouched | Ensures the bug improves architecture rather than creating one more patch. |
| Legacy inbound status recovery | `inbound-inbox.json` contains `COMPLETED_ROUTED` -> inbound parser rejects -> lifecycle owner renames file and writes fresh empty state -> new message completes as `COMPLETED_ACCEPTED` | Add `COMPLETED_ROUTED` to `InboundInboxStatus` and map it to current success | Shows reset/quarantine is not compatibility. |
| Quarantine scope | Rename only `reliability-queue/inbox/inbound-inbox.json`; leave `reliability-queue/locks/inbox.lock.json` alone | Delete entire `reliability-queue` root during startup | Prevents boundary bypass and lock ownership damage. |
| Recovery owner | `FileQueueStateStore.load()` handles invalid file lifecycle after queue-specific parser rejects | `InboundForwarderWorker` catches parse error text and deletes files | Keeps lifecycle authority at the persistence boundary. |
| Valid preservation | Existing valid `COMPLETED_UNBOUND` or `DEAD_LETTER` current records parse and remain queryable | Always reset queue on startup after upgrade | Prevents destructive behavior on healthy queues. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Add `COMPLETED_ROUTED` back to `InboundInboxStatus` and `parseStatus` | Would make old queue files parse | Rejected | Quarantine/reset invalid old file and keep active source clean. |
| Map old `COMPLETED_ROUTED` records to `COMPLETED_ACCEPTED` | Might preserve old records | Rejected | No semantic migration; old transient queue state is disposable and preserved only as quarantine evidence. |
| Accept old server `ROUTED` success disposition again | Adjacent legacy ingress contract existed before previous ticket | Rejected | Current server client remains `ACCEPTED | UNBOUND | DUPLICATE`. |
| Bootstrap-level catch-all that deletes `reliability-queue` | Quick operational workaround | Rejected | Store/lifecycle-owned per-file quarantine; lock/config/session data preserved. |
| Worker loop catch for `Unsupported inbound inbox status` | Would stop log spam locally | Rejected | It would depend on store internals and error text; fix the store/lifecycle boundary instead. |
| Quarantine helper only while keeping duplicated load/persist lifecycle | Smaller patch | Rejected | The user clarified this should fix the architecture issue exposed by the bug; create a reusable data-file lifecycle owner. |

Hard block: this design must not depend on backward-compatibility wrappers, dual-path behavior, or retained legacy flow for in-scope replaced behavior.

## Derived Layering (If Useful)

- HTTP/provider and server-callback routes: entry surfaces.
- Application services/workers: current message queue business flow.
- Queue-specific infrastructure stores: inbox/outbox record schema and operations.
- Shared queue infrastructure: file data lifecycle owner and lock owner.

Layering is descriptive only. The decisive boundary is shared queue data-file lifecycle ownership plus queue-specific schema ownership.

## Migration / Refactor Sequence

1. Add `src/infrastructure/queue/file-queue-state-store.ts` with tight config/result types and deterministic hooks only where tests need them.
2. Move common file lifecycle from `FileInboxStore` / `FileOutboxStore` into `FileQueueStateStore`:
   - read file;
   - handle `ENOENT` as empty initialization;
   - JSON parse;
   - call queue-specific parser;
   - quarantine/reset invalid content;
   - persist atomically with temp file + rename;
   - optionally centralize serialized mutation handling if it keeps the API clean.
3. Refactor `FileInboxStore` to use `FileQueueStateStore`, keeping inbound `parseState`, `parseRecord`, and `parseStatus` local and strict.
4. Refactor `FileOutboxStore` to use `FileQueueStateStore`, keeping outbound parser logic local and strict.
5. Keep `FileQueueOwnerLock` unchanged unless tests reveal constructor-path coupling; do not delete lock files during recovery.
6. Add unit tests for the shared lifecycle owner and integration tests for inbox/outbox recovery/preservation.
7. Add or extend an application integration test proving a new inbound record after reset forwards and marks `COMPLETED_ACCEPTED`.
8. Run targeted tests, full gateway typecheck/test as appropriate, and active source legacy grep.

Temporary seams: none should remain. The final state should not contain a compatibility mode, a second legacy parser path, or duplicated quarantine/reset branches inside inbox/outbox stores.

## Key Tradeoffs

- Lifecycle owner vs quarantine helper: a lifecycle owner is more refactor work, but it fixes the missing ownership exposed by the bug. A rename-only helper would leave duplicated file lifecycle and future drift risk.
- Store-level recovery vs startup preflight: store/lifecycle-level recovery keeps schema authority with the parser and satisfies startup/first-access recovery. It avoids a bootstrap recovery coordinator but means the reset happens when the queue is first touched.
- Whole-file quarantine vs per-record salvage: whole-file quarantine is simpler, avoids legacy mapping semantics, and preserves evidence. It may drop pending work from active processing, but the queue is internal transient state and the invalid original remains available.
- Logs instead of status API: logging satisfies operator visibility for this ticket without broadening the runtime-reliability API.

## Risks

- Pending queue records in an invalid file will not be retried automatically after reset. Mitigate with clear logs and preserved quarantine files.
- If invalid state comes from filesystem corruption plus permission issues, read/write errors may still fail startup/worker paths. This is intentional; only invalid content after successful read is disposable.
- Concurrent first access could race around quarantine. Implementation should make successful quarantine idempotent enough that a second attempt seeing `ENOENT` initializes empty rather than throwing a repeated parse failure.
- Generic `FileQueueStateStore` could become too broad if it starts accepting record/status concerns. Keep it lifecycle-only and parser-callback based.
- Tests containing `COMPLETED_ROUTED` fixture strings mean the no-legacy grep must target active source (`autobyteus-message-gateway/src`) rather than all tests.

## Guidance For Implementation

- Prefer same-directory rename for quarantine so the operation is atomic on the same filesystem.
- Use a filename suffix that is both human-readable and collision-resistant, e.g. sanitized timestamp plus a short/complete UUID.
- Persist the fresh empty state immediately after quarantine, not only in memory, so a restarted process sees a valid empty current file.
- Do not swallow non-content IO errors such as permission failures.
- Warning log shape should include at least:
  - queue name (`inbound inbox` / `outbound outbox`),
  - reason/error message,
  - original file path,
  - quarantine file path.
- `FileQueueStateStore` should not import inbox/outbox domain model files.
- Suggested focused validations:
  - `pnpm --dir autobyteus-message-gateway exec vitest run tests/unit/infrastructure/queue/file-queue-state-store.test.ts`
  - `pnpm --dir autobyteus-message-gateway exec vitest run tests/integration/infrastructure/inbox/file-inbox-store.integration.test.ts tests/integration/infrastructure/outbox/file-outbox-store.integration.test.ts`
  - `pnpm --dir autobyteus-message-gateway exec vitest run tests/integration/application/services/inbound-forwarder-worker.integration.test.ts`
  - `pnpm --dir autobyteus-message-gateway typecheck`
  - `pnpm --dir autobyteus-message-gateway test`
  - `rg -n "COMPLETED_ROUTED|\\bROUTED\\b" autobyteus-message-gateway/src || true` should show no active source matches.
