# Requirements Document — autobyteus-316 (cross-runtime resume)

## Document Status

- Status: `Approved` (requirements basis only; design not started; the user approves the design before any build)
- Current solution revision ID: `SR-002`
- Package identifier: `cross-runtime-resume`
- Request / ticket: Project Task `autobyteus-316` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), "Cross-runtime resume: continue an agent's work on a different runtime from its work journal". Blocks `autobyteus-314` (Model Router feedback, paused).
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user (2026-10-27)
- Requirements owner: Solution Designer
- Date: 2026-10-29
- Approved by and reference: `Solution Designer within the direction (user informed)`, SR-002, my messages in the conversation of 2026-10-29. The user chose the central model himself: the next colleague reads the previous colleague's work journals, summarizes them and continues; the summary is written to its own file per run. Remaining decisions are solution details inside the Task's direction (below); the user still approves the design.
- Behavior-defining supplements: none. Evidence: `investigation-notes.md`; probe `probes/handover_note_probe.py`.

## Problem And Desired Outcome

- Problem: when an agent's run stops mid-work because its runtime cannot continue (usage limit, signed out, model no longer offered), the work cannot continue on another runtime. Each runtime keeps its conversation in its own format and a run restores only from its own runtime's session (F-06). Today the user starts a new chat by hand and explains everything again.
- Actors: the user; the agent; later the delegating agent and the Model Router (autobyteus-314).
- Desired outcome (the user's model, "colleagues"): a new run on another runtime and model takes over like a colleague takes over from someone on leave. It is told which runs worked on this before, where their journals are, and to read them, summarize what they did and where the work stands, check the workspace, and continue. The summary is written down for the next colleague.
- Observable success: stop a run on one runtime; on the Continue action pick another runtime and model; the new run states what was done and what is next, continues the work in the same workspace, and a `run_summary.md` exists for the new run; a third hand-over reads the short summaries first.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | A stopped run restores only on its own runtime (F-06); no way to continue elsewhere. | The user continues a stopped standalone run as a new run of the same agent on another runtime/model, same workspace. | Restore-by-message on the same runtime; the old run stays unchanged. |
| BEH-002 | System | SCN-001, SCN-003 | Nothing carries the earlier work into a new run. | The new run's first message names the earlier runs in order, their journal and summary paths, why the last one stopped (when known), and instructs: read, summarize into `run_summary.md`, check the workspace, continue. | The journal stays derived and read-only. |
| BEH-003 | System | SCN-003 | No run summary exists on any runtime except the native compaction summary (F-12). | Each continuing run writes `run_summary.md` in its own run folder (through a server tool), one file per run. | Raw traces, journal, memory search unchanged. |
| BEH-004 | System | SCN-001 | The reason a run stopped is not saved (F-04). | The Continue dialog and the first message show the stop reason when the live error event is known, as the provider's own message; nothing is classified. | Provider-error contract (no app classification, autobyteus-314 C-01). |
| BEH-005 | System | SCN-004 | Unknown whether another runtime's file tool can read the earlier run's folder (U-2). | If it cannot, the first message carries a bounded excerpt instead of only paths. | — |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User | Keep the work going when a runtime is out | One action, no re-explaining | Cost of reading is visible |
| New agent | Take over | Knows what was done, what is open, why it stopped | Verifies before repeating |
| Model Router (later) | Act on a failed choice | Can start the same hand-over | Not in this ticket |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases (first slice)

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Continue a stopped **standalone** Agent run on a chosen other runtime and model as a new linked run | SCN-001, SCN-002 |
| UC-002 | Hand-over chain of three or more runs reads the short summaries first | SCN-003 |
| UC-003 | A run writes and reads its `run_summary.md` | SCN-003 |

### Out Of Scope

- Started by an agent or by the Model Router (needs this first slice; autobyteus-314 then builds on it).
- Automatic switching, or choosing the runtime for the user.
- Team members, Org members and delegated copies (other roots: address, collaboration links, Task); a follow-up after the standalone slice.
- Changing the runtime of the same run (F-07).
- A background summary service for memory search (autobyteus-185 FU-005).
- Classifying provider errors; changing restart-and-resume (autobyteus-283 to 289).
- Carrying running processes, open tool results or the model's reasoning.

### Non-Goals

Perfect continuation: the new agent's quality depends on its model; the feature gives it the facts and the pointers.

### Preserved Behavior Boundary

Restore on the same runtime; journal derivation and its "derived and deletable" rule; raw traces; memory search; the old run's history and files are never changed; no user memory written in experiments.

### Prerequisites

None found so far. `FU-001` (a trace record for a failed turn) is not a prerequisite for the first slice because the stop reason can be taken from the live event; the design decides.

### Review Authority

Findings must cite REQ/AC/BEH IDs. New behavior is a `Requirement Gap`.

## Requirements

| ID | Requirement | Behaviors | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | The user can start "Continue on another runtime" on a stopped standalone Agent run, choosing an available runtime and model; the result is a new run of the same agent definition in the same workspace; the old run is unchanged. | BEH-001 | Must | Task; DEC-1 |
| REQ-002 | The new run's first message lists the earlier runs oldest to newest with, for each, its run ID, runtime, model, journal folder, summary file (if any) and period; the stop reason of the last one when known; what the user asked last; and instructs the agent to read, summarize, check the workspace's real state (for example `git status`), verify anything uncertain and continue. | BEH-002, BEH-004 | Must | User model; DEC-2 |
| REQ-003 | Before the new run starts, the earlier run's journal is made current from its raw traces. | BEH-002 | Must | F-05 |
| REQ-004 | The new run records its predecessor; the chain is readable from the new run and shown in the run's history entry. | BEH-001, BEH-002 | Must | DEC-1 |
| REQ-005 | A server tool lets a run write its own `run_summary.md` in its run folder (replace, not append; secrets masked; size limit), and the summary is read by the next hand-over. | BEH-003 | Must | User, 2026-10-29; DEC-6 |
| REQ-006 | The message states what does not carry over and says the new agent verifies before repeating any step whose result is unknown. | BEH-002 | Must | F-02, F-08 |
| REQ-007 | For a large journal the message tells the agent to read the latest part fully and earlier parts only by search or line range; the size and threshold are shown to the user before starting. | BEH-002 | Must | F-03 |
| REQ-008 | If the new runtime cannot read the earlier run's folder, a bounded excerpt is included instead (design decides after U-2). | BEH-005 | Should | U-2 |
| REQ-009 | The stop reason shown is the provider's own message and structured code if the runtime gives one; nothing is classified. | BEH-004 | Should | autobyteus-314 C-01 |

## Acceptance Criteria

| ID | Req | Behavior / Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 004 | BEH-001 / SCN-001 | Continue a stopped run on a different runtime/model | A new run starts, in the same workspace; its record names the old run; the old run is byte-unchanged | Test + real run on isolated data |
| AC-002 | REQ-002, 003 | BEH-002 / SCN-001 | Same | The first message contains the fields of REQ-002 with correct paths; the journal there is current | Test |
| AC-003 | REQ-005 | BEH-003 / SCN-003 | New agent finishes its summary | `run_summary.md` exists in its run folder; a second Continue lists it | Test + real run |
| AC-004 | REQ-006, 007 | BEH-002 | Large journal | The message instructs partial reading and states the sizes | Test |
| AC-005 | REQ-001 | SCN-001 | A run stopped by a scripted usage-limit error | The dialog shows the provider's message; Continue works | Test on a scripted runtime |
| AC-006 | Preserved | — | Restore by message on the same runtime | Unchanged | Existing suites |
| AC-007 | REQ-001…003 | SCN-001 | Real run: Claude to Codex (or two other available runtimes) on a copied, isolated data root | The new agent states what was done and continues the work; shown in the report | Real run (not a promise of quality in general) |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Run stopped by a usage limit, sign-out or unavailable model; he opens it and chooses Continue on another runtime | New run takes over | Supported Normal Scenario (the Task; the user, 2026-10-27) | Task |
| SCN-002 | User | User | Run he stopped himself; wants another runtime | Same | Supported Explicit Edge Scenario (same action; the user's "or whatever human has stopped it") | User, 2026-10-29 |
| SCN-003 | System | Agents | A second and third hand-over | Short summaries first, journals on demand | Supported Explicit Edge Scenario (the user's relay of colleagues) | User, 2026-10-29 |
| SCN-004 | System | New runtime | Cannot read the earlier folder | Excerpt fallback | Unclear until U-2 | Notes |
| SCN-005 | Agent/Router | Agent or Router | Starts the hand-over | — | Technically possible, not supported yet (autobyteus-314) | Task |

## Decisions

| ID | Decision | Owner | Reasoning |
| --- | --- | --- | --- |
| DEC-1 | A hand-over is a **new linked run**, not the same run with the runtime changed. | Solution Designer, within direction | F-06/F-07: a run restores from one runtime's session and the journal translation and history are per runtime; the user's colleague model is a new person. |
| DEC-2 | **The next colleague summarizes**, from a starting message, rather than a separate summarizer. | **The user** (2026-10-29) | Works at the failure; no extra model or queue; the user's choice. |
| DEC-3 | The first trigger is the user's action on a stopped run; agent/Router later. | Solution Designer | Smallest visible surface; the Task says "small first slice". Changeable at design approval. |
| DEC-4 | First slice covers standalone Agent runs only. | Solution Designer | Other roots add address/link rules; follow-up. |
| DEC-5 | Stop reason is the provider's message, never classified. | Solution Designer | Provider-error contract. |
| DEC-6 | The summary file is `run_summary.md` **beside the raw traces**, not inside `work_journal/`; written through a server tool. | Solution Designer, from the user's idea | `work_journal/` is derived and deletable; an agent-written summary cannot be rebuilt. A tool fixes the path and size and avoids sandbox limits. |

## Assumptions / Unknowns

U-1…U-5 in the investigation notes. AC-007 and U-4 test quality on a real run; they do not promise it.

## Readiness Check

Requirements are stable, linked and testable; open evidence items are tests, not product decisions. Ready for design.
