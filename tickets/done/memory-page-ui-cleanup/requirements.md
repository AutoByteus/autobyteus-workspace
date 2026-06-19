# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The Memory page UI is visually noisy because several labels repeat the word "Memory" or repeat subject qualifiers after the surrounding page already establishes the context. The landing page currently uses labels such as "Agents with Memory", "Agent Teams with Memory", and "Search agents with memory..." even though the user is already on the Memory page. The detail pages also repeat terms such as "Agent Memory Detail", "Codex Memory", "Agent Runs", "Stable ID", and per-card metadata labels in a way that makes the page feel less clean.

The goal is to make the Memory landing, detail, and inspector surfaces more concise while preserving the page flow, subject identity, counts, search, pagination, timestamps, workspace context, memory badges, and raw-trace access.

## Investigation Findings

- The requested UI is implemented in the frontend Memory page stack, not in backend memory persistence:
  - `autobyteus-web/components/memory/MemoryHome.vue`
  - `autobyteus-web/components/memory/AgentMemoryDetail.vue`
  - `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue`
  - `autobyteus-web/components/memory/MemoryInspector.vue`
  - `autobyteus-web/pages/memory.vue`
- The main redundant visible strings are local presentation/localization concerns:
  - landing tabs/search: `Agents with Memory`, `Agent Teams with Memory`, `Search agents with memory...`, `Search teams with memory...`;
  - landing cards: `Latest memory:` and `members with memory` repeat the Memory-page context;
  - detail hero: `Agent Memory Detail` / `Agent Team Memory Detail`, `<name> Memory`, `Stable ID:`;
  - detail lists: `Agent Runs`, `Team Runs`, `Team member memories`, `Workspace:`, and `Updated:` repeated on every card;
  - inspector/page navigation: `Back to <subject> Memory` and duplicated `Memory Inspector` eyebrow/title.
- Existing frontend ownership is healthy for this scope: `MemoryHome` owns the landing presentation, the two detail components own selected-subject run lists, `MemoryInspector` owns payload/tab inspection, and `memory.vue` owns route-driven navigation/back labels.
- No backend API, store, or data-model change is needed. The GraphQL explorer contract remains correct because it still returns memory-bearing agents/teams/runs; only the visible labels should become more concise.
- Existing component/page tests assert the old copy (`Agents with Memory`, `Codex Memory`, `Team member memories`) and must be updated to assert the new copy or behavior.
- Durable docs currently describe the old labels in `autobyteus-web/docs/memory.md`; docs should be updated during delivery after implementation/test review confirms the final UI copy.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / UI copy polish.
- Initial design issue signal (`Yes`/`No`/`Unclear`): No.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed.
- Evidence basis: Code search and component reads show the redundant text is localized/hardcoded in the existing Memory presentation components. The existing frontend owner boundaries map cleanly to the requested surfaces and do not require a new subsystem or API boundary.
- Requirement or scope impact: Implement as a clean local UI-label/layout polish. Rename or replace affected localization keys so hidden key names do not preserve the old "with_memory" semantics when the visible copy changes.

## Recommendations

- Replace landing tab labels with concise subject labels:
  - `Agents with Memory` -> `Agents`
  - `Agent Teams with Memory` -> `Agent Teams`
- Replace landing search placeholders:
  - `Search agents with memory...` -> `Search agents...`
  - `Search teams with memory...` -> `Search agent teams...`
- Simplify landing card metadata:
  - Agent card: use `Updated <timestamp>` or `Latest <timestamp>` instead of `Latest memory: <timestamp>`.
  - Team card: use `<memberMemoryCount> members · Updated <timestamp>` instead of `<memberMemoryCount> members with memory · Latest memory: <timestamp>`.
- Simplify selected-subject detail headers:
  - Eyebrow/type should be concise (`Agent` or `Agent Team`) or omitted; do not render `Agent Memory Detail` / `Agent Team Memory Detail`.
  - Title should be the selected subject name only (`Codex`, `<Team Name>`), not `<name> Memory`.
  - Subtitle should be concise (`6 runs · ID: codex`) while preserving ID visibility.
- Simplify selected-subject run-list copy:
  - Use `Runs` for the section heading and `Search runs...` for both agent and team detail pages.
  - Keep run/team-run IDs, workspace paths, update time, and memory badges, but render card metadata compactly instead of repeating `Workspace:` and `Updated:` labels on every card.
  - Use `Members` instead of `Team member memories` for the team-run member target section.
- Simplify inspector/back copy where it repeats the subject context:
  - In `pages/memory.vue`, use `Back to <subject>` rather than `Back to <subject> Memory` for inspector back labels.
  - In `MemoryInspector.vue`, render `Memory Inspector` once rather than as both eyebrow and title.
- Update English and zh-CN localization resources consistently. Prefer semantically renamed keys such as `agents`, `agent_teams`, `search_agents`, `search_agent_teams`, `subject_type_agent`, `subject_type_agent_team`, `runs`, `search_runs`, and `members` rather than keeping old key names that say `with_memory`.
- Update focused component/page tests to guard the new concise copy and absence of the old redundant phrases.

## Scope Classification (`Small`/`Medium`/`Large`)

Small.

## In-Scope Use Cases

- UC-MEM-UI-001: Inspect the Memory landing page and switch between agent and agent-team memory catalogs using concise subject labels.
- UC-MEM-UI-002: Search/filter Memory landing catalogs without redundant "with memory" placeholder copy.
- UC-MEM-UI-003: Open an agent detail page and scan the selected agent's runs from a concise header and run list.
- UC-MEM-UI-004: Open an agent-team detail page and scan the selected team's runs and member targets from concise headers and lists.
- UC-MEM-UI-005: Open a run/member inspector and navigate back without duplicated subject-memory wording.

## Out of Scope

- Changing memory persistence, storage, indexing, or backend APIs.
- Changing which agents/teams/runs are included in Memory page catalogs.
- Changing route query parameters, deep-link behavior, search behavior, pagination behavior, memory badges, or raw-trace lazy loading semantics.
- Redesigning the application sidebar/navigation outside Memory-page labels and local card/header copy.
- Removing useful identity/status data needed to identify runs, timestamps, workspace context, memory availability, or raw trace access.

## Functional Requirements

- REQ-MEMORY-UI-001: Memory Home must use concise tab labels that identify only the subject type (`Agents`, `Agent Teams`) and must not include `with Memory` / `with memory`.
- REQ-MEMORY-UI-002: Memory Home search placeholders must match the active subject type and must not include `with memory`.
- REQ-MEMORY-UI-003: Memory Home cards must keep subject identity, run counts, latest-update information, and memory badges while avoiding redundant `Latest memory:` and `members with memory` phrasing.
- REQ-MEMORY-UI-004: Agent and agent-team detail headers must identify the selected subject without rendering `Agent Memory Detail`, `Agent Team Memory Detail`, or `<subject> Memory` as visible header copy.
- REQ-MEMORY-UI-005: Agent and agent-team detail lists must keep run/member identity, workspace context, update times, badges, search, and pagination while using concise headings and metadata labels.
- REQ-MEMORY-UI-006: Inspector/back-navigation copy must avoid duplicating subject-memory wording while preserving clear navigation and inspector context.
- REQ-MEMORY-UI-007: The implementation must update localization resources and focused tests so old redundant phrases are not preserved by stale translation keys or assertions.
- REQ-MEMORY-UI-008: Existing Memory page data flow, route flow, and API/store contracts must remain unchanged.

## Acceptance Criteria

- AC-MEMORY-UI-001: On Memory Home, the subject tabs visibly read `Agents` and `Agent Teams`; no visible tab label contains `with Memory` or `with memory`.
- AC-MEMORY-UI-002: On Memory Home, the active search placeholder reads concisely (`Search agents...` or `Search agent teams...`) and does not contain `with memory`.
- AC-MEMORY-UI-003: On Memory Home cards, the latest timestamp/member count line no longer contains `Latest memory:` or `members with memory`, while the timestamp/member count remains visible where data exists.
- AC-MEMORY-UI-004: On an agent detail page, the hero/header visibly identifies the selected agent as `Codex` (or the relevant agent name) and does not show `Agent Memory Detail` or `Codex Memory`.
- AC-MEMORY-UI-005: On an agent-team detail page, the hero/header visibly identifies the selected team by name and does not show `Agent Team Memory Detail` or `<team name> Memory`.
- AC-MEMORY-UI-006: On agent and team detail pages, the run-list heading is concise (`Runs`) and the search placeholder is concise (`Search runs...`).
- AC-MEMORY-UI-007: Detail run cards still show run/team-run title or ID, stable run ID, workspace path when present, updated timestamp when present, and existing memory badges/actions, but do not repeat `Workspace:` and `Updated:` prefixes on every card.
- AC-MEMORY-UI-008: Team-run member target sections use concise copy such as `Members` and still render all inspectable member targets.
- AC-MEMORY-UI-009: The inspector screen renders `Memory Inspector` at most once in the header area and inspector back labels use `Back to <subject>` rather than `Back to <subject> Memory`.
- AC-MEMORY-UI-010: Existing navigation, data fetch, pagination, search execution, detail routing, inspector routing, memory badges, and raw trace access keep working.
- AC-MEMORY-UI-011: Focused frontend tests are updated to assert the new concise labels and/or absence of old redundant labels.
- AC-MEMORY-UI-012: English and zh-CN Memory localization resources are updated consistently, and obsolete copy keys are removed or renamed when no longer used.

## Constraints / Dependencies

- Must align with existing Nuxt/Vue/Tailwind component conventions in `autobyteus-web/components/memory`.
- Must preserve existing GraphQL queries and Pinia store contracts.
- Must keep the Memory Home distinction between memory-bearing agents and memory-bearing agent teams even though the visible labels are shortened.
- Localization guard/audit may require updating generated message catalogs and avoiding newly introduced raw literals.

## Assumptions

- The requested cleanup is frontend-only.
- The screenshots reflect the current Memory page implementation in this repository.
- Concise labels are preferred over explanatory labels because the surrounding page title and route already establish the Memory context.
- `Back to Memory` remains acceptable because it names the destination page, but `Back to <subject> Memory` is redundant and should be shortened.

## Risks / Open Questions

- User approval is required for the exact visible copy before downstream design/implementation.
- zh-CN phrasing should be updated by best effort in parallel with English; reviewer may request copy refinement if current generated translations are considered rough.
- If the localization catalog has an undiscovered generation workflow, implementation may need to use that workflow rather than manually editing generated files.
- Card metadata compaction should not become so terse that timestamps or workspace paths become ambiguous.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-MEM-UI-001 | REQ-MEMORY-UI-001, REQ-MEMORY-UI-008 |
| UC-MEM-UI-002 | REQ-MEMORY-UI-002, REQ-MEMORY-UI-008 |
| UC-MEM-UI-003 | REQ-MEMORY-UI-004, REQ-MEMORY-UI-005, REQ-MEMORY-UI-007, REQ-MEMORY-UI-008 |
| UC-MEM-UI-004 | REQ-MEMORY-UI-004, REQ-MEMORY-UI-005, REQ-MEMORY-UI-007, REQ-MEMORY-UI-008 |
| UC-MEM-UI-005 | REQ-MEMORY-UI-006, REQ-MEMORY-UI-008 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-MEMORY-UI-001, AC-MEMORY-UI-002, AC-MEMORY-UI-003 | Memory landing/list screenshot cleanup. |
| AC-MEMORY-UI-004, AC-MEMORY-UI-006, AC-MEMORY-UI-007 | Agent detail screenshot cleanup. |
| AC-MEMORY-UI-005, AC-MEMORY-UI-006, AC-MEMORY-UI-007, AC-MEMORY-UI-008 | Matching team detail cleanup inferred from code parity. |
| AC-MEMORY-UI-009 | Inspector/back-copy cleanup found during code investigation. |
| AC-MEMORY-UI-010 | Regression-sensitive behavior that must remain unchanged. |
| AC-MEMORY-UI-011, AC-MEMORY-UI-012 | Durable coverage and localization consistency. |

## Approval Status

Approved by user on 2026-06-19. Approved copy direction is: `Agents`, `Agent Teams`, `Search agents...`, `Search agent teams...`, selected-subject title only (`Codex`), `Runs`, `Search runs...`, `Members`, compact metadata, and one `Memory Inspector` header.
