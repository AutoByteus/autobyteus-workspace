# Requirements Doc

## Status

`Design-ready`

## Goal / Problem Statement

Refactor the current application execution construction boundary so one concrete owner encapsulates the graph-local mutable Agent/Team execution family for the lifetime already governed by one `ApplicationPlatformRuntime`. The change must make authority, instance identity, dependency injection, lifecycle, and the complete request/return data-flow spines explicit without changing supported Studio or standalone behavior.

This is architecture-health work, not a response to a currently failing product behavior. It prevents recurrence of previously demonstrated split-authority and hidden-fallback defects while preserving the corrected production baseline. The target must be simpler to reason about: outer application-platform code depends on a small set of semantic execution capabilities, not a mixed bag of managers, registries, session owners, and services.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | Studio constructs one application-platform runtime and one graph-local execution family that supports multiple maintained applications. | Preserve that multiplicity while encapsulating the execution family behind one explicit lifecycle owner. | Studio-hosted launch, binding isolation, streaming, publication, reload, and cleanup outcomes remain unchanged. | REQ-001, REQ-008; AC-001, AC-008, AC-009 |
| BEH-002 | Standalone constructs one application-platform runtime and execution family for the selected application. | Use the same execution-owner boundary at the existing runtime lifetime. | Standalone selected-application routes, launch, recovery, Agent Tools, publication, and shutdown remain unchanged. | REQ-001, REQ-007; AC-002, AC-008 |
| BEH-003 | Application launch, input, streaming, publication, memory lookup, nested Team tasks, recovery, and cleanup use a graph-local Agent/Team family assembled and redistributed by broad factory return objects. | Give that mutable family one concrete owner; callers receive only subject-specific immutable capabilities and cannot bypass them to raw managers/registries/sessions. | All run identities, binding/wire contracts, RootTeamRun-local task routing, worker protocol, provider behavior, and results remain unchanged. | REQ-002–REQ-007, REQ-010; AC-003, AC-005–AC-010 |
| BEH-004 | General-process execution is separately supervised and intentionally non-identical to application execution; both use canonical host definitions. | Preserve the explicit separation and prevent either family from resolving the other's internals. | General Studio Agent/Team behavior and canonical definition sharing remain unchanged. | REQ-004, REQ-009; AC-004, AC-011 |

## Investigation Findings

- `createApplicationRunServices()` currently returns ten mixed-level members: Agent/Team services, managers, activation/session/publication/memory/projection owners, and shutdown coordination.
- `createApplicationOrchestrationServices()` passes those internals to launch, lifecycle, host, and streaming consumers and returns a further fifteen-member mixed orchestration object.
- `ApplicationPlatformLifecycle` enumerates the scoped MCP session manager and run shutdown coordinator separately even though they belong to one execution lifetime.
- `ApplicationAgentStreamRuntimeSource` requires an injected Agent manager but still contains a process-global `AgentRunManager.getInstance()` fallback. The supported Studio/standalone path supplies the manager, so the fallback is redundant and contradicts the exact graph-local contract.
- Platform construction and orchestration call process accessors (`getWorkspaceManager()` and runtime/model/provider/client getters) instead of receiving named composition dependencies.
- Current source proves one execution family per platform-runtime lifetime, not per mounted application. Reentry reloads workers and resumes bindings/events without rebuilding that family.
- The proposed scope is justified because it owns mutable identity, admission, construction unwind, ordered Team-before-Agent shutdown, and scoped session lifecycle. It is not justified as a renamed return bag or generic container.
- The adjacent logical `memberAddress` address simplification is evidence-backed but is a separate versioned SDK/protocol/persistence concern; it must not be bundled into this behavior-neutral refactor.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `application-execution-scope-ownership-and-spine-map.md` | Intended boundary, ownership, lifetime, dependency, and spine contract | REQ-001–REQ-010 | AC-001–AC-011 | `Design-ready`; user-authorized direction | Makes the approved structural outcome concrete without adding product behavior |
| `adjacent-application-agent-addressing-evaluation.md` | Evidence and separate-ticket recommendation | N/A | N/A | `Investigated`; approval N/A for this ticket | Records why address/runtimeKind cleanup is excluded and where its future boundary belongs |
| `application-execution-scope-contracts.md` | Exact normative build/capability/admission/assembly contracts | REQ-001–REQ-007, REQ-010 | AC-001–AC-007, AC-010 | `Design-ready`; approved behavior-neutral refinement | Removes implementation discretion at the authoritative boundary |
| `application-execution-scope-transition-inventory.md` | Closed production/test/AFB transition and proof inventory | REQ-004, REQ-007, REQ-010 | AC-005–AC-011 | `Design-ready`; approved behavior-neutral refinement | Makes the clean-cut source/test transition deterministic |

## Design Health Assessment (Mandatory)

- Change posture: `Refactor`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` plus `File Placement Or Responsibility Drift`
- Refactor posture: `Likely Needed`
- Evidence basis: the current graph-local identity is correct, but ownership is procedural and redistributed through mixed-level bags; lifecycle callers depend on execution leaves; application construction uses ambient process accessors; one normal component retains an unreachable fallback to global execution authority. Prior reachable authority failures establish a material maintenance consequence.
- Requirement or scope impact: behavior-neutral structural hardening only. No new product surface, execution mode, route, protocol, persistence policy, or deployment behavior is authorized.

## Recommendations

- Introduce one concrete `ApplicationExecutionScope` per existing `ApplicationPlatformRuntime` lifetime.
- Let that owner construct and privately own the application Agent/Team execution kernel; expose only narrow semantic capabilities.
- Absorb and remove the broad run-services factory rather than wrapping it.
- Pass intentionally shared process infrastructure into the application-platform builder by named dependency.
- Preserve exact outer-platform lifecycle order and move Team-before-Agent/session close behind the scope lifecycle boundary.
- Remove application execution global fallbacks and mixed-level boundary bypasses in the same clean cut.

## Scope Classification

`Large` — behavior-neutral but cross-cutting construction, lifecycle, runtime-flow, architecture-boundary, and durable-test refactor across both hosting modes.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001` Studio server boot and one application execution scope for its platform runtime.
- `UC-002` standalone host boot and one scope for its selected-application platform runtime.
- `UC-003` application Agent and Team launch/input through graph-local execution capabilities.
- `UC-004` application streaming return through the exact graph-local event source.
- `UC-005` application artifact publication/projection through the graph-local publication authority.
- `UC-006` application RootTeamRun-local task delegation and nested Team execution.
- `UC-007` package reload/reentry and recovery while scope identity remains unchanged.
- `UC-008` construction-failure unwind, admission quiescence, and idempotent ordered shutdown.
- `UC-009` multiple maintained Studio applications using the current one-runtime scope without cross-binding, stream, or publication leakage.

### Out of Scope

- A separate scope per mounted application, application-ID manager routing, manager maps, or service locators.
- Unifying general-process and application Agent/Team managers, sessions, activation, task roots, or cleanup.
- Changing the public application Agent target/address wire contract, removing member/producer `runtimeKind`, or changing the SDK/protocol/persistence schema; these are the separately evaluated follow-up.
- New product behavior, routes, package formats, worker protocols, provider/model policies, definition behavior, or migrations.
- Compatibility wrappers, dual execution paths, global fallbacks, generic containers, or a mode-switched server builder.

### Preserved Behavior Boundary

`BEH-001`–`BEH-004` remain behaviorally identical. Studio and standalone assembly roots remain explicit; `ApplicationPlatformRuntime` remains the outer platform owner; `GeneralProcessRunSupervisor` remains separate; canonical definitions and intentionally process-owned infrastructure remain shared through explicit injection; `RootTeamRun` remains the task lifecycle/state owner.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside this boundary may be recorded as a recommendation or separate-ticket candidate, not a required correction.
- A downstream reviewer comment does not amend this basis. Scope-changing proposals return to the solution designer and user.

## Functional Requirements

- `REQ-001` One concrete application execution owner must exist per current `ApplicationPlatformRuntime` lifetime in both Studio and standalone composition.
- `REQ-002` The owner must construct and privately own the exact graph-local mutable Agent/Team execution kernel: Agent/Team services and managers, activation/resources, application Agent Tools MCP session scope/manager, memory/context, publication/relay/projection, exact stream source, and internal run/session shutdown.
- `REQ-003` Callers above the owner must receive only semantically narrow capabilities required for Agent execution, Team execution, streaming, artifact access, memory lookup, tool readiness, and lifecycle; no caller receives a generic services collection or raw manager/registry/session manager.
- `REQ-004` Construction must consume explicitly injected canonical definitions and intentionally shared process infrastructure. Application paths must not rediscover execution or readiness dependencies through ambient accessors.
- `REQ-005` Scope construction and later platform assembly before runtime publication must fail closed and unwind only successfully created execution-owned resources in reverse; they must never close process-owned infrastructure.
- `REQ-006` The owner must support idempotent admission quiescence and close, preserve the current outer drain order, stop Team runs before Agent runs, revoke scoped sessions/resources, and aggregate independent cleanup failures.
- `REQ-007` Launch, streaming, publication, memory/context, nested task delegation, cleanup, recovery, and reentry must use the same scope-owned identity family.
- `REQ-008` Multiple Studio applications must preserve current binding-based isolation under one runtime scope; reentry must not rebuild the scope or managers within the current platform-runtime lifetime.
- `REQ-009` General-process and application execution must remain non-identical and mutually encapsulated while using the canonical definition authority where current behavior requires it.
- `REQ-010` The refactor must cleanly remove broad execution service bags, leaf-level lifecycle bypasses, redundant execution global fallbacks, and obsolete file placement; no compatibility alias or dual path may remain.

## Acceptance Criteria

- `AC-001` Studio creates exactly one scope for its platform runtime and runs all maintained applications without cross-binding stream/publication leakage.
- `AC-002` Standalone creates exactly one scope for its selected-application runtime and preserves launch, recovery, Agent Tools, publication, and shutdown outcomes.
- `AC-003` Focused tests prove exact internal identity from Agent/Team launch through scoped sessions, activation/resources, memory, streaming, publication, nested configured/task Teams, and cleanup, without exposing those internals publicly.
- `AC-004` Tests prove application and general-process managers/sessions are non-identical while CRUD-created canonical definitions remain usable by both paths.
- `AC-005` Architecture guards prove application paths do not import/call `AgentRunManager.getInstance()`, `AgentTeamRunManager.getInstance()`, `getAgentRunService()`, `getTeamRunService()`, or application-ID/run-ID execution locators, and prove all required named construction dependencies are injected.
- `AC-006` Injected failure tests at scope construction stages and after scope creation/before runtime publication prove reverse unwind of only created scope resources, no live run on construction, and no closure of process infrastructure.
- `AC-007` Shutdown tests prove quiescence blocks new application launch/session admission, outer work drains in the preserved order, Teams stop before Agents, scoped sessions/resources close once, repeated close is harmless, and independent failures are aggregated.
- `AC-008` Real Studio and standalone checks preserve launch/input, streaming, publication/projection, nested Team task/history, recovery/reentry, and cleanup behavior.
- `AC-009` Reload/reentry tests prove worker/binding recovery uses the same scope and manager identities during the existing runtime lifetime.
- `AC-010` Target source contains no broad replacement **execution** bag, generic container, service locator, per-application manager registry, compatibility wrapper, or public address/schema change. An internal assembly result may contain sibling outer orchestration owners only and is not an authoritative caller boundary.
- `AC-011` General-process behavior remains independently covered and cannot consume application-scope internals; the scope cannot consume supervisor internals.

## Constraints / Dependencies

- Base authority is `origin/personal` at `306de420ca8830478529b40bd6dfda6694b742a9`; delivery must refresh the tracked base before finalization.
- Studio and standalone assembly roots remain separate and explicit.
- `ApplicationPlatformRuntime` remains the outer owner for packages, storage, availability, engines/workers, gateways, queues, recovery/reentry, host surfaces, and whole-platform lifecycle.
- Shared process infrastructure is explicitly and intentionally shared; only graph-local application execution state moves behind the new owner.
- Existing wire/data/storage contracts and migrations are unchanged.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: application packages, definitions, launch overrides, bindings, projections, histories, and migration-managed application data.
- Required outcome: `Not Affected`
- Existing data to preserve, discard/rebuild, transform, or quarantine: all existing data is consumed by unchanged readers/writers; nothing is transformed.
- Unacceptable data loss or corruption: rewrite, reset, loss, duplication, or reinterpretation of any current persisted state.
- Relevant availability, maintenance-window, or rollout constraints: none beyond normal source deployment; no migration may be introduced.
- Related requirement and acceptance-criteria IDs: REQ-007–REQ-010; AC-008–AC-010.

## Assumptions

- Studio deliberately has one application execution family per `ApplicationPlatformRuntime`, not one per mounted application.
- Current reload/reentry stays inside the same platform-runtime lifetime.
- The current public application Agent target/address and event contracts remain authoritative for this ticket.

## Risks / Open Questions

- Exact TypeScript capability signatures must remain derived from current consumers during implementation; they must not widen to convenience APIs.
- Scope construction must not become an overly long file; private construction sections may use existing owned factories only where those factories own real backend construction, not pass-through assembly.
- Latest-base refresh may add new process dependencies; they must follow the same explicit named-injection rule rather than reopening ambient access.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-007, UC-009 |
| REQ-002 | UC-003–UC-006, UC-008 |
| REQ-003 | UC-003–UC-006, UC-008 |
| REQ-004 | UC-001, UC-002, UC-003 |
| REQ-005 | UC-001, UC-002, UC-008 |
| REQ-006 | UC-008 |
| REQ-007 | UC-003–UC-008 |
| REQ-008 | UC-007, UC-009 |
| REQ-009 | UC-001–UC-003, UC-006, UC-008 |
| REQ-010 | UC-001–UC-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Studio one-scope multiplicity and multi-application isolation characterization |
| AC-002 | standalone selected-application scope and behavior characterization |
| AC-003 | focused identity/projection tests across every graph-sensitive capability |
| AC-004 | canonical-definition sharing plus general/application identity separation |
| AC-005 | executable dependency/import/constructor occurrence architecture rules |
| AC-006 | injected failure at construction stages and reverse-unwind assertions |
| AC-007 | lifecycle order, quiescence, exact-once cleanup, and error aggregation |
| AC-008 | realistic dual-host business journeys |
| AC-009 | reload/reentry identity retention |
| AC-010 | source occurrence/removal and no-schema-diff verification |
| AC-011 | independent general-process path and forbidden cross-scope dependencies |

## Approval Status

`Approved direction / Design-ready.` The user explicitly requested this design-first architecture-health work and clarified the governing goals: complete data-flow spines, clear authoritative boundaries, simple dependency direction, explicit ownership, and removal of implicit or redundant paths. The adjacent address/runtimeKind concern is not approved as part of this ticket and remains a separate recommendation.
