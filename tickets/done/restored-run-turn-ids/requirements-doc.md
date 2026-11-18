# Requirements Document — autobyteus-526 round 1

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package: `restored-run-turn-ids`; Request: Project Task `autobyteus-526` round 1 (founder's dispatch comment 2026-11-18)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user
- Approved by and reference: `Solution Designer within the direction (user informed)`, 2026-11-18: the Task fixes the outcome (unique turn ids across restores, proven in the web view; the reminder's time in the reader's local time); the decisions below are solution details within it
- Baseline: this document at SR-001

## Problem And Desired Outcome

- Problem: after a restart, a restored native run numbers its next turn `turn_0001` again; the conversation view then shows the restart reminder twice and hides a reply. The reminder's time reads in UTC while the reader reads local time.
- Desired outcome: each turn of a run has its own id across any number of restores, and the conversation (desktop and phone) shows each turn once, live and after a reload; the reminder card shows its time in the reader's local time zone on desktop and phone.

## Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | restored native run restarts at `turn_0001` | continues after the highest stored `turn_NNNN` | id format `turn_NNNN`; numbering of new runs |
| BEH-002 | reminder card twice, a reply hidden (live and reload) | each turn shown once | everything else in the conversation |
| BEH-003 | card shows `2026-11-17 12:10 UTC` | card shows the time in the viewer's zone, e.g. `18 Nov 2026, 06:41 CET` | the agent's text keeps UTC (the agent knows no zone); memory unchanged |

## Scope Guardrail

- In scope: UC-001 unique turn ids for restored native runs; UC-002 the reminder card's time in local time (desktop and phone).
- Out of scope: FU-001, FU-004, FU-007, FU-008, FU-009 (later rounds); rewriting stored traces of runs restored before the fix; other runtimes (their turn ids are already unique: Claude `${runId}:turn:${uuid}`).
- Non-goals: localizing other notices' text.
- Preserved: BEH-001/003 preserved columns; turn ids already stored.
- Prerequisites: None.

## Requirements

| ID | Requirement | BEH | Source |
| --- | --- | --- | --- |
| REQ-001 | A native run's next turn id is one higher than the highest `turn_NNNN` among its stored traces (archive and active file); a new run starts at `turn_0001` | 001 | Task |
| REQ-002 | After restarting a native run twice, the desktop and phone conversation views show every turn once (the reminder once per restart, every reply), live and after a reload | 002 | Task |
| REQ-003 | The restart reminder card shows its restart time in the viewer's local time zone (date, time, zone abbreviation) on desktop and phone; the stored and model-facing text stays UTC | 003 | Task, DEC-002 |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | a native run with stored turns up to `turn_0003`, restored, takes `turn_0004`; archived segments counted; new run `turn_0001` | unit (memory manager) |
| AC-002 | REQ-002 | isolated node, native run restarted twice: before (base) the card doubles and a reply is hidden; after, each shows once, desktop and phone, live and after reload; traces show distinct ids | live E2E + desktop and phone probes |
| AC-003 | REQ-003 | with the viewer's zone set to Europe/Berlin, a reminder created at `05:41 UTC` shows `06:41` with `CET`; desktop and phone; the agent's request still carries `05:41 UTC` | component test + probes |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Fix the id source or make every layer tolerate duplicates? | Every layer assumes one id per turn; fixing the source restores that invariant with one small change and no data rewrite | Solution Designer | Decided |
| DEC-002 | Local time where? | Only the reader (desktop or phone) knows its zone; the server (Docker nodes often in UTC) does not. The card localizes the time it shows; the agent keeps UTC | Solution Designer | Decided |
| DEC-003 | Runs restored before the fix | Their stored duplicate ids stay (no stored-data change without the user's approval); validation reports whether their old turns still render merged, and the user is told | Solution Designer | Decided |
