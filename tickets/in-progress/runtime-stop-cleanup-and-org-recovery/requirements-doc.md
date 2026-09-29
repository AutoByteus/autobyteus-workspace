# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `runtime-stop-cleanup-and-org-recovery`
- Request / ticket: (A) stop AGY-started background processes when the AGY runtime is stopped (F-API-001); (B) fix Agent Org termination/recovery when a member runtime has died
- Requirements owner: Solution Designer (`/solution_designer`)
- Date: 2026-09-29
- Approval state and reference: Approved by the user on 2026-09-29 in the Solution Designer conversation. After the option A/B clarification the user replied: "I want to have a reasonable fix, meaning that if we add a lot of turns into some kind of process management system, then that wouldn't. But if the fix is reasonable, I'm fine. it will make our product better." This approves option A (the basic AGY background cleanup, without crash handling) together with the Org recovery scope and the recommended DEC-004 and DEC-006. The user was told these recommendations were adopted and invited to object.
- Exact approved requirements baseline / solution revision: SR-001 (this document, with the DEC resolutions below)
- Behavior-defining supplements and their approved versions: N/A — none

## Problem And Desired Outcome

- Problem A: Stopping or terminating an AGY run (or shutting down the app) ends the AGY process, but dev servers and other commands AGY moved to the background keep running, orphaned, holding ports (F-API-001).
- Problem B: When a member's runtime dies inside an active Agent Org, the Org cannot be recovered: Terminate fails and leaves the Org registered-but-inactive forever, restore then fails "already active", and messaging the crashed member is rejected. Only an app restart helps.
- Desired outcome: Stop means stop, including AGY's background processes; a crashed member never makes an Org unrecoverable.
- Observable definition of success: after Stop/Terminate of an AGY run, no process it backgrounded is still running; after a member crash, Terminate succeeds and the next message restores the Org, and the crashed member can also be continued directly.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-A1 | User | SCN-A1 | Stop/Terminate/app shutdown end AGY but its background commands survive | Every command AGY started in the background is stopped together with the AGY process whenever AutoByteus stops that process | A normal turn end leaves AGY daemons running (predecessor REQ-003) | CUR-1; F-API-001 |
| BEH-A2 | System | SCN-A2 | AGY exits on its own (crash): background commands orphaned | Unchanged. Documented limitation (DEC-001). | — | CUR-2 |
| BEH-B1 | User | SCN-B1 | Org Terminate with a dead member fails; Org stuck; restore "already active" | Terminate succeeds; Org fully stopped; history intact; next message restores the Org | Normal Terminate/restore of healthy Orgs | CUR-3; L1 |
| BEH-B2 | User | SCN-B2 | Messaging a crashed member in an active Org is rejected (`COLLABORATION_AGENT_CONTINUATION_BINDING_MISSING`) | The crashed member resumes its existing provider conversation on the next message; other members unaffected | Members without prior history still start fresh | CUR-4; L2 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User running AGY agents | Stop agents cleanly | No orphaned dev servers / held ports | Simple design, no heavy process manager |
| User running Agent Orgs | Recover from a member crash | Org stays usable without app restart | Keep history and conversations |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-A1: User Stop, run Terminate, Team/Org Terminate, and app/server shutdown of an AGY run with background commands (SCN-A1).
- UC-B1: Org Terminate after a member runtime died, then continue the Org (SCN-B1).
- UC-B2: Continue a crashed member inside a still-active Org (SCN-B2).
- The same termination/recovery behavior for standalone Agent Team roots if they share the defect (confirmed during design; DEC-004).

### Out Of Scope

- Background processes of Codex, Claude, Grok or AutoByteus-native runtimes (DEC-005).
- Commands that deliberately detach from AGY's process groups (`setsid` inside the command, Docker containers, system services) (DEC-002).
- Windows process-tree cleanup (DEC-003).
- ACP/Grok 5-minute idle kill.
- Automatic restart of crashed members without a user/agent message.

### Non-Goals

- A general background-process manager, UI for listing/stopping background tasks.

### Preserved Behavior Boundary

- Predecessor `agy-background-task-turn-liveness` REQ-001..004 (no idle kill; background closure at turn end; daemons keep running after a normal turn end).
- Healthy Org/Team create/terminate/restore behavior and history.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- Adjacent concerns outside the boundary are non-blocking risks or separate-ticket candidates.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-A1 | Whenever AutoByteus itself stops a live AGY process (user Stop, run/Team/Org Terminate, app/server shutdown, or after an AGY stream/protocol failure while AGY is still running), it must also stop every process AGY started as a background command for that run, on macOS and Linux. | BEH-A1 | Must | F-API-001 | User request 2026-09-29 |
| REQ-A2 | Background commands must keep running when an AGY turn ends normally and the AGY process stays alive. | BEH-A1 | Must | Preserve predecessor behavior | Predecessor REQ-003 |
| REQ-A3 | If AGY exits on its own (crash), AutoByteus does not attempt to find or stop its orphaned background processes. This is a documented limitation. | BEH-A2 | Accepted limitation | Keeps the fix simple and avoids process tracking | DEC-001 (user: no process-management system) |
| REQ-B1 | Terminating an Agent Org (and an Agent Team root, per DEC-004) must succeed and leave it fully stopped even when one or more member runtimes have already died; retrying must never be permanently blocked by an earlier failed attempt. | BEH-B1 | Must | CUR-3 | User instruction 2026-09-29 |
| REQ-B2 | After such a Terminate, sending a message must restore and continue the Org with its history and members' conversations. | BEH-B1 | Must | CUR-3 | Same |
| REQ-B3 | In an active Org, sending a message to a member whose runtime died must resume that member's existing provider conversation instead of being rejected, without stopping other members. | BEH-B2 | Must (DEC-006) | CUR-4 | Same |
| REQ-B4 | The Org's reported active state must be consistent: the UI must never be told an Org is stopped while the server still holds it as active (the "already active" dead end must not be reachable). | BEH-B1 | Must | CUR-3 | Same |

## Acceptance Criteria

| AC ID | Requirements | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-A1 | REQ-A1 | SCN-A1 | AGY run with a backgrounded daemon (e.g. `python3 -m http.server`); user Stop mid-turn | AGY process and daemon both gone; port free within a few seconds | — | Live AGY e2e (existing `agy-background-task-live.e2e.test.ts` assertions become pass/fail) |
| AC-A2 | REQ-A1 | SCN-A1 | Same, idle run; Terminate (run, Team, Org) and app/server shutdown | Daemon gone | — | Live e2e + unit (process-tree stop owner with fake process table) |
| AC-A3 | REQ-A2 | SCN-A1 | Turn ends normally with daemon running | Daemon still running; card shows background state | — | Existing live case unchanged |
| AC-B1 | REQ-B1, REQ-B4 | SCN-B1 | Org with a crashed AGY member; Terminate | `success:true`; Org no longer registered; inspection and config agree inactive | Second Terminate is a harmless no-op success | Probe L1 automated (fake runtime crash) + live |
| AC-B2 | REQ-B2 | SCN-B1 | After AC-B1, send a message to any member | Org restores; member conversation continues (AGY resumes by conversation id) | — | Integration/live |
| AC-B3 | REQ-B3 | SCN-B2 | Active Org, crashed member; send message to that member | Accepted; member resumes its conversation; other members untouched | — | Probe L2 automated + live |
| AC-B4 | REQ-B1..B3 | SCN-B1, SCN-B2 | Healthy Org create/message/terminate/restore | Unchanged | — | Existing suites green |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Expected | Alternate | Validity | Evidence | Req/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A1 | User | User + AGY agent | Stop an agent that started a dev server | Stop / Terminate / quit app | AGY run with background daemon | Agent backgrounds `pnpm dev`; user stops run/Org or quits app | Dev server stopped, port free | Normal turn end keeps it running | Supported Normal Scenario | F-API-001 | REQ-A1, A2 / AC-A1..A3 |
| SCN-A2 | System | AGY process | AGY crashes on its own | Process exit | Background daemon running | AGY exits unexpectedly | Daemon may survive (documented limitation) | — | Supported Explicit Edge Scenario (crash) | CUR-2 | REQ-A3 |
| SCN-B1 | User | User | Recover an Org after a member crash via Terminate | Terminate then message | Active Org, one member runtime dead | Terminate; send message | Terminate succeeds; Org restores and continues | — | Supported Normal Scenario | Incident 2026-09-28; L1 | REQ-B1, B2, B4 / AC-B1, B2 |
| SCN-B2 | User | User | Continue the crashed member directly | Message to member | Active Org, member dead | Send message to the offline member | Member resumes | — | Supported Normal Scenario | L2 | REQ-B3 / AC-B3 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` new UI. REQ-B4 is satisfied by correct server state/reporting; existing UI flows (Terminate, send, restore) are reused. N/A — not applicable for prototype fields.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Constraint | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-A1 | Reliability | Cleanup never signals processes outside the AGY run's own background process groups (no collateral kills) | Unit test with fake process table incl. unrelated processes |
| QR-002 | REQ-A1 | Performance | Stop path adds at most a short bounded delay (target ≤ 2 s) | Unit/e2e timing |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` schema change. Org execution trees, member histories and provider conversation bindings must be preserved across the B flows.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| AGY 1.2.12 process model | Background commands in own process groups under AGY | API/E2E probe | May change across AGY versions |
| OS process table (macOS/Linux) | Descendant/process-group discovery | Probe | Windows not covered (DEC-003) |

## Assumptions

| ID | Assumption | Validation |
| --- | --- | --- |
| ASM-001 | A dead member's provider conversation (`platformAgentRunId`) can be resumed by AGY (`--conversation`) | L2 shows binding persisted; confirm in design/API |

## Open Decisions And Questions (for user approval)

| ID | Question | Recommendation | Status |
| --- | --- | --- | --- |
| DEC-001 | AGY crash: clean up orphaned background processes? | No. Documented limitation (no process tracking). | Resolved: user, 2026-09-29 |
| DEC-002 | Commands that detach themselves (setsid, Docker, services) | Documented limitation | Resolved: user accepted the simple fix |
| DEC-003 | Windows | macOS and Linux only; Windows keeps current behavior, documented | Resolved: user accepted the simple fix |
| DEC-004 | Apply B fixes to standalone Agent Team roots too if they share the defect | Yes | Resolved: recommendation adopted, user notified |
| DEC-005 | Codex/Claude background processes | Out of scope | Resolved |
| DEC-006 | Include B3 (resume a crashed member without Terminate) | Yes | Resolved: recommendation adopted, user notified |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-A1 | UC-A1 | BEH-A1 | AC-A1, AC-A2 | SCN-A1 |
| REQ-A2 | UC-A1 | BEH-A1 | AC-A3 | SCN-A1 |
| REQ-A3 | — | BEH-A2 | (per DEC-001) | SCN-A2 |
| REQ-B1 | UC-B1 | BEH-B1 | AC-B1, AC-B4 | SCN-B1 |
| REQ-B2 | UC-B1 | BEH-B1 | AC-B2 | SCN-B1 |
| REQ-B3 | UC-B2 | BEH-B2 | AC-B3 | SCN-B2 |
| REQ-B4 | UC-B1 | BEH-B1 | AC-B1 | SCN-B1 |

## Architecture Phase Input

- Verify: exact throw site(s) in Org/Team termination for dead members (root agents and Team members); how the activation planner mode should be chosen for a crashed member in a live Org; AGY `--conversation` resume after crash; process-table access approach on macOS/Linux.
- Known risk: shared Org/Team lifecycle code (concurrency, termination ordering) → likely `architectural_risk=High` → independent architecture review.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes` (pending DEC answers)
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence: `N/A`
- UI/UX approval basis: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
