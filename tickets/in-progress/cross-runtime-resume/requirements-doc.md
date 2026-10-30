# Requirements Document — autobyteus-316 (cross-runtime resume)

## Document Status

- Status: `Ready for Approval` (SR-003). SR-002's approval does NOT cover this version: the user changed the intended behavior on 2026-10-29 (same agent, runtime switch in the run's settings, no separate "continue" action).
- Current solution revision ID: `SR-003`
- Package identifier: `cross-runtime-resume`
- Request / ticket: Project Task `autobyteus-316` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`). Blocks `autobyteus-314`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user (2026-10-27)
- Requirements owner: Solution Designer
- Approval: `Not yet` for SR-003. DEC-3 is decided by the user (marker in the chat). Needs the user: DEC-4 (single agent first, or members of teams in the first delivery).
- Behavior-defining supplements: none. Evidence: `investigation-notes.md`; probe `probes/handover_note_probe.py`.

## Problem And Desired Outcome

- Problem: when an agent's run stops mid-work because its runtime cannot continue (usage limit, signed out, model no longer offered), or the user stopped it, the work cannot continue on another runtime. Today only the model can be changed on a stopped run; its runtime is locked (`runtime-locked` in `ExistingRunSettings.vue`) because a run restores only from its own runtime's session (F-06).
- Desired outcome (the user's words, 2026-10-29): the user sees ONE agent; the runtime is a property of it, like the model. He stops the agent, selects another runtime (and model) in its settings, and just chats. The system detects the change itself and the new runtime takes over like a colleague takes over from someone on leave: it is told where the earlier work's journals and summary are, reads them, summarizes what was done, checks the workspace and continues. No "continue on another runtime" action.
- Observable success: stop a run; in its settings choose another runtime and model; send a message; the same agent in the same chat continues the work on the new runtime, `run_summary.md` exists, and the chat shows the earlier conversation unchanged.

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | A stopped run's settings let the user change the model only; the runtime is locked. | The settings of a stopped standalone run also let him choose another available runtime and a model of it; saving keeps the same run (same ID, same chat, same history row). | Restore on the same runtime; the model-only edit. |
| BEH-002 | System | SCN-001, SCN-003 | The first message after a restore is just the user's text. | When the run's runtime was changed since its last session, the first message after the change carries a system hand-over notice before the user's text: where the earlier journals and `run_summary.md` are, the stop reason when known, what does not carry over, and instructions to read, summarize into `run_summary.md`, check the workspace, verify and continue. | The journal stays derived and read-only. |
| BEH-003 | System | SCN-003 | No runtime-neutral run summary exists (F-12). | `run_summary.md` is an optional file beside the raw traces, written by the agent if it wants; no tool or limits. | Raw traces, journal, memory search unchanged. |
| BEH-004 | User | SCN-001 | The saved data does not say why a run stopped (F-04). | The settings and the notice show the stop reason when the live error event was seen, as the provider's own message; nothing is classified. | Provider-error contract. |
| BEH-005 | User | SCN-001 | One conversation per run. | The conversation shows the earlier messages unchanged (history comes from the raw traces, not from a runtime: F-15) and a marker at the switch (DEC-3). | History projection. |
| BEH-006 | System | SCN-004 | Unknown whether another runtime's file tool can read the run's folder (U-2). | If it cannot, the notice carries a bounded excerpt. | — |

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
| UC-001 | Change the runtime and model of a stopped standalone Agent run in its settings and continue by chatting | SCN-001, SCN-002 |
| UC-002 | Repeated switches (A to B to C): the newest colleague reads the short summary first | SCN-003 |
| UC-003 | A run writes and reads its `run_summary.md` | SCN-003 |

### Out Of Scope

- Started by an agent or by the Model Router (autobyteus-314 builds on this).
- Automatic switching; choosing the runtime for the user.
- Team members, Org members and delegated copies (DEC-4, needs the user): other roots, addresses and links.
- Switching a running run (it must be stopped first, as for the model).
- A background summary service for memory search (autobyteus-185 FU-005).
- Classifying provider errors; changing restart-and-resume (autobyteus-283 to 289).
- Carrying running processes, open tool results, the model's reasoning, or the old provider session.

### Non-Goals

Perfect continuation: its quality depends on the new agent's model. The feature gives it the facts and pointers.

### Preserved Behavior Boundary

Restore and chat on the same runtime; the model-only edit; journal derivation and its "derived and deletable" rule; raw traces and history projection; memory search; no user memory written in experiments.

### Prerequisites

None found so far. `FU-001` (a trace record for a failed turn) is not a prerequisite for the first slice because the stop reason can be taken from the live event; the design decides.

### Review Authority

Findings must cite REQ/AC/BEH IDs. New behavior is a `Requirement Gap`.

## Requirements

| ID | Requirement | Behaviors | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | A stopped, unarchived standalone Agent run's settings offer the available runtimes and, for the chosen runtime, its models; saving validates the pair against the runtime, keeps the run ID, workspace and history, drops the previous runtime's session binding, and records the switch (time, from runtime, to runtime). | BEH-001 | Must | User, 2026-10-29 |
| REQ-002 | The first input after a switch is preceded by a system hand-over notice with facts and pointers: earlier journal files in order with runtime, period and size, `run_summary.md` if it exists, stop reason when known, the user's last request, and what the journals do not contain. It does not prescribe how the agent proceeds. The notice is sent once per switch. | BEH-002, BEH-004 | Must | User model |
| REQ-003 | The run's journal is made current from its raw traces before the notice is built. | BEH-002 | Must | F-05 |
| REQ-005 | The hand-over notice may suggest `run_summary.md` in the run folder as the place for a summary for the next colleague; the system provides no tool and sets no size, format or requirement for it, and lists the file in the next notice if it exists. | BEH-003 | Should | User, 2026-10-30: "we do not limit it" |
| REQ-006 | The notice says what does not carry over (including open tool calls whose result is unknown). | BEH-002 | Must | F-02, F-08 |
| REQ-007 | For a large journal the notice tells the agent to read the latest part fully and earlier parts by search or line range; the settings show the journal size when the runtime is switched. | BEH-002 | Must | F-03 |
| REQ-008 | If the new runtime cannot read the run's folder, a bounded excerpt is included instead (after U-2). | BEH-006 | Should | U-2 |
| REQ-009 | The stop reason is the provider's own message and structured code if given; nothing is classified. | BEH-004 | Should | autobyteus-314 C-01 |
| REQ-010 | A switch writes one record (from runtime, to runtime, time) and starts a new raw-trace file at it, using the existing rotate-before-boundary primitive; the record is the first record of the new file. Each journal file is translated with the runtime of its raw file, found from the latest switch record at or before it (the first switch's `from` for earlier files). | BEH-002 | Must | F-01, F-07; user 2026-10-29 ("whichever is simpler"), DEC-7 |
| REQ-011 | The chat shows a marker where the runtime changed (DEC-3), built from the same switch record. | BEH-005 | Should | User question |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Stop a run, switch to another available runtime and model, save | Same run ID and chat; metadata shows the new runtime and no old session ID; the switch is recorded | Test + real run |
| AC-002 | REQ-002, 003 | Send a message after the switch | The runtime receives the notice then the user's text; the journal in the notice is current; a second message has no notice | Test |
| AC-003 | REQ-005 | A summary file exists at the next switch | The notice lists it; no tool, size or format is enforced | Test |
| AC-004 | REQ-006, 007 | Large journal | Notice instructs partial reading; settings show sizes | Test |
| AC-005 | REQ-009 | Run stopped by a scripted usage-limit error | Settings and notice show the provider's message | Test on a scripted runtime |
| AC-006 | REQ-010 | A run with Claude then Codex files | Each journal file uses its runtime's translation | Test |
| AC-007 | Preserved | Same-runtime restore; model-only edit | Unchanged | Existing suites |
| AC-008 | REQ-001…003 | Real run: two available runtimes on a copied, isolated data root | The new agent states what was done and continues the work | Real run (no general quality promise) |

## Relevant Scenarios And Journeys

| ID | Kind | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Run stopped by a usage limit, sign-out or unavailable model; he switches its runtime and chats | The same agent continues on the new runtime | Supported Normal Scenario | Task; user 2026-10-27/29 |
| SCN-002 | User | Run he stopped himself | Same | Supported Explicit Edge Scenario | User 2026-10-29 |
| SCN-003 | System | A second and third switch | Short summary first, journals on demand | Supported Explicit Edge Scenario | User's relay of colleagues |
| SCN-004 | System | New runtime cannot read the folder | Excerpt fallback | Unclear until U-2 | Notes |
| SCN-005 | Agent/Router | Agent or Router switches the runtime | — | Technically possible, not supported yet | autobyteus-314 |

## Decisions

| ID | Decision | Owner | Reasoning |
| --- | --- | --- | --- |
| DEC-1 | **Same run, runtime changed** (supersedes SR-002's "new linked run"). | **The user** (2026-10-29) | One agent for the user; a separate run would split the chat (his point). Feasible: history comes from raw traces (F-15) and the runtime lock is one attribute in the settings UI (F-16). Costs: journal needs file-level runtime (REQ-010); the old session is dropped. |
| DEC-2 | **The next colleague reads and decides**; it may summarize into `run_summary.md`. No tool, no limits (decided 2026-10-30). | **The user** | Works at the failure; no extra model; the agent is capable of deciding. |
| DEC-3 | The chat shows a small marker at the switch ("Switched from Claude to Codex"). | **The user** (2026-10-29: "a marker in the chat where the runtime changed was a good marker") | The new agent's tone and tools change; the user sees why. |
| DEC-4 | First slice: one standalone Agent; Teams, Orgs and delegated copies right after. | **Needs user** (scope; his example mentioned teams) | Recommended: yes, since a member needs its address, links and Task rules; not yet investigated. |
| DEC-5 | Stop reason is the provider's message, never classified. | Solution Designer | Provider-error contract. |
| DEC-7 | Rotate the raw-trace file at a switch (not one continuous stream). | Solution Designer (the user left it to the simpler/cleaner option) | One raw file = one runtime keeps the journal file a pure function of one raw file; `rotateActiveRawTracesBeforeBoundary` exists (compaction, retry-safe). |
| DEC-6 | The suggested summary file sits beside the raw traces, not inside `work_journal/`. | Solution Designer, from the user's idea | `work_journal/` is derived and deletable. |

## Assumptions / Unknowns

U-1…U-5 in the investigation notes. AC-007 and U-4 test quality on a real run; they do not promise it.

## Readiness Check

Requirements are stable, linked and testable; open evidence items are tests, not product decisions. Ready for design.
