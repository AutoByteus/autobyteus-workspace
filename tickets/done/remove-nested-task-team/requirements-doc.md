# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-006`
- Package identifier: `remove-nested-task-team`
- Request / ticket: Project Task `project_task_9942a43c-9ef9-4519-bd76-05e393a39a8c`
- Requested by: `/project_task_manager` (relaying the user, 2026-10-17)
- Requirements owner: Solution Designer
- Date: 2026-10-17
- Approved by and reference: `User` — SR-001 approved 2026-10-17 ("For all the records preserved, not shown …"); SR-002 approved 2026-10-17 ("no migration declared unsupported"); SR-003 approved 2026-10-17: "If it's big, let's forget it. Yeah, use your recommended version."
- Exact approved requirements baseline / solution revision: SR-006 (this document, 2026-10-17; SR-004..SR-006 refinements within the direction and on the user's evidence)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: teams are flat since v1.4.70 (2026-09-01): a team contains agents only, and only an organization contains
  teams. The current code still represents "a team inside a team" — a sub-team member inside a task agent team
  (`TaskTeamNestedTeamExecution`) and a runtime team node whose children may be teams — in about 17 server files, two
  contract packages and the web app, plus dead nested-team UI strings. Nothing has created such a team since
  v1.4.70. The code describes a capability the product no longer has; it misled the architecture review of 8641c0ac
  and the Solution Designer.
- Affected actors or systems: developers and reviewers reading the code; the server's run history and live views;
  the web app; installations that ran v1.4.53–v1.4.69.
- Desired outcome: current code represents only what the product supports. The removed shape (v1.4.53–v1.4.69) is retired
  without a migration: runs containing it are contained (excluded, or not openable), nothing on disk changes, and
  every other run and startup keep working.
- Observable definition of success: no current server, contract or web code represents a team inside a team;
  organization → team works as before; the removed shape is declared unsupported; the app always starts and every other run works.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Delegating to a team builds a flat task agent team; a team inside it is refused at runtime | Same, and the types no longer admit a team inside a team | Delegation to teams, members, restore, views | flat-team-execution-factory.ts |
| BEH-002 | System | SCN-002 | A record with a sub-team member (v1.4.53–v1.4.69) still parses, indexes, restores | Not supported (no migration): current code no longer reads that shape. An affected team or organization run is excluded by the existing startup check (not shown). An affected standalone run stays listed but cannot be opened (its saved data cannot be read). A lookup that searches across standalone runs skips a tree it cannot read, logs a warning and continues, so no other run is affected. Declared in the release notes; no file changed | Every run without that shape; the app always starts | parser, indexes, restore, `root-run-package-current-validator.ts`, `standalone-root-location-service.ts` |
| BEH-003 | User | SCN-003 | Live and history views can render a sub-team under a task agent team | No such rendering path | Task agent teams, organizations' teams, delegation under members | projector, web selectors |
| BEH-004 | Contract | SCN-003 | Stream DTOs carry a nested task-team member | DTOs carry agent members only | Every other DTO field | contracts packages |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User | Keep using all runs | Every run without the retired shape works; startup never blocked; nothing deleted | Retired shape contained per run (DESIGN.md rule 7) |
| Developers / reviewers | Reason from the code | Code matches the product model | — |
| Memory refactor 8641c0ac | Build on a clean model | No nested task-team support needed there | No new migration to depend on; released migrations contain retired data per run |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Current code (server, contracts, web) represents a team's members as agents only | SCN-001, SCN-003 |
| UC-002 | The old shape is declared unsupported (release notes); affected runs are excluded or fail to open truthfully, files untouched; one unreadable standalone tree never breaks lookups for other runs | SCN-002 |
| UC-003 | Dead nested-team UI strings are removed | SCN-003 |
| UC-004 | The general containment rule is recorded in `DESIGN.md` | — |

### Out Of Scope

- Organization → team nesting (current).
- A task agent team delegated by a team member and shown under it (delegation, current).
- The memory refactor 8641c0ac and its layout.
- Other leftovers found during the work (follow-ups to the Project Task Manager).
- Team definition files and catalogs (already flat; no nested-team definitions are admitted).

### Non-Goals

- Re-creating or converting old hierarchical teams into a supported shape.

### Preserved Behavior Boundary

BEH-001..004 preserved columns; organization runs, task agent teams with agent members, restore, idle / wake,
status colours, Settings, Token Meter, Task pages, Memory page and history behave as today.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance
  criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, migration obligation, compatibility promise or
  operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the boundary is a non-blocking risk, recommendation or follow-up.
- A downstream reviewer comment does not amend this basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | No current server type, parser, index, mutator, restore path, projector or runtime node represents a team inside a team: a task agent team's members and a runtime team node's children are agents. | BEH-001, BEH-002 | Must | Code matches the product model | the user, 2026-10-17; DEC-002 |
| REQ-002 | The stream contracts and the web app represent a team's members as agents only: task agent team members, a team run's configured members (no `configured_team` variant), and the team-definition member tree; dead nested-team / sub-team UI strings are removed. Organizations' teams and delegation rows are unchanged. | BEH-003, BEH-004 | Must | Same | DEC-003, DEC-006 |
| REQ-003 | The old shape (a sub-team member inside a task agent team, v1.4.53–v1.4.69) is declared unsupported in the release notes; no migration converts or moves it, and no file is changed or deleted. An affected team or organization run is excluded by the existing startup check; an affected standalone run stays listed but reports that its saved data cannot be read when opened; any lookup that searches across standalone runs skips a tree it cannot read, logs a warning and continues; the app always starts. | BEH-002 | Must | Clean code, no migration for unused data (the user, 2026-10-17); one bad file must not break other runs; Data Migration Guideline §1, §4 | DEC-001 (e), the user |
| REQ-004 | Organization → team nesting, delegation shown under members, and all preserved behavior stay unchanged. | BEH-001, BEH-003 | Must | Scope boundary | DEC-004 |
| REQ-005 | `DESIGN.md` states the general rule "Contain bad data to its own run" (Mandatory Design Rule 7): the app keeps working, only the affected run is left out or reports unreadable data, a warning names it, the data is never changed or deleted; containment sits at the boundary of one run. | BEH-002 | Should | The user, 2026-10-17: make the principle general | the user |
| REQ-006 | Withdrawn (SR-006): no install holds the retired shape (the user, 2026-10-17), so released migrations stay unchanged. | — | — | the user's evidence | DEC-008 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | SCN-001, SCN-003 | Source search at the implementation result | No nested task-team type, DTO, schema, branch or fixture remains outside migrations; `TeamRunAgentTeamNode.children` is agents; typecheck passes | — | Search + typecheck in the implementation handoff |
| AC-002 | REQ-003 | SCN-002 | Test data root with one standalone run whose collaboration tree cannot be read and normal runs of each family | The app starts; normal runs work, including member conversation and file-change views that look agents up across runs; the cross-run lookups log a warning naming the skipped run and continue; opening the unreadable run reports its error; no file changes | — | Server tests (+ real-app check of normal runs) |
| AC-003 | REQ-004 | SCN-001, SCN-003 | Organization run with mounted teams; a team run whose member delegated a task agent team | Behaves as before (views, restore, status, Settings, Token Meter, Task pages) | — | Existing suites + real-app check |
| AC-004 | REQ-002 | SCN-003 | Web build and tests | Pass; no nested-team string remains in localization | — | Web tests |
| AC-005 | REQ-005 | — | Documentation review | `DESIGN.md` Mandatory Design Rule 7 present and consistent with REQ-003 | — | Review |
| AC-006 | REQ-006 | — | Withdrawn (SR-006) | — | — | — |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Delegation contract | Delegate a Task to a team | `delegate_task` to a team | Any run | Task agent team created with agent members | As today | — | Supported Normal Scenario | flat factory | REQ-001, REQ-004; AC-001, AC-003 |
| SCN-002 | Operational | Containment rule (DESIGN.md rule 7) | Keep working when one standalone tree cannot be read | Cross-run lookups | A standalone tree that cannot be read (any cause) | Lookups skip it with a warning; other runs unaffected | App and other runs work; files untouched | — | Supported Explicit Edge Scenario (project rule 7). The retired nested shape itself: Technically Possible but Unsupported — no install holds it (the user, 2026-10-17) | DESIGN.md rule 7; the user's evidence | REQ-003; AC-002 |
| SCN-003 | User | User | Open runs and views | Sidebar, team view, history, organization view | Any run | Views render agents, teams of organizations, delegation | As today | — | Supported Normal Scenario | projector, web | REQ-002, REQ-004; AC-001, AC-003, AC-004 |
| SCN-004 | System | — | Create a team inside a team | — | — | — | — | — | Technically Possible but Unsupported/Contrived: refused since v1.4.70 | flat factory | — |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no visible change for current data; dead strings removed).
- Product design fields: `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003; AC-002 | Reliability | 0 files changed or deleted; app always starts; runs without the retired shape unaffected | Startup | Server test, real-app check |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` (only records from v1.4.53–v1.4.69 with a sub-team in a task agent team).
- Data or state that must be preserved: every file on disk, unchanged (nothing is migrated, moved or deleted).
- Loss, reset, rebuild, or regeneration that is acceptable: on an install with the retired shape, the whole run containing it is no longer shown (team / organization) or no longer opens (standalone) (the user, 2026-10-17); its files stay on disk. A future data-cleaning task may revisit it.
- Volume / constraints: 0 on the user's machine; no migration.
- Unknowns requiring downstream investigation: confirm the exclusion path for all three run families (architecture).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Team / collaboration stream contracts | Nested task-team DTO removed | contracts packages | Internal consumers only (server, web) |
| Data Migration Guideline, TESTING.md, RELEASE.md | migration and validation rules | repo docs | — |
| Memory refactor 8641c0ac | no new predecessor; its released-migration gate must tolerate per-run containment (its ARCH-F-006) | 8641c0ac package | coordinated on resume |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| Task brief (investigation notes, Meta) | direction | all | Current | the user's direction |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | No current code path creates a team inside a team | basis for removal | verified (flat factory, producers) | Verified |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | What happens to an old record with a sub-team inside a task agent team? | Data handling | (a) preserved, not shown (startup migration); (b) convert to flat; (c) keep support; (d) no migration, excluded by the startup check; (e) **no migration + cross-run standalone lookups skip an unreadable tree with a warning** | (a) approved first, then (d). Verification showed (d) is incomplete for standalone runs: their startup check reads only metadata, and lookups that search every standalone tree (`StandaloneRootLocationService.findAgent/listAgents` without a root id) would throw on one unreadable tree, breaking member views for other runs. (e) adds one generic robustness rule instead of a migration; (a) would need a migration that also moves the old team's messages and repoints a released migration. (e) is much smaller. **Decided (e).** | the user | Decided by the user (e), 2026-10-17: "If it's big, let's forget it … use your recommended version"; confirmed "they just log it … as a warning" |
| DEC-002 | Include the runtime team node (`TeamRunAgentTeamNode.children` admits teams)? | Same concept; without it restore keeps a nested branch | All producers build agents only; the flat factory checks at runtime | Tighten to agents: the runtime check becomes a type guarantee; same leftover, small. **Include.** | Solution Designer | Decided |
| DEC-003 | Include dead nested-team / sub-team UI strings? | Same concept | 7 keys with no non-test use, 1 used only in a test | Remove them (en, zh-CN) and their test references. **Include.** | Solution Designer | Decided |
| DEC-004 | Boundary of "nested" | Avoid removing current behavior | Organization → team; delegation shown under members | Keep both; only membership of a team inside a team is removed. **Decided.** | Solution Designer | Decided |
| DEC-006 | Include the configured sub-team DTO variant (`configured_team`) and the team-definition member tree team node found during architecture investigation? | Same concept (team inside a team) | No server producer emits `configured_team`; the definition tree builder emits agents only | Same leftover, dead, within the user's direction ("we don't support sub-agent team anymore … refactor and clean up"). **Include.** Launch-configuration team scopes are excluded (they serve organizations; follow-up). | Solution Designer | Decided (user informed) |
| DEC-007 | How does a released migration that aborts on any Org diagnostic handle a retired Org? | One retired Org would block the summary backfill for every Org and keep the migration FAILED forever | (a) repoint its reads to frozen shapes; (b) preserve a diagnosed Org with a warning and process the rest, as `team-context-file-execution-locators-v1` (`PRESERVED_INVALID_PACKAGE`) and `collaborators-to-delegated-runs-v1` (`PRESERVED_TREE_UNREADABLE_WARNING`) already do | (a) only serves an Org that current code excludes anyway; (b) is a few lines, follows existing precedents and rule 7, changes no data. **(b).** | Solution Designer | Decided (user informed) |
| DEC-008 | Is retired-shape data real anywhere? | Decides whether retired-data containment work is needed | The user, 2026-10-17: "Nobody has ever used the nested team … in our agent package we already completely removed the nested agent team" | No install holds it: withdraw REQ-006 / AC-006 (DEC-007 moot) and the faithful retired-shape fixtures; keep the release-note line and the generic skip-and-warn rule (rule 7). **Decided.** | the user (evidence) / Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001 | SCN-001 | — |
| REQ-002 | UC-001, UC-003 | BEH-003, BEH-004 | AC-001, AC-004 | SCN-003 | — |
| REQ-003 | UC-002 | BEH-002 | AC-002 | SCN-002 | — |
| REQ-004 | UC-001 | BEH-001, BEH-003 | AC-003 | SCN-001, SCN-003 | — |
| REQ-005 | UC-004 | BEH-002 | AC-005 | — | `DESIGN.md` |
| REQ-006 | — | — | AC-006 (withdrawn) | — | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..003.
- Constraints: no lockout; no migration (DEC-001 e); no file changed; cross-run standalone lookups skip unreadable trees with a warning; release-note declaration of the retired shape; released migrations stay unchanged (REQ-006 withdrawn, DEC-008).
- Deferred to architecture: the exclusion path per run family; classification of web history "sub-team
  rows" and `nested-team-*` fixtures (U-002); exact ripple of DEC-002.
- Technical facts to verify: exclusion of an unparseable tree for standalone, team and organization runs; coordination with 8641c0ac (no new predecessor).
- Known risks: R-001.

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
- Remaining content blocker: None.

### Approved Basis Ready For Design

- Approval recorded: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None.
