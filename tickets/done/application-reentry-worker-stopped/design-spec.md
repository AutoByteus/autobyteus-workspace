# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (design revision after architecture review ARCH-REV-001: AR-001, AR-002)
- Approved requirements baseline: `requirements-doc.md` at SR-001 (unchanged by SR-002), approved by the Solution Designer within the direction (user informed, 2026-10-24)
- Behavior-defining supplements: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/investigation-notes.md`
- Authorities read (2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `GLOSSARY.md`, `TESTING.md`, `RELEASE.md`
- Project design-principle conflicts or discrepancies: `GLOSSARY.md` has no application vocabulary (findings report #9); this design introduces no new domain word

## Current-State Read

A package reload or repair runs `ApplicationCatalogTransitionService.commitAndRecover` (`application-catalog-transition-service.ts:118-166`). It prepares participants (admission closed, calls drained, worker stopped), commits the catalog, prepares runtime folders and runs readiness. It then hands the ready application IDs to `ApplicationReentryService.recoverParticipants` (`application-reentry-service.ts:74-178`), which does four things in this order:
1. recovers bindings;
2. starts the worker while the app is `REENTERING` (`:151`);
3. resumes dispatch, which is a no-op before ACTIVE (`application-execution-event-dispatch-service.ts:85-89`);
4. activates the app.

A worker that calls the host on start is refused (`application-availability-service.ts:209-215`), and the app is quarantined. Not-ready applications get a generic text (`:111`), because only IDs cross the boundary (E-06). Startup does it right (`application-platform-lifecycle.ts:85-126`): recover, activate, then resume dispatch, with no worker start and the diagnostics in the quarantine text.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: five server source files across three subsystems (`application-orchestration` reentry and transition; `application-platform` readiness and lifecycle; `application-engine` controller stop, SR-002), four or five unit test files, one new e2e, two module docs.
- Architectural risk: `High`
- Risk rationale: it changes the lifecycle order of the reentry path that import, package reload and repair share. The worker start moves from reentry to on-demand, and pending-event dispatch now actually runs after reentry. It also changes the contract between transition and reentry (IDs become reasons). There is no API, persistence, security or deployment change, and the target is the documented contract.
- Escalation trigger: if a worker-dependent step is found that must run before ACTIVE (for example application-tool catalog refresh from the worker), return a Design Impact.

## Architecture Investigation Evidence

| Source | Path | Observation | Decision Supported | Uncertainty |
| --- | --- | --- | --- | --- |
| SD-01/SD-02 | evidence | Reproduced; the documented order fixes reload and repair | DEC-001 | — |
| Code | E-03 startup | Correct order and text | Mirror it | — |
| Code | E-04, E-05 | Dispatch and tools start a stopped worker on demand; dispatch needs ACTIVE | Worker stays stopped | — |
| Code | E-06 | Reasons lost at the transition→reentry boundary | Pass reasons | — |
| History | E-08 (corrected in SR-002) | The worker start was added in a checkpoint commit. Its rationale no longer holds for a `stopped` worker, which the invoker starts on demand. It still holds for a `failed` (crashed) worker: the invoker refuses `failed` (`application-agent-tool-worker-invoker.ts:24-29`), and a stop of a detached worker leaves `failed` (`application-engine-controller.ts:202-206`), so today only reentry's start recovers it (application-owned-mcp-capability `requirements.md:217`) | Remove the start, and make stop end in `stopped` (AR-001) | — |
| Code (SR-002) | `application-engine-launcher.ts:68-72,145-168`; `application-engine-controller.ts:202-225`; `application-engine-state-registry.ts:15-24` | A crash detaches the handle and sets `failed`; `stopAttachedEngine` returns early without a handle; the base status is `stopped` | Stop sets the base status also without a handle | — |

## Intended Change

`recoverParticipants` recovers bindings, activates, resumes pending-event dispatch and opens application tools. It no longer starts the worker. Stopping a worker always ends in the base `stopped` status, also when the worker had crashed and is no longer attached (SR-002, AR-001). So a reentered participant's worker is `stopped` and starts on demand, including after a crash. The transition passes each not-ready application's setup reason, taken from readiness, and reentry quarantines with it. Readiness owns the "Application setup is required: …" text, and startup uses the same method. The docs and a durable e2e follow.

## Change Scope (Mandatory)

- In scope: UC-001…UC-003 (code), UC-004 (report only). Files in the Target mapping.
- Derived consumers: `recoverParticipants` has one caller (`ApplicationCatalogTransitionService.commitAndRecover`); `ApplicationSetupRequiredError` keeps its message (built by the same function). `getDiagnosticsByApplicationId` is removed (SR-002, AR-002): its only production reader, the startup lifecycle (`application-platform-lifecycle.ts:113-120`), instead iterates the selected catalog applications it already has (`snapshot.applications` filtered by `isSelected`, the set readiness checked) and quarantines each one whose `getSetupRequiredDetail` is not null. Its two test stubs go with it.
- Callers of the worker stop (SR-002): `ApplicationEngineLauncher.stop` → controller stop. Callers of `launcher.stop`: reentry `prepareParticipants` (`application-reentry-service.ts:61`), reentry's recovery-failure path (`:161`), `quarantineParticipants` (`:198`), and `stopAll` (`application-engine-launcher.ts:76-88`, attached workers only, so unchanged). For each, ending in `stopped` is right: the participant is either returned to service with a stopped worker or quarantined (where availability refuses it anyway); shutdown is unaffected.
- Deliberately left alone: participant preparation (`prepareParticipants`), `quarantineParticipants`, the `recoverPreviouslyInactive` policy (finding 5), the removed/persisted-only branches (`:88-101`), startup order, readiness rules, every finding in `application-framework-design-findings.md` except 1–3.
- Follow-ups: at the user's request (2026-10-24), the design assessment's recommendations are `follow-ups.md` FU-001 (one owner for bringing an application into service + state table), FU-002 (one availability reader; remove global fallbacks), FU-003 (real-worker lifecycle e2e), FU-004 (user's recovery path for a quarantined app; package-reload policy), FU-005 (application vocabulary and glossary). The remaining findings (#7 within FU-002; #10–12) stay in `application-framework-design-findings.md` for the user to decide.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | REQ / AC | Trigger | Existing | Change / Preserved | Target Path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, AC-001/002/004/005 | Reload / repair | Worker started in REENTERING → quarantine | ACTIVE, worker stopped | DS-001 |
| BEH-002 | System | REQ-002, AC-005 | Reentry | Dispatch resume no-op | Dispatch after ACTIVE | DS-001 |
| BEH-003 | User | REQ-003, AC-003/006 | Not-ready app after catalog change | Generic text | Readiness reason | DS-001, DS-002 |
| BEH-004 | User | REQ-001, AC-004 | Repair after sign-in | Quarantined again | ACTIVE | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro-application-reentry.e2e.test.ts` | Reproduction | AC-001…004 | Becomes the durable e2e | Current |
| `application-framework-design-findings.md` | Report | AC-009 | Findings 1–3 fixed here | Current |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers:
  - *Several kinds or forms / two paths serve one capability* fires. Startup and reentry both bring an application to service, and only startup follows the contract. The response aligns reentry with startup.
  - *Duplicated policy* fires for the "setup required" text, built in two places (E-06). The response gives it one owner, readiness.
  - *Behavior by absence* fires. Reentry decides "not ready" from an ID missing in a list and then invents a text. The response passes the reason explicitly.
  - *Derived data*: the reason is derived once, in readiness, and read by both consumers.
- Root cause classification: `Missing Invariant` (application-driven work, including the worker's own host calls, requires ACTIVE; reentry violated it) plus `Duplicated Policy Or Coordination` (setup text).
- Refactor needed now: `Yes`, small: the setup text and the transition→reentry contract.
- Evidence: E-01…E-08, SD-01, SD-02.
- Design response: as Intended Change.
- Intentional deferrals: findings 4–12 (report).

## Terminology

- *Reentry*: returning participants of a catalog transition (import, package reload, repair) to service. *Repair*: `POST /rest/applications/:id/backend/reload`. *Setup reason*: the readiness diagnostics text for a not-ready application.

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the worker start in reentry; the generic "after catalog transition" text; the `recoverableApplicationIds` parameter (replaced by reasons); the inline setup text in the lifecycle.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- `Not Affected`: in-memory availability and worker lifecycle only.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001…004 | GraphQL `reloadApplicationPackage` / REST repair / import | Availability ACTIVE or QUARANTINED with reason | `ApplicationCatalogTransitionService` (sequence) and `ApplicationReentryService` (participant recovery) | The fixed path |
| DS-002 | Primary End-to-End | BEH-003 | Server startup | Quarantine with reason | `ApplicationPlatformLifecycle` | Shares the text owner |
| DS-003 | Bounded Local | BEH-001, BEH-002 | participant | ACTIVE / QUARANTINED | `recoverParticipants` | Per-participant order |

## Primary Execution Spine(s)

DS-001: `devkit/REST -> ApplicationPackageCommandService | REST repair -> ApplicationCatalogTransitionService.runExclusive -> prepareParticipants (close tools, drain, stop worker) -> stage + commit catalog -> ensureRuntimeDirectoryPrepared -> catalogReconciliation.reconcile -> ApplicationDefinitionRuntimeReadiness.prepare -> (setup reasons for current apps) -> ApplicationReentryService.recoverParticipants -> [ready] OrchestrationRecoveryService.resumeApplication -> AvailabilityService.activateApplication -> EventDispatchService.resumePendingEventsForApplication -> ApplicationAgentToolCallLifecycle.open | [not ready] quarantineApplication(reason)`

DS-002: `ApplicationPlatformLifecycle.runRecovery -> … -> for each not-ready app: quarantineApplication(readiness.setupRequiredDetail(id))` (same text owner).

## Spine Narratives (Mandatory)

| Spine ID | Narrative | Main Nodes | Owner | Off-Spine |
| --- | --- | --- | --- | --- |
| DS-001 | A catalog change stops the affected apps, commits, checks readiness, then returns each one to service. Ready apps recover bindings, become ACTIVE, resume events and open tools, with the worker stopped. Not-ready apps are quarantined with their readiness reason | transition, readiness, reentry, availability, dispatch | transition / reentry | worker launcher (stop only), tool lifecycle |

## Spine Actors / Main-Line Nodes

Package command service / repair route, catalog transition, readiness, reentry, recovery, availability, dispatch, tool lifecycle.

## Ownership Map

- Transition: the sequence of a catalog change, and carrying readiness results to reentry.
- Readiness: diagnostics and their user-facing "setup required" text.
- Reentry: per-participant return to service, in the order recover → ACTIVE → dispatch resume → tools open. It does not start workers.
- Engine launcher and controller: start workers on demand (ensure-ready, tool invoker, dispatch). Reentry only stops them. A stop always ends in `stopped`, whatever state the worker was in (SR-002). A crashed worker stays `failed`, and its tool calls fail closed, until the next stop (reentry, i.e. a repair or package reload) or an explicit ensure-ready. That is the contract of application-owned-mcp-capability (`requirements.md:217`).

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `engineLauncher.ensureReady` in `recoverParticipants` (`application-reentry-service.ts:151`) and `"ensureReady"` in its dependency `Pick` | Violates the contract; on-demand start exists | Lazy start by ensure-ready / tools / dispatch | Keep `stop` |
| `recoverableApplicationIds` parameter | Loses the reason | Setup reasons (map: applicationId → detail) | One caller |
| Text "Application setup is required after catalog transition." (`:111`) | Generic | Readiness reason | Unit test text changes |
| Inline text in `application-platform-lifecycle.ts:118` | Duplicate | Readiness method | — |
| `ApplicationDefinitionRuntimeReadiness.getDiagnosticsByApplicationId` (`:112-114`) and its two test stubs (SR-002, AR-002) | Dead after the lifecycle uses `getSetupRequiredDetail`: no other production reader (grep) | `getSetupRequiredDetail` per selected application | — |
| Early return without a status change in `ApplicationEngineController.stopAttachedEngine` (`:204-206`) (SR-002, AR-001) | Leaves a crashed worker `failed` after a stop | Stop ends in the base `stopped` status with or without a handle | Name the method for what it does (`stopEngine`; its only caller is the launcher) |

## Return Or Event Spine(s)

Pending-event dispatch after activation: `resumePendingEventsForApplication -> schedule -> drain -> ensureReady (worker start, ACTIVE so its host calls are admitted) -> invokeApplicationEventHandler -> acknowledge`. Unchanged mechanism.

## Bounded Local / Internal Spines

DS-003 (parent `recoverParticipants`, per current application):
`removed? -> quarantine (unchanged) | setup reason? -> close tools, quarantine(reason) | not previously active and no recoverPreviouslyInactive? -> quarantine (unchanged) | resumeApplication -> activateApplication -> resumePendingEventsForApplication -> tools open; on throw -> stop worker, close tools, quarantine(message)`

Worker state across a reentry (SR-002, MP-001): `prepareParticipants` stops the worker. Whether it was `ready`, `failed` (crashed, detached) or already `stopped`, it is now `stopped`. Reentry starts nothing. After ACTIVE, the first ensure-ready, tool call or pending event starts it.

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Setup-reason text | DS-001/002 | transition, lifecycle | One formatter | Same message everywhere | Drift |

## Ownership Boundaries

Reentry depends on availability, recovery, dispatch, launcher (stop), tool lifecycle, as today. It receives setup reasons as data; it does not call readiness.

## Boundary Encapsulation Map

| Boundary | Internal | Callers | Forbidden Bypass | If Too Thin |
| --- | --- | --- | --- | --- |
| `ApplicationDefinitionRuntimeReadiness` (diagnostics, setup text) | diagnostics map | transition, lifecycle | Callers composing "Application setup is required" themselves | Add the method (this design) |

## Dependency Rules

Unchanged directions. `application-orchestration` (transition) already depends on `application-platform/runtime/application-definition-runtime-readiness` (type import); reentry gains no new dependency.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationDefinitionRuntimeReadiness.getSetupRequiredDetail(applicationId): string \| null` (name may be refined) | one application | "Application setup is required: <diagnostics joined by '; '>" or null when ready | applicationId | The error class builds its message with the same function |
| `ApplicationReentryService.recoverParticipants(token, currentApplicationIds, setupRequiredDetails: ReadonlyMap<string, string>, options)` | participants | as DS-003 | IDs + map | Replaces `recoverableApplicationIds` |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| both | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Subject | Name | Natural? | Same Everywhere? | Drift | Action |
| --- | --- | --- | --- | --- | --- |
| Setup reason | "setup required detail" | Yes | Matches `ApplicationSetupRequiredError`, `APPLICATION_SETUP_REQUIRED` | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Reason text | `ApplicationSetupRequiredError` message | Extend (shared formatter) | Same text |
| Worker start | Launcher on demand | Reuse | Already there |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `application-orchestration` | transition, reentry | DS-001 | Extend |
| `application-platform/runtime` | readiness, lifecycle | DS-001/002 | Extend |

## Draft File Responsibility Mapping

See target mapping.

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| "Application setup is required: …" | `application-definition-runtime-readiness.ts` | readiness | 3 builders today | Yes | Yes | A general message catalog |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `ReadonlyMap<applicationId, setupRequiredDetail>` | Yes | Yes (replaces the ID list) | Low | None |

## Final File Responsibility Mapping

As below.

## Applied Patterns

None new.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-reentry-service.ts` | Modify | reentry | Order: `resumeApplication` → `activateApplication` → `resumePendingEventsForApplication` → tools open. No `ensureReady`; launcher `Pick<"stop">`. Not-ready apps quarantine with their reason | Worker start |
| `autobyteus-server-ts/src/application-orchestration/services/application-catalog-transition-service.ts` | Modify | transition | Build the reasons map for `transitionPlan.currentApplicationIds` from readiness; pass it | Text building |
| `autobyteus-server-ts/src/application-platform/runtime/application-definition-runtime-readiness.ts` | Modify | readiness | One formatter for the setup text; `getSetupRequiredDetail(applicationId)` | — |
| `autobyteus-server-ts/src/application-platform/runtime/application-platform-lifecycle.ts` | Modify | lifecycle | At `:113-120`: for each selected catalog application with a non-null `getSetupRequiredDetail`, quarantine with it (replaces the `getDiagnosticsByApplicationId` iteration) | Inline text |
| `autobyteus-server-ts/src/application-engine/services/application-engine-controller.ts` (SR-002) | Modify | controller | `stopAttachedEngine` → `stopEngine`: with a handle as today; without a handle, set the base `stopped` status (a crashed worker's `failed` ends) | Starting a worker |
| `autobyteus-server-ts/src/application-engine/services/application-engine-launcher.ts` (SR-002) | Modify | launcher | Call the renamed method | — |
| `autobyteus-server-ts/tests/unit/application-agent-tools/application-agent-tool-worker-invoker.test.ts` (new) (SR-002) | Add | tests | With the real controller: a worker crashed (`failed`, no handle) → `launcher.stop` (as reentry does) → an application tool call starts the worker on demand (fake launcher start) instead of failing; without the stop it still fails closed | — |
| `autobyteus-server-ts/tests/unit/application-platform/application-platform-lifecycle.test.ts` (stub at `:22`), `tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts` (stub at `:258`), `application-definition-runtime-readiness.test.ts` (SR-002) | Modify | tests | Remove the two `getDiagnosticsByApplicationId` stubs; assert the startup quarantine text via `getSetupRequiredDetail` and the formatter | — |
| `autobyteus-server-ts/tests/architecture/application-framework-boundaries.test.ts:3089-3093` (SR-002) | Modify | architecture guard | Update the anchor string to the renamed stop method; the guard's assertion (the stop sends `APPLICATION_ENGINE_METHOD_STOP`) is unchanged | Weakening the guard |
| `autobyteus-server-ts/tests/unit/application-engine/application-engine-controller.test.ts` (`:77-78`) (SR-002) | Modify | tests | Rename; add: a detached worker in `failed` is `stopped` after the stop | — |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-reentry-service.test.ts` | Modify | tests | AC-005: new order, no worker start; not-ready quarantine with the given reason; recovery failure quarantines | — |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-catalog-transition-service.test.ts` | Modify | tests | Reasons map passed (AC-006) | — |
| readiness / lifecycle unit tests (existing files under `tests/unit/application-platform/`) | Modify | tests | Same text from one owner (AC-006) | — |
| `autobyteus-server-ts/tests/e2e/runtime/application-reload-repair.e2e.test.ts` | Add | tests | AC-001…004 from the reproduction (header per TESTING.md; assert the detail contains "Application setup is required:" and "Codex authentication is unavailable") | — |
| `autobyteus-server-ts/docs/modules/application_orchestration.md` (`:175-180`), `docs/modules/applications.md` (`:111`) | Modify | docs | Order: recovery → ACTIVE (worker stopped) → dispatch resume; the next ensure-ready, tool call or pending event starts the worker; a reentry also resets a crashed worker to stopped (SR-002); a not-ready app's quarantine names its readiness diagnostics | — |

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| existing folders | as existing | Yes | Low | No new folders |

## Concrete Examples / Shape Guidance

```ts
// application-reentry-service.ts, ready participant
await this.dependencies.recoveryService.resumeApplication(applicationId);
const record = this.dependencies.availabilityService.activateApplication(applicationId);
await this.dependencies.eventDispatchService.resumePendingEventsForApplication(applicationId);
this.dependencies.applicationAgentToolCallLifecycle.open(applicationId);
results.set(applicationId, record);

// not-ready participant
const setupRequired = setupRequiredDetails.get(applicationId);
if (setupRequired) { close tools; results.set(applicationId, quarantineApplication(applicationId, setupRequired)); continue; }
```

Avoided shape: admitting the worker's host calls while `REENTERING` (a second admission rule for one state).

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the worker start behind a flag | Old behavior | Rejected | Clean cut |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Add the reproduction as the durable e2e; see both cases fail.
2. Readiness: formatter and `getSetupRequiredDetail`; lifecycle uses it; remove `getDiagnosticsByApplicationId` (SR-002).
2a. Engine controller: stop ends in `stopped` also without a handle; rename to `stopEngine` (SR-002).
3. Transition passes reasons; reentry quarantines with them and uses the new order.
4. Update units (reentry order and texts, transition, readiness/lifecycle).
5. Docs.
6. Run: the new e2e; `application-import-codex-launch.e2e`, `agent-runtimes-running-agents.e2e`; orchestration/platform/agent-tools units; `tests/architecture`; typecheck.

## Key Tradeoffs

- The first request after a reload or repair starts the worker, as after startup.

## Risks

- R-02: dispatch now resumes after reentry (intended).
- A worker start failure now surfaces on the first on-demand start, not during reentry. The app stays ACTIVE and the start failure is reported to that request, as after startup.
- SR-002: a stop now clears a crashed worker's `lastFailure` from its engine status, since the base status has none. The crash reason was already published when the worker closed (`publishWorkerClose`), and a stop means the worker is reset, so this is accepted.

## Guidance For Implementation

- Reproduction to start from: `tickets/in-progress/application-reentry-worker-stopped/evidence/repro-application-reentry.e2e.test.ts`. Copy it into `autobyteus-server-ts/tests/e2e/runtime/`, then run `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/<file> --no-watch`. Both cases fail on base (`evidence/SD-01-repro-base.log`). Make it the durable e2e and do not keep the probe name.
