# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Make external-channel receipts and delivery events file-only, remove remaining SQL provider/runtime/schema surface, and replace provider-specific integration coverage with file-provider coverage. | 1 |
| v2 | Requirement-gap re-entry | Add shared Prisma query-log policy control so SQL query logs are off by default and only enabled by explicit env var, implemented through a `repository_prisma` package patch plus server env/docs updates. | 3 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/external-channel-sql-removal/investigation-notes.md`
- Requirements: `tickets/in-progress/external-channel-sql-removal/requirements.md`
- Requirements Status: `Refined`

## Summary

External-channel persistence already has a file-backed implementation for bindings, message receipts, and delivery events. The only remaining dual-path behavior is in `provider-proxy-set.ts`, which still routes receipts and delivery events through Prisma-backed SQL providers under SQL persistence profiles. A second problem is now confirmed: the shared Prisma wrapper package `repository_prisma` hardcodes query logging on the root Prisma client, so SQL query lines can still flood server logs whenever any Prisma-backed domain is active. The design is therefore two-part: collapse external-channel runtime persistence to file-backed providers, and patch the shared Prisma wrapper so query logging is disabled by default and only enabled by an explicit environment variable.

## Goal / Intended Change

- Preserve external-channel receipt and callback-delivery behavior.
- Remove SQL persistence selection for external-channel message receipts and delivery events.
- Remove external-channel Prisma schema surface that no longer has a runtime owner.
- Disable shared Prisma SQL query logging by default.
- Keep SQL query visibility available through explicit opt-in configuration.
- Keep all other persistence domains unchanged.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `sql-channel-message-receipt-provider.ts`, `sql-delivery-event-provider.ts`, their proxy selection branch, and their direct integration tests.
- Logging policy action: remove always-on Prisma query logging from the shared wrapper; do not retain a default-on compatibility mode.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | External-channel message receipts use file persistence only. | AC-001 | No external-channel runtime path selects SQL receipt persistence. | UC-001 |
| R-002 | External-channel delivery events use file persistence only. | AC-002 | No external-channel runtime path selects SQL delivery-event persistence. | UC-002 |
| R-003 | Runtime behavior remains covered without SQL provider tests. | AC-003 | File-provider integration tests cover the lifecycle and callback-event behaviors that were previously SQL-specific. | UC-001, UC-002 |
| R-004 | Prisma query noise from external-channel persistence disappears from normal runtime execution. | AC-004 | External-channel runtime no longer performs Prisma-backed receipt or delivery-event operations. | UC-001, UC-002 |
| R-005 | Shared Prisma query logging is default-off and opt-in. | AC-006, AC-007 | Repository Prisma client does not emit SQL query logs unless explicit troubleshooting config is enabled. | UC-003 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Services delegate through proxy-set indirection. | `src/external-channel/services/*.ts`, `src/external-channel/providers/provider-proxy-set.ts` | None blocking |
| Current Ownership Boundaries | Provider proxy owns persistence selection; provider files own storage mechanism details. | `src/external-channel/providers/` | None blocking |
| Current Coupling / Fragmentation Problems | Receipts and delivery events still honor global persistence profile, unlike bindings, so external-channel storage is inconsistent across its own capability area. | `provider-proxy-set.ts` | None blocking |
| Existing Constraints / Compatibility Facts | File providers already support required behaviors; no compatibility layer is needed. | `file-channel-message-receipt-provider.ts`, `file-delivery-event-provider.ts` | None blocking |
| Relevant Files / Components | SQL providers and Prisma models are isolated to this scope; shared Prisma log policy lives in the npm package `repository_prisma`. | `sql-*.ts`, `prisma/schema.prisma`, `node_modules/repository_prisma/dist/index.mjs` | Historical migration cleanup remains out of scope unless build requires it |

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | inbound external message accepted by external-channel service | persisted receipt/source context available for recovery and reply routing | `provider-proxy-set.ts` -> `FileChannelMessageReceiptProvider` | Removes the last SQL receipt path seen in logs. |
| DS-002 | Return-Event | gateway callback delivery event recorded | callback event persisted and queryable by callback key | `provider-proxy-set.ts` -> `FileDeliveryEventProvider` | Removes the last SQL delivery-event path seen in logs. |
| DS-003 | Shared SQL Logging Policy | Prisma-backed repository instantiated | SQL query logs emitted only when explicitly enabled | `repository_prisma` patched `rootPrismaClient` factory | Stops generic `prisma:query` log flooding outside the external-channel scope. |

## Primary Execution / Data-Flow Spine(s)

- `ChannelIngressService -> ChannelMessageReceiptService -> provider-proxy-set -> FileChannelMessageReceiptProvider -> JSON file storage`
- `GatewayCallbackDeliveryRuntime -> DeliveryEventService -> provider-proxy-set -> FileDeliveryEventProvider -> JSON file storage`
- `Prisma-backed repository import -> repository_prisma rootPrismaClient factory -> PrismaClient(log config) -> SQL query logging gated by env var`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | External-channel ingress and recovery flows keep using the receipt service API, but the proxy always resolves to the file-backed receipt provider, so receipt lifecycle state and source lookup stay within JSON storage regardless of the global persistence profile. | `ChannelIngressService`, `ChannelMessageReceiptService`, `provider-proxy-set`, `FileChannelMessageReceiptProvider` | external-channel provider proxy | integration tests, storage path helpers |
| DS-002 | Callback delivery recording and lookup continue through the delivery-event service API, but persistence is always handled by the file-backed provider rather than Prisma-backed SQL storage. | `GatewayCallbackDeliveryRuntime`, `DeliveryEventService`, `provider-proxy-set`, `FileDeliveryEventProvider` | external-channel provider proxy | integration tests, storage path helpers |
| DS-003 | Prisma-backed domains keep using the same repository wrapper, but the root Prisma client now excludes `query` from its default log array and adds it back only when an explicit env flag is present, so normal server logs stay clean while troubleshooting can still opt in. | `repository_prisma`, `rootPrismaClient`, `PrismaClient` | shared Prisma wrapper | package patch metadata, docs, focused unit test |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `provider-proxy-set.ts` | external-channel persistence implementation selection | SQL/file dual-path policy for receipts and delivery events | Aligns receipts and delivery events with bindings by making the subsystem internally consistent. |
| file providers | external-channel JSON persistence details | global persistence profile decisions | Already the correct owner. |
| Prisma schema | remaining SQL-backed domains only | external-channel receipt/delivery-event runtime contracts | External-channel Prisma models become dead after removal. |
| patched `repository_prisma` package | shared Prisma client log policy | app-specific repository query-call behavior | One boundary change avoids touching each SQL-backed repository caller. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| external-channel storage path helpers | file providers | resolve JSON storage location | Yes |
| provider integration tests | provider proxy and file providers | verify lifecycle semantics without runtime coupling changes | Yes |
| package patch metadata and docs | shared Prisma wrapper owner | capture opt-in query-log policy and operator control | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| receipt persistence | `src/external-channel/providers/file-channel-message-receipt-provider.ts` | Reuse | Already supports required lifecycle and lookup behavior. | N/A |
| delivery-event persistence | `src/external-channel/providers/file-delivery-event-provider.ts` | Reuse | Already supports required upsert and lookup behavior. | N/A |
| Prisma query-log policy | shared `repository_prisma` client factory | Extend via patch | One centralized patch controls all SQL-backed repository clients. | N/A |

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Remove + Patch`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): Removing the SQL branch simplifies the subsystem, aligns all external-channel storage under one persistence owner, and avoids Prisma-backed noise in this domain. A small dependency patch is the narrowest way to make generic Prisma query logging opt-in without touching every SQL-backed repository caller.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Boundary encapsulation assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Remove`

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | Yes | Proxy-set owns persistence choice for multiple services. | Keep owner and simplify policy |
| Responsibility overload exists in one file or one optional module grouping | No | `provider-proxy-set.ts` stays a small selector file. | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | Yes | Proxy-set remains the boundary for provider selection. | Keep |
| Every off-spine concern has a clear owner on the spine | Yes | storage helper and test ownership are clear. | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | Yes | file providers are reused directly. | Reuse |
| Current structure can remain unchanged without spine/ownership degradation | No | Dual SQL/file path keeps the subsystem internally inconsistent. | Change |

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/external-channel/providers/provider-proxy-set.ts` | same | Make external-channel provider resolution file-only. | runtime provider selection | Remove SQL branch for receipts/delivery events. |
| C-002 | Remove | `autobyteus-server-ts/src/external-channel/providers/sql-channel-message-receipt-provider.ts` | removed | Dead after C-001. | runtime provider implementation | No compatibility wrapper. |
| C-003 | Remove | `autobyteus-server-ts/src/external-channel/providers/sql-delivery-event-provider.ts` | removed | Dead after C-001. | runtime provider implementation | No compatibility wrapper. |
| C-004 | Modify | `autobyteus-server-ts/prisma/schema.prisma` | same | Remove dead external-channel Prisma models. | schema surface | Keep other models unchanged. |
| C-005 | Replace | SQL provider integration tests | file provider integration tests | Preserve behavior coverage without SQL. | tests | One receipt test file, one delivery-event test file. |
| C-006 | Patch | `repository_prisma@1.0.6` client factory | workspace patch file + package metadata | Make SQL query logging opt-in through env var. | all Prisma-backed domains | Default excludes `query` log level. |
| C-007 | Modify | server env/docs files | same | Document the new query-log control switch. | operator docs | No runtime behavior change beyond discoverability. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| SQL receipt provider | file provider already covers lifecycle semantics | `file-channel-message-receipt-provider.ts` | In This Change | Remove code and direct tests |
| SQL delivery-event provider | file provider already covers callback persistence semantics | `file-delivery-event-provider.ts` | In This Change | Remove code and direct tests |
| external-channel Prisma models | only referenced by removed SQL providers | none | In This Change | Historical migrations may remain untouched |
