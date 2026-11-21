# Requirements Document — managed Ubuntu restarts as soon as ready, like Mac

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `managed-ubuntu-immediate-restart`
- Request / ticket: Project Task autobyteus-16, Project `project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda`
- Requested by: `/project_task_manager`, on the user's direction of 2026-11-21
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer's message to the user in this run, 2026-11-21 (SR-001). The direction itself is the user's (Task description and comment).
- Exact approved baseline: this document at SR-001
- Behavior-defining supplements: None

## Problem And Desired Outcome

- Problem: since autobyteus-15, managed Ubuntu with Update automatically on waits for no busy agent and 5 minutes without input before installing and reopening. Mac installs and restarts as soon as the update is ready; busy agents get the restart notice afterwards. The user wants Ubuntu to behave like Mac.
- Desired outcome: managed Ubuntu installs and reopens as soon as the verified update is ready, also while agents are busy; runs that were busy get the existing restart notice after reopening and continue. Everything else from autobyteus-15 stays.
- Success: on a disposable managed Ubuntu guest, a signed N→N+1 update reopens on N+1 with no click while an agent is busy, and that agent gets the restart notice and continues.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Waits for no busy run and 5 min without input | Installs and reopens as soon as the verified stage is ready | Verification, signing, channel, blocked version, restart-channel requirement | F-01, F-02 |
| BEH-002 | System | SCN-002 | Busy runs at an update restart get the restart notice (Mac; on managed Ubuntu never exercised because of the wait) | Same on managed Ubuntu | Reminder content and coverage (collaboration runs) | F-05, F-06 |
| BEH-003 | User | SCN-003 | Quit stays closed; click; opt-out; failures; copy for `managed-quit` | Unchanged | All | autobyteus-15 |
| BEH-004 | System | — | Mac/Windows/portable install at once | Unchanged | All | F-04 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | Opted-in managed Ubuntu installs and reopens as soon as the update is ready | SCN-001 |
| UC-002 | Busy runs continue after that restart with the restart notice | SCN-002 |
| UC-003 | Copy describes the immediate restart | SCN-001 |

### Out Of Scope

- Mac, Windows, portable Linux behavior and copy.
- Restart-resume reminder content or coverage (application-owned runs keep recovering by their own means, as on Mac).
- Writer, signing, launcher, restart channel, sandbox, installer.
- Persisting unsent composer text.
- Release; the user's installation.

### Non-Goals

- No waiting, countdown or postpone control.

### Preserved Behavior Boundary

BEH-003, BEH-004; REQ-003..REQ-006; AC-003..AC-006. autobyteus-15 behavior other than its wait (REQ-001's timing, REQ-002, the waiting copy) stays: Quit latch and settlement, failure contract, click, opt-out, channel, blocked version, `managed-quit` mode, "Updated automatically to <version>".

### Prerequisites

None.

### Review Authority

- Every blocking finding cites an approved REQ, AC or preserved-behavior ID.
- New behavior, policy or contract is a `Requirement Gap` and needs the user's approval.
- Adjacent concerns are follow-ups unless they are prerequisites.

## Requirements

| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | **Restart as soon as ready.** Managed Ubuntu, switch on, launched by the launcher: as soon as a newer release is downloaded and verified (staged), and the version is not blocked, the app installs it and reopens on it with no click, whether or not agents are busy or the user is using the app. Switching on while a verified stage is waiting does the same at once. This replaces autobyteus-15's wait (its REQ-002) | BEH-001 | Must | Task; user |
| REQ-002 | **Busy runs continue.** Runs that were busy when that restart stopped the server get the existing restart notice after reopening and continue, as on Mac (the restart-resume coverage of autobyteus-285/448; application-owned runs recover as on Mac) | BEH-002 | Must | Task |
| REQ-003 | **Quit stays closed.** As autobyteus-15 REQ-004: a Quit before or during the restart installs and leaves the app closed | BEH-003 | Must | Task |
| REQ-004 | **Everything else kept.** Failure handling, click, opt-out, channel, blocked version, `managed-quit` mode without a restart channel, signing and sandbox checks, "Updated automatically to <version>" — as autobyteus-15 | BEH-003 | Must | Task |
| REQ-005 | **Copy.** For managed Ubuntu with a restart channel, the switch explanation uses Mac's wording ("Install new versions on your channel as soon as they are downloaded. The app restarts by itself." and its "on" form); no text mentions waiting for agents or 5 minutes; while the restart runs, the row and About show "Restarting to install…" as on Mac. English and Simplified Chinese. `managed-quit` copy unchanged | BEH-001 | Must | Task; DEC-001, DEC-002 |
| REQ-006 | **Other platforms unchanged** | BEH-004 | Must | Task |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Verification Intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Switch on, newer signed release, agent busy, user active | Verified stage → app stops, activates, reopens on N+1 with no click; row "Updated automatically to <version>" | Owner tests; guest (AC-007) |
| AC-002 | REQ-002 | AC-001 with a run mid-turn | After reopening, that run receives the restart notice naming an update and continues (a further turn completes) | Guest with scripted local inference (AC-007); server restart-resume suites stay green |
| AC-003 | REQ-003 | Quit before readiness or during the restart | Installs, stays closed | Owner tests (existing from autobyteus-15, kept); guest |
| AC-004 | REQ-004 | Switch off, channel change, blocked version, no restart channel, refused/unknown activation, click | As autobyteus-15 | Existing owner tests stay green (rewritten only where they asserted the wait) |
| AC-005 | REQ-005 | Managed with restart channel | Switch shows Mac's text in en and zh-CN; row/About "Restarting to install…" during the restart; no text mentions 5 minutes or idle agents; `managed-quit` texts unchanged | Component tests; guest screenshot |
| AC-006 | REQ-006 | Mac/Windows/portable | Native policy and copy unchanged | Existing suites |
| AC-007 | REQ-001..003 | Disposable Ubuntu 24.04 managed guest, two signed builds of this branch (N, N+1), disposable trust, loopback feed, a busy agent with scripted local inference | Reopens on N+1 with no click while the agent is busy; the agent gets the restart notice and continues; separately, Quit stays closed | As autobyteus-15's guest; never the user's installation; no release |

## Relevant Scenarios And Journeys

| ID | Kind | Trigger | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Check finds a newer release | Download → verify → stop → activate → reopen | New version running | Supported Normal | Task |
| SCN-002 | System | SCN-001 while a run is mid-turn | Stop records the run → reopen → server wakes it with the update notice → run continues | Run continues | Supported Normal | autobyteus-285/448, F-05 |
| SCN-003 | User | Quit | As autobyteus-15 | Closed | Supported Normal | autobyteus-15 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (copy only); Product design: N/A — not applicable.
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| ID | REQ / AC | Area | Requirement |
| --- | --- | --- | --- |
| QR-001 | REQ-001 | Reliability | One automatic restart per verified stage; the autobyteus-15 admission checks (stage, generation, Quit latch, switch, channel, block, restart channel) still apply immediately before it |
| QR-002 | REQ-004 | Security | No new route, privilege or renderer-callable trigger; the removed busy route leaves no endpoint behind |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. An unsent message being typed at the moment of the restart is lost, as on Mac (accepted by the user's direction).

## External Contracts And Dependencies

| Dependency | Constraint | Evidence |
| --- | --- | --- |
| Restart-resume (server) | Records busy runs at graceful stop; `update` cause from the release stamp | F-05 |

## Supplemental Artifacts

None.

## Assumptions

| ID | Assumption | Validation | Status |
| --- | --- | --- | --- |
| ASM-001 | Managed AppImage's server has the release stamp, so busy runs get the `update` notice | AC-002 on the guest | Open |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Switch wording for managed Ubuntu with a restart channel | The behavior is now Mac's; the Task asks for Mac's wording where it applies. Use Mac's existing keys (`auto.explain.app`, `auto.explainOn.app`); remove the managed waiting keys | Solution Designer | Decided |
| DEC-002 | What the row shows between readiness and reopening | Mac shows "Restarting to install…" as soon as its install starts. Show the same from the moment the automatic restart is admitted, instead of "Downloaded" while the server stops | Solution Designer | Decided |
| DEC-003 | Switching the switch on while a verified stage waits | Mac continues a downloaded update at once when switched on (autobyteus-356 REQ-002). Same here | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-007 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-007 | SCN-002 |
| REQ-003 | UC-001 | BEH-003 | AC-003, AC-007 | SCN-003 |
| REQ-004 | UC-001 | BEH-003 | AC-004 | — |
| REQ-005 | UC-003 | BEH-001 | AC-005 | SCN-001 |
| REQ-006 | — | BEH-004 | AC-006 | — |

## Architecture Phase Input

- Reuse autobyteus-15's admission checks and `finish`; remove the wait and everything only it used.
- Keep `appUpdater.ts` from growing.

## Readiness Check

- All content checks: `Yes`; Product design: `N/A`; content ready: `Yes`.
- Approval recorded: `Yes` (Solution Designer within the user's direction, user informed); ready for design: `Yes`.
