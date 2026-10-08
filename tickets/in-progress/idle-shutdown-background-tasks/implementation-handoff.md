# Implementation Handoff

Package: `idle-shutdown-background-tasks` — worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks`, branch `codex/idle-shutdown-background-tasks`, base `origin/personal` @ `3a2496c95`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Medium/High) and passed (`ARCH-REV-001`, round 1). Handoff rule after implementation: source review by `/software_engineering_team/code_reviewer` (architectural_risk=High).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/requirements-doc.md` (Approved, SR-002)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-spec.md` (Ready, SR-002)
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/problem-report.md` (evidence only); `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/handoff-architecture-design-complete.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/design-review-report.md` (Pass; AR-N-001, AR-N-002 applied; AR-N-003 is Solution Designer-only)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation). AC-001 live evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/evidence/`

## Current Implementation Summary

Idle shutdown of delegated copies is removed end to end (DEC-004). A delegated copy now stays live until its Task is DONE, its root stops or fail-stops, or the server stops. Restore on message after a restart or a DONE reactivation is unchanged, now via `RootTaskExecutionLifecycle.withLiveChain` (renamed from `withLiveLease`, no lease counting). The grace setting, the schedule, the `shutdown` queue command, the quiet-termination chain (adapters → registries → team manager/backend/run → handles → `AgentRunManager` → `AgentRun` → `AgentRunTermination` → input admission state), `TaskExecutionTeardownIndeterminateError`, Org teardown-event retirement, and the idle option plumbing are deleted. The LLM collaboration contract and server/web docs describe the new lifetime.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/idle-shutdown-background-tasks/tickets/in-progress/idle-shutdown-background-tasks/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (applied non-blocking notes AR-N-001, AR-N-002)

Commits on the branch (base `3a2496c95`):
- `ba0437e00` test(baseline): mixed backend facade test used the removed `prepareTaskAgent` API (TESTING.md rule 9 baseline fix, separate commit).
- Implementation commit (this handoff): see `git log` on the branch, message `refactor(task-execution): remove idle shutdown of delegated copies`.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: Diff is removal-dominated (38 source files, +90/−811 in `src`; 3 source files deleted) and spans task lifecycle, Team/Org/standalone adapters, team execution, agent-execution termination, settings and the LLM contract, which is the blast radius the design described. No new owner, API or persistence.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Every removal target was grep-checked before deletion; no non-idle caller was found, and no supported path needed a copy to become non-live other than DONE, root stop/fail-stop or server stop.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | No idle shutdown; Claude background task completes; agent reports to delegator | `RootTaskExecutionLifecycle.onAgentStatus(agentRunId)` only forwards status to the Task side (`root-task-execution-lifecycle.ts`); schedule file, `onGraceElapsed`/`shutdownAtHead`/`armLive`, `shutdown` kind, adapter `tryShutDownIfQuiet` deleted | Live E2E before: background task `stopped` 60 012 ms after idle, no marker, no report. After: report 91 462 ms after idle, task `completed`, marker `done`, no `offline` (evidence dir). |
| BEH-002 | Same for AGY / any long wait | Same runtime-neutral removal; no runtime-specific code | Covered by the same lifecycle path; not exercised live for AGY |
| BEH-004 | Quiet copy stays live; same-root message delivered without restore | `withLiveChain` → queue `wake` → `restoreChainAtHead` → adapter `restoreChain`, which skips live executions | Unit (lifecycle, 2-day fake time, Agent + Team) and integration (`task-delegation-tool-lifecycle`: 2-day fake time, delivered, `inspect` and restore never called) |
| BEH-007 | Grace setting removed; stored value inert | `server-settings-service.ts` predefined registration removed; `config/task-execution-idle-shutdown-setting.ts` deleted | Unit test: not offered; stored value lists as editable/deletable custom setting. After live E2E ran with the stale env value 60000 set: no effect. |
| BEH-008 | DONE, reactivation, root stop, restart + message unchanged | DONE release, `reactivateClosedTarget`, `closeExternalAdmission`/`enterRootFailStop` (minus `schedule.dispose()`), `assertRestorableChain`/`restoreChain` unchanged | Existing reactivation/status/release suites green; release-generation test now produces old generations through DONE + reactivation instead of quiet shutdown |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Paths relative to `autobyteus-server-ts/src/`.

- Lifecycle: `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` (schedule, leases, shutdown removed; `withLiveChain`; `onAgentStatus(agentRunId)`; doc comments updated), `root-task-execution-command-queue.ts` (kinds `activate | wake | reopen`), `root-task-execution-adapter.ts` (`tryShutDownIfQuiet` and `isLive` removed from the interface; chain doc "for restore and status"), `task-delegation-command.ts` (teardown error removed), `task-execution-running-work.ts` (comment).
- Deleted: `agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.ts`, `config/task-execution-idle-shutdown-setting.ts`, `agent-org-execution/services/agent-org-task-event-retirement.ts`.
- Adapters: `agent-team-execution/task-delegation/team-task-execution-adapter.ts`, `agent-org-execution/services/agent-org-task-execution-adapter.ts`, `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts` (quiet shutdown, offline publishing, teardown catch removed; `isLive` private; option types lose `publishAgentOffline`, `enterLifecycleFailStop`, `beginTaskExecutionEventRetirement`).
- Roots and delivery: `agent-team-execution/domain/root-team-run.ts`, `task-delegation/team-task-execution-service.ts` (+ `-contract.ts`, `acquireLiveLease` removed), `services/team-run-message-delivery.ts`, `agent-org-execution/domain/agent-org-run.ts` (+ `-options.ts`), `services/agent-org-run-message-delivery.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `services/standalone-root-message-delivery.ts`.
- Quiet chain: `agent-collaboration/execution/backends/root-agent-execution-registry.ts`, `root-team-execution-directory.ts`, `configured-agent-execution-handle.ts`; `agent-team-execution/local/registries/task-agent-execution-registry.ts`, `task-team-execution-registry.ts`, `flat-team-execution-manager.ts` (the `quiescing` state stays for normal termination), `flat-team-run-backend.ts`, `flat-team-agent-execution-handle.ts`, `backends/team-run-backend.ts`, `domain/team-run.ts`, `services/team-run-resolver.ts`; `agent-execution/services/agent-run-manager.ts` (also its `quiescentTerminationAttempts` branch in `prepareAgentRunTermination`), `domain/agent-run.ts`, `domain/agent-run-termination.ts` (`tryingQuiescent` branch in `prepare()`), `input/agent-run-input-admission-state.ts`.
- Settings / contract: `services/server-settings-service.ts`, `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`.
- Tests: new `tests/e2e/runtime/claude-delegated-background-task.e2e.test.ts` (AC-001b); rewritten lifecycle, generation (renamed `task-agent-resource-release-generation.test.ts`), status, reactivation, tree-scope, liveness, parity/golden, agent-run(-manager), routing, integration lifecycle tests, `tests/fixtures/task-release-generation-fixtures.ts`, `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts`; deleted the two Org idle-shutdown tests; new AC-004 settings test.
- Docs: server `agent_team_execution.md` (Lifetime rule replaces Idle shutdown / Grace period; file list), `agent_orgs.md`, `agent_tools.md`, `prompt_engineering.md` (mirrors contract), `codex_integration.md` (no grace env; new E2E), `agent_execution.md`, `agent_communication.md`, `features/task_agent_identity_future_improvements.md`; web `docs/agent_teams.md`, `agent_orgs.md`, `settings.md`, `agent_execution_architecture.md`; root `TESTING.md` (new live E2E row). Web test titles/fixture comment reworded (no behavior change).

## Important Assumptions

- `onAgentStatus` drops its now-unused `status` parameter (`onAgentStatus(agentRunId)`); the design listed `(agentRunId, status)`. Keeping a dead parameter would contradict the clean-cut rule; the root callers simplified accordingly.
- `withLiveChain` keeps today's error semantics exactly: coded `TaskDelegationError`s before/at the queued restore return a rejected result; the post-restore `assertInputAllowed` re-check before the operation throws, as the old `lease.assertOpen()` did.
- The old restore-failure "re-arm" step has no replacement (nothing to arm); executions restored before a failure simply stay live.
- `AgentRunManager.prepareAgentRunTermination` lost its `quiescentTerminationAttempts` branch: it is the manager-level counterpart of `AgentRunTermination.prepare()`'s `tryingQuiescent` branch and was only populated by the removed try-if-quiescent method.

## Known Risks

- QR-002 / R-3 (accepted by user): an open Task's copy keeps its runtime process until DONE, root stop or server stop; pre-2026-10-06 unowned copies until root/server stop.
- R-2: Org teardown-event retirement is gone. DONE release status publication is unchanged; no quiet teardown remains to suppress.
- `mixed-task-delegation.e2e.test.ts` was rewritten (copies stay live; the cross-root probe LIVE-004 moved into LIVE-005, after a reopen, because a live copy in another root is reachable by contract) but could not be run here (needs LM Studio + Codex + Claude). It typechecks.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change with removal-driven cleanup
- Reviewed root-cause classification: Legacy Or Compatibility Pressure
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now` (removal)
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: All Removal Plan items deleted; AR-N-002 (`isLive` off the interface, `enterLifecycleFailStop` off adapter options) applied and confirmed by grep + `tsc -p tsconfig.build.json`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` (also the helpers only the removed paths used: `completedLocalTermination`, `assertCurrentPublishedRun`, `cancelDeferredPreparation`, `runIdOf` in two adapters, `shuttingDown` sets, `TaskExecutionLiveLease`, `TaskExecutionAgentStatus`)
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` (every changed source file shrank or stayed the same size)
- Notes: Step-8 grep (`IDLE_SHUTDOWN|IdleShutdown|IfQuiescent|IfQuiet|LiveLease|EventRetirement|TeardownIndeterminate|unregisterTerminated` over src/tests/docs, all packages) returns only the AC-004 settings test, which must name the stale key. AR-N-001 grep (`stays quiet|grace period`, case-insensitive, docs + tests) returns nothing. Unused imports that `--noUnusedLocals` reports in touched files all predate this change (verified against base) and were left alone.

## Persisted Data Transition Check (When Applicable)

- Approved decision (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`): `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: `server-settings-service.test.ts` new case: the key is not offered; a stored value lists as `Custom user-defined setting`, editable and deletable. The after live E2E ran with `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=60000` set and passed.
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree had no dependencies installed; ran `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, and `pnpm -C autobyteus-web exec nuxt prepare`. Untracked build output (`autobyteus-application-*/dist`) is not staged.
- Live E2E used the local Claude login (`claude` 2.1.283, PATH candidate) with model `haiku`.
- Baseline failures unrelated to this change (identical on base `3a2496c95`, verified with the change stashed); reported as a separate item, not fixed here:
  - Unit: 43 tests in 15 files — stale test doubles (for example `FileExplorer is not a constructor`, `AgentRunManager requires all execution-family dependencies`, agent-memory location returning `null`) and environment-dependent cases (Prisma ESM loader `@prisma/client` default export under `~/.hermes/node`; the streaming interval read `300`, not `500`, likely from an inherited env value).
  - Integration `tests/integration/agent-team-execution`: 23 tests in 4 files (`agent-team-run-manager`, `configured-scope-readiness`, `team-agent-tools-mcp-lifecycle`, `team-conversation-target-websocket`). Cause: test backend factory doubles lack `beginPreparation` / `beginMaterialization` after an earlier activation refactor (for example `COLLABORATION_AGENT_ACTIVATION_FAILED: factory.beginPreparation is not a function`).
  - One base failure that is in this change's own touched test file (`mixed-team-run-backend.integration.test.ts`, removed `prepareTaskAgent` API) was fixed in its own baseline commit `ba0437e00`.

## Local Implementation Checks Run

- `npx tsc -p tsconfig.build.json --noEmit` (production source): pass.
- `npx tsc -p tsconfig.json --noEmit` (source + tests): no errors other than the existing TS6059 rootDir notices.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-collaboration tests/unit/agent-team-execution tests/unit/agent-org-execution tests/unit/agent-execution tests/unit/standalone-agent-run-root tests/unit/services tests/unit/projects tests/unit/agent-tools tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts tests/integration/standalone-agent-run-root --no-watch`: 2627 passed, 5 skipped, 1 failed (`media-storage-service`, a listed base failure).
- Full `tests/unit`: 4947 passed, 43 failed — exactly the base failures above.
- `pnpm -C autobyteus-web exec vitest run services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts`: 12 passed (titles reworded only).
- AC-001(b) gated live Claude E2E (`RUN_CLAUDE_E2E=1 … claude-delegated-background-task.e2e.test.ts`), run as implementation evidence for the "before"/"after" pair that design step 1 required:
  - Before (unchanged code, grace 60000): FAIL as expected — `BACKGROUND_TASK_UPDATED stopped` at 60 012 ms after idle, `markerContent: null`. Receipts: `evidence/baseline-before/ac-001-64ff1474.json`, `evidence/baseline-before.log`.
  - After (this change, stale grace env 60000 still set): PASS — `TEAM_COMMUNICATION_MESSAGE` at 91 462 ms after idle, task `completed` at 88 728 ms, `markerContent: "done"`, no `offline`. Receipts: `evidence/after/ac-001-9e77509f.json`, `evidence/after.log`.
- Step-8 greps as recorded above.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — backend-only behavior change. The setting disappears from the server settings list automatically. Web changes are docs, one spec's test titles and one probe fixture comment; no rendered surface changed.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: rerun the Claude live E2E; optionally an AGY background step (BEH-002) with a scripted or live AGY delegated copy that waits longer than 60 s.
- AC-002: Team, Org and standalone roots — delegated Agent and Team copies idle for a long time, then a same-root `send_message_to(run ID)` is accepted with no restore (no `initializing` status, provider session unchanged).
- AC-003: DONE release, DONE → reopen → message reactivation, root stop, server restart + message (`task-reactivation-root-visibility.e2e.test.ts`, `task-closure-root-visibility.e2e.test.ts`, `ad-hoc-task-delegation.e2e.test.ts` with the scripted AGY CLI).
- AC-004: Settings page/API with a stored `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS` value: startup succeeds, the value is listed as a custom setting and can be deleted.
- `mixed-task-delegation.e2e.test.ts` (LM Studio + Codex + Claude) if the environment is available.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent API/E2E validation of AC-001..AC-004 across Team, Org and standalone roots (owned by `api_e2e_engineer` after code review).
- `mixed-task-delegation.e2e.test.ts` has not been executed after the rewrite.
- AGY background-step lifetime (BEH-002) has not been exercised live.
