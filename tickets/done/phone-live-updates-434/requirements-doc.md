# Requirements Document — autobyteus-434

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002` (requirements unchanged since SR-001)
- Package identifier: `phone-live-updates-434`
- Request / ticket: Project Task `autobyteus-434` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), with the user's four clues in its comments (2026-11-08)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Requirements owner: Solution Designer
- Date: 2026-11-08
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: SR-001 in `solution-revision-record.md` and the Solution Designer's message to the user in its conversation on 2026-11-08
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None (the reproduction is evidence only)

## Problem And Desired Outcome

- Problem: The user saw a running Team member's conversation on the phone "not updating" and later his own message moved to the end, after the agent's later tool calls. Investigation found three things:
  1. At 7:44 there were no new events: the agent was inside one ~10-minute command (measured on the node). Not a defect.
  2. A real stall on the phone's path: when the node is unreachable for more than ~31 s (phone asleep or in the background, network switch, Tailscale reconnecting), the run stream stops retrying for good, and the view stays frozen with no sign until the user leaves and re-opens the run (reproduced). This matches "better after navigating back and forth".
  3. A real order bug: a view that loads a run while the turn started by the user's message is still running shows that message twice, once in place and again at the end, because the node stores the message without its id for Claude, Codex and AGY runs (reproduced; the node's stored order is right).
- Affected actors or systems: the phone user (any device that loses its path to the node or loads a run during a long turn; the desktop shares the same code); the node's run history for external-runtime runs.
- Desired outcome: a running agent's new events reach the phone without the user acting, also after the phone was asleep or in the background, and a user message appears once, in its place, whenever the conversation is loaded.
- Observable definition of success: AC-001 … AC-006.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Live events reach the open phone run ~46 ms after the node | Unchanged | Yes | R1 |
| BEH-002 | System | SCN-002 | A ≤ ~30 s outage recovers and catches up | Unchanged (still catches up) | Yes | R2 |
| BEH-003 | System | SCN-002 | A longer outage: 5 attempts, then the stream stops for good; frozen view until re-open | The stream keeps trying while the page is visible and catches up once the node answers, without user action | — | R3 |
| BEH-004 | System | SCN-003 | After the phone was asleep/in the background the stream may be closed or silently dead; nothing reconnects it; a silently dead one is not even repaired by re-open | When the page becomes visible again (or the device's network comes back), every open run stream reconnects at once and catches up; after being hidden for a while it re-synchronizes even if its socket looks open | — | R3, R4 |
| BEH-005 | User | SCN-004 | Loading a run during the turn its user message started shows the message twice, the copy at the end | The message appears once, in its stored place, during and after the turn | — | R6; user's screenshots |
| BEH-006 | User | SCN-004 | The view that sent the message shows it once in place | Unchanged | Yes | R6 |
| BEH-007 | Contract | — | 403 phone-route guard and 416 Host/Origin rules allow the run streams and refuse `/ws/terminal` | Unchanged | Yes | Code, node logs |
| BEH-008 | User | SCN-001 | While the agent runs one long command no new event exists; the tool card shows running | Unchanged (correct) | Yes | Real run |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User on the phone | Watch running agents and Teams | Live without tapping; right order | No new Android permission |
| User on the desktop | Same views | Same fixes apply; nothing worse | Desktop behavior otherwise unchanged |
| Node operator | Security of Phone Access | 403/416 unchanged | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Watch a running run (top-level agent, Team member, Org member, delegated copy) live on the phone, screen on | SCN-001, SCN-002 |
| UC-002 | Come back to the phone (screen on again, app in front again, network back) and see the run's current state without acting | SCN-003 |
| UC-003 | Open or reload a run whose turn, started by the user's message, is still running, and see the message once in its place | SCN-004 |

### Out Of Scope

- The 403 phone-route guard and the 416 Host/Origin rules (not the cause; unchanged).
- Detecting a silently dead connection while the page stays visible and the screen stays on (needs a liveness heartbeat in four stream protocols): FU-001.
- Re-open repairing a silently dead stream while visible: covered by FU-001.
- Rewriting older stored user messages (they keep no id; see Data Continuity).
- Android shell changes (no new permission, no native lifecycle code); the fix lives in the shared web client and the node.
- A visible "Reconnecting…" indicator or any new UI.

### Non-Goals

- No change of how fast the node produces events or of the run list's polling (E-25 stays: nothing polls while hidden).
- No background streaming while the page is hidden (Android restricts it anyway).

### Preserved Behavior Boundary

BEH-001, BEH-002, BEH-006, BEH-007, BEH-008; REQ-005. Cross-cutting: a stream closed by the node with a non-retryable code (4004, 4005) is not retried; Org and collaboration streams keep reporting their error to a waiting command as today.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | While a run view keeps a run stream and the page is visible, the stream never stops trying to reconnect after it closed (except for a non-retryable close); the wait between attempts grows and never exceeds 30 s. When the node answers again, the view catches up (the node's snapshot) without user action. Applies to the agent, Team, Org and delegated-copy (collaboration) run streams. | BEH-003 | High | The reproduced stall | R2 shows catch-up on reconnect; R3 shows the give-up | DEC-001, DEC-002 |
| REQ-002 | When the page becomes visible again or the browser reports the network back (`online`), every kept run stream that is not connected reconnects at once (the wait resets). A stream whose page was hidden for 30 s or longer re-synchronizes at once on becoming visible, even if its socket looks open (reconnect and snapshot). While the page is hidden, run streams do not retry. | BEH-004 | High | Background/asleep phone; silently dead sockets left behind | R2/R3 snapshot catch-up; phone shell already uses visibility (E-25) | DEC-003, DEC-004 |
| REQ-003 | (Reserved; dropped in SR-001 — re-open recovery of a visible silently dead stream is FU-001.) | — | — | — | — | DEC-005 |
| REQ-004 | A user message that an external-runtime run (Claude Agent SDK, Codex, AGY) received is stored with its message id and dedupe key, so any view that loads the conversation while the message's turn is still running shows it once, in its stored place, and still once after the turn ends. | BEH-005 | High | The reproduced order/duplicate bug | R6; reader chain already carries the id | DEC-006 |
| REQ-005 | Nothing else changes: live delay on an open run (BEH-001), short-outage catch-up (BEH-002), the sending view's single copy (BEH-006), 403/416 (BEH-007), no polling while hidden, Org/collaboration error report to a waiting command, non-retryable closes. | BEH-001, 002, 006, 007 | High | Preserve | — | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-003 / SCN-002 | Phone bundle on an isolated node with a Team member run open (screen on); the node unreachable for 45 s, then reachable; then a new event | The event appears on the phone within 35 s after the node is reachable again, without user action; later events within 1 s | Before the fix: not shown in 60 s (R3) | Browser probe on the phone bundle (R3 shape) + unit tests of the reconnect policy |
| AC-002 | REQ-001 | SCN-002 | Same as AC-001 for a top-level agent run, an Org member and a delegated copy | Same outcome for each | — | Unit tests per stream owner; probe for at least the agent run and Team member |
| AC-003 | REQ-002 | BEH-004 / SCN-003 | Page hidden for ≥ 30 s while the run works (events happen meanwhile, and the old connection is dead without close), then visible | Within 5 s of becoming visible the phone shows every event that happened meanwhile and the next live event within 1 s | Hidden < 30 s with a healthy socket: no reconnect | Browser probe (visibility emulated + R4-style dead path); emulator check with the app sent to background ≥ 2 min and the screen off |
| AC-004 | REQ-002 | SCN-003 | Page hidden while the node is unreachable | No reconnect attempt while hidden; on visible, an attempt at once | — | Unit test (fake timers, visibility) |
| AC-005 | REQ-004 | BEH-005 / SCN-004 | A user message starts a 30 s turn on an AGY (scripted) run; a second client opens the run during the turn; and again after the turn | The message appears exactly once, before the turn's tool call, in both; the node's stored user record has `message_id` and `dedupe_key` | Before the fix: 2 copies, the second at the end (R6) | Server unit/integration test of the recorder + browser probe (R6 shape) |
| AC-006 | REQ-005 | BEH-001, 002, 006, 007 | Existing behavior | R1 delay ≤ 1 s; R2 catch-up; sending view single copy; `/ws/terminal` refused for a phone credential while the run streams open; no list poll while hidden; a 4004 close not retried | — | Existing suites (mobile-shell probe, route-policy tests, WebSocketClient tests) stay green; add the 4004 case if missing |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User on the phone | Watch a running member | Run list → tap a running Team member | Run active | Agent works; events stream | Each event shows ~immediately; nothing while one long command runs | — | Supported Normal Scenario | User's report; R1; real run | REQ-005 / AC-006 |
| SCN-002 | System | Network / node | The path to the node drops and returns while the screen is on | Wi-Fi↔LTE, Tailscale reconnect, laptop asleep, node restart | Run screen open, visible | Stream closes; node unreachable > 30 s; node back | View catches up without the user; then live | Non-retryable close: stays closed (as today) | Supported Normal Scenario | R3 | REQ-001 / AC-001, AC-002 |
| SCN-003 | User | User on the phone | Come back after the phone slept or the app was in the background | Screen on / app to front / network back | Run screen open, hidden ≥ 30 s | Page visible | View shows what happened meanwhile within seconds, then live | Hidden briefly with a healthy socket: nothing extra | Supported Normal Scenario | Task ("also after the app was in the background"); R3/R4 | REQ-002 / AC-003, AC-004 |
| SCN-004 | User | User (phone or desktop) | See his message in its place | Open/reload a run, switch node and back, a second window | His message started a turn still running | Load the stored conversation; live input state lists the message | One copy, in place, during and after the turn | — | Supported Normal Scenario | User's 7:58 screenshot; R6 | REQ-004 / AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no new UI; existing views behave correctly).
- Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Reliability | Reconnect wait ≤ 30 s; catch-up after the node answers ≤ 35 s | Visible page | Probe + unit |
| QR-002 | REQ-002 / AC-003 | Reliability | Catch-up ≤ 5 s after becoming visible | Hidden ≥ 30 s | Probe + emulator |
| QR-003 | REQ-002 / AC-004 | Operability (battery) | No reconnect attempts while hidden; at most one attempt per 30 s per stream while visible and failing | — | Unit |
| QR-004 | REQ-005 | Security | 403/416 unchanged; no new Android permission | — | Existing route-policy tests |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — new user records of external-runtime runs gain two optional keys the format already defines.
- Data or state that must be preserved: every existing raw trace record stays readable and unchanged.
- Loss, reset, rebuild, or regeneration that is acceptable: older user records keep no id; their only effect (BEH-005) needs a turn that started before the node update to still run after it, and a node update ends running turns. No rewrite of old records.
- Retention, privacy, compliance, volume, downtime, or operational constraints: none new (the id is a random message id already sent over the stream and stored by the native runtime).
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Page Visibility API / `online` event in Chrome and the Android WebView | Fire on background/foreground, screen off/on, network back | Phone shell already depends on `visibilitychange` (E-25) | `online` only on full loss; visibility is the main trigger |
| Node run streams | Snapshot on every connect | Code + R2/R3 | None |
| Raw trace format (`RawTraceItem`) | Optional `message_id`, `dedupe_key` on user records | `autobyteus-ts/src/memory/models/raw-trace-item.ts` | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/repro/phone-live-repro.mjs` | Reproduction (R1–R6) for implementation and validation to start from | AC-001, AC-003, AC-005, AC-006 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The Android WebView fires `visibilitychange` when the app goes to the background or the screen turns off, and back | REQ-002 trigger on the real app | Emulator check (API/E2E), AC-003 | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Is this a 403/416 regression? | The Task's first lead; would need a PM alert | 0 refusals in all node logs; routes allowed in code; R1 46 ms on the real phone bundle with credential | Not a regression; no change to 403/416; no alert needed | Solution Designer | Decided |
| DEC-002 | Give up after N attempts, or keep trying? | Giving up is the stall | The node change feed already retries forever (≤10 s); a phone regularly loses its path for > 30 s | Keep trying while visible, capped at 30 s; stop while hidden (QR-003). Industry practice for live views (resume on visibility, capped backoff) | Solution Designer | Decided |
| DEC-003 | Re-sync on becoming visible even if the socket looks open? | A sleeping phone leaves dead sockets (R4) that nothing detects | Cost: one reconnect + snapshot per stream per wake; benefit: always current after wake | Yes, after ≥ 30 s hidden (short glances cost nothing) | Solution Designer | Decided |
| DEC-004 | Apply to Org and collaboration streams too? | The phone opens Org members and delegated copies; same give-up flaw | Consistency across similar surfaces | Yes, one shared rule; keep their error report to a waiting command | Solution Designer | Decided |
| DEC-005 | Detect a silently dead socket while visible (heartbeat) in this ticket? | R4 while screen on | Needs new messages in four stream protocols (server + contracts + client); rare; the user's case is covered by REQ-001/002 | Follow-up FU-001, not here | Solution Designer | Decided |
| DEC-006 | Order bug in this ticket or separately? | PM asked; different cause (server recording), not phone-specific | Small, same user-visible conversation; PM's direction: keep unless a different cause, then tell the PM | Keep in this ticket (small, the user reported it here); tell the PM it is a separate cause and offer to split | Solution Designer | Decided |
| DEC-007 | A visible "Reconnecting…" sign? | Would tell the user | New visible UI = user/product decision; not needed once the view recovers by itself | Not in this ticket | Solution Designer | Decided (no UI) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-003 | AC-001, AC-002 | SCN-002 | R3 |
| REQ-002 | UC-002 | BEH-004 | AC-003, AC-004 | SCN-003 | R3, R4 |
| REQ-004 | UC-003 | BEH-005 | AC-005 | SCN-004 | R6 |
| REQ-005 | UC-001…003 | BEH-001, 002, 006, 007, 008 | AC-006 | SCN-001 | R1, R2 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001 … SCN-004.
- Constraints to preserve: REQ-005; no Android shell change; no stream-protocol change.
- Decisions deferred to architecture: where the shared reconnect/resume rule lives and how each of the four stream owners uses it; how the recorder gets the identity.
- Technical facts to verify: the snapshot catch-up path of Org and collaboration streams after a reconnect; whether any caller relies on `Max reconnection attempts reached`.
- Known risks: retries while visible against a removed node (bounded by QR-003).

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

- Approval recorded: `Yes` (Solution Designer within the direction, user informed; SR-001)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
