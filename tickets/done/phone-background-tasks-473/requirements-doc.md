# Requirements Document — phone-background-tasks-473 (autobyteus-473)

## Document Status

- Status: `Approved` (Solution Designer within the Task's direction; user informed)
- Current solution revision ID: `SR-001`
- Requested by: `/project_task_manager` for the user; Date: 2026-11-12
- Approved by and reference: Solution Designer within the direction (Task autobyteus-473: "the open agent's background tasks are visible … live … same data as the desktop panel … Read-only … the run's status reading … fixed or split into its own Task"); the user is informed in the Solution Designer's conversation.

## Problem And Desired Outcome

- The phone shows no background tasks; a task started before a viewer opened the run is invisible on the phone and, after a reload, on the desktop.
- Desired: on the phone, the open agent's background tasks are listed live in Activity, including tasks started before the phone opened the run; the desktop panel shows them after a reload too.

## Scope Guardrail

- In scope: UC-001 phone Activity background-task section; UC-002 a late viewer sees running tasks (event-stream runtimes).
- Out of scope: the run status reading "Idle" while a background task runs (own Task, proposed); stopping or controlling tasks; task output; runtimes that do not report background tasks (ACP: shown as not reported).
- Preserved: the desktop panel's behavior; tool-call list; Codex snapshot polling; the idle-shutdown check.
- Prerequisites: none.

## Requirements

| ID | Requirement | Behavior |
| --- | --- | --- |
| REQ-001 | The phone's Activity screen shows a "Background tasks" section above the tool calls when the open agent has any: each task with its description (or command), running / completed / failed / stopped, the runtime's end summary (for example "exit code 1") when ended, and its start time; newest first; updated live. Read-only. | BEH-001 |
| REQ-002 | Tasks are the same data as the desktop panel (one shared source). | BEH-001 |
| REQ-003 | A viewer that opens a run (or reloads) while its background tasks exist sees them at once, for Claude, AutoByteus and Antigravity runs, as Codex already does. | BEH-002 |
| REQ-004 | For a runtime that does not report background tasks (ACP runtimes), the phone shows no background-task section. | — |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | Android app, a Claude run: a background task started before the phone opens Activity is listed as running; it shows finished with its exit code when it ends | Phone/Android probe on an isolated node (scripted runtime or test-owned Claude login per TESTING.md) |
| AC-002 | REQ-001 | A task started while Activity is open appears live | Same |
| AC-003 | REQ-002, REQ-003 | Desktop: after a reload, the Progress panel lists the running task | Electron or browser probe |
| AC-004 | REQ-003 | Server: the background-task view of an event-stream run returns its current tasks (Claude, AutoByteus, Antigravity) | Server unit/e2e |
| AC-005 | Preserved | Codex snapshot view, desktop panel, tool calls unchanged | Existing suites |

## Decisions

| ID | Question | Reasoning | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Where on the phone? | Activity is where the user looked; a section above the tool calls needs no new screen | Solution Designer | Decided |
| DEC-002 | The "Idle" status while a task runs | Needs node-side status for every runtime and list, and touches message handling; the user's wording/meaning decision: its own Task | Solution Designer (Task allows the split) | Decided: split, proposed to the PM |
