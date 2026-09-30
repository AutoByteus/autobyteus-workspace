# Implementation Handoff — Replace the To-Do path with Background Tasks

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Large/High) and passed (`ARCH-REV-001`, round 1). Handoff rule matched: "implementation is complete and the carried classification is task_size=Large or architectural_risk=High … ready for independent source review" → `/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/requirements-doc.md` (Approved, SR-004 content, approval SR-005)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-spec.md` (SR-006)
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/solution-handoff.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/probes/agy-daemon-exit-signal-probe.py`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/probe-evidence/p3-agy-daemon-exit-signal.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/probe-evidence/p4-agy-daemon-failure-signal.log`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/architecture-review-revision-record.md`
- Triggering rework report: `N/A` (initial implementation)
- Implementation evidence (this round): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/implementation-evidence/background-tasks-panel/` (browser probe `evidence.json`, six screenshots, `nuxt.log`)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-web-todo-panel/tickets/in-progress/remove-web-todo-panel/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-005`, `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`. Applied non-blocking recommendations AR-REC-002, AR-REC-003, AR-REC-004 and the Codex `ITEM_PLAN_DELTA` note. AR-REC-001 is Solution Designer documentation hygiene and was not touched.

What now exists:

1. **To-do path removed end to end.** Server event/message types, activity-set entry, mapper case, collaboration adapter/event unions/projectors, both contract packages (src and rebuilt committed `dist`), Codex `ITEM_PLAN_DELTA` enum member + item-name set entry + case, `TURN_TASK_PROGRESS_UPDATED` enum member + case, web store/types/handler/spec/panel/protocol/projector/DTO adapter cases, the `RightSideTabs` auto-switch watcher (and its now-dead `currentAgentRunId`), localization keys, and docs.
2. **`BACKGROUND_TASK_UPDATED`**: a runtime-neutral per-task upsert snapshot `{task_id, kind, description, status, summary, started_at}`. Defined once on the server (`agent-background-task.ts`, builder + strict parser) and once in the presentation contract (`backgroundTaskKindSchema`, `backgroundTaskStatusSchema`); a unit test enforces enum parity. It is not in `ACTIVITY_EVENT_TYPES`, has `statusHint: null`, and falls through the memory accumulator's default branch (not persisted).
3. **Claude**: `ClaudeBackgroundTaskRegistry` owns the per-task view and implements the DS-002 rule table with constructor-injected `onBackgroundTaskChanged` and clock (AR-REC-004). `ClaudeSession` wires the callback to `ClaudeSessionEventName.BACKGROUND_TASK_UPDATED`; the converter validates it through the domain parser.
4. **Antigravity**: `agy-brain-file.ts` extracted (per-caller byte bound, AR-REC-002; image reader keeps 16 KiB). `agy-task-exit-message-reader.ts` scans only `messages/*.json` (64 KiB bound), settles exit and other-shape files, and retries only unparseable JSON (AR-REC-003). `AgyBackgroundTaskMonitor` tracks steps the converter reports as open at `result`, polls every 2 s while any task runs, and `stopAll()` marks the rest stopped. `AgyAgentRunBackend` calls `stopAll()` before `await this.eventQueue` in interrupt, terminate and dispatch-failure, and in `handleClose` and the listener-failure path (AR-REC-003 ordering).
5. **Web**: `types/backgroundTask.ts` (reuses the contract's kind/status unions), `agentBackgroundTaskStore` (per-run map, upsert, newest-first getter, running/total counts), `backgroundTaskHandler`, projector/DTO-adapter cases, and `components/progress/BackgroundTaskPanel.vue` in the former To-Do slot of `ProgressPanel` (same accordion, Activity expanded by default). Localized in en and zh-CN.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 94 changed/added/deleted paths (69 modified, 5 deleted, 20 added; ticket artifacts excluded) across the server domain, streaming and collaboration, Claude and AGY backends, Codex, two contract packages (src + dist), web streaming/store/UI, localization and docs. The shared stream contract changed; the new AGY owner polls an undocumented file format; the event is emitted between turns; two backends gained stop obligations. None of the design's escalation triggers fired (see "Important Assumptions").
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Large/High route; a self-review was still done, see "Legacy / Compatibility Removal Check")
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Background Tasks replaces To-Do in place; same accordion; empty state; counts | `components/progress/ProgressPanel.vue` (`'backgroundTasks' \| 'activity'`, default `activity`) → `components/progress/BackgroundTaskPanel.vue` → `stores/agentBackgroundTaskStore.ts` | Implemented. Rendered and exercised in the browser probe (BT-UI-001, BT-UI-006) |
| BEH-002 | No to-do event anywhere; Codex plan delta produces nothing | Server enum/mapper/adapter/unions/projectors, both contract packages + dist, Codex converters (`item/plan/delta` is now an unknown item name → no event) | Implemented. AC-003 static audit: no matches in source or dist (only two contract tests that assert rejection of the removed type) |
| BEH-003 | Auto-switch removed; nothing new switches tabs | `components/layout/RightSideTabs.vue` watcher removed | Implemented; spec asserts no `setActiveTab` when a task appears |
| BEH-004 | Activity feed unchanged | untouched `ActivityFeed.vue` | Preserved |
| BEH-005 | Claude background task running → completed/failed/stopped with summary, per run | CLI frame → `ClaudeTurnTracker` → `ClaudeBackgroundTaskRegistry` (DS-002) → `ClaudeSession` → `ClaudeSessionEventConverter` → `AgentRunEvent BACKGROUND_TASK_UPDATED` → mapper / `AgentRunPresentationAdapter` → projectors → web `agentStreamMessageProjector` → `backgroundTaskHandler` → store → panel | Implemented; process close/exit → stopped; turn-level Stop leaves tasks running (MP-003) |
| BEH-006 | Completion notice and Claude-initiated turn unchanged | Registry pending/carry-over logic untouched; `recordCompletion` still runs after the view update | Preserved; existing session and tracker tests pass unchanged |
| BEH-007 | AGY daemon running at turn end → completed/failed on exit → stopped on AGY stop; fail-safe | `AgyStreamEventConverter.closeBackgroundTools` → `onBackgroundToolSteps` → `AgyBackgroundTaskMonitor.track` → poll `scanAgyTaskExitMessages` → `emit` → backend `enqueue(deliver)`; `stopAll()` on every stop path | Implemented; tool-call text unchanged |

## Key Files Or Areas

- Server domain and streaming
  - `autobyteus-server-ts/src/agent-execution/domain/agent-background-task.ts` (new)
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts`
  - `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/agent-turn-lifecycle-state.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/{models.ts,agent-run-event-message-mapper.ts,team-agent-event-websocket-projector.ts}`
  - `autobyteus-server-ts/src/agent-collaboration/execution/events/{agent-presentation-event.ts,collaboration-agent-presentation-adapter.ts,agent-presentation-message-projector.ts}`
  - `autobyteus-server-ts/src/agent-team-execution/domain/team-agent-event.ts`
- Claude: `autobyteus-server-ts/src/agent-execution/backends/claude/session/{claude-background-task-registry.ts,claude-session.ts}`, `.../claude/events/{claude-session-event-name.ts,claude-session-event-converter.ts}`
- AGY: `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/{agy-brain-file.ts (new),agy-task-exit-message-reader.ts (new),agy-background-task-monitor.ts (new),agy-step-output-reader.ts,agy-stream-event-converter.ts}`, `.../antigravity/backend/agy-agent-run-backend.ts`
- Codex: `autobyteus-server-ts/src/agent-execution/backends/codex/events/{codex-thread-event-name.ts,codex-item-event-converter.ts,codex-turn-event-converter.ts}`
- Contracts: `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` + `dist/`; `autobyteus-team-stream-contracts/src/{team-agent-message-dtos.ts,team-stream-server-message.ts}` + `dist/`
- Web
  - `autobyteus-web/types/backgroundTask.ts` (new)
  - `autobyteus-web/stores/agentBackgroundTaskStore.ts` (new)
  - `autobyteus-web/services/agentStreaming/handlers/backgroundTaskHandler.ts` (new)
  - `autobyteus-web/components/progress/BackgroundTaskPanel.vue` (new)
  - `autobyteus-web/components/progress/ProgressPanel.vue`
  - `autobyteus-web/components/layout/RightSideTabs.vue`
  - `autobyteus-web/services/agentStreaming/{protocol/messageTypes.ts,protocol/index.ts,agentStreamMessageProjector.ts,teamStreamDtoAdapters.ts,handlers/index.ts,handlers/agentStatusHandler.ts}`
  - `autobyteus-web/localization/messages/{en,zh-CN}/{workspace.ts,workspace.generated.ts}`
- Deleted: `autobyteus-web/{stores/agentTodoStore.ts,types/todo.ts,services/agentStreaming/handlers/todoHandler.ts,services/agentStreaming/handlers/__tests__/todoHandler.spec.ts,components/workspace/agent/TodoListPanel.vue}`
- Docs
  - `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md`
  - `autobyteus-server-ts/docs/modules/agent_execution.md`
  - `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`
  - `autobyteus-ts/docs/{agent_team_runtime_and_task_coordination.md,agent_team_streaming_protocol.md}`
  - `autobyteus-web/docs/{agent_execution_architecture.md,settings.md,terminal.md}`
- New browser probe: `autobyteus-web/tests/e2e/background-tasks-panel-probe.mjs` + `tests/e2e/fixtures/background-tasks-panel.page.vue` (`pnpm -C autobyteus-web test:e2e:background-tasks-panel`)

## Important Assumptions

- **Claude raw `task_type` values (RR-003).** The kind table was confirmed statically against the pinned SDK 0.3.280 CLI binary, not by a live capture. The binary's own friendly-label table is `{local_agent:"subagent", local_workflow:"workflow", local_bash:"shell", monitor_mcp:"monitor", monitor_ws:"monitor", mcp_task:"MCP task", in_process_teammate:"teammate", dream:"dream", auto_mode_scan:"auto-mode scan", remote_agent:"cloud session"}`. It was extracted with `LC_ALL=C grep -a -o 'var WRe={[^}]*}'` on `node_modules/.pnpm/@anthropic-ai+claude-agent-sdk-darwin-arm64@0.3.280/.../claude`. The design's table (with the `monitor` substring rule) matches it exactly, so no change was needed. `mcp_task`, `in_process_teammate`, `dream`, `auto_mode_scan` and `remote_agent` map to `other`. A live capture remains for API/E2E.
- **SDK 0.3.280 frame shapes** match DS-002: `task_started.is_backgrounded`, `task_updated.patch.{status,error,is_backgrounded}`, `task_notification.{status,summary}`, `background_tasks_changed.tasks[{task_id,task_type,description,ambient?}]`. The SDK doc for `background_tasks_changed` says to treat it as a REPLACE level signal. Per DS-002, absence from the set does **not** end a task; only terminal frames do. The `ambient` flag is not filtered: monitors (listed in DEC-003) can be ambient.
- **AGY message format** follows the real P3/P4 files: `sourceMetadata.tool.stepIndex` and `content` with "finished with result: … exited with code N … Log:". Both were read from `~/.gemini/antigravity-cli/brain/<probe conversation>/.system_generated/messages/`. The test fixtures reproduce their exact shape (thinking signature shortened).
- The AGY monitor also remembers exit messages by step index, so a daemon that exits *before* its turn's `result` (while another task keeps polling active) is still matched when tracked. This is a correctness detail inside the monitor's owned state, not new behavior.
- Server-side `description` may be empty when the CLI has not reported one yet. The panel then shows the localized placeholder "Background task", and the registry fills the description once reported.

## Known Risks

- `claude-session-event-converter.ts` is exactly at the 500 effective non-empty line guardrail (497 → 500). It is not above the limit, but the next addition should split the file.
- Residual risks from the review are unchanged: RR-001 (terminate-time snapshots vs. mutation response ordering), RR-002 (non-daemon step open at an error result → running then stopped), RR-004 (AGY format drift; Windows untested), RR-005 (empty after reload).
- AGY message files above 64 KiB are settled as unreadable (logged once). Their task stays running until AGY stops, then shows stopped, which is the intended fail-safe. A daemon with very large final output could hit this.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement (removal + feature)
- Reviewed root-cause classification: Legacy Or Compatibility Pressure + Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes:
  - The dead contract was replaced rather than added alongside.
  - The registry is the single Claude owner.
  - The AGY monitor is the single AGY owner.
  - The brain-file reader was extracted and shared.
  - The panel moved to `components/progress/`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`. Five web files were deleted, `serializePayload` was dropped from the Codex turn converter, `currentAgentRunId`/`todoStore` were dropped from `RightSideTabs`, and the `ITEM_PLAN_DELTA` and `TURN_TASK_PROGRESS_UPDATED` enum members were removed.
- Shared structures remain tight: `Yes`. `AgentBackgroundTask` has six fields with no runtime kind, turn id or end time. The web reuses the contract's enums instead of a parallel copy.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`
  - The largest is `claude-session-event-converter.ts` at 500, noted under Known Risks.
  - The largest delta is the registry, +120 lines, which is below 220.
- Notes: The AC-003 audit finds `TODO_LIST_UPDATE` only in two contract tests (`autobyteus-agent-presentation-contracts/tests/agent-presentation-contracts.test.mjs:28`, `autobyteus-team-stream-contracts/tests/token-usage-run-summary-dto.test.mjs:146`). Both assert that the removed type is rejected. They are regression guards, not source or dist.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence: the new event type reaches `runtime-memory-event-accumulator.ts`'s `default` branch (unchanged). No store or run-history code was touched.
- Migration implementation: `N/A`
- Deviation: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install --frozen-lockfile`, `npx prisma generate` and `pnpm prepare:shared` in `autobyteus-server-ts`, and `npx nuxi prepare` in `autobyteus-web` before checks.
- `pnpm prepare:shared` leaves untracked build output in `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/`. It is intentionally not committed.
- The branch is 45 commits behind `origin/personal`. The implementation is based on the design's base `43b6fc0f4`, as specified; delivery will integrate.
- Pre-existing, unrelated baseline failures were identified by running the same failing files on a clean detached worktree of `43b6fc0f4`, since removed:
  - Server `tests/unit` + `tests/integration`: the same 52 files / 147 tests fail on the unmodified baseline (file watchers, application backend, migrations, fixture-shape drift).
  - Web `test:nuxt`: the same 5 files fail on baseline (`WorkspaceAgentRunsTreePanel.regressions`, `StartupDelayLifecycle`, `org-definition-navigation`, `app-font-size-fixed-px-audit` (token-usage files only), `workspace-history-draft-send`).
  - `pnpm typecheck` in the server fails on baseline with TS6059 rootDir errors from `tsconfig.json` including `tests`. `tsc -p tsconfig.build.json --noEmit` is clean.
  - Web `vue-tsc` has a 378-error baseline, none in new or changed code.

## Local Implementation Checks Run

All implementation-scoped; none is API/E2E sign-off.

- Contracts:
  - `pnpm -C autobyteus-agent-presentation-contracts test`: build + 2/2 pass.
  - `pnpm -C autobyteus-team-stream-contracts test`: build + 3/3 pass.
  - The committed `dist/` was regenerated by these builds.
- Server typecheck: `npx tsc -p tsconfig.build.json --noEmit` (autobyteus-server-ts) → exit 0.
- Server focused suites (all pass):
  - `tests/unit/agent-execution/backends/claude/` (16 files, 177 tests)
  - `tests/unit/agent-execution/backends/antigravity/` (12 files, 136 tests; 3 live files skipped as usual)
  - `tests/unit/agent-execution/domain/agent-background-task.test.ts`
  - `tests/unit/agent-team-execution/team-agent-background-task-admission.test.ts`
  - `tests/unit/agent-execution/events/lifecycle-status-event-transformer.test.ts`
  - Codex reasoning-block boundary rows
- Server full `npx vitest run tests/unit tests/integration`: 585 files pass. The 52 failing files are identical to the untouched baseline (see Environment).
- Web full `NUXT_TEST=true npx vitest run`: 506 files / 3244 tests pass. The 5 failing files are identical to baseline. The new or changed specs all pass:
  - `agentBackgroundTaskStore.spec.ts`
  - `backgroundTaskHandler.spec.ts`
  - `BackgroundTaskPanel.spec.ts`
  - `ProgressPanel.spec.ts`
  - `RightSideTabs.spec.ts` (no tab switch)
  - `TeamStreamingService.spec.ts` (member isolation)
  - `AgentStreamingService.spec.ts`
  - `localization/messages/__tests__/backgroundTaskPanelCatalog.spec.ts`
- Web localization:
  - `pnpm guard:localization-boundary` → Passed.
  - `pnpm audit:localization-literals` → Passed with zero findings.
- Static audit (AC-003): `git grep -E "TODO_LIST_UPDATE|agentTodoStore|todoHandler|TodoListPanel|types/todo|TURN_TASK_PROGRESS_UPDATED"` over the server, web and three contract packages. It finds no source or dist match; the only hits are the two rejection tests noted above.

New tests by AC:

| AC | Test |
| --- | --- |
| AC-001, AC-002 | `ProgressPanel.spec.ts`, `BackgroundTaskPanel.spec.ts`, browser probe BT-UI-001 |
| AC-003 | static audit above |
| AC-004 | `codex-reasoning-block-converter.test.ts` row "unmapped plan delta" (`item/plan/delta` → preserved/no event) |
| AC-007, AC-008 (unit level) | `claude-background-task-registry.test.ts`, `claude-session.test.ts` "emits background-task snapshots…", `claude-session-event-converter.test.ts` |
| AC-009 | `team-agent-background-task-admission.test.ts`, `TeamStreamingService.spec.ts` "adds a member background task only to that member AgentRun" |
| AC-010 | registry "never lists foreground tasks…", session test (foreground `task_started`/`task_notification` produce nothing) |
| AC-011 | registry `clear()` test; session "marks still-running background tasks stopped on terminate cleanup / unexpected exit" |
| AC-012 | registry concurrent test, store test, panel test, probe BT-UI-003 |
| AC-013 (unit level) | `agy-task-exit-message-reader.test.ts` (P3/P4 shapes, partial retry, other shapes, oversized, symlink, confinement) |
| AC-013 (unit level, cont.) | `agy-background-task-monitor.test.ts` (running, exit 0 → completed, exit 3 → failed, idle stop, early exit, fail-safe, `stopAll` inertness, throwing scanner) |
| AC-013 (unit level, cont.) | `agy-stream-event-converter.test.ts` (reported steps; interrupt reports none) |
| AC-013 (unit level, cont.) | `agy-turn-lifecycle.test.ts` (running after `TURN_COMPLETED`; completed from exit message; stopped delivered before `terminate()` resolves; stopped on interrupt and on process close) |
| REQ-004 | lifecycle transformer test "treats background-task updates between turns as non-activity" |
| QR-002 | registry ignores `task_progress` (asserted in the running test) |
| REQ-005 | `backgroundTaskPanelCatalog.spec.ts` (en/zh-CN parity, no TodoListPanel keys) |

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: right-panel Activity tab (`ProgressPanel`) for a selected run: Background Tasks section above the Activity feed.
- Approved UI/UX, interaction, requirement, or design references:
  - requirements "UI, Interaction, And Experience Requirements"
  - REQ-001, REQ-002, REQ-010
  - DEC-004, DEC-006, DEC-008
  - design-spec example "UI" row
- Existing design system, shared components, and adjacent product surfaces reviewed:
  - `ActivityFeed.vue` header (copied pattern: chevron, bold xs title, right-aligned count, gray hover)
  - `ToolActivityItem.vue` status icons/colors (heroicons check/x/stop; blue/green/red/gray)
  - `CompactionActivityItem` `motion-safe:animate-spin`
  - former `TodoListPanel.vue` layout
- Testing guideline and rendered surface used:
  - TESTING.md: "Renderer UI … Web unit tests + a browser dev-path probe".
  - New probe `pnpm -C autobyteus-web test:e2e:background-tasks-panel`. It starts its own Nuxt dev server with no backend and renders the production `ProgressPanel` at right-panel width. It delivers `BACKGROUND_TASK_UPDATED` through the production `dispatchAgentStreamMessage` projector.
- States, layouts, viewports, and interactions inspected:
  - Default (section collapsed, Activity expanded, 0 counts, no To-Do text).
  - Expanded empty state.
  - Live running entry (run status unchanged).
  - Mixed running/completed/failed, newest first, with the count update.
  - Long description truncation with the full text in `title`.
  - Long summary clamped to 2 lines, expanded by click and collapsed by keyboard Enter (`aria-expanded`).
  - Per-run isolation when switching runs.
  - Accordion interplay in both directions.
  - Narrow 320px panel: one-line header, chips and counts inside the panel, no horizontal overflow.
  - 380px panel (the desktop minimum is 400px).
- Visual or interaction issues found and corrected:
  1. The collapsed summary was not clamped because a `block` class overrode `line-clamp-2`'s `-webkit-box`. Fixed, and the probe now asserts ≤ 2 lines.
  2. The header wrapped to two lines in narrow panels. Fixed: the title is `truncate`/`min-w-0` and the counts are `whitespace-nowrap`, asserted at 320px.
  3. The status chip used fixed-px `text-[11px]`. Changed to `text-xs` per the app's fixed-px typography policy.
- Supporting evidence and remaining unverified states or limitations:
  - Evidence: `implementation-evidence/background-tasks-panel/evidence.json` (all 6 scenarios Pass; Nuxt stopped; probe page removed) plus screenshots `01`–`06`.
  - Apollo "missing field" errors from the app shell's GraphQL bootstrap against the empty mock backend are classified in the probe as `ignoredMockBackendErrors` (9). Every other console error fails the probe.
  - Not verified here: the Electron desktop shell, zh-CN rendering (catalog covered by tests only), dark theme (the product has none for this panel), and real server-driven streams. Those stay with API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-007/AC-008 live:
  - A Claude agent runs `sleep 20; echo done > marker` with `run_in_background` and ends its turn. Expect one running Shell entry and 1/1 counts, with no tab switch.
  - About 20 s later the entry shows completed with the CLI summary. The existing "Background task completed: …" notice and the Claude-initiated turn still appear.
  - A failing command shows failed.
- AC-009: a Claude team member starts a background task. The entry appears only in that member's Activity tab.
- AC-010: a foreground Task subagent produces no entry.
- AC-011: terminate the run while a task runs; expect stopped. This covers RR-001: exercise the real terminate action from the history tree and the running-agents panel. Turn-level Stop must leave the entry running (MP-003).
- Capture the raw `task_type` values live on SDK 0.3.280 for a background subagent, a monitor and a workflow (RR-003). Only `toBackgroundTaskKind` would change.
- AC-013 live: rerun `probes/agy-daemon-exit-signal-probe.py` scenarios through AutoByteus:
  - (a) exit 0 → completed after about 20 s with no user input;
  - (b) exit 3 → failed, with "exited with code 3" in the summary;
  - (c) a `python3 -m http.server` daemon, then terminate → stopped.
  - The tool-call text stays "Started as a background task; still running when the turn ended.".
  - A non-daemon background command produces no entry.
- Codex run: the section shows the "No background tasks" empty state and 0 counts (AC-002).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- All live-runtime acceptance (AC-007, AC-008, AC-009, AC-011, AC-013) through real Claude/AGY runs and real WebSocket streams, preferably on an isolated desktop instance (TESTING.md rules 1–5).
- Live `task_type` capture (RR-003) and the RR-001 terminate-path check.
- Confidence classification of this package's executable coverage remains with `api_e2e_engineer` after code review.
