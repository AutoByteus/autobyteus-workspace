# Requirements Document

## Document Status

- Status: `Approved` for REQ-001, REQ-002, REQ-003, REQ-005 (FU-002, FU-003, FU-005); REQ-004 (FU-004) `Ready for Approval` — DEC-003 needs the user
- Current solution revision ID: `SR-002`
- Package identifier: `followups-483-517`
- Request / ticket: Project Task `autobyteus-517` (part of `autobyteus-530`), round 2: FU-002, FU-003, FU-004, FU-005
- Requested by: `/project_task_manager`; started on the user's word in the Solution Designer's conversation (2026-11-18)
- Requirements owner: Solution Designer
- Date: 2026-11-18
- Approved by and reference: `Solution Designer within the direction (user informed)` for FU-002/003/005 — the Task's leads and the user's "continue" in the Solution Designer's conversation, 2026-11-18; FU-004 waits for the user's answer to DEC-003
- Supplements: None

## Problem And Desired Outcome

Four leftovers of autobyteus-483: load-sensitive server tests (FU-002), the Antigravity panel losing ended tasks (FU-003), possibly wrong Grok prompt wording (FU-004), a stale duplicate in the web docs (FU-005). Desired: each fixed or decided with evidence.

## Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-002 | Operational | File-event and server-start tests wait 3–5 s (test/hook defaults 5 s / 10 s); under load events take up to ~14.5 s, so tests fail outside the code | Their waits and timeouts cover the measured latency under load | What each test proves; the product code |
| BEH-003 | User | A late or reloaded panel shows no ended Antigravity task | It shows them, with their end line, like Claude and native | Live updates; `run_ended` stop on AGY stop |
| BEH-004 | System | Grok section: "completion appears in the conversation; act on it" | Says what Grok really does (probe) | The rest of the section |
| BEH-005 | Operational | `settings.md` titled "Agent Execution Architecture", holds a stale copy of Level 1–3 | `settings.md` holds only settings topics, titled for them; links still resolve | Its settings sections and their anchors; `Existing Run Configuration` |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-002 | Server suites pass on a loaded machine for the file-event/server-start tests named in the investigation notes |
| UC-003 | A user opens or reloads the Activity tab of an AGY run after a background task ended |
| UC-004 | A Grok agent is told correctly how a background completion reaches it |
| UC-005 | A reader of the web docs finds settings in `settings.md` and the architecture in `agent_execution_architecture.md` |

### Out Of Scope

Product watcher behaviour and latency; the Grok CLI probe's time-out wording (autobyteus-524 FU-002, its own Task); TESTING.md's shutdown row (524 FU-003); events that never arrive (no timeout fixes them).

### Non-Goals

Making FSEvents faster; changing any product latency promise.

### Preserved Behavior Boundary

BEH preserved columns above; DESIGN.md rule 11 (tests follow the code).

### Prerequisites

None.

### Review Authority

As the template.

## Requirements

| ID | Requirement | Behavior |
| --- | --- | --- |
| REQ-001 | The tests that wait for an OS file event or an in-process server start/close (list in investigation notes, FU-002) take their wait limit and their vitest test/hook timeout from one shared test constant sized to the measured latency under load (≥ 30 s for an event; the test/hook timeout above it). A wait ends as soon as its condition holds, so passing runs are not slower. | BEH-002 |
| REQ-002 | An assertion that compares an OS-event-driven elapsed time with a fixed product bound (`package-auto-refresh` `elapsedMs < 5000`) no longer fails on OS latency: it is turned into the shared wait (DEC-002). | BEH-002 |
| REQ-003 | The Antigravity view's current tasks include ended tasks of the run (completed, failed, stopped with `run_ended`), with their exit code and end reason, for the life of the run, as Claude and native do. | BEH-003 |
| REQ-004 | The Grok "Long-Running Commands" section states what the probe established about completion delivery (DEC-003). | BEH-004 |
| REQ-005 | `settings.md` loses the copied Level 1–3/Error Event Nuance/Related sections and gets a settings title; `Existing Run Configuration` stays in `settings.md` as a settings section; the one link to `settings.md#run-workspace-choice-on-start-surfaces` points to `agent_execution_architecture.md#start-surfaces-and-run-workspace-choice`; every other link into `settings.md` still resolves. | BEH-005 |

## Acceptance Criteria

| ID | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | (SR-002) Under the same load, every failure of base whose cause is a test wait or an elapsed bound passes on the branch; the remaining failures have a recorded cause outside the tests (an OS event that never arrives within the shared wait; the watcher's move pairing under load; an in-process server close stalling for minutes), recorded as follow-ups; each listed test passes alone | run base vs branch under the same load; diagnose each remaining failure |
| AC-002 | REQ-003 | After a task exits (and after AGY stops), `current()` still lists it with status, exit code / `run_ended`; panel opened late shows it | unit + the AGY live background suite or a probe |
| AC-003 | REQ-004 | The Grok section matches the probe; prompt tests (TESTING.md row) pass | unit + prompt tests |
| AC-004 | REQ-005 | No Level 1–3 copy in `settings.md`; a link check over all docs finds no broken `settings.md#…` / `agent_execution_architecture.md#…` anchor | link check |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | FU-003: keep ended AGY tasks? | Claude and native keep them; the panel's end line (483) is invisible otherwise; nothing else reads the list. Keep them for the run's life. | Solution Designer | Decided |
| DEC-002 | FU-002: the 5 s elapsed assertion | It times the OS event, not AutoByteus's own work; on a busy Mac it cannot hold. Replace it with the shared wait; the product's own debounce stays covered by its unit tests. | Solution Designer | Decided |
| DEC-003 | FU-004: correct the sentence or add a platform wake | Probe (Reproduced, Grok 1.0.88 over ACP as AutoByteus launches it): when the background job ended, Grok sent `_x.ai/task_completed`, started its own turn (prompt id `task-completed-<task>`, a "Background task … completed (exit code: 0)" reminder) and the agent replied — all as ordinary `session/update`s outside any client prompt. AutoByteus drops every update outside a prompt it sent (`acp-agent-session.ts:204`), so that turn is invisible: no output, no tool calls, no usage in the run, while it costs tokens. The prompt sentence is true for Grok; AutoByteus is the gap. Options: (a) only reword the sentence — leaves Grok acting unseen; (b) surface Grok's self-started turns in the run like Claude's provider-started turns (a turn opens on Grok's signal and closes on its `turn_completed`). Recommendation: (b), as its own round after FU-002/003/005, since it changes what Grok runs show. | User | Needs user |
| DEC-004 | FU-005: where `Existing Run Configuration` lives | It is a settings topic linked four times as `settings.md#…`; keep it there. | Solution Designer | Decided |
