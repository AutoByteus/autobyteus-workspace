# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/memory-page-ui-cleanup/tickets/done/memory-page-ui-cleanup/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/memory-page-ui-cleanup/tickets/done/memory-page-ui-cleanup/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/.codex/worktrees/memory-page-ui-cleanup/tickets/done/memory-page-ui-cleanup/design-spec.md`
- Design Review Report: `/home/autobyteus/workspace/.codex/worktrees/memory-page-ui-cleanup/tickets/done/memory-page-ui-cleanup/design-review-report.md`
- Implementation Handoff: `/home/autobyteus/workspace/.codex/worktrees/memory-page-ui-cleanup/tickets/done/memory-page-ui-cleanup/implementation-handoff.md`
- Code Review Report: `/home/autobyteus/workspace/.codex/worktrees/memory-page-ui-cleanup/tickets/done/memory-page-ui-cleanup/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass handoff to API/E2E for Memory page UI cleanup, with residual risks around real Memory Home/detail/inspector navigation, route-query preservation, search/pagination, memory badges/actions, and raw-trace access.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved change is a frontend-only Memory page UI copy cleanup. The current behavior to prove is:

- Memory Home uses concise `Agents` / `Agent Teams` tabs and active-subject search placeholders without `with Memory` / `with memory`.
- Home cards preserve subject identity, IDs, run counts, latest-update information, member counts, memory badges, card actions, search, and pagination while removing `Latest memory:` and `members with memory` phrasing.
- Agent and team detail pages preserve selected subject identity, route-driven fetch state, run/member identities, workspace paths, updated timestamps, memory badges/actions, search, pagination, and inspect actions while removing redundant detail/title/list/card labels.
- Inspector preserves memory payload tab access, raw-trace lazy-load action, route-driven target context, and back navigation while rendering `Memory Inspector` once and subject back labels without redundant `Memory` wording.
- English and zh-CN Memory localization resources use concise current semantics; old redundant active UI copy is not kept behind compatibility paths.
- No backend, GraphQL, Pinia store, data model, route-query schema, raw-trace loading, or memory persistence behavior is intentionally changed.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, no old behavior was retained in active scope, obsolete Memory translation keys/usages were removed/replaced, and no store/API/route compatibility path was added. Code review confirmed the implementation stays within Memory presentation/page/localization/test owners and found no compatibility wrappers, feature flags, old/new dual labels, backend changes, GraphQL changes, store changes, route-query changes, or raw-trace contract changes.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Memory Home tab labels | Changed | REQ-MEMORY-UI-001, AC-MEMORY-UI-001; design intended change; implementation handoff `What Changed` | Existing component coverage remains valid after assertion updates; add page-level interaction coverage to prove real child tab action still routes through page shell. |
| Memory Home search placeholders and search action | Changed / Preserved | REQ-MEMORY-UI-002, AC-MEMORY-UI-002, AC-MEMORY-UI-010 | Existing component assertion covers placeholder; add page-level integration to prove real `MemoryHome` search emits/calls store action. |
| Memory Home card metadata | Changed / Preserved | REQ-MEMORY-UI-003, AC-MEMORY-UI-003, AC-MEMORY-UI-010 | Existing component coverage is still valid; page-level integration should also verify card click routing remains intact. |
| Home pagination | Preserved | Out of scope states pagination unchanged; AC-MEMORY-UI-010 | Existing durable coverage does not directly prove the real page child pagination action; add focused page integration assertion. |
| Agent detail header/list/card copy | Changed / Preserved | REQ-MEMORY-UI-004/005, AC-MEMORY-UI-004/006/007 | Existing component coverage is still valid; add page-level integration assertion that real detail card action builds the same inspector route query with workspace/timestamp. |
| Team detail header/list/member copy | Changed / Preserved | REQ-MEMORY-UI-004/005, AC-MEMORY-UI-005/006/007/008 | Existing component coverage is still valid; add page-level integration assertion that real member action builds the same team-inspector route query. |
| Inspector single header/back label | Changed / Preserved | REQ-MEMORY-UI-006, AC-MEMORY-UI-009 | Existing `MemoryInspector` and page tests are still valid; run them in final execution. |
| Raw trace tab access | Preserved | Out of scope and AC-MEMORY-UI-010; implementation/code review says store/query/raw-trace contract unchanged | Existing `MemoryInspector`, `RawTracesTab`, and `memoryInspectorStore` coverage are still valid; run them in final execution. No durable edit needed for raw traces. |
| GraphQL/store/data contracts | Preserved | REQ-MEMORY-UI-008, design `No backend, GraphQL, Pinia store...`, code review | Existing store tests are still valid; run relevant store tests to prove API variables and raw trace include flag remain intact. |
| Old visible copy and stale key semantics | Removed | REQ-MEMORY-UI-007/012; implementation handoff localization update; code review dead/obsolete cleanup | Existing updated negative assertions are still valid; run focused localization guards/audit and Memory tests. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/memory/__tests__/MemoryHome.spec.ts` | Renders concise agent catalog labels/placeholders, absence of old `with memory` / `Latest memory:` copy, emits agent selection, switches to teams tab. | REQ-MEMORY-UI-001/002/003/007, AC-MEMORY-UI-001/002/003/011/012 | Still Valid | Test was updated for approved concise copy; component owner remains unchanged. | Retain and execute. |
| `autobyteus-web/components/memory/__tests__/AgentMemoryDetail.spec.ts` | Renders selected agent title, concise runs/search copy, compact workspace/timestamp metadata, absence of old detail/`Workspace:`/`Updated:` copy, emits inspectRun. | REQ-MEMORY-UI-004/005/007, AC-MEMORY-UI-004/006/007/011 | Still Valid | Matches reviewed design and current implementation. | Retain and execute. |
| `autobyteus-web/components/memory/__tests__/AgentTeamMemoryDetail.spec.ts` | Renders selected team title, concise runs/search/member copy, compact metadata, absence of old team detail/member/metadata copy, emits inspectMember. | REQ-MEMORY-UI-004/005/007, AC-MEMORY-UI-005/006/007/008/011 | Still Valid | Matches reviewed design and current implementation. | Retain and execute. |
| `autobyteus-web/components/memory/__tests__/MemoryInspector.spec.ts` | Empty state, single `Memory Inspector` header, raw-traces tab action delegates to store, team breadcrumb context. | REQ-MEMORY-UI-006, AC-MEMORY-UI-009/010/011 | Still Valid | Inspector copy and raw-trace tab action remain in scope. | Retain and execute. |
| `autobyteus-web/components/memory/__tests__/RawTracesTab.spec.ts` | Raw trace limit apply emits `updateLimit`. | AC-MEMORY-UI-010 raw-trace access preservation | Still Valid | RawTracesTab unchanged but directly relevant to residual raw-trace action risk. | Retain and execute. |
| `autobyteus-web/components/memory/__tests__/WorkingContextTab.spec.ts`, `EpisodicTab.spec.ts`, `SemanticTab.spec.ts` | Payload tab rendering behavior. | AC-MEMORY-UI-010 memory payload access preservation | Still Valid | Tabs unchanged; relevant as inspector payload surface smoke. | Retain and execute as part of focused Memory component suite. |
| `autobyteus-web/pages/__tests__/memory.spec.ts` existing shallow scenarios | Home mount fetches agents, home-to-agent route query, home tab route query, concise inspector back label. | REQ-MEMORY-UI-006/008, AC-MEMORY-UI-009/010/011 | Needs Update | Existing tests are valid but shallow; they do not prove real `MemoryHome`/detail child interactions, search, pagination, badges, or inspector routes. | Extend this file with focused durable page integration scenarios. |
| `autobyteus-web/tests/stores/memoryExplorerStore.test.ts` | BFF list fetch populates memory catalog, selected-agent run fetch variables, team-run error preservation. | REQ-MEMORY-UI-008, AC-MEMORY-UI-010 | Still Valid | Store/API contract intentionally preserved; test proves representative GraphQL variables and state. | Retain and execute. |
| `autobyteus-web/tests/stores/memoryInspectorStore.test.ts` | Inspector fetches agent/team memory views, raw traces disabled by default, raw tab enables raw trace include flag. | REQ-MEMORY-UI-008, AC-MEMORY-UI-010 raw-trace access | Still Valid | Store/raw-trace contract intentionally preserved; no implementation changes. | Retain and execute. |
| `autobyteus-web/localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts` targeted shared-agent scenario | Confirms Memory zh-CN copy remains glossary-consistent for shared agent terminology. | REQ-MEMORY-UI-007/012, AC-MEMORY-UI-012 | Still Valid | Implementation and code review note targeted Memory assertion passes; full suite has unrelated pre-existing settings failure. | Execute targeted `-t "keeps shared agent"`; do not treat unrelated full-suite settings failure as this task's defect. |
| `autobyteus-web/graphql/queries/__tests__/*` | GraphQL document validation outside Memory UI scope. | REQ-MEMORY-UI-008 by preservation only | Out Of Scope | No GraphQL documents changed; store tests cover relevant call variables. | No final execution required for this frontend copy cleanup. |
| `autobyteus-web/docs/memory.md` | Durable docs still describe old labels. | Design delivery docs deferral; code review docs-impact verdict | Out Of Scope for API/E2E | Delivery owns docs sync after API/E2E confirms final UI state. | Do not edit in API/E2E stage. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale coverage remains after implementation-updated Memory component/page/localization tests; old-label assertions now appear only as negative assertions. | Code review found old active UI/localization copy semantics removed rather than retained. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| MEM-E2E-001 | Real `MemoryHome` child interactions through the page shell: search calls the active catalog action, pagination calls page change, agent card click preserves detail route query. | AC-MEMORY-UI-010; code-review residual risk for real navigation, route-query preservation, search/pagination, memory badges/actions. | Extend `autobyteus-web/pages/__tests__/memory.spec.ts` using full `mount` with real child components and Pinia state. | Existing shallow page tests prove emitted events only at component boundary; durable coverage should prove the actual child UI actions still flow through the page shell after the copy cleanup. |
| MEM-E2E-002 | Real agent detail child action through the page shell: visible memory badges remain and run click builds agent-inspector route query with run ID, subject, workspace, and updated timestamp. | AC-MEMORY-UI-007/010; residual risk for detail navigation, badges/actions, route-query preservation. | Extend `autobyteus-web/pages/__tests__/memory.spec.ts`. | Existing component and shallow page tests are valid separately but do not cover the integrated detail-card action and route query. |
| MEM-E2E-003 | Real team detail member action through the page shell: visible memory badges/member target remain and member click builds team-inspector route query with team/member identity and updated timestamp. | AC-MEMORY-UI-008/010; residual risk for team detail navigation, badges/actions, route-query preservation. | Extend `autobyteus-web/pages/__tests__/memory.spec.ts`. | Existing component and shallow page tests are valid separately but do not cover the integrated team member action and route query. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| MEM-E2E-001..003 | `autobyteus-web/pages/__tests__/memory.spec.ts` | Add focused full-mount page integration scenarios while preserving existing shallow route/back-label assertions. | AC-MEMORY-UI-010 and code-review residual risks. | This is a durable coverage update after initial code review and must return through code review before delivery. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No durable coverage should be removed. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| MEM-PROBE-001 | `grep`/static search over active Memory components/page/localization for old redundant strings and stale key semantics, excluding historical docs and negative test assertions. | Confirms no active old visible UI copy/key semantics remain in implementation scope. | Static search output is task evidence; component/localization tests are the durable guard. |
| MEM-PROBE-002 | Run focused Nuxt/Vitest Memory component/page/store tests in happy-dom with mocked Apollo and Pinia state. | Exercises browser-like component/page behavior and API-store query variables without requiring a live backend. | The durable coverage lives in the test files; the command output is execution evidence, not a new artifact. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live browser session against a real seeded backend | Repository has no Playwright/Cypress E2E harness for Memory, and this copy-only change does not alter backend/API/store contracts. Nuxt/Vitest component/page/store execution can reasonably prove the changed boundary with deterministic mocked Apollo data. | Low to medium: visual layout in a real browser is not screenshotted here, but assertions cover copy, route, metadata, badges, and actions. | Delivery may perform manual smoke if desired after docs sync; no blocker for this stage. |
| Full `zhCnGlossaryConsistency.spec.ts` suite | Implementation and code review identify an unrelated pre-existing settings catalog deprecated term failure. | Low for this Memory ticket; targeted Memory glossary scenario passes. | Do not reroute this Memory ticket; track unrelated settings glossary cleanup separately if desired. |
| Durable docs update | Delivery owns `autobyteus-web/docs/memory.md` after API/E2E confirms final UI state. | Medium if delivery skips docs; code review already flagged docs impact. | Hand off docs-impact note to delivery after coverage/code review completes. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement gap, design impact, unclear behavior, compatibility wrapper, or implementation defect found during coverage investigation. | N/A |

## Execution Plan

1. Add the planned durable page integration assertions to `autobyteus-web/pages/__tests__/memory.spec.ts` for MEM-E2E-001 through MEM-E2E-003.
2. Run a static search probe for old active Memory strings/key semantics in active Memory components/page/localization, treating negative test assertions and docs as expected exclusions.
3. Execute focused Memory component/page/store/raw-trace/localization coverage:
   - `NUXT_TEST=true pnpm exec vitest run components/memory/__tests__ pages/__tests__/memory.spec.ts tests/stores/memoryExplorerStore.test.ts tests/stores/memoryInspectorStore.test.ts`
   - `NUXT_TEST=true pnpm exec vitest run localization/messages/__tests__/zhCnGlossaryConsistency.spec.ts -t "keeps shared agent"`
4. Execute localization guards/audit:
   - `pnpm guard:localization-boundary && pnpm audit:localization-literals`
5. Run `git diff --check` from the repository root.
6. Record final evidence in the API/E2E execution coverage report.
7. Because repository-resident durable coverage will be updated after initial code review, route the cumulative package plus coverage artifacts back to `code_reviewer` before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing coverage is mostly still valid, but page-level durable coverage needs a narrow update to cover the real child-to-page Memory navigation/search/pagination/inspector-routing boundary identified by code review as residual API/E2E risk. No stale tests should be removed and no implementation-side reroute is required.
