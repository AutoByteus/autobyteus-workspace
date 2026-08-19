# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: User-approved requirement reset incorporated; SR-003 solution rework in progress after API/E2E reroute
- Investigation Goal: Explain the active-root/offline-member state, reproduce pending-approval Stop, and preserve the original strict Stop-then-later-Delete workflow.
- Scope Classification: `Medium`
- Scope Classification Rationale: The row workflow stays simple, but reliable Stop crosses root admission, materialization stabilization, pending-turn interruption, recursive termination, identity ownership, and retry.
- Scope Summary: Whole-AgentTeam Stop and later inactive history deletion only. No active Delete, combined stop-delete, or member deletion.
- Primary Questions Resolved:
  - Root activity and member status are distinct; all members may be offline while the root remains active/resumable.
  - The original/released workflow is active Stop only, then inactive Archive/Delete.
  - Stop while a member awaits tool approval is defective because it waits before interrupting the pending turn and may release root ownership too early.
  - The committed backend lifecycle/catalog corrections remain appropriate.
  - The ticket WIP's active-row Delete, combined confirmation, and stop-then-delete composable are not approved and must be removed.
  - Stop must retain history; a later independent inactive Delete owns permanent disposal.

## Request Context

The user supplied a desktop screenshot showing the Classroom Simulation Team expanded into multiple similarly titled runs. The focused `/professor` member shows `Offline`; no delete button is apparent. The ticket was first investigated from the universal-task-delegation integration branch. After that work was finalized and promoted, the user explicitly requested deleting the old ticket worktree and re-bootstrapping this ticket from current `origin/personal`.

During API/E2E, the active row exposed two independent controls because IR-001 implemented the earlier active-delete interpretation. The API/E2E engineer clicked the extra active Delete—not Stop—and observed the combined confirmation. The user then explicitly reset the requirement: the original two-step workflow is authoritative; Stop never deletes, and active Delete must be removed.

## Environment Discovery / Bootstrap Context

- Project Type: `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action/tickets/in-progress/team-run-offline-delete-action`
- Current Branch: `codex/team-run-offline-delete-action`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-offline-delete-action`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on 2026-08-19; the recreated branch was then fast-forwarded after the tracked remote advanced. Current refreshed base commit is `0194fb4fffa69037a46aeace491024fdf816dde7`.
- Task Branch: `codex/team-run-offline-delete-action`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Re-bootstrap Result: the old worktree and old task branch at `eb79671448e7a2485f30476155e9f7cb6ea363ff` were removed at the user's request. The same canonical path and task-branch name were recreated from refreshed `origin/personal`; all four ticket artifacts were checksum-preserved across replacement. When `origin/personal` advanced by one delivery-record commit, the ticket branch was fast-forwarded to `0194fb4fffa69037a46aeace491024fdf816dde7`; relevant source files had no delta.
- Notes For Downstream Agents: Never delete or mutate either reported production TeamRun. Use the evidence below and isolated temporary fixtures for destructive validation. The single user-approved live reproduction fixture was deleted after capture.

## Supplemental Task Artifact Inventory

| Artifact | Purpose | Status |
| --- | --- | --- |
| `ui-ux-spec.md` | Specifies mutually exclusive active Stop / inactive Archive-Delete, separate confirmation, accessibility, and failure recovery. | Refined; user-approved reset 2026-08-19 |
| `runtime-reproduction-evidence.md` | Records exact pending-approval Stop failure, source-correlated cause, clean restore control, and fixture cleanup. | Complete; evidence only; approval N/A |
| `design-use-case-validation.md` | Self-validates each reset case through target data-flow spines and lifecycle invariants. | Refined; design evidence only; approval N/A |

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-18 | Other | User request and `ctx_26850298b17c__image.png` | Establish symptom | Three same-summary TeamRuns show parent activity dots/small square actions; selected member says `Offline`; no trash action is visible. | No |
| 2026-08-18 | Command | `git fetch origin codex/agent-team-universal-task-delegation`; dedicated `git worktree add` | Original isolated ticket workspace | Original branch was created from `eb79671448e7a2485f30476155e9f7cb6ea363ff`; this bootstrap was later superseded at the user's request. | No |
| 2026-08-19 | Command | `git fetch origin personal`; checksum backup; `git worktree remove --force`; branch replacement; `git worktree add -b codex/team-run-offline-delete-action ... origin/personal` | Re-bootstrap after integration promotion | Old worktree/branch removed; current worktree recreated from `eb9fc2287a2650ddb73ae0a4b41c60e34040e965`, tracking `origin/personal`; artifact checksums matched before/after. | No |
| 2026-08-19 | Command | `git merge --ff-only origin/personal` | Keep the just-recreated ticket branch on the latest tracked base after a concurrent delivery-record advance | Branch fast-forwarded to `0194fb4fffa69037a46aeace491024fdf816dde7`; ticket artifacts remained unmodified and relevant runtime/history source had no delta. | No |
| 2026-08-18 | Code | `WorkspaceHistoryWorkspaceSection.vue`; `useWorkspaceHistoryTreeState.ts`; `useWorkspaceHistoryMutations.ts` | Trace render and mutation gates | Active TeamRun renders stop; inactive `READY` renders archive/trash. `canTerminateTeam` is exactly `isActive`; delete composable repeats the same active guard. | Yes—correct in design |
| 2026-08-18 | Code | `team-run-history-service.ts`; `team-run-live-projection-service.ts`; `agent-team-run-manager.ts` | Find lifecycle authority | Root active is manager registration/`RootTeamRun.isActive`; configured member statuses are separate snapshots and may default to offline. | No |
| 2026-08-18 | Code | `mixed-team-manager.ts`; `mixed-agent-member-handle.ts`; `root-team-run.ts` | Explain active+offline | A root can remain active with no materialized member AgentRun. New exact member input calls `ensureReady()` and lazily creates/restores the configured member. | No |
| 2026-08-18 | Code | `team-run-history-catalog-service.ts`; GraphQL `deleteStoredTeamRun` | Verify deletion safety/ownership | Catalog rejects active root, then removes exact index row and exact TeamRun directory when inactive. | Yes—compose termination above catalog |
| 2026-08-18 | Read-only runtime | GraphQL `listWorkspaceRunHistory` on `127.0.0.1:29695` | Match screenshot to exact data | Three distinct IDs initially reported root active. Two reported all configured members offline. Duplicate summaries are presentation only. | No |
| 2026-08-18 | Read-only runtime | GraphQL `getTeamRunExecutionCheckpoint` for exact recent IDs | Determine work state | The two all-offline roots returned `hasOpenExecutionWork: false`, `changeSequence: 1`: active and quiescent, not terminated. | No |
| 2026-08-19 | Read-only production log | Exact-ID search in `/Users/normy/.autobyteus/server-data/logs/server.log` | Determine the concrete transition into active-root/all-members-offline | Both affected roots accepted Team WebSocket sessions, but focused-professor activation later failed with `TeamAgentActivationError: The prior native conversation context could not be restored.` The sessions closed while the root remained registered. | No for delete scope; restoration failure itself is separate |
| 2026-08-18 | Read-only runtime | Later `listWorkspaceRunHistory` observation | Observe two-step transition without performing it | Newest root was inactive with `terminatedAt: 2026-08-18T20:24:51.266Z`; the other two remained active/quiescent. | No |
| 2026-08-18 | Git | Earlier merge-base source and `git diff` | Determine regression origin | The earlier personal merge base already had stop-for-active/delete-for-inactive UI. The universal lifecycle exposes the ambiguous state; duplicate identity lookup was not introduced. | No |
| 2026-08-19 | Git / Code | Relevant-source diff from old base `eb796714...` to promoted personal `eb9fc2287...`, followed by current-source gate search | Revalidate investigation after re-bootstrap | No delta exists in the relevant component, mutation, history service/catalog, or TeamRun-manager files; current personal still suppresses active delete and the catalog still rejects active-package deletion. Prior root-cause evidence remains applicable. | No |
| 2026-08-19 | User-approved isolated runtime | Public GraphQL create/terminate/restore/delete plus Team/Agent WebSocket commands against `127.0.0.1:29695`; exact fixture `classroom_simulation_team_4c3801479a874b13ad3cf91b67bba633` | Reproduce the user's `autoExecuteTools=false -> approval pending -> shutdown` sequence and distinguish it from normal lazy offline state | Approval pending was reached with open work. Termination stopped advertising active but did not return within 60 seconds; explicit denial solely for cleanup let it finish. Clean restore projected active root + both offline, then new input activated professor and completed. Fixture was terminated/deleted. | Yes—termination design must settle pending approval and preserve one in-flight root identity |
| 2026-08-19 | Code | `RootTeamRun.terminate/runTermination`; `MixedTeamManager.prepareTermination`; `MixedAgentMemberHandle.prepareTermination`; `AgentRun.prepareTermination`; `AgentTeamRunManager.getTeamRun/terminateTeamRun` | Correlate runtime hang to lifecycle ownership | Root closes admission and enters `terminating`; member termination waits for AgentRun input quiescence without interrupting the pending approval turn. Manager lookup unregisters any root whose `isActive()` is false, including the still-terminating root. | Yes—reuse AgentRun interrupt before quiescence and retain manager ownership until terminal completion |
| 2026-08-19 | Code | `TeamRun`, `TeamRunBackend`, `MixedTeamManager`, configured/task Agent and Team registries/handles, `TeamRunResolver`, `TaskDelegationService.shutdownAndSettle` | Trace every configured/delegated/nested shutdown owner | The mixed backend already owns the full materialized descendant set, but root shutdown reaches task settlement/member termination without a prior whole-tree interruption phase. Both root and nested resolvers remove non-active runs on read, so ownership and admission are conflated at two levels. | Yes—add bounded root-shutdown interruption/quiescence phases and retain nonterminal execution ownership until accepted termination |
| 2026-08-19 | Code | `TeamRunService`, GraphQL termination/history resolvers, `agentTeamRunStore`, `useWorkspaceHistoryMutations`, `runHistoryMutationActions`, Team history row/modal | Earlier active-delete design investigation (superseded by later user reset) | The two operations already had distinct owners; the earlier solution incorrectly chose to compose them after one confirmation. The later reset preserves their separation. | Superseded—remove composition; preserve both boundaries |
| 2026-08-19 | Command | `git fetch origin personal`; `git rev-list --left-right --count HEAD...origin/personal`; `git status --short --branch` | Revalidate dedicated workspace immediately before design | Ticket worktree remains dedicated, branch and `origin/personal` are `0/0` at `0194fb4fffa69037a46aeace491024fdf816dde7`; only ticket artifacts are untracked. | No |
| 2026-08-19 | User approval | Conversation approval after exact shutdown sequence confirmation | Lock requirements basis for design | User confirmed: close admission; interrupt/cancel pending approvals; wait settlement; fully stop every individual/delegated/nested execution; only then stop/unregister root and expose delete-ready UI. User instructed solution design to proceed using design principles. | No |
| 2026-08-19 | Architecture review | `design-review-report.md` (`ARCH-REV-001`, `AR-001`–`AR-003`) and `architecture-review-revision-record.md` | Validate SR-001 against approved partial-failure and lifecycle concurrency contracts | Overall direction passed, but current catalog order removes the durable row before package deletion, the managed-root check does not exclude concurrent restore through deletion, and existing drains do not join already-admitted asynchronous member/task preparation. | Yes—SR-002 bounded design correction |
| 2026-08-19 | Code | `TeamRunHistoryCatalogService.deleteTeamRun`, `TeamRunHistoryService.listTeamRunHistory`, `TeamRunV1PackageCatalog`, `TeamRunService.restoreTeamRun`, `AgentTeamRunManager.createTeamRun/restoreTeamRun` | Independently validate AR-001/AR-002 and locate the narrow owners | Catalog currently flushes row removal and publishes in-memory removal before `fs.rm`; history requires both row and execution tree; restore registers through the manager before catalog restoration recording. One-time pre-queue lookup therefore cannot protect the package. | Yes—catalog compensation plus one manager-owned exact-ID transition lane |
| 2026-08-19 | Code | `RootTeamRun.executeAgentCommand`/Team delivery/task methods; `TaskDelegationService.delegateTask`; mixed configured/task registries; task command queue | Independently validate AR-003 and identify the stabilization boundary | Team message and delegation can pass root admission, then await configured-member or task preparation before the existing task/persistence queues. Delegation preparation can create prepared Agent/Team objects and registration reservations before queue submission. Existing drains alone do not freeze the traversal set. | Yes—root admitted-operation gate plus frozen exact termination scope |
| 2026-08-18 | Tests | `WorkspaceAgentRunsTreePanel.spec.ts`; `runHistoryStore.spec.ts` | Inventory coverage | Base tests assert inactive TeamRun Delete and active Stop separately but do not cover active root + offline members, pending-approval completion, or the complete post-stop action transition. | Yes—strict transition coverage required |

| 2026-08-19 | API/E2E reroute | `api-e2e-coverage-investigation.md` plus incoming `/api_e2e_engineer` report | Distinguish Stop behavior from WIP active Delete | Isolated browser row had independent Stop and Delete. API/E2E invoked Delete; Stop was not observed opening the modal. Execution paused because user rejected the added active-delete workflow. | Yes—requirement/design reset |
| 2026-08-19 | Git / source comparison | `git show origin/personal:...WorkspaceHistoryWorkspaceSection.vue`; `git diff origin/personal..HEAD -- ...WorkspaceHistoryWorkspaceSection.vue ...useWorkspaceHistoryMutations.ts` | Verify original workflow and locate WIP divergence | Base uses `Stop` while active and Delete only while inactive; WIP changed Delete guard to all `READY`, added `wasActive`, combined confirmation, and stop-then-delete sequence. | Yes—remove only WIP UI divergence |
| 2026-08-19 | User clarification | Conversation after API/E2E pause | Resolve option A vs B | User explicitly selected B: keep original strict workflow; Stop retains history and only after full stop does a separate Delete appear. | No—approved authority |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | Persisted TeamRun row | history projection -> TeamTreeNode -> row actions | Released base: active Stop only; inactive `READY` Archive/Delete. WIP incorrectly adds active Delete. | Base/WIP source diff; API/E2E observation |
| `BEH-002` | User/System | User clicks active Stop | row -> composable -> Team store -> GraphQL -> TeamRunService -> manager/root -> descendants -> terminal stamp -> client cleanup | Stop is intended to retain history; current base can hang at approval before terminal completion. | Runtime reproduction and source trace |
| `BEH-003` | User/System | User clicks inactive Delete | inactive row -> confirmation -> history store -> GraphQL -> history service/catalog -> exact package/index -> exact client cleanup | Separate destructive decision, inactive only; never restores or terminates. | Base source trace |
| `BEH-004` | System | New input to active root with offline member | Team stream -> RootTeamRun -> TeamRun -> member handle -> `ensureReady()` | Offline member may lazily activate/restore; root resumability remains supported. | Runtime control and source trace |
| `BEH-005` | Contract | Same-summary exact Stop/Delete; restore concurrent with inactive Delete | exact `teamRunId` through UI/runtime/catalog and manager transition lane | Summary/member identity never selects the operation; manager-owned package cannot be deleted. | Source trace and SR-002 review evidence |
| `BEH-006` | User/System | Stop while approval/admitted materialization exists | root gate -> frozen exact scope -> AgentRun interrupt/quiesce -> recursive finish -> terminal root | Target correction fully stops same root before inactive projection; same exact objects are retryable. | Runtime reproduction, committed source, SR-002 |

## Design Health Assessment Evidence

- Change posture: `Bug Fix / Requirement Correction`
- Root cause classification: `Missing Lifecycle Invariant / Boundary Ownership`; the active-delete WIP is a local workflow defect caused by a superseded interpretation.
- Refactor posture: retain bounded shutdown/catalog ownership changes; remove only active-delete UI composition and its stale tests/copy.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Screenshot + live history | Root active while members offline | Do not infer terminal root from member status. | Preserve status separation |
| Exact runtime reproduction | Stop hangs at tool approval | Stop must interrupt before quiescence and terminalize all descendants. | Retain backend fix/coverage |
| Base source | Active Stop and inactive Delete are mutually exclusive | This is deliberate product safety behavior. | Restore exact guard |
| WIP source/API observation | WIP exposes active Delete and combined confirmation | Requirement divergence, not required architecture. | Remove WIP active-delete delta |
| Catalog/manager review | Restore/delete and failure ordering need held exact-ID coordination | Backend deletion correction remains useful for inactive Delete. | Retain DS-006 safeguards |

## Relevant Files / Components

- `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` — renders TeamRun root activity and row actions.
- `autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` — owns the existing inactive-history delete confirmation modal and section bindings; WIP dynamic active copy must be removed.
- `autobyteus-web/composables/useWorkspaceHistoryTreeState.ts` — defines `canTerminateTeam(isActive)`.
- `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` — base correctly blocks active delete; WIP added `wasActive` combined confirmation/sequence that must be removed.
- `autobyteus-web/stores/runHistoryMutationActions.ts` — invokes GraphQL delete and removes exact local Team history/context/selection.
- `autobyteus-web/stores/agentTeamRunStore.ts` — owns Team stream disconnection and stop-only lifecycle cleanup.
- `autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` — application-facing stored TeamRun history service.
- `autobyteus-server-ts/src/run-history/services/team-run-history-catalog-service.ts` — physical index/package deletion and active-root guard.
- `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` — root lifecycle authority and termination owner.
- `autobyteus-server-ts/src/agent-team-execution/domain/root-team-run.ts` — active/resumable root and exact command routing.
- `autobyteus-server-ts/src/agent-team-execution/domain/agent-run.ts` — termination preparation currently waits for input quiescence; existing interrupt is the supported turn-cancellation primitive.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` — lazy configured-member activation/restoration.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.ts` — configured nested-Team recursion and local termination attachment.
- `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.ts` and `mixed-task-team-execution-registry.ts` — active/prepared delegated execution ownership and settlement.
- `autobyteus-server-ts/src/agent-team-execution/services/team-run-resolver.ts` — root-private TeamRun ownership currently pruned from activity reads.
- `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` — deepest-first task interruption/settlement after root admission closes.
- `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` — row-action component coverage.
- `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts` and server history/catalog tests — mutation and persistence coverage targets.

## Runtime / Probe Findings

The three reported production roots and their logs were inspected read-only. After the user explicitly authorized experiments, one newly allocated exact fixture was mutated through public runtime APIs and then completely deleted; neither reported root was changed.

| Exact TeamRun | Initial Root State | Member State | Checkpoint | Later Observation |
| --- | --- | --- | --- | --- |
| `classroom_simulation_team_9e9c0eaa52324da08a327a66fa6d13be` | Active | `/professor` idle; `/student` idle | Later query found no active root | Inactive; `terminatedAt=2026-08-18T20:24:51.266Z` |
| `classroom_simulation_team_d1b2a267cdf44bc7856eec5430dac3b4` | Active | both offline | `changeSequence=1`, `hasOpenExecutionWork=false` | Still active/quiescent |
| `classroom_simulation_team_69b84cde65ea447f9d1a3185abbd08b7` | Active | both offline | `changeSequence=1`, `hasOpenExecutionWork=false` | Still active/quiescent |

The screenshot's small gray square on the recent TeamRun row is `heroicons:stop-20-solid`, not a disabled or missing trash icon. On an inactive row, archive/trash use `md:opacity-0` and appear only on row hover or focus-within.

### Exact Transition Into The Observed State

The state is reachable through the normal lazy TeamRun lifecycle, and the production log proves the failure variant occurred for the two reported roots:

1. `AgentTeamRunManager.createTeamRun()` or `restoreTeamRun()` constructs and registers the `RootTeamRun` first. Root lifecycle becomes active immediately.
2. Configured member AgentRuns are lazy. `MixedTeamManager.getLeafAgentStatusSnapshots()` emits `offline` for any configured member with no live handle/AgentRun.
3. When a user message targets the professor, `RootTeamRun.executeAgentCommand()` reaches `MixedAgentMemberHandle.ensureReady()`.
4. Because prior native conversation activity exists, the handle selects the native restore plan.
5. For both reported roots, that restore failed. The server log contains the exact error `TeamAgentActivationError: The prior native conversation context could not be restored.`
6. The professor never becomes an active AgentRun after that attempt; the student was never activated. Both therefore project offline.
7. Member activation failure does not terminate the root. The root remains active so a later command can retry activation. Since no delegated task or member turn remains open, the root checkpoint reports `hasOpenExecutionWork=false`.

Thus the state is not computed incorrectly: it is an **active retry-capable root with zero currently active member runtimes**. Under the user-confirmed workflow, Delete is correctly absent until Stop reaches terminal completion; the defect is that pending-approval Stop could fail to reach that state.

### User-Approved Exact Reproduction

The isolated fixture matched the two reported configurations: professor `AUTOBYTEUS/deepseek-v4-flash`, student `CODEX/gpt-5.6-luna`, both `autoExecuteTools=false`.

1. Fresh creation projected root active and both configured members offline before any member activation.
2. Professor input activated the member and reached `TOOL_APPROVAL_REQUESTED` for `run_bash pwd`; checkpoint `hasOpenExecutionWork=true`.
3. `terminateAgentTeamRun` began at `04:41:14.912Z`. The Team stream projected inactive at `04:41:16.312Z`, but the mutation had not returned when the client timed out at 60 seconds.
4. Source tracing showed why: `AgentRun.prepareTermination()` waits for input quiescence, but no interrupt/cancellation is issued first, so the turn remains blocked on approval. At the same time, `RootTeamRun.isActive()` becomes false in `terminating`, and `AgentTeamRunManager.getTeamRun()` may unregister the still-tearing-down root.
5. An explicit denial was sent only to recover the fixture. The turn then completed and termination stamped `terminatedAt=2026-08-19T04:43:09.278Z`.
6. Clean restore at `04:43:53.541Z` again projected root active with both members offline. A new message lazily restored professor and completed normally with `CONTINUED`. Idle termination and exact deletion both succeeded; cleanup finished at `04:43:55.248Z`.

This establishes two separate conclusions:

- `root active + all members offline` is a normal, supported lazy/restored state.
- `stop while approval pending` is broken and is the concrete way the user's workflow can become stuck/inconsistent. It must be corrected so Stop reliably reaches the retained inactive state where the later separate Delete becomes available.

## External / Public Source Findings

Not applicable. This is a local product contract; no external source is required.

## Reproduction / Environment Setup

- No new server, container, or dependency install was started.
- Initial investigation queried the already-running Electron server only through read-only operations.
- After explicit user authorization, one newly allocated TeamRun fixture was exercised through the same public GraphQL/WebSocket contracts as the frontend. It was terminated and deleted after capture; its catalog row and package directory are absent.
- Later durable destructive validation must use isolated temporary data and verify only exact fixture paths.

## Findings From Code / Docs / Data / Logs

1. `Offline` is a member-runtime status and does not describe root TeamRun lifecycle.
2. An active root with offline members is a supported resumable state; the absence of Delete there is intentional under the original workflow.
3. The actual blocking bug is unreliable Stop: pending approval prevents quiescence, and ownership can disappear before teardown completes.
4. Base `origin/personal` proves the established UX: active root renders Stop; after authoritative inactive projection, Archive/Delete render.
5. API/E2E observed two controls because IR-001 implemented the now-superseded active-delete requirement. It invoked Delete, not Stop; therefore the combined modal was not evidence that Stop itself deletes.
6. The user expressly rejects active Delete and any combined “stop and permanently delete” path. Stop and Delete are separate decisions.
7. Stop must preserve exact history/context/package; terminal completion changes runtime lifecycle only.
8. Inactive Delete remains separately confirmed and exact-ID only.
9. Manager/root shutdown changes in IR-001 correctly distinguish nonterminal ownership from command admission, interrupt before quiescence, freeze already-admitted materialization, and retry the same scope.
10. Catalog/manager changes remain appropriate even with inactive-only UI: supported restore can race an inactive delete, and ordinary I/O failure must not lose the visible retry row.
11. The WIP UI changes to remove are limited and identifiable: unconditional `READY` Delete, `pendingDeleteTeam.wasActive`, dynamic active copy, termination inside `confirmDeleteRun`, combined error messages, and active-delete tests.
12. No new server API or client coordinator is needed. The corrected Stop makes the original post-terminal Delete transition reachable.
13. Native conversation restoration failure remains separate; it explains two reported member errors but does not change the Stop/Delete contract.
14. No persisted representation changes; retained packages stay directly usable.

## Persisted Data Transition Evidence

- Current stored subject, location, representative shape, and approximate volume: `memory/team_run_history_index.json` contains one exact row per root; `memory/agent_teams/<rootTeamRunId>/` contains that root's execution tree/task records/team messages/member histories. The screenshot group has 37 history rows, including three recent distinct IDs.
- Relevant code-model, serialization, semantic, or physical-store change: none. The feature invokes existing exact-root disposal after lifecycle termination.
- Normal readers and writers: `TeamRunHistoryCatalogService` owns catalog rows and physical root directories; `TeamRunHistoryService` projects them; runtime services write while active.
- Representative direct-read evidence: live GraphQL identity/state and the index were inspected without mutation; exact IDs and status distinction agree.
- Required semantics and invariants preserved by direct use: retained roots remain directly usable; only the confirmed exact root is discarded; active package deletion remains forbidden at the catalog boundary.
- Decision: `Directly usable — no migration` for retained data; explicit discard for confirmed target.

## Constraints / Dependencies / Compatibility Facts

- Exact `teamRunId` is authoritative across UI, GraphQL, runtime, catalog, and storage.
- Member `offline` and root `isActive` remain intentionally independent.
- Active and stop-pending roots expose Stop only. Delete/Archive require inactive `READY`.
- Stop retains history and never calls Delete or opens a deletion modal.
- Pending approval requires AgentRun interruption before quiescence; Team code must not synthesize Approve/Deny.
- One manager-owned root remains authoritative until terminal success/failure outcome.
- Inactive catalog Delete remains independently guarded and serialized against restore/create for the same root.
- Current implementation/code-review artifacts describe a superseded active-delete workflow and require downstream rework/re-review after architecture approval.
- Existing independent Agent and Archive behavior stays outside this change.

## Open Unknowns / Risks

- No open product ambiguity remains: the user explicitly selected removal of active Delete.
- Rework must not accidentally revert the valid backend lifecycle/catalog fixes while removing the WIP UI sequence.
- Lifecycle projection must not reveal Delete before every descendant has terminated and root terminal publication completes.
- API/E2E durable edits are currently uncommitted and execution is paused; coverage must be reconsidered against SR-003 after source rework.
- Native conversation restoration remains a separate defect.

## Notes For Architecture Reviewer

This is a user-approved Requirement Gap reset after `ARCH-REV-002` Pass, `IR-001`, and `CRR-001`. Review the revised product spine rather than treating active Delete as approved legacy behavior:

`active row Stop only -> reliable full-tree termination while history remains -> authoritative inactive row -> separate Delete -> inactive-only confirmation -> exact catalog removal`.

The backend gate/frozen-scope/managed-identity retry and catalog exact-ID/compensation work remains justified. The required removal is the WIP active-delete UI path and its combined state/copy/tests. Do not request a combined stop-delete API, generic transaction, or new lifecycle framework.
