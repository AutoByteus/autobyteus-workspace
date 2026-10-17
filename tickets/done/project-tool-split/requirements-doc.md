# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `project-tool-split`
- Request / ticket: Project Task (from `/project_task_manager`, 2026-10-17) "Split create_or_update_project into create_project and update_project (same pattern as the Task tools split)". Promoted from the optional follow-up FU-2 of `tickets/done/task-tool-split/`.
- Requested by: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's go-ahead of 2026-10-17 ("let's work on the project tool conversion task now")
- Requirements owner: `/software_engineering_team/solution_designer`
- Date: 2026-10-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message informing the user, 2026-10-17 (this conversation). No decision in this baseline needs the user; DEC-006 (when to remove the old tool) is the user's, is outside this ticket's change, and is presented to the user as a proposal.
- Exact approved requirements baseline: this document at `SR-001`
- Behavior-defining supplements: None (the Task description is the direction; the precedent is `tickets/done/task-tool-split/`, read-only)

## Problem And Desired Outcome

- Problem: `create_or_update_project` has two meanings ("create a Project" when `project_id` is absent, "change a Project" when it is present), the same mixed meaning `create_or_update_task` had before it was split in v1.5.5-beta.1.
- Affected actors or systems: agents configured with project tools (today only the Project Task Manager package); the user who configures agents; native (AutoByteus) and Agent Tools MCP (Codex, Claude) tool exposure.
- Desired outcome: two tools, one meaning each: `create_project` and `update_project`, selectable per agent, never added automatically. `create_or_update_project` keeps working unchanged during a transition so no existing configuration loses its project tool, and is removed later, when the user decides.
- Observable definition of success: an agent configured with `create_project`/`update_project` creates and changes Projects with the same results as today; an agent configured only with `create_or_update_project` still has it in the new app; an agent listing old and new names together has a project tool in both the current release and the new one.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `create_or_update_project` without `project_id` creates a Project (`name` required; `description?`, `workspaces?`) | `create_project` does this; it takes no `project_id` | Project creation rules, result `{project: {...}}`, error codes | inv. SRC-01, SRC-02 |
| BEH-002 | System | SCN-002 | `create_or_update_project` with `project_id` patches `name?`, `description?`, `workspaces?` (a supplied list replaces all links; `[]` unlinks all; omitted fields kept; at least one field) | `update_project` does this; `project_id` required | Patch rules, result, error codes | inv. SRC-01, SRC-02 |
| BEH-003 | System | SCN-003 | Project tools are given only to agents whose configuration lists them (not automatic) | Same for `create_project` and `update_project` | No project tool is automatic | inv. SRC-03 |
| BEH-004 | Contract | SCN-004, SCN-005 | Each app version skips configured tool names it does not know, without an error (AutoByteus: warning "not found in registry. Skipping."; Codex/Claude: name filtered out) | Unchanged; the new app also keeps `create_or_update_project` working during the transition | Unknown-name skipping; no validation of tool names at save or package import | inv. SRC-04, SRC-05, SRC-06 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | decide which agents manage Projects | selects `create_project` / `update_project` per agent | decides when the old tool is removed (DEC-006) |
| Project Task Manager (and any agent configured with project tools) | create and change Projects | same capabilities with clearer tools | must not lose a project tool in the current or the new app |
| Agent Package Creator | update the PTM package after the release | can list old and new names together | follow-up Task, not this ticket |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | An agent configured with `create_project` creates a Project | SCN-001 |
| UC-002 | An agent configured with `update_project` changes a known Project | SCN-002 |
| UC-003 | The user configures which agents get the new tools; nothing is added automatically | SCN-003 |
| UC-004 | Existing configurations keep a project tool during the transition, in the current and the new app | SCN-004, SCN-005 |

### Out Of Scope

- Project semantics (create/patch rules, workspace link handling, results, error codes), `list_projects`, `list_project_tasks`, the Task tools.
- Removing `create_or_update_project` (a later Task, timing decided by the user, DEC-006).
- Agent configurations and skills, including the Project Task Manager package in `autobyteus-agents` (follow-up Task created by the PM after this ships).
- Any UI change; the agent configuration tool picker lists registered tools as today.

### Non-Goals

- A compatibility alias that maps `create_or_update_project` to the new tools.
- Changing the old tool's description or behavior during the transition.

### Preserved Behavior Boundary

- BEH-001/BEH-002 preserved columns: all Project service behavior behind both tools, identical results and error codes.
- BEH-003, BEH-004: no automatic exposure; unknown configured tool names are skipped without an error.
- `create_or_update_project` keeps its name, schema, description and behavior until removed (REQ-004).
- Native and Agent Tools MCP exposure share one contract; first-party tool names stay protected against configured-MCP collisions.

### Review Authority

- Every blocking finding must cite an approved requirement, AC or preserved-behavior ID; a new behavior or compatibility promise is a `Requirement Gap` needing the user's approval.
- Adjacent concerns are non-blocking follow-ups.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `create_project` creates a Project from `{name, description?, workspaces?}` with the same rules, result and error codes as today's create mode. `project_id` is not accepted. | BEH-001 | Must | one meaning per tool | User direction; DEC-003 |
| REQ-002 | `update_project` changes a known Project from `{project_id, name?, description?, workspaces?}` with the same rules, result and error codes as today's patch mode (a supplied `workspaces` list replaces all links; at least one change required). | BEH-002 | Must | one meaning per tool | User direction; DEC-003 |
| REQ-003 | Neither new tool is added automatically: an agent has `create_project` and/or `update_project` only when its configuration lists them. Native and Agent Tools MCP exposure behave the same, and both names are protected first-party names. | BEH-003 | Must | user configures; agent's skill decides | User direction |
| REQ-004 | During the transition `create_or_update_project` stays available unchanged (name, schema, description, behavior) to agents that list it, so a configuration listing only the old name keeps its project tool in the new app. | BEH-004 | Must | existing configurations keep working | User direction; DEC-002 |
| REQ-005 | A configuration listing `create_or_update_project` together with `create_project`/`update_project` launches without an error and gets a project tool in the current release (old tool only; new names skipped) and in the new release (all listed project tools). | BEH-004 | Must | the package transition used for the Task tools | User direction; precedent |
| REQ-006 | Each new tool's description states its one meaning; docs and release notes describe the two tools, mark `create_or_update_project` as deprecated (kept for the transition, to be removed in a later release) and tell users to select the new tools. | BEH-001..BEH-004 | Must | descriptions and docs match | User direction; DEC-004, DEC-005 |

## Acceptance Criteria

| AC ID | REQ IDs | Behavior / Scenario | Preconditions / Trigger | Observable Expected Outcome | Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | Agent configured with `create_project` calls it with a name, optional description and workspaces | Project created; result equals what `create_or_update_project` returns for the same input | missing/blank name → `PROJECT_NAME_REQUIRED`; `project_id` or another unknown argument → `PROJECT_TOOL_ARGUMENT_INVALID`; no Project created | unit (parser, tool) + integration |
| AC-002 | REQ-002 | BEH-002 / SCN-002 | Agent configured with `update_project` changes name, description and/or workspaces of a known Project | Project updated; result equals today's patch; a supplied `workspaces` list replaces all links, `[]` unlinks all | no change field → `PROJECT_PATCH_REQUIRED`; missing `project_id` → `PROJECT_TOOL_ARGUMENT_INVALID`; unknown ID fails as today | unit + integration |
| AC-003 | REQ-003 | BEH-003 / SCN-003 | Agents on AutoByteus, Codex and Claude runtimes: one lists no project tool; one lists `create_project` only; one lists `update_project` only | each gets exactly the listed project tools, nothing automatic; a configured MCP tool named `create_project`/`update_project` does not replace the first-party tool | — | unit (exposure, MCP catalog collision) |
| AC-004 | REQ-004 | BEH-004 / SCN-004 | New app; agent lists only `create_or_update_project` | it has `create_or_update_project` with today's description, schema, results and errors | — | unit + integration |
| AC-005 | REQ-005 | BEH-004 / SCN-005 | Configuration lists `create_or_update_project`, `create_project`, `update_project`; launched in the current release (v1.5.5-beta.2 code, read-only) and in the new build | current release: launches without error, gets `create_or_update_project` only; new build: gets all three | — | probe of both versions' tool resolution, as in the precedent package transition; real-app check in an isolated instance |
| AC-006 | REQ-001..REQ-006 | SCN-001, SCN-002, SCN-004 | Isolated instance of the worktree build with a test data package (TESTING.md) | an agent with the new tools creates and updates a Project; an agent with only the old tool still creates/updates one | — | real-app check with evidence |
| AC-007 | REQ-006 | — | Read tool descriptions, docs, release notes | each new tool states one meaning; docs list the tools and the deprecation; release notes carry the upgrade note | — | review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | configured agent (e.g. PTM) | set up a Project | `create_project` call | agent configured with it | tool validates, creates | `{project}` result | validation errors as today | Supported Normal Scenario | PTM skill (creates Projects); direction | REQ-001; AC-001, AC-006 |
| SCN-002 | System | configured agent | rename, describe or relink a Project | `update_project` call | known `project_id` | tool validates, patches | `{project}` result | errors as today | Supported Normal Scenario | PTM skill; direction | REQ-002; AC-002, AC-006 |
| SCN-003 | User | user | decide which agents manage Projects | agent configuration tool list | — | select tools; launch | agent has exactly the selected tools | — | Supported Normal Scenario | direction ("no automatic exposure") | REQ-003; AC-003 |
| SCN-004 | System | agent with an existing configuration | keep working after upgrading the app | launch in the new app | lists only `create_or_update_project` | launch; call it | works as before | — | Supported Normal Scenario | direction | REQ-004; AC-004, AC-006 |
| SCN-005 | Operational | Agent Package Creator / user | move a package to the new tools without a gap | package lists old and new names | either app version installed | launch | a project tool in both versions | — | Supported Normal Scenario | precedent `autobyteus-agents` 80825d4 | REQ-005; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. The tool picker lists registered tool names as today (the old tool stays listed during the transition). Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-003; AC-003 | Compatibility | identical exposure, schemas and descriptions across AutoByteus, Codex and Claude | unit |
| QR-002 | REQ-004, REQ-005; AC-004, AC-005 | Compatibility | no configuration loses a project tool in the current or the new release | probes + real-app check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` for this ticket. Project data is read and written by the same service calls. Agent configurations are not rewritten (the old name keeps working). Known configurations naming the old tool: only the PTM package in `autobyteus-agents` (inv. SRC-07).

## External Contracts And Dependencies

| Contract | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| Agent tool names (native + MCP) | `create_project`, `update_project` added; `create_or_update_project` kept for the transition | direction | third-party MCP tools with the new names are shadowed by the first-party ones (release note) |
| `autobyteus-agents` PTM package | not changed here; follow-up Task after the release | PM | none during the transition (old name keeps working) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- |
| `tickets/done/task-tool-split/` (on `personal`) | precedent: tool definition, exposure, descriptions, release notes | all | Archived, read-only | N/A (reference) |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The current release (v1.5.5-beta.2) skips unknown configured tool names without an error, as v1.5.4 did | REQ-005 relies on it | AC-005 probe of the release code; source already shows the skip (inv. SRC-04, SRC-05) | Evidence-backed; proven in AC-005 |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Direction | all | user go-ahead 2026-10-17; Task description | two tools, no automatic exposure, configurations keep working in both versions, old tool removed later when the user decides | User | Decided |
| DEC-002 | How does the new app keep an agent that lists only `create_or_update_project` working? | REQ-004 | (a) keep the old tool unchanged for the transition; (b) map the old name to the two new tools; (c) remove it as in the Task split | (a). The direction rules out (c) (that agent would lose its tool). (b) gives the agent tools its skill does not name and adds an alias rule to exposure. (a) changes nothing for existing agents, needs no new mechanism, and is removed in one step later. This differs from the Task-split precedent, which removed the old name at once (its DEC-002); the difference is the user's direction. | Solution Designer | Decided |
| DEC-003 | Argument rules of the new tools | REQ-001, REQ-002 | today's parser; `create_task` rejects `task_id` as an unsupported argument | `create_project`: `{name, description?, workspaces?}`, `project_id` rejected as unsupported (`PROJECT_TOOL_ARGUMENT_INVALID`), as `create_task` rejects `task_id`. `update_project`: `project_id` required; other rules and codes exactly today's patch mode. | Solution Designer | Decided |
| DEC-004 | Does the old tool's description announce the deprecation? | an agent reads it | precedent DEC-005: agent-facing texts don't name tools an agent may not have | No. The description stays unchanged (REQ-004); an agent with only the old tool would read about tools it lacks, and the agent's skill decides which tool to use. The deprecation is stated in docs and release notes, which the user reads. | Solution Designer | Decided |
| DEC-005 | Release notes | users must learn the new tools | precedent release-notes.md | same structure as the precedent: What's New (two tools), Upgrade Notes (old tool deprecated and kept for now; select the new tools; first-party name protection for the new names) | Solution Designer | Decided |
| DEC-006 | When is `create_or_update_project` removed? | hard to undo for configurations still naming it | precedent: the package dropped the old Task tool name after the new release was installed | Recommendation: remove it in a separate Task in the first release after (1) this release is installed and (2) the PTM package lists only the new names; that release's notes announce the removal. Not part of this ticket. | User | Proposed to the user (non-blocking for this ticket) |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-006 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-006 | SCN-002 |
| REQ-003 | UC-003 | BEH-003 | AC-003 | SCN-003 |
| REQ-004 | UC-004 | BEH-004 | AC-004, AC-006 | SCN-004 |
| REQ-005 | UC-004 | BEH-004 | AC-005 | SCN-005 |
| REQ-006 | UC-001..UC-004 | BEH-001..BEH-004 | AC-007 | — |

## Architecture Phase Input

- Map SCN-001..SCN-005 onto the project-task tool contract, native tools, MCP manifest and exposure.
- Preserve: today's create/patch semantics, result shapes and error codes; unknown-name skipping.
- Verify: how the release code (v1.5.5-beta.2) resolves a list with unknown names (AutoByteus resolver and MCP catalog); every test, probe, fixture and doc naming the old tool and which should switch to the new names versus keep the old one to prove REQ-004.

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

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-10-17)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None (DEC-006 belongs to a later Task)
