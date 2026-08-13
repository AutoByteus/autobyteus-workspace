# Requirements Doc

## Status (`Draft`)

## Goal / Problem Statement
The `run_bash` tool currently returns a `TerminalResult` payload that unconditionally includes all properties (e.g., `stderr`, `timedOut`, `backgroundProcesses`, `stdout`) even when they are empty or default. This wastes LLM context window tokens on every successful silent command execution. The goal is to optimize the `run_bash` output payload by omitting fields that contain empty or default values, thereby reducing token consumption without losing actionable information.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | `run_bash` returns a full JSON payload including empty `stdout`, empty `stderr`, `timedOut: false`, and empty `backgroundProcesses` on a successful silent command. | `run_bash` returns a JSON payload omitting `stdout`, `stderr`, `timedOut`, and `backgroundProcesses` if they are empty/default. | `exitCode` and `effectiveCwd` are always included. Non-empty output, timeouts, or background processes are still included when present. | REQ-001, AC-001, AC-002 |

## Investigation Findings
- The `TerminalResult.toJSON()` method in `src/tools/terminal/types.ts` is responsible for serializing the result.
- Currently, it unconditionally includes `stdout`, `stderr`, `exitCode`, `timedOut`, `effectiveCwd`, and `backgroundProcesses`.
- We can safely omit `stdout` (if `""`), `stderr` (if `""`), `timedOut` (if `false`), and `backgroundProcesses` (if `[]`).
- `exitCode` and `effectiveCwd` should be retained for explicit success confirmation and context.

## Relevant Supplemental Task Artifacts

None

## Design Health Assessment (Mandatory)

- Change posture: `Performance` / `Cleanup`
- Initial design issue signal: `No`
- Root cause classification: `Local Implementation Defect` (unoptimized serialization)
- Refactor posture: `Likely Not Needed`
- Evidence basis: Code inspection of `TerminalResult.toJSON()`.
- Requirement or scope impact: Small, localized change to JSON serialization.

## Recommendations
Update the `TerminalResult.toJSON()` method to conditionally include fields based on their values.

## Scope Classification (`Small`)
Small, isolated change to a single DTO class and its tests.

## In-Scope Use Cases
- Successful `run_bash` commands with no output.
- `run_bash` commands with output, timeouts, or background processes (must still serialize correctly).

## Out of Scope
- Changing the actual execution behavior of `run_bash`.
- Modifying other tools' output formats.

## Functional Requirements

- **REQ-001**: `TerminalResult.toJSON()` must omit `stdout` and `stderr` if they are empty strings.
- **REQ-002**: `TerminalResult.toJSON()` must omit `timedOut` if it is `false`.
- **REQ-003**: `TerminalResult.toJSON()` must omit `backgroundProcesses` if the array is empty.
- **REQ-004**: `TerminalResult.toJSON()` must always include `exitCode` and `effectiveCwd`.

## Acceptance Criteria

- **AC-001**: A `TerminalResult` representing a successful, silent command (empty stdout/stderr, exitCode 0, not timed out, no background processes) serializes to JSON containing only `exitCode` and `effectiveCwd`.
- **AC-002**: A `TerminalResult` with non-empty `stdout` includes the `stdout` field in its JSON representation.
- **AC-003**: Unit tests for `TerminalResult` serialization verify the conditional inclusion of fields.

## Constraints / Dependencies
- Must not break downstream consumers that expect `TerminalResult` (though LLM agents are the primary consumer of the JSON, internal TS code uses the class properties directly, which remain unchanged).

## Persisted Data Outcome (When Applicable)

- Required outcome: `Not Affected`

## Assumptions
- LLM agents handle missing optional fields gracefully (this is standard for JSON schemas).

## Risks / Open Questions
- None.

## Requirement-To-Use-Case Coverage
- REQ-001, REQ-002, REQ-003, REQ-004 cover all in-scope use cases.

## Acceptance-Criteria-To-Scenario Intent
- AC-001, AC-002, AC-003 ensure the implementation meets the requirements.

## Approval Status
Approved by user.