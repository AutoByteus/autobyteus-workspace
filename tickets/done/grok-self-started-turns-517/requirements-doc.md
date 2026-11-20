# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (AC-006 added in SR-003; requirements approval unchanged)
- Package identifier: `grok-self-started-turns-517`
- Request / ticket: Project Task `autobyteus-517` round 3 (483-FU-004)
- Requested by: `/project_task_manager`; decided by the user in the Solution Designer's conversation
- Requirements owner: Solution Designer
- Date: 2026-11-20
- Approved by and reference: `User`; reference: the user's answers in the Solution Designer's conversation, 2026-11-20 ("If we do not have credits for grok, I would waive for grok"; "Anyways you know the best. I will follow by our reasonable suggestion"), accepting the Solution Designer's recommendation: option (b) with the live Grok check waived when there are no credits
- Exact approved baseline: this document at SR-001
- Supplements: None

## Problem And Desired Outcome

- Problem: when a Grok agent's background command ends, Grok starts a turn of its own (the agent acts on the completion), but AutoByteus drops everything outside a prompt it sent, so that turn is invisible in the run while it spends Grok usage and may run tools.
- Desired outcome: a Grok run shows such a turn like a Claude run shows the turns the Claude CLI starts itself: a notice of what woke the agent, then the agent's reasoning, text and tool calls, then the turn's end; the run reads busy while it runs.

## Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | System/User | Grok's self-started turn is dropped (no notice, no output, no tool cards, no usage, run reads idle) | It appears as a turn: notice, content, tool calls, usage, end; run busy meanwhile | Client-sent turns; DeepSeek harness (same ACP session) unchanged |
| BEH-002 | User | — | A message the user sends during such a turn is held and sent when it ends (as for any active turn) | Existing input queueing |
| BEH-003 | User | — | The user can stop such a turn with the run's stop control | Existing interrupt for client turns |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | A Grok agent's background command ends; the run shows Grok's follow-up turn |
| UC-002 | The user sends a message or stops the run during that turn |

### Out Of Scope

Self-started turns of other ACP agents (DeepSeek harness: no such behaviour known); Grok features AutoByteus does not drive (scheduler, `/loop`) beyond what the same signal covers; the Grok prompt section text (it is correct: Grok does deliver the completion).

### Non-Goals

A platform wake of its own (Grok already wakes itself).

### Preserved Behavior Boundary

BEH preserved column; Claude, Codex, AGY, native and DeepSeek runs unchanged.

### Prerequisites

None.

### Review Authority

As the template.

## Requirements

| ID | Requirement | Behavior |
| --- | --- | --- |
| REQ-001 | When Grok starts a turn while the run has no active turn, the run opens a turn, publishes a system notice carrying what woke the agent (Grok's own reminder text), and streams the turn's reasoning, text, tool calls and usage like a client-sent turn. | BEH-001 |
| REQ-002 | The turn ends when Grok reports that turn complete (completed, or interrupted when cancelled); the run returns to idle. | BEH-001 |
| REQ-003 | While that turn runs the run reads busy; a user message waits and is sent after it; the stop control cancels it. | BEH-002, BEH-003 |
| REQ-004 | The notice is recorded in the run's memory like Claude's background-task notice. | BEH-001 |
| REQ-005 | Client-sent Grok turns, and every other runtime, behave as before. | BEH-001 |

## Acceptance Criteria

| ID | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | Scripted Grok: after a client turn ends, Grok's own turn (queue signal, chunks, a tool call, `turn_completed`) produces TURN_STARTED, a SYSTEM_TASK_NOTICE with the reminder text, the segments and the tool card, usage, TURN_COMPLETED | unit (session) + E2E with the scripted Grok CLI |
| AC-002 | REQ-003 | Scripted Grok: a user message sent during that turn is delivered after it ends; stopping during it sends `session/cancel` and ends it interrupted | E2E (scripted) |
| AC-003 | REQ-004 | The notice appears in the run's memory/history after reload | E2E (scripted) |
| AC-004 | REQ-005 | Existing ACP (Grok and DeepSeek) unit and E2E suites pass | suites |
| AC-006 | REQ-003, REQ-005 | Scripted Grok: a user message held during an input turn in which a background job ends; at the hand-over the message stays held through Grok's provider turn and is delivered after it, never failed, and no second `session/prompt` goes out while one is outstanding (preserved input queueing, ARCH-REV-002 AR-005) | E2E (scripted) |
| AC-005 | REQ-001 | Live Grok run with a short background job shows the follow-up turn | live, **waived if Grok has no credits** (founder, 2026-11-20); record the attempt |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Option (a) reword or (b) show the turns | (b): Grok already acts; hiding it hides tool calls and spend | User | Decided (b) |
| DEC-002 | Live check without credits | Waived; scripted Grok proves the change | User | Decided |
| DEC-003 | Notice content | Grok's own reminder text without its `<system-reminder>` wrapper: it says what woke the agent for every kind of Grok wake | Solution Designer | Decided |
