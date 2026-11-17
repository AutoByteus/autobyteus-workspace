# Implementation Handoff — Part 2: show an agent with a running background task

Part 1 (the restart reminder) was delivered at `895cf3992d` (DR-001); its handoff is in this file at that commit (`git show 895cf3992d:tickets/in-progress/background-task-restart-notice/implementation-handoff.md`).

## Upstream Artifact Package

All paths below are in `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice/tickets/in-progress/background-task-restart-notice/`.

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High) and passed (ARCH-REV-005 at SR-006); this package goes to code review.
- Requirements doc: `requirements-doc.md` (REQ-006, REQ-007, AC-005, AC-006, DEC-004, DEC-005; approved 2026-11-17)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-005, SR-006)
- Design spec: `design-spec.md` "Part 2" (SR-006)
- Supplemental task artifacts: `architecture-design-handoff.md`
- Design review report: `design-review-report.md` (ARCH-REV-005, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: none (first implementation of part 2)

## Current Implementation Summary

- Implementation cycle: `Local Fix` for part 2 (IR-006: phone probe case renamed MSP-73, delivery DR-003); IR-005 (base integration, DR-002), IR-004 (CR-002), IR-003 the part 2 baseline
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-006` (IR-003 baseline, IR-004, IR-005)
- Related solution revision IDs: `SR-005`, `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-004` (Fail, revised), `ARCH-REV-005` (Pass)
- Related code-review revision IDs: `CRR-005` (Fail: CR-002, Local Fix; `code-review-report.md` "Latest Round: Part 2"), `CRR-006` (Pass, round 5: CR-002 resolved; sent on to API/E2E by the code reviewer), `CRR-007` (Pass), `CRR-008` (Pass, round 6: the base integration IR-005, no findings; sent on to API/E2E by the code reviewer)
- Related API/E2E revision IDs: `N/A` for part 2
- Related delivery revision IDs: `N/A` for part 2
- Triggering finding IDs: `CR-002`
- Worktree / branch / commits: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-restart-notice`, branch `codex/background-task-restart-notice`, base `895cf3992d`. Part 2 commits: `7743699c71` (server: the count, the derivation, the backend boolean removed), `b2de4f9d1f` (baseline fix, see Checks), `af43dc4dad` (contracts), `c7e112bf7d` (server routes), `87246c55fb` (server test fixtures, run-status sum case), `afc63370b4` (Org view status contract), `38843c46a7` (web), `bffbfad334` and `d8c369436f` (server tests), `92499b84b8` (docs), `a69dee806d` (web tests and probe cases). The ticket documents and evidence are in the commit named in the handoff message.

What part 2 does: `runningBackgroundTaskCount(inspection)` is the one derivation of a run's running background tasks (event-stream views count `current()` tasks that are `running`; Codex `snapshot` and ACP `unsupported` give 0). `AgentRun` sets `AgentTurnLifecycleState.backgroundTasksRunning` from it at the start of each source batch (inside the dispatch queue) and before each status snapshot; `buildAgentStatusPayload` requires the count, so every `AGENT_STATUS` carries `background_tasks_running`. Every status route carries it; `/ws/run-status` answers each agent's count and sums it for a run state on the server. The web maps `{status, count}` through one function (`agentActivityPresentation`): an idle agent with tasks shows "Background task running" / "N background tasks running" with the active, non-pulsing blue dot and `heroicons:arrow-path`; a Team row follows busy > background > error > idle > offline. The Stop button and the input still read the status word only. The backend's `hasRunningBackgroundTasks()` is gone from all six backends; the quiet check and part 1's recorder (`AgentRun.hasRunningBackgroundTasks()`) use the derivation.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk (part 2)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: server domain, five wire routes in three contract packages (plus the Org view's status DTO, see deviation 1), six backends (removal), the desktop and phone status surfaces, localization.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: the design's escalation trigger is "a status route found that this inventory misses". Two places the inventory did not name were found and handled inside the design's own rule (deviations 1 and 2 below); neither adds a route kind, an owner or a consumer whose logic reads the count. No consumer's logic reads the count (presentation only).

## Reviewed Behavior Implementation Trace

| Behavior / Requirement | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| REQ-006 / DEC-004 (DS-101) | Every status carries the run's running background task count | `agent-background-task-count.ts` → `AgentRun` (`getBackgroundTasksRunning` hook into `dispatchProcessedAgentRunEvents`; `getStatusSnapshot`) → `AgentTurnLifecycleState.observeBackgroundTasksRunning` → `LifecycleStatusEventTransformer.buildStatusEvent` / `dispatchCanonicalStatus` → `buildAgentStatusPayload` (count required) | Implemented; the example sequence is tested per event-stream runtime (Checks IMP-08) |
| REQ-006 (DS-102) | Each route carries the count; a run state sums its own agents | stream mapper `normalizeStatusPayload`; presentation adapter (live and overlay) and `AgentPresentationStatusDetails`; `CollaborationAgentStatusDetails`; `TeamAgentStatusDetails` → team projector and Org view projector; `PairedAgentStatus` + `pairedAgentStatusFrame(status, count)`; peer channel `RemoteRunSummary.statuses`; `RunStatusService` (`RunAgentAnswer`, run state sum) | Implemented; one normalizer `backgroundTasksRunningOf` |
| REQ-006 / DEC-004 (DS-103) | Idle + count > 0 → the background text, active dot, no Stop; Team rule | `utils/agentActivityPresentation.ts` (+ `agentActivityLabel`), `workspaceStatusDotPresentation.ts`, `useStatusVisuals.ts`, `teamActivityOf`; `runStatusStore` (`backgroundTasks`, `backgroundTasksOf`, `treeRowBackgroundTasksOf`, run state count); `AgentRunState.backgroundTasksRunning` (live statuses, Team and Org snapshots); desktop header and members panel, list rows, definition groups, tree rows (stable, transient, Org), Team dots; phone rows (`mobileRunListRows`, `MobileRunRow`) and run screen | Implemented; en and zh-CN |
| REQ-007 / AC-006 / DEC-005 | Messages delivered at once (no change) | the input path is unchanged; `resolveAgentPrimaryAction` reads the status word only | Preserved; tested (server: a message to a run idle with tasks is dispatched at once; web: Send, never Stop) |
| Codex / ACP | Unchanged (count 0) | `runningBackgroundTaskCount` → 0 for `snapshot` and `unsupported` | Tested |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Task cards (`ProjectTaskWorkers`) keep their own state vocabulary (not a DEC-004 surface); Codex idle runs with background terminals still show Idle (design risk).

## Implementation Choices Beyond The Design Text

1. **The count is read when the batch runs.** `dispatchProcessedAgentRunEvents` takes `getBackgroundTasksRunning` and calls it inside its queue right after the runtime lifecycle snapshot, so a batch's status events carry the count at the moment it is processed (R-13's per-batch granularity), not the count when it was enqueued.
2. **One normalizer.** `backgroundTasksRunningOf(value)` (`agent-status-payload.ts`) makes anything but a positive safe integer 0; the builder, the stream mapper, the presentation adapter, the collaboration and team status details and the run-status service use it.
3. **Each row reads the count from where its status word comes.** Tree rows (delegated runs, Team members in trees, an Org's own rows) and Team run rows read `runStatusStore` (the run-status feed): an agent by its agent run ID, a Team run by its run state, an Org's mounted Team by its agents' sum (`treeRowBackgroundTasksOf`). A listed agent run (desktop list, definition groups, phone top-level row) is not held on the feed; its status comes from its live context in the window, so `agentRunBackgroundTasks` reads that context (0 without one). The header and the members panel read the agent's `AgentRunState.backgroundTasksRunning`. No projection type (`RunTreeRow`, history read models) gained a field.
4. **A history status keeps the count.** `applyMemberOrHistoryStatusSnapshot` (a stored or history status, which has no count) leaves the agent's count as its stream last told it, and sets 0 only for `offline`. Offline cleanup sets 0.
5. **Surfaces keep their own words.** `agentActivityLabel(activity, t, ownLabel)` returns the background text for `background` and the surface's existing status wording otherwise (tree rows' lowercase `hierarchy.status.*`, Team dots' `team_status_*`, the phone's "Starting"/"Stopped"). The header (`useStatusVisuals`) now localizes all its words through new `workspace.agentActivity.*` keys; the en words are unchanged.
6. **`data-status="background"`** on the Team dot and the phone row dot when they show background tasks (the probes and tests read it); it stays the status word otherwise.
7. **Removal of the per-runtime helpers.** `ClaudeSession.hasRunningBackgroundTasks()`, `ClaudeBackgroundTaskRegistry.hasRunningTasks()`, `AgyBackgroundTaskMonitor.hasRunningTasks()` and autobyteus-ts `BackgroundProcessManager.hasRunning()` had no caller but their own tests after the backend boolean went; they are removed and their tests read the lists instead.

Deviations from a design principle decided during implementation:

1. **The Org view's `agent_statuses` (`agentOrgAgentStatusDtoSchema`, collaboration-stream-contracts) carries the count too.** The inventory names the collaboration presentation `AGENT_STATUS` (route 2) but not its snapshot half: the Org view's status list, parsed strictly, which the Org stream projector (`agent-org-execution-view-projector.ts`) fills. Without the field the projector's output fails the schema; with it, an Org's member statuses read the same before and after a reconnect. Treated as part of route 2 (same shape, same owner); not a new route kind.
2. **The peer summary route (route 5) is the peer channel's `RemoteRunSummary.statuses`,** built from `PairedAgentStatus` (`remote-run-view-provider.ts`) and read strictly by `remoteRunSummariesOf` (`peer-run-view-answers.ts`); it carries `backgroundTasksRunning`. The design's named schema, `remoteTaskExecutionSummaryDtoSchema`, had no producer or consumer; IR-004 (CR-002) removed it with the rest of that file's dead exports (`remoteTaskExecutionDtoSchema`, `remoteAgentLaunchDtoSchema`, `remoteRowOpenTargetDtoSchema`, their types, `remoteTaskExecutionRunIdOf`, `remoteTaskExecutionAgentsOf`) and their test. The two used exports, `remoteAgentStatusSchema` and `RemoteAgentStatus`, are now `src/remote-agent-status.ts` (FU-005 resolved).
3. **Producers the compiler found beyond the table:** `configured-agent-execution-handle.ts` (a member without a run: `{status: "offline", background_tasks_running: 0}`), `ConfiguredAgentStatusOverlay` (command overlays 0; otherwise the run's payload), `member-command-status-overlay-store.ts` (team member command overlays 0; fallback from the payload), `agent-org-agent-status-snapshot-projector.ts` and the team's dormant/offline snapshots (0), `stored-team-package-snapshot.ts` (0).

## Key Files Or Areas

- Server domain: `agent-execution/domain/{agent-background-task-count,agent-status-payload,agent-run,agent-run-termination}.ts`, `events/dispatch-processed-agent-run-events.ts`, `events/processors/lifecycle-status/{agent-turn-lifecycle-state,lifecycle-status-event-transformer}.ts`; `backends/agent-run-backend.ts` and the six backends (boolean removed).
- Server routes: `services/agent-streaming/{agent-run-event-message-mapper,team-agent-status-websocket-projector,agent-org-execution-view-projector}.ts`; `agent-collaboration/execution/{run-status-service.ts,events/*,domain/collaboration-agent-execution-event.ts,backends/configured-agent-*.ts,remote/{paired-agent-access,peer-run-calls,remote-run-channel,remote-run-observation}.ts}`; `agent-team-execution/{domain/team-agent-status.ts,services/{team-paired-agent-access,member-command-status-overlay-store}.ts,…}`; `agent-org-execution/services/*`; `standalone-agent-run-root/services/standalone-paired-agent-access.ts`; `remote-collaboration/{inbound/remote-run-view-provider,channel/peer-run-view-answers}.ts`.
- Contracts: agent presentation (`status` block, peer summary statuses), team stream (`teamAgentStatusDtoSchema`), collaboration stream (`run-status-dtos.ts`, `agent-org-execution-dtos.ts`); `dist/` rebuilt.
- Web: `utils/agentActivityPresentation.ts` (new), `utils/workspaceStatusDotPresentation.ts`, `utils/workspaceTeamAggregateStatus.ts` (`teamActivityOf`), `composables/useStatusVisuals.ts`, `stores/runStatusStore.ts`, `types/agent/AgentRunState.ts`, `services/runStatus/agentRuntimeStatusState.ts`, `services/agentStreaming/{teamStreamDtoAdapters.ts,protocol/messageTypes.ts}`, `services/teamExecution/*`, `services/agentOrgExecution/agentOrgExecutionContext.ts`, status components (StatusDot, AgentStatusDisplay, TeamAggregateStatusDot, workspace rows, run list row, members panel, surfaces), phone (`mobileRunListRows.ts`, `mobileRunStatusLabel.ts`, `MobileRunRow.vue`, `MobileRunTargetView.vue`, `useMobileRunTree.ts`); localization `workspace.agentActivity.*` (en, zh-CN).
- Docs: `autobyteus-server-ts/docs/modules/{agent_execution,antigravity_cli_runtime,restart_resume,remote_collaboration}.md`, `docs/design/agent_websocket_streaming_protocol.md`, `autobyteus-web/docs/agent_execution_architecture.md`.

## Important Assumptions

- A run's count is presentation only: nothing decides on it except the quiet check and part 1's recorder, which already decided on the same fact.
- Peer nodes run the same release (DESIGN.md rule 9): a peer summary or frame without the count is malformed.

## Known Risks

- Codex idle with background terminals shows Idle (no live count; design risk).
- A status event per task start/end adds `AGENT_STATUS` frames, bounded by task changes (design risk).
- The count follows batches: between a task's start and the runtime's next batch the shown count can lag (R-13).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change + bounded refactor
- Reviewed root-cause classification: Shared Structure Looseness + Missing Invariant
- Reviewed refactor decision: remove `AgentRunBackend.hasRunningBackgroundTasks()`; one derivation
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `grep -rn "hasRunningBackgroundTasks\|hasRunningTasks\|hasRunning()" src` in the server and autobyteus-ts finds only `AgentRun.hasRunningBackgroundTasks()` (the run's facade over the derivation, used by the recorder).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (strict contracts, required fields; rule 9)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` — the dead exports of `remote-task-execution-dtos.ts` (IR-004), the backend boolean in the contract and six backends, the four per-runtime helpers (choice 7), the web's per-status switch tables (now the one mapping).
- Dead code found elsewhere, added to `follow-ups.md`: FU-005 (an unused contract schema; resolved in IR-004 as CR-002 placed it in this ticket), FU-006 (a stale doc bullet), FU-007 (unmounted running-panel components with their own status colours)
- Shared structures remain tight: `Yes` (one field per status shape, one word: `backgroundTasksRunning` / `background_tasks_running` by the contract's casing)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: the two route findings above (deviations 1 and 2); no principle is set aside.
- Changed source implementation files stayed within size guardrails: `Yes` — `agent-run.ts` 465, `configured-agent-execution-handle.ts` 460 effective lines (non-blank, non-comment); no source file's delta over 220 (largest: `utils/agentActivityPresentation.ts`, new, +67; `run-status-service.ts` +41/−27).
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (the count is live only; an offline run reads 0)
- Implementation follows the approved decision: `Yes`

## Environment Or Dependency Notes

- No dependency change. Contract packages rebuilt (`dist/` committed).
- The machine ran another worktree's test suites at the same time (load average up to 187); timing-sensitive failures are classified in the Checks.

## Integration Of The Refreshed Base (IR-005, delivery DR-002)

`origin/personal` @ `ff13782f36` (71 commits past `895cf3992d`, among them autobyteus-483 end reasons and exit codes,
autobyteus-458 phone run settings, autobyteus-515 native tool search) is merged into the branch: merge `990ff9a3d4`,
then `ca1979b206` and the probe-ID commit named in the handoff message.

- `MobileRunTargetView.vue`: the base moved the phone's dot and status line into `utils/mobile/mobileRunSubjectLine.ts`,
  which its new Settings screen (`MobileRunSettings.vue`) uses too. The helper now takes `backgroundTasksRunning` and
  the translator and builds the line with `mobileRunActivityLabel` and the dot with `agentStatusDotClass(status, count)`,
  so both phone surfaces show DEC-004's text and active dot; an unreachable run still shows only its error. Both call
  sites pass the run's `AgentRunState.backgroundTasksRunning`; its spec gains the DEC-004 case.
- `autobyteus-background-tasks.test.ts`: the base's `[status, summary, exit_code]` assertion kept, with part 2's
  `runningBackgroundTaskCount(backend.backgroundTaskInspection)` for the removed backend boolean.
- `agent_execution.md`: 483's `exitCode` / `end_reason: run_ended` text kept, with part 2's count.
- Contract `dist/` maps rebuilt from the merged source (the three contract packages' tests pass; `dist/` unchanged by a rebuild).
- No backend-level `hasRunningBackgroundTasks` is left: the base's calls in the backends, `claude-session.ts` and
  `agent-run-termination.ts` merged onto part 2's removal without a conflict, and `git grep` on the merged tree finds only
  `AgentRun.hasRunningBackgroundTasks()` (part 1's recorder, over the derivation) and its tests. 483's end reasons need no
  decision with the count: an ended task (any `endReason`) is not `running`, so it is not counted.
- Test doubles follow 483's type: background tasks in the part 2 tests and doubles carry `endReason: null, exitCode: null`.
- The phone probe case of part 2 is renumbered MSP-59 → MSP-67: the base added its own MSP-59 (`mobile-background-tasks-cases.mjs`).
- IR-006 (delivery DR-003): autobyteus-522 (base `d61bae54a0`, merged by delivery as `e93d477539`) added MSP-67..MSP-72 (`mobile-every-run-settings-cases.mjs`), so part 2's case is now **MSP-73** (`d7fdd7db6f`): its `runCase`, header comment and screenshot names. Rows and evidence that say MSP-59 or MSP-67 for part 2's case were recorded under those IDs and mean MSP-73 now; the API/E2E coverage, execution and test-review reports carry the same rename note.

## Checks Run

Evidence files are in `tickets/in-progress/background-task-restart-notice/evidence/`. Environment: macOS 26 arm64, node 22.23.1; another worktree's suites ran at the same time (load average 70 to 187).

| Check ID | Command Or Steps | Commit Tested | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-05 | `pnpm -C <pkg> test` for the agent presentation, team stream and collaboration stream contracts (rebuilds `dist/`) | head | strict schemas with the required count (status block, peer summary statuses, team member status, run-status agent entry and run state, Org view status) | REQ-006 (wire) | Pass | `IMP-05-contracts.log` | `# pass 23`, `# pass 14`, `# pass 37`, `dist unchanged after rebuild` |
| IMP-06 | `pnpm -C autobyteus-server-ts typecheck` | head | server src and tests | — | Pass | `IMP-06-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)`, `[typecheck] PASS` |
| IMP-07 | `pnpm -C autobyteus-server-ts test:unit` (full) | `bffbfad334` minus the double fixes | all server unit tests | regression | 7 failures: 6 were doubles/fixtures without the count or the inspection (fixed in `bffbfad334`/`d8c369436f`, rerun in IMP-08); 1 is FU-001 (folder watcher hook timeout under load) | `IMP-07-server-unit-full.log` | `Tests  7 failed \| 8236 passed`; the fixed files: `agent-run-memory-recorder`, `remote-run-observations-route`, `live-e2e-harness` |
| IMP-08 | `vitest run` of every server unit and integration directory part 2 touches (agent-execution, agent-collaboration, team, org, agent-streaming, remote-collaboration, restart-resume, run-history, standalone root, memory, REST, secret-management; integration agent, agent-team-execution, agent-execution, restart-resume, background-task-notices) | head | the derivation, the lifecycle state, every status producer and route, `RunStatusService` (count and sum), the example sequence through a scripted backend, the scripted Antigravity backend and the native backend with its real process manager, Codex/ACP 0, AC-006 at the `AgentRun` | REQ-006, REQ-007, AC-005 (local), AC-006 | Pass for this change: `Tests  8 failed \| 3777 passed`, all 8 in `package-auto-refresh.integration.test.ts` (the `fs.watch` environment failure of IMP-09, pulled in by the `tests/integration/agent` prefix) | `IMP-08-server-affected-suites.log`, `IMP-08b-new-tests-verbose.log` | `Test Files  1 failed \| 467 passed`; verbose: the six example-sequence cases, the run-status sum case and `agent-websocket.integration.test.ts` ✓, `Tests  29 passed (29)` |
| IMP-09 | `vitest run tests/integration` (in two parts) and a rerun of the two watcher files alone | `d8c369436f` | server integration | regression | 13 failures, all in `file-system-watcher.integration.test.ts` and `package-auto-refresh.integration.test.ts` (time-outs and late/lost `fs.watch` events), the same 13 part 1's API/E2E recorded on this machine (API-01: `fseventsd` saturated); no watcher, file-explorer or package source changed | `IMP-09a-…`, `IMP-09b-…`, `IMP-09c-watcher-rerun.log` | `Tests  13 failed \| 411 passed` (09b); 09a's 2 `agent-websocket` failures were expected payloads without the count, fixed in `d8c369436f` and passing in IMP-08 |
| IMP-10 | `pnpm -C autobyteus-web typecheck` | head | web and its cross-package tests | — | Pass | `IMP-10-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)`, `[typecheck] PASS` |
| IMP-11 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | head | boundaries and localization | localization (en, zh-CN) | Pass | `IMP-11-web-guards.log` | `Passed.` twice; the audit exits 0 |
| IMP-12 | `pnpm -C autobyteus-web test:nuxt run` (full), then the 11 failing files after their fixtures got the count (`d1cf47a298`) | `a69dee806d`, rerun at `d1cf47a298` | the mapping, Team rule, store counts, run state, phone rows, header, the run input (Send, never Stop), every status consumer | REQ-006, AC-005 (web), AC-006 (no Stop) | Pass after fixture fixes: the 79 failures were status fixtures and store doubles without the count (strict parsing at run time), plus one voice-input test that passed on rerun | `IMP-12a-web-unit-full.log`, `IMP-12b-web-unit-rerun.log` | full: `agentActivityPresentation.spec.ts (5 tests)`, `WorkspaceRowsBackgroundTasks.spec.ts (4 tests)`, `MobileRunList.spec.ts (8 tests)` ✓; rerun `Tests  118 passed (118)` |
| IMP-13 | `pnpm -C autobyteus-web test:e2e:team-status-live --cases TS-008 --output-dir <fresh>` (built server, Nuxt dev, headless Chrome, scripted AGY `BACKGROUND_STEP`) | `e259944b13` | the desktop list row, the TEAMS run row (one member background, one idle), the header, the composer, the return to Idle | AC-005, AC-006 (desktop) | Pass (the first run failed on the agent run row's dot, fixed in `e259944b13`) | `IMP-13-probe-TS-008/` | `evidence.json` `"status": "background"`, `"agentRowDot": "… bg-blue-500 mr-2"`, `"header": "Background task running"`, `"stop": 0`, `"after": {"header": "Idle"`; `first-run-fail-evidence.json` |
| IMP-14 | `node autobyteus-web/tests/e2e/mobile-shell-probe.mjs --cases=MSP-59 --output-dir=<fresh>` (production phone bundle, paired node, scripted AGY) | `e259944b13` | the phone row and run screen, the composer, the return to Idle | AC-005, AC-006 (phone) | Pass | `IMP-14-probe-MSP-59/` | `"row": {"status": "background", … "label": "…, Background task running"}`, `"stop": 0`, `"after": "Idle"` |
| IMP-15 | IR-004: `pnpm -C <pkg> test` for the three contract packages; `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck`; `vitest run tests/unit/remote-collaboration` | head | the remaining `remoteAgentStatusSchema` / `RemoteAgentStatus` and every package that builds against the contracts | CR-002 | Pass | `IMP-15-contracts.log`, `IMP-15-server-typecheck.log`, `IMP-15-web-typecheck.log`, `IMP-15-remote-collaboration-unit.log` | `# pass 22`, `# pass 14`, `# pass 37`; both `[typecheck] PASS` at their baselines; `Tests  154 passed (154)`. Search before removal: `rg -w` for each removed name finds only the file and its own test |
| IMP-16 | IR-005 merged state: both typechecks; the three contract packages' tests | `ca1979b206` | everything that builds against the merged contracts | — | Pass | `IMP-16-merge-server-typecheck.log`, `IMP-16-merge-web-typecheck.log`, `IMP-16-merge-contracts.log` | both `[typecheck] PASS` at their baselines (1012 in 316; 87 in 37); `# pass 22`, `14`, `37`; `dist unchanged after rebuild` |
| IMP-17 | IR-005: `pnpm -C autobyteus-server-ts test:unit` (full); `vitest run tests/integration/{agent,agent-team-execution,agent-execution,restart-resume,background-task-notices}` | `ca1979b206` | agent execution (483's end reasons with the count), background-task notices, restart-resume, every status route | REQ-006, REQ-007, regression | Pass for this change: unit `2 failed \| 8302 passed`, both time-outs at load 77 to 161 in files nothing here touches (`tracked-imports` passes on rerun; `agent-memory-explorer-service` passes with a 60 s timeout); integration `8 failed \| 171 passed`, all in `package-auto-refresh.integration.test.ts` (the `fs.watch` environment failure of IMP-09) | `IMP-17-merge-server-unit-full.log`, `IMP-17-merge-server-integration.log`, `IMP-17-merge-timeout-reruns.log` | `Tests  2 failed \| 8302 passed`; reruns `1 passed` / `4 passed` |
| IMP-18 | IR-005: `pnpm -C autobyteus-web test:nuxt run` (full) | `ca1979b206` | status, phone run and run settings (`mobileRunSettingsScope.spec.ts` with the DEC-004 case, `MobileRunSettings.spec.ts`), every status consumer | REQ-006, AC-005/AC-006 (web) | Pass | `IMP-18-merge-web-unit-full.log` | `Test Files  764 passed (764)`, `Tests  5750 passed (5750)` |
| IMP-19 | Fresh-start build (TESTING.md): `git clone --no-local` at `ca1979b206`, `pnpm install --frozen-lockfile`, `pnpm build:electron:mac -- --arm64` with the job's environment, then "Verify bundled Prisma ARM64" and "Verify packaged terminal runtime ARM64" (with the spawn probe) | `ca1979b206` | the contract `dist/` and every package's build from a clean clone | build | Pass; signing, notarization and other systems not tested (runner only) | `IMP-19-fresh-start-build/` | `install ok`, `build ok`, `verify prisma ok`, `verify terminal runtime ok`, `spawn probe ok`, `exit=0`; node v22.23.1 |
| IMP-20 | IR-005 probes on the merge: `test:e2e:team-status-live --cases TS-008`; `mobile-shell-probe.mjs --cases=MSP-59,MSP-67` (the base's 483 phone background-task case and part 2's renumbered case) | merge + renumber | desktop rows, Team row, header, composer; the phone row and run screen; 483's run-ended phone Activity | AC-005, AC-006 | Pass | `IMP-20-merge-probes/` | TS-008 `evidence.json` Pass; `mobile-shell-probe.json` MSP-59 and MSP-67 Pass (`"status": "background"`, `"stop": 0`, `"after": "Idle"`) |
| IMP-21 | IR-006: `pnpm -C autobyteus-server-ts build`, `pnpm -C autobyteus-web build:mobile-web`, then `node autobyteus-web/tests/e2e/mobile-shell-probe.mjs --cases=MSP-73,MSP-67,MSP-68,MSP-69,MSP-70,MSP-71,MSP-72,MSP-59,MSP-63 --output-dir=<fresh>` | `d7fdd7db6f` (base `d61bae54a0` merged as `e93d477539`) | part 2's phone case with the Settings screen (MSP-73), autobyteus-522's every-run Settings (MSP-67..72), 483's run-ended Activity (MSP-59), 458's Settings (MSP-63); the probe's start check (no duplicate IDs) | AC-005, AC-006 (phone) | Pass | `IMP-21-phone-probe-msp73/` | `results.log`: nine `Pass`, `mobile-shell probe: Pass`; `mobile-shell-probe.json` MSP-73 `"status": "background"`, settings `"Background task running"`, `"stop": 0`, `"after": "Idle"` |

- Baseline fix (TESTING.md rule 9): `b2de4f9d1f` — `autobyteus-agent-presentation-contracts/tests/agent-runtime-names.test.mjs` lacked `deepseek_harness` since autobyteus-387; its own commit.
- Not run, and why: the live Claude case (its live gate and a paid model) and per-runtime checks on an isolated desktop instance; the two-node peer case beyond MSP-59's paired node; the server E2E suite. These are API/E2E's.

## Frontend Rendered-Result Check (When Applicable)

Done with the two probe cases (IMP-13, IMP-14) and their screenshots, which I looked at:

- Desktop (`ts008-agent-background.png`): the header reads "● Background task running" (blue, steady) on one line; the run title truncates. The run's row and the Team run row show the blue dot; the composer offers Send, no Stop. The first render wrapped the header text onto two lines; `e259944b13` keeps it on one line (`whitespace-nowrap`, the status block does not shrink).
- Phone (`MSP-59-background-run-screen.png`): the run screen's second line reads "Background task running" under the name with the blue dot; Send, no Stop. The row's accessible name ends with "Background task running". `MSP-59-background-row.png` is scrolled past the row (the probe reads the row's attributes).
- Both return to Idle (green) when the task exits (`ts008-idle-again.png`, `MSP-59-idle-again.png`).
- Observed, not changed: the desktop Background Tasks panel header reads "Current count unavailable" for the Antigravity run while its task runs (the panel's own inspection, autobyteus-473); API/E2E may want to look.

## Downstream Coverage Hints / Suggested Scenarios

- AC-005 per runtime on an isolated node: native `run_bash(run_in_background: true, "sleep 60")` (scripted or live), Claude `Bash(run_in_background)` (live gate), Antigravity daemon (scripted `BACKGROUND_STEP`): desktop and phone list rows and headers show "Background task running" with the active dot and no Stop; back to "Idle" when it ends; a turn in progress still shows "Running".
- A Team with one member idle with a background task and another idle: the Team row shows the background text; with a failed member too, still the background text (busy > background > error).
- Reload and reconnect while a task runs: the snapshot carries the count.
- A peer run (two nodes) idle with a background task: the delegator's tree shows it (paired frame and summary).
- Codex idle with a background terminal: Idle; ACP: unchanged.
- zh-CN: "后台任务运行中" / "{count} 个后台任务运行中".

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: AC-005 and AC-006 per runtime on an isolated node, the live Claude case under its gate, and the two-node peer case. The checks above do not substitute for them.
