# Requirements Document

## Document Status

- Status: `Approved` (SR-006)
- Current solution revision ID: `SR-006` (REQ-004 and AC-006/AC-007 reworded to agree with REQ-003; DEC-005 consequences listed; DEC-009 added; base refreshed to `1f761bc8db`)
- Package identifier: `stopped-run-unavailable-model`
- Request / ticket: Project Task `autobyteus-53` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user ("definitely the ticket we need to fix", 2026-10-12)
- Requirements owner: Solution Designer
- Date: 2026-11-19 (first baseline 2026-11-01)
- Approved by and reference: **the user's direction** sets the rule (2026-11-02 and 2026-11-19, quoted in DEC-003). The Solution Designer approved the details within that direction (DEC-005..DEC-009) and informed the user in the Solution Designer conversation on 2026-11-19.
- Exact approved requirements baseline: `SR-006` (replaces SR-001's DEC-001 rule; SR-006 reworded REQ-004/AC-006/AC-007)
- Authorities read: `requirements-engineering.md`, `ticket-scope.md`, `SKILL.md` (re-read 2026-11-19; their 2026-11-23 changes re-read 2026-11-23)
- Behavior-defining supplements: none
- Base: `origin/personal` @ `1f761bc8db` (2026-11-23; was `8430d9ef12`)

## Problem And Desired Outcome

- **Problem:** a stopped run on the native AutoByteus runtime can't continue on another AutoByteus model when its saved model is no longer offered (for example, deleted from LM Studio). Since autobyteus-500 G-5, the start refuses with "…choose a runtime and model in Settings", and Settings marks the model "No longer offered". But the model menu is empty and every save is refused. The native rule needs the old model's verified context capacity, and a model that is gone has none.
  - Reproduced on `8430d9ef12` (the probe in the investigation notes, SR-004).
  - Since autobyteus-316/348, every surface can escape by switching to *another* runtime. Staying on AutoByteus with another model is impossible. That is the common case: a local LM Studio user with no other runtime installed.
  - The same rule also refuses an ordinary switch to a *smaller* AutoByteus model, even when both models are offered.
- **Affected:** the user; stopped native runs on every surface (standalone, delegated copies, Team members, Org members).
- **Desired outcome (the user's rule, DEC-003):** every offered AutoByteus model can be chosen.
  - If the new model's context window is **equal or bigger** than the model the run last ran on, the run continues in the same session, as today.
  - If it is **smaller or unknown** (including when the old model is gone), the run starts a **fresh session** of the new model. That session picks up from the work journal of the previous one, the way a runtime switch does today.
- **Observable success:**
  - A run on a removed LM Studio model shows the "No longer offered" note, and the menu lists the offered models.
  - Save succeeds.
  - On the next message, the chat shows "Model changed from … to …", and the agent receives the hand-over notice that points to the work journal and continues the work.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | Model gone: empty menu, Save refused | Every offered native model is listed; Save is accepted; the next message hands over to a fresh session | The "No longer offered" note and the G-5 start refusal until the user saves | Probe; OBS-001 |
| BEH-002 | User | SCN-003 | Current model offered but its capacity unverified: empty menu | The same as BEH-001 | — | Code |
| BEH-006 | User | SCN-005 | Both known, target smaller: refused | Accepted; hand-over to a fresh session | — | Code; the user's rule |
| BEH-005 | System | SCN-004 | Both known, target ≥ current: same session | Unchanged | Same session, restored conversation | Code |
| BEH-003 | User | — | Switch to another runtime: hand-over (autobyteus-316/348); undo while pending | Unchanged | All, including RS-02 and RS-08 | Tests |
| BEH-004 | User | — | External runtimes: any offered model, same session | Unchanged | All | Code; probe |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Continue a stopped native run whose model is no longer offered, by choosing another AutoByteus model in Settings: standalone runs, delegated copies, Team members and Org members | SCN-001, SCN-002 |
| UC-002 | The same when the current model is offered but its capacity is unverified | SCN-003 |
| UC-003 | Switch a stopped native run to a smaller offered AutoByteus model | SCN-005 |

### Out Of Scope

- External runtimes (they already work), and switching to another runtime (autobyteus-316/348), except where the rule below now decides between "same session" and "hand-over" for them too (BEH-003 and BEH-004 stay as they are).
- Runs that cannot switch runtime today (application-owned, system-owned, started by a peer node): they keep today's rule (DEC-006).
- Recording model capacities with runs; changing native compaction; changing the hand-over notice's text.
- Changing a model while the run is active.

### Non-Goals

- No new UI controls, labels or confirmation dialogs (the user: keep the UI clean, reuse the existing experience).
- No guarantee about how well the new model uses the journal. The hand-over gives facts and pointers, as it does for a runtime switch.

### Preserved Behavior Boundary

- BEH-003, BEH-004, BEH-005.
- The saved value stays visible, and nothing is substituted automatically.
- Editing is for stopped runs only, with an explicit Save; the run keeps its identity, chat history and journals.
- The previous session's records are archived, never edited, exactly as in a runtime switch.

### Prerequisites

- None found. The hand-over machinery exists on every surface (autobyteus-316/348), and a native fresh session in an existing run folder starts without the old context (investigation notes, SR-005).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| ID | Requirement | BEH | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | For a stopped native run that can hand over, the Settings model menu lists every AutoByteus model offered now (except the saved one, which stays as the current entry while it is offered), whatever its context capacity. | BEH-001, BEH-002, BEH-006 | Must | Task; DEC-003 |
| REQ-002 | Saving another offered AutoByteus model on such a run is accepted when its model settings are valid. | BEH-001, BEH-002, BEH-006 | Must | DEC-003 |
| REQ-003 | **The continuation rule.** The model the run's session last ran on is the reference: the previous model while a hand-over is pending, otherwise the saved model. If both capacities are verified and the new one is equal or bigger, the run continues in the same session. Otherwise (smaller, or either capacity unknown) the save makes a pending hand-over, and the next message starts a fresh session of the new model with the hand-over notice. | BEH-001, BEH-005, BEH-006 | Must | DEC-003, DEC-005 |
| REQ-004 | A pending model hand-over behaves like a pending runtime switch, judged by REQ-003 against the same reference model. Before the next message: choosing the reference model again undoes it (the session comes back). Choosing another model that is equal or bigger, with both capacities verified, also resumes the session with that model. Choosing a smaller or unknown-capacity model keeps it pending from the first model. Switching to another runtime keeps it pending from the first model. | BEH-003 | Must | DEC-005; SR-006 (AR-001) |
| REQ-005 | The rule applies on every stopped-run surface that can switch runtime: standalone runs and delegated copies, Team members and Org members (also inside delegated Team copies). A scope that is only a default and has no session (a Team's default launch, a standalone run that was prepared but never started) accepts any offered model directly. | BEH-001 | Must | Task; DEC-006, DEC-007 |
| REQ-006 | After a hand-over, the chat and the journal show "Model changed from {old} to {new}." The agent receives the existing hand-over notice with its first input, and the run keeps its identity, chat history and journals. | BEH-001, BEH-006 | Must | Task; DEC-008 |
| REQ-007 | Short texts state the rule truthfully: the native model help in Settings, and the Save message when a model hand-over is pending. | BEH-001 | Should | Investigation |
| REQ-008 | The existing tests that pin the old refusal are rewritten to the new rule; the remaining refusal (runs that cannot hand over) keeps a test. | — | Must | Task ("including the current refusal case"); ticket-scope |

## Acceptance Criteria

| AC | REQ | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | Stopped native standalone run on a removed LM Studio model; open Settings, choose another model, Save | The note is shown; the menu lists the offered models; Save succeeds; a hand-over is pending | Server unit (the probe flipped), web test, isolated app |
| AC-002 | REQ-003, REQ-006 | After AC-001, send a message | The new model answers in a fresh session; the chat shows "Model changed from … to …"; the first input carries the hand-over notice; the earlier messages stay in the chat; the previous records are archived | Server built-server E2E (native fake LM Studio endpoint), isolated app |
| AC-003 | REQ-003 | Both models offered and verified, target equal or bigger | Same session, no hand-over (today's behavior) | Server unit |
| AC-004 | REQ-003 | Both offered and verified, target smaller | Accepted; hand-over pending | Server unit |
| AC-005 | REQ-003 | Current offered, capacity unverified; or target capacity unverified | Accepted; hand-over pending | Server unit |
| AC-006 | REQ-004 | A model hand-over is pending from model A. Separately: (a) choose A again; (b) choose a third model smaller than A or of unknown capacity; (c) choose a third model equal to or bigger than A (both verified); (d) choose another runtime | (a) undo: A's session back, nothing pending; (b) still pending from A; (c) A's session resumes with the third model, nothing pending; (d) pending from A | Server unit (selection service and rule) |
| AC-007 | REQ-004 | Existing runtime-switch scenarios (RS-01..RS-09, undo, members, session renewal) | Unchanged outcomes | The existing E2E RS-* pass unchanged. The rule's unit tests keep their expected outcomes, each given the continuation that validation gives that case |
| AC-008 | REQ-005 | The same as AC-001/AC-002 for a Team member and a delegated copy; and a Team's default row on a gone model | Same hand-over; the default row accepts any offered model directly | Server unit/integration; built-server E2E for one member |
| AC-009 | REQ-008 | A run that cannot hand over (e.g. started by a peer node), target smaller or unknown | Still refused with today's messages | Server unit |
| AC-010 | REQ-007 | Settings on a native run; Save of a model hand-over | The help and the Save message describe the rule | Web unit; server unit |
| AC-011 | — | The user, on a beta | A removed LM Studio model can be replaced, and the run continues from the journal | User check |

## Relevant Scenarios And Journeys

| SCN | Kind | Trigger | Steps | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | A local model is deleted from LM Studio after the run stopped | Open the run → Settings → choose another model → Save → message | Continues in a fresh session from the journal | Supported Normal | Task; OBS-001 |
| SCN-002 | User | A provider retires an API model | Same | Same | Supported Normal | Task |
| SCN-003 | User | The current model's metadata is unverified | Same | Same | Supported Explicit Edge | Code |
| SCN-004 | User | An ordinary swap to an equal or bigger model | Same | Same session | Supported Normal | Prior ticket |
| SCN-005 | User | The user wants a smaller (cheaper, faster, local) model | Same | Fresh session from the journal | Supported Normal | The user's rule |

## Data Continuity

- No migration. A model hand-over is stored with the existing `pendingRuntimeSwitch` field, whose `from` side then has the same runtime. The reader already accepts it. Pending switches stored by earlier versions keep their meaning (AC-007).

## Decisions

| DEC | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | ~~The rule when the old model's capacity is unknown: any offered model with a verified capacity, resumed in the same session~~ | Superseded by DEC-003 (SR-005) | — | Superseded |
| DEC-002 | Include "offered but unverified current" | The same trap and the same cause; handled consistently | Solution Designer | Decided |
| DEC-003 | **The user's rule.** 2026-11-02: "use the same approach that we switch runtime for switch model as well … if you're lower context, then … use the work general approach. If you're like equal or bigger context … we don't do it." 2026-11-19: "if user choose a model with unknown context or with a lower context … we can start a new session … like changes the runtime … ask the agent to read the Journal … of the previous … continuation" | Removes the refusal instead of weakening it, and never resumes a conversation that may not fit | User | Decided |
| DEC-004 | ~~Members and copies cannot hand over~~ | Moot since autobyteus-348 (SR-003) | — | Withdrawn |
| DEC-005 | What "the current model" means while a hand-over or runtime switch is pending | The model the session last ran on (the pending switch's `from`). One reference makes undo, re-edit and switching consistent. Its consequences for existing switches, all intended (SR-006, N-3): (1) undoing a native→external switch onto a smaller native model, or (2) onto a native model of unknown capacity, now hands over instead of resuming the old session unchecked; (3) choosing the previous model again while a switch is pending counts as unchanged. So an undo onto a previous model that is no longer offered is accepted at Save, where today it is refused as unavailable, and G-5 then refuses the start with its "choose a runtime and model" text, as for any saved model that is gone. The menu doesn't list such a model, so this case is reachable only through the API | Solution Designer | Decided |
| DEC-009 | A third model while a model hand-over is pending (AR-001) | REQ-004 contradicted REQ-003. The one-reference rule (DEC-005) settles it the way REQ-003 and the user's rule say: equal or bigger than the model the session last ran on → same session; smaller or unknown → hand-over. The runtime-switch analog already behaves so (an undo onto a bigger native model resumes the session). The user's rule is unchanged, so no user decision is needed | Solution Designer | Decided |
| DEC-006 | Runs that cannot switch runtime (application-owned, system-owned, peer-started) | They have no hand-over path (the lifecycle refuses it), so they keep today's rule and refusal. This keeps the change inside the existing switch boundary | Solution Designer | Decided |
| DEC-007 | Scopes without a session (a Team's default launch, a never-started standalone run) | There is no conversation to continue, so the capacity comparison means nothing: any offered model is accepted directly. This removes the same empty menu on the Team default row | Solution Designer | Decided |
| DEC-008 | The chat marker for a same-runtime hand-over | "Model changed from {old} to {new}." instead of "Agent runtime changed from AutoByteus (…) to AutoByteus (…)". The marker stays truthful; the hand-over notice is unchanged | Solution Designer | Decided |

## Readiness Check

- Problem, outcome, current/desired/preserved behavior, scope, scenarios and ACs: `Yes`.
- Feasibility: the hand-over to a native session is proven by the existing native switch tests (RS-01, RS-08). A native fresh session doesn't restore the old working context (`createAgentWithId` has no restore options).
- No `Needs user` decision; the rule is the user's own. Approved within the direction (user informed 2026-11-19).
