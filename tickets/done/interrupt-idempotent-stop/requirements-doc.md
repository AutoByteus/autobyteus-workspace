# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `interrupt-idempotent-stop`
- Request / ticket: Project Task autobyteus-533 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's report of 2026-11-18
- Requirements owner: Solution Designer
- Date: 2026-11-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: SR-001 and the message to the user in the Solution Designer's conversation of 2026-11-18 announcing the decisions below.
- Exact approved requirements baseline / solution revision: this document at SR-002 (SR-001 approved; SR-002 removes a mixed-version clause per DESIGN.md rule 9, no change to supported behavior)
- Behavior-defining supplements and their approved versions: None (reproduction evidence only: `evidence/reproduction/`)

## Problem And Desired Outcome

- Problem: clicking Stop generation twice (desktop or phone) shows a red toast such as `Could not stop solution_designer_e7ba… AgentRun 'solution_designer_e7ba…' has no canonical active turn to interrupt.` The Stop worked; the toast is false, exposes the raw run id twice and developer wording.
- Root cause (reproduced, `investigation-notes.md`): (1) the node answers a Stop that finds nothing to stop (turn already ended, run no longer active) as a failure with developer text; (2) the Stop control stays clickable after the first click until the new status reaches the page; (3) the app shows every non-accepted answer as an error toast with the raw run id and the raw server message. The node ends the turn before it answers the first Stop, so any further Stop that reaches it before the page shows the new status fails. Window: ≈70 ms on a local node, ≈ one round trip on a remote path (≥300 ms at 150 ms one-way latency), so a phone double tap fails most of the time.
- Affected actors or systems: the user of every run view (desktop app, phone `/mobile`); the node's interrupt command on every stream.
- Desired outcome: Stop is harmless to repeat. After the first click the control shows "Stopping…" and takes no more clicks until the run's status changes; a Stop that finds nothing to stop is a quiet success everywhere; only a real failure shows a message, in plain words, naming the agent, never a run id or internal words.
- Observable definition of success: the reproductions (server and browser, local and with latency) show no toast for repeated or late Stops, for every run kind, on desktop and phone; a real failure shows one plain message.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | One Stop ends the turn; ack `accepted`; no toast | Same, and the control shows "Stopping…" until the status changes | The turn ends on every runtime; the run stays (AGY goes offline by design) | Notes: BEH-001 |
| BEH-002 | User | SCN-002 | Two Stops arriving together join; both `accepted` | Second click sends nothing (control is Stopping); the node still joins if two arrive | Joining | Reproduced gap 0 |
| BEH-003 | User | SCN-002, SCN-003 | Stop after the turn ended on the node → `failed NO_ACTIVE_TURN` / `rejected RUN_NOT_FOUND` → red toast with raw id | Answered as success (nothing to stop); no toast | — | Reproduced |
| BEH-004 | User | SCN-003 | Stop while the page's status is stale (`Running` placeholder on open) → same toast | Quiet success | The placeholder itself is unchanged (DEC-008) | Read |
| BEH-005 | User | SCN-004 | Team member / delegated Team member: same as BEH-003 | Same as desired BEH-003 | — | Reproduced |
| BEH-006 | User | SCN-004 | Org member: every non-accepted answer is silently dropped | Harmless outcomes quiet; real failures shown in plain words | — | Read |
| BEH-007 | User | SCN-004 | Remote (peer) run: every outcome silent | Same as desired BEH-006 | — | Read |
| BEH-008 | User | SCN-005 | Stream disconnects while a Stop waits → red toast "Interrupt was cancelled because the stream disconnected." although the Stop worked | No toast; after the stream rebinds the run's status decides (Stop available again if still Running) | — | Reproduced (latency 150 ms) |
| BEH-009 | User | SCN-006 | Not connected when clicked → toast with raw id and "the stream is <state>" | One plain message: Stop was not sent, connection to the node lost | The command is not sent | Read |
| BEH-010 | User | SCN-006 | Runtime fails to interrupt → toast with raw id and raw text | One plain message naming the agent | The run keeps its status; Stop can be retried | Read |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User (desktop, phone) | Stop the agent's current work | Stop works once; repeating it is harmless; real failures are understandable | No run ids, codes or internal words |
| Node (server) | Answer the interrupt command | "Nothing to stop" is success | Internal callers of the domain interrupt keep a truthful result |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Stop generation once on a running agent | SCN-001 |
| UC-002 | Stop again (double click/tap, or a second press because nothing seemed to happen) | SCN-002 |
| UC-003 | Stop on a run whose turn already ended or whose shown status is stale | SCN-003 |
| UC-004 | UC-001…003 for every run kind: standalone agent run; Team member; Org member (direct agent and agent of an Org-internal Team); delegated runs on this node (task agent, task-team member, from an Agent, Team or Org root); remote (peer) runs; on desktop and phone | SCN-004 |
| UC-005 | The connection drops while a Stop waits for its answer | SCN-005 |
| UC-006 | A Stop that really fails (not sent; runtime failure) | SCN-006 |

### Out Of Scope

- Terminate / the run's Stop in settings and the per-copy Stop of delegated rows (`terminateRun`, autobyteus-458, 522): unchanged.
- The `Running` placeholder used while a live run's stream binds (DEC-008); AGY's design that a Stop takes its run offline.
- Turn identity work (autobyteus-448/526, FU-002); tool approval commands; sending messages.
- Localizing the composer's existing "Send message" / "Stop generation" English labels (the new "Stopping…" label is localized).

### Non-Goals

- No success toast or "Already stopped" line (DEC-003).
- No retry logic for a failed Stop beyond the user pressing Stop again.

### Preserved Behavior Boundary

- BEH-001 preserved column: a single Stop still ends the turn on every runtime (Claude, Codex, AGY, Grok/ACP, native); the run stays (AGY offline).
- Interrupt and tool approval stay active-only: a Stop never starts or restores a run.
- A malformed command (no command id) or a target that is not a member of the addressed Team/Org stays rejected (DEC-002).
- Send, queued input and turn lifecycle events are unchanged.

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
| REQ-001 | The node answers a user's Stop (`INTERRUPT_GENERATION`) that finds nothing to stop as **accepted**, on every stream (agent, Team, Org, collaboration root, peer run) and every runtime: the run has no active turn; the turn ended in the runtime before the interrupt reached it; or the addressed run (or Team/Org) is no longer active. It changes nothing in the run. | BEH-003…BEH-007 | Must | Stop is idempotent: its goal (nothing generating) holds | N/A | Founder direction; PM suggestion; DEC-001, DEC-002 |
| REQ-002 | A Stop that arrives while another Stop of the same turn is in progress keeps joining it (both accepted, the turn ends once). | BEH-002 | Must | Preserves current joining | N/A (reproduced) | — |
| REQ-003 | After the first press, the Stop control of that run shows a "Stopping…" state (spinner, localized label) and does not send another Stop; it leaves that state when the run's status is no longer Running, when the Stop fails, or when the run's stream rebinds (then the current status decides). Same on desktop and phone for every run kind of UC-004. | BEH-001, BEH-002 | Must | Founder direction: disabled / "Stopping…" until the status updates | N/A | DEC-004 |
| REQ-004 | The app shows nothing for a Stop the node accepted, whether it stopped a turn or found nothing to stop; the "Stopping…" state then ends with the status (REQ-003). Every answer that is not accepted is a real failure (REQ-006). | BEH-003…BEH-005 | Must | Quiet no-op | N/A | DEC-003; SR-002 |
| REQ-005 | A connection loss while a Stop waits for its answer is not reported as a failed Stop; after the stream rebinds, the run's status decides what the control shows. | BEH-008 | Must | The Stop most likely worked; the status is the truth | N/A (reproduced) | DEC-005 |
| REQ-006 | A real failure shows exactly one message in plain words that names the agent by the name the user sees (never a run id) and contains no internal words (`AgentRun`, `canonical`, `turn`, codes, stream states): (a) Stop not sent because the app is not connected to the node; (b) the node or runtime could not stop the agent. For every run kind of UC-004, including Org members and remote runs, which show nothing today. The raw detail goes to the console log only. | BEH-006, BEH-007, BEH-009, BEH-010 | Must | Founder: a real failure still shows a clear message in plain words | N/A | DEC-006, DEC-007 |
| REQ-007 | Preserved: a single Stop still ends the turn on every runtime; Stop never starts or restores a run; malformed or mis-addressed commands stay rejected; terminate, send and tool approval unchanged. | BEH-001 | Must | No regression | N/A | — |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-003, SCN-003 | Standalone live run, idle (no turn); Stop sent | Ack `accepted`; status unchanged; no events added to the conversation | — | Server unit + e2e (scripted AGY) |
| AC-002 | REQ-001, REQ-002 | BEH-002, BEH-003, SCN-002 | Running turn; two Stops sent at offsets 0–600 ms | Every ack `accepted`; one turn end | — | Server e2e: `tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts` (fails on the base) made durable |
| AC-003 | REQ-001 | BEH-003, SCN-003 | Run no longer active (AGY after a Stop; terminated run) or Team/Org not active; Stop sent | Ack `accepted`; the run is not started or restored | Malformed command id / target not a member → still `rejected` | Server unit/integration |
| AC-004 | REQ-001 | BEH-005…BEH-007, SCN-004 | Same as AC-001…AC-003 for a Team member, an Org member (direct and Org-internal Team), a collaboration-root peer row, a remote peer run (this node relays the peer node's own result: no turn, or the run not running there) | Ack `accepted` on each stream | — | Server unit per handler + e2e Team member; peer relay unit |
| AC-005 | REQ-001 | BEH-003 | Runtime reports the turn already ended when the interrupt reaches it (e.g. Claude session's turn settled, ACP/AGY "no matching turn") | Ack `accepted` | A genuine runtime error stays a failure | Server unit per backend that can report it |
| AC-006 | REQ-003 | BEH-001, BEH-002, SCN-001, SCN-002 | Run shows Running; user presses Stop twice (double click / double tap) | After the first press the control shows the spinner and "Stopping…", is disabled, and exactly one `INTERRUPT_GENERATION` is sent; when the status leaves Running the control shows Send per the draft | Stop fails → control returns to Stop (enabled) and AC-009's message shows once; stream rebinds while Stopping → current status decides | Web unit (composer double click sends one command; state clears on each rule) for standalone, Team member, Org member, delegated, peer |
| AC-007 | REQ-004 | BEH-003…BEH-005, SCN-003 | Ack `accepted` while the page still shows Running (stale status or the race), then the status update arrives | No toast; "Stopping…" stays until the status leaves Running, then Send per the draft | — | Web unit |
| AC-008 | REQ-005 | BEH-008, SCN-005 | Stream disconnects while a Stop waits | No toast; after rebind, control follows the run's status | — | Web unit; browser probe with the AGY run going offline |
| AC-009 | REQ-006 | BEH-006, BEH-007, BEH-009, BEH-010, SCN-006 | (a) Not connected when Stop is pressed; (b) runtime returns a failure (`RUNTIME_COMMAND_FAILED`, `INTERRUPT_EXECUTION_FAILED`, peer unreachable) | One toast in plain words naming the agent's shown name, e.g. "Could not stop Solution Designer. Please try again." / "Stop was not sent: not connected to the node. Check the connection and try again."; text contains no run id, `AgentRun`, `canonical`, `turn`, codes; en and zh-CN | — | Web unit for each run kind incl. Org member and peer run; localization guards |
| AC-010 | REQ-001, REQ-003, REQ-004 | SCN-002, SCN-003, SCN-004 | Isolated node, scripted runtime (AGY HOLD_TURN), real renderer: press Stop twice quickly; press Stop after the turn ended; with added latency | No toast; "Stopping…" seen between; turn ended once | — | Browser probe (desktop) and a phone case in `test:e2e:mobile-shell` (phone bundle) for a standalone run and a Team member |
| AC-011 | REQ-007 | BEH-001 | Single Stop on each runtime path; terminate; send; tool approval | Unchanged outcomes | — | Existing suites green; existing stale tests rewritten (interrupt-result-presentation probe, agent-websocket integration NO_ACTIVE_TURN cases) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Stop the agent's work | Composer Stop (desktop/phone) | Run shows Running | Press Stop → "Stopping…" → turn ends → Send | Turn ended, no toast | Failure → SCN-006 | Supported Normal Scenario | Founder report | REQ-003, AC-006 |
| SCN-002 | User | User | Same, pressing twice | Double click/tap, or a second press | Run shows Running | Press, press again | Second press does nothing; no toast | — | Supported Normal Scenario | Founder report; reproduced | REQ-001…004, AC-002, AC-006, AC-010 |
| SCN-003 | User | User | Stop when the agent already finished | Stop while the page still shows Running (turn ended at the same moment; stale status) | Node has no turn | Press Stop | Quiet; status shows the truth | — | Supported Normal Scenario | Task text; reproduced | REQ-001, REQ-004, AC-001, AC-003, AC-007 |
| SCN-004 | User | User | SCN-001…003 for every run kind | Composer of each run kind, desktop and phone | As above | As above | As above | — | Supported Normal Scenario | Task text; lessons (every kind) | UC-004, AC-004, AC-006, AC-009, AC-010 |
| SCN-005 | User | User / network | Stop while the connection drops | Phone on a weak network; AGY run going offline | Stop pending | Connection drops, rebinds | No false failure; status decides | — | Supported Normal Scenario | Reproduced | REQ-005, AC-008 |
| SCN-006 | User | User | Stop that really fails | Not connected; runtime error; peer unreachable | — | Press Stop | One plain message | Retry by pressing Stop | Supported Normal Scenario | Task text | REQ-006, AC-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design requested; the direction sets the visible behavior)
- Product ticket / design repository / UI/UX confirmation / visual baseline: N/A — not applicable
- Required states: Stop (red, enabled) → Stopping (spinner in the same button, disabled, localized label "Stopping…" as its title/aria-label) → Send/disabled per draft. No toast for harmless outcomes; one plain toast for real failures (REQ-006).
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-006, AC-009 | Privacy / Operability | No run id or internal word in any user-visible Stop text | en, zh-CN | Unit asserting rendered text; localization guards |
| QR-003 | AC-010 | Accessibility | Stopping state exposes `aria-busy` and a label | Desktop, phone | Probe DOM assertion |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Interrupt ack on `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration`, `/ws/peer-run` | Nothing-to-stop is `accepted` | Stream docs | Docs updated by delivery |
| Peer nodes | Run the same version (DESIGN.md rule 9); a peer node's own interrupt result (no turn / not running) is relayed by this node | Peer relay code | Covered by REQ-001 (relay) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/reproduction/` | Reproduction and measurement | REQ-001…006 | Final | Evidence only |
| `autobyteus-server-ts/tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts` | Failing server reproduction | AC-001…AC-004 | Hand-over | Evidence only |
| `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Browser reproduction (latency option) | AC-010 | Hand-over; replaced by the durable probe | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Every user Stop targets the run the view shows, so a not-active target means the run stopped, not a wrong id | DEC-002 | Read: composer targets come from the open context | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Should the node answer an interrupt with no active turn as an error or a success? | Root cause 1 | Error today; PM suggests idempotent; industry: stop/cancel on a stopped resource succeeds | The caller's goal (nothing generating) holds; an error invites a false alarm on every client. **Accepted** (a quiet success) at the user-command boundary; the domain's internal result stays truthful for its other callers (design) | Solution Designer | Decided |
| DEC-002 | Does "run / Team / Org no longer active" count as nothing to stop? | AGY runs go offline after a Stop; reproduced | Treat as failure (today) / as nothing to stop | From the user's view the agent is not generating; the Stop's goal holds. Malformed commands and a target that is not a member of the addressed root stay rejected (they are defects, not states) | Solution Designer | Decided |
| DEC-003 | Quiet no-op or a short "Already stopped" line? | Visible behavior | Founder: "no effect, or a short message" | The "Stopping…" state and the status change already tell the user; a line after every double tap is noise. **Quiet** | Solution Designer (within the founder's stated options) | Decided |
| DEC-004 | What does the control show after the first press and when does it return? | Root cause 2 | Disable only / "Stopping…" | **Spinner + "Stopping…", disabled**, cleared by status ≠ Running, a failure, or stream rebind (current status decides). Matches the founder's wording and the existing `busy` style of the button | Solution Designer | Decided |
| DEC-005 | A connection loss while a Stop waits: failure or not? | Reproduced false toast | Toast (today) / let the status decide | The node usually stopped the turn; the rebind delivers the truth; if still Running, Stop is available again. **No toast** | Solution Designer | Decided |
| DEC-006 | Wording and naming of real failures | Founder: plain words, no ids | Raw id + raw text (today) | Name the agent as the view shows it; two plain messages (not sent / could not stop), en + zh-CN; raw detail to the console | Solution Designer | Decided |
| DEC-007 | Org members and remote runs show nothing today; include them? | Consistency across run kinds (lesson: every kind) | Leave silent / same presentation | **Include**: same states and messages for every run kind, desktop and phone | Solution Designer | Decided |
| DEC-008 | Change the `Running` placeholder used while a live run's stream binds? | A Stop in that window reaches an idle run | Change the open-time status / leave it | With REQ-001 and REQ-004 such a Stop is a quiet no-op; changing open-time status touches run-open semantics outside this ticket. **Leave it** | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-002, UC-003, UC-004 | BEH-003…007 | AC-001, AC-002, AC-003, AC-004, AC-005, AC-010 | SCN-002, SCN-003, SCN-004 | reproduction |
| REQ-002 | UC-002 | BEH-002 | AC-002 | SCN-002 | reproduction |
| REQ-003 | UC-001, UC-002, UC-004 | BEH-001, BEH-002 | AC-006, AC-010 | SCN-001, SCN-002, SCN-004 | browser reproduction |
| REQ-004 | UC-003, UC-004 | BEH-003…005 | AC-007, AC-010 | SCN-003, SCN-004 | — |
| REQ-005 | UC-005 | BEH-008 | AC-008 | SCN-005 | browser reproduction (latency) |
| REQ-006 | UC-006, UC-004 | BEH-006, 007, 009, 010 | AC-009 | SCN-006, SCN-004 | — |
| REQ-007 | UC-001 | BEH-001 | AC-011 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-006 for every run kind of UC-004.
- Constraints: domain `AgentRun.interrupt()` result stays truthful for termination/shutdown callers; no wire schema change unless needed; no compatibility with other software versions (DESIGN.md rule 9).
- Deferred to design: where the nothing-to-stop rule lives on the server; the owner of the pending-Stop state and of the presentation rule in the web; per-runtime "turn already ended" mapping (AC-005).
- Technical facts to verify: each backend's answer when its turn ended before the interrupt (Claude session reject, ACP, AGY, Codex, native); the agent name each run kind's view shows.
- Risks: overlap with 448/526 FU-002 in `AgentRunInterruptState` (coordinate through the PM).

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

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes` (SR-001; SR-002 refinement within the same approval)
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
