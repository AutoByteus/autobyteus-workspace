# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by the Solution Designer within the direction (user informed, 2026-10-24)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder/tickets/in-progress/imported-app-codex-runtime-folder/investigation-notes.md`
- Authorities read (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `TESTING.md`
- Project design-principle conflicts or discrepancies: none

## Current-State Read

`ApplicationCatalogTransitionService.commitAndRecover` (`application-catalog-transition-service.ts:118-156`) commits a changed catalog, reconciles availability and runs `definitionReadiness.prepare()`. Readiness reads Codex's sign-in by spawning Codex in the application's runtime folder (E-04). Startup prepares that folder first (`application-platform-lifecycle.ts:51-56`); the catalog transition does not. A newly imported application's folder does not exist yet, so the spawn fails with `ENOENT` and the application is quarantined (SD-01).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: one service gains one dependency and one step; one wiring line; one unit test update; one new E2E file.
- Architectural risk: `Low`
- Risk rationale: reuses the existing storage owner and the startup order; no contract, persistence-shape, security, concurrency or deployment change. The folder path is the one startup already creates.
- Escalation trigger: if readiness still fails after the folder exists (another missing prerequisite on import), or the storage step must move into readiness, return a Design Impact.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| Code | `application-catalog-transition-service.ts:118-156` | No storage step before readiness | Add it here | — |
| Code | `application-platform-lifecycle.ts:51-58` | Startup order | Mirror it | — |
| Code | `application-storage-lifecycle-service.ts:66-72,116-121` | Owner of the folder | Reuse | — |
| Code | `build-application-platform-runtime.ts:72,182-189` | Wiring site has the service | Inject | — |
| SD-01/SD-02 | evidence | Reproduced; folder before readiness is sufficient | Whole design | — |

## Intended Change

The catalog transition prepares each current application's runtime folder (through `ApplicationStorageLifecycleService.ensureRuntimeDirectoryPrepared`) after committing the catalog and before running readiness. A new E2E imports a Codex-default application and launches it.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002. `application-catalog-transition-service.ts` (dependency + step), `build-application-platform-runtime.ts` (pass `storageLifecycleService`), unit test of the transition service, new server E2E.
- Derived consumers: `ApplicationPackageCommandService` (import/reload/remove) and `reloadAndReenter` callers get the fix through `commitAndRecover`; no change to them.
- Deliberately left alone: readiness rules and texts (`ApplicationProviderCredentialReadinessAdapter`, `AgentRuntimeSignInReader`); Antigravity/Grok readiness (FU-004 of autobyteus-207, its own Task); startup lifecycle; engine storage preparation.
- Follow-ups: none found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Change / Preserved | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001…003, AC-001/002/005 | Import | Quarantined | ACTIVE, runnable | DS-001 |
| BEH-002 | System | AC-004 | Startup | Works | Unchanged | — |
| BEH-003 | User | REQ-001, AC-003 | Reload | Same gap | Same step | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro-imported-app-codex-launch.e2e.test.ts` | Reproduction | AC-001 | Becomes the E2E | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers: *Several kinds or forms / two paths serve one capability* fires. Startup and the catalog transition both bring catalog applications to readiness, and the folder step was on one path only (Principle 1). The response adds the same step to the second path, through the same owner. *Repeated coordination*: the two paths now each call "prepare runtime folders, then readiness". They are different lifecycles (startup does more steps in between, and the transition also recovers participants), so a shared coordinator would be an empty layer; accepted.
- Root cause classification: `Missing Invariant` ("an application's runtime folder exists before its readiness check" is enforced only at startup).
- Refactor needed now: `No`
- Evidence: E-01, E-03, SD-01, SD-02.
- Design response: as Intended Change.
- Intentional deferrals: none.

## Terminology

- *Runtime folder*: `ApplicationStorageLayout.runtimeDir`, the application's working directory.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: none. Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. An empty folder is created at the path startup already creates; no stored data changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-003 | GraphQL `importApplicationPackage` / reload | Application ACTIVE (or quarantined with a real reason) | `ApplicationCatalogTransitionService` | The fixed path |

## Primary Execution Spine(s)

DS-001: `GraphQL importApplicationPackage -> ApplicationPackageCommandService -> ApplicationCatalogTransitionService.runPackageTransition -> commitAndRecover: commit catalog -> reconcile availability -> [NEW] ApplicationStorageLifecycleService.ensureRuntimeDirectoryPrepared (each current application) -> ApplicationDefinitionRuntimeReadiness.prepare (launch view -> credential readiness -> Codex account/read in the runtime folder) -> ApplicationReentryService.recoverParticipants -> availability ACTIVE`

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | A changed catalog is committed; each application's working folder is prepared; readiness checks it; ready applications are activated | transition, storage, readiness, reentry | `ApplicationCatalogTransitionService` | storage lifecycle (folder) |

## Spine Actors / Main-Line Nodes

Package command service, catalog transition, readiness, reentry.

## Ownership Map

- `ApplicationCatalogTransitionService` owns the transition sequence, including the new step's position.
- `ApplicationStorageLifecycleService` owns creating the folder.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Notes |
| --- | --- | --- | --- |
| None | — | — | No dead code in the touched files |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

N/A.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Runtime folder preparation | DS-001 | transition | `mkdir -p` the runtime folder | Readiness and runs use it as cwd | In readiness, a read would write |

## Ownership Boundaries

The transition calls the storage service's public method only; it does not build paths or call `fs` itself.

## Boundary Encapsulation Map

| Boundary | Internal Mechanisms | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `ApplicationStorageLifecycleService.ensureRuntimeDirectoryPrepared` | layout, `ensureApplicationRuntimeDirectory` | lifecycle, catalog transition | The transition calling `buildApplicationStorageLayout`/`fs.mkdirSync` directly (as the SD-02 diagnostic did) | — |

## Dependency Rules

`application-orchestration` → `application-storage` (type `Pick` of the lifecycle service), already an allowed direction (E-08). No dependency from storage to orchestration.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationCatalogTransitionService` constructor deps | transition | adds `storageLifecycle: Pick<ApplicationStorageLifecycleService, "ensureRuntimeDirectoryPrepared">` | — | Name the field as the wiring prefers (`storageLifecycleService` matches the lifecycle's) |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `ensureRuntimeDirectoryPrepared(applicationId)` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Everywhere? | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| Runtime folder | `runtimeDir` / "runtime directory" | Yes | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Create the folder | `ApplicationStorageLifecycleService` | Reuse | Startup's owner |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Owner Served | Decision |
| --- | --- | --- | --- | --- |
| `application-orchestration` | sequence | DS-001 | transition | Extend |
| `application-storage` | folder | DS-001 | transition | Reuse |

## Draft File Responsibility Mapping

As in the target mapping below.

## Reusable Owned Structures Check

None.

## Shared Structure / Data Model Tightness Check

N/A.

## Final File Responsibility Mapping

As drafted.

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-catalog-transition-service.ts` | Modify | transition | New dependency; in `commitAndRecover`, after `commitPreparedCatalogSlice`/`commitPreparedDelta` and before `definitionReadiness.prepare()`, await `ensureRuntimeDirectoryPrepared` for each `transitionPlan.currentApplicationIds` | Sequence owner | Path building, `fs` |
| `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` | Modify | wiring | Pass `storageLifecycleService` | Wiring site | — |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-catalog-transition-service.test.ts` | Modify | tests | Provide the dependency; assert the folder step runs for current applications before readiness (AC-003) | Existing test | — |
| `autobyteus-server-ts/tests/e2e/runtime/<import-then-launch>.e2e.test.ts` (name chosen by implementation, for example `application-import-codex-launch.e2e.test.ts`) | Add | tests | AC-001, AC-002 from the reproduction (rename, remove "TEMPORARY"; file header per TESTING.md) | Beside the same harness's tests | — |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| existing folders | as existing | Yes | Low | No new folders |

## Concrete Examples / Shape Guidance

```ts
// commitAndRecover, after both commits:
for (const applicationId of transitionPlan.currentApplicationIds) {
  await this.dependencies.storageLifecycleService.ensureRuntimeDirectoryPrepared(applicationId);
}
const snapshot = await this.dependencies.bundleService.getCatalogSnapshot();
await this.dependencies.catalogReconciliation.reconcile(snapshot);
// ... definitionReadiness.prepare() as today
```

Avoided shape: readiness or the credential adapter creating the folder, or choosing another cwd when it is missing.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| None | — | N/A | — |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add the reproduction as the E2E; see it fail.
2. Add the dependency and step; wire it.
3. Update the transition unit test (order assertion).
4. Run: the new E2E, the transition unit test, `application-platform-lifecycle` tests, `agent-runtimes-running-agents.e2e`, server typecheck, and the architecture boundary test.

## Key Tradeoffs

- A failure to create the folder fails the transition (rollback path), like startup fails on it. Accepted: an infrastructure failure, reported.

## Risks

- None beyond R-01.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/imported-app-codex-runtime-folder/evidence/repro-imported-app-codex-launch.e2e.test.ts`. Copy it into `autobyteus-server-ts/tests/e2e/runtime/`, then run `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch`. It fails on base (`evidence/SD-01-repro-base.log`) and the fix must turn it green. Add AC-002 (signed-out Codex keeps today's text) to it.
- The worktree is installed and `test:integration:prepare` has run; the SDK and Brief Studio `dist/` folders are untracked build outputs; do not commit them.
