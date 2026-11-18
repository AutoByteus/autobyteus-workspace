# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `per-agent-episodic-catalog` (autobyteus-493)
- Request / ticket: Project Task autobyteus-493, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: "A per-agent episodic index …", with the founder's direction in its comments of 2026-11-17 (option A decided, option B not wanted now, dispatch on his word)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-17
- Approved by and reference: SR-001: `Solution Designer within the direction (user informed)`. SR-002: `User` direction, in the Solution Designer's conversation on 2026-11-17: "think from the agent's perspective … what other necessary information we need and remove those redundant ones" (after questioning the delegation/node fields and the Task key); the Solution Designer decided the resulting entry (DEC-013) and informed the user
- Exact approved requirements baseline / solution revision: this document at SR-002
- Behavior-defining supplements and their approved versions: `episodic-catalog-contract.md` (SR-002; the exact files, attributes and lines; written at the user's request of 2026-11-17)

## Problem And Desired Outcome

- **Problem:** a Work Journal belongs to one run and lives in that run's folder (`memory/agents/<run id>/work_journal/`, `memory/agent_teams/<team run id>/<member run id>/work_journal/`, `memory/agent_orgs/…`). One agent definition runs standalone, as a delegated copy, as a team member, as an org member, so its history is spread over hundreds of run folders (3,986 runs with raw traces on the founder's node, INV-D1). Nothing lists "all runs of this agent, in time order, with their journals". A memory-analysis agent (the reflection skill's full pass, the observer/memory maintenance team of autobyteus-agents-105, a future "dream" pass of autobyteus-482) must search or walk every run folder to find them.
- **Affected actors or systems:** the founder; agents doing memory analysis (reflection, observer, dream); the server's memory subsystem.
- **Desired outcome:** each agent definition has an **episodic folder** on the node, `memory/episodic/<encoded definition id>/`, named like its semantic memory folder, holding a **catalog** the system keeps current: one entry per run of that definition, in time order, with only what the agent needs to choose and open its past work: when the run worked, which run, what it was about (the Task's title, never a quote of any conversation), in which workspace, and where its journal files are (with each file's time range and size). The journals stay in their run folders; the catalog only points to them.
- **Observable definition of success:** an agent that is given (or derives) an agent's episodic folder reads one file and gets the agent's whole run history on that node in order, with the absolute path of every journal file, and the file is current within a minute of any journal change or run delete; nothing in any run folder is written by the catalog.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | No current supported behavior: no per-agent view of runs exists. Journals live in run folders; semantic memory is per definition (`memory/semantic/<encoded id>`). | An episodic folder per agent definition (`memory/episodic/<encoded id>`, the same encoded name as the semantic folder) holds that definition's catalog of runs on this node. | Journals, raw traces and every other file stay in their run folders; the semantic folder is unchanged. | INV-C1, INV-C2, INV-D1 |
| BEH-002 | System | SCN-002 | The journal service rewrites a run's journal at every turn end or compaction and tells its change listeners (memory search follows it). | The catalog follows the same changes: a new run appears, and an existing run's entry (last activity, journal files) is updated, within one minute. | Journal rendering, its listeners and memory search are unchanged. | INV-C3, INV-C4 |
| BEH-003 | Operational | SCN-003 | Archiving a run marks it in the run-history records (its folder and journals stay); deleting a run removes its whole folder (journals included). | Archive changes nothing in the catalog (the journals still exist; archive is the user's way of tidying the run list, not part of the agent's history). Delete removes the run's entries within one minute. | Archive and delete of agent, team and org runs work as today (the same guards, results and messages). | INV-C5 |
| BEH-004 | System | SCN-004 | — | At every server start the catalogs are rebuilt in the background from the run records and the journal files' headers. | Server start and agent runs are not delayed; no journal is rendered by the catalog; nothing in run folders is written. | INV-M1, INV-C3 |
| BEH-005 | Contract | SCN-001 | The run-history "summary" of a standalone run is the user's first message, word for word (INV-D3). | The catalog contains no text from any message, tool call, tool result or journal line, and does not use that summary. | — | INV-D3 |
| BEH-006 | System | SCN-001 | — | A node overview, `memory/episodic/index.md`, lists every agent that has a catalog (name, folder, run count, last activity). | — | INV-D2 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| The founder | Memory analysis of his agents becomes easy | One catalog per agent, current, pointing to the journals | His run folders are only read; no data migration; his approval and a backup before the first build on his node; release only on his word |
| Memory-analysis agent (reflection, observer agents-105, dream) | Read an agent's history in order | A catalog file with absolute journal paths | Reads with its file tools; no new tool needed |
| Server memory subsystem | Keep the catalog current | Incremental upkeep, bounded cost | Never disturbs runs, journals or memory search |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Read one agent's run history on this node, in time order, with journal paths, from its episodic folder | SCN-001 |
| UC-002 | The system keeps an agent's catalog current while its runs work (new runs, new or changed journal files) | SCN-002 |
| UC-003 | The system removes a deleted run from the catalog | SCN-003 |
| UC-004 | The system builds the catalogs from existing runs at server start, reading only | SCN-004 |
| UC-005 | Find which agents have catalogs on this node (node overview) | SCN-001 |

### Out Of Scope

- **Option B** (moving or copying journals into the episodic folder): not wanted now (the founder's word, 2026-11-17). The comparison with the code is recorded in the investigation notes (INV-B).
- Telling agents the path in their system prompt, and changes to the reflection skill or the observer agents (other repositories / Tasks; follow-up FU-001).
- A model-written (LLM) summary of each run (DEC-002).
- Access control for reading catalogs (none exists for journals either; DEC-009).
- A cross-node view; catalogs of memory imported from other nodes (`memory/imports/`); Memory Sync of the episodic folder.
- A UI for catalogs (the Memory page is unchanged).
- Mapping old definition-id forms (for example `team-local:` before `team-local-agent:`) onto current ones (DEC-006).
- Attributing run folders that no record attributes (DEC-007).
- autobyteus-491 (retired episodic/semantic memory items of the old compactor, and the stale Skill Self-Evolver): its own Task (DEC-010).

### Non-Goals

- Facts about a run that the agent does not need to choose and open its past work (DEC-013): run state (running, archived), team/org context, delegation source, node, runtime, Task key, file open/closed state.
- Completeness for runs that have no journal yet: they are listed with "no journal yet"; the catalog does not render journals.

### Preserved Behavior Boundary

- BEH-001 … BEH-004 preserved columns: journals and every run file stay where they are and are written only by their current owners; journal rendering, memory search, the Memory page, archive/delete/restore of runs, Memory Sync and semantic memory behave as today.
- A failure of the catalog never fails or delays a run, a journal update or a delete (REQ-012).

### Prerequisites

None. autobyteus-491 was checked: the old compactor's `episodic.jsonl` files sit inside run folders and no code writes them any more; the new `memory/episodic/` folder is a sibling of the run families, so nothing collides (INV-C7). This ticket reaches its goal without 491 (DEC-010).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every agent definition that has at least one run on this node attributed to it has an episodic folder `<memory>/episodic/<encoded definition id>/`, whose name is encoded exactly as the semantic memory folder's name. Runs are attributed by the definition id their records hold (standalone and delegated runs: run metadata; team and org members, task agents: their team or org execution tree), whatever the agent's semantic-memory setting. | BEH-001 | Must | One place per agent; the same name rule as the semantic folder so a reader can derive one from the other; names change, ids do not. | N/A | Founder 2026-11-17; DEC-008 |
| REQ-002 | The folder holds the agent's **catalog**: one entry per run of that definition on this node, oldest first by start time. Each entry gives exactly: start time and last activity time (UTC); run id; what it was about (REQ-004), when known; workspace; the absolute path of the run's journal folder and, for each journal file, its name, time range and size; or "no journal yet". Nothing else (DEC-013). | BEH-001, BEH-002 | Must | What an agent needs to choose and open its past work. | N/A (INV-D1, INV-D2 show every field is recorded) | Founder 2026-11-17 (agent's perspective, remove redundant); DEC-013 |
| REQ-003 | The catalog is one Markdown file, readable by an agent with a file tool (programs, such as the observer team's agents, read the same file). Its header names the agent and the run count, and says the file is maintained by the system and that the journals stay in their run folders. It carries no "updated" time: the entries' last activity tells recency, and an unchanged catalog stays byte-identical. | BEH-001 | Must | One catalog file, as the founder asked; no second copy to keep in step. | N/A | Founder 2026-11-17; DEC-011 |
| REQ-004 | Privacy: the catalog and the overview contain no text from any message, tool call, tool result, journal line or Task description, and never the run-history summary (which is the user's first message). "What it was about" is only the title of the Project Task the run worked on (its current Task as the Task records name it, in any role: assigned, sub-work or brought in), when they name one; otherwise the entry has no such line. | BEH-005 | Must | The founder's privacy rule: "a short summary with no quotes of his conversations". | N/A | Founder 2026-11-17; DEC-002, DEC-003 |
| REQ-005 | Live upkeep: when a run's journal is created or changed, the run's entry appears or is updated within one minute; bursts of changes are merged. | BEH-002 | Must | "The index must be kept current whenever a new work journal is created or changed." | N/A | Founder 2026-11-17 |
| REQ-006 | Delete: when a run (agent, team or org) is deleted, the entries of its runs are removed within one minute. Archive does not change the catalog. | BEH-003 | Must | The founder asked the team to settle this behavior; archived runs keep their journals, so they stay part of the agent's history; deleted means forgotten. | N/A | DEC-005 |
| REQ-007 | Build: at every server start the catalogs are rebuilt in the background from the run records and the journal files' headers; afterwards REQ-005 and REQ-006 keep them current. It never renders a journal, never writes, moves or deletes anything in a run folder, and does not delay server start or runs. | BEH-004 | Must | 3,986 runs on the founder's node; "an incremental index and a one-time build from the existing journals that touches nothing in the run folders". Upkeep is incremental; the start rebuild keeps no second state to go stale. | Measured: a full read of every run's records, manifest and the headers of its first and last journal file takes 6.6–12.6 s on the founder's node (INV-M1) | Founder 2026-11-17; DEC-011 |
| REQ-008 | The feature writes only inside `<memory>/episodic/`. | BEH-004 | Must | "The existing data is only READ." | N/A | Founder 2026-11-17 |
| REQ-009 | Node overview: `<memory>/episodic/index.md` lists every catalogued agent (name, folder, run count, last activity). | BEH-006 | Should | Lets an observer find all agents' catalogs. | N/A | DEC-012 |
| REQ-010 | The catalog files are the system's: rewritten as a whole when their content changes (never a half-written file; never rewritten when unchanged), and rebuilt from the records at each start, including the catalogs of agents whose runs are all gone (they then list no runs). | BEH-001 | Must | A derived view must heal itself; no churn on unchanged files. | N/A | DEC-011; ARCH-REV-001 AR-001 |
| REQ-011 | Each node keeps the catalogs of the runs whose folders are on that node. Imported memory and other nodes are not included; Memory Sync does not carry the episodic folder. | BEH-001 | Must | Remote nodes: "each node has its own". | N/A (INV-C6) | Task description; DEC-012 |
| REQ-012 | Containment: a run whose records cannot be read is left out with a logged warning naming it (DESIGN.md rule 7); a catalog failure is logged and never fails or delays a run, a journal update or a delete. | BEH-002, BEH-003 | Must | DESIGN.md rule 7. | N/A | DESIGN.md |
| REQ-013 | Documentation: the memory module docs and the glossary describe the episodic folder and catalog (the word "episodic" names this catalog), its format, update rules and the privacy rule. | BEH-001 | Must | Readers (agents, skills, the observer team) learn the path rule and format from the docs. | N/A | Team rule (docs sync) |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | BEH-001, SCN-001 | A standalone run of definition `D` has completed a turn | `<memory>/episodic/<encodeURIComponent(D)>/catalog.md` exists, the folder name equals the semantic folder name rule, and the catalog has one entry for the run with exactly the REQ-002 fields and the absolute paths of the journal files that exist | A definition id with `:` (team-local) gives one valid folder name | Unit + API/E2E |
| AC-002 | REQ-001, REQ-002 | BEH-001, SCN-001 | `D` has a standalone run, a delegated copy, a team-member run and an org-member run (and a task agent) | All appear in `D`'s one catalog, oldest first | — | Unit + API/E2E |
| AC-003 | REQ-004 | BEH-005 | Runs whose messages, tool results, journal lines and run-history summary carry unique marker strings | No marker string appears in any file under `<memory>/episodic/`; the Task title appears for a run whose Task records name a Task, and a run without a Task has no "about" line | — | API/E2E |
| AC-004 | REQ-005 | BEH-002, SCN-002 | A live run completes a turn; a new run of `D` completes its first turn | Within 60 s the existing entry's last activity and journal files are updated, and the new run has an entry | Several turns in a burst give one or two rewrites, not one per event | API/E2E (real app) |
| AC-005 | REQ-006 | BEH-003, SCN-003 | Archive a standalone run, a team run and an org run; delete another of each | Within 60 s: deleted runs' entries are gone; archived runs' entries are unchanged; other entries unchanged | A delete refused by its guard changes nothing | API/E2E |
| AC-006 | REQ-007, REQ-008 | BEH-004, SCN-004 | A server starts on a memory folder with runs and no `episodic/` folder | Catalogs are built for every attributed run; runs without a journal show "no journal yet"; a before/after listing (paths, sizes, modification times) of every file outside `episodic/` is identical | Server start is not delayed by the build | API/E2E |
| AC-007 | REQ-007, REQ-010 | BEH-004, SCN-004 | Restart (a) with no changes; (b) after one run changed, one run folder was removed, and every run of one agent was removed, while the server was stopped | (a) No catalog file is written (modification times unchanged). (b) The changed run's entry is current; the removed run's entry is gone; the agent with no runs left has a catalog listing no runs; every other catalog file is not written | Records are read once per start (the start pass reuses the full discovery's result; counted in a unit test) | Unit + API/E2E |
| AC-008 | REQ-009 | BEH-006 | Catalogs exist | `index.md` lists each agent with name, folder, run count and last activity | — | Unit |
| AC-009 | REQ-010, REQ-012 | BEH-002 | A catalog file was edited by hand; a run's records are damaged; the episodic folder cannot be written | Edited catalog: rewritten from records at the next update or start. Damaged run: left out with a warning naming it, others catalogued. Unwritable folder: error logged, runs and journals continue | — | Unit + API/E2E |
| AC-010 | REQ-007 | BEH-004, SCN-004 | A copy-on-write clone of the founder's memory folder (about 3,990 runs) on an isolated instance | The start build completes in the background; its time is measured and recorded (expected well under 2 minutes) | — | Real-app proof (TESTING.md), isolated instance |
| AC-011 | Preserved boundary | BEH-001 … BEH-004 | Existing suites for journals, memory search, run history archive/delete, Memory Sync, semantic memory | Pass unchanged | — | Existing suites |
| AC-012 | REQ-013 | BEH-001 | — | `agent_memory.md` (or the module doc the design names) and `GLOSSARY.md` describe the episodic folder, catalog format, update rules and privacy rule | — | Docs review |
| AC-013 | REQ-002 | BEH-001 | A catalog entry for a team-member run that was delegated, on a node with peers | The entry holds no team/org context, delegation source, node id, runtime, Task key, run state or file open/closed state | — | Unit |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | A memory-analysis agent (reflection pass, observer, dream) | Read one agent's history in order | The agent opens `<memory>/episodic/<encoded id>/catalog.md` (or `index.md` first) with its file tool | Catalogs exist | Read the overview → open the agent's catalog → open journal files by their absolute paths | The agent's whole history on the node, in order, without searching run folders | A run without a journal is listed as such | Supported Normal Scenario (new behavior; target trigger approved by the founder 2026-11-17) | Task autobyteus-493 comments; agents-105 | REQ-001…004, REQ-009; AC-001…003, AC-008 |
| SCN-002 | System | Journal service | A run's journal is created or changed | Turn end / compaction of a live run, or the memory search build rendering a journal | A run of `D` works | Journal file written → catalog entry updated | Entry current within 60 s | Burst merged | Supported Normal Scenario | INV-C3 | REQ-005; AC-004 |
| SCN-003 | Operational | The user (or an agent with history tools) | Delete a run | Run history delete of an agent, team or org run | Run is not active | Delete → entries removed (archive: no change) | Catalog lists only runs whose journals exist | Refused delete changes nothing | Supported Normal Scenario | INV-C5 | REQ-006; AC-005 |
| SCN-004 | System | Server start | Catalogs exist and are current | Server start | Existing run folders, maybe no catalogs | Background build reading records and journal headers | Catalogs current; nothing in run folders written | Damaged run left out with a warning | Supported Normal Scenario | INV-M1 | REQ-007, REQ-008, REQ-010; AC-006, AC-007, AC-009, AC-010 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: N/A — not applicable
- Explicitly illustrative fixture content or permitted implementation variation: N/A — not applicable
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: N/A — not applicable
- Product decisions that need the user: none

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-005, REQ-006 / AC-004, AC-005 | Reliability | Catalog current within 60 s of a journal change or delete | Live server | API/E2E |
| QR-002 | REQ-005, REQ-007, REQ-010 / AC-004, AC-007, AC-010 | Performance | Live upkeep reads only the changed run's root (its records and journal headers); the start build runs in the background, reads every run's records once and its journal headers once, and writes only catalogs whose content changed | ~4,000 runs | Work counts in unit tests; measured time on the clone |
| QR-003 | REQ-004 / AC-003 | Privacy | No conversation or tool text in catalog files | All runs | Marker test |
| QR-004 | REQ-008 / AC-006 | Operability | Writes only under `<memory>/episodic/` | All paths | Before/after listing |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new derived files only)
- Data or state that must be preserved: every existing file in the memory folder, unchanged (the founder: no data migration, his run folders only read).
- Loss, reset, rebuild, or regeneration that is acceptable: the episodic catalogs are derived; deleting them loses nothing (they are rebuilt at the next start).
- Retention, privacy, compliance, volume, downtime, or operational constraints: privacy rule (REQ-004). Before the first build on the founder's own node: his approval and a backup (his word, 2026-11-17); release only on his word. These are delivery/deploy gates, not product behavior.
- Unknowns requiring downstream investigation: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Semantic memory folder naming (`AgentMemoryLayout.getAgentSemanticMemoryDirPath`) | Same encoded folder name | `agent-memory-layout.ts` | None |
| Collaboration Model § 3 (where a run's memory is stored) | Unchanged | `collaboration_model.md`, DESIGN.md | None |
| Data Migration Guideline | No migration: new derived files only | DESIGN.md | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `episodic-catalog-contract.md` | The exact catalog and overview files: paths, attributes, line formats, order, privacy exclusions, when written | REQ-001…004, REQ-009, REQ-010; AC-001, AC-003, AC-008, AC-013 | Current (SR-002) | Behavior-defining; approved with SR-002 (requested by the user; content as discussed with him on 2026-11-17) |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Memory-analysis agents read catalogs with their existing file tools | No new tool in scope | agents-105 consumes it (FU-001) | Open, outside this ticket |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Option A (catalog) or B (move journals)? | The founder asked for a comparison | INV-B: journal lines link back to `../raw_traces_*.jsonl` (every line); the journal service, memory search, delete, Memory Sync all assume `work_journal/` inside the run folder; 9,071 journal files in 3,986 runs | The founder decided A on 2026-11-17 and said B is not wanted now. The code comparison supports this: B would break every journal link, make delete and sync reach outside the run, and need a migration of 3,986 runs, for no gain the catalog does not give. Recommendation: A only. | The founder | Decided |
| DEC-002 | A model-written summary per run, or one built from records? | Privacy, cost, determinism | A model summary sends his conversations to a provider for ~4,000 runs and may quote them; records give the Task, the place and the time | Build the summary from records only. The memory-analysis agents (agents-105) are the right place for written summaries, in their own semantic memory. | Solution Designer | Decided |
| DEC-003 | Include the Project Task? | It is the best "what was this run about" that is not a quote | Task titles are names written for the Task, already shown across the product; the descriptions and comments, which hold quotes, are not used. The key only serves looking the Task up, which a memory-analysis agent rarely needs | SR-002: the title only, when the Task records name the run's Task (SR-001 had key and title). | Solution Designer, after the user's question (SR-002) | Decided |
| DEC-004 | Show a run state (running/idle, archived)? | — | Live status goes stale; archive is the user's tidying of the run list, not part of the agent's history | SR-002: no state at all (SR-001 had `kept`/`archived`); "last activity" tells recency. | Solution Designer (SR-002) | Decided |
| DEC-005 | Archived and deleted runs | The founder asked to settle it | Archive keeps the run and its journals; delete removes the folder | SR-002: archived runs stay listed like any other (unchanged catalog); deleted runs are removed. | Solution Designer (SR-002) | Decided |
| DEC-006 | Old definition-id forms (88 team runs recorded as `team-local:…`, current `team-local-agent:…`) | They would land in a separate folder | No alias mechanism exists in the code; DESIGN.md rule 10 forbids permanent mappings of stored names in current code | Use the recorded id as it is, like the semantic folder. The old runs get their own folder and appear in the overview. | Solution Designer | Decided |
| DEC-007 | Run folders no record attributes (223 old standalone folders without metadata; agent-root collaboration members) | They cannot be placed under a definition | Folder names give a display name, not an id | Not catalogued (SR-002: no longer counted in the overview; a count helps no agent). FU-002. | Solution Designer | Decided |
| DEC-008 | Catalog for every definition or only semantic-memory-enabled ones? | Observer/dream analyze any agent | Cost is small | Every attributed definition. | Solution Designer | Decided |
| DEC-009 | Who may read a catalog? | The founder listed it as a point | Journals are readable today by any agent with file tools and through memory search; there is no per-agent read control | No new access rule: same as journals. | Solution Designer | Decided |
| DEC-010 | Do autobyteus-491 first or together? | The founder: "so the words 'episodic' are clean" | 491 (not dispatched, waits for his go) is library code in `autobyteus-ts` plus a data migration for the Skill Self-Evolver; no code writes `episodic.jsonl` any more; no path collision | Not a prerequisite and not absorbed here: different subsystem and owners. This ticket names the new concept clearly in code, docs and glossary. Recommend dispatching 491 alongside. | Solution Designer | Decided |
| DEC-011 | Automatic build at server start, or started by the user? One file or two? | "System-maintained" vs his data; a second copy must be kept in step | The catalog writes only in its own new folder; agents and the observer team's agents read Markdown | Automatic, in the background, rebuilt at every start (SR-002: no stored state between starts, so no JSON copy). One `catalog.md` per agent. On the founder's own node, delivery asks him and backs up first (his word); release only on his word. | Solution Designer (product behavior); the founder (his node) | Decided |
| DEC-012 | Which node | Remote nodes | Memory is per node | Each node catalogs its own run folders. SR-002: no node id in the catalog or its entries: every run in a node's catalog ran on that node, and the delegating node is the delegator's business, not the agent's history. | Solution Designer (SR-002, after the user's question) | Decided |
| DEC-013 | Which facts does an entry need, from the agent's perspective? | The user: "think from the agent's perspective … remove those redundant ones" | The agent uses its catalog to find past work and open the right journal. Needed: when (start → last activity, to place it on the timeline); what (the Task title, to choose); where in code (the workspace, the only hint for runs without a Task); the journal folder and, per file, its time range (to jump to a date) and size (a journal can be 13 MB). The run id stays as the entry's name (memory search and history tools use it). Not needed: who delegated, which node, team/org context and role (the definition id already names a team-local agent's team; the journal shows who it talked to), runtime, run state, Task key, file open/closed (the file name says `active`). | Entry = start → last activity, run id, Task title (when any), workspace, journal folder + files (name, time range, size). | Solution Designer, on the user's direction (SR-002) | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | — |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002, AC-013 | SCN-001 | — |
| REQ-003 | UC-001 | BEH-001 | AC-001 | SCN-001 | — |
| REQ-004 | UC-001 | BEH-005 | AC-003 | SCN-001 | — |
| REQ-005 | UC-002 | BEH-002 | AC-004 | SCN-002 | — |
| REQ-006 | UC-003 | BEH-003 | AC-005 | SCN-003 | — |
| REQ-007 | UC-004 | BEH-004 | AC-006, AC-007, AC-010 | SCN-004 | — |
| REQ-008 | UC-004 | BEH-004 | AC-006 | SCN-004 | — |
| REQ-009 | UC-005 | BEH-006 | AC-008 | SCN-001 | — |
| REQ-010 | UC-002, UC-004 | BEH-001 | AC-009 | SCN-004 | — |
| REQ-011 | UC-001 | BEH-001 | AC-002 | SCN-001 | — |
| REQ-012 | UC-002, UC-003 | BEH-002, BEH-003 | AC-009 | SCN-002, SCN-003 | — |
| REQ-013 | UC-001 | BEH-001 | AC-012 | SCN-001 | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001 … SCN-004.
- Product and system constraints architecture must preserve: journals and run files untouched; memory search unchanged; archive/delete unchanged; DESIGN.md rules 3, 5, 7, 8, 10.
- Decisions intentionally deferred to architecture design: the exact layout of the catalog file; how a delete reaches the catalog; debounce timing; module placement.
- Technical facts architecture should verify: run attribution for every family (reuse of the run-folder discovery); Task lookup by run; journal header times.
- Known feasibility or integration risks: none blocking; first build on the founder's data measured at 6.6–12.6 s in a Python probe.

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
- Remaining content blocker: none

### Approved Basis Ready For Design

- Approval recorded: `Yes` (SR-001: Solution Designer within the direction, user informed; SR-002: the user's direction "remove the redundant ones", entry decided in DEC-013 and the start/Task-source refinements from ARCH-REV-001, user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: none
