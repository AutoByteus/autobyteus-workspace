# Requirements Document — autobyteus-524, round 1: FU-003 (`run_bash` start deadline)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `native-follow-ups-524`
- Request / ticket: Project Task `autobyteus-524` (follow-ups of autobyteus-515); this round covers FU-003 only, which the Task says to do first
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), dispatched on the founder's word
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `Solution Designer within the direction (user informed)`: the founder's direction "make the deadline longer" and the PM's direction (measure, check the other short limits, no retry unless needed, clear message) set it; the numbers are decided from measurements. The founder is informed in the Solution Designer's conversation, 2026-11-17.
- Exact approved requirements baseline / solution revision: this document at `SR-001`
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: on a busy machine, when several commands start at once, `run_bash` fails with "Command did not start: Command control deadline exceeded" (or "… Process observation deadline exceeded"), exit code null, no output, although the command would have started. Cause: the start handshake has a fixed 1.5 s deadline, and every `ps` read inside it a fixed 500 ms cap. Reproduced: 60/60 and 200/200 calls failed at load ~145 (RF-001).
- Affected actors or systems: every native agent's `run_bash` (foreground and background), the native agent tests, the host's command scope.
- Desired outcome: commands that would start do start, under load; a real launch failure still fails clearly; no other surprisingly short limit remains in the command scope.
- Observable definition of success: the burst probe passes with 60 and 200 commands at once on a loaded machine (RF-005 shape).

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Start handshake must finish within 1.5 s (or the call's timeout if shorter) | Within 30 s (or the call's timeout if shorter) | A launch that errors, exits or loses control fails at once | RF-001…RF-005 |
| BEH-002 | System | SCN-001, SCN-002 | Each `ps` read is cut at 500 ms whatever the step's deadline | A read is bounded only by the deadline of the step it serves | Process-identity checks unchanged | RF-002, RF-006 |
| BEH-003 | System | SCN-002 | Observation, retirement and stop confirmation give up after 0.5–3 s | 10 s for observation and retirement, 30 s for stop confirmation | Grace periods (TERM→KILL, cancel gate, end marker) and the 3 s host-shutdown budget | RF-006 |
| BEH-004 | Contract | SCN-001 | Failure text "Command did not start: Command control deadline exceeded" | The text says the command did not start within N s (N = the limit applied) and why | Exit code null, no output, stderr carries the text | `shell-command-executor.ts:70-73` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Founder | Fewer strange failures | Longer, measured limits | Ship in the next beta on his word |
| Native agent | Run commands | Commands start under load | A real failure still reported |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A native agent (or several at once) runs `run_bash` on a busy machine | SCN-001 |
| UC-002 | A running or finished command is stopped, inspected or retired on a busy machine | SCN-002 |

### Out Of Scope

- FU-004…FU-008, FU-001, FU-002: later rounds of this Task.
- Making starts cheaper (e.g. sharing one `ps` read between concurrent starts): not needed once the limits fit (RF-005); a performance change of its own.
- Retrying a failed start (direction: only if measurement shows it is needed; it does not).
- The host-shutdown budget (3 s) and the server's 10 s shutdown bound (FU-007).
- Interactive terminal sessions (PTY, tmux): they do not use this scope.

### Non-Goals

- No guarantee for bursts larger than measured (200 commands at once at load ~160).

### Preserved Behavior Boundary

- BEH-001 preserved part: an erroring launch fails at once.
- The call's own `timeout_seconds` still bounds the start; grace periods and the shutdown budget unchanged.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | A command's start handshake may take up to 30 s, or up to the call's own timeout when that is shorter | BEH-001 | Must | Healthy starts take up to 18.4 s in a 200-command burst | RF-004, RF-005 | DEC-001 |
| REQ-002 | No single `ps` (or WSL) observation has a limit of its own: it is bounded by the deadline of the step it serves | BEH-002 | Must | The 500 ms cap fails starts even within a longer deadline | RF-001 (58/200 "Process observation deadline exceeded"), RF-002 | DEC-002 |
| REQ-003 | Observation and retirement of a command use 10 s; confirming a stopped command's group is gone uses 30 s | BEH-003 | Should | No other "strange" short limit remains | RF-006 | DEC-003 |
| REQ-004 | A start that does not complete reports "Command did not start within N s: <reason>" (N = the limit applied); a launch that fails outright still fails at once with its own reason | BEH-004 | Must | Keep the failure message clear | `anchored-command-launcher.ts:86-153` | Direction |
| REQ-005 | All the scope's limits are named in one place, each with what it bounds | BEH-001…003 | Should | The next reader sees every limit and its reason | — | DEC-003 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001 | `run-bash-burst-probe.mjs` with 60 and with 200 calls at once, built change, a loaded machine (or the burst alone) | 0 failures; every stdout complete | — | Probe run, before (fails) and after |
| AC-002 | REQ-001 | SCN-001 | A start whose handshake never completes (unit, fake launcher) | Fails after the applied limit with REQ-004's text; a `timeout_seconds` shorter than 30 caps it | — | Unit |
| AC-003 | REQ-004 | SCN-001 | A launch whose anchor errors or exits | Fails at once with its own reason, not after 30 s | — | Unit |
| AC-004 | REQ-002 | SCN-001 | A `ps` read slower than 500 ms within a longer step deadline (unit, slow runner) | The read succeeds | A read past the step's deadline fails as before | Unit |
| AC-005 | REQ-003, REQ-005 | SCN-002 | Unit | Default deadlines are the named values; stop, retirement and inspection behave as before when fast | — | Unit + existing terminal tests |
| AC-006 | all | — | `autobyteus-ts` terminal unit and integration tests, server tests that run commands | Pass (the integration tests that failed in 515's full runs now pass in a full run) | A failure unrelated to this change is recorded, not fixed here | Test suites |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Native agents (one or many), test suites | Run a command | `run_bash` call | Busy machine, several starts at once | Launch → pid → group check → START → output | Output and exit code | Real launch failure: clear error at once; hung handshake: clear error after the limit | Supported Normal Scenario | 515 FU-003, RF-001 | REQ-001, 002, 004; AC-001…004 |
| SCN-002 | System | The scope (timeout, Stop, retirement) | End a command cleanly | Timeout, user Stop, completion | Busy machine | TERM → grace → KILL → confirm gone; or retire finished group | Confirmed outcome | `unconfirmed` reported past the limit | Supported Normal Scenario | RF-006 | REQ-003; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` — N/A — not applicable for every Product design field.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, AC-001 | Reliability | 0 start failures for 200 commands started at once at load ~160 on a 10-core Mac | Measured envelope | Probe |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `ps` (macOS/Linux), WSL | Runs within the step's deadline | RF-002…RF-004 | Windows/WSL not measured (no WSL host here) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/run-bash-burst-probe.mjs` | Reproduction / AC-001 | AC-001 | Final | Evidence |
| `evidence/measure-command-start-handshake.mjs` | Step timings | REQ-001…003 | Final | Evidence |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | WSL starts behave like host starts in relation to these limits | Windows users | Not measurable here; same rule (bounded by step deadline) | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Start limit value | Too short fails healthy starts; too long delays a hung-launch report | 15 s (PM's lower end): 194/200 healthy starts exceeded it (RF-004). 30 s: covers the measured worst (18.4 s) with 1.6× margin, equals `run_bash`'s default timeout, which caps it anyway. 60 s: no measured need | 30 s. A real launch failure is not delayed (it rejects at once); only a hung handshake waits | Solution Designer (direction: "decide the number with a measurement") | Decided |
| DEC-002 | Per-read `ps` cap | Hidden second limit | Keep 500 ms; raise it; bound by the step deadline | Bound by the step deadline: one limit per step, no hidden cap | Solution Designer | Decided |
| DEC-003 | Other limits of the scope | "So no other strange short limit remains" | RF-006 classification | Deadlines that give up: observation/retirement 10 s, stop confirmation 30 s. Grace periods and the 3 s shutdown budget kept, with their reasons named next to them | Solution Designer | Decided |
| DEC-004 | Retry a failed start? | Direction: only if needed | 0 failures without retry (RF-005) | No retry | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | RF-004, RF-005 |
| REQ-002 | UC-001, UC-002 | BEH-002 | AC-001, AC-004 | SCN-001 | RF-001, RF-002 |
| REQ-003 | UC-002 | BEH-003 | AC-005 | SCN-002 | RF-006 |
| REQ-004 | UC-001 | BEH-004 | AC-002, AC-003 | SCN-001 | — |
| REQ-005 | UC-001, UC-002 | BEH-001…003 | AC-005 | SCN-001, SCN-002 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001, SCN-002. Constraints: preserved behaviors above. Deferred to design: where the named limits live; how the message names N. Facts to verify: none beyond the investigation.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (within the direction, founder informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
