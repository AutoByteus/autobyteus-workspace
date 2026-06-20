# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete for design; implementation not started.
- Investigation Goal: Identify the current Memory Home and Memory detail page implementations, understand the layout ownership, and define a compact design that removes redundant visual hierarchy without changing run data behavior.
- Scope Classification (`Small`/`Medium`/`Large`): Small
- Scope Classification Rationale: Narrow frontend layout/content change around existing Memory Vue components plus test/doc updates.
- Scope Summary: Remove the redundant Memory Home title/subtitle, remove oversized agent/team detail summary cards, and use the selected subject name directly as the detail run-list heading.
- Primary Questions To Resolve:
  - Which frontend component renders the Memory Home `Memory` title and subtitle? Resolved: `MemoryHome.vue`.
  - Which components render the large subject summary blocks and `Runs` card headers? Resolved: `AgentMemoryDetail.vue` and `AgentTeamMemoryDetail.vue`.
  - Is backend/state work required? Resolved: No; selected names and list data already exist in `memoryExplorerStore`.
  - Should team detail receive the same simplification? Resolved recommendation: Yes, for consistent detail-view hierarchy because the same redundant pattern exists there.

## Request Context

Initial user request: Agent Memory detail page can be simplified because the top block wastes space when it only shows `Codex`. User suggested removing `Runs`, replacing it directly with `Codex`, and removing the top block.

Follow-up user request: Since the user already selected `Memory` in the sidebar, the page top still showing `Memory` is also redundant.

Reference screenshots:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e2abd02ed7004dff880d0938d23c76c3/solution_designer_40478244fa69411f835837db13ddf323/context_files/ctx_e3a51fde606d__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e2abd02ed7004dff880d0938d23c76c3/solution_designer_40478244fa69411f835837db13ddf323/context_files/ctx_69b5171c25c9__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_e2abd02ed7004dff880d0938d23c76c3/solution_designer_40478244fa69411f835837db13ddf323/context_files/ctx_9cf648bdb10d__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/memory-detail-compact-agent-header`
- Current Branch: `codex/memory-detail-compact-agent-header`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-20.
- Task Branch: `codex/memory-detail-compact-agent-header`
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's base checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` has unrelated untracked `.article-work/` and `docs/articles/`; this task worktree is clean and isolated.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-20 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git branch --show-current` | Bootstrap environment discovery | Current user checkout is git repo on `personal` tracking `origin/personal`, with unrelated untracked files. | No |
| 2026-06-20 | Command | `git remote show origin` | Resolve default/base branch | Origin HEAD branch is `personal`. | No |
| 2026-06-20 | Command | `git fetch origin --prune` | Refresh tracked remote state before ticket branch creation | Fetch completed successfully. | No |
| 2026-06-20 | Command | `git worktree add -b codex/memory-detail-compact-agent-header /Users/normy/autobyteus_org/autobyteus-workspace-superrepo origin/personal` | Create dedicated task worktree/branch | Worktree created at latest `origin/personal` (`70f94156`). | No |
| 2026-06-20 | Other | User detail screenshots listed in Request Context | Understand visual complaint and desired direction | Top agent summary card is oversized relative to displayed content; user suggests replacing `Runs` heading with `Codex` and removing top block. | No |
| 2026-06-20 | Other | User home screenshot listed in Request Context | Understand follow-up redundancy complaint | Memory Home repeats `Memory` in page content while sidebar already has `Memory` selected. | No |
| 2026-06-20 | Code | `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Locate agent detail summary/header implementation | Lines 3-15 render back link, large summary card (`Agent`, `agentName`, `total runs`, `ID`) and generic `Runs` list heading. `agentName` and `agentStableId` are computed from store/route. | Implement compact detail layout here. |
| 2026-06-20 | Code | `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Check whether team detail shares same pattern | Lines 3-15 render same pattern for team detail (`Agent Team`, `teamName`, `total runs`, `ID`) and generic `Runs` heading. | Apply same compact pattern for consistency. |
| 2026-06-20 | Code | `autobyteus-web/components/memory/MemoryHome.vue` | Locate Memory Home title/subtitle | Lines 2-7 render page-level `Memory` title and description before the browser section. | Remove redundant header. |
| 2026-06-20 | Code | `autobyteus-web/stores/memoryExplorerStore.ts` | Verify data/state owner for selected names and list behavior | Store owns selected agent/team summaries plus search/page/list actions. No state/API change needed for compact headings. | No |
| 2026-06-20 | Code | `autobyteus-web/pages/memory.vue` | Verify route/page shell behavior | Page shell selects Home/detail/inspector components by query and passes existing selected identities. No route change needed. | No |
| 2026-06-20 | Code | `autobyteus-web/components/memory/__tests__/AgentMemoryDetail.spec.ts` and `AgentTeamMemoryDetail.spec.ts` | Identify tests requiring update | Tests currently assert concise views but still allow/expect `runs` text. Need stronger compact-layout assertions. | Yes |
| 2026-06-20 | Code | `autobyteus-web/pages/__tests__/memory.spec.ts` | Check page shell coverage impact | Page tests cover Home/detail routing and behavior but not the redundant Home title. Add/update assertion if needed. | Yes |
| 2026-06-20 | Code | `autobyteus-web/localization/messages/en/memory.generated.ts` and `zh-CN/memory.generated.ts` | Locate labels that may become unused | Keys for `AgentMemoryDetail.agent`, `AgentMemoryDetail.runs`, `AgentTeamMemoryDetail.agent_team`, and `AgentTeamMemoryDetail.runs` exist. `AgentTeamMemoryDetail.runs` is referenced by a glossary consistency test. | Update/remove as implementation dictates. |
| 2026-06-20 | Doc | `autobyteus-web/docs/memory.md` | Identify stale docs | Detail Pages section says agent/team detail pages list runs under concise `Runs` heading and Home starts with Memory flow. Needs update after implementation. | Yes |
| 2026-06-20 | Command | `pnpm -C autobyteus-web test:nuxt --run components/memory/__tests__/AgentMemoryDetail.spec.ts components/memory/__tests__/AgentTeamMemoryDetail.spec.ts pages/__tests__/memory.spec.ts` | Try baseline targeted frontend tests | Failed before tests because dedicated worktree lacks `autobyteus-web/node_modules`; shell reported `cross-env: command not found` and pnpm warned local package exists but node_modules missing. | Implementation/validation should install or use project dependency setup before rerun. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `/memory` route renders `MemoryHome` by default; sidebar navigation separately highlights `Memory`.
- Current Memory Home flow: `pages/memory.vue -> MemoryHome.vue -> memoryExplorerStore.fetchAgents/fetchTeams -> memory cards`.
- Current agent detail flow: `pages/memory.vue -> AgentMemoryDetail.vue -> memoryExplorerStore.agentRuns` with run selection emitting `inspectRun` back to page shell.
- Current team detail flow: `pages/memory.vue -> AgentTeamMemoryDetail.vue -> memoryExplorerStore.teamRuns` with member selection emitting `inspectMember` back to page shell.
- Ownership or boundary observations: Existing components own presentation only. Store owns list state/search/page actions. Backend owns memory grouping. The requested change does not cross these boundaries.
- Current behavior summary: The UI contains redundant page/subject hierarchy: Home title repeats selected nav, detail summary cards repeat selected subject while the actual list has a generic title.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): No Design Issue Found
- Refactor posture evidence summary: Existing owner and data boundaries are healthy. This is a local presentation hierarchy issue in three Vue components. No backend/state refactor required.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshots | Header summary duplicates selected agent identity and occupies large vertical space. | Local UI hierarchy cleanup is appropriate. | Implement compact detail heading. |
| `AgentMemoryDetail.vue` | Summary block and list header are in one component. | No cross-boundary change needed. | Modify local template and remove unused computed metadata if applicable. |
| `AgentTeamMemoryDetail.vue` | Same summary pattern exists for teams. | Apply consistent compact detail pattern rather than leaving asymmetric UI. | Modify local template. |
| `MemoryHome.vue` | Top title/subtitle are hardcoded in component. | Removing them is localized and safe. | Modify local template. |
| `memoryExplorerStore.ts` | Selected display names already available. | No API or state model change needed. | No. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/memory/MemoryHome.vue` | Presents Memory Home tabs/search/cards | Renders redundant page-level `Memory` title/subtitle before functional card. | Remove top header; keep browser section as primary content. |
| `autobyteus-web/components/memory/AgentMemoryDetail.vue` | Presents selected agent run list and emits run inspection | Renders large summary card and generic `Runs` heading. | Remove summary card; render `agentName` as list-card heading. |
| `autobyteus-web/components/memory/AgentTeamMemoryDetail.vue` | Presents selected team run/member list and emits member inspection | Renders large summary card and generic `Runs` heading. | Remove summary card; render `teamName` as list-card heading. |
| `autobyteus-web/stores/memoryExplorerStore.ts` | Owns Memory Home/detail list state and selected summaries | Already exposes selected agent/team names and list totals. | Reuse existing state; no store changes except possible removal of no-longer-used metadata computed from components. |
| `autobyteus-web/pages/memory.vue` | Query-driven Memory page shell | Routes to same components; inspector identity is independent of visible headings. | No route behavior change. |
| `autobyteus-web/localization/messages/*/memory.generated.ts` | Memory UI localized strings | Generic detail labels may become unused. | Update/remove keys according to repository localization conventions. |
| `autobyteus-web/components/memory/__tests__/*.spec.ts` | Durable component coverage | Tests need compact-heading assertions. | Update tests. |
| `autobyteus-web/pages/__tests__/memory.spec.ts` | Page shell behavior coverage | Can assert Home no longer repeats `Memory` heading if mounted fully. | Update/add assertion. |
| `autobyteus-web/docs/memory.md` | Durable Memory feature documentation | Detail docs mention `Runs` heading. | Update docs in delivery/docs sync or implementation if local convention includes docs with UI changes. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-20 | Test | `pnpm -C autobyteus-web test:nuxt --run components/memory/__tests__/AgentMemoryDetail.spec.ts components/memory/__tests__/AgentTeamMemoryDetail.spec.ts pages/__tests__/memory.spec.ts` | Did not execute tests; `cross-env` missing because `autobyteus-web/node_modules` absent in dedicated worktree. | Downstream validation must prepare dependencies before relying on test results. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Not applicable.
- Version / tag / commit / freshness: Not applicable.
- Relevant contract, behavior, or constraint learned: Not applicable.
- Why it matters: This is an internal UI cleanup.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing frontend unit/component test setup with Pinia mocks should cover this change after dependencies are installed.
- Required config, feature flags, env vars, or accounts: `NUXT_TEST=true` through existing `test:nuxt` script.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation as recorded above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- The UI simplification can be implemented without backend changes.
- The selected subject names already exist as `agentName` and `teamName` computed values in the detail components.
- `agentStableId` becomes unnecessary if the old summary metadata is removed from `AgentMemoryDetail.vue`.
- The old detail localization keys for `agent`, `agent_team`, and `runs` should not remain referenced by the compact templates.
- `autobyteus-web/docs/memory.md` should stop saying detail pages use a `Runs` heading.

## Constraints / Dependencies / Compatibility Facts

- No compatibility wrapper or dual UI should be kept for the removed headings.
- Existing route query and store action contracts should remain unchanged.
- Worktree dependencies are not installed; implementation/validation should account for that.

## Open Unknowns / Risks

- Exact localization generation workflow for `*.generated.ts` files should be respected by the implementer.
- If product later wants run count/ID visible on detail pages, it should be reintroduced compactly, not as a new large summary block.

## Notes For Architect Reviewer

This is a local presentation cleanup. The only design judgment likely worth reviewing is whether applying the compact detail pattern to team detail is acceptable. Recommendation: yes, because the same redundant top-card pattern exists there and a one-sided agent-only change would leave inconsistent Memory detail hierarchy.
