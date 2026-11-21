# Requirements Document — managed Ubuntu automatic install and restart

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `managed-ubuntu-auto-restart`
- Request / ticket: Project Task autobyteus-15, Project `project_de48ed0e-f4a2-43d7-b22a-4c162c9b1dda`
- Requested by: `/project_task_manager` (Project Task Manager), on the user's clarification and comment of 2026-11-21
- Requirements owner: Solution Designer
- Date: 2026-11-21
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer's message to the user in this run, 2026-11-21 (SR-001)
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: on the protected (managed) Ubuntu installation, turning on **Update automatically** only downloads and verifies a new version and then shows "Ready for your next quit. AutoByteus will not reopen automatically." The user must quit or click **Install and restart**. On Mac the same switch installs and restarts by itself. The user has clarified that the switch is consent to install and reopen without a click.
- Affected actors or systems: the desktop user on managed Ubuntu; agents running in the app's embedded server.
- Desired outcome: on managed Ubuntu, with the switch on, a verified new version installs and AutoByteus reopens on it **by itself**, at a moment when doing so interrupts no active work. During work it waits, then restarts without any click. An intentional Quit still leaves the app closed. Opt-out, signing and sandbox behavior are unchanged.
- Observable definition of success: in a real managed Ubuntu installation, a signed old→new update waits while an agent works, then reopens on the new version with no click, and the update row says "Updated automatically to <version>".

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002, SCN-003 | Switch on: download → verify → stage → "Ready for your next quit"; never restarts by itself | After the stage is verified, the app installs and reopens by itself once no active work is going on (REQ-001, REQ-002) | Download and verification while work continues; signed, strictly newer, channel-matched activation only | F-01, F-02, F-04 |
| BEH-002 | User | SCN-004 | Ordinary Quit with a stage and the switch on installs and stays closed | Unchanged, also during the wait and during an automatic restart that has begun (REQ-004) | Quit stays closed | F-02 |
| BEH-003 | User | SCN-005 | Install and restart click installs now and reopens | Unchanged; still offered while the automatic restart waits (REQ-005) | Manual path | F-02, F-06 |
| BEH-004 | User | SCN-006 | Switch off / channel change discards the pending stage; manual Download/Install offered | Unchanged; also cancels a waiting automatic restart (REQ-006) | Opt-out | BEH-004 notes |
| BEH-005 | System | — | Mac/Windows/portable AppImage install and restart as soon as downloaded | Unchanged (DEC-005) | Entirely | F-03 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user, switch on | Stay current without clicks | New version installed and reopened by itself | Never while they or their agents are working; Quit stays closed |
| Desktop user, switch off | Update by hand | Today's manual behavior | Unchanged |
| Agents in the embedded server | Finish their turns | Not cut off by an automatic restart | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Opted-in managed Ubuntu app installs a verified update and reopens by itself when no work is active | SCN-001 |
| UC-002 | The automatic restart waits while an agent works or the user uses the app, then proceeds without a click | SCN-002, SCN-003 |
| UC-003 | Failures and unavailable restart during the automatic path | SCN-007 |
| UC-004 | Notification and setting copy for managed automatic updates | SCN-001..SCN-007 |

### Out Of Scope

- Mac, Windows and portable (unmanaged) Linux update timing and copy (DEC-005; FU-001).
- The writer, signing keys, release records, AppArmor profile, systemd socket, installer and sandbox.
- Docker node and agent runtime automatic updates.
- Persisting composer drafts across restarts.
- Releasing a version or changing the user's own installation.

### Non-Goals

- No upper bound that forces a restart during active work (DEC-002).
- No countdown or "postpone" control (DEC-006).
- No resumption change: busy-run resume (autobyteus-285) is not relied on, because the restart waits for no busy run.

### Preserved Behavior Boundary

BEH-002, BEH-003, BEH-004, BEH-005; REQ-004, REQ-005, REQ-006, REQ-008; AC-004, AC-005, AC-006, AC-009, AC-010. Invariant: an automatic restart only ever activates a stage that passed the existing writer verification, after the existing re-checks of switch, channel and blocked version immediately before activation.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | **Automatic install and reopen.** Managed Ubuntu, switch on: when a newer release on the app's channel is downloaded and verified, the app installs it and reopens on the new version by itself, without a click and without the user quitting, as soon as no active work is going on (REQ-002). After reopening, the update row says "Updated automatically to <version>" (new until seen), as on Mac | BEH-001 | Must | User's clarification: the switch is consent | Restart path (stop server, writer activation, launcher reopen) exists and was verified in autobyteus-5 API-05 | Task; comment; DEC-001 |
| REQ-002 | **Safe moment.** No active work means both: (a) no agent run of this app's own server is busy, that is mid-turn (initializing or running) or with a running background task, in any kind of conversation (agent, team, Org, application); and (b) nobody has used an AutoByteus window with keyboard or mouse for **5 minutes**. While either holds, the app waits, with no upper bound; when both clear, it restarts with no further click. Download and verification continue during work as today | BEH-001 | Must | "Without interrupting active work": a restart ends agent turns and loses unsent typing (F-09) | Busy definition exists server-side (F-05); in-app input events exist in Electron 42 (ASM-001, verified in architecture/validation) | Task; DEC-001, DEC-002 |
| REQ-003 | **Failures.** A failed download or verification behaves as today (no restart; tried again at the next check). An activation that the writer refuses, or whose outcome is confirmed as the old version, reopens the old version and shows "Automatic update failed. Nothing was changed." with a plain reason; that version is not installed automatically again (it can still be installed by hand). An unknown activation outcome keeps today's handling: no second server, no claim of success. Without the launcher's restart channel, no automatic restart happens: the update waits for the next quit and the copy says so | BEH-001 | Must | Same failure contract as Mac (autobyteus-356 REQ-004) | Existing session outcomes (`activation-failed`, `confirmedOld`, `restart-unavailable`) | DEC-004, DEC-007 |
| REQ-004 | **Quit stays closed.** An intentional Quit while the update waits installs it and leaves the app closed (as today). A Quit that arrives after an automatic restart has begun also leaves the app closed (the update still installs) | BEH-002 | Must | User comment | Session already owns quit intent | Comment; DEC-003 |
| REQ-005 | **Click still works.** While the automatic restart waits, Install and restart remains available and installs now, as today | BEH-003 | Should | User control during a long wait | Existing button in the downloaded row | DEC-003 |
| REQ-006 | **Opt-out unchanged.** Turning the switch off or changing the channel cancels a waiting automatic restart and behaves exactly as today; with the switch off nothing restarts by itself | BEH-004 | Must | Task constraint | Existing invalidation | Task |
| REQ-007 | **Copy matches behavior.** The switch explanation, the downloaded row and About describe the managed behavior: installs and reopens by itself when no agent is working and the app has not been used for 5 minutes, or at the next quit; the "will not reopen" copy is used only when automatic restart is unavailable. English and Simplified Chinese | BEH-001 | Must | Task: align copy | — | DEC-006 |
| REQ-008 | **No weaker trust.** Signature, release-record, architecture, channel and strictly-newer checks, the writer protocol, AppArmor confinement, the renderer sandbox and the launcher-owned restart channel are unchanged; no new privilege, prompt or network contact | BEH-001 | Must | Task constraint | — | Task |
| REQ-009 | **Other platforms unchanged.** Mac, Windows and portable Linux update behavior and copy do not change | BEH-005 | Must | User comment: keep Mac | — | Comment; DEC-005 |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | Managed install, switch on, newer signed release on the channel, no busy agent, no input | After verification and 5 minutes without input, the app stops, the new version is activated and the app reopens by itself on it; the row says "Updated automatically to <version>"; no click at any point | — | Owner tests; real managed Ubuntu guest (AC-011) |
| AC-002 | REQ-002, REQ-001 | SCN-002 | As AC-001, but an agent run is busy when the stage is ready | No restart while it is busy, however long; after it finishes and 5 minutes pass without input, the app reopens on the new version with no click | A run that becomes busy before the restart begins keeps it waiting | Owner tests; real guest with a busy run (AC-011) |
| AC-003 | REQ-002 | SCN-003 | Stage ready, no busy agent, user types or moves the mouse in an AutoByteus window | No restart until 5 minutes after the last input; then restart with no click | — | Owner tests with controlled time; guest input |
| AC-004 | REQ-004 | BEH-002 / SCN-004 | Stage waiting (or automatic restart begun), user Quits | Update installs, app stays closed; next manual launch runs the new version and says "Updated automatically to <version>" | — | Owner tests; real guest Quit |
| AC-005 | REQ-006 | BEH-004 / SCN-006 | Switch off (or channel changed) before or during the wait | No automatic restart; pending stage discarded; manual Download / Install and restart as today; with the switch off from the start nothing restarts by itself | — | Owner tests; existing tests stay green |
| AC-006 | REQ-005 | BEH-003 / SCN-005 | Waiting stage, user clicks Install and restart | Installs now and reopens, as today | — | Owner tests |
| AC-007 | REQ-003 | SCN-007 | Writer refuses activation / confirmed old; unknown outcome; restart channel unavailable; download or verification fails | Refused/confirmed old: old version reopens, "Automatic update failed. Nothing was changed." with plain reason, not retried automatically for that version, manual install still offered. Unknown: no second server, no success claim. No channel: no restart, copy says ready for next quit, Quit installs. Download/verify failure: no restart, retried at next check | — | Owner tests with fake writer/launcher; guest refusal of a tampered release |
| AC-008 | REQ-007 | all | Managed, switch on/off, waiting/no channel | Copy as REQ-007 in en and zh-CN; no shown text says the app will not reopen when it will | — | Component tests; guest screenshots |
| AC-009 | REQ-008 | — | Tampered, wrong-key, older or wrong-channel release | Refused as today; no restart; old version keeps running; sandbox and confinement unchanged | — | Existing writer tests; guest check |
| AC-010 | REQ-009 | BEH-005 | Mac / Windows / portable | Existing automatic policy tests pass unchanged; copy unchanged | — | Existing suites |
| AC-011 | REQ-001..REQ-004 | SCN-001..SCN-004 | Real managed Ubuntu installation with two builds of this branch (old N, new N+1) signed with disposable test trust, served from a test feed | Observed: old version running; busy agent defers the restart; after it finishes and the quiet period, the app reopens on N+1 with no click; a separate run shows Quit during the wait stays closed | — | Disposable Ubuntu 24.04 guest as in autobyteus-5/12 (Verification Intent below); never the user's installation; no release |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal / Event | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | App | Stay current | Scheduled/launch check finds a newer release | Managed, switch on, idle | Download → verify → wait until safe → stop → activate → reopen | New version running, "Updated automatically" | SCN-007 | Supported Normal Scenario | Task | REQ-001/002, AC-001 |
| SCN-002 | System | App, agents | Do not cut off agents | Stage ready during a busy run | Agent busy | Wait → run finishes → quiet period → restart | No click needed | Run busy again before restart: keep waiting | Supported Normal Scenario | Task "deferral during work" | REQ-002, AC-002 |
| SCN-003 | User | User | Do not lose typing | Stage ready while user uses the app | User active | Wait until 5 min without input → restart | — | — | Supported Normal Scenario | F-09 | REQ-002, AC-003 |
| SCN-004 | User | User | Close the app | Quit during wait or restart | Stage ready | Stop → activate → stay closed | Closed; next launch new version | — | Supported Normal Scenario | Comment | REQ-004, AC-004 |
| SCN-005 | User | User | Update now | Click Install and restart | Waiting | As today | Reopened on new version | As today | Supported Normal Scenario | BEH-003 | REQ-005, AC-006 |
| SCN-006 | User | User | Opt out | Switch off / channel change | Any | As today | No automatic restart | — | Supported Normal Scenario | Task | REQ-006, AC-005 |
| SCN-007 | System | App, writer, launcher | Fail safely | Refusal, unknown outcome, no restart channel, failed download | Automatic path | As REQ-003 | Old version usable or app closed with no false claim | — | Supported Explicit Edge Scenario (failure contract of autobyteus-356/autobyteus-5) | F-02, F-03, F-06 | REQ-003, AC-007 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (copy only)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative details: existing row and switch layout unchanged; texts per DEC-006 (final wording may be polished by implementation if the meaning, the 5 minutes and both languages are kept).
- Illustrative content: N/A
- States: waiting (auto restart available), waiting (no restart channel), installing ("Restarting to install…"), outcome rows (existing).
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement | Conditions | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002, AC-002 | Reliability | Busy state is re-checked immediately before the restart begins; a run that turned busy in between keeps the wait | Managed | Owner test |
| QR-002 | REQ-003, AC-007 | Reliability | At most one automatic activation attempt per version per process; a failed version is never retried automatically | Managed | Owner test |
| QR-003 | REQ-008 | Security | No new privilege, prompt, network contact or renderer-callable restart trigger | Managed | Review; guest |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (existing notification record outcomes only)
- Must be preserved: profile, server data, settings, channel, switch, saved favorites, update record
- Acceptable loss: none; the wait prevents losing unsent typing and agent turns
- Unknowns: None

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence | Uncertainty |
| --- | --- | --- | --- |
| Nonroot writer and signed release records | Unchanged | autobyteus-5 | None |
| Launcher restart channel | Used for the automatic reopen as for the click | `managedRestartChannel.ts` | Absent when not started by the launcher (REQ-003) |
| Electron input events | Observe in-app input | Electron 42 typings | ASM-001 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| ID | Assumption | Why | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | In-app keyboard and mouse input in every AutoByteus window and embedded view is observable on Ubuntu Wayland and X11 | REQ-002(b) | Architecture confirms the source; API/E2E observes it in the guest | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What is "active work" that must not be interrupted? | Defines the safe moment | (A) any live agent run (runtime-update precedent, F-07); (B) busy runs only (285 definition, F-05); (C) B plus recent user input; (D) system-wide idle time | A never applies while any conversation is merely loaded. B misses a user typing a message, which a restart loses (F-09). D depends on X11 idle reporting that Ubuntu's Wayland session may not give. **C**: busy runs in any kind of conversation, plus no keyboard/mouse input in AutoByteus for 5 minutes. 5 minutes reads as "stepped away" without leaving the update pending for long once work ends | Solution Designer (Task: "Solution Designer to determine safe timing") | Decided |
| DEC-002 | Is there a maximum wait after which the app restarts anyway? | Long agent work could postpone the update | Force after N hours; or no bound | A forced restart is exactly the interruption the Task excludes; the next Quit still installs, and the click is available. **No bound** | Solution Designer | Decided |
| DEC-003 | What do Quit and the click do during the wait or an automatic restart in progress? | User comment: Quit stays closed | — | Quit always wins: installs, stays closed, even if the automatic restart already began. Install and restart stays available during the wait | Solution Designer (from the user's comment) | Decided |
| DEC-004 | Failure handling | Task asks the Solution Designer | Mac contract (autobyteus-356 REQ-004), existing managed outcomes | Same user-facing contract as Mac: old version keeps or regains running, "Automatic update failed. Nothing was changed.", not retried automatically for that version; download failures retried at the next check; unknown outcome keeps today's no-second-server rule | Solution Designer | Decided |
| DEC-005 | Should Mac also wait for active work, for consistency? | Mac restarts as soon as downloaded (user's DEC-001 of autobyteus-356: "install immediately"); Ubuntu will wait | Change Mac here; or keep Mac | The user said to change managed Ubuntu and keep Mac; Mac's timing was the user's own explicit decision. **Keep Mac unchanged**; the user-facing behavior (no click, reopen, outcome row, failure text) is the same. Whether Mac should also wait is offered as FU-001 | Solution Designer (within the comment) | Decided |
| DEC-006 | Copy | Task: align copy | Current managed copy promises no reopen | Switch (off): "Download and verify new versions on your channel, then install them and reopen AutoByteus by itself when no agent is working and you haven't used the app for 5 minutes." Switch (on): "New versions install and AutoByteus reopens by itself when no agent is working and you haven't used the app for 5 minutes, or when you next quit. Switch off to update by hand." Downloaded row / About: "Ready. AutoByteus reopens on the new version by itself when no agent is working and you haven't used it for 5 minutes." No restart channel: existing "Ready for your next quit. AutoByteus will not reopen automatically." No countdown: the restart happens when the user is away, so a countdown would not be seen | Solution Designer | Decided |
| DEC-007 | Restart channel unavailable (app not opened by the launcher) | Cannot reopen | Restart anyway and leave closed; or wait for quit | Closing the app by itself without reopening would look like a crash. **Wait for the next quit**, with the existing no-reopen copy | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | AC IDs | Scenario IDs | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-011 | SCN-001 | F-01, F-02 |
| REQ-002 | UC-002 | BEH-001 | AC-002, AC-003, AC-011 | SCN-002, SCN-003 | F-05, F-09 |
| REQ-003 | UC-003 | BEH-001 | AC-007 | SCN-007 | F-02, F-03, F-06 |
| REQ-004 | UC-002 | BEH-002 | AC-004, AC-011 | SCN-004 | F-02 |
| REQ-005 | UC-002 | BEH-003 | AC-006 | SCN-005 | F-02 |
| REQ-006 | UC-001 | BEH-004 | AC-005 | SCN-006 | — |
| REQ-007 | UC-004 | BEH-001 | AC-008 | all | F-08 |
| REQ-008 | UC-001 | BEH-001 | AC-009 | — | — |
| REQ-009 | — | BEH-005 | AC-010 | — | F-03 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-007.
- Constraints: reuse the existing managed restart path and its pre-dispatch re-checks; do not grow `appUpdater.ts` (555 lines) or `electronApplication.ts` (500 lines); no renderer-callable trigger.
- Decisions deferred to architecture: owner of the safe-moment gate; how Electron main reads busy state from the embedded server (UNK-001); input-activity source (ASM-001); how a Quit converts an in-progress automatic restart into a quit.
- Technical facts to verify: input-event coverage of all windows/views; behavior of busy-state reading when the server is unreachable (treat as busy).
- Feasibility risks: busy-state signal must cover application-owned runs, which the 285 recorder excludes.

### Verification Intent for AC-011

A disposable Ubuntu 24.04 x64 GNOME guest, installed with a test-origin build of this branch (version N) and disposable signing trust, with build N+1 served from a loopback test feed, as autobyteus-5 (API-05) and autobyteus-12 did. A busy agent through a scripted runtime or a local deterministic model endpoint (no real credentials in the guest); input through a guest input tool. Never the user's installation; no public release.

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
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction, user informed, 2026-11-21)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
