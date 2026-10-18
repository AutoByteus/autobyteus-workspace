# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `remove-create-or-update-project`
- Request / ticket: Project Task `autobyteus-121` "Remove the deprecated create_or_update_project tool from the app" (from `/project_task_manager`, 2026-10-18). Follow-up FU-2 / decision DEC-006 of `tickets/done/project-tool-split/`.
- Requested by: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's go-ahead of 2026-10-18: "let's continue with the ticket to remove create_or_update_project now. We don't need this legacy tool since we have the new tool."
- Requirements owner: `/software_engineering_team/solution_designer`
- Date: 2026-10-18
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message informing the user, 2026-10-18 (this conversation). The user's go-ahead decides DEC-006 of the split (remove now).
- Exact approved requirements baseline: this document at `SR-001`
- Behavior-defining supplements: None. Context: the split's receipt verification (Task context file `ctx_4d4afea51024__delivery-receipt-verification.md`) and `tickets/done/project-tool-split/` (read-only).

## Problem And Desired Outcome

- Problem: `create_or_update_project` was kept, deprecated, for the transition to `create_project` / `update_project`. The new tools are released (stable v1.5.5; the user runs v1.5.6-beta.1 and the PTM used `update_project` on 2026-10-18). The old tool is now redundant: it is a second, two-meaning way to do the same thing.
- Desired outcome: the app no longer has `create_or_update_project`. An agent that still lists it launches normally and simply doesn't get a tool from that name. Docs describe only the current tools; the release note announces the removal.
- Observable definition of success: the tool picker and every runtime's tool list lack the old tool; an agent listing it launches without an error and with every other listed tool; `create_project` / `update_project` behave exactly as before.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenario IDs | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `create_or_update_project` is registered (native + MCP, protected name, in the picker) and runs as `create_project` or `update_project` by `project_id` presence | not registered anywhere; not in the picker | `create_project` / `update_project` contracts, results, errors | inv. SRC-01, SRC-02 |
| BEH-002 | Contract | SCN-002 | a configured name that the app doesn't know is skipped: AutoByteus logs "not found in registry. Skipping."; Codex/Claude filter it out; no error | the same now applies to `create_or_update_project` | unknown-name skipping; all other listed tools still given | inv. SRC-03; split evidence (release probe) |
| BEH-003 | Contract | SCN-003 | docs describe the old tool as deprecated; the current `.github` release notes (v1.5.6-beta.1) say it still works | docs no longer mention it; the next release's notes announce the removal | other docs content | inv. SRC-04, SRC-05 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| User | one clear way to create/update Projects | old tool gone, release note tells them | decides the release type |
| Agents still listing the old name (PTM package until its parallel PR lands) | keep launching | launch normally; use `create_project`/`update_project` if listed | no error |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Scenario IDs |
| --- | --- | --- |
| UC-001 | The app offers only `create_project` / `update_project` for Project changes | SCN-001 |
| UC-002 | An agent whose definition still lists the old name launches and skips it | SCN-002 |
| UC-003 | Docs and the release note match the tools | SCN-003 |

### Out Of Scope

- Any change to `create_project`, `update_project`, the other project/task tools, exposure rules, or Project semantics.
- Agent packages (the PTM package's parallel PR in `autobyteus-agents`).
- Archived tickets (`tickets/done/**`) and released history; the historical migration fixture (DEC-002).
- Other already-removed names in docs/tests (e.g. `create_or_update_task`), except the one line in `team-status-live-probe.mjs` that the Task names.

### Non-Goals

- An alias, warning text to agents, or a startup rewrite of definitions that list the old name.

### Preserved Behavior Boundary

- BEH-001/BEH-002 preserved columns. `create_project` / `update_project` results and errors are unchanged (split ACs AC-001/AC-002).

### Review Authority

- Every blocking finding must cite an approved REQ, AC or preserved-behavior ID; new behavior or compatibility promises are a `Requirement Gap`.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | `create_or_update_project` no longer exists as a tool on any runtime (native, Agent Tools MCP) and is not listed in the tool picker; its name is no longer a protected first-party name. | BEH-001 | Must | redundant legacy tool | User go-ahead 2026-10-18 |
| REQ-002 | An agent definition that lists `create_or_update_project` launches without an error, gets every other listed tool, and gets no tool from that name. | BEH-002 | Must | existing definitions keep working | Task direction |
| REQ-003 | `create_project` and `update_project` keep their names, descriptions, schemas, results and errors. | BEH-001 | Must | preserved | Task direction |
| REQ-004 | No code, doc or test in the repository refers to `create_or_update_project`, except: tests and test data that prove REQ-002 (DEC-003), the historical migration fixture (DEC-002), archived tickets, and the release notes. | BEH-001, BEH-003 | Must | clean removal | Task direction; DEC-002, DEC-003 |
| REQ-005 | The next release's notes announce the removal and tell users to select `create_project` and/or `update_project`; an agent that still lists the old name just skips it. | BEH-003 | Must | users must learn of it | Task direction; DEC-004 |
| REQ-006 | `autobyteus-web/tests/e2e/team-status-live-probe.mjs` no longer lists `create_or_update_project` or `create_or_update_task`. | BEH-003 | Must | named in the Task | Task direction |

## Acceptance Criteria

| AC ID | REQ IDs | Behavior / Scenario | Trigger | Expected Outcome | Alternate | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | build; list native tools, MCP adapters, picker names | no `create_or_update_project` in any | — | unit + real app (picker names) |
| AC-002 | REQ-002 | BEH-002 / SCN-002 | definition lists `create_or_update_project` (alone; and with `create_project`, `update_project`, `read_file`) on AutoByteus, Codex, Claude | launches; old name skipped (AutoByteus: warning, no error); other listed tools present | — | unit (resolver, runtime parity) + real app |
| AC-003 | REQ-003 | SCN-001 | existing tests of the new tools | unchanged results, errors, descriptions, schemas | — | unit + e2e |
| AC-004 | REQ-004, REQ-006 | SCN-003 | `git grep create_or_update_project` outside `tickets/` | only the allowed references (REQ-004 list) | — | review |
| AC-005 | REQ-005 | SCN-003 | ticket `release-notes.md` | announces the removal and the replacement tools | — | review |
| AC-006 | REQ-001..REQ-003 | SCN-001, SCN-002 | isolated instance of the worktree build with a test data package containing an agent that lists the old name and one with the new tools (TESTING.md) | the old-name agent launches and works without it; the new tools create and update a Project | — | real-app check with evidence |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Steps | Expected Outcome | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | user / configured agent | create or update a Project | tool picker; `create_project`/`update_project` | select, launch, call | only the two tools exist and work | Supported Normal Scenario | split release; PTM use 2026-10-18 | REQ-001, REQ-003; AC-001, AC-003, AC-006 |
| SCN-002 | System | agent with an older definition | keep working after upgrade | launch | old name skipped | launches; other tools present | Supported Normal Scenario | PTM package still lists it (`autobyteus-agents` origin/main) | REQ-002; AC-002, AC-006 |
| SCN-003 | Contract | user reading docs / release notes | know the tools | read | — | docs current; note announces removal | Supported Normal Scenario | Task | REQ-004..006; AC-004, AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (the picker lists registered tools; no UI change). Product Design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | REQ / AC | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-002; AC-002 | Compatibility | identical skip behavior on AutoByteus, Codex, Claude | unit |

## Data Continuity And Acceptable Loss

- Persisted data affected: `No`. Definitions listing the old name are not rewritten; the name is skipped at launch. Project data unchanged.

## External Contracts And Dependencies

| Contract | Required Behavior | Authority | Risk |
| --- | --- | --- | --- |
| Agent tool names | `create_or_update_project` removed | user | a definition relying only on it has no Project mutation tool until it selects the new ones (release note) |
| `autobyteus-agents` PTM package | parallel PR drops the old name; not required first | PM | none: the PTM also lists the new tools |
| A third-party MCP tool named `create_or_update_project` | no longer shadowed by a first-party tool | consequence of REQ-001 | negligible; noted in release notes |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `tickets/done/project-tool-split/` | origin (FU-2, DEC-006), evidence of skip behavior | Archived, read-only |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | The unknown-name skip shown in the split (release probe) holds on the current base | Source-backed (inv. SRC-03); proven by AC-002 |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Remove now? | split DEC-006 | user 2026-10-18 | remove now; release with a note; the user decides the release type | User | Decided |
| DEC-002 | The migration fixture `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/{agent-config.json,agent.md}` names the old tool | REQ-004 / the Task's "no test refers" | it is a copy of the retired built-in agent that earlier releases installed on users' disks, used by the startup-migration e2e that deletes that folder; the repo requires faithful fixtures of real stored shapes | Keep it unchanged: it records historical user data, not a use of the tool; editing it would make the migration test prove less. | Solution Designer | Decided |
| DEC-003 | Tests and test data that prove the skip | REQ-002 needs proof naming the old name | the Task asks for "any agent still listing it simply skips it" with tests and a real-app agent listing it; precedent AC-007 kept such tests for `create_or_update_task` | Allow exactly those tests/test data to name it (unit resolver/runtime-parity tests; the real-app test data package). Every other test reference goes. | Solution Designer | Decided |
| DEC-004 | Release-note handling | the current `.github/release-notes/release-notes.md` (v1.5.6-beta.1) says the old tool still works | RELEASE.md: the release helper writes that file from the ticket's `release-notes.md` at release time | The ticket's `release-notes.md` carries the removal note; delivery's release step replaces the `.github` file. Implementation doesn't edit the `.github` file. | Solution Designer | Decided |
| DEC-005 | Docs: say anything about the removed name? | REQ-004 | precedent docs keep "lists the removed `create_or_update_task` gets no task tool" | No mention: the Task wants only the release note to name it; the generic skip rule is already documented. | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-006 | SCN-001 |
| REQ-002 | UC-002 | BEH-002 | AC-002, AC-006 | SCN-002 |
| REQ-003 | UC-001 | BEH-001 | AC-003, AC-006 | SCN-001 |
| REQ-004 | UC-003 | BEH-001, BEH-003 | AC-004 | SCN-003 |
| REQ-005 | UC-003 | BEH-003 | AC-005 | SCN-003 |
| REQ-006 | UC-003 | BEH-003 | AC-004 | SCN-003 |

## Architecture Phase Input

- Remove the old tool from the contract, dispatch, native class, manifest; check what becomes dead (`effectiveProjectTaskToolName`, `EffectiveProjectTaskToolName`, `projectInput` if only used there).
- Preserve the new tools exactly.

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

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-10-18)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
