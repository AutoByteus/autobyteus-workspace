# Requirements Document

## Document Status

- Status: `Approved` (SR-001)
- Current solution revision ID: `SR-001`
- Package identifier: `team-interrupt-ack-602`
- Request / ticket: Project Task `autobyteus-602` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (587 FU-005, urgent)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-11-22
- Approved by and reference: Solution Designer within the direction (the Task allows "fix the acknowledgement path, or the test's expectation"); the user is informed in the conversation (2026-11-22)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- **Problem:** autobyteus-22's gated suite `team-run-follows-definition.e2e.test.ts` fails TF-04 on some machines (587: 3 of 3 on macOS), with `interruptAck: null`.
- **Cause (investigation F-1 … F-4):** the server acknowledges the interrupt after the leaving member's release, which the interrupt itself causes. The test reads the ack at the release, without waiting for it.
- **Desired outcome:** TF-04 waits for the ack it asserts, and the suite passes reliably on a loaded machine. Server behavior is unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | The Team stream acks `INTERRUPT_GENERATION` (accepted) after the command's effects | Unchanged | The ack's order and content | F-1 |
| BEH-002 | Operational (test) | TF-04 reads the ack once at the release, a race | It waits for the ack (a positive wait with the OS latency limit), then asserts it and the release | Every TF-04 assertion: accepted, released, leaving while held, no errors | F-2, F-3 |

## Scope Guardrail

- **In scope:** UC-001, TF-04's wait for the ack.
- **Out of scope:** any server change (the ack's order is right); the other cases (TF-01 … 03, 05 … 12).
- **Non-goals:** none.
- **Preserved:** BEH-001, and every assertion of TF-04.
- **Prerequisites:** none.

## Requirements

| ID | Requirement | Behaviors | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | TF-04 waits until the interrupt's `AGENT_COMMAND_ACK` arrives (limit `OS_FILE_EVENT_WAIT_MS` from `tests/helpers/os-latency-under-load.ts`, per TESTING.md), then asserts it is `accepted` for the writer. No assertion is weakened, and no fixed sleep is added | BEH-002 | High | Task scope 2; DEC-001 |

## Acceptance Criteria

| ID | Requirement | Outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | `team-run-follows-definition.e2e.test.ts` passes 12 of 12, three runs in a row on a loaded macOS (load ≥ 30) and once in a Linux container, with the documented gated command | API/E2E |
| AC-002 | REQ-001 | With the ack held back past the release, which reproduces 587's order, TF-04 still passes, and fails only if no ack arrives within the limit | A test-side check: the TF-04 receipt records the frame order, ack after `RUN_TREE_CHANGED` |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Fix the server's ack or the test? | The server's order is right: a command's ack follows its effects, as the standalone interrupt does. Acking before the interrupt's effects would claim "accepted" before it is known. The test read at another event's moment, which TESTING.md rules out. **Fix the test** (the Task's own alternative, "or test expectation per DEC-007"; DEC-007 itself, rejoin keeps the run, is unchanged) | Solution Designer | Decided (the user informed) |

## Readiness Check

All Yes. Approved at SR-001.
