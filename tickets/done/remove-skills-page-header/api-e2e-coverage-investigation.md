# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skills-page-header/tickets/done/remove-skills-page-header/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skills-page-header/tickets/done/remove-skills-page-header/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skills-page-header/tickets/done/remove-skills-page-header/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skills-page-header/tickets/done/remove-skills-page-header/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skills-page-header/tickets/done/remove-skills-page-header/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skills-page-header/tickets/done/remove-skills-page-header/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review passed for the Skills page header simplification and requested API/E2E coverage investigation/execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The reviewed task is a local frontend cleanup for the Skills list page. The Skills list must begin with the existing toolbar controls instead of rendering a duplicate standalone `Skills` heading and subtitle above the toolbar. The toolbar must still expose search, `Sources`, `Reload`, and `Create Skill` in the same relative order; existing loading, error, empty, filtered-empty, card-grid, modal, reload, and detail-navigation behavior must remain unchanged. Store, GraphQL, backend, route contracts, Agents, and Agent Teams behavior are explicitly out of scope. The implementation handoff's `Legacy / Compatibility Removal Check` reports no compatibility mechanisms, no retained old behavior, and removal of dead header-only UI styles/keys.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Skills list top-of-content render starts with toolbar instead of page identity block | Changed | `REQ-001`, `REQ-002`, `REQ-005`, `AC-001`, `AC-002`; design DS-001; implementation handoff `What Changed` | Existing/new component coverage must assert no redundant main-content heading/subtitle and toolbar-first DOM; final execution should include focused test run and browser/UI smoke for visual spacing. |
| Standalone main-content `Skills` heading and subtitle are removed | Removed | Requirements `REQ-001`, `REQ-002`, `REQ-006`; design removal/decommission plan | Coverage must reject the old heading/subtitle copy and verify obsolete localization keys/classes are absent. |
| Toolbar controls and order remain search, `Sources`, `Reload`, `Create Skill` | Preserved | `REQ-003`, `AC-003`; design DS-003; implementation handoff | Existing `SkillsList.spec.ts` toolbar/reload assertions remain required and valid. |
| Skills list/card states and detail reset behavior remain below toolbar / unchanged | Preserved | `REQ-004`, `AC-004`, `AC-005`; design DS-001/DS-002; page test inventory | Existing component/page tests remain valid; no additional API coverage required because data operations are untouched. |
| Skill store, GraphQL/API, backend skill behavior | Preserved / Out of scope | Requirements `Out of Scope`, constraints; design ownership map; implementation handoff assumptions | No API or backend durable coverage additions are needed. Existing store tests are out of scope for this UI-only change beyond not being invalidated. |
| Agents / Agent Teams list pages | Preserved / Out of scope | `AC-007`; requirements out of scope | No sibling-page test updates or E2E work needed. |
| Header-only localization keys and header CSS/classes | Removed | `REQ-006`; implementation handoff key/class removal and code-review `rg` check | Final execution should repeat focused obsolete key/class search and localization guards. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/skills/SkillsList.spec.ts` — toolbar/no-header scenario | Asserts no `Skills` h2/header subtitle in the component, `.skills-toolbar` is the first root child, search placeholder exists, and toolbar button labels are `Sources`, `Reload`, `Create Skill` | `REQ-001`/`REQ-002`/`REQ-003`/`REQ-005`, `AC-001`/`AC-002`/`AC-003`/`AC-006`, design DS-001/DS-003 | Still Valid | Current implementation-added durable coverage directly maps to required removed and preserved UI behavior; code review passed this coverage. | Run in final focused Vitest command. No API/E2E-stage durable edit needed. |
| `autobyteus-web/components/skills/SkillsList.spec.ts` — reload success / reload disabled scenarios | Asserts toolbar reload invokes `skillStore.reloadSkillCatalog`, shows success feedback, and disables/shows loading text while reloading | `REQ-003`, `AC-003`, design DS-003 | Still Valid | Toolbar behavior must remain after header removal; the old header did not govern reload logic. | Run in final focused Vitest command. |
| `autobyteus-web/pages/__tests__/skills.spec.ts` | Asserts selected skill detail clears when refreshed list no longer contains it and returns to list behavior | `REQ-004`, `AC-005`, design `pages/skills.vue` boundary unchanged | Still Valid | Page-level list/detail contract remains required and unchanged. | Run in final focused Vitest command. |
| `autobyteus-web/stores/__tests__/skillStore.spec.ts` | Store/API operation behavior for skill fetch/reload/create/delete sources | Requirements explicitly preserve store/API/backend behavior and do not change it | Out Of Scope | No store, GraphQL, or backend files changed; toolbar component tests mock the store boundary for this UI cleanup. | Do not expand API/store execution for this task. Existing suite remains valid generally. |
| `autobyteus-web/components/skills/SkillSourcesModal.spec.ts` | Skill source dialog behavior | Toolbar `Sources` button remains present, but modal internals were not changed | Out Of Scope | The cleanup did not alter `SkillSourcesModal`; component test only needs to preserve access to the button. | No execution required for this scope. |
| `autobyteus-web/components/skills/SkillDetail.spec.ts` | Skill detail rendering and behavior | `AC-005` detail-navigation remains unchanged | Out Of Scope | Page-level detail reset test is sufficient for the unchanged boundary; `SkillDetail.vue` was not touched. | No execution required for this scope. |
| Repository browser/E2E suites | No dedicated Skills page browser E2E located; package exposes focused Vitest and Nuxt dev scripts, with no project Playwright/Cypress script for Skills | Visual spacing risk in requirements/design/code review | Replace / Use Temporary Executable Probe Only | A durable browser E2E suite does not currently exist for this page, and the requirement is a small visual cleanup already covered at component DOM level. A temporary browser smoke is better proportional proof for spacing. | Start local Nuxt app if feasible and perform temporary browser/UI smoke; do not add repository E2E coverage. |
| Localization guard/audit scripts (`guard:localization-boundary`, `audit:localization-literals`) | Enforce catalog-boundary/literal policy | `REQ-006`, localization constraints | Still Valid | Header-only keys were removed; guards validate catalog/literal hygiene remains intact. | Run in final execution. |
| `git diff --check` and obsolete key/class `rg` probe | Whitespace sanity and absence of old header classes/keys | `REQ-006`, design removal/decommission plan, legacy cleanup | Still Valid | Removal-oriented task requires confirming old UI policy is not retained. | Run in final execution as static executable checks. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No repository-resident durable coverage asserting the old standalone Skills header/subtitle was found in the relevant inventory. | `rg` and code review inventory show the new component test asserts absence; no stale old-header test remains. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | Existing implementation-added `SkillsList.spec.ts` coverage already supplies the required durable regression coverage and passed code review before this API/E2E stage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | No API/E2E-stage durable coverage update is required. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | N/A | No stale durable tests require removal. |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| UI-SMOKE-001 | Run the local Nuxt frontend from this task worktree and inspect `/skills` in a browser. If app dependencies are not present in the worktree, use temporary dependency symlinks to the sibling checkout, then remove them. If no real backend is available, emulate only the minimal `/rest/health` and `/graphql` Skills list responses required for this UI-only smoke. | `/skills` renders with the toolbar as the first visible list control, the old main-content `Skills` heading/subtitle are absent, toolbar controls are visible in order, and list/alert spacing is reasonable. | This is a proportional visual smoke for a small presentational cleanup. The durable DOM/control assertions already live in `SkillsList.spec.ts`; adding a new browser E2E suite for this isolated layout change would be broader test architecture work. |
| STATIC-001 | Run obsolete key/class search: `rg -n "skills-header|header-actions|header-left|SkillsList\.title|manage_and_create_file_based_capabilities" autobyteus-web/components/skills autobyteus-web/localization/messages -S || true` | Header-only classes/keys/copy are not retained in active component/catalog scope. | Static probe is execution evidence for this task; no new durable test needed because catalog guards plus component test cover the regression. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real backend GraphQL/API skill catalog behavior | Explicitly unchanged/out of scope; no store/API/backend files changed. | Low; UI component mocks the store boundary and store tests continue to own data behavior. | None. |
| Full packaged Electron app lifecycle | The change is a Nuxt renderer list layout cleanup; no Electron shell, lifecycle, installer, updater, migration, or native process behavior changed. | Low. | None. |
| Durable docs wording (`autobyteus-web/docs/skills.md`) | Delivery owns docs sync after integrated-state refresh. | Medium documentation accuracy risk if not updated. | Delivery should update/record the known “Skills list header” docs impact. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | Requirements/design/code review are clear; no stale-test ambiguity, compatibility behavior, or implementation defect identified during investigation. | N/A |

## Execution Plan

1. Run final focused durable coverage: `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/skills/SkillsList.spec.ts pages/__tests__/skills.spec.ts`.
2. Run localization/catalog checks: `pnpm --dir autobyteus-web guard:localization-boundary` and `pnpm --dir autobyteus-web audit:localization-literals`.
3. Run static cleanup checks: `git diff --check` and the obsolete header key/class `rg` probe.
4. Perform temporary browser/UI smoke against local `/skills` if Nuxt dev server can be started with available dependencies; when the backend is unavailable, use a minimal temporary backend emulator for the unchanged Skills-list API dependency, collect screenshot/evidence, and remove temporary dependency symlinks/scaffolding afterward.
5. Write the API/E2E execution coverage report. If no repository-resident durable coverage was added, updated, or removed during this API/E2E stage and all checks pass, hand the cumulative package to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is valid and sufficient for repository-resident regression protection. A temporary browser/UI smoke is warranted because upstream artifacts repeatedly call out visual spacing risk and no manual browser smoke has been performed yet. Investigation update before final reporting: the in-app Browser backend was unavailable in this environment, so execution used a local headless Chrome/Playwright-core probe with a minimal emulated backend dependency for unchanged `/rest/health` and Skills-list GraphQL responses.
