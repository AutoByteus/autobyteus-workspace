# Requirements Document

## Document Status

- Status: `Approved` (SR-004; user "go" on 2026-09-25)
- Current solution revision ID: `SR-004`
- Package identifier: `memory-team-view-slow-load`
- Request / ticket: User report 2026-09-24: Memory → Agent Teams loads slowly, and a team card takes very long to open. Follow-up direction on the same day: also support an Agent Orgs memory tab.
- Requirements owner: Solution Designer
- Date: 2026-09-24
- Approval state and reference:
  - SR-001 baseline (REQ-001…REQ-005): approved by the user on 2026-09-24 ("since you found the problem, now approved your requirement"). DEC-001 is resolved as "include the frontend fix" (approval covered the recommendation as presented).
  - SR-002 delta (REQ-006…REQ-010): added in the same message by user direction ("we should also support agent org memory tab as well … make sure we have clean design"). REQ-006…REQ-008 carry the approved Agent Teams behavior over to Agent Orgs, and add no new product policy.
  - REQ-009 and REQ-010 are corrections found while designing the shared member structure the user asked to keep clean. Each restores the intended outcome of an existing control. They are called out explicitly in the result message. If the user objects, that is a `Requirement Gap` and follows Recovery.
- Exact approved requirements baseline / solution revision: **SR-004** (this document). The user approved it with "go" on 2026-09-25, after these recommendations: REQ-011 option (a), sources refresh only on Memory home; keep REQ-009 and REQ-010 (REQ-010 is required by REQ-012); REQ-012 all agent runs shown in the execution structure (user direction); DEC-004 unreferenced folders left out (user decision). DEC-003 was resolved upstream. The REQ-008 clarification is superseded by REQ-012.
- REQ-012 effect on the preserved-behavior exceptions (ARCH-REV-003 AR-001 confirmation): before "go", the user was told "a team without delegated tasks looks exactly the same as today; only runs that delegated tasks gain extra rows". The derived aggregate effect (run/definition badges, last-updated, member counts now also covering task-execution memory) follows directly from the user's own instruction that "the memory should show all memory". It is stated explicitly in REQ-004 and was disclosed in the SR-004 result message. On the user's real team data it has **no** effect: 1 team run has task-agent memory, that task agent was already listed and aggregated before this package, and 0 team runs have task teams.
- Behavior-defining supplements and their approved versions: N/A. None.

## Problem And Desired Outcome

- Problem 1 (SR-001): The Memory explorer's Agent Teams tab takes about 32 s to load. A team card takes about 65–80 s to become usable. The cause is an O(N²) rescan of all 534 stored team runs, plus a request the frontend sends twice. It is not a memory leak. See `investigation-notes.md`.
- Problem 2 (SR-002): The Memory explorer has no way to browse Agent Org memory. On the user's machine, 19 stored org runs hold 144 MB of member memory under `memory/agent_orgs`, and none of it is visible.
- Desired outcome: Agent Teams and a new Agent Orgs tab both load in about a second at today's volume. A card or member click navigates immediately and sends one request. Team content is unchanged apart from the two defect corrections REQ-009 and REQ-010 and the REQ-012 additions (task-execution rows and the aggregates derived from them).
- Observable definition of success: see QR-001 and AC-001…AC-014.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Agent Teams tab cards appear after about 32 s | Cards appear within QR-001 | Same teams, counts, badges, order, paging, search | curl 31.8 s |
| BEH-002 | User | SCN-002 | Card click: no visible change for 32–40 s, then a second identical request | Immediate navigation with a loading state; one request; runs within QR-001 | Same runs, order, paging, search | Code + curl + probe |
| BEH-003 | User | SCN-003 | Member or run click fetches the memory view twice | Immediate navigation; one fetch | Same inspector content | Code |
| BEH-004 | User | SCN-002 | The detail view can briefly show the previously opened team's runs | Never shows another selection's runs | — | Code |
| BEH-005 | System | all | Content is correct apart from BEH-008, BEH-009 and BEH-010 | Unchanged apart from REQ-009, REQ-010 and REQ-012 | Grouping, memory availability, sort, paging, search, local/imported source | Probe: identical output |
| BEH-006 | User | SCN-004 | No current supported behavior. Org memory is not browsable in the Memory explorer | Agent Orgs tab lists org definitions that have stored member memory | Mirrors the Agent Teams card content | Code: `MemoryHome.vue` has two tabs only |
| BEH-007 | User | SCN-005, SCN-006 | No current supported behavior | Org card opens the org's runs and their members; a member opens the inspector | Mirrors the Agent Teams detail and inspector | Data: `memory/agent_orgs/*` |
| BEH-008 | User | SCN-002 | Team member buttons show an empty name line: the frontend reads `memberName`, the API returns `displayName` | Member name is shown | — | `AgentTeamMemoryDetail.vue:37`, `types/memory.ts`, `memory-explorer-schema.ts:219` |
| BEH-009 | User | SCN-002, SCN-003 | A delegated task instance of a configured member is listed with the configured member's run ID. Its badge shows the task run's memory, but clicking it opens the configured run's memory | Each member entry identifies its own run, so the badge and the inspector agree | — | `team-memory-explorer-service.ts#toMemberTargetSummary` uses `member.agentRunId` from the configured placement. 1 team run and 5 org runs on real data have task executions |
| BEH-010 | User | SCN-002, SCN-005, SCN-006 | Delegated task executions are shown inconsistently and without structure. A task agent, or a task-team member at a configured address, appears as a flat entry indistinguishable from the configured member. A task team at an unconfigured address, and members of nested teams inside task teams, are hidden. Real data: 15 org task teams with 30 members | Every agent run in the execution tree that has memory is shown in the run's structure (configured teams, task agents, task teams, nested at any depth); memory folders not referenced by the tree are not shown | Flat teams without delegated tasks look exactly as before | Investigation notes: F-001, DEC-004; ARCH-REV-003 real-data scan |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Desktop user | Browse team and org memory | Fast tabs, fast opening, org memory visible, all run memory reachable in its structure | Team content unchanged apart from REQ-009, REQ-010 and REQ-012 |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Open Memory → Agent Teams (local or imported source).
- UC-002: Open a team card: runs, search, paging.
- UC-003: Open an agent card, or inspect an agent run or a team/org member run.
- UC-004: Open Memory → Agent Orgs (local or imported source).
- UC-005: Open an org card: runs, search, paging, members.
- UC-006: Inspect an org member run's memory.

### Out Of Scope

- Caching, indexing or background precomputation of memory summaries.
- Adding `agent_orgs` to memory sync export/import. Imported sources therefore show the Agent Orgs empty state (evidence: `memory-sync-path-policy.ts` syncs `agents` and `agent_teams` only).
- Memory folders on disk that the run's execution tree does not reference (DEC-004). No data repair of such runs.
- Org-level (non-agent) artifacts such as communication messages and delegation records.
- Changes to persisted data or file layout. Changes to other pages.

### Non-Goals

- Scaling far beyond today's volume without further work (RSK-001).

### Preserved Behavior Boundary

BEH-005, the preserved column of BEH-001…BEH-003 and BEH-010, REQ-004 and AC-005. The only permitted team-content differences are REQ-009, REQ-010 and REQ-012 (see REQ-004).

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise or operational contract is a `Requirement Gap`. It needs explicit user approval before it becomes authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Loading the Agent Teams list, and one team's runs list, must scale linearly with the number of stored team runs. Each run's execution tree is read a bounded number of times per request. | BEH-001, BEH-002 | Must | Root cause is N² | SR-001, approved |
| REQ-002 | Clicking an agent, team or org card, or a run or member entry, must navigate to the target view immediately and issue exactly one data request for it. | BEH-002, BEH-003 | Must | The duplicated request doubles the wait | SR-001, approved |
| REQ-003 | While a detail view loads, it must show a loading state and must not present another selection's runs. | BEH-002, BEH-004 | Must | Feedback and correctness | SR-001, approved |
| REQ-004 | Team explorer content must stay unchanged, apart from: REQ-009 (member names); REQ-010 (each entry's own run ID, and search matching on it); and REQ-012 (task-execution rows added in their structure, plus the aggregates derived from them: run and definition memory badges, last-updated times, run counts and member counts where task-execution memory contributes). "Unchanged" covers groups, names, run and member counts, memory availability, timestamps, ordering of teams without task executions, paging, search results and local/imported handling. | BEH-005 | Must | Pure performance fix plus approved corrections/additions | SR-001, approved; SR-002 and SR-004 exceptions |
| REQ-005 | Resolving one team member's memory location for the inspector must not scan every stored team run when the team run ID is a stored root. | BEH-003 | Should | Same pattern | SR-001, approved |
| REQ-006 | The Memory home must offer an **Agent Orgs** tab next to Agents and Agent Teams. It lists org definitions that have stored member memory: name, definition ID, run count, member count, last updated and memory badges. It supports search, paging and the source selector, the same way Agent Teams does. | BEH-006 | Must | User direction | SR-002, user |
| REQ-007 | Opening an org card shows that org's runs: summary or run ID, run ID, workspace, last updated, badges and member entries with memory. Search and paging work as in Agent Teams. A member entry is labeled by its address inside the org (for example `software_engineering_team/solution_designer`). Selecting it opens the Memory Inspector for that member run with the Working Context, Episodic, Semantic and Raw Traces tabs. The breadcrumb reads `Agent Orgs / <org> / <org run> / <member>`, and Back returns to the org detail. | BEH-007 | Must | User direction; mirrors Agent Teams | SR-002, user |
| REQ-008 | The Agent Orgs list and org runs list meet REQ-001 (linear, one tree read per root per request) and QR-001. Member selection follows REQ-012. *(SR-004: the former member-selection sentence, "configured agents … plus delegated task instances of a configured agent", is superseded by REQ-012; the performance clause remains in force.)* | BEH-006, BEH-007 | Must | Consistency and performance | SR-002, user |
| REQ-009 | Team and org member entries show the member's display name. | BEH-008 | Must | Defect correction; the control already intends to show it | SR-002, correction |
| REQ-010 | Each team or org member entry identifies its own agent run. Its badge, run ID and inspector target refer to the same run. | BEH-009 | Must | Defect correction; badge and inspector must agree | SR-002, correction |
| REQ-011 | **(SR-004, approved; option (a))** The Memory sources list (Local plus imported sources) is requested only (1) in the background whenever the Memory home view is shown, which is where the source selector is and which includes opening the Memory page; this never delays the home list; and (2) once, awaited, when a route names an imported source that is not yet in the loaded list. If the source is then still unknown, the view falls back to Local and drops it from the URL (current behavior). Detail and inspector navigation (cards, runs, members, Back) never request the sources list. A failed refresh keeps the previously loaded list and shows the existing source error text. | BEH-002, BEH-003 | Must | CR-002: remove the extra serial round trip; new imports still appear on the home view | SR-004, CR-002 (Requirement Gap) |
| REQ-012 | **(SR-004, user direction 2026-09-25: "The memory should show all memory because they are real runs … including task agent and task agent teams … following the same structure as it is shown")** A team or org run's detail shows **every agent run of that run that has memory on disk**, arranged in the run's execution structure, the same structure the run-history sidebar shows. That means: regular (configured) agents; configured teams as group rows containing their members; delegated **task agents**; delegated **task teams** as group rows (marked as tasks, with their start time) containing their members, including nested teams inside task teams, at any depth. Every agent row with memory opens the Memory Inspector for exactly that run. Team and task-team rows are grouping rows only; they have no memory of their own. A group row appears only if something inside it has memory. Memory folders that the run's execution tree does not reference are not shown (DEC-004). The same rule applies to Agent Teams and Agent Orgs. Search also matches task agents and task-team members. | BEH-007, BEH-009, BEH-010 | Must | Memory on disk is real run memory; hiding task executions made it unreachable | SR-004, user |

## Acceptance Criteria

| AC ID | Requirement IDs | Scenario IDs | Trigger | Observable Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | `listAgentTeamsWithMemory` on the user's memory directory (534 team runs) | ≤ 2 s | — | Timing against the built backend |
| AC-002 | REQ-001 | SCN-002 | `listAgentTeamRunsWithMemory("software-engineering-team")` | ≤ 2 s | — | Same |
| AC-003 | REQ-001, REQ-008, REQ-012 | SCN-001/002/004/005 | Unit test with several stored roots and a counting tree store | One tree read per root per request | A corrupt tree is skipped with a warning; other roots still list | Unit test |
| AC-004 | REQ-002, REQ-003 | SCN-002/003/005/006 | Click a team, org or agent card, run or member | The view changes at once; one request; loading state shown; no stale runs | Error → existing error state with Retry | Page and store unit tests; manual Electron check |
| AC-005 | REQ-004 | all | Same data, current `origin/personal` team explorer output vs this package | Team groups and runs identical, except the REQ-009/REQ-010 fields and the REQ-012 additions with their derived aggregates | Search, paging and imported source unchanged | Existing tests; equivalence on real data |
| AC-006 | REQ-005 | SCN-003 | Inspect a team member run | Same location resolved; root-scoped read for root IDs | A nested team run ID still resolves | Unit test |
| AC-007 | REQ-006, REQ-008 | SCN-004 | Memory → Agent Orgs on the user's data | Cards for `autobyteus-org`, `nested-classroom-test`, `northstar-operating-company` and `software-development-department` (those with member memory), with correct run counts and badges; ≤ 2 s | Imported source → empty state "No agent org memories yet." | Backend unit test; manual check |
| AC-008 | REQ-007 | SCN-005 | Open an org card | Runs listed newest first; members labeled by address path; search by summary, run ID, workspace or member address/run ID works; paging works | No match → existing "no runs match" state | Unit and component tests |
| AC-009 | REQ-007 | SCN-006 | Select an org member | The inspector shows that run's memory; breadcrumb and Back as specified | Unknown member → empty view (same as a team) | Resolver and page tests |
| AC-010 | REQ-009 | SCN-002/005 | View a team or org detail | Every member entry shows a non-empty name | — | Component test |
| AC-011 | REQ-010 | SCN-002/003/005/006 | A team or org run with a delegated task instance of a configured agent that has memory | That entry's `agentRunId` is the task run's ID, and the inspector opens the task run's memory | — | Unit test (team fixture `task-writer-run`) |
| AC-012 | REQ-011, REQ-002, REQ-003 | SCN-002, 003, 005, 006 | Click a card, run or member, or Back, with the page already open | Exactly one network request (the view's data or memory view); no `listMemoryExplorerSources`; the new view shows "Loading runs…" at once and never "No runs match this filter" before the data arrives | Unknown imported source in the route → one awaited sources refresh, then fall back to Local | Page and store unit tests (request counting; render-state order) |
| AC-013 | REQ-011 | SCN-001, SCN-004 | A source is imported by another node while the Memory page is open; the user returns to the Memory home | The new source appears in the selector without reloading the app; the home list is not delayed by the refresh | Sources refresh fails → the existing source error text; the list still loads | Store and page tests |
| AC-014 | REQ-012 | SCN-002, SCN-005, SCN-006 | Open run `nested_classroom_test_org_d46808bf…` (Agent Orgs → nested-classroom-test) | Rows: `Teacher`; group `StudentStudyGroup` → `student_one`, `student_two`; task group `StudentStudyGroup (task, <start time>)` → `student_one`, `student_two`. Each student row opens its own run's memory (different run IDs) | A run whose task team has no memory shows no task group; team runs follow the same rule | Unit tests with admitted fixtures (configured team, task agent, task team, nested task team); the API/E2E test is updated from "excludes" to "includes, structured" |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | See teams with memory | Memory → Agent Teams | Hundreds of stored team runs | Click the tab | Team cards shown quickly | Error state | Supported Normal Scenario | Screenshot, curl | REQ-001, REQ-004 |
| SCN-002 | User | Desktop user | See a team's runs | Click a team card | SCN-001 | Card → detail → runs with their member tree; search/page | Immediate and single fast load | Error with Retry | Supported Normal Scenario | Report, curl, probe | REQ-001…004, 009, 010, 011, 012 |
| SCN-003 | User | Desktop user | Inspect member or run memory | Click a member (team) or a run (agent) | Detail open | Click → inspector | Immediate, single load | Error state | Supported Normal Scenario | Code | REQ-002, 005, 010 |
| SCN-004 | User | Desktop user | See orgs with memory | Memory → Agent Orgs | Stored org runs | Click the tab | Org cards shown quickly | Imported source → empty state | Supported Normal Scenario | User direction; data | REQ-006, 008 |
| SCN-005 | User | Desktop user | See an org's runs | Click an org card | SCN-004 | Card → org detail → runs with their member tree; search/page | Immediate, single fast load | Error with Retry | Supported Normal Scenario | User direction | REQ-007, 008, 009, 010, 012 |
| SCN-006 | User | Desktop user | Inspect an org member's memory | Click an org member | SCN-005 | Click → inspector → tabs → Back | Member memory shown | Error state | Supported Normal Scenario | User direction | REQ-007, 010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement, prototype, Product ticket, revision, confirmation, visual baseline: N/A. Not applicable. The Agent Orgs tab and detail reuse the existing Agent Teams visual pattern.
- Required states: a third tab labeled "Agent Orgs"; loading, error with Retry, empty and paging states the same as Agent Teams; members shown as a tree (REQ-012): group header rows for configured teams and task teams (task rows marked as tasks with start time, visually consistent with the run-history sidebar), agent rows with a name line (the member's address path for orgs) and a run ID line; the inspector breadcrumb as in REQ-007.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Measurable Constraint | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-008 | Performance | Each team or org explorer query ≤ 2 s | The user's local memory: 534 team runs, 19 org runs | Timing on real data |
| QR-002 | REQ-001, REQ-008, REQ-012 | Performance | One tree read per root per explorer request | Any volume | Unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. All paths are read-only.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GraphQL memory explorer and memory view | Existing queries keep their names, arguments and fields. New org queries and the member-target structure fields (REQ-012) are additive. The member target type is shared between teams and orgs | `memory-explorer.ts`, `memory-view.ts` | Web codegen must be regenerated |

## Supplemental Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `investigation-notes.md` | Evidence, timings, equivalence proof, org storage facts | Current |
| `design-spec.md` | Architecture design | Current |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | The ≤ 2 s bound is judged at today's volume on the user's machine | Accepted |

## Open Decisions And Questions

| ID | Question | Status |
| --- | --- | --- |
| DEC-001 | Ship the frontend double-fetch fix together with the backend fix? | Resolved: yes (user approval, 2026-09-24) |
| DEC-002 | (SR-004, CR-002) When does the sources list refresh? Options: (a) **recommended**: load on Memory page entry plus a background refresh whenever the home view is shown; (b) refresh when the source selector is opened/focused; (c) an explicit refresh button; (d) (a)+(c). Consideration: imports arrive from other nodes at any time. (b) updates options while a native `<select>` is open, which is awkward. (c) alone would hide new imports until clicked | **Resolved: option (a)** (user "go", 2026-09-25) |
| DEC-003 | **Resolved (2026-09-25):** CR-003 was delivered upstream as the separate ticket "Unify Agent Team and Agent Org run-history catalog policy" (`b68847a8c`). This package only integrates it (CR-004): the org memory source reads `AgentOrgRunHistoryCatalogService.listCatalogRows()`. Original question: include "org history reads have side effects" in this package? Making `AgentOrgRunHistoryCatalogService.listRows()` pure needs a new explicit startup initialization for the run-history sidebar (`collaboration-root-history-service.ts` relies on repair-on-first-read today). That is a different page and lifecycle. **Recommendation: a separate run-history ticket.** The memory explorer's read-only index read stays correct meanwhile | **Resolved upstream** (see first cell) |
| DEC-004 | (SR-004) Memory folders on disk that the run's saved structure does not reference (found: 4, all in nested-classroom-test org runs, e.g. `…/studentstudygroup_5f3c…/student_one_c08d…`; 0 in team runs). Show them in the run as an "Other memory in this run" group, or leave them out? | **Resolved (user, 2026-09-25): leave them out.** The page follows the run's execution tree; no special handling for memory the tree does not reference (\"We don't do special things\"). Cause (investigation notes, "DEC-004 root cause"): June 2026 delegated-task memory whose task entry was lost from the run record by an earlier data transition. **Recommendation: do not show them in this feature** (the page follows the run record; no special legacy group). If you want them visible, restore their task entries with a separate one-off data repair |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-002 | BEH-001, BEH-002 | AC-001…003 | SCN-001, SCN-002 |
| REQ-002 | UC-002, UC-003, UC-005, UC-006 | BEH-002, BEH-003 | AC-004 | SCN-002, 003, 005, 006 |
| REQ-003 | UC-002, UC-005 | BEH-002, BEH-004 | AC-004 | SCN-002, SCN-005 |
| REQ-004 | UC-001…003 | BEH-005 | AC-005 | SCN-001…003 |
| REQ-005 | UC-003 | BEH-003 | AC-006 | SCN-003 |
| REQ-006 | UC-004 | BEH-006 | AC-007 | SCN-004 |
| REQ-007 | UC-005, UC-006 | BEH-007 | AC-008, AC-009 | SCN-005, SCN-006 |
| REQ-008 | UC-004, UC-005 | BEH-006, BEH-007 | AC-003, AC-007 | SCN-004, SCN-005 |
| REQ-009 | UC-002, UC-005 | BEH-008 | AC-010 | SCN-002, SCN-005 |
| REQ-010 | UC-002, UC-003, UC-005, UC-006 | BEH-009 | AC-011 | SCN-002, 003, 005, 006 |
| REQ-011 | UC-001…UC-006 | BEH-002, BEH-003 | AC-012, AC-013 | SCN-001…SCN-006 |
| REQ-012 | UC-002, UC-003, UC-005, UC-006 | BEH-007, BEH-009, BEH-010 | AC-003, AC-014 | SCN-002, SCN-005, SCN-006 |

## Architecture Phase Input

- Scenarios to map: SCN-001…SCN-006.
- Constraints: existing GraphQL queries unchanged (additive fields only); team output identical apart from REQ-009, REQ-010 and REQ-012; team and org stay independent persistence families; the execution tree is the only membership authority.
- Verified facts: root-scoped listing is output-identical on real data (0 fallbacks); org trees are read by `AgentOrgExecutionTreeLocationService`; org memory lives at `agent_orgs/<orgRunId>/<teamRunId?>/<agentRunId>`.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`. SR-001 approved explicitly; the SR-002 org tab by user direction; SR-004 (REQ-009…REQ-012, DEC-002, DEC-004) approved with "go" on 2026-09-25.
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
