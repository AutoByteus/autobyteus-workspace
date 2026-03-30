# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Defined a keep-the-spine, remove-the-leftovers cleanup plan for the gateway dead-code cluster. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/gateway-dead-code-investigation/investigation-notes.md`
- Requirements: `tickets/in-progress/gateway-dead-code-investigation/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`
- Common Design Practices: `shared/common-design-practices.md`

## Summary

The design keeps the current gateway architecture intact. The Telegram-centered runtime spine, durable inbox/outbox flow, and adapter-local transport logic are already coherent. The change is therefore a subtraction-focused refactor:

- remove the dead callback-idempotency cluster,
- trim `idempotency-service.ts` to the live ingress-key helper,
- remove the dead centralized chunk planner,
- remove gateway-local config/env surface that only existed for the deleted abstractions,
- update tests so they stop preserving deleted source files.

## Goal / Intended Change

Align the gateway production tree with the code that is actually responsible for live runtime behavior, without introducing new layers, compatibility wrappers, or ownership shifts.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: identify and remove obsolete legacy paths/files included in this scope.
- Treat removal as first-class design work: when clearer subsystem ownership, reusable owned structures, or tighter file responsibilities make fragmented or duplicated pieces unnecessary, name and remove/decommission them in scope.
- Gate rule: design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Preserve the live Telegram-centered runtime spine. | AC-001 | Existing Telegram runtime coverage remains valid after cleanup. | UC-001 |
| R-002 | Remove the dead callback-idempotency source cluster. | AC-002, AC-003 | Dead callback-idempotency files are deleted and callback dedupe remains outbox-owned. | UC-002 |
| R-003 | Trim `idempotency-service.ts` to the live inbound key helper only. | AC-004 | The live helper remains; the dead class is removed. | UC-003 |
| R-004 | Remove the dead centralized chunk planner and keep chunk handling adapter-local. | AC-005 | Dead planner is deleted and adapters remain the behavior owners. | UC-004 |
| R-005 | Remove unused gateway idempotency TTL env/config surface. | AC-006 | Old gateway-local TTL fields are removed from source and tests. | UC-005 |
| R-006 | Update tests so deleted files are no longer kept alive artificially. | AC-007 | Tests no longer reference deleted source files and scoped validation passes. | UC-002, UC-003, UC-004, UC-005 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | The runtime has one clear composition root and one durable inbox/outbox model. | `src/index.ts`, `src/bootstrap/start-gateway.ts`, `src/bootstrap/create-gateway-app.ts`, `src/bootstrap/gateway-runtime-lifecycle.ts` | None blocking |
| Current Ownership Boundaries | Bootstrap owns composition, HTTP owns ingress exposure, application services own queue semantics, adapters own transport behavior. | `src/bootstrap/*`, `src/http/routes/*`, `src/application/services/*`, `src/infrastructure/adapters/*` | None blocking |
| Current Coupling / Fragmentation Problems | The remaining problem is narrow: a small legacy cluster with no production callers plus stale config fields. | `src/application/services/callback-idempotency-service.ts`, `src/domain/models/idempotency-store.ts`, `src/infrastructure/idempotency/in-memory-idempotency-store.ts`, `src/application/services/outbound-chunk-planner.ts`, `src/config/*` | Upstream env emission exists outside this repo |
| Existing Constraints / Compatibility Facts | Telegram polling and webhook paths are both live and must remain intact. Callback dedupe is already owned by the durable outbox route/service path. | `src/http/routes/provider-webhook-route.ts`, `src/http/routes/server-callback-route.ts`, Telegram tests | None blocking |
| Relevant Files / Components | `idempotency-service.ts` is mixed: one live helper and one dead class. | `src/application/services/idempotency-service.ts`, `src/application/services/inbound-inbox-service.ts` | None blocking |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `src/index.ts:main()` | `src/infrastructure/adapters/telegram-business/telegram-business-adapter.ts:sendOutbound(...)` | Bootstrap + application runtime | This is the live Telegram ingress-to-outbound runtime spine that must not be disturbed. |
| DS-002 | Return-Event | `src/http/routes/server-callback-route.ts:registerServerCallbackRoutes(...)` | `src/application/services/outbound-outbox-service.ts:enqueueOrGet(...)` | Server callback route | This is the actual callback dedupe owner, which makes the old callback-idempotency service removable. |
| DS-003 | Bounded Local | `src/application/services/inbound-inbox-service.ts:enqueue(...)` | `src/application/services/idempotency-service.ts:buildInboundIdempotencyKey(...)` | Inbound inbox service | This local spine proves the file should be trimmed, not deleted. |
| DS-004 | Bounded Local | provider adapter `sendOutbound(...)` methods | adapter-local chunk list creation | Provider adapters | This local spine proves the centralized chunk planner is not the active owner anymore. |
| DS-005 | Bounded Local | `src/bootstrap/start-gateway.ts:startGateway()` | `src/config/runtime-config.ts:buildRuntimeConfig(...)` | Config bootstrap | This local spine constrains the config cleanup to fields that no live runtime owner reads. |

## Primary Execution / Data-Flow Spine(s)

- `src/index.ts:main -> src/bootstrap/start-gateway.ts:startGateway -> src/bootstrap/create-gateway-app.ts:createGatewayApp -> src/http/routes/provider-webhook-route.ts:registerProviderWebhookRoutes -> src/application/services/inbound-message-service.ts:handleInbound -> src/application/services/inbound-inbox-service.ts:enqueue -> src/application/services/inbound-forwarder-worker.ts:runLoop -> src/infrastructure/server-api/autobyteus-server-client.ts:forwardInbound`
- `src/http/routes/server-callback-route.ts:registerServerCallbackRoutes -> src/application/services/outbound-outbox-service.ts:enqueueOrGet -> src/application/services/outbound-sender-worker.ts:runLoop -> provider adapter sendOutbound`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `startGateway()` | Runtime bootstrap | Reads env, builds config, starts the app |
| `createGatewayApp()` | Composition root | Wires adapters, workers, routes, and lifecycle owners |
| HTTP route handlers | External entry boundaries | Normalize and verify inbound requests |
| Inbox/outbox services | Durable queue owners | Own dedupe keys and persistent queue state |
| Workers | Retry and dispatch owners | Advance queued work toward completion |
| Provider adapters | Transport owners | Normalize external payloads and send outbound messages |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Support Branches |
| --- | --- | --- | --- | --- |
| DS-001 | Telegram traffic enters through webhook or polling, becomes canonical envelopes, is persisted in the inbox, forwarded to the server, then server callbacks are persisted in the outbox and delivered by the selected adapter. | Bootstrap, HTTP route, inbox service, workers, Telegram adapter | Gateway runtime composition | Signature verification, queue storage, session supervision, peer discovery |
| DS-002 | Server callbacks are authenticated, parsed, and deduplicated at enqueue time by the outbox service. No separate callback-idempotency service participates anymore. | Server callback route, outbox service | Server callback route | Signature middleware, outbox persistence |
| DS-003 | Inbound inbox enqueue derives an ingress key from the message envelope before persistence. The helper is live, but the old service wrapper around it is not. | Inbound inbox service, key builder helper | Inbound inbox service | None |
| DS-004 | Each outbound adapter already owns its own chunk normalization before transport send, so there is no live shared planner on the main line. | Telegram/Discord/WhatsApp/WeChat adapters | Individual adapters | Transport clients and peer/session context |
| DS-005 | Runtime bootstrap builds config once and passes it into composition. Fields that no runtime owner consumes should not remain in the config model. | `startGateway`, `buildRuntimeConfig`, `createGatewayApp` | Config bootstrap | Env reader |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `bootstrap/` | Composition, lifecycle startup/shutdown, dependency wiring | Legacy business helpers that no runtime caller needs | Keep intact |
| `http/routes/server-callback-route.ts` + `OutboundOutboxService` | Server callback acceptance and dedupe enqueue boundary | Separate callback-idempotency wrapper | Existing ownership is already correct |
| `InboundInboxService` | Inbox persistence semantics and ingress-key usage | General-purpose idempotency store lifecycle | Helper-only dependency is enough |
| Provider adapters | Provider-specific chunk handling and send sequencing | Unused shared planner abstraction | Current ownership is already local and explicit |
| `config/` | Runtime config shape for live consumers | Fields with no runtime owner | Remove stale fields |

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `InboundInboxService`
  - Start and end: `enqueue(envelope)` -> `buildInboundIdempotencyKey(envelope)`
  - Short arrow chain: `InboundInboxService.enqueue -> buildInboundIdempotencyKey -> InboxStore.upsertByIngressKey`
  - Why explicit: proves that `idempotency-service.ts` should be trimmed, not deleted.
- Parent owner: provider adapters
  - Start and end: `sendOutbound(payload)` -> adapter-local chunk array creation
  - Short arrow chain: `sendOutbound -> resolve/local chunk list -> transport client send`
  - Why explicit: proves that chunk normalization is now adapter-owned and the shared planner is obsolete.
- Parent owner: config bootstrap
  - Start and end: `startGateway()` -> `buildRuntimeConfig(readEnv())`
  - Short arrow chain: `readEnv -> buildRuntimeConfig -> createGatewayApp`
  - Why explicit: constrains config removal to fields with no runtime reader.

## Support Structure Around The Spine

| Support Branch / Service | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Telegram peer candidate indexes and discovery services | Telegram adapter and admin route | Track and expose observed peers | Yes |
| Session supervisors | Polling-capable adapters | Runtime connection lifecycle and reconnects | Yes |
| Retry/backoff helpers | Queue workers | Retry scheduling and delay calculation | Yes |
| Env reader | Config bootstrap | Normalize process env inputs | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Callback dedupe ownership | Outbox service + callback route | Reuse | Already owns the live dedupe boundary | N/A |
| Inbound ingress-key generation | `application/services/idempotency-service.ts` helper | Reuse | Only the helper is still needed | N/A |
| Outbound chunk behavior | Provider adapters | Reuse | Behavior is already implemented and owned locally | N/A |
| Config cleanup | `config/` | Reuse | Only model pruning is required | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application/services/` | Keep live inbox helper file, remove dead service files | DS-002, DS-003, DS-004 | Inbox service, outbox service, adapters | Extend | Mostly removal and one file trim |
| `domain/models/` | Remove dead idempotency store contract | DS-002, DS-003 | Former idempotency wrappers | Extend | Deletion only |
| `infrastructure/idempotency/` | Remove dead in-memory idempotency store | DS-002 | Former idempotency wrappers | Extend | Deletion only |
| `config/` | Remove unused idempotency TTL fields | DS-005 | Bootstrap/runtime config | Extend | Keep remaining config shape intact |
| `tests/` | Remove dead-file tests and trim mixed-file tests | DS-001 through DS-005 | Validation | Extend | Required to stop preserving dead files |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `bootstrap -> config/application/http/infrastructure`
  - `http routes -> application services`
  - `application services -> domain models / infrastructure persistence / adapters by stable contracts`
  - `tests -> src`
- Forbidden shortcuts:
  - callback route -> deleted callback-idempotency service
  - adapters -> centralized outbound chunk planner
  - inbox service -> deleted idempotency store/service wrapper
- Temporary exceptions and removal plan:
  - None

## Architecture Direction Decision (Mandatory)

- Chosen direction: keep the current runtime spine and remove the narrow legacy cluster around it.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): the live architecture is already coherent, so subtraction is lower risk than re-layering. Tests already anchor the Telegram path. Operability stays unchanged because queue ownership and adapter behavior remain where they already are.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Support structure clarity assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Keep + Remove + Trim`
- Note: the design keeps the current spine and removes only obsolete files/fields that no longer have a live owner.

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Support Branch | Notes |
| --- | --- | --- | --- | --- |
| Spine-first subtraction | Whole change | Prevents dead-code cleanup from deleting live Telegram behavior | Runtime spine | Main design decision |
| Existing-capability reuse | Callback dedupe and chunk handling | Avoids reintroducing removed service layers | Outbox service and adapters | No new helper needed |
| Removal-first change inventory | Legacy cluster and config | Makes the cleanup explicit and reviewable | Application/domain/config/tests | Required by scope |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | No | Callback dedupe is already outbox-owned; chunk behavior is adapter-owned | Keep |
| Responsibility overload exists in one file or one optional module grouping | Yes | `idempotency-service.ts` mixes one live helper with one dead wrapper | Split/Trim |
| Proposed indirection owns real policy, translation, or boundary concern | No | Deleted services are pass-through wrappers around store/key usage | Remove |
| Every support branch has a clear owner on the spine | Yes | Queue, adapters, discovery, and config all have explicit owners | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | Cleanup stays in existing files/folders | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | Yes | Existing helper and adapter-local flows already cover the need | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | Yes | Live runtime boundaries are already coherent | Keep |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Remove | `src/application/services/callback-idempotency-service.ts` | N/A | No production callers; callback dedupe is outbox-owned | Application services, tests | Delete file and related tests |
| C-002 | Remove | `src/domain/models/idempotency-store.ts` | N/A | Only supported deleted idempotency wrappers | Domain models, tests | Delete file |
| C-003 | Remove | `src/infrastructure/idempotency/in-memory-idempotency-store.ts` | N/A | Only supported deleted idempotency wrappers | Infrastructure, tests | Delete file |
| C-004 | Modify | `src/application/services/idempotency-service.ts` | same path | Retain only `buildInboundIdempotencyKey(...)` | Application services, tests | Trim file |
| C-005 | Remove | `src/application/services/outbound-chunk-planner.ts` | N/A | No production callers; adapters already own chunk handling | Application services, tests | Delete file and test |
| C-006 | Modify | `src/config/env.ts` | same path | Remove unused idempotency TTL env fields | Config, tests | Gateway-local cleanup |
| C-007 | Modify | `src/config/runtime-config.ts` | same path | Remove unused idempotency TTL config fields | Config, tests | Keep `defaultRuntimeConfig()` |
| C-008 | Modify | `tests/unit/application/services/idempotency-service.test.ts` and config tests | same paths | Stop preserving deleted abstractions and align expectations | Tests | Trim or delete tests as needed |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `CallbackIdempotencyService` | Callback dedupe now happens through `OutboundOutboxService.enqueueOrGet(...)` | `src/http/routes/server-callback-route.ts` + `src/application/services/outbound-outbox-service.ts` | In This Change | Hard delete |
| `IdempotencyStore` contract | Only supported the deleted callback/idempotency wrappers | None | In This Change | Hard delete |
| `InMemoryIdempotencyStore` | Only supported deleted idempotency tests/services | None | In This Change | Hard delete |
| `IdempotencyService` class | `InboundInboxService` only needs the key-builder helper | `buildInboundIdempotencyKey(...)` in the same file | In This Change | File trimmed, helper kept |
| `OutboundChunkPlanner` | Chunk handling is already adapter-owned | Adapter-local `sendOutbound(...)` implementations | In This Change | Hard delete |
| Gateway idempotency TTL config fields | No live runtime owner consumes them | None | In This Change | Gateway-local cleanup only |
| Upstream managed-runtime emission of old env vars | External repo still emits them | External follow-up in `autobyteus-server-ts` | Follow-up | Not part of this implementation |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/application/services/idempotency-service.ts` | Application services | Inbound inbox helper boundary | Build ingress dedupe keys from envelopes | One small helper, one concern | No |
| `src/http/routes/server-callback-route.ts` | HTTP | Server callback ingress boundary | Authenticate, parse, and enqueue callbacks | Route already owns request boundary | Yes, outbox service |
| `src/config/env.ts` | Config | Env normalization | Read only live gateway env inputs | One normalization concern | No |
| `src/config/runtime-config.ts` | Config | Runtime config assembly | Build only live runtime config fields | One config model/builder concern | No |
| `tests/unit/application/services/idempotency-service.test.ts` | Tests | Helper validation | Cover live ingress-key helper behavior | Mirrors one live helper concern | No |

## Reusable Owned Structures Check (If Needed)

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Provider-local chunk normalization | None | Adapter owners | Already meaningfully specialized per adapter | Yes | Yes | A resurrected generic planner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Shared Core Vs Specialized Variant Decision Is Sound? (`Yes`/`No`/`N/A`) | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| `GatewayRuntimeConfig` after cleanup | Yes | Yes | Low | Yes | Remove old idempotency TTL fields |
| `buildInboundIdempotencyKey(...)` helper input/output | Yes | Yes | Low | N/A | Keep helper small and local |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/application/services/idempotency-service.ts` | Application services | Inbound inbox helper boundary | Build inbound ingress keys only | One concrete helper concern | No |
| `src/config/env.ts` | Config | Env normalization | Normalize live gateway env inputs | One boundary concern | No |
| `src/config/runtime-config.ts` | Config | Runtime config assembly | Assemble live gateway runtime config | One model/builder concern | No |
| `src/http/routes/server-callback-route.ts` | HTTP | Server callback boundary | Own live callback enqueue behavior | Already correct owner | Yes |
| Provider adapters | Infrastructure adapters | Transport send boundaries | Own provider-specific outbound chunk behavior | Already correct owner | No |

## Derived Implementation Mapping (Secondary)

- No new folders or subsystems are needed.
- The implementation is a narrow removal-and-trim change inside existing owners.
- Tests will be updated in place under `tests/unit` and existing integration/e2e coverage will remain the regression anchor for the live Telegram spine.
