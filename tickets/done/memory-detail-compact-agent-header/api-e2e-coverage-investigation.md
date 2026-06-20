# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/memory-detail-compact-agent-header/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/memory-detail-compact-agent-header/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/memory-detail-compact-agent-header/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/memory-detail-compact-agent-header/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/memory-detail-compact-agent-header/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/memory-detail-compact-agent-header/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass for Memory UI compact-header cleanup; API/E2E coverage investigation requested.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a frontend presentation cleanup of the Memory UI. Memory Home must start with the functional Agents / Agent Teams tab, search, cards, states, and pagination panel without a visible repeated `Memory` page title or `Inspect stored agent and team memories.` subtitle. Agent detail and team detail pages must remove the standalone subject summary cards that showed type labels, selected subject names, run counts, and `ID:` metadata; the selected agent/team name must become the primary heading inside the run-list card where the generic `Runs` heading previously appeared. Search placeholders, cards, badges, pagination, retry, empty/loading/error states, and inspector routing must remain unchanged. Store APIs, route query shape, GraphQL contracts, backend memory grouping, and inspector payload identity are explicitly out of implementation scope and must remain unchanged.

The implementation handoff's Legacy / Compatibility Removal Check states that no backward-compatibility mechanisms, old-behavior retention, flags, CSS-hidden blocks, wrappers, or alternate legacy headings were introduced. Direct source and grep inspection during this investigation matched that statement for the changed Memory components and localization keys.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Memory Home visible hierarchy | Removed / Preserved | FR-MEM-COMPACT-001/002/009, AC-MEM-COMPACT-001/002; design DS-COMPACT-001; implementation removed the top `<header>` from `MemoryHome.vue`. | Existing MemoryHome/page durable tests are valid and should prove no `h1`/subtitle while tabs/search/cards/pagination still work. |
| Agent detail summary card | Removed | FR-MEM-COMPACT-003/005/009, AC-MEM-COMPACT-003/005; design DS-COMPACT-002; implementation deleted summary `<header>` and `agentStableId`. | Existing agent detail durable test is valid and should prove no summary header/type label/`ID:`/standalone count. |
| Agent detail list heading | Changed | FR-MEM-COMPACT-004, AC-MEM-COMPACT-004; design says selected agent name replaces generic `Runs`. | Existing agent detail durable test is valid and should assert `section h1` is `Codex` and generic visible `Runs` is absent. |
| Team detail summary card | Removed | FR-MEM-COMPACT-006/009, AC-MEM-COMPACT-007; design DS-COMPACT-003. | Existing team detail durable test is valid and should prove no summary header/type label/`ID:`/standalone count. |
| Team detail list heading | Changed | FR-MEM-COMPACT-007, AC-MEM-COMPACT-007; design says selected team name replaces generic `Runs`. | Existing team detail durable test is valid and should assert `section h1` is selected team name and generic visible `Runs` is absent. |
| Search, pagination, retry, run/member inspect routing | Preserved | FR-MEM-COMPACT-002/005/008, AC-MEM-COMPACT-002/006/008; design DS-COMPACT-004; page/store APIs unchanged. | Execute durable component/page/store tests that cover search calls, page calls, selection, inspector target identity, and mocked Apollo fetch/error boundaries. |
| Memory localization keys for removed visible copy | Removed / Changed | FR-MEM-COMPACT-010, AC-MEM-COMPACT-009; implementation removed obsolete detail/home keys and retargeted the zh-CN glossary assertion to `search_runs`. | Execute targeted localization assertion and boundary/audit guards; full broad glossary sweep remains known unrelated pre-existing failure per handoff/review. |
| Sidebar Memory selection context | Preserved | AC-MEM-COMPACT-001; design explicitly says global shell navigation labels are out of scope. `useShellPrimaryNavigation.ts` still defines the `memory` item, `/memory` route, and `/memory` active predicate. | Use a temporary static executable probe only; no durable shell-nav coverage change is required because shell navigation was not modified by this task. |
| Browser-only visual E2E harness | Preserved absent | Repo inspection found Nuxt/Vitest component/page/integration coverage but no Playwright/Cypress browser E2E configuration for this Memory UI. | Do not invent a broad browser harness for this presentation-only change; use current durable Nuxt component/page executable coverage plus targeted temporary static probes. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/__tests__/MemoryHome.spec.ts` | Mounts Memory Home with agent data; asserts no visible top `h1`, no `Memory` duplicate, no removed subtitle, concise tab/search copy, card rendering, and emits `selectAgent`; second test checks concise Agent Teams tab copy and `setHomeTab`. | FR-MEM-COMPACT-001/002/009; AC-MEM-COMPACT-001/002/009; DS-COMPACT-001/004. | Still Valid | Current test already reflects the reviewed compact Home behavior and preserved selection/tab flow. | Retain and execute in final targeted Nuxt run. |
| `autobyteus-web/components/memory/__tests__/AgentMemoryDetail.spec.ts` | Mounts agent detail for `Codex`; asserts no summary `<header>`, selected agent heading, no `Agent`, `ID:`, generic visible `Runs`, standalone count, stale title text; asserts search calls `setAgentRunsSearch` and run click emits `inspectRun`. | FR-MEM-COMPACT-003/004/005/009; AC-MEM-COMPACT-003/004/005/006/009; DS-COMPACT-002/004. | Still Valid | Current assertions match the compact detail hierarchy and preserved search/inspect behavior. | Retain and execute in final targeted Nuxt run. |
| `autobyteus-web/components/memory/__tests__/AgentTeamMemoryDetail.spec.ts` | Mounts team detail; asserts no summary `<header>`, selected team heading, no `Agent Team`, `ID:`, generic visible `Runs`, standalone count, stale title text; asserts preserved search and member inspect event. | FR-MEM-COMPACT-006/007/008/009; AC-MEM-COMPACT-007/008/009; DS-COMPACT-003/004. | Still Valid | Current assertions match the compact team detail hierarchy and preserved search/member flow. | Retain and execute in final targeted Nuxt run. |
| `autobyteus-web/pages/__tests__/memory.spec.ts` | Exercises page shell route sync, home fetch, home tab route query, selection routing, concise inspector back label, real mounted Memory Home search/pagination/card routing, agent inspect route payload, and team member inspect route payload. | FR-MEM-COMPACT-002/005/008; AC-MEM-COMPACT-002/006/008/009; DS-COMPACT-004. | Still Valid | Current page tests now include absent home heading/subtitle and still cover route/query/inspector preservation. | Retain and execute in final targeted Nuxt run. |
| `autobyteus-web/tests/stores/memoryExplorerStore.test.ts` | Mocked Apollo API boundary tests for agent catalog fetch, selected agent run fetch, and team-run error handling preserving prior entries. | Out-of-scope API/store changes remain preserved; FR-MEM-COMPACT-002/005/008 and design say store/API contracts unchanged. | Still Valid | Store code is unchanged; these tests remain useful proof that the UI cleanup did not require store/API changes and that mocked GraphQL list flows remain sound. | Execute as additional boundary validation. |
| `autobyteus-web/tests/stores/memoryInspectorStore.test.ts` | Mocked memory-view API boundary tests for agent run inspect, raw trace refetch, and team member memory identity. | Inspector routing/payload remains unchanged under FR-MEM-COMPACT-005/008 and AC-MEM-COMPACT-006/008. | Still Valid | Store code is unchanged, but page tests route into this store; this adds API-boundary evidence for unchanged inspector behavior. | Execute as additional boundary validation. |
| `autobyteus-web/components/memory/__tests__/MemoryInspector.spec.ts` | Memory Inspector empty state/header, raw-trace tab action, and team breadcrumb context. | Inspector display is adjacent to unchanged inspect/back behavior; not directly changed by compact headers. | Still Valid | No compact-header-specific assertion needed, but it is valid adjacent coverage for unchanged inspector surface. | Execute with the Memory component suite. |
| `autobyteus-web/components/memory/__tests__/WorkingContextTab.spec.ts`, `EpisodicTab.spec.ts`, `SemanticTab.spec.ts`, `RawTracesTab.spec.ts` | Inspector tab empty/action coverage. | Inspector content tabs are not changed by this task. | Out Of Scope | These files do not assert compact Home/detail hierarchy or route behavior. Running them as part of the Memory component suite is safe but not required for coverage sufficiency. | Execute with the Memory component suite for broad Memory smoke; no changes. |
| `autobyteus-web/localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts` targeted shared terminology test | Asserts current zh-CN terminology; implementation retargeted Memory assertion from removed `AgentTeamMemoryDetail.runs` to retained `AgentTeamMemoryDetail.search_runs`. | FR-MEM-COMPACT-010; AC-MEM-COMPACT-009; localization cleanup. | Still Valid | The targeted assertion validates the retained Memory run-search wording after obsolete generic heading keys were removed. | Execute the targeted test name only; do not treat the known unrelated broad deprecated-glossary failure as current-task failure. |
| `autobyteus-web/components/__tests__/AppLeftPanel.spec.ts` and `autobyteus-web/composables/useShellPrimaryNavigation.ts` | Static shell nav ownership tests and source owner for primary navigation. Existing tests do not specifically assert Memory selection. Source defines `memory` nav item, `/memory` route, and active predicate. | AC-MEM-COMPACT-001 sidebar context; design says shell nav labels out of scope. | Still Valid for shell-nav ownership; compact-header-specific Memory assertion not required. | Shell navigation source is unchanged and still contains Memory selection behavior. | Use temporary static probe to confirm Memory item/route/active predicate; no durable update. |
| Browser E2E files/config for Memory UI | No repository-resident Playwright/Cypress Memory browser E2E found. | Potential browser-level rendering confirmation. | Out Of Scope | Repo uses Nuxt/Vitest component/page mounting with happy-dom for this frontend surface; no existing browser E2E harness exists to update. | No durable E2E addition; record as not present and rely on existing executable surfaces. |

## Stale Or Obsolete Coverage Decisions

No stale or obsolete repository-resident coverage remains in the current reviewed state. The obsolete old-heading assertions that existed before implementation were already updated before code review. Investigation grep over changed Memory components/pages/docs/localization paths found only negative test assertions mentioning stale phrases such as `Codex Memory` / `Software Team Memory`; no current durable test asserts the removed visible title, summary cards, `ID:` summary line, or generic detail `Runs` heading.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | N/A |

## Durable Coverage To Add

No additional repository-resident durable coverage is planned in the API/E2E stage. Current durable Memory Home/detail/page/store/localization tests already cover the compact UI contract and preserved behavior at the appropriate frontend and mocked API boundaries. Adding a new browser E2E harness solely for this presentation-only task would be broader than the reviewed change and existing repository test strategy.

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A |

## Durable Coverage To Update

No API/E2E-stage durable coverage updates are planned. Implementation already updated the relevant durable tests before code review, and the current versions are valid.

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A |

## Durable Coverage To Remove

No API/E2E-stage durable coverage removals are planned.

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-MEM-STATIC-001 | `rg` scan over changed Memory components/tests/pages/docs/localization for removed keys, stale title phrases, summary-card `ID:` text, `agentStableId`, and summary total patterns. | No old visible-copy path or compatibility-only hidden summary path remains in changed scope. | A grep is task-specific evidence; durable negative assertions already exist in component/page tests. |
| TEMP-MEM-SHELL-001 | Static source probe over `autobyteus-web/composables/useShellPrimaryNavigation.ts` for the `memory` item, `/memory` route, and `/memory` active predicate. | Sidebar Memory selection context remains present without changing shell navigation. | Shell navigation was not modified; adding Memory-specific shell tests during API/E2E would broaden durable coverage beyond this compact-header cleanup. |
| TEMP-MEM-DIFF-001 | `git diff --check` and final status review. | Patch has no whitespace errors and no unexpected API/E2E-stage durable coverage edits. | Standard validation evidence; not a repository-resident test. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live browser with real backend Memory records | This task changes presentation only, does not alter GraphQL/backend contracts, and the repository does not provide a Memory-specific Playwright/Cypress harness; setting up real stored memory records would be disproportionate to the reviewed scope. | Low; durable Nuxt component/page tests cover rendered DOM, search/pagination events, route query payloads, and mocked API-store boundaries. | None. Future broad Memory browser E2E can be considered separately if the project adopts such a harness. |
| Full broad `zhCnGlossaryConsistency.spec.ts` | Upstream review records a known unrelated pre-existing deprecated-glossary failure in unchanged settings/skills zh-CN strings containing `代理`. | Low for this task; Memory-specific glossary assertion and localization guards/audit are in scope. | Do not block this ticket on the unrelated glossary debt; leave to the owning localization cleanup. |

## Ambiguities Or Reroute Triggers

No ambiguity, local-fix defect, design impact, requirement gap, compatibility wrapper, legacy branch, dual-path behavior, or stale required coverage was found during investigation.

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | N/A | N/A |

## Execution Plan

1. Execute the valid durable Memory UI/page/store coverage:
   - `pnpm -C autobyteus-web test:nuxt --run components/memory/__tests__/MemoryHome.spec.ts components/memory/__tests__/AgentMemoryDetail.spec.ts components/memory/__tests__/AgentTeamMemoryDetail.spec.ts pages/__tests__/memory.spec.ts tests/stores/memoryExplorerStore.test.ts tests/stores/memoryInspectorStore.test.ts components/memory/__tests__/MemoryInspector.spec.ts components/memory/__tests__/WorkingContextTab.spec.ts components/memory/__tests__/EpisodicTab.spec.ts components/memory/__tests__/SemanticTab.spec.ts components/memory/__tests__/RawTracesTab.spec.ts`
2. Execute the targeted Memory glossary assertion:
   - `pnpm -C autobyteus-web test:nuxt --run localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts -t "keeps shared agent and team terminology"`
3. Execute localization/static guards relevant to the changed localization catalog:
   - `pnpm guard:web-boundary`
   - `pnpm guard:localization-boundary`
   - `pnpm audit:localization-literals`
4. Execute temporary probes:
   - stale-copy/static compatibility grep over changed Memory components/pages/docs/localization files.
   - shell Memory nav static source probe for preserved `/memory` active state.
   - `git diff --check`.
5. Write the canonical execution coverage report and hand off according to the result. Since no API/E2E-stage repository-resident durable coverage edits/removals are planned, a pass should route directly to `delivery_engineer` with the cumulative package.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Coverage investigation completed before final execution and before any API/E2E-stage durable coverage change. Current reviewed durable coverage is sufficient for this presentation-only Memory UI cleanup; no stale coverage remains in the reviewed state.
