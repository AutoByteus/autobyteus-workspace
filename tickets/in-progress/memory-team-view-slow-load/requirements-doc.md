# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `memory-team-view-slow-load`
- Request / ticket: User report 2026-09-24: Memory → Agent Teams loads slowly, and a team card takes very long to open. Follow-up direction on the same day: also support an Agent Orgs memory tab.
- Requirements owner: Solution Designer
- Date: 2026-09-24
- Approval state and reference:
  - SR-001 baseline (REQ-001…REQ-005): approved by the user on 2026-09-24 ("since you found the problem, now approved your requirement"). DEC-001 is resolved as "include the frontend fix" (approval covered the recommendation as presented).
  - SR-002 delta (REQ-006…REQ-010): added in the same message by user direction ("we should also support agent org memory tab as well … make sure we have clean design"). REQ-006…REQ-008 carry the approved Agent Teams behavior over to Agent Orgs, and add no new product policy.
  - REQ-009 and REQ-010 are corrections found while designing the shared member structure the user asked to keep clean. Each restores the intended outcome of an existing control. They are called out explicitly in the result message. If the user objects, that is a `Requirement Gap` and follows Recovery.
- Exact approved requirements baseline / solution revision: SR-002 (this document)
- Behavior-defining supplements and their approved versions: N/A. None.

## Problem And Desired Outcome

- Problem 1 (SR-001): The Memory explorer's Agent Teams tab takes about 32 s to load. A team card takes about 65–80 s to become usable. The cause is an O(N²) rescan of all 534 stored team runs, plus a request the frontend sends twice. It is not a memory leak. See `investigation-notes.md`.
- Problem 2 (SR-002): The Memory explorer has no way to browse Agent Org memory. On the user's machine, 19 stored org runs hold 144 MB of member memory under `memory/agent_orgs`, and none of it is visible.
- Desired outcome: Agent Teams and a new Agent Orgs tab both load in about a second at today's volume. A card or member click navigates immediately and sends one request. Team content is unchanged apart from the two defect corrections REQ-009 and REQ-010.
- Observable definition of success: see QR-001 and AC-001…AC-011.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001 | Agent Teams tab cards appear after about 32 s | Cards appear within QR-001 | Same teams, counts, badges, order, paging, search | curl 31.8 s |
| BEH-002 | User | SCN-002 | Card click: no visible change for 32–40 s, then a second identical request | Immediate navigation with a loading state; one request; runs within QR-001 | Same runs, order, paging, search | Code + curl + probe |
| BEH-003 | User | SCN-003 | Member or run click fetches the memory view twice | Immediate navigation; one fetch | Same inspector content | Code |
| BEH-004 | User | SCN-002 | The detail view can briefly show the previously opened team's runs | Never shows another selection's runs | — | Code |
| BEH-005 | System | all | Content is correct apart from BEH-008 and BEH-009 | Unchanged apart from REQ-009 and REQ-010 | Grouping, memory availability, sort, paging, search, local/imported source | Probe: identical output |
| BEH-006 | User | SCN-004 | No current supported behavior. Org memory is not browsable in the Memory explorer | Agent Orgs tab lists org definitions that have stored member memory | Mirrors the Agent Teams card content | Code: `MemoryHome.vue` has two tabs only |
| BEH-007 | User | SCN-005, SCN-006 | No current supported behavior | Org card opens the org's runs and their members; a member opens the inspector | Mirrors the Agent Teams detail and inspector | Data: `memory/agent_orgs/*` |
| BEH-008 | User | SCN-002 | Team member buttons show an empty name line: the frontend reads `memberName`, the API returns `displayName` | Member name is shown | — | `AgentTeamMemoryDetail.vue:37`, `types/memory.ts`, `memory-explorer-schema.ts:219` |
| BEH-009 | User | SCN-002, SCN-003 | A delegated task instance of a configured member is listed with the configured member's run ID. Its badge shows the task run's memory, but clicking it opens the configured run's memory | Each member entry identifies its own run, so the badge and the inspector agree | — | `team-memory-explorer-service.ts#toMemberTargetSummary` uses `member.agentRunId` from the configured placement. 1 team run and 5 org runs on real data have task executions |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Required Outcome | Constraint |
| --- | --- | --- | --- |
| Desktop user | Browse team and org memory | Fast tabs, fast opening, org memory visible | Team content unchanged apart from the corrections |

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
- Showing members of delegated task **teams** (task-team members). The Agent Teams rule excludes them, and it is kept for orgs.
- Org-level (non-agent) artifacts such as communication messages and delegation records.
- Changes to persisted data or file layout. Changes to other pages.

### Non-Goals

- Scaling far beyond today's volume without further work (RSK-001).

### Preserved Behavior Boundary

BEH-005, the preserved column of BEH-001…BEH-003, REQ-004 and AC-005.

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
| REQ-004 | Team explorer content must stay unchanged, apart from REQ-009 and REQ-010. That covers groups, names, run and member counts, memory availability, timestamps, ordering, paging, search results and local/imported handling. | BEH-005 | Must | Pure performance fix | SR-001, approved; SR-002 exceptions |
| REQ-005 | Resolving one team member's memory location for the inspector must not scan every stored team run when the team run ID is a stored root. | BEH-003 | Should | Same pattern | SR-001, approved |
| REQ-006 | The Memory home must offer an **Agent Orgs** tab next to Agents and Agent Teams. It lists org definitions that have stored member memory: name, definition ID, run count, member count, last updated and memory badges. It supports search, paging and the source selector, the same way Agent Teams does. | BEH-006 | Must | User direction | SR-002, user |
| REQ-007 | Opening an org card shows that org's runs: summary or run ID, run ID, workspace, last updated, badges and member entries with memory. Search and paging work as in Agent Teams. A member entry is labeled by its address inside the org (for example `software_engineering_team/solution_designer`). Selecting it opens the Memory Inspector for that member run with the Working Context, Episodic, Semantic and Raw Traces tabs. The breadcrumb reads `Agent Orgs / <org> / <org run> / <member>`, and Back returns to the org detail. | BEH-007 | Must | User direction; mirrors Agent Teams | SR-002, user |
| REQ-008 | The Agent Orgs list and org runs list meet REQ-001 (linear) and QR-001. The member-selection rule matches Agent Teams: configured agents, including agents inside configured teams, plus delegated task instances of a configured agent. | BEH-006, BEH-007 | Must | Consistency and performance | SR-002, user |
| REQ-009 | Team and org member entries show the member's display name. | BEH-008 | Must | Defect correction; the control already intends to show it | SR-002, correction |
| REQ-010 | Each team or org member entry identifies its own agent run. Its badge, run ID and inspector target refer to the same run. | BEH-009 | Must | Defect correction; badge and inspector must agree | SR-002, correction |

## Acceptance Criteria

| AC ID | Requirement IDs | Scenario IDs | Trigger | Observable Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | `listAgentTeamsWithMemory` on the user's memory directory (534 team runs) | ≤ 2 s | — | Timing against the built backend |
| AC-002 | REQ-001 | SCN-002 | `listAgentTeamRunsWithMemory("software-engineering-team")` | ≤ 2 s | — | Same |
| AC-003 | REQ-001, REQ-008 | SCN-001/002/004/005 | Unit test with several stored roots and a counting tree store | One tree read per root per request | A corrupt tree is skipped with a warning; other roots still list | Unit test |
| AC-004 | REQ-002, REQ-003 | SCN-002/003/005/006 | Click a team, org or agent card, run or member | The view changes at once; one request; loading state shown; no stale runs | Error → existing error state with Retry | Page and store unit tests; manual Electron check |
| AC-005 | REQ-004 | all | Same data before and after | Team groups and runs identical, except the fields REQ-009 and REQ-010 correct | Search, paging and imported source unchanged | Existing tests; equivalence on real data |
| AC-006 | REQ-005 | SCN-003 | Inspect a team member run | Same location resolved; root-scoped read for root IDs | A nested team run ID still resolves | Unit test |
| AC-007 | REQ-006, REQ-008 | SCN-004 | Memory → Agent Orgs on the user's data | Cards for `autobyteus-org`, `nested-classroom-test`, `northstar-operating-company` and `software-development-department` (those with member memory), with correct run counts and badges; ≤ 2 s | Imported source → empty state "No agent org memories yet." | Backend unit test; manual check |
| AC-008 | REQ-007 | SCN-005 | Open an org card | Runs listed newest first; members labeled by address path; search by summary, run ID, workspace or member address/run ID works; paging works | No match → existing "no runs match" state | Unit and component tests |
| AC-009 | REQ-007 | SCN-006 | Select an org member | The inspector shows that run's memory; breadcrumb and Back as specified | Unknown member → empty view (same as a team) | Resolver and page tests |
| AC-010 | REQ-009 | SCN-002/005 | View a team or org detail | Every member entry shows a non-empty name | — | Component test |
| AC-011 | REQ-010 | SCN-002/003/005/006 | A team or org run with a delegated task instance of a configured agent that has memory | That entry's `agentRunId` is the task run's ID, and the inspector opens the task run's memory | — | Unit test (team fixture `task-writer-run`) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Starting Condition | Steps | Expected Outcome | Alternate / Error | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | See teams with memory | Memory → Agent Teams | Hundreds of stored team runs | Click the tab | Team cards shown quickly | Error state | Supported Normal Scenario | Screenshot, curl | REQ-001, REQ-004 |
| SCN-002 | User | Desktop user | See a team's runs | Click a team card | SCN-001 | Card → detail → runs; search/page | Immediate and single fast load | Error with Retry | Supported Normal Scenario | Report, curl, probe | REQ-001…004, 009, 010 |
| SCN-003 | User | Desktop user | Inspect member or run memory | Click a member (team) or a run (agent) | Detail open | Click → inspector | Immediate, single load | Error state | Supported Normal Scenario | Code | REQ-002, 005, 010 |
| SCN-004 | User | Desktop user | See orgs with memory | Memory → Agent Orgs | Stored org runs | Click the tab | Org cards shown quickly | Imported source → empty state | Supported Normal Scenario | User direction; data | REQ-006, 008 |
| SCN-005 | User | Desktop user | See an org's runs | Click an org card | SCN-004 | Card → org detail → runs and members; search/page | Immediate, single fast load | Error with Retry | Supported Normal Scenario | User direction | REQ-007, 008, 009, 010 |
| SCN-006 | User | Desktop user | Inspect an org member's memory | Click an org member | SCN-005 | Click → inspector → tabs → Back | Member memory shown | Error state | Supported Normal Scenario | User direction | REQ-007, 010 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX supplement, prototype, Product ticket, revision, confirmation, visual baseline: N/A. Not applicable. The Agent Orgs tab and detail reuse the existing Agent Teams visual pattern.
- Required states: a third tab labeled "Agent Orgs"; loading, error with Retry, empty and paging states the same as Agent Teams; member entry shows a name line (the member's address path for orgs) and a run ID line; the inspector breadcrumb as in REQ-007.
- Explicitly unresolved product decisions: None.

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Measurable Constraint | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-008 | Performance | Each team or org explorer query ≤ 2 s | The user's local memory: 534 team runs, 19 org runs | Timing on real data |
| QR-002 | REQ-001, REQ-008 | Performance | One tree read per root per explorer request | Any volume | Unit test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. All paths are read-only.

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| GraphQL memory explorer and memory view | Existing queries keep their names, arguments and fields. New org queries are additive. The member target type is shared between teams and orgs | `memory-explorer.ts`, `memory-view.ts` | Web codegen must be regenerated |

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

## Architecture Phase Input

- Scenarios to map: SCN-001…SCN-006.
- Constraints: existing GraphQL queries unchanged; team output identical apart from REQ-009 and REQ-010; team and org stay independent persistence families.
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

- User approval received: `Yes`. SR-001 was approved explicitly; the SR-002 org tab was added by user direction; REQ-009 and REQ-010 are corrections disclosed to the user.
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
