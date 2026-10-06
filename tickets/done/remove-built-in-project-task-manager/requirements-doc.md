# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `remove-built-in-project-task-manager`
- Request / ticket: Remove the built-in "Project Task Manager" agent (`autobyteus-project-task-manager`) from the AutoByteus server
- Requirements owner: Solution Designer
- Date: 2026-10-06
- Approval state and reference: Approved by the user on 2026-10-06 ("aprpove. i thin its simple right? just remove the internal built in project task manager?"), given in reply to the SR-001 approval request (`approval-request.sr001.md`). Recorded interpretation: the approval covers SR-001 as presented, including REQ-002 with DEC-001 option A (the recommendation written into REQ-002) and the DEC-002 consequences. The user's words "just remove the internal built-in" match option A: on upgraded installs, deleting the installed copy is what removes the built-in from the user's view.
- Exact approved requirements baseline / solution revision: SR-001 (REQ-001..008, AC-001..010, SCN-001..007)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: The server ships a built-in "Project Task Manager" (`autobyteus-project-task-manager`) that is reinstalled into app data on every startup. The agent repository now provides its own "Project Task Manager" (`project-task-manager`, with the `project-task-management` skill). Users see two agents with the same name; the built-in one has no skill of its own and is configured with all installed skills.
- Affected actors or systems: Users of the agent catalog / Chat / `@` and of Projects; server startup; web built-in mirror.
- Desired outcome: The server no longer ships or installs a Project Task Manager. On upgraded installs, the previously installed copy disappears too, so the only "Project Task Manager" is the one from the agent repository. The Projects feature and its tools keep working unchanged.
- Observable definition of success: After installing the new version (fresh or upgrade) with the agent repository configured, the catalog shows exactly one "Project Task Manager" (ID `project-task-manager`), and restarts never bring the built-in back.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001, SCN-002 | Every startup writes the built-in into `<appData>/agents/autobyteus-project-task-manager/` | Startup never creates or refreshes it | Other built-ins (Daily Assistant, Retrospective Skill Improver) still sync every startup | investigation-notes Source Log (registry, bootstrapper) |
| BEH-002 | User | SCN-001, SCN-002 | Catalog lists two "Project Task Manager" agents | Catalog lists only the agent-repository one (when the repository is configured) | Every other agent listing unchanged | file provider; user report |
| BEH-003 | System | SCN-002, SCN-003, SCN-006 | Upgraded installs keep a platform-owned copy of the built-in in app data | That copy is removed once, on the first start of the new version (DEC-001) | Startup never blocked by the cleanup; nothing else in app data touched | bootstrapper; Data Migration Guideline §1, §10 |
| BEH-004 | User | SCN-004 | Old conversations with the built-in can be reopened and continued | They stay in history and remain readable; they can no longer be continued, as with any deleted agent (DEC-002) | History is not deleted or rewritten | history catalog; backend factories |
| BEH-005 | User/Contract | SCN-005 | Projects tools work for any agent that selects them | Unchanged | `list_projects`, `list_project_tasks`, `create_or_update_project`, `create_or_update_task`, `delegate_task`, `send_message_to`, `list_available_agents` behave exactly as before | docs/modules/projects.md |
| BEH-006 | Contract | SCN-001 | Built-ins are excluded from `@`; web keeps a mirror of built-in IDs | The removed ID is no longer treated as a built-in anywhere | Remaining built-ins stay excluded from `@`; mirror stays equal to the server list | collaborator-candidate-policy; web mirror + contract test |
| BEH-007 | Contract | — | Projects docs describe a "shipped Project Task Manager" | Docs no longer claim a shipped manager | Remaining Projects documentation unchanged in meaning | docs/modules/projects.md, web docs/projects.md |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop/server user | Use one, skill-backed Project Task Manager | Only the agent-repository version is listed | No loss of history, Projects or other agents |
| Server startup | Prepare a working catalog | No built-in PTM; one-time cleanup of the old copy | Must never block startup or new work |
| Maintainers | Keep server and web built-in lists consistent | Mirror and tests reflect two built-ins | — |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Stop shipping and installing the built-in Project Task Manager | SCN-001, SCN-002 |
| UC-002 | Remove the already-installed copy on upgraded installs once | SCN-002, SCN-003, SCN-006 |
| UC-003 | Keep Projects and its tools working with any agent, including the agent-repository Project Task Manager | SCN-005 |
| UC-004 | Remove remaining code, tests and documentation that assume the built-in exists | SCN-001 |

### Out Of Scope

- Changes to the agent-repository Project Task Manager or its `project-task-management` skill (separate repository).
- Configuring package roots / installing the agent repository for users.
- Any change to Projects, Tasks, task agent run resources, or the Project tools' behavior.
- Converting old conversations, Teams or Orgs that referenced the built-in to the repository agent.
- The other built-ins and the earlier retired Memory Compactor folder.
- Fixing the unrelated pre-existing `MEMORY_COMPACTOR_AGENT_DEFINITION_ID` import in `collaborator-admission.test.ts`.

### Non-Goals

- No replacement "shipped" manager or default-agent wiring for Projects.
- No downgrade support (re-running cleanup after a downgrade to a beta that ships the built-in).

### Preserved Behavior Boundary

- BEH-001/BEH-006 preserved columns (other built-ins, `@` exclusion of remaining built-ins), BEH-005 in full, REQ-004, REQ-005, REQ-007.
- Invariant: nothing in app data other than the exact folder `<appData>/agents/autobyteus-project-task-manager/` is deleted or modified by this change.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The server no longer ships, installs, or refreshes a built-in agent with ID `autobyteus-project-task-manager` on any startup, fresh or upgraded. | BEH-001 | Must | Core request | User request |
| REQ-002 | On the first start of the new version, an install that has `<appData>/agents/autobyteus-project-task-manager/` has that folder removed once, without a backup. It is not recreated by later starts. | BEH-003 | Must | Without it the duplicate persists on upgraded installs | DEC-001 (recommended option A) |
| REQ-003 | The one-time removal never blocks startup or new work. If it cannot complete, the app still starts, the failure is recorded, and the removal is retried on the next start. An install without the folder treats it as nothing to do. | BEH-003 | Must | Data Migration Guideline §1 | Guideline |
| REQ-004 | Nothing else is deleted or changed: run history (including old built-in conversations), Projects, Tasks, Task context files, task agent run resources, settings, other app-data agents, and every agent in package roots (including the repository `project-task-manager`). | BEH-003, BEH-004 | Must | Data continuity | Guideline; user request |
| REQ-005 | The Projects feature and the tools `list_projects`, `list_project_tasks`, `create_or_update_project`, `create_or_update_task`, `delegate_task`, `send_message_to`, `list_available_agents` behave exactly as before, for any agent that selects them. | BEH-005 | Must | User constraint | User request |
| REQ-006 | Old conversations that used the built-in remain in history and readable. Continuing them is not supported after removal and fails the same way as for any deleted agent. | BEH-004 | Must | Truthful consequence | DEC-002 |
| REQ-007 | The remaining built-ins (Daily Assistant, Retrospective Skill Improver) keep their startup sync, settings initialization and `@` exclusion. The web's built-in ID list matches the server's list. | BEH-001, BEH-006 | Must | No collateral change | Existing contract |
| REQ-008 | Product and developer documentation no longer describes a shipped Project Task Manager. Projects docs state that any agent selecting the Project tools can manage Projects, for example the agent repository's Project Task Manager. | BEH-007 | Should | Avoid stale claims | DESIGN.md (remove obsolete paths) |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Fresh app data; server starts | No `agents/autobyteus-project-task-manager/` folder is created; the agent catalog has no definition with that ID; the built-in bootstrap reports only the remaining built-ins | — | Server unit test with real bootstrap; built-output smoke check |
| AC-002 | REQ-001, REQ-002 | BEH-002, BEH-003, SCN-002 | App data from a beta install contains the built-in folder; package root contains `project-task-manager`; new version starts | Folder removed; catalog lists exactly one "Project Task Manager", with ID `project-task-manager` | — | Server test on owned temp data through the real startup path |
| AC-003 | REQ-002 | SCN-002 | After AC-002, server restarts | Folder still absent; the one-time removal does not run again | — | Restart in the same test |
| AC-004 | REQ-003 | SCN-003 | Removal cannot complete (e.g., folder cannot be removed) | Server still starts and serves new work; the failure is recorded with a reason; next start retries | — | Unit test of the cleanup outcome + startup-continues evidence |
| AC-005 | REQ-003 | SCN-006 | Install never had the built-in | Startup completes; cleanup records "nothing to remove" | — | Unit test |
| AC-006 | REQ-004 | SCN-002 | App data with old built-in conversations, Projects/Tasks, other agents, settings; package-root agent present | All of these are byte-for-byte unchanged after the cleanup | — | Same test as AC-002 asserting preserved files |
| AC-007 | REQ-005 | SCN-005 | An agent selecting the Project tools | Listing Projects/Tasks, creating/updating Tasks and Projects, and saved-ID delegation behave as before | — | Existing Projects unit/integration/E2E suites pass unchanged in meaning |
| AC-008 | REQ-006 | SCN-004 | History contains a conversation with the built-in; folder has been removed | The conversation is still listed and its messages are readable; trying to continue it gives the existing "agent not found"-type failure, and the app keeps working | — | Server/API test or isolated-instance check |
| AC-009 | REQ-007 | BEH-006 | Startup and `@` candidate listing | Daily Assistant and Retrospective Skill Improver sync as before and stay excluded from `@`; web mirror equals the server list (contract test passes) | — | Existing bootstrapper and web contract tests |
| AC-010 | REQ-008 | BEH-007 | Read updated docs | No document claims a shipped Project Task Manager template or ID | — | Docs review at delivery |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System/User | User installing the new version | Use the app without a built-in manager | First start | Fresh app data | Server starts → built-ins sync → user opens catalog | No built-in PTM; repository PTM listed if the repository is configured | — | Supported Normal Scenario | Bootstrapper; request | REQ-001, REQ-007; AC-001, AC-009 |
| SCN-002 | System/User | User upgrading from v1.4.95-beta.1..3 (or a dev build) | See only one Project Task Manager | First start after update | Built-in folder exists in app data | Server starts → one-time cleanup removes folder → built-ins sync → catalog refresh | Only the repository PTM listed; stays so across restarts | — | Supported Normal Scenario | Release tags; user report | REQ-001..004; AC-002, AC-003, AC-006 |
| SCN-003 | Operational | Data Migration Guideline §1 | Startup must not depend on cleanup | Start after update | Folder cannot be removed | Cleanup fails → recorded → startup continues → retried next start | App usable; duplicate remains until a later start succeeds | — | Supported Explicit Edge Scenario | Guideline §1, §6; runner semantics | REQ-003; AC-004 |
| SCN-004 | User | User | Look back at an old built-in conversation | History panel | Built-in removed | Open old run → read messages → (optionally) try to continue | Readable; continuing fails like any deleted agent | — | Supported Normal Scenario | Existing delete-agent behavior | REQ-006; AC-008 |
| SCN-005 | User | User with an agent that selects Project tools | Manage Project Tasks | Chat with that agent | Projects enabled | List projects/tasks → create task → delegate → update status | Unchanged results | — | Supported Normal Scenario | projects.md | REQ-005; AC-007 |
| SCN-006 | System | Install that never ran a version with the built-in | Upgrade cleanly | First start | No folder | Cleanup finds nothing | Nothing changes | — | Supported Normal Scenario | Release tags | REQ-003; AC-005 |
| SCN-007 | Operational | — | Downgrade to a beta shipping the built-in, then upgrade again | — | — | Old beta recreates the folder; one-time cleanup already completed | Duplicate would return | — | Technically Possible but Unsupported/Contrived | Downgrade is not a supported path | Non-goal |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (catalog lists one fewer agent; no UI change)
- Product design fields: N/A — not applicable.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003; AC-004 | Reliability | Startup completes even when the cleanup fails | Both startup entrypoints | Test |
| QR-002 | REQ-002 | Operability | Cleanup touches one known path only; no scan of history or other agents | Every upgraded install | Design review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes`
- Data or state that must be preserved: everything listed in REQ-004.
- Loss, reset, rebuild, or regeneration that is acceptable: the platform-owned folder `<appData>/agents/autobyteus-project-task-manager/` (its files were rewritten from the template on every start, so it holds no user edits). Removed without backup if DEC-001 = A.
- Retention, privacy, compliance, volume, downtime, or operational constraints: at most one ~2 KB folder per install; no downtime; must not block startup.
- Unknowns requiring downstream investigation: exact continue-failure presentation (AC-008).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Data Migration Guideline | No lockout; explicit approval for feature-removal deletion; checklist answered in design | `autobyteus-server-ts/docs/design/data_migration_guideline.md` | — |
| Agent repository as package root | Provides the remaining Project Task Manager | `autobyteus-agents/agents/project-task-manager/` | User-controlled configuration (ASM-001) |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| None | — | — | — | — |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user has the agent repository configured as a package root wherever they want a Project Task Manager | Otherwise no Project Task Manager is listed after removal | Not explicitly confirmed; the removal doesn't depend on it (the user asked for only the repository version) | Accepted as assumption |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | What happens to the copy already installed in users' app data? | Removing only the registration leaves the copy listed as an ordinary agent named "Project Task Manager", so the duplicate stays on upgraded installs | **A (recommended):** remove `<appData>/agents/autobyteus-project-task-manager/` once on first start, without backup (precedent: approved external-messaging removal; folder is platform-owned). **B:** leave it untouched (Memory Compactor precedent); the duplicate remains until the user deletes it manually | User | Resolved — Option A (approved with SR-001, 2026-10-06) |
| DEC-002 | Accept the consequence for old conversations and user-built Teams/Orgs that used the built-in? | Agent no longer exists after A | Old conversations stay readable but can't be continued; a Team/Org that includes it fails to start until the member is replaced. Same as deleting any shared agent today. Rewriting them to the repository agent is rejected: the agents differ and the guideline forbids guessing identity | User | Accepted (approved with SR-001, 2026-10-06) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002 | SCN-001, SCN-002 | — |
| REQ-002 | UC-002 | BEH-003 | AC-002, AC-003 | SCN-002 | — |
| REQ-003 | UC-002 | BEH-003 | AC-004, AC-005 | SCN-003, SCN-006 | — |
| REQ-004 | UC-002 | BEH-003, BEH-004 | AC-006 | SCN-002 | — |
| REQ-005 | UC-003 | BEH-005 | AC-007 | SCN-005 | — |
| REQ-006 | UC-002 | BEH-004 | AC-008 | SCN-004 | — |
| REQ-007 | UC-004 | BEH-001, BEH-006 | AC-009 | SCN-001 | — |
| REQ-008 | UC-004 | BEH-007 | AC-010 | — | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-006 (after approval).
- Product and system constraints architecture must preserve: REQ-003, REQ-004, REQ-005, REQ-007.
- Decisions intentionally deferred to architecture design: cleanup mechanism (expected: one registered one-time app-data migration), test and docs disposition.
- Technical facts architecture should verify: cleanup runs before catalog refresh in both startup entrypoints; build output no longer contains the template; continue-failure path for deleted-agent runs.
- Known feasibility or integration risks: none material.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-06)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
