# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — updated after API/E2E requirement-gap clarification. Scope confirmed: naming/refactoring only; runtime stream implementation remains future/out of scope; no public or private backward-compatibility/migration path for old execution-resource persisted shapes is allowed.

## Goal / Problem Statement

The application framework currently uses `ApplicationRuntimeResource*` terminology for a concept that, in practice, only means an application-selectable agent or agent team resource. The naming is confusing because `runtime` is already overloaded across the codebase: application backend runtime, agent/team execution runtime, provider/runtime kind, runtime control, runtime stream, and run lifecycle all use similar wording.

The current types:

```ts
ApplicationRuntimeResourceKind = "AGENT" | "AGENT_TEAM"
ApplicationRuntimeResourceOwner = "bundle" | "shared"
ApplicationRuntimeResourceRef
ApplicationRuntimeResourceSummary
ApplicationRuntimeResourceResolver
```

are semantically closer to:

```text
ApplicationExecutionResource
```

or:

```text
ApplicationAgentResource / ApplicationAgentTeamResource
```

The framework should tighten this naming so application developers and maintainers understand that these are app-selectable execution resources, not generic application runtimes or runtime streams.

## Current Concept To Preserve

The current behavior should remain the same:

- Applications can declare resource slots in `application.json`.
- A resource slot can allow `AGENT` and/or `AGENT_TEAM` resources.
- Resources can come from bundle-local definitions or shared/global definitions.
- Host setup can configure a concrete resource for a slot.
- Application backend runtime control can list resources, read configured resources, and start app-bound runs using a selected resource.
- Run bindings should still record the selected resource reference.

Only the naming and boundary clarity should change.

## Investigation Findings

- `ApplicationRuntimeResourceKind` currently has only two values: `AGENT` and `AGENT_TEAM`.
- `ApplicationRuntimeResourceOwner` currently has only two values: `bundle` and `shared`; these values describe where the resource comes from, not ownership in the deeper architectural sense.
- `ApplicationRuntimeResourceRef` is used in manifest defaults, app resource configuration, start-run input, and run binding summaries.
- `ApplicationRuntimeResourceResolver` resolves bundle/shared agent/team definitions and lives under application orchestration.
- Current docs already describe bundle-owned agents/teams and `resourceSlots[]`, but still use the phrase “runtime resources,” which is easy to confuse with runtime control or future runtime streams.
- The previous communication-clarity refactor has already landed on `personal`; this ticket continues the naming-cleanup theme for resource terminology.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Naming Refactor / Cleanup.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Shared Structure Looseness caused by overloaded terminology.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed.
- Evidence basis: The type name says `RuntimeResource`, but the kind union is only `AGENT | AGENT_TEAM`; the `owner` field says `bundle | shared`, which behaves more like source/scope than ownership; the same broad `runtime` word is also used by runtime control, runtime kind, run bindings, and future runtime stream discussions.
- Requirement or scope impact: Rename the resource concept to a more precise application execution resource concept and update docs, code, manifests/examples, tests, and generated artifacts according to repository conventions.

## Recommendations / Working Direction

- Prefer the target concept name **Application Execution Resource**.
- Prefer replacing `ApplicationRuntimeResource*` with `ApplicationExecutionResource*` for public SDK types and internal resolver/service names.
- Consider renaming `ApplicationRuntimeResourceOwner` to `ApplicationExecutionResourceSource` or `ApplicationExecutionResourceScope`, because `bundle` and `shared` identify source/scope, not true ownership. Recommended target: `source`.
- Preserve `kind: "AGENT" | "AGENT_TEAM"` because those are accurate resource kinds.
- Keep runtime-control method semantics unchanged. If method names are renamed, do it as a clean-cut public API refactor, not by leaving permanent alias wrappers.
- Do not implement runtime streaming in this ticket.

## Scope Classification (`Small`/`Medium`/`Large`)

Large.

The behavior is not complex, but the naming appears in public SDK contracts, manifests, first-party application JSON, orchestration services, stores, docs, tests, and generated/vendor/dist outputs.

## In-Scope Use Cases

- **UC-001 — App manifest execution-resource slot clarity:** App authors can read `executionResourceSlots[]` and understand they are declaring required/optional app execution resources, not generic runtimes.
- **UC-002 — Host setup clarity:** The host setup flow can show/select bundle or shared agent/team resources using clear execution-resource terminology.
- **UC-003 — Backend runtime-control clarity:** App backend code can list/select/start app execution resources without confusing them with runtime streams or backend runtime.
- **UC-004 — Run binding clarity:** Run bindings record which execution resource was selected without using overloaded runtime-resource wording.
- **UC-005 — Source/scope clarity:** The `bundle` versus `shared` discriminator is named according to what it means: source/scope, not architectural ownership.
- **UC-006 — Documentation clarity:** Docs explain how execution resources relate to runtime control, run bindings, artifacts, and future runtime streaming.

## Out of Scope

- Adding new resource kinds beyond `AGENT` and `AGENT_TEAM`.
- Changing runtime-control behavior or run binding lifecycle behavior.
- Implementing application runtime streaming/conversation subscription.
- Changing artifact relay/query semantics.
- Redesigning app resource setup UX beyond required naming updates.
- Supporting old and new public names indefinitely.

## Stale Old-Shape State Policy

No old-shape compatibility or migration is allowed anywhere in this ticket. The expected handling is:

- **Old public API/request/manifest shapes** such as `resourceSlots`, `allowedResourceOwners`, `defaultResourceRef`, `resourceRef`, or `owner` must fail validation with clear new-name guidance.
- **Old persisted configured execution-resource rows** must be treated as stale setup state and destructively reset/removed so the app becomes not configured and must be reconfigured through the new execution-resource setup flow.
- **Old persisted run-binding summary rows** using `resourceRef` or `owner` must not be hydrated, rewritten, or exposed. They are unrecoverable old local run state and must be dropped/ignored with a warning or a clear stale-state error if deletion is not possible at that boundary.
- **Tests must not prove migration**. They should prove rejection/reset/drop behavior for old shapes.

## Functional Requirements

- **FR-001:** Replace the `ApplicationRuntimeResource*` concept naming with a clearer `ApplicationExecutionResource*` naming family, unless architecture review selects an even clearer equivalent.
- **FR-002:** Preserve the current resource kinds `AGENT` and `AGENT_TEAM` and their behavior.
- **FR-003:** Rename or explicitly redesign the `owner: "bundle" | "shared"` discriminator because it currently describes resource source/scope more than ownership. Recommended target field: `source`.
- **FR-004:** Update app manifest resource slot contract fields consistently if the public JSON shape changes, including `allowedResourceOwners` / `defaultResourceRef` equivalents.
- **FR-005:** Update runtime-control contracts that list/configure/start resources so their type and parameter names match the new execution-resource terminology.
- **FR-006:** Update application orchestration services/stores/resolvers so internal file/class/function names match the new terminology.
- **FR-007:** Update first-party applications, docs, tests, package exports, and generated/vendor/dist artifacts according to repository conventions.
- **FR-008:** Avoid all backward-compatibility wrappers, dual public names, old-shape readers, and old-shape persisted-data migrations for in-scope renamed concepts. If stale local platform/application state contains old `resourceRef`/`owner` shapes, configured execution-resource rows must be destructively reset to not-configured, stale run-binding rows must be dropped/ignored as unrecoverable old local state, and old public/API/manifest shapes must fail validation rather than migrate.
- **FR-009:** Documentation must explicitly distinguish execution resources from runtime control and future runtime streams.
- **FR-010:** Existing behavior must remain covered by tests: resource listing, resource configuration, start-run binding launch, bundle/shared resolution, invalid selection errors, and first-party app setup.
- **FR-011:** Tests must reject old-shape persisted data rather than proving migration. Any migration-specific tests for `owner` -> `source` or `resourceRef` -> `executionResourceRef` must be removed or replaced with stale-state rejection/reset tests.

## Acceptance Criteria

- **AC-001:** Given the SDK contracts, when a developer reads the resource types, then the names indicate application execution resources rather than generic runtime resources.
- **AC-002:** Given an app manifest resource slot, when it declares/selects an agent team, then the JSON/type names use the new execution-resource terminology consistently; old manifest field names are rejected rather than migrated.
- **AC-003:** Given app backend code uses runtime control to list or start resources, then the API/types make clear it is listing/starting execution resources, not subscribing to runtime streams.
- **AC-004:** Given a bundle resource and a shared resource, when both are represented as refs/summaries, then the discriminator name communicates source/scope accurately.
- **AC-005:** Given a run binding is created, when the binding summary is inspected, then it records the selected execution resource under the new terminology while preserving existing launch behavior.
- **AC-006:** Given repository tests for application orchestration and first-party app backend integrations run, then behavior remains unchanged except expected naming updates.
- **AC-007:** Given a search for old in-scope names such as `ApplicationRuntimeResource`, then no active source/test/docs usage remains except historical tickets or explicit stale-state rejection notes.
- **AC-008:** Given future runtime-stream design work begins, then docs and names no longer confuse execution-resource selection with runtime stream subscription.
- **AC-009:** Given persisted configuration or binding summary data still uses old `owner` / `resourceRef` shapes, then active code does not migrate it; it either ignores stale state through an explicit reset path or fails with a clear stale-state/reconfiguration error.

## Constraints / Dependencies

- Base branch is latest `origin/personal` as of 2026-05-08.
- The previous backend notification stream naming refactor is already on `personal` and should be treated as current baseline.
- Public SDK/manifest naming changes may require coordinated package rebuilds and first-party app package regeneration.
- Avoid hand-editing generated artifacts if the repository expects build scripts to generate them.
- This ticket should not add runtime stream behavior.
- No code path may accept, rewrite, or silently migrate old public/private execution-resource shapes such as `resourceRef`, `owner`, `resourceSlots`, or `allowedResourceOwners`.

## Assumptions

- `ApplicationExecutionResource` is the preferred target concept unless architecture review chooses a better precise name.
- `source` is likely clearer than `owner` for the `bundle`/`shared` discriminator.
- A clean-cut rename is required because the user explicitly rejected backward-compatible migration behavior, including private persisted-store migration.

## Risks / Open Questions

- Should public manifest JSON bump from v3 to a new version if fields like `allowedResourceOwners` and `resourceRef.owner` become `allowedResourceSources` and `resourceRef.source`? If yes, old versions must fail or require explicit reset/reconfiguration rather than auto-migrate.
- Should runtime-control method names also change from `listAvailableResources` / `getConfiguredResource` to `listAvailableExecutionResources` / `getConfiguredExecutionResource`, or is type-level naming sufficient?
- How broad should generated/dist/vendor artifact updates be in the implementation PR?
- Are there external consumers of the current SDK package that need a release-note breakage/reset note?

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 | UC-005 | UC-006 |
| --- | --- | --- | --- | --- | --- | --- |
| FR-001 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-002 | Yes | Yes | Yes | Yes | No | No |
| FR-003 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-004 | Yes | Yes | No | No | Yes | Yes |
| FR-005 | No | No | Yes | Yes | No | Yes |
| FR-006 | No | Yes | Yes | Yes | Yes | No |
| FR-007 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-008 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-009 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-010 | Yes | Yes | Yes | Yes | Yes | Yes |
| FR-011 | Yes | Yes | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Proves SDK naming clarity. |
| AC-002 | Proves manifest/resource-slot clarity. |
| AC-003 | Proves runtime-control clarity. |
| AC-004 | Proves bundle/shared discriminator clarity. |
| AC-005 | Proves run binding terminology clarity. |
| AC-006 | Proves behavior preservation. |
| AC-007 | Proves clean-cut old-name removal. |
| AC-008 | Proves future runtime-stream confusion is reduced. |
| AC-009 | Proves old persisted shapes are not migrated or accepted. |

## Approval Status

User-approved for rework through clarification on 2026-05-08: no public or private migration/backward-compatibility path is allowed. Ticket name: `application-execution-resource-naming`.
