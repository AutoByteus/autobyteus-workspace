# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass handoff for Token tab Team usage responsive table/scroll validation.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a presentation-only change inside the Token tab Team usage comparison. The Team section must render one stable table-style layout at all widths with these columns in order: Member, Gross Input, Output, Total Tokens, Cost. At constrained widths, the old stacked/card row behavior must not return; only the Team table region should scroll horizontally, keeping the rest of the Token tab vertically usable. Existing token/cost data, formatter semantics, status labels, team total placement, focused-row affordance, and missing/loading/unavailable/no-usage row states must be preserved. Upstream artifacts explicitly keep store, composable, GraphQL/API, backend, accounting, and summary-calculation boundaries out of scope.

The implementation handoff's Legacy / Compatibility Removal Check was reviewed. It reports no backward-compatibility mechanism, no retained old narrow-card behavior, and removal of obsolete card/list selectors and behavior-switch CSS. Source inspection matches that: `TeamTokenUsageSummary.vue` now has one semantic `<table>` inside `data-test="team-token-table-scroll"`, and the legacy hidden header / per-row metric-label / container-query card branch is absent.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team member usage layout in Token tab | Changed | REQ-001 through REQ-004; design intended change; implementation handoff "What Changed" | Validate semantic headers and stable column order through existing component coverage plus real browser layout probe. |
| Narrow stacked/card branch | Removed | Design Legacy Removal Policy; implementation handoff Legacy / Compatibility Removal Check; source inspection | Confirm no old card-only labels/branch in durable component coverage and browser output. |
| Scoped horizontal overflow | Added | REQ-003/REQ-004/AC-003; implementation `data-test="team-token-table-scroll"` | Browser probe must show wrapper scrolls horizontally while page/mock Token tab shell does not overflow horizontally. |
| Cost as last column with split detail | Preserved/Changed layout | REQ-002, REQ-004, AC-004 | Browser probe must scroll to the Cost column and confirm cost/status/detail text remains in the same row. |
| Focused/current member affordance | Preserved | REQ-005/AC-005; DS-002 | Existing component test and browser probe must confirm focused row identity/visual class/badge remain present. |
| Team total final row | Preserved | REQ-006/AC-006; implementation handoff | Existing component test and browser probe must confirm final table row. |
| Missing/loading/unavailable/no-usage row states | Preserved in table layout | REQ-007/AC-006; implementation handoff downstream hints | Browser probe should include no-summary rows and verify they occupy table rows with status cell spanning metric columns. |
| Token/cost source data and API/accounting boundaries | Preserved | REQ-008/REQ-009/AC-007/AC-009; code review report | No API/E2E backend coverage is needed for this presentation-only change; run focused component coverage to guard data display contract. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Mounts Token Usage Meter with team context; asserts team summary presence, table scroll hook, table hook, header order, focused row attributes, Cost as final data cell, no legacy per-row labels, and Team total as final row. | AC-001, AC-002, AC-004, AC-005, AC-006, AC-008; DS-001/DS-002/DS-003 | Still Valid | Source inspection shows updated assertions match current reviewed behavior and avoid JSDOM scrollbar physics. Code review already passed this durable coverage. | Run as final focused durable coverage. No post-review durable coverage edit planned. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Store token usage summaries, totals, and accounting state behavior. | AC-007/AC-009 only indirectly; implementation must not alter store/API accounting. | Out Of Scope | No store source changed; approved design forbids accounting/data-flow changes. | Do not run for this layout-specific API/E2E pass unless a data-flow regression is discovered. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/layout/__tests__/RightSideTabs.spec.ts` | Right-side tab mounting/navigation shell behavior. | DS-001 entry mount only; horizontal overflow is intentionally local to `TeamTokenUsageSummary.vue`. | Out Of Scope | `RightSideTabs.vue` unchanged; acceptance criteria target Team table region, not tab selection. | No action. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` and `/components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts` token header chip assertions | Workspace view token usage chip/header visibility. | Not part of Team table layout. | Out Of Scope | Search found no Team table scroll/layout assertions here. | No action. |
| Browser/E2E suite under `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/e2e` or Playwright config | Would be durable browser E2E layout coverage if present. | AC-003 and real-scrollbar residual risk. | Out Of Scope / Not Present | Repository search found no `autobyteus-web/e2e` directory and no Playwright app E2E config in the changed scope. | Use temporary executable browser probe only; do not introduce new durable E2E infrastructure for this local presentation change. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/components/agentInput/__tests__/AgentUserInputTextArea.focusedInterrupt.e2e.spec.ts` | Focused interrupt behavior for agent input. | Unrelated to Token tab Team usage. | Out Of Scope | Path/name and test scope are unrelated. | No action. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web/electron/shell/__tests__/workspace-shell-window.spec.ts` | Electron shell window behavior. | Unrelated to in-pane table overflow. | Out Of Scope | Electron shell not changed; no Token table assertions. | No action. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None found during this API/E2E investigation. | N/A | The stale narrow-card expectations were already updated in the reviewed component spec before this handoff. | Code review report confirms no old card/list assertions remain. | Existing focused component spec now asserts semantic table/header/scroll hooks. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None. | N/A | Existing colocated component coverage already guards the durable structure required by AC-008. | N/A | Adding a new repository-resident browser E2E harness would be disproportionate because no app E2E layout suite exists and the unresolved risk is real browser CSS measurement, not a new product workflow boundary. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None. | N/A | N/A | N/A | The code-review-passed component test already includes the required durable assertions. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None. | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| BROW-001 | Temporary Vite + Playwright browser probe mounting the actual `TeamTokenUsageSummary.vue` SFC with representative rows inside a constrained mock Token tab shell. | At 420px viewport / 360px table container, `data-test="team-token-table-scroll"` has horizontal overflow, the semantic table remains wider than its wrapper, and the document/mock shell does not become the horizontal scroller. | This is a focused one-off browser/CSS measurement. Durable structure is already covered by component tests; repository has no existing app browser E2E layout harness to extend. |
| BROW-002 | Same temporary browser probe, programmatically scroll the Team table wrapper to the right edge. | Cost is the last column, cost/status/input-output split stays associated with the correct member row after horizontal scroll, and focused row affordance remains present. | Same as above; real layout evidence is useful for this delivery but not worth committing bespoke harness infrastructure. |
| BROW-003 | Same temporary browser probe with rows for loading, unavailable, no-usage, missing/partial price, local/no-bill, mixed, zero usage, and Team total. | Non-happy-path row states remain table rows/cells and Team total remains final row. | Durable component tests cover representative structural states; this browser probe captures real CSS/layout behavior for this task only. |
| TEST-001 | `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` from `autobyteus-web`. | Existing durable component coverage remains passing after code review and before delivery. | This is final execution of existing durable coverage, not new durable coverage. |
| STATIC-001 | `git diff --check` from repository worktree root. | No whitespace errors in implementation and artifacts. | Standard executable hygiene check. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full live application Token tab with real backend/team run hydration | The approved change is presentation-only, no backend/API/data-flow boundary changed, and no existing browser E2E app harness/login/seed flow was found. | Low for this task because source and durable component coverage exercise the same component with realistic rows; API/accounting surfaces are unchanged. | None for API/E2E. Delivery should still update docs after integrated-state refresh. |
| Native Electron packaged rendering | The issue is web/CSS table overflow in the Nuxt component; Electron packaging/window lifecycle is not changed. | Low. Chromium rendering in Playwright covers the relevant CSS engine class. | None. |
| Mac overlay scrollbar visual chrome | Overlay scrollbar visibility can be OS/user setting dependent in headless browser. | Low-medium discoverability risk, already called out upstream. | Browser probe verifies scrollability/reachability rather than relying on visible scrollbar paint. No reroute unless cost column unreachable. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before execution. | N/A | Requirements/design explicitly define table columns, scoped overflow, and no data-boundary changes. Code review found no implementation findings. | N/A |

## Execution Plan

1. Run final focused durable component coverage: `pnpm test:nuxt --run components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/autobyteus-web`.
2. Run `git diff --check` from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll`.
3. Run a temporary Vite + Playwright browser probe outside repository-resident source changes. The probe will import the actual `TeamTokenUsageSummary.vue`, mount representative rows at constrained width, measure wrapper/table/document scroll geometry, scroll the wrapper to the Cost column, verify row/cost/focus/state associations, capture screenshots to the ticket artifact folder, and remove temporary scaffolding afterward.
4. Write `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-table-scroll/tickets/in-progress/token-meter-team-table-scroll/api-e2e-execution-coverage-report.md` with command outcomes and browser evidence.
5. If execution passes and no repository-resident durable coverage changed after code review, hand off the cumulative package to `delivery_engineer`. If any durable coverage code changes become necessary, route back through `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is current and code-review-passed. The remaining risk is real browser horizontal scrolling/reachability, best handled with a temporary executable browser probe plus final focused component test execution.
