# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Approved

## Goal / Problem Statement

Redesign the Memory page as a backend-for-frontend supported, page-based memory browser. The UX should be as straightforward as the Agents page: the user first sees cards for **agents with memory** or **agent teams with memory**, clicks one card, enters that agent/team's memory detail page, and then inspects memory for a specific agent run or team member run.

The first list is a memory-derived catalog, not the configured Agents/Agent Teams catalog. If 100 independent agents exist but only 5 have stored memory, Memory shows only those 5. If 100 agent teams exist but only 5 have memory-bearing team runs, Memory shows only those 5. Definition metadata may improve display names, but stored memory / memory-bearing run history decides what appears.

## Investigation Findings

- Current UI is run-first: `MemoryIndexPanel.vue` shows `Agent Runs` / `Team Runs`, search/manual run ID controls, and a flat run/team-run list.
- Current backend index APIs are run-first: `listRunMemorySnapshots` and `listTeamRunMemorySnapshots`.
- Existing backend memory content readers are reusable: `AgentMemoryService` and `MemoryFileStore` already read Working Context, Episodic, Semantic, and Raw Traces.
- Existing run-history/team-run metadata can enrich display names, summaries, workspaces, team member names, and timestamps.
- Local data confirms the need: there can be many configured agents/teams but only a small subset with memory. The Memory page must optimize for the memory-bearing subset.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Current backend/UI expose run snapshots as the primary navigation unit, while the desired product concept is agent/team cards first, detail page second, memory inspector third.
- Requirement or scope impact: Backend BFF read models are required; frontend-only grouping/restyling is not acceptable.

## Recommendations

- Add BFF queries that directly return:
  - agents with memory,
  - agent runs with memory for one selected agent,
  - agent teams with memory,
  - team runs and team member memory targets for one selected team.
- Replace the current flat Memory panel with page-based navigation:
  - Memory Home cards,
  - Agent Memory Detail,
  - Agent Team Memory Detail,
  - Memory Inspector.
- Use direct UI labels only: `Agents with Memory`, `Agent Teams with Memory`, `Agent Runs`, `Team Runs`, `Team member memories`, `Memory Inspector`.
- Do not use abstract UI labels such as `Memory Subjects`.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

## In-Scope Use Cases

- UC-MEM-001: Browse independent agents that have memory.
- UC-MEM-002: Open one agent's memory detail page and inspect one of its runs.
- UC-MEM-003: Browse agent teams that have memory.
- UC-MEM-004: Open one agent team's memory detail page, choose a team run/member, and inspect that member's memory.
- UC-MEM-005: Search/filter the memory-bearing agent/team list and selected agent/team runs.
- UC-MEM-006: Inspect Working Context, Episodic, Semantic, and Raw Traces.
- UC-MEM-007: Still expose legacy/unattributed run memory under a clear `Unattributed runs` area.

## Out of Scope

- Showing configured agents or agent teams that have never been run and have no stored memory.
- Changing how memory is recorded by runtimes.
- Changing compaction semantics or memory file formats.
- Adding memory editing/deletion functionality.
- Adding cross-run memory comparison or diffing.
- Persistent memory indexing/cache unless validation proves current scanning is too slow.

## Functional Requirements

- FR-MEM-001: Memory Home must default to `Agents with Memory`, listing only independent agents with stored memory or memory-bearing run history.
- FR-MEM-002: Memory Home must provide `Agent Teams with Memory`, listing only agent teams with stored team/member memory or memory-bearing team-run history.
- FR-MEM-003: Agent cards must show display name, stable ID when available, run count, latest memory update, and memory-type badges.
- FR-MEM-004: Agent team cards must show display name, stable ID, team run count, latest memory update, member-memory summary, and memory-type badges.
- FR-MEM-005: Clicking an agent card must open an Agent Memory Detail page for that agent.
- FR-MEM-006: Agent Memory Detail must list only runs for that selected agent, sorted by latest memory update by default.
- FR-MEM-007: Clicking an agent run must open Memory Inspector for that run.
- FR-MEM-008: Clicking an agent team card must open an Agent Team Memory Detail page for that team.
- FR-MEM-009: Agent Team Memory Detail must list only team runs for that selected team, sorted by latest memory update by default.
- FR-MEM-010: Each team run must expose team member memory targets for members that have memory in that run.
- FR-MEM-011: Clicking a team member memory target must open Memory Inspector for `teamRunId + memberRunId`.
- FR-MEM-012: Raw Traces must be lazy-loaded only when the user opens Raw Traces or changes the trace limit.
- FR-MEM-013: Search on Memory Home filters only agents/teams with memory; search on detail pages filters only runs for the selected agent/team.
- FR-MEM-014: Standalone memory directories without history/metadata must remain visible under `Unattributed runs` and remain inspectable.
- FR-MEM-015: Backend BFF read models must be the source for Memory Home and detail pages; frontend must not reconstruct the main hierarchy from flat run snapshots.
- FR-MEM-016: The old flat `Agent Runs` / `Team Runs` primary UI must be removed, not retained as a parallel path.

## Acceptance Criteria

- AC-MEM-001: Given 100 configured agents but only 5 agents with memory, Memory Home lists only those 5 agents.
- AC-MEM-002: Given 100 configured agent teams but only 5 teams with memory, Memory Home lists only those 5 teams.
- AC-MEM-003: Clicking an agent card opens that agent's Memory Detail page and shows only that agent's runs.
- AC-MEM-004: Clicking an agent run opens Memory Inspector with breadcrumb `Agents / <agent> / <run>`.
- AC-MEM-005: Clicking an agent team card opens that team's Memory Detail page and shows only that team's runs.
- AC-MEM-006: Clicking a team member inside a team run opens Memory Inspector with breadcrumb `Agent Teams / <team> / <team run> / <member>`.
- AC-MEM-007: Raw Traces are not requested during initial inspector load unless Raw Traces is active.
- AC-MEM-008: Search on Memory Home does not show agents/teams without memory.
- AC-MEM-009: Backend tests verify memory-derived agent/team inclusion and exclusion of no-memory configured entries.
- AC-MEM-010: Frontend page/component tests verify the page flow: Memory Home → Agent Memory Detail → Agent Run Memory Inspector.
- AC-MEM-011: Frontend page/component tests verify the team flow: Memory Home → Agent Team Memory Detail → Team Member Memory Inspector.
- AC-MEM-012: No UI label says `Memory Subjects`.

## Constraints / Dependencies

- Existing memory files remain under `memory/agents/<runId>/` and `memory/agent_teams/<teamRunId>/<memberRunId>/`.
- Existing content readers remain the source for memory payloads.
- Run-history/team-run metadata and optional definition lookups are enrichment sources only.
- GraphQL schema changes require frontend GraphQL documents/generated types to be updated.
- Localization guard/audit may require new labels to be added to localization resources.

## Assumptions

- A memory-bearing independent agent is grouped primarily by `agentDefinitionId` when metadata exists; otherwise it appears under an explicit fallback such as `Unattributed runs`.
- A memory-bearing agent team is grouped primarily by `teamDefinitionId` when metadata exists.
- Memory Home should feel like the Agents page interaction pattern but must not list entries with no memory.

## Risks / Open Questions

- Whether any external GraphQL consumers use the old flat index queries. Code search found only the current Memory UI/tests.
- Whether scanning large memory directories remains performant; persistent cache is deferred unless validation shows a problem.
- Some old memory dirs may lack metadata; the fallback group must avoid hiding them.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-MEM-001 | FR-MEM-001, FR-MEM-003, FR-MEM-013, FR-MEM-015 |
| UC-MEM-002 | FR-MEM-005, FR-MEM-006, FR-MEM-007, FR-MEM-012 |
| UC-MEM-003 | FR-MEM-002, FR-MEM-004, FR-MEM-013, FR-MEM-015 |
| UC-MEM-004 | FR-MEM-008, FR-MEM-009, FR-MEM-010, FR-MEM-011, FR-MEM-012 |
| UC-MEM-005 | FR-MEM-013 |
| UC-MEM-006 | FR-MEM-007, FR-MEM-011, FR-MEM-012 |
| UC-MEM-007 | FR-MEM-014 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-MEM-001 | Confirms independent agents without memory are excluded. |
| AC-MEM-002 | Confirms agent teams without memory are excluded. |
| AC-MEM-003 | Confirms agent card → detail page. |
| AC-MEM-004 | Confirms agent run inspector. |
| AC-MEM-005 | Confirms team card → detail page. |
| AC-MEM-006 | Confirms team member inspector. |
| AC-MEM-007 | Confirms Raw Traces lazy loading. |
| AC-MEM-008 | Confirms search remains memory-derived. |
| AC-MEM-009 | Confirms backend BFF inclusion rules. |
| AC-MEM-010 | Confirms agent page flow. |
| AC-MEM-011 | Confirms team page flow. |
| AC-MEM-012 | Confirms direct UI naming. |

## Approval Status

Approved by user on 2026-05-31 after clarification that the page must use a memory-derived catalog and direct page-based UI labels.
