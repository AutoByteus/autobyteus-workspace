# Implementation Handoff — `reactivate-done-task-runs`

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected (Large/High). ARCH-REV-002 = `Pass` for SR-002, with non-blocking guidance AR-002, AR-003 and AR-004 (all applied; see below). Routing comes from `get_handoff_rules` at handoff time.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/requirements-doc.md` (SR-002, Approved 2026-10-07)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-spec.md` (SR-002)
- Supplemental task artifacts: None
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)

## Current Implementation Summary

Task status stays the agent's. After DONE, the agent moves the Task back to TODO or IN_PROGRESS with `create_or_update_task`; that path is unchanged and starts nothing. When the run that assigned the work then sends `send_message_to(target_agent_run_id=<ingress run ID>)`, its root reactivates exactly that `assigned` entry:

1. `RootTaskExecutionLifecycle.deliverToExactTarget` (called by all three root facades' `deliverExactAgentMessage`) sees that the target belongs to a closed Task entry.
2. `adapter.taskExecutionWithIngress(target)` maps the run ID to the assignment (an Agent copy itself, or a Team copy's coordinator). A team member, or any non-ingress run, is refused with guidance.
3. `port.assertReopenable` (advisory, read-only): the sender is the entry's assigner, the role is `assigned`, the assignment started, and the Task exists and is not DONE.
4. Queue command `reopen` (serialized with wake, activation and idle shutdown): if the entry is already open, it skips (AR-002). Otherwise `RootTaskAgentResourceScope.discardReleasedExecution` re-invokes the exact release (idempotent) and, only once it is confirmed, `adapter.discardReleasedExecution` drops the released handle or TeamRun. Then `assertRestorableChain` checks that the saved conversation exists.
5. `port.reopenAssignment` commits under the Task's `serialize` with DONE. It re-checks every condition and re-reads the status, sets `closedAt → null` on that one entry, and never writes `task.json`.
6. `adapter.publishTaskExecutionsReopened([ref])`, only when this call committed the reopen.
7. The unchanged wake / restore / deliver path runs under the sender's lease. The accepted result's `message` ends with "`<run ID>` was reactivated."

`delegate_task` success results carry `target_kind` (`agent` / `team`). The agent-facing texts describe reopen-then-message and no longer call DONE final. Clients remove reopened references from their closed set (Team, Agent and Org roots). Snapshots and stored reads follow the Task-side view automatically.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (AR-002, AR-003 and AR-004 were applied as guidance)

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change:
  - The implementation touches the Task side, the root-neutral lifecycle, three adapters, five backend registries, three root event types and projectors, two stream-contract packages, the `delegate_task` contract, web consumers and docs.
  - It reverses "closed is forever", changes a persisted transition and the Task ownership fence, and adds a concurrency rule with DONE and release.
- Selected route: `Code Review` (Large/High; confirmed by `get_handoff_rules`)
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. All three escalation triggers were checked against the real registries:
  - every backend can discard its released authority without touching another execution;
  - a released Team copy restores through the existing restore path without re-planning members;
  - all three roots route the assigner's message through `deliverExactAgentMessage`.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Assigner's run-ID message reactivates a closed assignment and is delivered | `root-task-execution-lifecycle.ts` `deliverToExactTarget` / `reactivateClosedTarget`; facades in `standalone-agent-run-root.ts`, `root-team-run.ts` (via `team-task-execution-service.ts`), `agent-org-run.ts`; `project-task-service.ts` `assertReopenable` / `reopenAssignment`; `task-agent-resource-service.ts` `reopenAssignment`; `task-agent-resources.ts` `reopenTaskAgentResource` | Implemented. Unit-tested in all three roots over the real registries; browser-rendered in all three roots |
| BEH-002 | Status only by the agent; a status change alone reopens nothing; a message while DONE is refused with the reopen-first hint | No change to `updateTask` / `updateTaskById` / `closeAndWrite`. `assertTaskNotDone` in `project-task-service.ts` (checked advisory and again under `serialize`) | AC-014/015 covered; `task.json` is byte-identical after a reactivation (test) |
| BEH-003 | Rows reappear live and stay after reload or restart | Events: `team-run-event.ts` + `task-execution-event-factory.ts`, `standalone-root-event.ts`, `agent-org-run-event.ts`. Projectors (×3). Contracts: `TASK_EXECUTIONS_REOPENED`, `task_executions_reopened`. Web: `removeReopenedTaskExecutions` applied in `teamExecutionViewState.ts`, `agentRunCollaborationContext.ts`, `agentOrgExecutionContext.ts`. Reload/restart follow the view swap (`closedAgentRunsIn`) | Live and fresh-reload shown in a real browser (3 roots). Server restart: the persisted entry is open after restart (Task-side test); the browser restart journey is left to API/E2E |
| BEH-004 | Team copy restored as a whole via its coordinator | `taskExecutionWithIngress` (coordinator → `{teamRunId}`); team discard in `root-team-execution-directory.ts`, `task-team-execution-registry.ts`, `team-run.ts`, `team-run-resolver.ts` `retireTerminated` | Backend test: a new TeamRun is restored in all three root kinds and its coordinator receives the message |
| BEH-005 | Helpers stay closed | Only the targeted `assigned` entry is reopened (domain + port); helpers are never restored | Tested on the Task side, the lifecycle, backends (no re-acquisition) and the browser (2 helpers stay hidden per root) |
| BEH-006 | Other senders / non-ingress targets refused with guidance | `ASSIGNER_ONLY_REACTIVATION_MESSAGE` (domain); non-ingress refusal in the lifecycle | AC-005/006/007: refused, nothing stopped, discarded, reopened or published |
| BEH-007 | `delegate_task` returns `target_kind` | `root-task-dispatch.ts`, the lifecycle's `ensureTaskHelper`, `task-delegation-command.ts`, `task-delegation-result-contract.ts` (strict enum, required on success) | MCP output schema updated (tests) |
| BEH-008 | DONE unchanged; texts describe reactivation and no longer call DONE final | `project-task-tool-contract.ts`, `agent-team-collaboration-llm-contract.ts`, `docs/modules/prompt_engineering.md` (AR-003) | Hash pins updated. A new test forbids "for good" / "unless its Task is DONE" / "can never" |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Task side:
  - `autobyteus-server-ts/src/projects/domain/task-agent-resources.ts`
  - `src/projects/domain/project-errors.ts`
  - `src/projects/services/task-agent-resource-service.ts`
  - `src/projects/services/project-task-service.ts`
- Runtime (`src/agent-collaboration/execution/task/`):
  - `task-agent-resource-port.ts`, `root-task-execution-adapter.ts`, `root-task-execution-lifecycle.ts`
  - `root-task-execution-command-queue.ts`, `root-task-agent-resource-scope.ts`
  - `root-task-dispatch.ts`, `task-delegation-command.ts`
- Backends:
  - `agent-collaboration/execution/backends/root-agent-execution-registry.ts`
  - `agent-collaboration/execution/backends/root-team-execution-directory.ts`
  - `agent-team-execution/domain/team-run.ts`, `backends/team-run-backend.ts`
  - `local/flat-team-run-backend.ts`, `local/flat-team-execution-manager.ts`
  - `local/registries/task-agent-execution-registry.ts`, `task-team-execution-registry.ts`
  - `services/team-run-resolver.ts`
- Adapters:
  - `standalone-root-task-execution-adapter.ts`
  - `agent-org-task-execution-adapter.ts`
  - `team-task-execution-adapter.ts`
- Roots, events and projectors:
  - `standalone-agent-run-root.ts`, `agent-org-run.ts`, `root-team-run.ts`, `team-task-execution-service.ts`
  - The three event files and `task-execution-event-factory.ts`
  - `services/agent-streaming/*-projector.ts` (×3)
- Contracts:
  - `autobyteus-team-stream-contracts/src/{team-task-execution-message-dtos,team-stream-server-message}.ts`
  - `autobyteus-collaboration-stream-contracts/src/{agent-org-execution-dtos,agent-run-collaboration-dtos}.ts`
  - Tracked `dist/` for both packages, rebuilt
- Web:
  - `utils/collaboration/taskExecutionClosure.ts`
  - `services/teamExecution/teamExecutionViewState.ts`, `teamExecutionViewModels.ts`
  - `services/agentCollaboration/agentRunCollaborationContext.ts`
  - `services/agentOrgExecution/agentOrgExecutionContext.ts`
- Docs:
  - Server: `docs/modules/projects.md` (new **Reactivation** section), `agent_team_execution.md`, `agent_communication.md`, `standalone_agent_run_root.md`, `prompt_engineering.md`
  - Web: `docs/projects.md`, `docs/agent_teams.md`, `docs/chat.md`
  - Root `TESTING.md` (the "closed-forever" wording, plus the new test files)
- New tests (server):
  - `tests/unit/projects/task-agent-resource-reactivation.test.ts`
  - `tests/unit/agent-collaboration/root-task-reactivation.test.ts`
  - `tests/unit/agent-collaboration/task-reactivation-backends.test.ts`
  - Plus additions to `standalone-agent-run-root.test.ts`, `team-execution-view-projector.test.ts`, the LLM contract test and the result-contract tests
- New tests (contracts): `tests/*.test.mjs` in both packages
- New tests (web): closure specs (×4)

## Important Assumptions

- The assigner is always unowned. A Task-owned run cannot assign (`TASK_AGENT_RESOURCE_OWNED_SENDER`) and its delegations are helpers, so a reactivation never crosses Tasks in message scope.
- The sender identity passed to `deliverToExactTarget` comes from the server-side member execution context (router), as for all run-ID sends. `requestedBy` is matched against the stored `assignedBy`.
- `TASK_NOT_FOUND` is mapped to a send refusal only on the reactivation path (`TASK_REACTIVATION_REJECTION_CODES`). The shared `TASK_AGENT_RESOURCE_REJECTION_CODES` list is unchanged, so `delegate_task` mapping (AC-014) is unchanged.

## Known Risks

- **Deviation from the design text (structural, same behavior):**
  - The design put "await the exact release, then drop" inside each adapter's `discardReleasedExecution`.
  - I placed the await and result interpretation in `RootTaskAgentResourceScope.discardReleasedExecution`. It reuses the same `settleExactRelease` rule (accepted, or `EXACT_RELEASE_AUTHORITY_UNAVAILABLE` = stopped) that DONE uses, extracted from `releaseTaskAgentResources`.
  - Each adapter's `discardReleasedExecution` is now synchronous and only drops the exact authority and registration.
  - This avoids triplicating the release-settlement policy (Repeated Coordination trigger).
- **AR-002:**
  - The `reopen` command skips the discard when `isOpen(reference)` is already true at the queue head.
  - Backends also keep a live handle or non-terminated run (defense in depth).
  - A deterministic test fails if the guard is removed (mutation-checked).
- **Team-root nested runs:**
  - The exact discard retires only the released task TeamRun itself.
  - Nested TeamRuns under a task Team are helpers, which stay closed, so they are never re-registered by a reactivation.
- **Restore failure after commit:**
  - The entry stays open and the copy is offline; the rejection message says so (accepted per the design and ARCH-REV P-001).
- **Concurrency of two reactivating messages** is safe (tested). Each restored copy is restored exactly once.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: No Design Issue Found (latent gap: no backend discard)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
  - The only extraction is `settleExactRelease`, a private method inside the existing scope owner.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The lifecycle reaches the Task side only through `TaskAgentResourcePort`; `agent-collaboration` still has no `projects/*` import.
  - The facades stay thin.
  - Backends decide nothing about eligibility.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
  - One reopen path for old and new entries.
  - "Closed is forever" wording removed from code comments, agent texts and docs.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
  - Facades no longer wrap the run-ID path in a bare `withLiveLease`.
  - The monotonic-only client closure assumption is replaced.
- Shared structures remain tight: `Yes`
  - The reopened events reuse the closed reference DTOs; the Team payload schema aliases the closed one.
  - `target_kind` is a two-value enum.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`
  - Largest effective (non-empty) line counts: web `teamExecutionViewState.ts` 494, `flat-team-execution-manager.ts` 457, `root-team-run.ts` 455.
  - No single file has a delta above 220 lines.
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence:
  - The strict reader and exact writer are unchanged; only `closedAt: string → null` on one `assigned` entry.
  - One atomic `store.update` under the Task's `serialize`. An already-open entry writes nothing.
  - `task.json` is never written by reactivation.
  - A restart rebuilds the view from the same file (tested).
- Migration implementation: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- In a fresh worktree run, in order: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` (Prisma client) and `pnpm -C autobyteus-web exec nuxt prepare` before the tests.
- Both stream-contract packages track their `dist/`. They were rebuilt (`pnpm -C <pkg> build`) and the rebuilt `dist/` is part of the change.
- `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` are untracked build output from `prebuild`; they are not staged.
- `pnpm -C autobyteus-server-ts typecheck` (tests included) fails with TS6059 rootDir errors on the base too. Source typechecking used `npx tsc -p tsconfig.build.json --noEmit` (clean) and `pnpm -C autobyteus-server-ts build` (passes).

## Local Implementation Checks Run

All are implementation-scoped local checks, not API/E2E sign-off.

**Server source type check:** `npx tsc -p autobyteus-server-ts/tsconfig.build.json --noEmit` → clean. `pnpm -C autobyteus-server-ts build` → pass.

**Server focused suites:**
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-collaboration tests/unit/agent-tools tests/unit/agent-team-execution tests/unit/standalone-agent-run-root tests/unit/agent-org-execution tests/unit/services/agent-streaming tests/unit/agent-communication tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts --no-watch` → 144 files / 1080 tests, all pass (final run).
- New files:
  - `task-agent-resource-reactivation.test.ts`: 6/6
  - `root-task-reactivation.test.ts`: 15/15
  - `task-reactivation-backends.test.ts`: 6/6 (agent, Team and Org)
  - The standalone root facade test: 1 new, 18/18 in the file
- Mutation checks:
  - Removing the AR-002 guard fails its test.
  - Disabling the four backend discards fails all 6 backend tests.
  - Both were restored.

**Full server unit run:** `pnpm -C autobyteus-server-ts exec vitest run tests/unit --no-watch` → 61 failed / 4848 passed.
- 60 of the failures fail identically on the base `cfeda548` (checked in a temporary base worktree with the same install and prebuild).
  - Areas: application-platform, agent-memory, file-explorer, prisma-query-log-policy, workspace-manager and others.
- The 61st, `run-file-change-service.test.ts`, is a timing flake under full-suite load: 3/3 pass alone; unrelated area.

**Integration:**
- `tests/integration/agent-team-execution` + `standalone-agent-run-root` → the same 24 failures as the base (identical list), all other tests pass.
- `task-delegation-tool-lifecycle.integration.test.ts`: 10/10 after updating its `target_kind` expectation.

**Contracts:**
- `pnpm -C autobyteus-team-stream-contracts test` → 8/8.
- `pnpm -C autobyteus-collaboration-stream-contracts test` → 14 pass / 7 fail. The base is 13 pass / 7 fail: the same 7 `schema_version` failures in `root-execution-view-dtos.test.mjs`; the new reopened test passes.

**Web:**
- `pnpm -C autobyteus-web test:nuxt services/teamExecution services/agentCollaboration services/agentOrgExecution services/agentStreaming stores utils/collaboration --run` → 1185 pass / 1 fail.
  - The failure is `workspaceSelectionComposition.spec.ts › publication-only snapshot…`, which fails identically with my web changes stashed.
- `npx vue-tsc --noEmit` → 386 errors; all are pre-existing.
  - With the new contracts but without my web changes there are 393; my web changes resolve the 7 new-event type errors and add none.

## Frontend Rendered-Result Check (When Applicable)

- **Affected surfaces / journeys:** the Workspaces tree rows of delegated copies under Agent, Team and Org roots. They reappear after reactivation. No new UI; the existing rows are reused (REQ-008, UI section of the requirements).
- **References:** requirements REQ-008 / AC-004; design DS-002; the existing closure behavior in `autobyteus-web/docs/agent_teams.md`.
- **Surface used:**
  - The repository's own task-closure browser probe (`autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`, TESTING.md): real built backend, Nuxt dev frontend, fresh headless Chrome and the scripted AGY actor calling the actual MCP tools.
  - I ran a temporary, uncommitted copy that adds one step to the BR-001/002/003 live journeys. After the existing DONE → IN_PROGRESS → "closed rows stay hidden" checks, the Manager (assigner) sends `send_message_to(target_agent_run_id=<closed worker>)`.
  - Command: `node autobyteus-web/tests/e2e/tmp-reactivation-render-probe.mjs --output-dir …/implementation-evidence/ir-001/rendered-reactivation --cases BR-001,BR-002,BR-003` (copy deleted afterwards).
- **States and interactions inspected, per root (Agent, Team, Org):**
  - the worker row reappears live, without reload;
  - the two closed helpers of Task A stay hidden;
  - clicking the reactivated row shows its earlier exchange plus the new message (conversation continuity);
  - the row is still present and the helpers still hidden in a fresh page load;
  - no browser errors;
  - the Manager's tool result reads "Delivered message to X. X was reactivated." with `target_kind` in the `delegate_task` results.
- **Visual or interaction issues found and corrected:** none. The row uses the existing row style and appears in tree order.
- **Evidence:**
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/reactivate-done-task-runs/tickets/in-progress/reactivate-done-task-runs/implementation-evidence/ir-001/rendered-reactivation/` contains `evidence.json` (result Pass; cleanup: browser closed, frontend and backend terminated, data root removed) and `{agent,team,org}-reactivated-{live,conversation,after-reload}.png`.
  - The probe's own pre-existing closure screenshots were pruned.
  - In `evidence.json`, the `reactivation` object is repeated under each case; it is one object for all three roots.
- **Not verified in a browser:**
  - a real backend restart after reactivation (the persisted open entry after restart is unit-tested);
  - the enter animation (rows appear through the existing tree rendering; no new motion was required or added);
  - reduced motion.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001/003: an Agent copy via a Project Task, and an ad hoc Task by `task_id`.
  - Sequence: DONE → IN_PROGRESS / TODO → `send_message_to(run ID)`.
  - Check: the worker answers with knowledge of earlier turns; `task.json` status is exactly what the agent set.
- AC-002: a Team copy via its coordinator run ID; same TeamRun ID and members, with the coordinator receiving the message.
- AC-004: extend `test:e2e:task-closure-tree`. The temporary step above is a ready template; add a real backend restart after reactivation (BR-005 style, with the reactivated run expected visible).
- AC-005..009 and AC-015: the refusal codes and messages listed in `docs/modules/projects.md` › Reactivation (refusal table).
- AC-010: DONE again after reactivation closes, stops and hides it; reopen + message again works.
- AC-011: server restart after DONE, then reopen + message. After restart no released authority exists; the discard finds `EXACT_RELEASE_AUTHORITY_UNAVAILABLE` and the restore builds a fresh handle.
- AC-012: `target_kind` on `delegate_task` for an agent and for a team; the MCP structured output schema requires it.
- AC-013: the exposed tool definitions contain no "for good" wording and describe the reopen-then-message path.
- AC-014: open or offline worker wake, status changes and new delegation are unchanged.
- QR-001: a DONE racing a reactivation; QR-002: other senders.
- `tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` (live runtimes): its spawn-result key pins were updated for `target_kind` but not run here (needs live runtimes).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The API/E2E acceptance set AC-001..AC-015 with real runtimes, for standalone, Team and Org roots, including restart (AC-011) and a browser restart journey for AC-004.
- `tests/e2e/projects/*` (gated scripted-AGY suites) and `test:e2e:task-closure-tree` were not run here as acceptance. Only the temporary rendered self-check above was run.
- Follow-up outside this repository (not done here): the agent repository's `project-task-management` skill text about DONE.
