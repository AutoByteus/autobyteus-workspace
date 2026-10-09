# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large/High) and passed (ARCH-REV-003, round 3). Handoff rule: "implementation is complete and the carried classification is task_size=Large or architectural_risk=High … ready for independent source review" → `/software_engineering_team/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/requirements-doc.md` (Approved, SR-003; REQ-001..014, AC-001..018)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/solution-revision-record.md` (SR-001..SR-006)
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/design-spec.md` (SR-006, Ready)
- Supplemental task artifacts: None. Product design: N/A — not applicable.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/design-review-report.md` (Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/architecture-review-revision-record.md` (ARCH-REV-001..003)
- Architecture handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/handoff-architecture-design-complete.md`
- Triggering rework report, revision record, or evidence: N/A (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Rework` (latest: IR-002, Local Fix for CR-001)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-003` (requirements), `SR-006` (design)
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `CRR-001` (Pass), `CRR-002` (failure-origin, CR-001 Local Fix)
- Related API/E2E revision IDs: `API-REV-001` (F-001)
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CR-001 (F-001 / EXC-E2E-006); see IR-002

Repositories and commits:
- Server (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy`, branch `codex/delegate-to-existing-copy`). The branch was fast-forwarded from the stated base `048ea6cec` to current `origin/personal` `742a0df97` before any change (the 42 upstream commits touch only AGY input and test-baseline fixes; no overlap with this change). Commits on top:
  - `c395e24a5` S1 pure rename (no behavior change; suite green on its own)
  - `1e5d757a9` S2–S6 feature + tests + existing E2E/integration contract updates
  - `1e676ca54` S7 docs (`projects.md` and module docs, `TESTING.md`)
  - `24056ffdd` baseline timing fix (TESTING.md rule 9): explicit timeouts for two load-sensitive tests that also run at ~4 s on the base (see Known Risks)
  - `1aa02f256` integration/E2E assertions aligned with the explicit result and new texts
  - `88e59f500` IR-002 / CR-001: a copy whose start failed is refused as never started
  - ticket artifact commits: these ticket artifacts (`implementation-handoff.md`, `implementation-revision-record.md`) with the solution package
- Agents repo (cross-repo S7): worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-agents-delegate-to-existing-copy`, branch `codex/delegate-to-existing-copy` from `origin/main` `fd2b99e`, commit `0bd84e0` (PTM skill + board template). Not pushed; it must ship with the server change. The main checkout `~/autobyteus_org/autobyteus-agents` has unrelated uncommitted user changes and was not touched.

What was built (design S1–S8):
- **S1** rename of the Task "agent run resource" vocabulary to "task execution resources" (types, fields `execution` / `teamCoordinatorAgentRunId` / `executionResources`, methods `linkNewTaskExecution` / `openTaskExecutions` / `closedTaskExecutionsIn` / `releaseTaskExecutions`, files); persisted names unchanged and mapped only in `task-execution-resource-schema.ts`; `agentRunKey` removed.
- **S2** `TaskExecutionResourceService` owns the current-entry rule: `entriesByExecution` (per copy, per Task, the copy's last entry in that file), derived `currentByExecution` (open entry, else latest `linkedAt`, tie → greater Task ID; two open → latest + `console.error`), closed-per-root index from current entries only, `ownerOf` innermost-wins (cross-Task throw removed), `releasableByHostRoot` (current, closed, deduped per copy), `historyOf`, `earlierTaskLocationsOf`, `serializeCopyInTask` (copy key → Task ID). Single-owner `owners` map, link-time single-owner rejection by map and swap conflict log removed.
- **S3** domain `latestEntryOf` (every in-file lookup acts on the copy's last entry: settle, reopen/assertReopenable, inherited creator check), `linkExistingTaskExecution` (append; precondition: copy's entries in the file all closed), `assertTaskExecutionAssignable` (items 3–6), `notCurrentTaskMessage` (AC-010 hint), `openAssignments` / `closedAssignments` explicit-ID views; schema per-file rule relaxed to "a copy has at most one open entry, and only its last entry may be open"; `ProjectTaskService.assertAssignable` / `assignExistingTaskExecution` (items 1–6, re-checked under copy → Task locks), reopen under the same lock order, reopen refusal names the copy's current Task when an earlier Task was reopened.
- **S4** adapter `taskExecutionTargetOf` (3 adapters; exact reference kind — see Known Risks / finding below); `existing-copy-target.ts` (lookup + specific AC-008 refusals via the other reference kind, `taskExecutionWithIngress` and the member chain); lifecycle `assignToExistingCopy` + private shared `prepareClosedCopyForResume` (reactivation uses it too); internal `TaskDelegationOutcome` / `DelegatedCopy`; `buildTaskWorkText` shared by the seed packet and `buildExistingCopyTaskMessage`; `ensureTaskHelper` returns `TaskExecutionTarget`.
- **S5** capability `delegateToNewCopy` / `assignToExistingCopy`; Team / Org / standalone roots split their command and pass their own `deliverToRunId` (via `buildTaskWorkMessageInput`, `messageType: "task_assignment"`); `teamCoordinatorOf` on each root; `ActiveCollaborationRootDirectory.findTeamCoordinator`; router `TARGET_IS_TEAM_RUN` refusal before the live-only path.
- **S6** tool parser (three strict modes), parameter schema (`recipient_address` optional, `target_team_run_id`, `target_agent_run_id`), strict result union (`delegated`, `target_kind`, explicit IDs), serializer `toDelegateTaskResult`; `list_project_tasks` `assignments` + `closedAssignments`; all agent-facing texts (`delegate_task`, `send_message_to`, `list_project_tasks`, `create_or_update_task`, `list_available_agents`, collaboration prompt, standalone instruction).
- **S7** docs (`projects.md` incl. new "Follow-up Task to an existing copy" and "Current Task of a copy", `agent_team_execution.md`, `agent_tools.md`, `agent_tools_mcp_server.md`, `agent_communication.md`, `codex_integration.md`, `prompt_engineering.md`, `TESTING.md`); PTM skill + board template (agents repo).
- **S8** tests (see Local Implementation Checks).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec → "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation touched exactly the predicted areas (Task side, root-neutral lifecycle, all three roots, two agent tool contracts with a clean break, texts, docs, cross-repo skill, ~60-file rename) and changed the one-Task-per-copy invariant, DONE release semantics and cross-Task locking.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No persisted-shape change or migration was needed; sub-work copies stay inside the containment chain (innermost-owner rule holds, tested with real adapters); every root kind delivers to a woken copy through its exact delivery (tested per root).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Explicit-ID results; failure has no IDs | `task-delegation-command.ts` (`TaskDelegationOutcome`, `DelegatedCopy`, `delegatedCopyOf`), `root-task-dispatch.ts`, `task-delegation-target.ts`, `agent-tools/task-delegation/task-delegation-tool-serialization.ts` (`toDelegateTaskResult`), `agent-team-execution/task-delegation/task-delegation-result-contract.ts` | Implemented; Team result has no `target_agent_run_id` (DEC-008) |
| BEH-002 | `delegate_task(target_*_run_id, task_id)` assigns an existing copy, wakes it, delivers B's work | parser → `MemberTaskCommandCapability.assignToExistingCopy` → root `assignToExistingCopy` (Team `root-team-run.ts`; Org/standalone delivery services) → `RootTaskExecutionLifecycle.assignToExistingCopy` → `resolveExistingCopy` → `resolveAssignment` + `assertAssignable` → queue `prepareClosedCopyForResume` → `assignExistingTaskExecution` → `publishTaskExecutionsReopened` → root `deliverToRunId` → `markStarted` | Implemented in all 3 roots |
| BEH-003 | One current Task per copy; refusals per REQ-005; A → B → A allowed | `task-execution-resource-service.ts` (current entry), `task-execution-resources.ts` (`assertTaskExecutionAssignable`, `linkExistingTaskExecution`, last-entry lookups), `project-task-service.ts`, schema relaxed rule | Implemented; existing files load unchanged |
| BEH-004 | DONE/CANCELLED never stops or hides a moved copy | `ProjectTaskService.closeAndWrite` → `releasableByHostRoot`; root `isClosed` re-check via current owner; `closedTaskExecutionsIn` from current entries | Implemented; repeated DONE of A tested Task-side and runtime-side |
| BEH-005 | `send_message_to` agent-only; team run ID refused naming coordinator | `global-agent-run-message-router.ts` → `ActiveCollaborationRootDirectory.findTeamCoordinator` → root `teamCoordinatorOf` → lifecycle → adapter | Implemented for same-root and cross-root senders; inactive roots keep not-active refusal |
| BEH-006 | Explicit assignment views + `closedAssignments` | `openAssignments` / `closedAssignments` (domain), `TaskExecutionResourceService.assignments`, `ProjectTaskService.assignments`, `project-task-tool-manifest.ts` | Implemented; `assignedBy` kept |
| BEH-007 | Worker description-only delegation is sub-work (text only) | `agent-team-collaboration-llm-contract.ts` (`DELEGATE_TASK_LLM_DESCRIPTION`, collaboration prompt) | Text only per DEC-006 |
| BEH-008 | B's root is the reused copy (live); A stays DONE with copy closed; copy reappears | Existing `task-root-view-builder.ts` (latest `assigned` entry), commit listener → change feed, `publishTaskExecutionsReopened`, closed index from current entries | Implemented (unit: root view of A/B, reopened event, closed list per root, restart) |
| BEH-009 | Texts and code names reflect reality | S1 rename + S6 texts + docs + PTM skill | Implemented; error-code strings `TASK_AGENT_RESOURCE_*` kept as opaque codes (design) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):
- Task side: `projects/domain/task-execution-resources.ts`, `projects/services/task-execution-resource-service.ts`, `projects/services/project-task-service.ts`, `projects/stores/task-execution-resource-{schema,store}.ts`, `projects/runtime/task-execution-resource-release.ts`, `projects/services/task-root-view-builder.ts`
- Runtime: `agent-collaboration/execution/task/{root-task-execution-lifecycle,existing-copy-target,task-delegation-command,task-execution-input,task-execution-resource-port,root-task-execution-resource-scope,root-task-dispatch,root-task-execution-adapter,member-task-command-capability,task-delegation-target}.ts`
- Adapters: `agent-team-execution/task-delegation/team-task-execution-adapter.ts`, `agent-org-execution/services/agent-org-task-execution-adapter.ts`, `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts`
- Roots/capability: `agent-team-execution/domain/root-team-run.ts`, `agent-team-execution/task-delegation/team-task-execution-service.ts`, `agent-team-execution/services/team-root-materializer.ts`, `agent-org-execution/domain/agent-org-run.ts`, `agent-org-execution/services/{agent-org-run-message-delivery,agent-org-execution-scope-builder}.ts`, `standalone-agent-run-root/domain/standalone-agent-run-root.ts`, `standalone-agent-run-root/services/{standalone-root-message-delivery,standalone-root-builder,standalone-host-member-context-builder}.ts`, `agent-collaboration/collaborators/task-scoped-message-recipient.ts`
- Messaging: `agent-communication/services/global-agent-run-message-router.ts`, `agent-collaboration/execution/services/active-collaboration-root-directory.ts`
- Tool layer/texts: `agent-tools/task-delegation/*`, `agent-tools/project-tasks/{project-task-tool-contract,project-task-tool-manifest}.ts`, `agent-tools/agent-discovery/list-available-agents-contract.ts`, `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`, `agent-execution/prompt/standalone-collaboration-instruction.ts`
- Composition: `compositions/project-task-execution-resource-composition.ts` (renamed)

Agents repo: `agents/project-task-manager/skills/project-task-management/SKILL.md`, `templates/board-template.md`.

## Important Assumptions

- ASM-001 (copy hosted by the delegator's root) holds: lookup is per root; a copy of another root is refused as "not a delegated copy in this run".
- ASM-002: the copy receives B as a new inter-agent message (`task_assignment`) in its existing conversation through the root's exact delivery. The message leads with `New Task assigned to you: <taskId>. Your previous Task is closed; this is the work to do now.`, then the same delegator lines and description as the seed packet; context files travel as the message's reference files (rendered by the communication builder), not repeated in the text.
- Existing-copy `task_id` follows the existing `resolveAssignment` rule: Project Tasks only (an ad-hoc Task ID is `TASK_NOT_FOUND`, as for address delegation by `task_id`).
- A Task-owned sender is refused (`TASK_AGENT_RESOURCE_OWNED_SENDER`) for existing-copy assignment too, consistent with the preserved worker `task_id` ban; it could never be a copy's assigner anyway.

## Known Risks

- **CR-001 (IR-002, fixed):** a copy whose start failed never reaches the root's tree; the lookup miss now asks the Task side about a closed copy this root hosts (`closedTaskExecutionsIn`) and returns its specific refusal (never started, another assigner, already this Task). Residual: while that copy's Task is still open, the existing port cannot show its host root, so it gets the generic refusal until the Task is DONE or CANCELLED (which a reassignment requires anyway).
- **Implementation finding (fixed in scope):** the three root indexes key task executions by run ID alone (`getTaskExecution` ignores the reference kind), so a team run ID passed as `target_agent_run_id` initially resolved to the Team copy. `taskExecutionTargetOf` now also requires the found copy's reference to equal the requested one (all three adapters); covered by the real-adapter tests. Reviewers may want to confirm no other new caller relies on kind-agnostic lookup.
- Release window (MP-003 / R-1): unchanged profile — depends on each adapter's `releaseOwnedExecution` capturing its authority at invocation. Runtime tests cover DONE(A) before the assignment, between the queue step and the commit, and after the commit; Task-side tests run both orders of DONE(A) vs assign(B).
- A refusal at the commit after the queue step (e.g. a concurrent DONE of B or a concurrent assignment) leaves the copy's released authority dropped. This is harmless (the copy is closed and restore builds a fresh authority) and matches reactivation's profile.
- Downgrade after a copy was reused is unsupported (older build marks a file with two entries for one copy as damaged); documented in `projects.md`.
- Agents mid-conversation that learned the old Team result shape (DEC-008 clean break); the PTM skill update must ship with the server change.
- Baseline timing (fixed, own commit `24056ffdd`): `tests/unit/services/agent-streaming/agent-stream-handler-system-instruction-debug.test.ts` (cold import of the agent-streaming graph after `resetModules`, ~3.7–4.2 s on an untouched base worktree, same as this branch when warm) and `tests/architecture/application-framework-boundaries.test.ts` "keeps required tool registration …" (source-tree scan, 1.4 s alone) exceeded the 5 s default under full-suite load. Each now has an explicit 30 s timeout with a comment. Not caused by this change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (feature + approved naming refactor)
- Reviewed root-cause classification: Boundary Or Ownership Issue (single-owner invariant) + Shared Structure Looseness (names)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: current-entry rule lives only in `TaskExecutionResourceService` (callers use port answers: `ownerOf`, `isOpen`, `locationOf`, `historyOf`); the lifecycle never reads Task files; the reactivation queue step is one shared private method; tool shapes stay at the tool edge.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` (old `owners` map, swap conflict log, cross-Task `ownerOf` throw, `agentRunKey`, `closedByHostRoot`, `currentAssignments`, `TaskAssignment`, tool-level `DelegateTaskResult` as internal type, `{target_agent_run_id: null}` failure shape, root/capability `delegateTask`, "always spawns" texts)
- Shared structures remain tight: `Yes` (`DelegatedCopy` agent/team variants; assignment views agent/team variants; no optional-field bag)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest changed: `project-task-service.ts` 489 non-empty lines (<500), `root-team-run.ts` 472, `root-task-execution-lifecycle.ts` 393. `task-execution-resource-service.ts` is a design-directed rewrite (>220 changed lines, 326 non-empty lines) of the one owner of the current-entry rule (DS-004); splitting it would spread that rule, so it was kept whole.
- Notes: error-code strings `TASK_AGENT_RESOURCE_*` and some log tags are intentionally unchanged (opaque contract strings, per design).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration`
- Design-spec decision reference: design-spec → "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence: the schema maps persisted `agentRunResources` / `agentRun` / `coordinatorAgentRunId` ↔ in-memory names and writes byte-identical JSON for identical content (existing exact-file tests pass unchanged); the relaxed per-file rule accepts every existing file (each copy once) and rejects two open entries or an open non-last entry (unit-tested); restart tests reload multi-period files with the same current entry.
- Migration implementation and focused checks: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` were run in the worktree. Untracked build output `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` comes from prebuild and is not staged.
- A local, untracked `autobyteus-server-ts/tsconfig.local-tests.json` (added to `.git/info/exclude`) typechecks `src` + `tests` with the build options; it was used to diff test type errors against the baseline (1291 pre-existing test type errors; none added by this change).

## Local Implementation Checks Run

All on the worktree at the final commit unless noted:
- `npx tsc -p tsconfig.build.json --noEmit` (server src): 0 errors.
- Test typecheck diff vs baseline (`tsconfig.local-tests.json`): no file with more errors than before (renamed files compared with their old names).
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit tests/architecture --no-watch`: 670 passed, 2 failed (the two load-timeouts above), 4 skipped on the final source; both pass alone and after the baseline timing fix. Earlier full runs: 671–672 passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts tests/integration/standalone-agent-run-root/native-root-termination.integration.test.ts --no-watch`: 2 files passed (after updating 3 contract assertions).
- `pnpm -C autobyteus-server-ts build` (clean, tsc, assets, built-in agents bootstrap smoke): exit 0.
- New/changed focused suites (all passing):
  - Task side: `tests/unit/projects/task-execution-existing-copy-assignment.test.ts` (append + restart, DONE/CANCELLED of A never stopping the moved copy, refusals incl. busy-with-status, unknown/terminal/already-B/never-started/sub-work, damaged data, A → B → A with history kept and last-entry settle, AC-010 hint, QR-001 both orders), `tests/unit/projects/task-execution-current-entry.test.ts` (innermost owner with closed sub-work in a reused Team, latest/tie rule, two-open logging, everStarted across files), schema relaxed-rule cases in `task-execution-resources.test.ts`.
  - Runtime: `tests/unit/agent-collaboration/root-task-existing-copy-assignment.test.ts` (Agent and Team success sequencing, every AC-008 refusal, REQ-005 refusals, owned sender, conversation unavailable, stop pending + retry, post-commit delivery failure, A → B → A, QR-001: DONE before checks, release between queue step and commit, release after commit, assignment before closure), `task-reactivation-backends.test.ts` (actual registries, all three root kinds: Team copy by team run ID restored as a new TeamRun with coordinator delivery and DONE of A not stopping it; Agent copy; wrong-kind IDs and coordinator refusals with real adapters).
  - Roots: one existing-copy case each in the Team (`team-root-agent-initiated-collaborators.test.ts`), Org (`agent-org-agent-initiated-collaborators.test.ts`) and standalone (`standalone-agent-run-root.test.ts`) root suites (real exact delivery, `task_assignment` message persisted, reopened event, `teamCoordinatorOf`).
  - Messaging: `global-agent-run-message-router.test.ts` (AC-012 same-root and cross-root sender, coordinator delivery unchanged, inactive team run → not active).
  - Tool/contract: parser modes, parameter schema, strict result union (MCP `anyOf` with 3 branches, AJV), router serialization, LLM contract texts (AC-015) with re-pinned hashes, prompt doc block synced.
- Smoke runs of existing E2E suites whose assertions changed (implementation self-checks, not API/E2E sign-off), with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` and the three package-root env vars unset:
  - `tests/e2e/projects/project-task-boundaries.e2e.test.ts` + `task-reactivation-root-visibility.e2e.test.ts`: 17 passed, 1 skipped (real-model case). The first run found two stale text assertions (`create_or_update_task` DONE wording, Team-member reactivation hint); updated, then all passed.
  - `tests/e2e/projects/{project-change-feed,ad-hoc-task-delegation,delegated-team-lazy-member-activation,task-copy-idle-lifetime}.e2e.test.ts`: 13 passed, 1 skipped (real-model case).
  - Not run: live-model suites `tests/e2e/runtime/{mixed-task-delegation,agent-initiated-collaborators,standalone-agent-collaborator-mention}.e2e.test.ts` (assertions updated mechanically).

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: no frontend change. The web app has no consumer of `delegate_task` / `list_project_tasks` results (investigation); board/run-tree visibility uses existing views and events, verified at the server boundary in unit tests.

## Downstream Coverage Hints / Suggested Scenarios

- AC-002 / AC-003 / AC-011 with the real runtime (scripted AGY), Team root mandatory, ideally all three roots: delegate Task A to a Team (and an Agent) by `task_id`, DONE A, `delegate_task({target_team_run_id, task_id: B})`, then check: the coordinator answers B with knowledge of the earlier conversation (Claude case if available), B's board root is the copy with live status, the copy is back in the run tree, and A stays DONE. Repeat across a server restart after A DONE and after B's assignment.
- AC-004 / AC-005: DONE and CANCELLED of A (repeated) while the copy works on B → no stop frame for the copy, no process exit; DONE of B → closed + stopped.
- AC-006..009 refusals over MCP: verify `{delegated: false, message}` texts and that the Task files are byte-identical before and after.
- AC-010 + AC-018: B DONE → reopen A → message the coordinator → refused with the hint; then `delegate_task({target_team_run_id, task_id: A})` → accepted; A's file has two entries (earlier period kept).
- AC-012: `send_message_to(target_agent_run_id=<team run ID>)` from a same-root sender and from another root's agent.
- AC-013: `list_project_tasks` with an open Team assignment, an open Agent assignment, a DONE Task (`closedAssignments`), and a damaged Task.
- QR-001 at the wire: parallel `create_or_update_task(A, DONE)` + `delegate_task(target_*, B)` in one turn, both orders.
- PTM skill (agents repo branch) with the new tool texts: follow-up flow end to end.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All AC-level API/E2E scenarios above (AC-002..005, 010..013, 018, QR-001) with the real runtime; none is claimed here.
- Existing gated E2E suites whose `delegate_task` result assertions were updated mechanically for DEC-008 (only Team-result reads, failure checks, exact-key assertions and changed hint texts): `tests/e2e/projects/{task-copy-idle-lifetime,delegated-team-lazy-member-activation,project-change-feed,ad-hoc-task-delegation,task-reactivation-root-visibility,project-task-boundaries}.e2e.test.ts`, `tests/e2e/runtime/{mixed-task-delegation,agent-initiated-collaborators,standalone-agent-collaborator-mention}.e2e.test.ts`. The scripted-AGY ones passed as smoke runs (Local Implementation Checks); the live-model ones were not run. API/E2E owns their validation.
- Browser probes (`test:e2e:task-closure-tree`, `test:e2e:project-manager-ux`) for board/run-tree visibility of a reused copy (REQ-008) were not run.
