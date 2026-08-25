# Code Review Report — Universal Application Framework Latest-Personal Integration

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `integration-strategy-analysis.md`, `integration-runtime-contracts.md`, `latest-base-refresh-round-5-design-analysis.md`, and the round-5 conflict/path evidence.
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`–`SR-010`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-003`–`ARCH-REV-010`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`–`IR-011`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-020`
- Current Review Round: `20`
- Trigger: `/api_e2e_engineer` reported `API-REV-010 — Fail / 72` and requested focused origin review.
- Prior Review Round Reviewed: `CRR-019 — Pass / 95`
- Latest Authoritative Round: `CRR-020`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`–`API-REV-010`; current failure authority `API-REV-010`
- Relevant Delivery Revision IDs: `DR-004`, `DR-006`, `DR-008`, `DR-010`
- Failing Scenario IDs: `APIE2E-HIERARCHY-010 / APIE2E-F005`; `APIE2E-MIGRATION-010 / APIE2E-F006`
- Exact Failing Commands / Execution Mode:
  - `pnpm -C autobyteus-server-ts exec vitest run --no-watch tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts`
  - `pnpm -C autobyteus-server-ts exec vitest run --no-watch tests/e2e/run-history/nested-team-history-restart.e2e.test.ts`
  - independent real built-server public GraphQL definition/create-run probe recorded by API/E2E
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-010-failing-e2e-isolated.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-010-definition-run-authority-failure.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-010-source-correlation.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-010-nested-history-failure-detail.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/code-review/crr-020-failure-origin-focused.log`

## Review Scope

- Confirm whether both failures represent approved, reachable behavior.
- Trace the public definition-write -> public Agent/Team run-create authority path for `F005`.
- Trace the failed nested-memory retry -> current V2 projection sequence for `F006` against the approved V1 -> memory -> V2 transition and actual public migration contract.
- Classify source/design versus test/fixture ownership without reopening the complete IR-011 scorecard.
- Explicit exclusions: full current-head browser/provider/dual-host execution and Electron packaging, which remain blocked by the current API/E2E Fail.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis: `BEH-011`, `REQ-004`–`REQ-007`, `REQ-009`–`REQ-012`, `AC-032`–`AC-035`, plus preserved public Studio Agent/Team creation and launch behavior.
- Design-spec behavior map: confirmed for V2-only current readers and V1 -> nested-memory -> V2 ordering; contradicted at the broader Studio definition/run authority boundary because the design introduced a second definition-service family without mapping the existing general run owners to it.
- Behavior-basis status: `Confirmed` for both initiating surfaces; the `F006` test's intermediate expected outcome is contradicted by the approved/current migration contract.
- Changed or newly discovered behavior: none. The supported public Studio definition/save/launch surface already existed.
- Remaining material ambiguity: none for classification. The canonical definition-service scope/ownership must be revised upstream before implementation because several general-process and application-process consumers participate.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Supported Evidence |
| --- | --- | --- | --- |
| Preserved public Studio Agent/Team definition and run lifecycle | `Contradicted` | Studio/public GraphQL definition creation writes through `getStudioAgentDefinitionService` / `getStudioAgentTeamDefinitionService`; public run mutations capture `getAgentRunService()` / `getTeamRunService()`, whose identity allocator/planner use process-global definition singletons. The real built server accepts and lists both definitions, then both run mutations fail to load them. | No supported contract allows a definition that the same Studio process just created and lists to be invisible to that process's run creation. |
| `BEH-011` / `AC-033` migration transition | `Confirmed` | Startup order is V1 -> memory layout -> V2; current projection resolves only through a current V2 execution tree. `runAppDataMigration(id)` invokes exactly the selected `ANYTIME` migration and rebuilds current-package admission only when the selected ID is V2. | `F006` retries only the memory-layout prerequisite and immediately queries a V2-only projection. It never retries V2, although V2 remains a separately exposed retryable `NOT_RUN` migration. |

## Failure-Origin Findings

### `CR-011` / `APIE2E-F005` — Studio definition and run creation use different authoritative service families

- Severity: `High`
- Classification: `Design Impact`
- Affected behavior: preserved public Studio Agent/Team definition-save and launch lifecycle; current positive hierarchical TeamRun creation.
- Independent reachable trigger: in the exposed Studio Agent or Team workflow, a user saves a new definition and launches it; the same supported behavior is available through the public GraphQL definition and run mutations.
- Forward production path: Studio/public create-definition mutation -> configured Studio definition service/cache -> public create-run mutation -> process-global run service -> process-global definition service used by identity allocation/topology planning -> definition not found -> launch rejected.
- Source evidence:
  - `buildStudioServer()` initializes `GeneralProcessRunSupervisor` first, then constructs a separate `createApplicationDefinitionServices()` family and configures definition resolvers with it.
  - `AgentRunResolver` and `AgentTeamRunResolver` capture process-global run services.
  - `AgentRunIdentityAllocator` and `TeamRunService` default to process-global Agent/Team definition singletons.
  - API/E2E server output shows two definition cache families and reproduces the failure for both Agent and Team definitions after successful public creation/listing.
- Why this is not an IR-011 local regression: `ac0e1dea...` changes planner validation and fixtures, not these authority/composition paths. The split predates IR-011 and was previously carried as `APIE2E-REPO-005 / Unclear`.
- Why this is a design issue rather than only a local wiring defect: the fix must decide one canonical definition authority and lifecycle for both the existing general Studio run graph and the application graph, then carry it consistently through public definition resolvers, general run services/identity allocators/topology planners, supervisor backend/context construction, application definition resolution, refresh, and shutdown. Picking one isolated caller to redirect would leave overlapping authorities and violate the Authoritative Boundary Rule.
- Required action: revise the reviewed ownership/composition design so one exact host definition-service family is authoritative for every Studio definition write/read and every general/application run construction consumer, while preserving separate general-process and application-scoped run-manager/session ownership. Then implement that reviewed composition without aliases, cache synchronization, fallback reads, or duplicate services.
- Review-gap attribution: `CRR-018`/`CRR-019` should not have left the known general-run signature as harmless separate debt once current public hierarchical run creation became a required path. The visible source invariant—definition writes and run planning use different service identities—should have triggered supported-path investigation. The current real public API evidence now closes reachability independently; the failing test does not prove its own premise.

### `APIE2E-F006` — stale durable sequence queries a V2-only reader before the V2 migration is retried

- Classification: `Local Fix` owned by `/api_e2e_engineer`
- Affected behavior: `BEH-011` / `AC-033` migration failure, manual retry, and current V2 history projection.
- Independent reachable trigger: Settings -> Server Migrations -> Retry on the failed nested-memory-layout migration.
- Actual production path: retry action -> `runAppDataMigration(memory-layout-id)` -> only memory migration executes -> V2 remains `NOT_RUN` and separately `canRetry` -> current history projection remains unavailable until V2 is run -> user retries V2 or restarts -> V2 conversion/admission -> projection.
- Why the current expectation is stale: the test was valid before v1.4.58 when the current location reader could consume the existing tree directly. The approved v1.4.58 contract intentionally makes current readers V2-only and keeps V1 knowledge migration-only. Success of the prerequisite does not state that dependent migrations were cascaded.
- Source evidence: `AppDataMigrationRunner.runMigration()` runs exactly the requested definition; prerequisites constrain dependents but do not auto-run them. `AppDataMigrationResolver` rebuilds `TeamRunPackageCatalog` only when V2 itself is requested. `TeamMemberRunViewProjectionService` locates the Agent through the current V2 tree. Focused current runner/V2 tests pass `2 files / 25 tests` after the declared shared-build prerequisite.
- Required action: update the durable E2E to retain the real failed-target/manual-retry proof, then explicitly complete the supported V2 retry (or supported restart-to-run-pending path) before asserting current member projection. Do not add dependent-cascade production machinery or a V1 reader solely to satisfy the stale intermediate assertion.
- Origin attribution: test expectation/sequence, not an implementation failure and not IR-011.

## Material Premise Validation

### `MP-CRR-020-001` — a definition created in Studio must be launchable by the same Studio host

- Origin: `New`
- Related contract: preserved Studio Agent/Team definition and run lifecycle; `AC-032`, `AC-035`
- Relevant behavior: positive public hierarchical TeamRun lifecycle.
- Initiating basis kind: `User` / `Contract`
- Independent trigger: a user creates/saves an Agent or Team in Studio and selects Launch; public GraphQL exposes the same supported create-definition and create-run operations.
- Forward path: Studio definition UI/public mutation -> Studio definition owner -> Studio run UI/public mutation -> run service -> identity/topology resolution -> manager creation.
- Lifecycle precondition and consequence: definition creation/listing succeeds in the same running host; launch must resolve that definition. Current separate caches reject both Agent and Team launch.
- Reachability: `Reachable`
- Review consequence: `CR-011` is a blocking design/authority finding.

### `MP-CRR-020-002` — retrying only the nested-memory prerequisite does not complete V2 migration

- Origin: `New`
- Related contract: `BEH-011`, `AC-033`; existing `ANYTIME` runner contract.
- Initiating basis kind: `User` / `Operational`
- Independent trigger: a user uses Settings -> Server Migrations to retry the failed memory-layout row.
- Forward path: retry button -> exact migration ID mutation -> runner executes selected definition only -> statuses refresh -> V2 remains a separately retryable `NOT_RUN` row -> later V2 retry/restart creates and admits the current package.
- Lifecycle precondition and consequence: startup previously stopped dependent migrations because memory failed. Until V2 runs, a V2-only projection correctly has no current execution-tree location.
- Reachability: `Reachable`
- Review consequence: the intermediate `F006` expectation is stale; production cascade/fallback machinery is unsupported.

## Classification And Routing

| Failure | Origin | Classification | Owner / Recipient | Required Gate After Correction |
| --- | --- | --- | --- | --- |
| `APIE2E-F005` | inadequate definition/run authority design and current source composition | `Design Impact` | `/solution_designer` | architecture review -> implementation -> source review -> API/E2E |
| `APIE2E-F006` | stale durable test sequence | `Local Fix` | `/api_e2e_engineer` | preserve until the design/source correction passes, then reconcile the durable test and rerun API/E2E |

## Residual Risks

- The current tree is not ready for delivery: current public Agent/Team run creation is broken after definition creation, and API-REV-010 stopped before browser/provider/dual-host validation.
- The earlier `95/100` source score from CRR-019 is historical and no longer an authoritative current readiness statement; this focused failure-origin round intentionally does not issue a replacement full scorecard.
- The canonical-definition design must not collapse the intentionally separate general-process and application-scoped run managers/sessions. The problem is definition authority, not a justification for a global application run manager.
- The corrected migration E2E must prove the entire supported V1 -> failed memory -> manual memory retry -> V2 retry/admission -> V2 projection sequence without adding compatibility reads.

## Latest Authoritative Result

- Review Decision: **Fail**
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: **Pass**
- Score Summary: **Not rescored** for this focused entry point. Prior `CRR-019 / 95` is superseded as a readiness result by the current Fail.
- Failure Origin:
  - `APIE2E-F005`: **Design Impact** — split Studio definition/run authorities; new `CR-011`.
  - `APIE2E-F006`: **Local Fix / API-E2E-owned** — stale pre-V2 completion assertion.
- Recommended Recipients: `/solution_designer` first for `F005`; `/api_e2e_engineer` for the `F006` durable-test correction after the reviewed design/source path is ready.
- Notes: do not route to implementation as a standalone local fix until the solution/architecture package defines the canonical definition-service ownership. Do not advance to delivery.
