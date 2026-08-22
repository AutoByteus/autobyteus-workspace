# Code Review Report — Universal Application Framework Latest-Personal Integration

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-strategy-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/integration-runtime-contracts.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`, `SR-002`, `SR-003`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: authoritative `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`–`IR-003`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Current Review Round: `4`
- Trigger: `/api_e2e_engineer` reported `API-REV-001 — Fail / 73%` after CRR-003.
- Prior Review Round Reviewed: `CRR-003 — Pass / 93`
- Latest Authoritative Round: `CRR-004`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`
- Delivery Revision Record Reviewed: `N/A`
- Failing Scenario IDs: `APIE2E-SOCRATIC-001` / `APIE2E-F001`; `APIE2E-STANDALONE-001` / `APIE2E-F002`
- Exact Failing Commands / Execution Mode:
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/application-backend/socratic-lesson-target-projection.test.ts --no-watch`
  - `pnpm -C applications/socratic-math-teacher start -- --port 43141 --host 127.0.0.1 --data-dir /private/tmp/api-rev001-socratic-standalone.6xr1kb`
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-001-socratic-target-failure.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-001-socratic-standalone.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-001-socratic-standalone-server.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-001-standalone-manager-stack-probe.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-001-source-correlation.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/code-review/crr-004-failure-origin-focused.log`

## Review Scope

- Confirmed that both failing scenarios are approved, independently reachable product/developer paths rather than synthetic test-only possibilities.
- Inspected the smallest relevant current test, maintained Socratic application, backend SDK, standalone startup, migration construction, location lookup, run-manager, and process-supervisor paths needed to classify origin.
- This is not a proportional test-code review. The cumulative API/E2E durable-test delta remains pending until a later API/E2E Pass.
- The complete CRR-003 scorecard is not repeated. Unaffected source conclusions remain historical context; the two affected gates are reopened by the failures below.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis: the maintained Socratic application must run in both hosts, address its bound tutor through current rooted/exact runtime identity, and start standalone only after current migrations while preserving one explicit process run-owner family (`REQ-003`–`REQ-005`; `AC-003`, `AC-005`, `AC-007`–`AC-009`, `AC-011`).
- Design basis: Personal's current `memberAddress`/`agentRunId` contract is authoritative; the application may not use the feature-era route token as a runtime identity. The reviewed startup order deliberately runs migrations before constructing process run owners, and `GeneralProcessRunSupervisor` is the exclusive process owner.
- Behavior-basis status: `Contradicted`
- Changed or newly discovered supported behavior: none. Both failures contradict already approved behavior.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Supported Behavior Evidence |
| --- | --- | --- | --- |
| `BEH-002` | Contradicted | The maintained package builds and validates, but its supported `pnpm start` exits before listen. | `APIE2E-F002`; `CR-PREM-005A` and `CR-PREM-005B`. |
| `BEH-003` | Contradicted | The exact SDK identity contract is present, but Socratic supplies `"tutor"` where the binding's exact `agentRunId` is required; process lookup defaults also preempt the exclusive supervisor owner. | `APIE2E-F001`/`CR-PREM-004` and `APIE2E-F002`/`CR-PREM-005A`–`005B`. |
| `BEH-006` | Contradicted | Repository/build baselines pass, but the required real standalone journey fails before listen and the Socratic exact-target test fails. | `API-REV-001`; critical Studio/provider/browser/parity journeys remain untested. |

## Failure-Origin Analysis

### APIE2E-F001 — Socratic uses a member token where current SDK requires exact `agentRunId`

- The reconciled test is valid. It updates a stale v5 fixture to the current v6 binding shape and expects the actual exact runtime identity already carried by `binding.runtime.members[*].agentRunId`.
- Current product source at `applications/socratic-math-teacher/backend-src/domain/lesson-model.ts:51` calls `createApplicationAgentTeamMemberTargetAddress(binding, "tutor")`.
- Current SDK source at `autobyteus-application-backend-sdk/src/application-agent-target-address.ts:56-81` treats argument 2 as `agentRunId`, validates exact membership, and intentionally rejects route/name/address aliases.
- Reviewer rerun after the required shared-package build reproduces exactly `1 failed / 2 passed` with `does not contain agentRunId 'tutor'`.
- Origin: implementation defect in maintained application source; not an invalid test, environment problem, requirement gap, or SDK defect.
- Review-gap assessment: reasonably detectable in source review. The prior review confirmed current rooted identity generally but did not trace the maintained Socratic lesson-return path through the current SDK builder. The literal feature-era token against the exact current signature should have been caught.

### APIE2E-F002 — pre-supervisor lookup defaults claim `AgentTeamRunManager`

- The real maintained `pnpm start` command is an explicit supported developer surface (`AC-003`). It completes all 23 migrations and exits before listen with `The process AgentTeamRunManager is already initialized.`
- `startStandaloneApplicationHost` runs the current app-data migration runner before constructing `GeneralProcessRunSupervisor`, exactly as approved.
- Migration registry construction eagerly creates two runtime-memory migrations. Their `RuntimeMemoryLocationClassifier -> AgentMemoryLocationService -> TeamRunExecutionTreeLocationService` default chain calls `AgentTeamRunManager.getInstance()`, thereby creating the process singleton before the supervisor can claim it.
- Independently, `GeneralProcessRunSupervisor` initializes `AgentRunManager` before `AgentTeamRunManager`; the agent manager's default `RunFileChangeService` creates the same location service and can claim the team singleton before the supervisor's subsequent `initializeProcessInstance()` call.
- The exclusive `initializeProcessInstance` rejection is correct and must not be relaxed: accepting the earlier default instance would retain the wrong default factories/session/resource dependencies and erase the reviewed process ownership guarantee.
- Origin: bounded implementation-owned process-ownership defect across current lookup defaults and supervisor construction; the reviewed startup/ownership design is adequate and need not change.
- Review-gap assessment: reasonably detectable in source review. The approved startup order and exclusive owner were explicit, but the prior review's lifecycle tests mocked the migration runner/supervisor and did not trace eager constructor defaults through `TeamRunExecutionTreeLocationService.getInstance()`.

## Material Premise Validation

### `CR-PREM-004` — A supported Socratic lesson start reaches exact tutor-target derivation

- Origin: `New`
- Related approved requirement or contract: `REQ-003`–`REQ-005`; `AC-005`, `AC-008`, `AC-009`, `AC-011`; current SDK exact `agentRunId` target contract.
- Relevant behavior: `BEH-003`, `BEH-006`
- Initiating basis kind: `User`
- Independent supported trigger: in the mounted Socratic application UI, a user enters a math problem and submits the exposed Start Lesson form.
- Forward production path: `Socratic Start Lesson form -> frontend client.startLesson -> GraphQL StartLessonMutation -> lesson runtime requireRunnable/startAgentTeam -> attached binding persisted -> lesson read service context.agentExecution.get -> deriveTutorTargetAddress -> SDK exact member target builder`.
- Lifecycle state and consequence: the returned active team binding contains top-level tutor `memberAddress=/tutor` and an allocated exact `agentRunId`. Passing `"tutor"` fails membership validation, rejects the lesson result, and prevents the frontend from receiving the target needed to connect the live tutor session.
- Reachability: `Reachable`
- Review consequence: `CR-004` Major; bounded application-source fix and current-contract coverage are required.

### `CR-PREM-005A` — Standalone startup migrations instantiate a process team manager before its owner

- Origin: `New`
- Related approved requirement or contract: `REQ-003`–`REQ-005`; `AC-003`, `AC-007`–`AC-009`, `AC-011`; reviewed startup phases 7–12.
- Relevant behavior: `BEH-002`, `BEH-003`, `BEH-006`
- Initiating basis kind: `User`
- Independent supported trigger: an application developer runs the maintained Socratic package's documented `pnpm start` command.
- Forward production path: `pnpm start -> autobyteus-app start -> startStandaloneApplicationHost -> initializeStandaloneProcessResources -> getAppDataMigrationRunner -> AppDataMigrationRegistry -> runtime-memory migration constructor -> RuntimeMemoryLocationClassifier -> AgentMemoryLocationService -> TeamRunExecutionTreeLocationService -> AgentTeamRunManager.getInstance -> later createGeneralProcessRunSupervisor -> AgentTeamRunManager.initializeProcessInstance`.
- Lifecycle state and consequence: current migrations have completed, but the process run supervisor has not yet been constructed. The passive location chain has already claimed the singleton, so exclusive initialization throws and the host never listens.
- Reachability: `Reachable`
- Review consequence: supports `CR-005` Major. Migration/history inspection must not claim the live process run owner.

### `CR-PREM-005B` — General process agent-manager defaults can claim the team manager before supervisor initialization

- Origin: `New`
- Related approved requirement or contract: same as `CR-PREM-005A`; `GeneralProcessRunSupervisor` exclusive ownership contract.
- Relevant behavior: `BEH-003`, `BEH-006`
- Initiating basis kind: `User`
- Independent supported trigger: the same documented maintained `pnpm start` operation proceeds from completed prerequisite setup into general-process supervisor construction.
- Forward production path: `createGeneralProcessRunSupervisor -> AgentRunManager.initializeProcessInstance -> AgentRunManager default AgentRunResourceManager -> getRunFileChangeService -> RunFileChangeService -> TeamRunExecutionTreeLocationService -> AgentTeamRunManager.getInstance -> supervisor AgentTeamRunManager.initializeProcessInstance`.
- Lifecycle state and consequence: even after removing the migration preemption, the default agent-manager dependency can create the team singleton between the supervisor's agent and team initialization steps, causing the same pre-listen rejection.
- Reachability: `Reachable`
- Review consequence: independently supports `CR-005`; both preemption paths must be closed rather than fixing only the first observed caller.

## Findings

### `CR-004` — Major — Socratic target derivation supplies the wrong identity kind

- Status: `Open`
- API/E2E mapping: `APIE2E-SOCRATIC-001` / `APIE2E-F001`
- Affected behavior/contracts: `BEH-003`, `BEH-006`; `AC-005`, `AC-008`, `AC-009`, `AC-011`
- Material premise: `CR-PREM-004` (`Reachable`)
- Consequence: a normal Start Lesson response cannot return the exact tutor target, so the mounted application cannot connect its live tutor session.
- Required action:
  1. Resolve the configured `/tutor` member from the authoritative attached binding and pass that member's exact `agentRunId` to `createApplicationAgentTeamMemberTargetAddress`; do not synthesize an ID from team/name tokens or relax SDK validation.
  2. Fail closed with a Socratic configuration error when the exact configured tutor member is absent.
  3. Keep and reconcile the current-contract regression; rebuild/typecheck/pack/validate Socratic from canonical source.
- Classification: `Local Fix`
- Recommended owner: `/implementation_engineer`

### `CR-005` — Major — passive/default lookup construction preempts the exclusive process run owner

- Status: `Open`
- API/E2E mapping: `APIE2E-STANDALONE-001` / `APIE2E-F002`
- Affected behavior/contracts: `BEH-002`, `BEH-003`, `BEH-006`; `AC-003`, `AC-007`–`AC-009`, `AC-011`; reviewed startup/process-ownership order
- Material premises: `CR-PREM-005A` and `CR-PREM-005B` (`Reachable`)
- Consequence: the built maintained standalone package exits after migrations and before listen; all downstream application/provider/recovery behavior is unavailable.
- Required action:
  1. Keep migrations before process run-owner construction and keep `GeneralProcessRunSupervisor` as the sole exact process `AgentRunManager`/`AgentTeamRunManager` initialization owner.
  2. Make startup migration/history inspection non-owning: constructing passive location/classification dependencies must not call `AgentTeamRunManager.getInstance()`.
  3. Close the independent `AgentRunManager -> RunFileChangeService -> TeamRunExecutionTreeLocationService` preemption path with explicit non-owning/current process dependencies; do not weaken `initializeProcessInstance`, reuse a prematurely default-created manager, introduce a global fallback, or add a late-bound proxy.
  4. Add focused real-construction coverage that runs the current migration registry and general supervisor in approved order, asserts exactly one process owner family, and releases ownership on close/failure. API/E2E must rerun the exact real standalone command first and prove readiness/listen.
- Classification: `Local Fix`
- Recommended owner: `/implementation_engineer`

## Classification

`Local Fix` — both failures are implementation-owned deviations from an adequate reviewed design. No requirement or product-scope decision is missing.

## Recommended Recipient

`/implementation_engineer`

After correction, complete affected implementation-source review is required before API/E2E resumes. A later API/E2E Pass must still return for proportional review of the cumulative durable-test changes.

## Residual Risks

- Studio shares the process-owner construction contract and must be rerun after the fix; no Studio success is inferred from the standalone diagnosis.
- The API/E2E-owned 15-file durable update and one stale-test removal remain preserved but unreviewed until a successful execution round.
- Real provider, handoff, publication/projection, restart, package parity, cleanup, and downstream Electron verification remain incomplete.
- Inherited broad-suite debt remains separately characterized and is not attributed here.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass`
- Score Summary: `N/A — focused failure-origin review; the CRR-003 93/100 source gate is superseded for advancement by two reachable Major findings.`
- Failure Origin: `Implementation defects`; source review gaps were reasonably detectable for both exact identity integration and pre-owner singleton construction.
- Recommended Recipient: `/implementation_engineer`
- Notes: `CR-004` and `CR-005` require bounded implementation correction, source re-review, and a full API/E2E rerun. Do not perform proportional durable-test review yet.
