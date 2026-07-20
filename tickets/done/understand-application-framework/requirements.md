# Requirements Doc — Application Backend Context Capability Naming Refactor

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — requirements were clarified through the framework/API discussion and approved by the user on 2026-07-20 with the instruction to kick off the refactoring ticket. On the same date, the user clarified that the application feature is unreleased/under development and must move forward as one canonical codebase with no data migration or backward compatibility. That policy is incorporated below and in the approved [application context API contract](./application-context-api-contract.md).

## Goal / Problem Statement

Make the application backend handler context understandable from its public API names without requiring application authors to inspect implementation code or broad union types.

Today, `context.runtimeControl` combines three different application capabilities—agent/agent-team execution, configured agent resources, and published-artifact reads—behind a generic infrastructure-oriented name. It also exposes `bindingIntentId`, where “intent” means an app-created correlation record rather than an LLM/user intent; that meaning is not inferable.

Replace the current public API with this clean, domain-oriented context:

```text
context
├── agentExecution
│   ├── startAgent(...)
│   ├── startAgentTeam(...)
│   ├── sendInput(...)
│   ├── terminate(...)
│   ├── get(...)
│   ├── list(...)
│   └── findByLaunchRequestId(...)
├── agentResources
│   ├── listAvailable(...)
│   └── getConfigured(...)
├── publishedArtifacts
│   ├── list(...)
│   └── readRevision(...)
├── storage
└── publishNotification(...)
```

Rename the caller-generated launch correlation identity from `bindingIntentId` to `launchRequestId`. This ticket is a clean-cut public contract and canonical source/schema-definition naming refactor. The application feature is pre-release, so old local/test application storage is disposable and no data migration or database schema-version advance is required. The ticket does not add runtime-output streaming or change agent/team execution, binding behavior, artifact behavior, GraphQL, notifications, or storage semantics.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Every app backend handler receives `context.runtimeControl`, a single namespace whose name does not identify agents, teams, resources, bindings, or artifacts. | Handler context exposes `agentExecution`, `agentResources`, and `publishedArtifacts`; `runtimeControl` is removed. | `requestContext`, `storage`, and `publishNotification` retain their existing behavior. | `REQ-001`, `REQ-005`; `AC-001`, `AC-005` |
| `BEH-002` | `runtimeControl.startRun(...)` accepts a union whose `launch.kind` selects `AGENT` or `AGENT_TEAM`; shared methods post input, inspect/list bindings, and terminate a binding. | `agentExecution.startAgent(...)` and `startAgentTeam(...)` make the launched subject explicit; `sendInput`, `get`, `list`, and `terminate` expose the shared lifecycle. | Launch resolution, binding identity/status, returned summaries, member targeting, lifecycle events, errors, and termination semantics remain unchanged. | `REQ-002`, `REQ-006`; `AC-002`, `AC-006`, `AC-007` |
| `BEH-003` | Resource discovery/configuration is mixed into `runtimeControl` through `listAvailableExecutionResources(...)` and `getConfiguredExecutionResource(...)`. | The same behavior is exposed as `agentResources.listAvailable(...)` and `agentResources.getConfigured(...)`. | Resource slots, filters, configured profiles, resolution rules, and returned values remain unchanged. | `REQ-003`, `REQ-006`; `AC-003`, `AC-006` |
| `BEH-004` | Durable artifact reads are mixed into `runtimeControl` through `getRunPublishedArtifacts(...)` and `getPublishedArtifactRevisionText(...)`. | The same behavior is exposed as `publishedArtifacts.list(...)` and `publishedArtifacts.readRevision(...)`. | Artifact persistence, run/revision identity, not-found behavior, relay handlers, and reconciliation semantics remain unchanged. | `REQ-004`, `REQ-006`; `AC-004`, `AC-006` |
| `BEH-005` | An app creates a `bindingIntentId` before `startRun`; the platform persists/echoes it so the app can recover an ambiguous app-database/platform-database handoff through `getRunBindingByIntentId`. | The same correlation/recovery contract is named `launchRequestId` and queried through `agentExecution.findByLaunchRequestId(...)`; built-in app concepts become pending launch requests. | Caller ownership, uniqueness, binding correlation, nullable lookup, and recovery behavior remain unchanged. Repeating a launch is not newly promised to be idempotent. | `REQ-002`, `REQ-005`, `REQ-007`; `AC-002`, `AC-005`, `AC-007`, `AC-008` |
| `BEH-006` | Backend definition contract v2, built-in applications and bundles, templates, docs, tests, worker context construction, worker/host bridge, and fresh-storage schema definitions use the old terminology. The application feature is unreleased and has no supported legacy installation/data contract. | All active source/generated producers and fresh-storage schema definitions use the new names and the backend contract advances cleanly to v3. No compatibility or data-upgrade path is created. | Frontend SDK/iframe contract v3, public gateway routes, GraphQL, notifications, binding/run identities, artifacts, and application behavior on freshly initialized storage remain available. | `REQ-005`, `REQ-007`..`REQ-009`; `AC-005`, `AC-008`..`AC-011` |
| `BEH-007` | Applications cannot consume agent output through an application-scoped live stream. | No change in this ticket; output streaming is deferred to a separate feature. | Native runtime WebSockets and all current application communication mechanisms remain unchanged. | `REQ-010`; `AC-010` |

## Investigation Findings

- `ApplicationHandlerContext` currently exposes one ten-method `ApplicationRuntimeControl` spanning execution, resource configuration, binding recovery, and artifacts.
- The same `startRun` launches standalone agents and agent teams; returned bindings distinguish `AGENT_RUN` and `TEAM_RUN`.
- `postRunInput` can target a team member with `targetMemberRouteKey` or `targetMemberPath`; the new `sendInput` must preserve this.
- `bindingIntentId` is not AI intent. It is an app-generated durable correlation key created before a launch so an app can find the platform binding if the response/final app-side commit is interrupted.
- Current `startRun` does not establish a new idempotent-retry contract. `findByLaunchRequestId` is recovery lookup; callers must resolve an ambiguous handoff rather than assume retrying the launch is safe.
- The handler context is constructed in the worker and reverse-invokes `ApplicationOrchestrationHostService`; existing orchestration owners can be reused without changing runtime behavior.
- Backend definition contract v2 promises the old context shape. A clean removal must advance it to v3 rather than load old code and fail later on a missing property.
- Platform and built-in app schema/source definitions currently use old run-binding and pending-correlation names. The user confirmed that the application feature is not live and no application data needs preservation; therefore these canonical definitions should be updated directly and pre-release local/test storage rebuilt, with no transform or schema-version bump.
- Two checked-in applications, their generated backend output, SDK/contract docs, server docs, templates, and focused tests use the old terminology.
- Frontend/iframe contract v3, HTTP/GraphQL routes, WebSockets, and database business meaning are not otherwise affected.
- Dependencies were initially absent (`tsc: command not found`), then the halted partial implementation installed them successfully. Contract/SDK builds, server build-source compile after Prisma generation, and both built-in backend typechecks passed before the requirement correction; final checks must run again after the prohibited migration work is removed.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| [`application-context-api-contract.md`](./application-context-api-contract.md) | Intended-behavior API contract supplement | `REQ-001`..`REQ-007`, `REQ-010` | `AC-001`..`AC-007`, `AC-010` | Approved through the user's 2026-07-20 naming and unreleased/forward-only clarifications | Defines the exact public context shape, before/after mapping, `launchRequestId` semantics, and no-migration clean cut. |
| [`framework-understanding.md`](./framework-understanding.md) | Architecture/evidence synthesis | `REQ-001`..`REQ-010` | `AC-001`..`AC-011` | Current; approval `N/A` | Explains the frontend/server/worker/runtime boundaries to preserve; streaming sections are follow-up evidence only. |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Refactor`.
- Initial design issue signal (`Yes`/`No`/`Unclear`): `Yes` — the public context aggregates unrelated responsibilities under a non-domain name and uses an opaque correlation term.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue` plus `Shared Structure Looseness`.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Needed` now; this ticket is the bounded refactor.
- Evidence basis: Public contracts, worker context construction, worker/host protocol, orchestration facade/stores, built-in applications and baseline SQL, generated output, documentation, tests, and the user's authoritative pre-release/no-data clarification.
- Requirement or scope impact: No new product capability. The clean terminology cutover has medium repository breadth but requires only current source/schema-definition updates and isolated fresh-schema validation, not data migration.

## Recommendations

1. Implement the exact approved context namespaces and method names in `application-context-api-contract.md`.
2. Rename `bindingIntentId` to `launchRequestId` throughout current public/domain/app code and persisted canonical schemas.
3. Remove old public types/properties/methods without aliases or dual runtime paths.
4. Advance the backend definition contract from v2 to v3 and rebuild all checked-in backend bundles.
5. Update platform bootstrap/store DDL and built-in baseline SQL directly to the launch-request schema; add no migration/version transition or stale-storage behavior.
6. Keep server orchestration behavior unchanged and defer application-scoped output streaming.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — behavior scope is refactor-only, but it crosses shared contracts, backend SDK, worker context/protocol, orchestration model/store schema definitions, built-in app source/baseline SQL/generated bundles, templates, docs, and tests.

## In-Scope Use Cases

- `UC-001`: An app backend author discovers from `context.agentExecution` that the API starts and interacts with application-owned agents and teams.
- `UC-002`: The author explicitly starts a standalone agent or agent team and receives the same binding result as today.
- `UC-003`: The author sends input, optionally targets a team member, inspects/lists executions, and terminates a binding through `agentExecution`.
- `UC-004`: The author discovers/configures execution resources through `agentResources`.
- `UC-005`: The author lists and reads durable published artifacts through `publishedArtifacts`.
- `UC-006`: The author persists a `launchRequestId`, launches an agent/team, and recovers the resulting binding by that ID after an ambiguous handoff.
- `UC-007`: In-repository applications are rebuilt against v3 and operate on freshly initialized launch-request-named storage.

## Out of Scope

- Application-scoped agent or agent-team output streaming.
- Frontend SDK, iframe bootstrap, public HTTP/GraphQL routes, WebSocket, SSE, or GraphQL-subscription changes.
- Changing execution resource resolution, launch profiles, team-member targeting, lifecycle, artifact, notification, or recovery semantics.
- Renaming `bindingId`, `runId`, persisted runtime domain services, `AgentRun`, or `TeamRun`.
- Making `startAgent`/`startAgentTeam` idempotent or changing launch failure semantics.
- A `runtimeControl`/`bindingIntentId` compatibility alias, dual context, dual persistence writer, historical-schema branch, or database migration/version transition.
- Preservation, upgrade, rejection, or runtime handling of unsupported pre-release local/test application databases; they are outside the product contract.

## Functional Requirements

- `REQ-001` — `ApplicationHandlerContext` shall expose `agentExecution`, `agentResources`, and `publishedArtifacts` and shall retain `requestContext`, `storage`, and `publishNotification` unchanged.
- `REQ-002` — `agentExecution` shall expose `startAgent`, `startAgentTeam`, `sendInput`, `terminate`, `get`, `list`, and `findByLaunchRequestId` with the signatures and responsibility boundaries defined in the approved API-contract supplement.
- `REQ-003` — `agentResources` shall expose `listAvailable` and `getConfigured`, preserving current filters, slot validation, values, authorization, and failures.
- `REQ-004` — `publishedArtifacts` shall expose `list` and `readRevision`, preserving current application/run authorization, outputs, and not-found/failure semantics.
- `REQ-005` — The old `ApplicationRuntimeControl`, `ApplicationHandlerContext.runtimeControl`, public/current `bindingIntentId`, pending-intent schema names, and app-facing `runtimeControl.*` APIs/documentation shall be removed without compatibility aliases. Old tokens may remain only in explicit v2 rejection fixtures or review/history artifacts, not in active source, generated packages, or canonical baseline SQL.
- `REQ-006` — Agent/team launch, binding, input targeting, termination, resources, artifacts, lifecycle, GraphQL, notification, and storage behavior shall remain equivalent after the refactor.
- `REQ-007` — `launchRequestId` shall be an app-generated, non-empty, unique correlation identifier for one launch request; it shall be persisted/echoed on the binding and support nullable application-scoped lookup through `findByLaunchRequestId` without creating a new idempotent-launch guarantee.
- `REQ-008` — The backend definition contract shall advance from v2 to v3; current in-repository definitions, templates, validators, docs, and generated backends shall use v3, and v2 backends shall be rejected clearly.
- `REQ-009` — Platform binding/journal bootstrap DDL and built-in application baseline SQL shall directly define the canonical launch-request schema. The ticket shall not add a platform schema-version advance, data-transform service, appended rename migration, migration checkpoint, dual read/write, or any product path for old application storage.
- `REQ-010` — No live runtime-output API or frontend transport shall be added in this ticket.

## Acceptance Criteria

- `AC-001` — A typed v3 `ApplicationHandlerContext` matches the approved API-contract supplement and exposes no `runtimeControl` property.
- `AC-002` — Equivalent standalone-agent and agent-team inputs through `startAgent` and `startAgentTeam` reach existing orchestration and return bindings with unchanged `AGENT_RUN` and `TEAM_RUN` subjects plus the supplied `launchRequestId`.
- `AC-003` — Resource listing/configuration through `agentResources` returns the same values/failures as the current operations.
- `AC-004` — Artifact listing/revision reads through `publishedArtifacts` return the same values/failures as the current operations.
- `AC-005` — Current runtime/business source, generated executable backend code, templates, canonical baseline SQL, and public/current docs contain no app-facing `context.runtimeControl`, `ApplicationRuntimeControl`, `bindingIntentId`, or “pending binding intent” terminology. Repository inventory identifies old tokens only in explicit v2 rejection fixtures or non-product ticket/review history.
- `AC-006` — Existing focused orchestration, resource, artifact reconciliation, binding correlation, team-member targeting, lifecycle, notification, and GraphQL scenarios retain their behavior under the new API.
- `AC-007` — `sendInput` preserves team targeting, context files, metadata, and binding result behavior; `terminate`, `get`, `list`, and `findByLaunchRequestId` preserve nullable/filter/scoping behavior.
- `AC-008` — A reachable interrupted-handoff scenario can persist a pending launch request, find the already-created binding by `launchRequestId`, and attach it to the correct application business object without launching a duplicate execution.
- `AC-009` — Backend definition v3 loads successfully, and v2 is rejected before handler invocation with a clear unsupported-contract error.
- `AC-010` — Frontend/iframe contract, HTTP/GraphQL routes, WebSockets, runtime output, database business meaning, and existing external communication behavior do not change.
- `AC-011` — Starting from isolated fresh storage, platform and built-in app initialization create only the canonical launch-request columns/tables and v3 application flows operate successfully. No new platform schema version, migration service/checkpoint, rename migration, or old-storage compatibility behavior exists.

## Constraints / Dependencies

- `ApplicationOrchestrationHostService`, its agent/team services, resource resolver/configuration service, binding store, and artifact projection remain behavioral authorities.
- Existing `bindingId`, `runId`, resource references, launch profiles, member selectors, and artifact revision IDs remain canonical.
- `launchRequestId` is unique within the owning application and scoped by the handler context/application boundary.
- Worker/host reverse invocation must preserve application scoping and current error propagation.
- Current v3 contracts, worker, orchestration, repositories, schema definitions, built-in business services, and baseline SQL use only canonical launch-request names; no old-schema translation boundary is added.
- Checked-in generated application backend output must be regenerated from source.
- Dependencies are installed in the preserved partial implementation worktree. Implementation/coverage must still report exact commands and treat the existing root server TS6059 configuration issue separately from ticket failures.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Platform `platform.sqlite` run-binding row/summary correlation fields and execution-event-journal `binding_json`; Brief Studio and Socratic Math Teacher `app.sqlite` pending-correlation tables and Brief Studio binding correlation column.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Discard or Rebuild`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: No live/released application data exists. Pre-release local/test `platform.sqlite` and `app.sqlite` may be deleted and freshly initialized from the updated canonical definitions; no row transformation is required.
- Unacceptable data loss or corruption: None for pre-release application storage. Source fixtures and fresh-schema behavior must remain deterministic, and non-application data outside the application storage root must not be deleted.
- Relevant availability, maintenance-window, or rollout constraints: Update server, SDK, built-in packages, and schema definitions atomically. Tests use isolated fresh storage; product code must neither migrate nor automatically delete old paths.
- Related requirement and acceptance-criteria IDs: `REQ-007`..`REQ-009`; `AC-008`, `AC-009`, `AC-011`.

## Assumptions

- The user-approved naming tree is a public application-backend API requirement, not documentation-only terminology.
- The approved `launchRequestId` rename applies cleanly to current public/domain/app code and canonical persisted fields rather than leaving the old “intent” concept active internally.
- No live/released application storage exists; pre-release local/test application databases are disposable.
- Streaming remains important follow-up work but is intentionally excluded here.

## Risks / Open Questions

- No requirement ambiguity remains. Exact file decomposition, isolated test-fixture mechanics, and internal IPC type names are design decisions.
- Source/bootstrap changes must cover platform JSON models and indexed columns consistently even though no stored rows are transformed.
- Any external pre-release application package using backend contract v2 must be rebuilt before use with the new server; the server will not emulate v2 or migrate its storage.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| `REQ-001` | `UC-001`..`UC-005` |
| `REQ-002` | `UC-001`..`UC-003`, `UC-006`, `UC-007` |
| `REQ-003` | `UC-004`, `UC-007` |
| `REQ-004` | `UC-005`, `UC-007` |
| `REQ-005` | `UC-001`..`UC-007` |
| `REQ-006` | `UC-002`..`UC-007` |
| `REQ-007` | `UC-006`, `UC-007` |
| `REQ-008` | `UC-007` |
| `REQ-009` | `UC-006`, `UC-007` |
| `REQ-010` | All use cases by scope exclusion |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion ID | Scenario Intent |
| --- | --- |
| `AC-001` | Compile-time public context shape |
| `AC-002` | Standalone-agent/team launch routing equivalence |
| `AC-003` | Resource routing equivalence |
| `AC-004` | Artifact routing equivalence |
| `AC-005` | Clean removal/source inventory |
| `AC-006` | Existing behavior regression coverage |
| `AC-007` | Shared execution operation preservation |
| `AC-008` | Reachable launch handoff recovery |
| `AC-009` | Backend contract cutover validation |
| `AC-010` | Explicit no-impact boundary verification |
| `AC-011` | Fresh storage schema and explicit no-migration validation |

## Approval Status

Approved by the user on 2026-07-20, including the explicit clarification that the application feature is unreleased/under development and must use one forward-only code/schema path with no migration or backward compatibility. The approved basis consists of this requirements document and `application-context-api-contract.md`. `framework-understanding.md` is evidence/context with approval `N/A`.
