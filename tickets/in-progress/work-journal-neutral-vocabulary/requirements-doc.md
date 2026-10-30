# Requirements Document — autobyteus-331 (Work Journal: neutral vocabulary)

## Document Status

- Status: `Approved` (requirements basis; the design is not yet approved by the user, and no build starts before he approves it)
- Current solution revision ID: `SR-001`
- Package identifier: `work-journal-neutral-vocabulary`
- Request / ticket: Project Task `autobyteus-331` "Work Journal: neutral vocabulary (describe what was done, not which tool), no migration" (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the user (2026-10-30)
- Requirements owner: Solution Designer
- Date: 2026-10-30
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's message to the user in this conversation of 2026-10-30, which states the intended behavior, the decisions made and the cost note. The wording decisions N-1…N-9 were delegated by the user ("you know the best", 2026-10-30) and are recorded in the contract §10; the requirements contain no `Needs user` decision.
- Exact approved requirements baseline: this document at `SR-001` with the supplement `work-journal-neutral-vocabulary-contract.md` (the vocabulary, §3 to §11).
- Behavior-defining supplements: `work-journal-neutral-vocabulary-contract.md` (canonical copy in this folder; approved with this baseline). Evidence supplement: `journal-neutrality-analysis.md`.

## Problem And Desired Outcome

- Problem: the Work Journal is meant to be runtime-neutral (its contract principle 2: "any person or any runtime can read it"), but only files, commands, web and edits are. Every other tool prints as `Tool: <name as the runtime recorded it> key=value`. The platform's own tools (send a message, tasks, browser, media) show as raw tool names with argument shapes that differ by runtime and version; runtime-only tools show names the reader's runtime does not have (Claude `Skill`, `TodoWrite`, `Agent`; Codex `js`, `speak`; AutoByteus `get_process_output`); a skill load has three shapes; and a message the platform refused prints `→ ok`.
- Affected actors: an agent that reads or continues work from a journal written on another runtime (also the future cross-runtime resume of autobyteus-316); a person reading the Memory page; memory search (its cards and chunks are built from journal text).
- Desired outcome: each journal line says what was done (load a skill, send a message to X, run JavaScript, open a page) and not which runtime's tool did it, for every tool the contract lists, on all five runtimes; the same job gives the same words on every runtime; a refused message says it failed; journals are regenerated from the raw traces without any migration.
- Observable definition of success: rendering the contract's synthetic trace for each runtime gives the neutral lines of contract §11; the same action has the same words on all runtimes; a regenerated journal set contains no `Tool: send_message_to`, `Tool: Skill` or other converted tool name in a head line.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenarios | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Platform tools print as `Tool: <name> key=value … → ok` and the result as recorded | The neutral line of contract §3 (`Message to /reviewer (task_result) → delivered`, `Browser: open <url>`, `Create project task: <title>` …) | Arguments and results stay readable below the line; the raw-trace link keeps the original name and data | E-01, E-12 |
| BEH-002 | System | SCN-001 | Runtime-only tools print their own names | The neutral line of the runtime's table in contract §4 (`Load skill: x`, `Update to-do list (2 items)`, `Spawn sub-agent: …`, `Run JavaScript: …`, `Read output of background task 4242`) | The runtime's built-ins keep their neutral lines unchanged | E-02, E-03 |
| BEH-003 | System | SCN-001 | A skill load is Claude's `Tool: Skill` or a `Command:` that reads a `SKILL.md` | One line, `Load skill: <name> → <outcome>`, on every runtime (rule: contract §5) | Any other command stays a `Command:` | E-14, E-18 |
| BEH-004 | System | SCN-001 | A message the platform refused prints `→ ok`; an accepted one `→ ok` | Accepted: `→ delivered`; refused: `→ failed: <platform's message>` | All other outcome words | E-04 |
| BEH-005 | System | SCN-004 | Tools that no longer exist are generic lines | They keep a neutral line (`create_or_update_task`, `create_or_update_project`, `manage_task`) or their existing line (`read_media_file`) | Their journals still render | E-10, E-11 |
| BEH-006 | System | SCN-001 | `<server>.<tool>` / `mcp__<server>__<tool>` names print whole | `Tool: <tool> (via <server>) <arguments> → <result>`; never mistaken for a platform tool | Unknown tools keep the generic line and their name | E-12 |
| BEH-007 | System | SCN-002 | A revision change would refresh a run only when it next ends a turn or its raw traces change (E-08) | The first memory-index catch-up pass after the update regenerates every journal; the stored files are replaced in place | Raw traces are never touched; nothing is deleted by hand | E-07, E-08 |
| BEH-008 | User | SCN-003 | Rebuild on the Memory page does not regenerate journals (E-09) | Rebuild regenerates every journal, then rebuilds the index | The button, its confirmation and its progress | E-09 |
| BEH-009 | System | SCN-001 | The journal format parses; memory search builds chunks and cards from it | New lines parse as actions; memory search reads regenerated journals unchanged | Memory search's interfaces and its tool | E-05, E-06 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Agent on another runtime / a person | Understand what an agent did | Same words for the same action | Never a tool it does not have as an instruction |
| The user | Neutral journals without a migration | Regenerated in the background after the update; Rebuild as the recovery | One-time background cost (REQ-013) |
| Memory search | Search journals | Works on regenerated journals | Its index is rebuilt for changed files |
| autobyteus-316 (the runtime switch) | A hand-over journal another runtime understands | Neutral vocabulary | Not a dependency in code |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Render the neutral vocabulary of the contract (platform tools, runtime-only tools, skill load, outcomes, history names, qualified names) for the five runtimes | SCN-001, SCN-004 |
| UC-002 | Regenerate all journals after the renderer changes, with no migration | SCN-002 |
| UC-003 | Rebuild on the Memory page regenerates journals | SCN-003 |
| UC-004 | Guard the result (completeness test, neutrality test) and report the cost | SCN-001, SCN-002 |

### Out Of Scope

- Changing any tool, runtime backend, raw trace, the run-history, or other platform code (the user, 2026-10-30).
- Journals without a recorded runtime (226): they keep the generic rule; deriving a runtime for them is FU-001.
- Wording for tools the user installed (ssh, video, email, `speak` if installed): they use the generic rule.
- A per-run regenerate action or a new screen; a startup scan of all journals.
- The runtime switch of autobyteus-316; changes to the memory-search index design, its ranking or its tool.
- Model-written summaries (autobyteus-185 FU-005).

### Non-Goals

100% semantic neutrality of content: the agent's own words, the content of a call (for example the code in a Codex `js` call) and the names of tools the user installed stay as recorded.

### Preserved Behavior Boundary

Journal format and header; entry shapes (`[HH:MM:SS] head → outcome`, details, links); the built-in lines (`Command:`, `Write file:`, `Edit file:`, `Search web:`); non-tool record lines (§8 of the old contract, decision D5: what is omitted stays omitted); pairing and shortening limits; determinism (no model, no clock); atomic file writes; the raw traces; the manifest shape except the revision value.

### Prerequisites

None found. (The environment note E-19 is for the build phase, not a prerequisite of the behavior.)

### Review Authority

Blocking findings cite a REQ, AC or BEH ID. New behavior is a `Requirement Gap` for the user.

## Requirements

| Requirement ID | Requirement | Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every current platform tool of contract §3 (messages, delegation, handoff rules, project tasks and projects, browser, media, discovery, memory search, publish artifacts, routing answer) prints its neutral line on every runtime, whatever argument shape that runtime uses (message: `recipient_name`, `recipient_address`, `target_agent_run_id`); the tool's recorded name does not appear in the line | BEH-001 | Must | The goal | User; contract §3 |
| REQ-002 | Every tool marked NEW in contract §4 prints its neutral line (Claude: `Skill`, `TodoWrite`, `Agent`, `ToolSearch`, `TaskCreate`, `TaskUpdate`, `TaskOutput`, `TaskStop`, `Workflow`; Codex: `js`, `js_reset`, `js_add_node_module_dir`, `speak`; Antigravity: `Bash`; AutoByteus: `get_process_output`, `stop_background_process`, `replace_in_file`, `download_media`, `download_video`, `convert_video_format`, `submit_task_result`) | BEH-002 | Must | The user asked for the rare ones too | User |
| REQ-003 | A skill load is one line, `Load skill: <name> → <outcome>`: Claude's `Skill` tool, and on every runtime a plain read (`cat`, `sed -n`, `head`, `nl`; one path, no pipe, `&&`, `;`, redirect) of a `SKILL.md` whose grandparent folder name ends with `skills` (or is `.system` under one); any other command stays a `Command:` | BEH-003 | Must | The user's example | User; contract §5 |
| REQ-004 | A message the platform accepted prints `→ delivered`; one it refused (`accepted: false`) prints `→ failed: <the platform's message>`; every other outcome word is unchanged | BEH-004 | Must | Today a refusal prints `→ ok` | Evidence E-04 |
| REQ-005 | Tools that no longer exist keep working in old journals: `create_or_update_task`, `create_or_update_project`, `manage_task` print their neutral lines; `read_media_file` keeps its existing line | BEH-005 | Must | Journals are rebuilt for old runs | E-10, E-11 |
| REQ-006 | A server-qualified tool name prints as `Tool: <tool> (via <server>) <arguments> → <result>` and never reaches the platform converters; every other unknown tool keeps the generic line with its recorded name | BEH-006 | Must | A user's MCP tool must not be mistaken for a platform tool | Contract §2, §6 |
| REQ-007 | A journal file that contains no converted entry renders byte-identically to today; the header, non-tool records, links, pairing, shortening limits and determinism are unchanged | BEH-001…009 | Must | Preservation | Old contract |
| REQ-008 | `WORK_JOURNAL_RENDERER_REVISION` is raised, and the raw-trace fingerprint used by the memory-search Journals step includes it, so the first catch-up pass after the update regenerates every journal; no migration runs and no journal is deleted by hand | BEH-007 | Must | The user: no migration | N-7 |
| REQ-009 | The Memory page's Rebuild regenerates every journal from the raw traces (ignoring the stored closed files) and then rebuilds the index | BEH-008 | Should | The user asked for an on-demand regeneration | User conversation |
| REQ-010 | The new lines are read as `action` entries by the journal reader, and memory search builds its chunks and cards from the regenerated journals without any change to its interfaces | BEH-009 | Must | Consumers | E-05, E-06 |
| REQ-011 | A test fails when a current platform tool (the tool registry's names) is neither converted nor on the explicit "generic on purpose" list | UC-004 | Must | The tool set grows | Contract §2 |
| REQ-012 | A neutrality test over the rendered synthetic traces of all five runtimes finds no recorded name of a converted tool in a converted line, no runtime skills-folder path in a `Load skill` line, and no `{"accepted"` wrapper; and the same job gives identical neutral lines on all runtimes for the skill load, the message and the browser step | UC-004 | Must | Outcome to verify | Task |
| REQ-013 | Before finalization the cost is measured and reported on an isolated copy of the memory: journal files changed, regeneration time, memory-search re-index time and size change, the evaluation's known-answer queries before and after, and the count of skill reads converted | UC-004 | Must | The Task asks for the measured re-index cost | Task |
| REQ-014 | The module documentation (`agent_work_journal.md`) describes the neutral vocabulary and the regeneration rule | UC-004 | Should | Docs follow the change | Delivery |

## Acceptance Criteria

| AC | Requirement IDs | Behavior / Scenario | Trigger | Observable Expected Outcome | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Render the synthetic platform-tool cases of contract §11 group 5 for each runtime | Every platform tool prints its §3 line; message shapes `recipient_name`, `recipient_address`, `target_agent_run_id` all give `Message to <as given> …` | Unit tests with synthetic records |
| AC-002 | REQ-002 | BEH-002 | Render each runtime's NEW rows (§11 group 4) | The lines of contract §4 | Unit tests |
| AC-003 | REQ-003 | BEH-003 | Claude `Skill` call; plain reads on each runtime; non-plain commands | `Load skill: x → ok` for the first two; `Command:` for `cd … && cat`, two paths, a folder named `agents`, and a failed read keeps `→ failed` | Unit tests incl. the negative cases |
| AC-004 | REQ-004 | BEH-004 | A message with result `accepted: true` and one with `accepted: false` | `→ delivered`; `→ failed: <message>` | Unit tests |
| AC-005 | REQ-005 | BEH-005 | Records of `create_or_update_task`, `create_or_update_project`, `manage_task`, `read_media_file` | Neutral lines / the existing media line | Unit tests |
| AC-006 | REQ-006 | BEH-006 | `plugin_management.search_plugins` (Codex), `mcp__acme__lookup_price` (Antigravity), and a qualified name equal to a platform tool's name | `Tool: <tool> (via <server>) …` in all three; the third is not converted | Unit tests |
| AC-007 | REQ-007 | all | The existing renderer test suites on records without converted tools | Unchanged expected output | Existing tests stay green; byte-identity test |
| AC-008 | REQ-008 | BEH-007 / SCN-002 | A run whose journal was rendered with revision 1 and whose raw traces did not change; the Journals step runs after the update | Its journal is rendered again with revision 2 and replaced in place; its raw traces are unchanged | Service/pipeline test on a temp memory folder |
| AC-009 | REQ-009 | BEH-008 / SCN-003 | Rebuild on a memory folder whose closed journal files carry the current revision | Every closed file is rendered again | Pipeline test |
| AC-010 | REQ-010 | BEH-009 | Read a regenerated journal with `readJournalEntries`; build a card | New lines are `action` entries; the card's `Did:` line holds the neutral heads | Unit tests |
| AC-011 | REQ-011 | UC-004 | Add a platform tool name to the registry in a test | The completeness test fails until it is converted or listed | Test |
| AC-012 | REQ-012 | UC-004 | The neutrality test on the five synthetic traces | Zero violations; identical lines across runtimes for the three compared steps | Test (the contract §11 traces as fixtures) |
| AC-013 | REQ-013 | UC-004 | Shadow render on an isolated copy of the memory | A report with the measurements listed in REQ-013 | Report in the ticket's evidence folder |
| AC-014 | REQ-014 | UC-004 | Docs sync | The module doc names the vocabulary and the regeneration rule | Delivery review |

(The Task's "outcome to verify" — a Claude journal and a Codex journal of the same kind of work show the same wording for the same action — is AC-012.)

## Relevant Scenarios And Journeys

See `investigation-notes.md` § Supported Scenarios (SCN-001 to SCN-005 with validity and evidence). SCN-001 to SCN-004 are in scope; SCN-005 is out of scope.

## UI, Interaction, And Experience Requirements

- Applicable: `No` new UI. The Memory page's existing Rebuild button and its confirmation, and the progress step "Journals", are unchanged; only what Rebuild does changes (REQ-009).

## Quality And Non-Functional Requirements

- Converters are pure: no clock, no I/O, no model call; the same raw traces always give the same journal (old contract principle 10).
- A file of the journal module stays under 500 lines (project rule); each new platform converter file is one concern.
- Rendering one record is a map lookup plus the converter; no scan of other records is added. Regeneration time per journal stays of the same order as today's; the shadow render reports it (REQ-013).
- The memory-search UI stays responsive during the regeneration: the Journals step already yields between runs.

## Data Continuity And Acceptable Loss

- Stored subject: `work_journal/` folders (3,716 on the user's node; 7,509 files; 1.79 GB). They are derived data: the raw traces are the only authority and stay untouched.
- Acceptable loss: none. A journal file is replaced in place by an atomic write; there is never a moment without a journal. Old and new wording may coexist until the catch-up pass finishes.
- Migration: none (`Discard or Rebuild`, decided in the design spec; data-migration guideline checklist answered there).

## External Contracts And Dependencies

- The journal format as read by `readJournalEntries` and by memory search (E-05, E-06).
- The tools' recorded names and argument shapes are history in the raw traces, not code contracts; the journal never imports a tool's name constant at runtime.

## Supplemental Artifacts

`work-journal-neutral-vocabulary-contract.md` (behavior-defining, approved with this baseline); `journal-neutrality-analysis.md` (evidence); `probes/` (reproduction). Inventory in the investigation notes.

## Assumptions

- The recorded argument shapes of tools never seen in the data (`generate_video`, `publish_artifacts`) follow their parameter schemas; the converters read defensively (U-4).

## Decisions

| ID | Decision | Owner | Reasoning |
| --- | --- | --- | --- |
| DEC-001 | The vocabulary decisions N-1…N-9 of contract §10 | Solution Designer, on the user's delegation (2026-10-30) | The user: "you know the best"; reasoning in the contract |
| DEC-002 | REQ-009 (Rebuild regenerates) is in scope as `Should` | Solution Designer | The user asked how to regenerate on demand; the button exists; one option through three functions |
| DEC-003 | Journals without a recorded runtime stay generic; deriving their runtime is FU-001 | Solution Designer | Another functionality (run metadata and import); everything this ticket delivers works without it |
| DEC-004 | Tools the user installed himself keep the generic line | Solution Designer | The platform cannot know what they do; the name is their only identity |
| DEC-006 | The journal's header keeps its runtime label (`Runtime Claude · file …`) and the manifest keeps `runtime_kind`; neither is changed (the user, 2026-10-30: "its okay if it has, if it does not its also no problem") | Solution Designer | The renderer needs the runtime to pick the translation and the manifest uses it as the reuse key (`work-journal-service.ts:155`); no code reads the header's runtime word (the only header parse is the first day, `journal-entry-reader.ts:38,57`); a runtime name is provenance, not a confusing tool name; removing it would touch the header of every file for no behavior; the future runtime switch (autobyteus-316) uses the per-file runtime |
| DEC-005 | The one-time re-index cost (regeneration and re-chunking at the first start after the update; re-embedding of 82% of the cards, of the order of 50 minutes of background work, at the first search or live update, E-15) is accepted as inherent to the user's direction and is told to the user; the validation reports the measured numbers before finalization | Solution Designer, user informed | No alternative changes 82% of the journal text without re-embedding it |

## Traceability

BEH-001…009 → REQ-001…014 → AC-001…014; scenarios and evidence in the investigation notes; the vocabulary in the contract.

## Architecture Phase Input

Owners that exist: `WorkJournalFileRenderer` (sequencing), `RuntimeTranslation` per runtime (strategy), `commandLine` helpers, `WorkJournalService.reconcile`, memory search's Journals step. Open design questions for the design spec: where the platform converters live, how the skill rule is placed once, where the `delivered` outcome sits, how the revision reaches the fingerprint, how Rebuild forces regeneration.

## Readiness Check

### Content Ready For Approval

Problem and outcome are unambiguous; current behavior is evidence-backed (E-01…E-19); desired and preserved behavior are explicit; scope and non-goals are clear; requirements and acceptance criteria are stable and testable; the vocabulary supplement is linked and approved with this baseline; unknowns are listed with how each is settled; no `Needs user` decision remains.

### Approved Basis Ready For Design

Yes: approved within the direction (see Document Status).
