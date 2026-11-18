# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `web-ui-cleanup-round` (Project Task `autobyteus-320`, merged from autobyteus-320, 315, 196, 145, 177; item 6 moved from autobyteus-312)
- Request / ticket: autobyteus-320, a web UI cleanup round of six small items
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on behalf of the user
- Requirements owner: Solution Designer
- Date: 2026-10-28
- Approved by and reference: `User` for the decisions that needed him (DEC-001, DEC-002, DEC-003; his messages in the Solution Designer's conversation, 2026-10-28, quoted in the Decisions table); the rest by the Solution Designer within the Task's direction, user informed in the same conversation
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements: `icon-inventory.md` (approved icon dispositions)

## Problem And Desired Outcome

- Problem: beta 15 made 71 formerly invisible icons visible (autobyteus-294 H-28, `3a87152631`), crowding Settings, Local Tools and MCP pages. Runtime names are spelled three ways across the app and server. The Embedding card has two wordings for one waiting state. The skill-update card alters file names containing Markdown characters. The Depends-on picker can ignore Enter right after opening. The Memory search box has no voice input, although task and agent inputs do.
- Desired outcome: a clean, text-first UI as before beta 15. One set of full runtime names everywhere. One "Waiting…" state. File names shown exactly. Enter works in the picker. Voice input in Memory search, identical to the existing voice input.
- Observable definition of success: the acceptance criteria below, seen in the app from a clean-clone build, with tests.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | The Settings sidebar shows an icon before each of 13 menu items | Text-only menu items | Every menu item, its order, text, selection highlight; the "Back to Workspace" arrow (visible before beta 15) | E-01 |
| BEH-002 | User | SCN-001 | Local Tools cards show a tinted icon box before each tool name; MCP server cards show an icon before Prefix, Command, URL and Working directory, and sparkles on "Sync Tools"; further decorative icons next to text labels across the pages in `icon-inventory.md` group B | Removed (groups A and B) | Group C icons: loading spinners, icon-only buttons, status icons, search magnifiers; autobyteus-244's MCP config row icons (`McpConfigRows.vue`, lock/trash) | E-02, `icon-inventory.md` |
| BEH-003 | User/Contract | SCN-002 | Runtimes are named three ways (full in chat headings and Model Routing; compact "Claude SDK" in the chat footer and Run Settings; short "Claude" in Settings → Agent Runtimes, update notices and every server text to agents) | Everywhere: "AutoByteus", "Codex App Server", "Claude Agent SDK", "Antigravity CLI", "Grok Build", from one list that server and web both read | Runtime kinds (stored/wire values) unchanged; translations unchanged (product names are not translated) | E-03 |
| BEH-004 | User | SCN-003 | Project indexes card: "Waiting to start…" (model ready) or "Waiting for the model…" (not ready) for a requested, not-started index | One state "Waiting…" (zh-CN "等待中…") | "Indexing N of M" and every other state; the model card above still shows the model's state | E-04 |
| BEH-005 | User | SCN-004 | Skill-update card renders file paths as Markdown, so `references/__init__.py` shows as bold `references/init.py` | Each changed-file path and the skill folder are shown literally (inline code) | Card label, file statuses, the agent receiving the notice, "…and N more files" | E-05 |
| BEH-006 | User | SCN-005 | Depends-on picker: if the list is already loaded when it opens and the newest option is a loop Task, Enter does nothing | Enter chooses the first choosable option | Loop Tasks shown but not choosable; arrow navigation skips them | E-06 |
| BEH-007 | User | SCN-006 | Memory → Search has no voice input | A voice input button in the search box, same component, behavior, transcription and settings as the task and chat inputs; the transcript fills the box; the user presses Search | Search behavior, placeholder, Search button | E-07 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| User | A clean, consistent UI | As above | No behavior change beyond the items |
| Agents | Read runtime names in tool output and results | The same names the app shows | Wire runtime kinds unchanged |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | View Settings, Local Tools, MCP and the other pages in `icon-inventory.md` without decorative icons | SCN-001 |
| UC-002 | Read runtime names anywhere in the app, and in server texts to agents | SCN-002 |
| UC-003 | Read the Project indexes state | SCN-003 |
| UC-004 | Read a skill-update notice card | SCN-004 |
| UC-005 | Choose a dependency with the keyboard | SCN-005 |
| UC-006 | Dictate a Memory search query | SCN-006 |

### Out Of Scope

- Icons that were already visible before beta 15 (not in `3a87152631`), other than group A/B rows. Example: "Back to Workspace", MCP config row icons.
- Model names and provider names (only runtime names change).
- The rest of autobyteus-312 (memory ordering, index size, rebuild notice, dead memory code).
- A wider UI-tidiness sweep beyond these items.

### Non-Goals

- Any new voice setting.

### Preserved Behavior Boundary

- The preserved columns of BEH-001…007; runtime kinds on the wire and in storage; group C icons.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The Settings sidebar menu items show text only. | BEH-001 | Must (user's first priority) | User | N/A | Task item 1 |
| REQ-002 | The icons in `icon-inventory.md` groups A and B are removed; group C stays. Where an icon sat in a tinted container that only framed it (tool cards, voice extension badge), the container goes with it. | BEH-002 | Must | User | N/A | DEC-001 |
| REQ-003 | Every runtime name shown by the web app or written by the server into agent-facing or user-facing text is the full name: AutoByteus, Codex App Server, Claude Agent SDK, Antigravity CLI, Grok Build. One list, in a contract package that both server and web read, is the only source. | BEH-003 | Must | User; consistency | N/A | DEC-002 |
| REQ-004 | The runtime names are in `GLOSSARY.md`. | BEH-003 | Must | DESIGN.md glossary authority | N/A | Task item 2 |
| REQ-005 | A Project whose indexing was requested but has not started shows "Waiting…" (zh-CN "等待中…"), whatever the model's state. | BEH-004 | Should | User (approved, "not so important") | N/A | Task item 3, DEC-004 |
| REQ-006 | The design repository's record of the Project indexes states shows one "Waiting" state, recorded through the Product Team. | BEH-004 | Should | Task | N/A | Task item 3, DEC-005 |
| REQ-007 | In the skill-update notice, each changed-file path and the skill folder are inline code, so the card shows them literally; a path containing a backtick still renders literally. | BEH-005 | Must | Task | N/A | Task item 4, DEC-006 |
| REQ-008 | When the Depends-on list opens, the active option is the first choosable one, also when the options are already loaded. | BEH-006 | Must | Task | N/A | Task item 5 |
| REQ-009 | Memory → Search has a voice input button: the existing component, transcription route, settings and status feedback; hidden when voice input is not available (as elsewhere); disabled while search is not ready; the transcript is merged into the search text, and the search runs only when the user presses Search (as the other inputs fill text and wait). | BEH-007 | Must | User | N/A (existing transcription reused) | Task item 6, DEC-003 |

## Acceptance Criteria

| AC ID | REQ | Behavior / Scenario | Trigger | Observable Expected Outcome | Alternate / Failure | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 | Open Settings | 13 menu items, text only; "Back to Workspace" keeps its arrow | — | Web test; look in the app |
| AC-002 | REQ-002 | BEH-002 | Open Local Tools, MCP Servers and each page in group A/B | No group A/B icon (tool card name without a box; MCP rows "Prefix: …", "Command: …" without icons; "Sync Tools" without sparkles); every group C icon still shown | — | Web tests per component; look in the app |
| AC-003 | REQ-003 | BEH-003 | Chat footer, model menu, Run Settings, member rows, Settings → Agent Runtimes, update notices, Model Routing | Full names everywhere ("Claude Agent SDK", never "Claude SDK" or "Claude") | Unknown kind: the kind itself, as today | Web tests; look in the app |
| AC-004 | REQ-003 | BEH-003 | Server: `list_available_agent_runtimes`, router errors, `delegate_task` launch notes, launch-usability reasons | Full names | — | Server unit tests |
| AC-005 | REQ-003 | BEH-003 | Code | No other runtime-name map in server or web (one list in the contract package) | — | Grep in review; contract test |
| AC-006 | REQ-004 | BEH-003 | GLOSSARY.md | Lists the five runtime names | — | Review |
| AC-007 | REQ-005 | BEH-004 | A Project whose index is requested, with the model ready and with it not ready | "Waiting…" in both cases (en); "等待中…" (zh-CN) | — | Component test (both model states, both languages) |
| AC-008 | REQ-006 | BEH-004 | Design repository | `search-model-settings` ui-ux-spec states table shows "Project: Waiting" as one state | — | Product Team's record (link in the delivery report) |
| AC-009 | REQ-007 | BEH-005 | Notice for files `references/__init__.py` and `notes/*draft*.md` | Card shows both literally | A path with a backtick renders literally | Server builder test; web card test |
| AC-010 | REQ-008 | BEH-006 | Open the list with options already loaded, newest option a loop Task, press Enter | The first choosable Task is chosen | All options loop Tasks: nothing chosen (as today) | Web regression test |
| AC-011 | REQ-009 | BEH-007 | Voice input enabled; Memory → Search | A microphone button in the search box, same look as the chat input's; recording, transcribing and "no speech"/failure status shown as in the task input; the transcript appears in the box; no search until Search is pressed | Voice not available: no button; search not ready: button disabled; microphone denied: the existing error | Component test; look in the app with the voice extension enabled |
| AC-012 | all | — | Existing suites | Pass; clean-clone proof | — | Delivery |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate | Validity | Evidence | Related IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Use Settings and tool pages | Open Settings and its pages | — | Browse | Clean text-first pages | — | Supported Normal | User's screenshots (2026-10-28) | REQ-001/002 |
| SCN-002 | User/Contract | User, agents | Recognize runtimes | Any runtime name | — | Read | One name per runtime | — | Supported Normal | E-03 | REQ-003/004 |
| SCN-003 | User | User | Know index progress | Settings → Server Settings → Embedding | A Task saved, index requested | Read | "Waiting…" then "Indexing N of M" | — | Supported Normal | E-04 | REQ-005/006 |
| SCN-004 | User | User | Know which skill files changed | A skill-update notice in a run | Skill files changed | Read card | Exact paths | — | Supported Normal | E-05 | REQ-007 |
| SCN-005 | User | User | Add a dependency with the keyboard | Task editor → Depends on | List loaded | Open, Enter | First choosable chosen | — | Supported Normal | E-06 | REQ-008 |
| SCN-006 | User | User | Search memory by voice | Memory → Search | Voice input enabled | Mic → speak → stop → Search | Transcript in box; search on press | Voice unavailable / mic denied | Supported Normal | Task comment | REQ-009 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (removals, text, one button reusing an existing component). No new Product design requested; the user's direction: clean, uncrowded, consistent.
- Linked UI/UX supplement: `icon-inventory.md`.
- Product design records: the design repository update for REQ-006 is requested from the Product Team (DEC-005).
- Required states: AC-011's voice states reuse the existing ones.
- Product decisions that need the user: none open.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-009, AC-011 | Accessibility | The voice button has the same label, title and keyboard reach as the existing ones | — | Component test |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` (texts and UI only; runtime kinds unchanged).

## External Contracts And Dependencies

| Contract | Required Behavior | Evidence | Risk |
| --- | --- | --- | --- |
| Agent-facing texts | Runtime names change from short to full | Agents read names, not kinds, only in prose | Low |

## Supplemental Artifacts

| Artifact | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `icon-inventory.md` | The 71 icons and their disposition | REQ-001/002, AC-001/002 | Approved by the user | DEC-001 |

## Assumptions

None.

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which icons beyond the sidebar go? | Item 1 asks for a list first | `icon-inventory.md`: A (named by the user), B (decoration next to a text label), C (spinners, icon-only buttons, status, search fields) | Remove A and B, keep C. User: tool icons "should be removed as well"; MCP "so many identical icons … those should be removed"; "the spark icon … on sync tool should be removed"; "the majority of the proposal that you gave is actually quite good. As long as it makes the UI more clean" | User | Decided |
| DEC-002 | Which runtime names? | Three sets exist (E-03) | Full / short / compact | Full names everywhere. User: "the agent runtime names will be consistent in every place … It's not like short names"; "on the chat, that's the correct one … should be the same as the chat area" | User | Decided |
| DEC-003 | Voice search: fill, or search at once? | Behavior | The existing inputs fill text and wait for send | Fill and wait (follows the existing behavior, as the Task asks). User: "Voice input, that's correct" | User (proposal confirmed) | Decided |
| DEC-004 | Is "Waiting…" alone enough? | The two wordings carried the model's readiness | The model card directly above shows the model's state and progress (E-04) | Yes. User: "That's also fine if you want to change" | Solution Designer, user informed | Decided |
| DEC-005 | Who records the design-repository change? | The design repository is the Product Team's | The Product Team owns `autobyteus-web-design` | The Solution Designer asks the Product Team to record it; this ticket links the record | Solution Designer | Decided |
| DEC-006 | Where to make paths literal: server text or web rendering? | The agent and the card share one Markdown text | The builder already uses inline code for the skill name | In the builder: inline code for paths and the folder (backtick-safe). The agent reads the same text, with code marks | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 | E-01 |
| REQ-002 | UC-001 | BEH-002 | AC-002 | SCN-001 | `icon-inventory.md` |
| REQ-003 | UC-002 | BEH-003 | AC-003…005 | SCN-002 | E-03 |
| REQ-004 | UC-002 | BEH-003 | AC-006 | SCN-002 | — |
| REQ-005 | UC-003 | BEH-004 | AC-007 | SCN-003 | E-04 |
| REQ-006 | UC-003 | BEH-004 | AC-008 | SCN-003 | — |
| REQ-007 | UC-004 | BEH-005 | AC-009 | SCN-004 | E-05 |
| REQ-008 | UC-005 | BEH-006 | AC-010 | SCN-005 | E-06 |
| REQ-009 | UC-006 | BEH-007 | AC-011 | SCN-006 | E-07 |

## Architecture Phase Input

- Preserve runtime kinds and all group C icons.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence: `Yes`
- UI/UX approval: `N/A` (no new design; user decisions recorded)
- Material assumptions and decisions are visible: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact basis recorded: `Yes`
- Ready for architecture design: `Yes`
- Remaining blocker: none
