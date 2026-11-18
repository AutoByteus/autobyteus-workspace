# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `prompt-section-tests-517`
- Request / ticket: Project Task `autobyteus-517`, item 1 (dispatched 2026-11-18)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's words
- Requirements owner: Solution Designer
- Date: 2026-11-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user on 2026-11-18, within the founder's words in the Task comments ("if the fix is extremely easy, just fix it"; TESTING.md rule "only if it is easy")
- Exact approved baseline: this document at SR-001
- Supplements: None

## Problem And Desired Outcome

- Problem: the server E2E test `configured-skill-on-demand-loading.e2e.test.ts` fails (`:291:70`) because its exhaustive list of the native run's prompt headings misses `## Long-Running Commands`, which autobyteus-483 added. The failure was waived for beta.9 and beta.10.
- Desired outcome: the test passes against the current product; no other prompt-section test is stale; TESTING.md tells the next prompt change to run every test that asserts exact prompt sections.

## Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | E2E fails at `:291:70` | passes | the product prompt (unchanged); the test's other assertions |
| BEH-002 | TESTING.md has a "search every layer" row for exact tool lists, none for prompt sections | a row for a change to a runtime's system prompt | the rest of TESTING.md |

## Scope Guardrail

### In-Scope Use Cases

| ID | Use Case |
| --- | --- |
| UC-001 | The native prompt-section E2E test matches the product |
| UC-002 | The next change to a runtime's system prompt finds every exact prompt-section assertion |

### Out Of Scope

FU-002 (tests under load), FU-003 (Antigravity ended tasks), FU-004 (Grok completion wording), FU-005 (`settings.md` copy): later, per the dispatch. Any product prompt change.

### Non-Goals

A new durable meta-test of the prompt-section suites (the TESTING.md row is the chosen check).

### Preserved Behavior Boundary

Product code unchanged (DESIGN.md rule 11: tests follow the code).

### Prerequisites

None.

### Review Authority

As the template: blocking findings cite REQ/AC; new behavior is a Requirement Gap.

## Requirements

| ID | Requirement | Source |
| --- | --- | --- |
| REQ-001 | The expected heading list at `configured-skill-on-demand-loading.e2e.test.ts:291` includes `"## Long-Running Commands"` between `"## File And Directory Practice"` and `"## Skills"`; nothing else in the test changes. | Task item 1 |
| REQ-002 | Every other test that asserts a complete list of prompt sections matches the product. (Finding: there is none; recorded, no change.) | Task item 1 |
| REQ-003 | TESTING.md "Choosing the path" gets one row: a change to a runtime's system prompt (the composer and its sections in `autobyteus-server-ts/src/agent-execution/prompt/`, or the section a backend passes) is proven with the prompt unit tests plus a search of every test layer, gated suites included, for exact prompt-section assertions (`match(/^## .+$/gm)`, `processedSystemPrompt`, `carpenterSystemPrompt`, prompt snapshots), running each file found. | Task item 1 ("only if easy": it is one row) |

## Acceptance Criteria

| ID | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | The reproduction command passes 4/4 | run it |
| AC-002 | REQ-002 | The heading search lists no other exhaustive assertion; the prompt unit tests (`tests/unit/agent-execution/prompt`, the five backend prompt tests, member-collaboration parity) pass | run them |
| AC-003 | REQ-003 | The row is present, short, global (TESTING.md's update rule), committed on its own as `docs(testing): …` | review |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Rule or durable test? | A meta-test would need to know which suites read prompts and run E2E from a unit test; the existing tool-list row shows the project's way: one TESTING.md row naming the search. Recommendation: the row. | Solution Designer | Decided |

## Readiness Check

- Content ready: `Yes`; approval recorded: `Yes` (within the direction, user informed).
