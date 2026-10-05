# Investigation Notes

## Investigation Meta

- Package identifier: `background-task-shell-command`
- Request / ticket: Show the shell command of a background task in the Activity → Background Tasks panel
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command` / `codex/background-task-shell-command`
- Resolved base remote / branch / revision: `origin` / `personal` / `4dee901d6163ca7053916fa1edc295afbfd7a6da` (fetched 2026-10-05)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: Worktree created from freshly fetched `origin/personal`. The shared checkout was 37 commits behind and had unrelated local modifications, so it was not used for authoring.
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Investigation status: Requirements and architecture investigation complete.

## Initial Request And Clarifications

- Original request (paraphrased from the user's message and screenshot): In the right panel, Activity tab, a background task row for a shell task shows only its description ("Wait for release workflows to complete") and the kind label "Shell". The user wants to see the actual shell command there. First investigate and experiment to find out whether the command can be obtained. If it can, show it in the frontend.
- Clarifications received: None yet.
- User-supplied facts and constraints: Screenshot of the delivery_engineer run. It shows one running task titled "Wait for release workflows to complete" with the sub-label "Shell". The chat shows Claude-style `Bash · <command>` tool cards.
- Initial ambiguity: How to display the command (truncation or expansion), and whether a command should be shown for non-shell tasks.

## Product And Domain Understanding

- Product area: autobyteus-web right-side panel → Activity tab → Background Tasks section (`ProgressPanel.vue` → `BackgroundTaskPanel.vue`).
- Affected actors or systems: The user watching an agent run. Claude and Antigravity (AGY) server runtime backends. The agent-presentation stream contract.
- Existing purpose: Show work that a runtime keeps running beyond its current turn (background shells, monitors, subagents, workflows), with its live status.
- Terminology: *Background task*: a runtime-neutral `AgentBackgroundTask` snapshot `{taskId, kind, description, status, summary, startedAt}`. *Kind*: `shell | subagent | monitor | workflow | other`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-05 | Code | `autobyteus-web/components/progress/BackgroundTaskPanel.vue` | Find what the row renders | Line 1: `description` (or "Untitled task"), plus a status chip. Line 2: the localized kind only (`kind.shell` = "Shell"). Summary appears only after the task finishes. No command field exists. | — |
| 2026-10-05 | Code | `autobyteus-web/types/backgroundTask.ts`, `stores/agentBackgroundTaskStore.ts`, `services/agentStreaming/handlers/backgroundTaskHandler.ts` | Web data model | The store has no `command` field. The store is in-memory and not persisted ("list starts empty after a reload"). Snapshots are upserted by `taskId`. | — |
| 2026-10-05 | Contract | `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts:100` | Wire contract | `BACKGROUND_TASK_UPDATED` is a **strict** zod object `{task_id, kind, description, status, summary, started_at}`. Any new field must be added to the schema. | Team contract reuses it (`autobyteus-team-stream-contracts/src/team-agent-message-dtos.ts:45`). |
| 2026-10-05 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-background-task.ts` | Server domain model | This is the runtime-neutral model plus `build…/parse…Payload`. It has no command. | — |
| 2026-10-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-background-task-registry.ts` | Claude producer | Reads `task_id`, `description` and `task_type` from `background_tasks_changed` and `task_started`. **Ignores `tool_use_id`.** `local_bash` maps to `shell`. | Command correlation is feasible (see probes). |
| 2026-10-05 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-turn-tracker.ts:238-335` | Frame routing into registry | Task frames go to `registry.observeTaskFrame(frame)`. Assistant/user frames call `registry.observeConversationFrame(frameKind, …)` with the kind only, not the frame content. | Architecture: how the registry learns tool_use inputs. |
| 2026-10-05 | Code | `.../claude/session/claude-session-tool-use-coordinator.ts:171-190` | Existing tool_use parsing | Already parses assistant `tool_use` blocks into `{invocationId, toolName, toolInput}` for tool cards. This is why chat cards show `Bash · <command>`. | Possible reuse point. |
| 2026-10-05 | Code | `.../antigravity/stream/agy-background-task-monitor.ts:55-62`, `agy-stream-event-converter.ts:254` | AGY producer | AGY `run_command` steps already use `arguments.CommandLine` as the task **description**. AGY rows therefore already show the command as the title. AGY gives no separate human description. | Preserve the AGY title. |
| 2026-10-05 | Code | `git grep BACKGROUND_TASK_UPDATED` across server/web/contracts/mobile | Consumers | Consumers: server presentation projector, team websocket projector, run-event mapper, web adapters (`teamStreamDtoAdapters.ts:86,162`), web projector, handler. Android/iOS have none. Codex/Grok/ACP/AutoByteus backends do not emit background tasks. | — |
| 2026-10-05 | Runtime | Earlier probe logs `tickets/done/remove-web-todo-panel/api-e2e-evidence/p02-claude-*.log` (CLI 2.1.280) | Prior raw frames | `task_started` for `local_bash` carries `tool_use_id`. The matching assistant `tool_use` (`Bash` or `Monitor`) has `input.command`. The `task_started`, `background_tasks_changed` and `task_notification` frames do **not** contain the command. | Re-verified live below. |
| 2026-10-05 | Command | `node evidence/probes/claude-bg-command-probe.mjs /tmp/bgcmd-probe-wd bash-bg` and `… monitor` (SDK 0.3.280, installed CLI 2.1.283, model haiku) | Live experiment | See Runtime findings. | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger | Current Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | A Claude agent runs Bash with `run_in_background: true` | CLI emits `background_tasks_changed` + `task_started` → registry publishes snapshot → stream → store → row | Row shows description (the `description` the model gave the Bash call) and "Shell". The command is **not visible** in the panel. It is visible only in the chat tool card, which may have scrolled far away. | Screenshot; panel source; probe | High |
| BEH-002 | User | A Claude agent uses the Monitor tool | Same path. `task_type` is `local_bash`, so kind is `shell`. | Same as BEH-001: no command shown. | probe-monitor.log | High |
| BEH-003 | User | An AGY agent leaves a `run_command` step running at turn end | Monitor `track()` → snapshot with description = CommandLine | The row title already **is** the command. The kind label is "Shell". | agy-background-task-monitor.ts | High |
| BEH-004 | User | Claude background subagent/workflow tasks | `local_agent` / `local_workflow` → subagent/workflow | The row shows description + kind. There is no shell command. | registry; p02/p03 logs | High |
| BEH-005 | User | A task finishes | Snapshot with status + summary | A clickable summary (2-line clamp, expandable) appears under the kind for non-running tasks. | BackgroundTaskPanel.vue | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility | Requirement Implication | Architecture Question |
| --- | --- | --- | --- |
| `agent-presentation-contracts` `BACKGROUND_TASK_UPDATED` (strict) | Wire schema | A new field is a contract change shared by single-agent and team streams | Field name/nullability. Server and web are deployed together (desktop bundle). |
| `ClaudeBackgroundTaskRegistry` | Owns the Claude task view | Must learn the command from the correlated tool_use | Registry observes tool_use inputs vs. coordinator lookup. Ordering: tool_use precedes task_started. Map bounding/cleanup. |
| `AgyBackgroundTaskMonitor` | Owns the AGY task view | Command already known (`commandLine`) | Populate command too, while keeping the title unchanged. |
| `BackgroundTaskPanel.vue` | Row rendering | New command line in the row | Truncation, tooltip, expansion, monospace. Avoid duplicating the AGY title. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- `BACKGROUND_TASK_UPDATED` payload (server domain builder/parser, presentation contract, team contract via reuse, server projectors, web adapters/handler/store type).
- Evidence: paths above.

### Structural Surfaces

- No new route/API, persistence, security boundary or ownership change. It is one additive nullable field on an existing live-only event, plus one runtime correlation inside the Claude backend.

### Potential Structural Impacts To Investigate

- API/external-contract change: Yes, additive field on a strict internal stream contract (server and web ship together). Confirm there are no external third-party consumers.
- Persistence: None. Background tasks are live-only and not persisted on server or web.
- Security/privacy: Commands are already shown in chat tool cards and stored in run history. Showing them in the panel exposes nothing new to the same user.
- Concurrency/lifecycle: The correlation map must be cleared with the registry (`clear()`) and must not grow without bound.
- Deployment/migration: None.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Evidence Path |
| --- | --- | --- | --- | --- |
| Live probe `bash-bg` | Bash `run_in_background: true`, `sleep 6 && echo BG_DONE` | At t=3.9 the assistant `tool_use` `{id: toolu_012xzi…, name: Bash, input.command: "sleep 6 && echo BG_DONE"}` appears. At t=5.4 `background_tasks_changed` appears (no tool_use_id), then `task_started {task_id: bmojuvt1t, tool_use_id: toolu_012xzi…}`. The `task_notification` repeats the same `tool_use_id`. | **The command can be obtained reliably** by matching `task_started.tool_use_id` to the earlier tool_use `id`. The first snapshot (from `background_tasks_changed`) may arrive without the command, and an update follows right after. | `evidence/probe-bash-bg.log` |
| Live probe `monitor` | Monitor tool streaming command | The `tool_use` `Monitor` `input.command` is present, and `task_started.tool_use_id` matches it. The task_type is `local_bash`. | Monitor tasks also get their command. | `evidence/probe-monitor.log` |
| Prior probe `bg-subagent` (2.1.280) | Background subagent runs Bash inside | The subagent's inner Bash tool_use is also streamed, and its `task_started` carries `tool_use_id`. That inner task is foreground (`is_backgrounded:false`), so it never enters the panel. | No change for subagent rows. | `tickets/done/remove-web-todo-panel/api-e2e-evidence/p02-claude-bg-subagent.log` |

## Stakeholder And User Evidence

| Source / Actor | Need | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (screenshot) | Know *what* a running shell task executes without scrolling the chat | Direct request | Show the command in the row | Truncation/expansion preference (DEC-001) |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version | Relevant Behavior | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Claude Agent SDK / Claude Code CLI stream-json task frames | SDK 0.3.280 pinned. CLI 2.1.280 in prior logs and 2.1.283 in the live probe. | `task_started.tool_use_id` links the task to its tool_use. The command is only in the tool_use input. | Probes | The frames are not a formally documented contract. A future CLI could drop `tool_use_id`, so absence must degrade gracefully (no command shown). |
| AGY `run_command` `arguments.CommandLine` | current | Command line of the daemon step | converter line 254 | — |

## Persisted Data And State Facts

- Affected stored subject: None. Background-task snapshots are live-only (web store not persisted; server does not persist them).
- Acceptable loss: N/A.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. This is a small display addition to an existing row.

## Product Design Findings

N/A — not applicable

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related IDs | Status | Approval Applicability |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probes/claude-bg-command-probe.mjs` | Solution Designer | Re-runnable raw-frame probe (derived from the earlier remove-web-todo-panel probe) | Feasibility evidence | REQ-002 | Evidence | Not behavior-defining |
| `evidence/probe-bash-bg.log`, `evidence/probe-monitor.log` | Solution Designer | Live frame captures | Feasibility evidence | REQ-002, AC-001, AC-002 | Evidence | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | The CLI might stop emitting `tool_use_id` on task frames. | The command would silently disappear. | Degrade to the current display (REQ-004). | Accepted |
| UNK-001 | Unknown | A Bash moved to background mid-run (auto-background / `task_updated.is_backgrounded`). | This is a correlation edge case. | Resolved in architecture: the command is captured at `task_started` regardless of `is_backgrounded` (design-spec guidance). | Resolved |

## Architecture Investigation Findings

- Project design guideline: `DESIGN.md` (repo root, read 2026-10-05). Applicable area contract: `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`. The migration guideline does not apply (no persisted data). No conflicts were found.
- Frame routing (`claude-turn-tracker.ts:50-83, 238-335`): `assistant`/`user` frames are classified `content`. `observeContent` calls `registry.observeConversationFrame(frameKind, interruptRequested)` and then `listener.turnContent(...)`. The registry receives only the kind, so it cannot see tool_use blocks today. The session does not set `includePartialMessages` (grep: none), so assistant frames carry complete `tool_use` blocks with full `input`.
- Existing tool_use parsing lives in `ClaudeSessionToolUseCoordinator` (tool-card lifecycle, consumed on tool_result). It is a different owner (chat tool presentation) with its own consumption timing. Reading it from the registry would couple the background-task view to tool-card lifecycle internals.
- Registry precedent: `descriptions` and `taskTypes` maps are keyed by taskId for every task seen (including foreground), and are cleared in `clear()`. A per-task `commands` map follows the same lifecycle.
- Bounding: a tool_use→command entry is needed only until its `task_started` (which precedes the tool_result, as probe-bash-bg.log shows) or until its `tool_result` (user frame). Releasing on tool_result keeps the map limited to tool calls in flight.
- UNK-001 resolved: a Bash moved to the background later still emitted `task_started` (with `tool_use_id`) at start. The command moves into the per-task map at that point, so a later `task_updated.is_backgrounded` finds it. `agent_execution.md:618-621` documents all three entry paths.
- Payload consumers needing the field: domain builder/parser (`agent-background-task.ts`), contract schema (`agent-presentation-message-dtos.ts:100`, reused by the team contract), server projectors (`agent-presentation-message-projector.ts:74`, `team-agent-event-websocket-projector.ts:107`; the run-event mapper passes the payload through), web `messageTypes.ts:197`, `teamStreamDtoAdapters.ts:162` (explicit field list; :86 spreads), `backgroundTaskHandler.ts`, `types/backgroundTask.ts`, `BackgroundTaskPanel.vue`.
- Docs that describe the payload: `autobyteus-server-ts/docs/modules/agent_execution.md:618-635`, `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md`, `autobyteus-web/docs/agent_execution_architecture.md:1476,1657-1659`, `autobyteus-ts/docs/agent_team_streaming_protocol.md`.
- Tests constructing or asserting snapshots (see design spec for the list): the server unit tests for the registry, AGY monitor, domain, converter and team admission; the server live E2E tests for Claude agent/team and AGY; the contracts tests; the web panel/handler/store/streaming specs; the web e2e fixture `background-tasks-panel.page.vue` plus its probe.

## Requirement Implications

- Feasibility is confirmed for Claude (Bash + Monitor) via `tool_use_id` correlation. For AGY the command is already known.
- No other runtime emits background tasks today. Non-shell tasks have no command.

## Notes For Architecture Design

- Ordering verified: tool_use (assistant frame) → `background_tasks_changed` → `task_started(tool_use_id)` → tool_result.
- The registry currently publishes on `background_tasks_changed` before `task_started`. The command will arrive in a follow-up snapshot, which is acceptable under upsert semantics.
- The strict contract requires coordinated changes across contracts, the server domain builder/parser, projectors and web adapters.
