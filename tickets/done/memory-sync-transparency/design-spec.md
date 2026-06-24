# Design Spec

## Current-State Read

The current Memory Sync Source card already shows the product-critical configuration facts: source enabled, background sync enabled, interval, source node id, display name, hub URL, redacted token, coarse `Job state`, and `Last success`. The approved product gap is intentionally narrow: users need to see whether sync is running now, whether the last sync succeeded or failed, whether `Sync now` actually started work, and what happened after `Test connection` without looking at a disconnected top-of-card alert.

Current frontend flow:

- `autobyteus-web/components/settings/MemorySyncCard.vue` owns the Source form and action buttons.
- The component has a deep `watch(() => store.status, syncForms, { deep: true })`; `syncForms()` resets every form field from status and clears `sourceForm.hubToken = ''`.
- That watcher is acceptable for one-time hydration, but unsafe for mounted polling because every status refresh would wipe unsaved hub URL/source id/display-name edits and any pasted draft token.
- `store.error` / `store.info` render near the top of the overall Memory Sync card, visually detached from the Source action row.
- `Sync now` already has transient `store.syncing`, but the card still renders raw backend `jobState` such as `success` as if it were current job state.

Current backend flow:

- `MemorySyncWorker` schedules background sync using the existing source config and calls `MemorySyncService.startSync()`.
- `MemorySyncService` already writes job status into `LocalFileMemorySyncStateStore`: `lastJobState = "running"` at start, then `success` or `error` at completion.
- On success it writes `lastSuccessfulSyncAt`, clears `lastError`, and sets `lastJobState: "success"`.
- On failure it writes `lastJobState: "error"` and `lastError`, but preserves the older `lastSuccessfulSyncAt`. Therefore the UI must give error precedence over stale success.
- `getMemorySyncStatus` already exposes `sourceState.jobState`, `lastSuccessfulSyncAt`, and `lastError`; no new backend job-status store is required.
- `testMemoryHubConnection` currently delegates directly to `MemoryHubClient().testConnection(input)`, so blank token input cannot test saved settings.

Architecture-review rework incorporated here:

- DR-001: status polling must not trigger Source form rehydration or clear draft token edits.
- DR-002: latest error must take precedence over an older success timestamp for `Last sync`.
- DR-003: blank-token test uses the fully persisted saved source config; draft URL/source id may not be mixed with a saved token.

## Intended Change

Make the Source card transparently show action state with minimal UI and minimal backend changes:

1. Replace user-facing `Job state: success/error` with two derived labels:
   - `Current job: idle` or `Current job: syncing…`
   - `Last sync: success · <timestamp>` or `Last sync: error · <message>`
2. Use the existing backend source-state file/store as the authoritative backend job status source.
3. Poll `getMemorySyncStatus` only while the Memory Sync card is mounted/visible, at a low frequency (`30s`), with request-overlap prevention.
4. Remove the deep status watcher. Hydrate forms only on initial load, after an explicit successful save, or after an explicit reset/reload action if added later.
5. Polling/status refresh updates operation-status display only; it never overwrites editable Source form state and never clears `sourceForm.hubToken`.
6. Add inline `Test connection` status beside/under the Test button.
7. Add spinner/disabled `Syncing…` state on the `Sync now` button.
8. Add a backend source-owned connection-test boundary so saved-settings and draft-token tests have clear identity semantics.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UX Feature
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, limited
- Evidence:
  - UI renders action feedback away from the action row.
  - Raw `jobState: success/error` is displayed as if it were current job state.
  - Proposed polling would be unsafe unless the current deep form-hydration watcher is removed or constrained.
  - Connection testing needs backend-owned saved-config semantics rather than a low-level client or resolver shortcut.
- Design response:
  - Use existing backend status store; no new job-status file or job system.
  - Split frontend concerns: editable form hydration vs operation-status refresh.
  - Define exact last-sync precedence.
  - Define exact saved-settings vs draft-token test identity.
- Refactor rationale:
  - The refactor is required because adding polling into the current watcher design would corrupt user input.
  - The backend refactor is required to avoid mixing saved secret material with draft identity fields in the resolver/UI.
- Intentional deferrals and residual risk, if any:
  - No activity log, next-run display, manual/background wording, or detailed progress phases in this ticket.
  - Background jobs may be missed between low-frequency polls if they are very fast; acceptable because manual `Sync now` always provides immediate local feedback and polling is intentionally low-traffic.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove user-facing reliance on `Job state: success/error` wording in the Source card and remove the deep status watcher as the steady-state form hydration mechanism.
- Decision rule: no compatibility UI branch that displays old `Job state` next to new `Current job`; no polling path that calls `syncForms()` automatically on every status update.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User clicks `Test connection` | Inline test result in Source card | `MemorySyncConnectionTestService` | Makes test feedback local and identity-safe. |
| DS-002 | Primary End-to-End | User clicks `Sync now` | Button shows spinner and `Current job`/`Last sync` update | `MemorySyncService` + frontend action state | Confirms user click started sync and shows completion. |
| DS-003 | Primary End-to-End | Backend background job writes source status | Polling observes running/success/error without form reset | Existing source state store + frontend status projection | Makes backend job state visible with low traffic. |
| DS-004 | Bounded Local | Card status refresh timer fires | Store status updates without form hydration | `MemorySyncCard` lifecycle | Prevents polling from clobbering editable forms. |

## Primary Execution Spine(s)

- DS-001: `Test connection button -> memorySyncStore.testConnection -> GraphQL testMemoryHubConnection -> MemorySyncConnectionTestService -> MemoryHubClient health call -> inline Source card result`
- DS-002: `Sync now button -> memorySyncStore.syncNow local syncing state -> GraphQL startMemorySync -> MemorySyncService -> LocalFileMemorySyncStateStore -> status refresh -> Current job / Last sync UI`
- DS-003: `MemorySyncWorker interval -> MemorySyncService.startSync -> LocalFileMemorySyncStateStore -> low-frequency getMemorySyncStatus poll -> Current job / Last sync UI`
- DS-004: `onMounted -> initial load + form hydrate -> start 30s status-only refresh -> apply status projection -> onUnmounted cleanup`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The user tests connection. If a draft token is present, the draft URL/source id/token are tested together. If token is blank, backend tests the persisted saved source config only. Result renders inline near the button. | Source action, connection-test service, hub health | `MemorySyncConnectionTestService` | Token redaction, inline copy, result timestamp |
| DS-002 | The user starts sync. UI immediately enters `Syncing…`; backend writes running/success/error to existing source state; UI displays current and last labels using precedence rules. | Source action, sync service, source state | `MemorySyncService` | Spinner, duplicate-click prevention, label derivation |
| DS-003 | Background sync updates the same source state file/store. The visible card polls infrequently and renders `Current job: syncing…` if it observes `running`, otherwise last result. | Worker, sync service, source state, status query | `MemorySyncWorker` / `MemorySyncService` | Poll interval, no manual/background wording |
| DS-004 | Status refresh updates store status for display but does not call form hydration. Forms are hydrated only at explicit lifecycle points. | Mounted card, store status, local form | `MemorySyncCard` | Dirty preservation, token preservation, request guard |

## Spine Actors / Main-Line Nodes

- `MemorySyncCard.vue` Source card
- `memorySyncStore.ts`
- `MemorySyncResolver`
- `MemorySyncConnectionTestService`
- `MemorySyncService`
- `MemorySyncWorker`
- `LocalFileMemorySyncStateStore`
- `MemoryHubClient`

## Ownership Map

- `MemorySyncCard.vue` owns presentation, editable local Source form state, explicit form hydration timing, mounted polling lifecycle, and computed labels.
- `memorySyncStore.ts` owns backend status state and frontend action state (`testingConnection`, `connectionTestResult`, `syncing`, status request guard). It does not own form rehydration timing.
- `MemorySyncResolver` is a thin GraphQL facade and maps GraphQL input to service calls.
- `MemorySyncConnectionTestService` owns the source-identity decision for connection tests.
- `MemorySyncService` owns sync execution and writes existing source job state.
- `MemorySyncWorker` owns background interval scheduling only.
- `LocalFileMemorySyncStateStore` owns persisted status file read/write/normalization.
- `MemoryHubClient` owns low-level HTTP calls only.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `MemorySyncResolver.testMemoryHubConnection` | `MemorySyncConnectionTestService` | GraphQL entrypoint | Saved-vs-draft source identity policy |
| `MemorySyncResolver.startMemorySync` | `MemorySyncService` | GraphQL entrypoint | UI labels or polling policy |
| `MemorySyncCard.vue` buttons | `memorySyncStore` / backend services | User action entrypoint | Backend token fallback policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| User-facing `Job state: success/error` wording | Conflates current job with last result | `Current job` and `Last sync` computed labels | In This Change | Backend raw field can remain. |
| Deep `store.status` watcher as general form hydration | Polling would wipe drafts and tokens | Explicit `hydrateFormsFromStatus(reason)` calls only on initial load/save/reset | In This Change | Required by DR-001. |
| Top-level `store.info` as primary test result | Feedback belongs near action | Inline `connectionTestResult` | In This Change | Page-level errors may remain for load/save failures. |
| Mixed draft URL/source id + saved token behavior | Ambiguous and secret-sensitive | Saved-config mode or draft-token mode | In This Change | Required by DR-003. |

## Return Or Event Spine(s) (If Applicable)

- `MemorySyncService` writes `running/success/error` -> `getMemorySyncStatus` -> `memorySyncStore.status` -> computed `Current job` / `Last sync`.
- `testMemoryHubConnection` returns result -> `memorySyncStore.connectionTestResult` with local timestamp -> inline test result.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `MemorySyncCard` lifecycle
- Chain: `onMounted -> loadStatus -> hydrateFormsFromStatus("initial") -> startStatusRefreshTimer(30000ms) -> refreshStatusOnly() -> onUnmounted stopTimer`
- Refresh rules:
  - `refreshStatusOnly()` updates `store.status` only.
  - It never calls `syncForms()`/`hydrateFormsFromStatus()`.
  - It skips if a status request is already in flight.
  - It should pause/skip when document is hidden if easy to implement.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Form hydration policy | DS-004 | `MemorySyncCard` | Initial/save/reset-only form population | Protects draft edits during polling | Polling wipes user input |
| Status-only refresh | DS-003, DS-004 | `memorySyncStore` / card lifecycle | Low-frequency `getMemorySyncStatus` refresh | Observes backend job status | Global high-traffic polling |
| Label precedence | DS-002, DS-003 | `MemorySyncCard` | Current/last label derivation | Avoids stale success after error | Misleading sync status |
| Connection test identity | DS-001 | `MemorySyncConnectionTestService` | Saved-config vs draft-token mode | Avoids mixed secret/draft identity | Resolver policy blob or insecure behavior |
| Localization strings | DS-001..DS-003 | `MemorySyncCard` | `Current job`, `Last sync`, `Testing saved settings`, `Testing draft token`, `Syncing…` | Translatable copy | Hard-coded text |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Job status storage | `LocalFileMemorySyncStateStore` | Reuse | Already records running/success/error and timestamps/errors | N/A |
| Sync execution | `MemorySyncService` | Reuse | Already owns sync lifecycle | N/A |
| Background scheduling | `MemorySyncWorker` | Reuse | Already interval-runs sync | N/A |
| Low-level hub health call | `MemoryHubClient` | Reuse | Pure HTTP adapter is correct | N/A |
| Saved-vs-draft connection-test identity | `memory-sync/source` | Create new service | Needs source config semantics | Resolver/client are wrong owners |
| Editable form preservation | `MemorySyncCard.vue` | Extend | Component owns local form | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend Memory Sync UI | Local form state, explicit hydration, inline action status, low-frequency poll lifecycle | DS-001..DS-004 | `MemorySyncCard`, `memorySyncStore` | Extend | Split editable form from status projection. |
| Backend Memory Sync Source | Sync execution, source state, saved-vs-draft test identity | DS-001..DS-003 | `MemorySyncService`, `MemorySyncConnectionTestService` | Extend/Create service | Use existing status store. |
| Backend GraphQL API | Thin schema/resolver entrypoints | DS-001, DS-002 | Resolver facade | Extend | Add mode-based input. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | Frontend UI | Card/form/presentation | Remove deep watcher; explicit hydrate; timer; computed labels; inline result | Existing card owner | Store status |
| `autobyteus-web/stores/memorySyncStore.ts` | Frontend state | Store boundary | Status request guard, action state/results, `refreshStatusOnly` action | Existing store owner | GraphQL docs |
| `autobyteus-server-ts/src/memory-sync/source/memory-sync-connection-test-service.ts` | Backend source | Source test owner | Saved-config/draft-token mode resolution | One policy owner | Config service, client |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync-schema.ts` | GraphQL API | Schema | Mode-based test input | Existing schema owner | N/A |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` | GraphQL API | Resolver | Thin delegation | Existing resolver owner | Service |
| Localization files | Frontend localization | Copy owner | New labels | Existing copy owners | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Current/last sync label derivation | Component computed helper | Frontend UI | Used only in card | N/A | Yes | Generic status model |
| Connection test input mode | Internal service type | Backend source | Clarifies saved vs draft | Yes | Yes | Mixed optional-field blob |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `MemorySyncSourceStateGql.jobState` | Yes internally; no as old UI label | Yes | Low after UI derivation | Treat `running` as current job only; treat `error` as latest error result. |
| `TestMemoryHubConnectionInput` | Must be tightened | Yes | Medium | Use explicit mode: saved settings vs draft input. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | Frontend UI | Source card | Local form, explicit hydrate timing, inline status rendering, 30s poll lifecycle | Existing card | Store status/result |
| `autobyteus-web/stores/memorySyncStore.ts` | Frontend state | Memory sync UI store | Status/action state and guarded refresh methods | Existing store | GraphQL results |
| `autobyteus-server-ts/src/memory-sync/source/memory-sync-connection-test-service.ts` | Backend source | Source connection test service | Saved settings mode and draft token mode | Correct source-policy owner | Config service/client |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync-schema.ts` | Backend API | Schema | Explicit test mode input | Existing schema | N/A |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` | Backend API | Resolver | Delegate to service | Existing resolver | Service |
| Localization message files | Frontend localization | Copy owner | UI labels | Existing message files | N/A |

## Ownership Boundaries

Frontend boundary split:

- Editable forms are local component state.
- Store status is backend projection for display.
- Polling updates status projection only.
- Only initial load and successful save may rehydrate local form fields.

Backend boundary split:

- `MemorySyncConnectionTestService` owns config-aware test semantics.
- `MemoryHubClient` remains a pure HTTP adapter.
- `MemorySyncService` remains sync execution/status writer.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemorySyncConnectionTestService` | Config service + hub client | GraphQL resolver | Resolver combines draft URL/source id with saved token | Add explicit saved/draft mode input |
| `MemorySyncService` | scanner/planner/client/state store | Worker and resolver | UI/resolver writes sync job state directly | Add service method if needed |
| `MemorySyncCard` form hydration | Local form + store status | Component template/actions | Deep watcher hydrates form on every status poll | Explicit hydrate calls only |
| `memorySyncStore` status refresh | Apollo status query/request guard | Card lifecycle/actions | Component calls Apollo directly for polling | Store refresh action |

## Dependency Rules

Allowed:

- `MemorySyncCard.vue` -> `memorySyncStore`
- `memorySyncStore` -> GraphQL query/mutation docs
- `MemorySyncResolver` -> `MemorySyncConnectionTestService` / `MemorySyncService`
- `MemorySyncConnectionTestService` -> `MemorySyncConfigService` / `MemoryHubClient`
- `MemorySyncService` -> source scanner/planner/state store/hub client

Forbidden:

- `MemoryHubClient` reading saved config.
- Resolver constructing mixed draft URL/source id + saved token requests.
- Polling refresh triggering form hydration or clearing `sourceForm.hubToken`.
- UI rendering raw `Job state: success/error`.
- Primary UI saying manual/background sync running.
- Duplicating background enabled/interval text already in fields.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `testMemoryHubConnection(input)` | Source connection test | Test either saved settings or full draft input | `{ mode: "saved" }` or `{ mode: "draft", hubBaseUrl, sourceNodeId, token }` | GraphQL may represent mode as enum/string field plus nullable draft fields. |
| `MemorySyncConnectionTestService.testConnection` | Source connection test | Resolve config and call client | Internal discriminated input | Saved mode uses persisted hub URL/source id/token only. |
| `startMemorySync()` | Source sync run | Start/coalesce sync | Current persisted source config | Existing shape remains. |
| `getMemorySyncStatus()` | Memory Sync status | Return config/source state | Current node backend context | Existing shape sufficient. |
| `memorySyncStore.refreshStatusOnly()` | UI status projection | Guarded status refresh | None | Must not imply form hydration. |
| `MemorySyncCard.hydrateFormsFromStatus(reason)` | Local form | Populate form from status at explicit moments | `initial` / `after-save` / optional `reset` | Not called by polling. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `testMemoryHubConnection` | Yes after rework | Yes | Low | Use explicit mode. |
| `refreshStatusOnly` | Yes | Yes | Low | Name must communicate no form hydration. |
| `hydrateFormsFromStatus` | Yes | Yes | Low | Only explicit lifecycle/save/reset callers. |
| `currentJobLabel` / `lastSyncLabel` computed helpers | Yes | Yes | Low | Implement precedence rules exactly. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Current sync run state | `Current job` | Yes | Low | Values: `idle` / `syncing…`. |
| Last sync result | `Last sync` | Yes | Low | Latest error wins over stale success. |
| Saved-settings test | `Testing saved settings…` | Yes | Low | Use when token blank. |
| Draft-token test | `Testing draft token…` | Yes | Low | Use when token present. |

## Applied Patterns (If Any)

- Adapter: `MemoryHubClient` remains a pure HTTP adapter.
- Service: `MemorySyncConnectionTestService` owns source-aware test semantics.
- Bounded polling loop: component-local, low-frequency, status-only refresh.
- Explicit hydration: forms hydrate only at named lifecycle/save/reset boundaries.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/MemorySyncCard.vue` | File | Source card | UI rendering, form hydration timing, 30s polling lifecycle | Existing card owner | Backend token/config policy |
| `autobyteus-web/stores/memorySyncStore.ts` | File | Frontend store | Status/action state and guarded API actions | Existing store | Form hydration policy beyond exposing status |
| `autobyteus-web/graphql/mutations/memorySyncMutations.ts` | File | Frontend API docs | Test input mode / mutation fields | Existing mutation docs | UI state |
| `autobyteus-web/graphql/queries/memorySyncQueries.ts` | File | Frontend API docs | Existing status fields | Existing query docs | Poll timer logic |
| `autobyteus-web/localization/messages/en/memorySyncSettings.ts` | File | Localization | English labels | Existing copy file | Logic |
| `autobyteus-web/localization/messages/zh-CN/memorySyncSettings.ts` | File | Localization | Chinese labels | Existing copy file | Logic |
| `autobyteus-server-ts/src/memory-sync/source/memory-sync-connection-test-service.ts` | File | Source service | Saved/draft test mode | Correct source folder | HTTP fetch internals beyond client use |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync-schema.ts` | File | API schema | Mode-based input | Existing schema | Policy logic |
| `autobyteus-server-ts/src/api/graphql/types/memory-sync.ts` | File | API resolver | Thin delegation | Existing resolver | Token fallback policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings` | Presentation | Yes | Low | Existing UI card location. |
| `autobyteus-web/stores` | Frontend state | Yes | Low | Existing Pinia store location. |
| `autobyteus-server-ts/src/memory-sync/source` | Main-line domain-control | Yes | Low | Source config/test/sync semantics live here. |
| `autobyteus-server-ts/src/api/graphql/types` | Transport/API | Yes | Low | Resolver/schema only. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Normal idle after success | `Current job: idle` + `Last sync: success · 24.6.2026, 06:00:16` | `Job state: success` | Separates current and last. |
| Running | `Current job: syncing…` | `Manual sync running…` | User approved generic wording. |
| Failure after prior success | `Current job: idle` + `Last sync: error · 401 Unauthorized` | `Last sync: success · old timestamp` | Error precedence over stale success. |
| Saved settings test | Blank token + saved config -> request `{ mode: "saved" }`, UI `Testing saved settings…` | Draft URL + saved token mixed silently | Prevents ambiguous identity. |
| Draft token test | Token pasted -> request `{ mode: "draft", hubBaseUrl, sourceNodeId, token }`, UI `Testing draft token…` | Ignoring draft token and testing saved config | Makes user intent clear. |
| Poll while editing | Poll updates `store.status`; input text remains unchanged | Poll triggers `syncForms()` and clears token | Resolves DR-001. |
| No config duplication | Keep checkbox and interval field only | Add `Background sync: enabled · every 60s` | Keeps UI clean. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Show old `Job state` plus new labels | Reduce change risk | Rejected | Replace old user-facing line. |
| Keep deep status watcher with polling | Existing implementation | Rejected | Explicit hydration calls only. |
| Plaintext-token-only testing | Existing API | Rejected | Saved settings mode or draft token mode. |
| Mixed draft URL/source id + saved token | Convenience | Rejected | Save first or paste draft token. |
| Full dashboard/activity log | Early idea | Rejected | Minimal inline status. |

## Derived Layering (If Useful)

- UI presentation/form lifecycle: `MemorySyncCard.vue`
- Frontend state/API projection: `memorySyncStore.ts`, GraphQL documents
- Backend transport: GraphQL resolver/schema
- Backend source domain: `MemorySyncConnectionTestService`, `MemorySyncService`, `MemorySyncWorker`
- Backend adapter/persistence: `MemoryHubClient`, `LocalFileMemorySyncStateStore`

## Migration / Refactor Sequence

1. Backend connection-test service:
   - Add `MemorySyncConnectionTestService`.
   - Add internal discriminated input: saved mode vs draft mode.
   - Saved mode loads persisted source config and requires saved hub URL, source node id, and token.
   - Draft mode requires explicit hub URL, source node id, and non-empty token.
2. GraphQL API:
   - Change `TestMemoryHubConnectionInput` to explicit mode plus nullable draft fields.
   - Resolver delegates to service and does not combine saved token with draft fields.
3. Frontend store:
   - Add `testingConnection`, `connectionTestResult`, request timestamp/copy context.
   - Add guarded `refreshStatusOnly()` or equivalent low-noise status action.
   - Preserve `syncing` for immediate manual feedback.
4. Frontend card:
   - Remove deep status watcher as general form hydrator.
   - Add `hydrateFormsFromStatus(reason)` and call only after initial load and successful save.
   - Add 30s mounted status-only polling with cleanup and overlap/hidden-document guards.
   - Render inline test result under/near `Test connection`.
   - Render spinner/disabled `Syncing…` on `Sync now`.
   - Render `Current job` as `syncing…` if `store.syncing || sourceState.jobState === "running"`, else `idle`.
   - Render `Last sync` with exact precedence: if `sourceState.jobState === "error"` and `lastError`, show error; else if `lastSuccessfulSyncAt`, show success timestamp; else show neutral not-synced state.
5. Localization:
   - Add labels for `Current job`, `Last sync`, `idle`, `syncing…`, `Testing saved settings…`, `Testing draft token…`, test success/failure.
6. Tests:
   - Poll fires while user edits URL/source id/display name and pasted token; values remain unchanged.
   - Blank token + saved config + unsaved edited URL/source id tests saved settings, not draft fields.
   - Draft token tests draft URL/source id/token together.
   - Prior success followed by error displays error, not old success timestamp.
   - `Sync now` button displays spinner/`Syncing…` immediately and disables duplicate clicks.

## Key Tradeoffs

- Low-frequency polling (`30s`) protects product performance and avoids unnecessary traffic; it is not intended to be realtime.
- Existing backend source state is reused instead of adding another job store, because the job already writes the necessary status.
- Explicit form hydration is slightly more code than the current watcher but is necessary to preserve user edits under polling.
- Saved-settings test mode is stricter than mixing draft URL with saved token; this avoids surprising secret behavior and matches the user's minimal scope.

## Risks

- Very fast background jobs may start and finish between polls, so users may see only updated last result. This is acceptable.
- If a user edits URL/source id but leaves token blank, the test result reflects saved settings, not draft edits; UI copy must say `Testing saved settings…`.
- Stale `running` after a crash remains possible in existing backend state; this ticket can show `syncing…` until a later run/error/status corrects it, with deeper stale recovery deferred.

## Guidance For Implementation

- Keep the UI small: one inline test status and two sync lines.
- Do not duplicate background enabled/interval text.
- Do not display manual/background labels in the primary status.
- Do not use global top banners as the primary Source action feedback.
- Do not let status polling call `syncForms()` or equivalent full-form reset.
- Use the existing backend job state store/file; do not add a separate job-status persistence mechanism unless implementation proves the existing store cannot represent the approved UI.
- Use accessible spinner/`aria-live` semantics for `Testing…` and `Syncing…`.
