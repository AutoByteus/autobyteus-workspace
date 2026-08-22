# Code Review Report — Universal Application Framework Latest-Personal Integration

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/requirements.md`
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/investigation-notes.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `integration-strategy-analysis.md` and `integration-runtime-contracts.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-001`–`SR-003`
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/design-review-report.md`
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: authoritative `ARCH-REV-003`
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`–`IR-005`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Current Review Round: `8`
- Trigger: `/api_e2e_engineer` reported `API-REV-003 — Fail / 93% evidence confidence` at reviewed HEAD `63000f7bc1d07f3b9b3164594c60fadb8ed6a8b8`.
- Prior Review Round Reviewed: `CRR-007 — Pass / 93`
- Latest Authoritative Round: `CRR-008`
- Coverage Investigation Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`–`API-REV-003`
- Delivery Revision Record Reviewed: `N/A`
- Failing Scenario IDs: `APIE2E-SOCRATIC-002` / `APIE2E-F004`
- Exact Failing Execution Mode: isolated real Studio backend on `127.0.0.1:8014`, Nuxt frontend on `127.0.0.1:3014`, the maintained Socratic `dev:studio` package, installed headless Chrome, and authenticated Codex App Server with the configured Luna model; the visible `Start lesson` action was exercised twice from fresh lesson state.
- Failure Evidence Paths:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-003-socratic-studio-business.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-003-socratic-studio-fresh-repro.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-003-socratic-studio-retry.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-003-socratic-failure-correlation.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/api-e2e/api-rev-003-socratic-failure-source-correlation.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/code-review/crr-008-failure-origin-focused.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-latest-personal-integration/tickets/in-progress/universal-application-framework-latest-personal-integration/evidence/code-review/crr-008-focused-host-service-test.log`

## Review Scope

- Changed implementation and behavior reviewed: no new implementation delta; this round classifies the current integrated source behavior exposed by the real fresh Socratic first-turn failure.
- Files / areas reviewed: the maintained Socratic start/read/target/frontend session path; application agent WebSocket session and streaming source; application binding launch and exact addressed-input translation; root team command dispatch; the focused host-service test; the smallest current API/E2E evidence needed to distinguish identity, provider, environment, test, and source origins.
- Explicit exclusions: no full implementation scorecard was reopened; no proportional review of the cumulative API/E2E durable-test delta was performed because execution failed; broad whole-suite debt and Electron remain separate.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: maintained Socratic is a supported dual-host application whose current rooted `/tutor` identity, application-scoped communication, first real response, and integrated host execution are governed by `REQ-003`–`REQ-005`, `REQ-007`, `AC-003`, `AC-005`, `AC-007`, `AC-008`, and `AC-011`.
- Design-spec behavior map verified against the implementation: `BEH-002` exposes the maintained package, `BEH-003` requires current Personal execution identity with application-scoped messaging, and `BEH-006` requires real integrated proof. The maintained package README further establishes one long-lived binding, exact tutor communication, and `READY`-before-input sequencing.
- Design review report and round confirmed: `ARCH-REV-003 / Pass` remains the approved integration basis; F004 does not reveal a requirement ambiguity or require a different product capability.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. API-REV-003 reached an already-supported Socratic workflow that earlier execution rounds could not reach because prior startup defects failed first.
- Remaining material ambiguity: none. The communication session hides the internal rejection detail on the wire, but the current caller/callee contract proves the deterministic `RUN_NOT_FOUND` source path.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| `BEH-002` | Confirmed | The user enters the maintained Socratic application in Studio and submits the visible `Start lesson` form; the package calls `startLesson`, starts the package-owned team, returns the exact tutor address, connects, awaits `connection.ready`, and immediately sends the problem. | The first supported turn fails twice after the UI-visible action. |
| `BEH-003` | Contradicted | Exact binding/member identity and authorization succeed, but addressed dispatch converts the validated member `agentRunId` to `memberAddress` and passes that address to `RootTeamRun.postMessage`, whose second parameter is an `agentRunId`. Root lookup deterministically returns `RUN_NOT_FOUND` for `/tutor`. | A later follow-up uses the team-run/coordinator route, which resolves the configured coordinator's actual `agentRunId` and therefore reaches the same tutor successfully. |
| `BEH-006` | Contradicted | Real Studio, Chrome, Codex/Luna, SQLite, WebSocket, and raw worker evidence exercise the production path directly. | `API-REV-003` is `Fail`; high evidence confidence is not product readiness. |

## Focused Failure Trace

1. `applications/socratic-math-teacher/backend-src/services/lesson-runtime-service.ts:77-154` persists the prompt, starts the team without an initial input, persists the attached binding, emits `lesson.started`, and returns the lesson. This intentionally leaves response streaming to the frontend connection.
2. `applications/socratic-math-teacher/frontend-src/socratic-runtime.js:256-281` handles the supported `Start lesson` action and invokes `connectLesson(..., sendInitialProblem: true)`.
3. `applications/socratic-math-teacher/frontend-src/socratic-tutor-session.js:188-289` opens the exact member connection, installs event listeners, awaits `connection.ready`, and immediately calls `sendInput` once. Its no-retry behavior is intentional.
4. `application-run-binding-launch-service.ts:101-131` creates and persists the root team plus exact configured member identities. The returned target correctly contains the tutor's `agentRunId`.
5. `application-agent-communication-session.ts:66-168` establishes the event stream and forwards the exact address to `sendRunInput`; it later converts any thrown dispatch error to generic `INPUT_REJECTED`.
6. `application-orchestration-host-service.ts:437-468` validates the exact `agentRunId` against the binding, but then derives `targetMember.memberAddress` and passes `/tutor` as the second argument to `run.postMessage`. The adjacent application-runtime initial-input path at lines 410-435 also passes `targetMemberAddress` directly to the same `agentRunId` parameter, so the mismatch is shared by both current targeting forms.
7. `root-team-run.ts:246-248,337-348` defines that second argument as `agentRunId`, uses it in `TeamExecutionIndex.getAgent`, and returns `RUN_NOT_FOUND` before member materialization when given `/tutor`. The focused unit test at `application-orchestration-host-service.test.ts:370-408` explicitly expects the wrong `/Researcher` argument and therefore masks the current callee contract; reviewer rerun passes all 6 tests.
8. The later Socratic follow-up is not the same address shape: `lesson-runtime-service.ts:178-216` sends `AGENT_TEAM_RUN`, so `RootTeamRun.postMessage` receives `null`, resolves the coordinator's actual `agentRunId`, lazily activates that same `/tutor` member, and succeeds. This precisely explains the deterministic first failure and later success without attributing the issue to provider readiness.

## Material Premise Validation

### `CR-PREM-007` — Fresh Socratic first input immediately after connection readiness

- Origin: `New`
- Related approved requirement or established contract: `REQ-003`–`REQ-005`, `REQ-007`; `AC-003`, `AC-005`, `AC-007`, `AC-008`, `AC-011`; maintained Socratic README lines 3 and 11–13.
- Relevant behavior IDs: `BEH-002`, `BEH-003`, `BEH-006`
- Initiating basis kind: `User`
- Independent product-supported initiating trigger or applicable governing contract: a Studio user enters the maintained Socratic application, types a math problem into the visible start form, and selects `Start lesson`.
- Support evidence: the maintained package is explicitly the current in-repo teaching sample; its UI and README instruct that the first problem is sent after the live connection is ready.
- Forward current production path: visible form -> `socratic-runtime.startLesson` -> package GraphQL `startLesson` -> `context.agentExecution.startAgentTeam` -> persisted exact `/tutor` binding -> frontend `agentCommunication.connect(exactTarget)` -> `connection.ready` -> immediate `sendInput` -> application communication session -> addressed input translation -> root team `agentRunId` lookup -> rejection because `/tutor` was forwarded instead of the authorized ID.
- Lifecycle preconditions and material consequence: the application worker is ready, the exact team binding is `ATTACHED`, and the exact member target carries a valid tutor `agentRunId`. Addressed dispatch replaces it with `/tutor`; root lookup expects an `agentRunId`, rejects before materialization, the UI shows `Tutor connection failed`, and the lesson retains only the student prompt.
- Reachability: `Reachable`
- Review consequence / proportionate response: F004 may drive a Major implementation finding and blocks advancement. A frontend delay/retry is not an acceptable correction because it would conceal admission uncertainty and alter the supported contract.

## Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| `CR-001` | Resolved | Remains resolved | API-REV-003 passes the IR-005 affected selection and real startup prerequisite path. |
| `CR-002` | Resolved | Remains resolved | No launch-store mutation regression appears; exact 73/73 package parity and current focused coverage pass. |
| `CR-003` | Resolved | Remains resolved | Existing-state journal recovery remains green in the affected selection. |
| `CR-004` | Resolved | Remains resolved | Both failed lessons persist and return the exact configured `/tutor` `agentRunId`; F001 remains resolved. |
| `CR-005` | Resolved | Remains resolved | The former duplicate process manager failure is absent from real standalone/Studio startup; F002 remains resolved. |
| `CR-006` | Resolved | Remains resolved | Real fresh-root Socratic standalone now creates the canonical runtime cwd, reaches provider readiness/listen/HTTP 200, and stops cleanly; F003 remains resolved. |

## Findings

### `CR-007` — Major — `Local Fix` — Application team inputs pass member addresses to an `agentRunId` contract

- Affected behavior: `BEH-002`, `BEH-003`, `BEH-006`; `CR-PREM-007`; `APIE2E-F004`.
- Evidence: the supported frontend correctly waits for `connection.ready` and sends exactly once with the validated tutor `agentRunId`. `ApplicationOrchestrationHostService` finds that binding member but forwards its `/tutor` address to `RootTeamRun.postMessage`; the callee interprets the string as an `agentRunId` and returns `RUN_NOT_FOUND`. Its application-runtime `targetMemberAddress` path makes the same incompatible call. The existing focused unit test protects the wrong address argument. The later team-run follow-up resolves the coordinator's real `agentRunId`, reaches the same tutor member, and succeeds.
- User consequence: a fresh Socratic lesson deterministically enters `Tutor connection failed` and never delivers or saves its first tutor response.
- Failure origin: bounded implementation/source contract mismatch at `ApplicationOrchestrationHostService -> RootTeamRun.postMessage`. This is not an invalid test, fixture, environment problem, readiness race, stale identity, provider unavailability, or IR-005 runtime-directory regression.
- Review-gap attribution: this was reasonably detectable in source review. The caller names its value `targetMemberAddress`, the callee names and uses the parameter `agentRunId`, and the focused mock test asserts the wrong address argument without exercising `RootTeamRun`.
- Required correction:
  1. Preserve current rooted identity, application scope, binding durability, subscribe-before-input ordering, lazy member activation, and current provider activation semantics.
  2. Forward the already-authorized exact member `agentRunId` to the current `RootTeamRun.postMessage` contract; do not translate it to `memberAddress`, route through the coordinator, or add a global/legacy fallback. For the separate public `ApplicationRuntimeInput.targetMemberAddress` contract, resolve the validated address through the binding's current member projection to its exact `agentRunId` before dispatch and reject an unknown address.
  3. Correct the focused unit assertion so it proves exact `agentRunId` dispatch, then add non-mocked regressions for both targeting forms: fresh package-team -> exact member connection -> immediate input, and targeted `initialInput.targetMemberAddress` -> exact ID resolution -> root materialization. Retain no-retry behavior and verify invalid/non-member IDs and addresses still fail.
  4. Rerun F004 first and the retained API/E2E matrix. The public generic rejection contract does not need to change for this bounded fix.

## Classification

- Classification: `Local Fix`
- Basis: intended behavior is clear and the correction is a bounded identity translation at the two existing application-orchestration call sites plus their misleading mocks. No new product requirement, schema, compatibility path, or architecture reset is needed.

## Recommended Recipient

- `/implementation_engineer`
- After correction: affected source re-review, then API/E2E must rerun `APIE2E-SOCRATIC-002` first and complete the retained matrix. The cumulative API/E2E durable-test delta still requires separate proportional review only after an execution Pass.

## Residual Risks

- Generic wire rejection hides the internal `RUN_NOT_FOUND` detail, but the current source contract makes the defect deterministic; changing the public error shape is not required.
- The cumulative 16-file API/E2E durable update and one removed stale test remain unreviewed by design while API/E2E is failing.
- Broad whole-suite debt remains separately characterized and cannot be used as F004 evidence.
- Electron remains delivery-owned and blocked behind successful source and API/E2E reruns.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `API/E2E Failure-Origin Review`
- Material-Premise Gate: `Pass`
- Score Summary: no full scorecard was reopened; `CRR-007 / 93` is superseded for advancement by this focused failure result.
- Failure Origin: `ApplicationOrchestrationHostService` passes `memberAddress` to `RootTeamRun.postMessage`, which requires `agentRunId`; exact-member first input fails with `RUN_NOT_FOUND` before materialization.
- Recommended Recipient: `/implementation_engineer`
- Notes: `CR-007` / `APIE2E-F004` is a bounded Local Fix. `CR-001`–`CR-006` remain resolved.
