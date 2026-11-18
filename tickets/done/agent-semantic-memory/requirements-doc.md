# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `agent-semantic-memory`
- Request / ticket: Project Task `autobyteus-12` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Requested by: `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`), on the user's direction of 2026-11-09/10
- Requirements owner: Solution Designer
- Date: 2026-11-10
- Approved by and reference: `User`, in the Solution Designer conversation on 2026-11-10: "Thanks for the explanation I agree with you let's put the semantic inside the memory folder and don't rename no need to rename the episodic" (answer to the design summary: location `memory/semantic/<agent>/`, no history, switch + path in the app, minimal instruction section). Earlier in the same conversation the user stated that the system only gives the folder and the agent manages its semantic memory itself.
- Exact approved requirements baseline / solution revision: this document at SR-002 (REQ-001..009, AC-001..008, DEC-001..011) by the User; SR-003 refines REQ-002 and adds DEC-012 within that direction (Solution Designer, user informed 2026-11-10)
- Behavior-defining supplements and their approved versions: `semantic-memory-prompt-contract.md` (SR-004): the exact Semantic Memory instruction text, placement and presence rule realizing REQ-005; written at the user's request of 2026-11-10 with the text the user approved in the conversation (SR-002), Solution Designer within the direction, user informed

## Problem And Desired Outcome

- Problem: an agent has episodic memory (its runs' work journals) and procedural memory (its skills) but nowhere to keep reusable knowledge that belongs to the agent itself. Skills therefore write such knowledge into the current Project's folder, so it is relearned per Project; the agent package cannot hold it because package repositories are public.
- Affected actors or systems: agent authors (package and in-app), the user, agents at run time (first: Computer Use Operator), every agent runtime.
- Desired outcome: an agent author can enable semantic memory for an agent. The system then owns one private folder for that agent, outside every Project workspace and outside the package, and tells every run of that agent its path in the instructions. All runs of that agent, standalone, as a team member or as a delegated copy, in any Project, share it.
- Observable definition of success: a run of an enabled agent writes a document there from Project A; a later run of the same agent from Project B, and one as a team member, are told the same path and read that document. Agents without it see no change.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002, SCN-003, SCN-005 | Instructions are composed from the definition (+ team/collaboration, + Project); nothing about agent-owned knowledge | Enabled agent's instructions add a Semantic Memory section with the absolute path and how to use it | All existing sections unchanged; agents without it get identical instructions | `carpenter-prompt-composer.ts` |
| BEH-002 | User | SCN-004 | Per-agent config in `agent-config.json`, edited by the agent form; no semantic-memory setting | One optional on/off setting, default off, settable in the package file and in the app form; the detail page shows state and path | Other config fields and their editing unchanged | `agent-definition-config.ts`, `AgentDefinitionForm.vue` |
| BEH-003 | System | SCN-001, SCN-002 | No current supported behavior (no agent-owned knowledge location) | System creates and owns one folder per enabled agent definition on the node | Project workspaces and run memory unchanged | Task |
| BEH-004 | System | SCN-003 | A shared team member resolves to the same definition ID as the standalone agent | That member gets the same semantic memory as the standalone agent | Team-local/Org-owned/application-owned agents remain separate definitions | `marketing-team/team-config.json` |
| BEH-005 | System | SCN-002 | Codex default sandbox allows writes only in the working directory | The enabled agent can write its semantic memory in every runtime under its normal approval policy | Sandbox mode and approval policy otherwise unchanged | `codex-sandbox-mode-setting.ts` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Agents that get better across Projects | Knowledge learned once is reused everywhere | Knowledge stays private (not in public packages) |
| Agent author (package or app) | Decide which agents have semantic memory | One declarative setting | Not every agent needs it |
| Agent at run time | Read and write its knowledge | Knows the path and the rules; can write there | Its skill decides document structure |
| Computer Use Operator package (autobyteus-agents-23) | First consumer | Can enable it in its `agent-config.json` and point its skill at the path | Waits for this Task |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A run of an enabled agent is told its semantic memory path and writes reusable knowledge there | SCN-001, SCN-002 |
| UC-002 | A later run of the same agent, in another Project, as a team member or as a delegated copy, reads the same semantic memory | SCN-003 |
| UC-003 | An agent author enables or disables semantic memory for an agent (package file or app form) and sees the state and path | SCN-004 |
| UC-004 | Agents without semantic memory run exactly as before | SCN-005 |

### Out Of Scope

- Renaming or reorganizing the existing run-memory folders (`memory/agents`, `agent_teams`, `agent_orgs`), e.g. into an `episodic` folder (the user's decision, 2026-11-10).
- Browsing or editing semantic memory on the Memory page or elsewhere in the app (beyond showing the path) — DEC-003.
- Searching semantic memory with `search_memory` or any new search tool — DEC-003.
- Version history, backup or sync of semantic memory, including to/from other nodes — DEC-002, DEC-007.
- Locking or merging concurrent writes — DEC-006.
- The Computer Use Operator package change and the migration of existing `web-ui-sites` folders (Task autobyteus-agents-23).
- The Model Router's `knowledge.md` (unchanged).

### Non-Goals

- The system does not decide what knowledge is written or how documents are structured; the agent's skills do.
- No size limit, cleanup or summarization of semantic memory.

### Preserved Behavior Boundary

- BEH-001 preserved column: instructions of agents without semantic memory are unchanged byte for byte (REQ-008, AC-005).
- Run memory, work journals, `search_memory`, memory sync and the Memory page are unchanged.
- Runtime sandbox modes and approval policies are unchanged apart from making the agent's own semantic memory folder writable (REQ-006).

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Semantic memory is an optional per-agent-definition setting, off by default; an absent setting means off. | BEH-002 | Must | Not every agent needs it | N/A | Task direction; DEC-004 |
| REQ-002 | The setting is part of the agent's definition config (`agent-config.json`), so a package can declare it, and the app's agent form can turn it on and off; for agents from a package and built-in agents the app's choice is a personal setting (kept on the node across package updates, with "Reset to the package's/built-in setting"), for the user's own agents it is saved in their `agent-config.json`. The agent detail shows whether it is on and, when on, the folder path. | BEH-002 | Must | One source of truth for package and app; consistency with the existing skill-scope switch and the existing personal settings (tools, skills, avatar, default launch) | N/A | DEC-003, DEC-004, DEC-012 |
| REQ-003 | For an enabled agent, the system owns one folder per agent definition on the node where the run executes, in a `semantic` folder inside the server's memory folder (`<data-dir>/memory/semantic/<agent>/`), apart from the run folders (`agents`, `agent_teams`, `agent_orgs`), outside every Project workspace and outside every agent package. The system creates it when a run of that agent needs it; the path is stable and distinct per definition and valid on every supported desktop OS. | BEH-003 | Must | Private, system-owned, shared location | N/A | Task direction; DEC-001 |
| REQ-004 | Every run of an enabled agent, whatever its runtime, Project, team, Org or delegation, is told the same absolute folder path for that agent definition. Agents are identified by definition: a shared agent used as a team member (`refScope: shared`) or as a delegated copy is the same agent; a team-local, Org-owned or application-owned agent is its own agent with its own folder. | BEH-001, BEH-004 | Must | "Every run shares the same semantic memory" | N/A | DEC-005 |
| REQ-005 | The instructions of an enabled agent contain a short Semantic Memory section that states only: the absolute path; that it belongs to this agent and is shared by all its runs, in every Project and team; that reusable knowledge it learns is written there as documents, and how it organizes them is up to the agent and its skills. The system adds no further rules (no structure, concurrency or content rules). | BEH-001 | Must | Direction: path in instructions; the user: the agent manages its semantic memory itself | N/A | Task direction; DEC-010 (user, 2026-11-10); exact text: `semantic-memory-prompt-contract.md` |
| REQ-006 | In every supported runtime, the agent can read and write files in its semantic memory folder with its normal file and shell tools, under the same approval policy that applies to its workspace files; a runtime sandbox that restricts writes to the workspace also allows this folder. A sandbox mode the user set to read-only stays read-only. | BEH-005 | Must | Otherwise the agent is told a path it cannot write | Architecture probes per runtime (UNK-001) | Done-when; DEC-009 |
| REQ-007 | The system never deletes or rewrites semantic memory contents: turning the setting off, deleting or renaming the agent, or updating its package leaves the folder as it is; turning it on again gives the same folder back. | BEH-003 | Must | Data continuity | N/A | DEC-008 |
| REQ-008 | Agents without semantic memory are unchanged: no section in their instructions, no folder created, no change in runtime write access. | BEH-001, BEH-005 | Must | Direction; preserved behavior | N/A | Task direction |
| REQ-009 | A change of the setting applies to runs whose instructions are composed afterwards (new runs, and restored runs where the runtime composes instructions again); a running run keeps what it was told. | BEH-001 | Should | Matches how other definition changes apply | N/A | DEC-011 |
| DEC-012 | Where does the app's switch save for a package or built-in agent? | A save into package files is replaced at the next package update | (a) personal setting, like tools/skills/avatar/default launch; (b) write the package's `agent-config.json` | Personal settings exist for exactly this (per-node user choices on package and built-in definitions, kept across updates, resettable); (b) would silently lose the user's choice. **Decided (a).** Found in architecture investigation (AF-19); within REQ-002's direction. | Solution Designer (user informed 2026-11-10) | Decided |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-003, REQ-004, REQ-005 | BEH-001, SCN-001 | Enabled agent; standalone run started under Project A | Its instructions contain the Semantic Memory section with an absolute path; the folder exists; the path is `<data-dir>/memory/semantic/<agent>/`, not inside Project A's workspace, any package root or a run folder; the Memory page, memory search and memory sync do not list it | — | Integration test of composed instructions + real run |
| AC-002 | REQ-006 | BEH-005, SCN-002 | AC-001 run, in AutoByteus, Codex (default `workspace-write`) and Claude runtimes; ACP runtimes and Antigravity as far as installed | The run creates/edits a document in the folder with its normal tools and the file is on disk afterward; no sandbox denial | A runtime that cannot be made to write it is reported with evidence, not silently skipped | Real-runtime E2E per runtime |
| AC-003 | REQ-004 | BEH-001, SCN-003 | After AC-002; a new standalone run of the same agent under Project B | Same path in its instructions; the run reads and reports the document written in Project A | — | Real-run E2E |
| AC-004 | REQ-004 | BEH-004, SCN-003 | The same shared agent as a member of a team run (and as a delegated copy) | Same path in the member's instructions; it reads the document | — | Real team-run E2E; instruction test for delegation |
| AC-005 | REQ-008 | BEH-001, SCN-005 | Agent without the setting (absent or off) | Composed instructions identical to the base branch's; no folder created; Codex thread config unchanged | — | Snapshot/unit test against base output |
| AC-006 | REQ-004 | BEH-004 | Enabled team-local agent and enabled shared agent with the same local name | Two different folders | — | Unit/integration test |
| AC-007 | REQ-002, REQ-001 | BEH-002, SCN-004 | Agent form for a user's own agent and for a package agent | Switch shows current state; saving a user's own agent writes the setting to `agent-config.json`, keeping other fields; saving a package agent stores a personal setting (package files unchanged) with a reset link back to the package's value; detail page shows on/off and, when on, the path | Package file with the setting set reads as on | Web component test + API test |
| AC-008 | REQ-007, REQ-009 | BEH-003, SCN-004 | Enabled agent with a document; setting turned off; new run; setting turned on; new run | Off: no section, folder and document still present; on again: same path, document readable | — | Integration test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Coherent Goal | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps | Expected Outcome | Alternate / Error | Validity | Evidence / Decision | Related REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Run of an enabled agent | Know where its knowledge lives | Run start/restore | Setting on | System ensures the folder and adds the section to the instructions | Agent knows the path and rules | — | Supported Normal Scenario | Task direction | REQ-003..005, AC-001 |
| SCN-002 | User/System | Agent during work (e.g. operator learns LinkedIn's controls) | Keep reusable knowledge | Agent decides per its skill | SCN-001 | Agent writes/edits documents in the folder | Documents persist on the node | Runtime refuses write → defect against REQ-006 | Supported Normal Scenario | Task example | REQ-006, AC-002 |
| SCN-003 | System | Later run of the same agent: other Project, as shared team member (Marketing/Event Scouting teams), or as delegated copy | Reuse knowledge | Run start | Documents exist | Run is told the same path; reads what is relevant | Knowledge reused, not relearned | — | Supported Normal Scenario | Task "done when"; team configs | REQ-004, AC-003, AC-004 |
| SCN-004 | User | Agent author | Turn semantic memory on/off | `agent-config.json` in a package, or the app's agent form | — | Set/clear setting; detail shows state and path | Later runs follow the setting; contents kept | Read-only package agent: form cannot save (existing behavior) | Supported Normal Scenario | DEC-003/004 | REQ-001, REQ-002, REQ-007, REQ-009, AC-007, AC-008 |
| SCN-005 | System | Run of an agent without the setting | Unchanged behavior | Run start | Setting absent/off | As today | No section, no folder | — | Supported Normal Scenario | Task direction | REQ-008, AC-005 |
| SCN-006 | System | Two runs of the same agent at once writing the same document | — | Concurrent runs | — | Last write wins; the agent's skills may guard against it | Possible lost edit | — | Supported Explicit Edge Scenario (accepted risk, DEC-006) | Task open point; user | REQ-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (small)
- Linked UI/UX or interaction supplement: N/A — not applicable (no Product Design requested)
- Product-owned fields (design repository, ticket, revision, confirmation, visual references): N/A — not applicable
- Required screens and states: agent form — one switch "Semantic memory" with a one-line help text, next to the existing skill-scope switch's pattern; agent detail — a line showing On/Off and, when On, the folder path (selectable text). Localized like neighbouring strings.
- Product decisions that need the user: DEC-003.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003, AC-006 | Compatibility | Folder name valid on Windows, macOS, Linux for every definition ID form (shared, team-local with `:`, application-owned, Org-owned) | All desktop builds | Unit test over ID forms |
| QR-002 | REQ-006 | Security | Only the enabled agent's own folder is added to a runtime's writable area; no other path | Codex/Claude/ACP configs | Config unit tests |
| QR-003 | REQ-001, AC-005 | Reliability | Run start of an agent without the setting does no extra filesystem work | All runs | Unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (new folder; one optional config field)
- Must be preserved: every document an agent wrote; existing `agent-config.json` content on save.
- Acceptable loss: none caused by the system; concurrent-edit loss by the agent itself is an accepted risk (DEC-006).
- Constraints: no migration (absent field = off); the folder lives on the node's data dir.
- Unknowns: none.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `agent-config.json` (package contract) | New optional field, tolerant when absent | `agent-definition-config.ts` | Package-creation skill docs in the agents repo should learn the field (follow-up FU-002) |
| Codex app-server sandbox | Folder writable under `workspace-write` | Codex config | UNK-001 |
| Claude Agent SDK permissions | Writes follow the normal approval path | `claude-session-query-options.ts` | UNK-001 |
| ACP runtimes, Antigravity | Outside-cwd write access | Session launchers | UNK-001 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `follow-ups.md` | Follow-ups | — | Current | Not behavior-defining |
| `semantic-memory-prompt-contract.md` | Exact instruction text, placement, presence, path form | REQ-004, REQ-005, REQ-008, REQ-009; AC-001, AC-005 | Current (SR-004) | Behavior-defining; part of the approval basis |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Shared agent definition IDs are unique on a node and stable across package updates | Keying by definition ID | Verified: duplicates are refused (`DEFINITION_IDENTITY_DUPLICATED`); ID = folder name | Verified (Read) |
| ASM-002 | Every runtime can be configured to allow writes to one extra folder | REQ-006 | Architecture probes | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Where does semantic memory live? | Users find, back up and trust it there; hard to move later | (a) `<data-dir>/semantic-memory/<agent>/`; (b) `<data-dir>/memory/semantic/<agent>/`; (c) a user-chosen folder | Designer first recommended (a) to keep it away from run-memory scanners. The user prefers it inside the memory folder for consistency (memory holds the agent's memories). Verified (Read): the explorer, memory search and memory sync walk only `memory/agents`, `memory/agent_teams`, `memory/agent_orgs`, so a `memory/semantic/` sibling is not treated as a run. **User's choice: (b)** `<data-dir>/memory/semantic/<agent>/`. Renaming/reorganizing the existing run folders (e.g. into an `episodic` folder) was considered; the user decided against it (too much change and refactoring). | User (2026-11-10 conversation) | Decided |
| DEC-002 | Version history or backup? | An agent can overwrite good knowledge | (a) none: plain files; (b) the system keeps a git history; (c) periodic copies | Phase-1 rule in DESIGN.md: no speculative machinery; small Markdown documents; the data folder's own backup covers them. **User approved (a)**; version history is follow-up FU-001. | User (2026-11-10) | Decided |
| DEC-003 | What does the user see in the app, and does search cover it? | Visible product behavior | (a) form switch + path on agent detail; (b) also Memory page browse/edit; (c) also `search_memory` | Plain documents the user can open at the shown path; Memory page view and search are separate designs. **User approved (a)**; FU-003. | User (2026-11-10) | Decided |
| DEC-004 | Where is "enabled" stored? | Package and app must agree | (a) field in `agent-config.json`; (b) a separate user setting in server data | (a) lets the operator package declare its need (autobyteus-agents-23) and the app form edit the same value, like `skillScope`; the flag is not secret, only the contents are private. (b) would split the source of truth. **Decided (a).** | Solution Designer | Decided |
| DEC-005 | How does a team member resolve to the same memory? | Core promise | Definition ID vs. member name vs. team | Shared members (`refScope: shared`) and delegated copies use the same definition ID as the standalone agent; team-local, Org-owned and application-owned agents are separate definitions. **Decided:** key by agent definition ID; no team configuration needed. | Solution Designer | Decided |
| DEC-006 | Several runs writing at once? | Lost edits | (a) no locking; (b) file locks/merge tool | DESIGN.md rule 1: no speculative concurrency machinery; how the agent manages its documents is its own (the user). **Decided (a)**: no locking and no system guidance; skills may add their own rules; revisit if loss is observed. | Solution Designer (user informed and agreed 2026-11-10) | Decided |
| DEC-007 | Runs on other nodes? | Same agent on a Docker/remote node | Per node vs. sync | Semantic memory is on the node where the run executes, like run memory and workspaces; syncing is a separate feature. **Decided:** per node; out of scope (FU-004). | Solution Designer | Decided |
| DEC-008 | Lifecycle when disabled/deleted | Data continuity | Delete vs. keep | Never delete agent knowledge implicitly; created lazily at run start. **Decided:** keep always; re-enable gives the same folder. | Solution Designer | Decided |
| DEC-009 | Runtime write access | Agent must be able to write | Leave sandboxes vs. add the folder | Telling a path the agent cannot write breaks the feature (Codex `workspace-write`). **Decided:** add only that folder to the runtime's writable area; same approval policy; read-only mode stays read-only. | Solution Designer | Decided |
| DEC-010 | Instruction content | Agent behavior | Path + ownership only vs. path + rules (re-read before edit, no secrets) | The user: the system only specifies where the folder is; managing semantic memory is up to the agent. Rules belong in skills. **Decided by the user: minimal section (REQ-005).** | User (2026-11-10) | Decided |
| DEC-011 | When does a setting change apply? | Predictability | Immediately to running runs vs. at next composition | Instructions are composed at start/restore for every other definition field. **Decided:** same rule. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-003 | BEH-002 | AC-007 | SCN-004 | — |
| REQ-002 | UC-003 | BEH-002 | AC-007 | SCN-004 | — |
| REQ-003 | UC-001 | BEH-003 | AC-001, AC-006 | SCN-001 | — |
| REQ-004 | UC-001, UC-002 | BEH-001, BEH-004 | AC-001, AC-003, AC-004, AC-006 | SCN-001, SCN-003 | — |
| REQ-005 | UC-001 | BEH-001 | AC-001 | SCN-001, SCN-006 | — |
| REQ-006 | UC-001 | BEH-005 | AC-002 | SCN-002 | — |
| REQ-007 | UC-003 | BEH-003 | AC-008 | SCN-004 | — |
| REQ-008 | UC-004 | BEH-001, BEH-005 | AC-005 | SCN-005 | — |
| REQ-009 | UC-003 | BEH-001 | AC-008 | SCN-004 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-006.
- Constraints: one composer for all runtimes; agents without the setting unchanged; folder name safe and distinct; only the agent's own folder made writable; no deletion of contents.
- Deferred to design: field name; folder naming/encoding; where the folder is ensured; per-runtime writable-area mechanism; GraphQL/web exposure; glossary entry.
- Technical facts to verify: UNK-001 (outside-cwd write per runtime, by probe), UNK-002 (restore recomposition for Codex/Claude).
- Feasibility risks: a runtime without a way to allow an extra writable folder.

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

- Approval recorded: `Yes` (User, 2026-11-10)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
