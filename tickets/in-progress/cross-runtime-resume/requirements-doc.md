# Requirements Document — autobyteus-316 (cross-runtime resume)

## Document Status

- Status: `Approved` (SR-004, first delivery = one standalone Agent run). SR-003 was never approved; this version carries the user's decisions of 2026-10-27/29/30.
- Current solution revision ID: `SR-004`
- Package identifier: `cross-runtime-resume`
- Request / ticket: Project Task `autobyteus-316` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`). Blocks `autobyteus-314`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user (2026-10-27)
- Requirements owner: Solution Designer
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the user's decisions relayed by the Project Task Manager on 2026-10-30 (single agent first; "we should work on it now"), the user's own messages of 2026-10-29/30 (same agent, runtime in the settings, marker in the chat, rotation, no summary tool or limits, no stop reason, "previous agent", journals described instead of the last message), and my message to the user presenting this requirements basis with the design. Nothing in this basis changes scope or conflicts with his words; nothing is hard to undo (no stored data is migrated or deleted).
- Behavior-defining supplements: `run-runtime-switch-contract.md` (v2, layout and data model); approved with the design, not before. Evidence: `investigation-notes.md`.

## Problem And Desired Outcome

- Problem: when an agent's run stops mid-work because its runtime cannot continue (usage limit, signed out, model no longer offered), or the user stopped it, the work cannot continue on another runtime. Today only the model can be changed on a stopped run; its runtime is locked (`runtime-locked` in `ExistingRunSettings.vue`) because a run restores only from its own runtime's session (F-06).
- Desired outcome (the user's words, 2026-10-29): the user sees ONE agent; the runtime is a property of it, like the model. He stops the agent, selects another runtime (and model) in its settings, and just chats. The system detects the change itself and the new runtime takes over from the previous agent: it is told where the earlier work's journals are, can read them and continues. No "continue on another runtime" action.
- Observable success: stop a standalone agent run; in its settings choose another runtime and model; send a message; the same agent in the same chat continues the work on the new runtime with the earlier work carried over, and the chat shows the earlier conversation unchanged and a marker where the runtime changed.
- First delivery (the user, 2026-10-30): one standalone Agent run. Teams, Org members and delegated copies come later (`follow-ups.md` FU-003).

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-002 | A stopped run's settings let the user change the model only; the runtime is locked. | The settings of a stopped standalone Agent run also let him choose another available runtime and a model of it; saving keeps the same run (same ID, same chat, same history row, same workspace). | Restore on the same runtime; the model-only edit. |
| BEH-002 | System | SCN-001, SCN-003 | The first message after a restore is just the user's text. | When the run's runtime was changed since its last session, the first message after the change carries a system hand-over notice before the user's text (facts and pointers; the agent decides how to proceed). | The journal stays derived and read-only. |
| BEH-003 | — | — | Withdrawn 2026-10-30 (user): no summary file; the next agent reads the journals. | — | — |
| BEH-004 | — | — | Withdrawn 2026-10-30 (user): the stop reason is not needed to continue; it is not recorded, shown or sent. | — | — |
| BEH-005 | User | SCN-001 | One conversation per run; the chat of a run shows the records of its active raw-trace file. | The conversation shows the earlier messages unchanged and a marker at the switch (DEC-3), live and after a reload: the chat is built from the run's switch segments and its active file. Compaction keeps showing only the records after the latest compaction. | History projection for runs that never switched. |
| BEH-006 | — | — | Withdrawn 2026-10-30 (user): every runtime can read a file by shell command; the notice only says where the journals are. | — | — |
| BEH-007 | System | SCN-001, SCN-003 | Journals are translated with the run's one runtime (F-24). | Each journal file is translated with the runtime of its own raw file, so earlier work reads correctly after a switch. | Journals of runs without a switch are unchanged. |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required outcome | Constraint |
| --- | --- | --- | --- |
| User | Keep the work going when a runtime is out | One action, no re-explaining | Cost of reading is visible |
| New agent | Take over | Knows where the earlier work is recorded | Verifies before repeating |
| Model Router (later) | Act on a failed choice | Can start the same hand-over | Not in this ticket (autobyteus-314; `follow-ups.md` FU-004) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases (first delivery)

| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Change the runtime and model of a stopped standalone Agent run in its settings and continue by chatting | SCN-001, SCN-002 |
| UC-002 | Repeated switches (A to B to C): each journal file is read with its own runtime; the newest agent is pointed at all of them | SCN-003 |

### Out Of Scope

- Started by an agent or by the Model Router (autobyteus-314 builds on this): `follow-ups.md` FU-004.
- Automatic switching; choosing the runtime for the user.
- Team members, Org members and delegated copies (DEC-4, the user: later): other roots, addresses and links; `follow-ups.md` FU-003. A run that is a member or a delegated copy keeps its runtime locked.
- Application-owned and system-owned runs.
- Switching a running run (it must be stopped first, as for the model).
- A background summary service for memory search (autobyteus-185 FU-005).
- Classifying provider errors; changing restart-and-resume (autobyteus-283 to 289).
- Carrying running processes, open tool results, the model's reasoning, or the old provider session.
- Journals of runs with no recorded runtime (autobyteus-331 FU-001).

### Non-Goals

Perfect continuation: its quality depends on the new agent's model. The feature gives it the facts and pointers.

### Preserved Behavior Boundary

Restore and chat on the same runtime; the model-only edit; journal derivation and its "derived and deletable" rule; raw traces and history projection; memory search; no user memory written in experiments.

### Prerequisites

- **PRE-1 (a separate ticket, first; the user decided 2026-10-30):** one spelling for the agent runtime in stored raw-trace data. The raw-trace manifests and the compaction payloads store `CODEX`/`CLAUDE`/`ANTIGRAVITY`/`GROK_BUILD`/`AUTOBYTEUS` while everything else stores the `RuntimeKind` values; 316 reads the runtime of each archived raw-trace file (REQ-012) and must not keep a permanent label mapping (`DESIGN.md` rule 10). The prerequisite writes the `RuntimeKind` values and migrates the manifests with a sealed migration. Evidence and the suggested Task: `prerequisite-stored-runtime-names.md`. **Delivered:** autobyteus-343 is merged into `origin/personal` (merge `31eb1fb5d3`, 2026-10-30): the writers store the `RuntimeKind` value and a startup migration converted the manifests of this node's own runs; Memory Sync imports and old trace records keep the old spelling (the user's decisions). 316 is no longer waiting; a segment whose stored runtime is not a `RuntimeKind` value (an import not yet refreshed) is read as "runtime unknown" and rendered with the generic rules.
- `FU-001` (a trace record for a failed turn) is not needed: the stop reason is dropped (DEC-5). The neutral journal vocabulary (autobyteus-331) is delivered and released.

### Review Authority

Findings must cite REQ/AC/BEH IDs. New behavior is a `Requirement Gap`.

## Requirements

| ID | Requirement | Behaviors | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | A stopped, unarchived standalone Agent run's settings offer the available runtimes and, for the chosen runtime, its models; saving validates the pair as a fresh selection of that runtime, keeps the run ID, workspace and history, drops the previous runtime's session binding, and records that a switch is pending (time and the previous binding). The same holds when the run has delegated copies and its own selection is saved together with theirs; the copies keep their own runtimes. Selecting the original runtime again before the next message undoes the pending switch. | BEH-001 | Must | User, 2026-10-29 |
| REQ-002 | The first input after a switch is preceded by a system hand-over notice with facts and pointers: that another agent worked on the run before, where the journals are, where to start (the latest) and that the earlier ones are there if wanted, and how an entry looks. Written as one person handing over to another. It does not repeat the user's last request. It does not prescribe how the agent proceeds. It says "previous agent" and names no agent runtime or model (the agent acts on where the work is recorded; the user, 2026-10-30). It is sent once per switch. | BEH-002 | Must | User model |
| REQ-003 | The run's journal is made current from its raw traces before the notice is built. | BEH-002 | Must | F-05 |
| REQ-005 | Withdrawn 2026-10-30 (user: no round summary, no added complexity). | — | — | User |
| REQ-006 | Withdrawn 2026-10-30 (user): the notice does not list what the journals lack. | — | — | User |
| REQ-007 | The notice tells the agent where to start (the latest journal) and that the earlier journals are there if it wants them; the agent decides what to read. | BEH-002 | Must | F-03; user, 2026-10-30 |
| REQ-008 | Withdrawn 2026-10-30 (user): no excerpt fallback. | — | — | User |
| REQ-010 | A switch is made at the first input after it: a marker is the first record of a new raw-trace file and the previous agent's records are archived by an idempotent rotation, so one raw-trace file never holds records of two runtimes — including the records the new agent's own session writes while it starts (for example a native agent's system instruction), which follow the marker. A failure before the new session exists writes no marker and archives nothing; a retry never writes two markers; a user who gives up a failed attempt leaves no marker behind. | BEH-002 | Must | F-23; DEC-7; CRR-002 F-1 |
| REQ-011 | The chat shows a marker where the agent runtime changed (DEC-3), built from the marker record; it names both agent runtimes and models. | BEH-005 | Should | User question, DEC-3 |
| REQ-012 | Each journal file is translated with the runtime of its own raw-trace file (an archived segment: the runtime recorded for it; the open file: the run's current runtime). Journals of runs that never switched are unchanged. | BEH-007 | Must | F-24 |
| REQ-013 | A run that is a team member, an Org member, a delegated copy, application-owned or system-owned does not offer the runtime choice and the server rejects a switch for it. | BEH-001 | Must | DEC-4 |
| REQ-014 | After a reload or reopen, the chat of a switched run shows the earlier conversation (the previous agents' records archived at the switches), the marker, and the new agent's records, in order; the paging of earlier events follows the same sequence. A run that never switched, and compaction's latest-segment view, are unchanged. | BEH-005 | Must | The Task's observable success ("the chat shows the earlier conversation unchanged and a marker"); CRR-002 F-2 |

## Acceptance Criteria

| ID | Req | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 013 | Stop a run, switch to another available runtime and model, save | Same run ID and chat; metadata shows the new runtime and no old session ID and a pending switch; selecting the original runtime again clears it; a member or delegated run is rejected | Test + real run |
| AC-002 | REQ-002, 003, 010 | Send a message after the switch, to a native, Claude, Codex, Antigravity and Grok target | The previous records are archived, the marker is the first record of the active file (the new agent's own first records follow it, never the previous agent's segment), the runtime receives the notice then the user's text; the journal named in the notice is current; a second message has no notice; the chat shows the marker | Test |
| AC-004 | REQ-007 | Several journal files | The notice names the latest journal as the place to start and lists the earlier ones | Test |
| AC-006 | REQ-012 | A run with Claude Agent SDK then Codex App Server files | Each journal file uses its runtime's translation; a run that never switched renders as before | Test |
| AC-007 | Preserved | Same-runtime restore; model-only edit | Unchanged | Existing suites |
| AC-008 | REQ-001…003, 010 | Real run: two available runtimes on a copied, isolated data root | The new agent receives the notice and opens the journals it names (what it does with them is its model's work; no quality promise) | Real run |
| AC-009 | REQ-010 | Crash injected between the marker and the metadata commit; and a retry | One marker, one archived segment, the run usable | Test |
| AC-010 | REQ-014 | Switch a run twice; reload its chat; page earlier events; a run that compacted before and after | The earlier conversations, both markers and the latest records in order; paging follows the same sequence; a never-switched run and a compacted run read as before | Built-server test (RS-01 and a chat reload case) |

## Relevant Scenarios And Journeys

| ID | Kind | Trigger | Outcome | Validity | Evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Run stopped by a usage limit, sign-out or unavailable model; he switches its runtime and chats | The same agent continues on the new runtime | Supported Normal Scenario | Task; user 2026-10-27/29 |
| SCN-002 | User | Run he stopped himself | Same | Supported Explicit Edge Scenario | User 2026-10-29 |
| SCN-003 | System | A second and third switch | Every earlier journal file is listed with its runtime; the latest is read first | Supported Explicit Edge Scenario | User's relay |
| SCN-005 | Agent/Router | Agent or Router switches the runtime | — | Technically possible, not supported yet | autobyteus-314; FU-004 |
| SCN-006 | User | Run is a team member, Org member or delegated copy | Runtime stays locked | Unsupported in this delivery | DEC-4; FU-003 |

## Decisions

| ID | Decision | Owner | Reasoning |
| --- | --- | --- | --- |
| DEC-1 | **Same run, runtime changed** (supersedes SR-002's "new linked run"). | **The user** (2026-10-29) | One agent for the user; a separate run would split the chat (his point). Feasible: history comes from raw traces (F-15) and the runtime lock is one attribute in the settings UI (F-16). Costs: journal needs file-level runtime (REQ-010); the old session is dropped. |
| DEC-2 | **The next agent reads the journals and decides.** No summary tool, no summary file, no limits (decided 2026-10-30). | **The user** | Works at the failure; no extra model; the agent is capable of deciding. |
| DEC-3 | The chat shows a small marker at the switch ("Agent runtime changed from Claude Agent SDK to Codex App Server", with the agent runtime names of GLOSSARY.md). | **The user** (2026-10-29: "a marker in the chat where the runtime changed was a good marker") | The new agent's tone and tools change; the user sees why. |
| DEC-4 | First delivery: one standalone Agent; Teams, Orgs and delegated copies later (`follow-ups.md` FU-003). | **The user** (2026-10-30, via the Project Task Manager: "if the team thinks that the first delivery covers a single agent, that would be fine ... But we should work on it now") | A member needs its address, links and Task rules; the single agent is the smallest coherent delivery. |
| DEC-5 | No stop reason is recorded, shown or sent. | **The user** (2026-10-30) | The agent continues the work whatever stopped the previous one. |
| DEC-7 | Rotate the raw-trace file at a switch (not one continuous stream). | Solution Designer (the user left it to the simpler/cleaner option) | One raw file = one runtime keeps the journal file a pure function of one raw file; `rotateActiveRawTracesBeforeBoundary` exists (compaction, retry-safe). |
| DEC-6 | Withdrawn (there is no summary file). | — | — |
| DEC-8 | The marker is an ordinary platform notice record (sender `system.runtime_handover`), not a new raw-trace record type. | Solution Designer | The chat projection and the journal already read notices (F-28); fewer readers change. |
| DEC-9 | The switch is made when the first input arrives, not at the settings save; the save records only a pending switch. | Solution Designer | The save stays a quick settings edit that can be undone; the real work (new session, archiving, marker) happens once, in the activation that already owns starting a run. |
| DEC-10 | The settings do not show journal sizes (earlier REQ-007 detail dropped). | Solution Designer | The notice carries the sizes to the agent; showing them to the user adds a UI surface the Task does not ask for. |

## Assumptions / Unknowns

U-1…U-5 in the investigation notes. U-1 (stop reason) and U-2 (file access) are closed; U-3 and U-5 do not affect the first delivery. The real run checks delivery of the notice, not the quality of a continuation.

## Readiness Check

Requirements are stable, linked and testable; the quality of a continuation depends on the new agent's model and is not promised; the real run checks that the notice is delivered and the journals it names can be opened. Approved within the direction (SR-004). The Task's Done-when is: the user has seen and approved the design; then, for the first delivery, a run stopped by a usage limit on one runtime continues on another with the work carried over, shown by a test and a real run on isolated data; merged to `personal`.
