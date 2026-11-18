# Investigation Notes

## Investigation Meta

- Package identifier: `followups-483-517`
- Request / ticket: Project Task `autobyteus-517` (part of `autobyteus-530`), round 2: FU-002, FU-003, FU-004, FU-005 (item 1 was delivered as `prompt-section-tests-517`)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/followups-483-517`, `codex/followups-483-517`
- Base: `origin/personal` @ `24d438fa31` (fetched 2026-11-18)
- Finalization target: `origin` / `personal`
- Trigger: the user, directly in the Solution Designer's conversation, 2026-11-18: "if we still have unfinished parts then we continue"
- Current solution revision ID: `SR-001`
- Authorities read (this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`; `TESTING.md` ("File watching on a busy Mac", "One heavy run at a time", Choosing the path); `DESIGN.md` rule 11.

## FU-005 — duplicate in `autobyteus-web/docs/settings.md`

| Source | Finding | Established |
| --- | --- | --- |
| `autobyteus-web/docs/settings.md` (2302 lines) | Title `# Agent Execution Architecture`; lines 1–867 are settings sections (Provider Credential Settings … Settings: Agent Packages Auto-Refresh); lines 868–2265 are a copy of `agent_execution_architecture.md`'s Level 1–3, Error Event Nuance and Related Documentation | Read |
| heading comparison (`comm` of `##`–`####` headings, copy vs canonical) | 28 shared headings; 20 only in the canonical doc (newer); **2 only in the copy**: `### Existing Run Configuration` (settings.md:1534) and `### Run Workspace Choice On Start Surfaces` (settings.md:1493) | Measured |
| links into the copy | `settings.md#existing-run-configuration` from `agent_orgs.md:730`, `agent_execution_architecture.md:600` and `:1549`, `chat.md:418`; `settings.md#run-workspace-choice-on-start-surfaces` from `agent_execution_architecture.md:1416` (the canonical doc has its own `### Start Surfaces And Run Workspace Choice`, line 1350) | Read |
| other links into settings.md | anchors of the settings sections (auto-refresh, model routing, agent runtimes, compaction, notification center) — unaffected | Read |

Implication: removing the copy must keep `Existing Run Configuration` (a settings topic, linked four times) and repoint the one `run-workspace-choice` link to the canonical section after comparing the two texts.

## FU-003 — Antigravity background-task view keeps only running tasks

| Source | Finding |
| --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-task-monitor.ts` | `list()` returns `this.running`; an exit deletes the task (`poll`), `stopAll()` clears the map after emitting `run_ended` snapshots |
| `agy-agent-run-backend.ts:45` | `list()` is read only by `backgroundTaskInspection.current()` (the panel's late-viewer seed, autobyteus-473) |
| Claude (`claude-background-task-registry.ts` `list()`), native (`autobyteus-background-task-reporter.ts:56`, `manager.list()` keeps ended states; `listRunning` filters them) | both keep ended tasks in `current()` |
| `tests/unit/agent-execution/backends/antigravity/agy-background-task-monitor.test.ts:42-56` | asserts the running-only list |

Implication: consistency across the three event-stream runtimes; nothing else reads AGY's `list()`.

## FU-002 — server tests that wait for OS file events or a server start under load

| Source | Finding |
| --- | --- |
| 483 FU-002 row (record copy) | failing under load 53–95 (fseventsd 130–140% CPU): `agent-package-folder-watcher.test.ts` (waitFor default 5000 ms), `skill-folder-watcher.test.ts` (`vi.waitFor` 3000 ms after fixed 500–1000 ms sleeps), `package-auto-refresh.integration.test.ts` (`AC_BOUND_MS = 5000` used as wait limit **and** `expect(elapsedMs).toBeLessThan(AC_BOUND_MS)`; "expected 14446 to be less than 5000"), `file-system-watcher.integration.test.ts` (8000/12000 ms waits), `studio-server-http-contract.integration.test.ts` (start hook / 5 s preflight; 4/4 alone) |
| 517 item 1 FU-001 | `agent-package-definitions-live-refresh.e2e.test.ts` DCF-E2E-002 (event 9992 ms vs 5000 ms); `grok-build-runtime-replay` afterAll over vitest's 10 s hook default (6/6 tests passed) |
| `native-follow-ups-524-r2` (delivered) | removed the built-server shutdown stall (watchers not closed at process exit); in-process servers that a test closes still close OS watches on the main thread and can stall seconds under an FSEvents backlog (REQ-003 there); measured event latency 2.8–12.5 s "or never"; its own FU-002 (Grok CLI probe reports its own time-out as "unsupported, update") is a product issue sent with 524, not this item |
| `autobyteus-server-ts/vitest.config.ts` | no `testTimeout`/`hookTimeout`: vitest defaults 5 s / 10 s apply to every server test |
| `TESTING.md` "File watching on a busy Mac" | already explains the cause and how to diagnose it |

Implication: the measured latency under load (up to ~14.5 s) exceeds every wait in these tests; events that "never" arrive cannot be fixed by a timeout.

## FU-004 — Grok background completion

Probe (raw ACP, `grok agent --no-leader stdio`, Grok 1.0.88, as AutoByteus launches it): see Runtime Findings below.

## Runtime, Probe, Or Reproduction Findings

| Method | Observation | Established | Evidence |
| --- | --- | --- | --- |
| `evidence/grok-acp-probe.mjs` (raw JSON-RPC; `grok agent --no-leader stdio`, Grok 1.0.88, model grok-4.7; prompt: run `bash job.sh` (60 s) with `block_until_ms 0`, end the turn, reply FINISHED when it finishes; listen 150 s after the turn) | t=21.3 s `_x.ai/task_backgrounded`; t=22.7 the prompt request returns `end_turn` (reply STARTED). t=81.4 `tool_call_update` with the job's output; t=81.5 `_x.ai/queue/changed` (`runningPromptId: "task-completed-<task>"`, text "Background task … completed (exit code: 0) … Use get_command_or_subagent_output(…)"), `_x.ai/task_completed` (task snapshot, exit 0), `background_tasks` (status completed); t=83.2–83.8 `session/update` thought and message chunks of a **new turn Grok started itself** (`_meta.promptId: task-completed-<task>`), message "FINISHED"; t=84.1 `_x.ai/session_notification` `turn_completed` for that prompt id; t=85.4 `last_turn_summary` | Reproduced | `evidence/grok-acp-probe.jsonl` (signature fields redacted) |
| Read: `autobyteus-server-ts/src/agent-execution/backends/acp/session/acp-agent-session.ts:202-204` | `onSessionUpdate`: `if (!this.isInTurn()) return;` — every update outside a client-sent prompt is dropped; `applyEffects` likewise skips usage/compaction/activity outside a turn (line 266) | Read | Grok's self-started turn (output, tool calls, usage) never reaches the run; explains 483's "no turn and no notice" |

- Probe leftovers removed: `/tmp/sd517b`, the Grok session folder `~/.grok/sessions/%2Ftmp%2Fsd517b%2Fws`; no `grok agent` process left.

## Persisted Data

Not affected (tests, docs, an in-memory view list).
