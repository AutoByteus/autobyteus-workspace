# Investigation Notes

## Investigation Meta

- Package identifier: `grok-self-started-turns-517`
- Request / ticket: Project Task `autobyteus-517` round 3 (483-FU-004), part of `autobyteus-530`
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517`, `codex/grok-self-started-turns-517`
- Base: `origin/personal` @ `ca4317a386` (fetched 2026-11-20)
- Finalization target: `origin` / `personal`
- Current solution revision ID: `SR-001`
- Authorities read (this conversation): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/architecture-design.md`, `references/design-principles.md`, `references/project-documents.md`, `DESIGN.md`, `TESTING.md`.
- Earlier round: `tickets/done/followups-483-517/` (requirements DEC-003, investigation notes "FU-004").

## Request

483-FU-004: the Grok "Long-Running Commands" section says a background completion "appears in the conversation"; in 483's live Grok run nothing showed. The founder chose option (b) on 2026-11-20 (Solution Designer's conversation): show Grok's self-started turns in the run; the live Grok check is waived if there are no Grok credits.

## Evidence

| Method | Observation | Established | Evidence |
| --- | --- | --- | --- |
| Raw ACP probe (2026-11-18), `grok agent --no-leader stdio` as AutoByteus launches it, Grok 1.0.88, grok-4.7 | After the client's prompt returned (`end_turn`, t=22.7 s), the 60 s background job ended at t=81.4; Grok then sent, with no client request: `_x.ai/queue/changed` (`runningPromptId: "task-completed-<task>"`, `runningKind: "prompt"`, `runningText`: a `<system-reminder>` "Background task … completed (exit code: 0) … Use get_command_or_subagent_output(…)"), `_x.ai/task_completed` (task snapshot), `background_tasks` (completed), then ordinary `session/update` thought/message chunks whose `_meta.promptId` is that prompt id (the agent replied "FINISHED"), `_x.ai/session_notification` `turn_completed` with `prompt_id` = that id and `stop_reason: end_turn` (t=84.1), and `last_turn_summary` | Reproduced | `evidence/grok-acp-probe.jsonl`, `evidence/grok-acp-probe.mjs` |
| Same probe, the client's own prompt | `_x.ai/queue/changed` also reports the client's prompt as `runningPromptId` while it runs (t=13.7) | Reproduced | same |
| Read `acp-agent-session.ts:202-208` | `onSessionUpdate`: `if (!this.isInTurn()) return;` — updates outside a client prompt are dropped | Read | — |
| Read `acp-agent-session.ts:210-221, 260-278` | extension notifications go through `profile.interpretExtNotification` into typed effects; outside a turn only `mcp_status` applies | Read | — |
| Read `acp-agent-session.ts:151-175, 316-323` | a turn exists only as a client prompt: `startTurn` sends `session/prompt` and ends on its response; `cancel` sends `session/cancel` | Read | — |
| Read `acp-agent-run-backend.ts:100-107, 131-139`; `agent-run.ts:357, 366-380, 448-455`; `agent-run-input-admission-state.ts:226-237` (corrected in SR-003, AR-006) | the backend reports `running` while the session has an active turn and refuses a start dispatch then (`AGENT_RUN_NOT_ACCEPTING_INPUT`); AgentRun holds input while the run reads busy (its own lifecycle) and drains it after each published batch once the run reads idle; a start dispatch the backend refuses is **failed** by AgentRun, not held | Read | — |
| Read Claude: `claude-turn-tracker.ts:296-300`, `claude-session.ts:427-432, 452-465` | a turn the Claude CLI starts itself opens a canonical turn (origin `provider`), emits `TURN_STARTED` and a `SYSTEM_TASK_NOTIFICATION` notice (`sender_id: system.claude_background_task`, the completion text), then streams as usual | Read | the pattern to follow |
| Read `agent-memory/services/runtime-memory-event-accumulator.ts:28-35` | `RECORDED_SYSTEM_NOTICE_SENDER_IDS` lists the system notices recorded in a run's memory (Claude's background-task notice among them) | Read | — |
| Read `grok-build-session-profile.ts`, `acp-agent-session-profile.ts` | the Grok profile already turns `_x.ai/*` traffic into effects (usage, compaction, MCP readiness); DeepSeek harness uses the same ACP session with its own profile | Read | — |
| Read `tests/e2e/helpers/grok-fake-cli.ts` | a scripted Grok for E2E exists; it does not emit `_x.ai/queue/changed` or self-started turns yet | Read | to extend |

| Probe 2 (2026-11-20), `evidence/grok-acp-probe2.mjs` / `.jsonl`, same launch, one session | **A** (AR-001): client turn backgrounds `short.sh` (5 s), then runs `long.sh` (20 s) in the foreground: the job ends at t=41.6 (`task_completed`, `queue/changed` still running the client prompt) and nothing is injected into the client turn; at its end (t=60.0) Grok sends `queue/changed(running none)`, `turn_completed(client, end_turn)`, `queue/changed(running task-completed-<job>, text <system-reminder>…)`, `prompt_complete(client)`, then the `session/prompt` response; the provider turn's content follows at t=61.2 ("NOTICED") and its `turn_completed` at t=61.3. **B** (cancel): a provider prompt running a 30 s foreground command receives `session/cancel` at t=117.1 and Grok sends `turn_completed(task-completed-<job>, cancelled)` at once. A 429 "sending requests too quickly" appeared on stderr at t=24.4 and Grok retried by itself | Reproduced | `evidence/grok-acp-probe2.jsonl` |

## Unknowns / Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| UNK-001 | Unknown | Other Grok self-wakes (scheduler, `/loop`, monitor events) were not probed; the signal (`queue/changed` with a running prompt id outside a client turn) is generic, so they should behave the same | live check if credits allow; otherwise waived (founder) |
| MP-001 (AR-001) | Premise | A background job ending during a client turn | **Resolved by probe 2 A**: Grok queues its own prompt after the client turn; SR-002 rule |
| RSK-001 | Risk | A client prompt sent at the moment Grok starts its own turn: Grok queues the client prompt; its output follows Grok's own turn | edge case; not designed for (no supported scenario evidence); recorded |
| RSK-002 | Risk | Grok credits: earlier runs hit "free usage exhausted" | founder's waiver: scripted fake Grok proves the change |

## Persisted Data

Not affected (live events; the notice is recorded in run memory like other system notices; no schema change).
