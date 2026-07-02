# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md`
- Investigation Notes: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/investigation-notes.md`
- Design Spec: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md`
- Solution / Design Re-entry Report 1: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report.md`
- Solution / Design Re-entry Report 2: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-2.md`
- Solution / Design Re-entry Report 3: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-3.md`
- Solution / Design Re-entry Report 4: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-4.md`
- Solution / Design Re-entry Report 5: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-5.md`
- Solution / Design Re-entry Report 6: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-6.md`
- Delivery User Verification Feedback 1: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback.md`
- Delivery User Verification Feedback 2: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-2.md`
- Delivery User Verification Feedback 3: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-3.md`
- Delivery User Verification Feedback 4: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-4.md`
- Delivery User Verification Feedback 5: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-5.md`
- Delivery User Verification Feedback 6: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-6.md`
- Delivery User Verification Feedback 7: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-7.md`
- Architecture Review Handoff: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/architecture-review-handoff.md`
- Design Review Report: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-review-report.md`
- Implementation Handoff: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/implementation-handoff.md`
- Code Review Report: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/code-review-report.md`
- Current Investigation Round: `8`
- Trigger: Code-review round 13 pass after delivery feedback 7 local visual-alignment fix. The latest local fix centers summary-card disclosure button labels using balanced three-column grids and centers Workspace `Existing` / `New` segment labels using full-width label spans with absolute icons.
- Prior Investigation Reviewed: `Round 7` at this canonical path. Prior API/E2E and delivery evidence is stale after the delivery-feedback-7 visual-alignment fix and is historical context only.
- Latest Authoritative Investigation: `Round 8 / this file`

## Current Requirement And Design Basis

The current requirements remain the sixth delivery-verification re-entry requirements plus the delivery feedback 7 local visual-alignment acceptance criteria. The approved team-run launch form must preserve accepted layout and launch semantics while proving these current behaviors:

1. `Hide team default` and `Hide member overrides` disclosure buttons must center their visible labels within the full button bounds with no apparent extra right-side space caused by chevron placement.
2. Disclosure buttons must preserve existing localized labels, chevron visibility/rotation, focus ring, `aria-expanded`, and click/toggle behavior.
3. `Workspace Directory` remains left-aligned as a group and keeps equal-width `Existing` / `New` segments, but each segment label must be centered horizontally/vertically within the segment while icons are offset absolutely and do not move the label off-center.
4. Workspace selected, disabled, error, locked, existing/new event, and no-success-copy behavior remain unchanged.
5. Prior round-7/round-12 behavior remains intact: localized footer override-tag labels and route-key emits, footer-to-form member override focus, member Thinking default-on behavior, missing-model blocking, read-only inspection, and first-send complete member config materialization.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility mechanisms were introduced; old chevron-offset and non-centered segment label structure were replaced directly; backend/API payload shapes were not changed.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `TeamRunDefaultsSummary.vue` disclosure action uses balanced three-column layout | Changed / Removed offset | `delivery-user-verification-feedback-7.md` `AC-FB7-001`, implementation handoff, code review round 13 | Retain and execute `TeamRunConfigForm.spec.ts`; use source grep/static evidence for `inline-grid`, `grid-cols-[1rem_auto_1rem]`, `justify-items-center`, centered label span, and no chevron `ml-1`. |
| `TeamMemberOverridesSummary.vue` disclosure action uses balanced three-column layout | Changed / Removed offset | `AC-FB7-002`, implementation handoff, code review round 13 | Retain and execute `TeamRunConfigForm.spec.ts`; use source grep/static evidence for balanced grid and no chevron `ml-1`. |
| Workspace `Existing` / `New` segments keep left-aligned/equal-width group and center labels via full-width text spans with absolute icons | Changed | `AC-FB7-003`, prior `REQ-002`..`REQ-004`, `AC-001`..`AC-002`, implementation handoff, code review round 13 | Retain and execute `WorkspaceSelector.spec.ts`; use source grep for `workspace-mode-label-existing/new`, `block w-full text-center leading-5`, absolute icon classes, and `justify-start`. |
| Summary disclosure and workspace controls preserve existing click/aria/state behavior | Preserved | `AC-FB7-004`, code review round 13 structural checks | Execute focused component tests and source inspection; no durable coverage changes needed. |
| Footer override tag localization/route-key navigation, member Thinking default-on, readiness/materialization | Preserved | Code review round 13 says prior `CR-001`, `CR-002`, `CR-003` remain resolved and launch authorities are unchanged | Execute previously valid component/utility/store coverage as regression. |
| Backend GraphQL/server API | Preserved / Out of scope | Requirements Out of Scope; no backend/schema files changed | No backend durable coverage changes required; frontend store tests cover first-send GraphQL payload and missing-model pre-mutation blocking. |
| Browser/manual delivery visual verification | Out of scope for API/E2E sign-off | Delivery workflow owns renewed user verification after API/E2E | Component tests prove structure/classes/events; delivery should visually confirm perceived centering in real app. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Verifies final team form order, disclosure reset/read-only behavior, default/team/member summary behavior, route-key focus behavior, and new balanced disclosure button label layout/no chevron margin | `AC-FB7-001`, `AC-FB7-002`, `AC-FB7-004`, prior `REQ-001`, `REQ-011`..`REQ-019` | Still Valid | Source inspection found `centers disclosure button labels with balanced chevron columns` assertions for both defaults and overrides toggles. | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector.spec.ts` | Verifies left-aligned equal-width segments, centered full-width labels, absolute icons, selected contrast, no success text, and preserved events/states | `AC-FB7-003`, `AC-FB7-004`, prior `REQ-002`..`REQ-004` | Still Valid | Source inspection found assertions for `workspace-mode-label-existing/new`, `block`, `w-full`, `text-center`, `leading-5`, absolute icons, `w-28`, and `justify-start`. | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunLaunchSummary.spec.ts` | Localized footer override tag rendering for EN one/two/>two labels, Chinese rendering, and unchanged `focus-overrides(routeKeys)` emit | Prior `REQ-009`..`REQ-014`; `CR-003` | Still Valid | Round-13 visual fix does not alter footer summary logic; code review says `CR-003` remains resolved. | Retain and execute. |
| `autobyteus-web/utils/__tests__/teamRunConfigPresentation.spec.ts` | Summary DTO facts for members/runtime/model/auto-approve/workspace/override route keys; rejects final `label` field | Prior `REQ-005`..`REQ-014`; `CR-003` | Still Valid | Presentation facts remain unchanged by visual fix. | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | Builds footer summary and delegates override-tag clicks to `TeamRunConfigForm.focusMemberOverrides(routeKeys)` | Prior `REQ-005`..`REQ-014` | Still Valid | Navigation/event spine is unaffected by alignment fix. | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Verifies member card shell/framing, reset, chips, labels/storage, flat rows, fallback, and member model-config behavior | Prior `REQ-015`..`REQ-019` plus accepted member behavior | Still Valid | Member leaf behavior is unaffected by visual fix but remains regression-critical. | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Verifies default-on Thinking opt-in, explicit OFF preservation, read-only/disabled/missing-historical no-op, flat/default disclosure behavior, and schema/default guards | Prior `REQ-015`..`REQ-018` | Still Valid | Shared provider/default boundary is unchanged. | Retain and execute. |
| `autobyteus-web/utils/__tests__/llmThinkingConfigAdapter.spec.ts` | Verifies provider-aware thinking state/default generation for OpenAI/Responses, Claude, typed/DeepSeek/GLM, Gemini, unsupported schemas, explicit states, and tuning/defaults | Prior `REQ-015`..`REQ-018` | Still Valid | Adapter remains unchanged by visual fix. | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Verifies desktop agent launch default-on Thinking and read-only/no-op preservation | Regression around shared launch surface | Still Valid | Included to prove shared model-config callers still pass. | Retain and execute. |
| `autobyteus-web/components/mobile/__tests__/MobileLaunchRuntimeModelCard.spec.ts` | Verifies mobile launch card default-on Thinking and disabled no-emission behavior | Regression around shared mobile launch surface | Still Valid | Included to prove round-10 behavior remains. | Retain and execute. |
| `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | Verifies effective member runtime/model/config resolution and reconstruction/materialization helper behavior | Prior `REQ-019` | Still Valid | Launch/materialization helpers are unchanged but remain critical. | Retain and execute. |
| `autobyteus-web/stores/__tests__/teamRunConfigStore.spec.ts` | Verifies launch readiness getter behavior including missing workspace and mixed runtime/model compatibility blocking | Prior `REQ-019` | Still Valid | Current worktree has no direct `utils/__tests__/teamRunLaunchReadiness.spec.ts`; this store test is the current durable readiness coverage. | Retain and execute. |
| `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` | Verifies temp-team local materialization from `TeamRunConfig`, inherited/overridden runtime/model/config, and nested topology | Prior `REQ-019` | Still Valid | Materialization authority is unchanged and still relevant. | Retain and execute. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Verifies temporary first-send GraphQL `memberConfigs` for mixed/nested/defaults-only launches and missing-model pre-GraphQL blocking | Prior `REQ-019` | Still Valid | Store tests verify complete payloads and readiness blocking beyond component coverage. | Retain and execute. |
| Source grep / static audit for alignment classes, no chevron margin, route-key bridge, and unchanged readiness/materialization owners | Temporary evidence around local visual fix and preserved launch authorities | `AC-FB7-001`..`AC-FB7-004` plus prior launch constraints | Still Valid as temporary execution evidence | Useful because this fix is CSS/markup-oriented and prior API/E2E is stale. | Execute as temporary evidence; no durable changes. |
| Prior round 7 `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` contents | Historical evidence for pre-feedback-7 implementation state | Superseded by code-review round 13 | Replace | Code reviewer explicitly marked prior API/E2E/delivery artifacts stale after delivery-feedback-7 local fix. | Replace canonical artifacts with round 8 investigation/report. |
| Full browser/Electron/manual visual E2E | End-to-end visual app run | Perceived centering in real rendered app | Out Of Scope | Component tests directly verify component-owned structure/classes/events; delivery/user verification is the workflow stage for real visual acceptance. | Not required for API/E2E; record residual delivery verification risk. |
| Backend GraphQL/server tests | Server schema/domain contract | Backend launch contract preservation | Out Of Scope | Backend/server code and schema were not changed; frontend first-send GraphQL payload and pre-mutation blocking are covered by stores. | No backend test changes. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior API/E2E round 7 artifact contents | Validation for the pre-feedback-7 implementation state before disclosure-button and workspace-segment alignment local fix | Code review round 13 says prior API/E2E and delivery evidence is stale after the local visual-alignment fix | Delivery feedback 7, implementation handoff, code-review report round 13 | This canonical round 8 investigation/report | N/A |
| None in repository-resident tests | N/A | Current inspected tests assert approved feedback-7 behavior or preserved regression behavior | Source/test inspection and current code-review result | N/A | No repository-resident test removal is required. |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | Current reviewed implementation already added focused durable coverage before code review round 13 passed | N/A | No additional API/E2E-authored durable coverage is needed. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | Existing durable coverage matches current requirements/design/code-review decisions. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `SC-STATIC-001` | Source grep/static inspection for balanced disclosure button grid classes, no chevron `ml-1`, workspace full-width labels/absolute icons, route-key bridge, and unchanged launch authority files | Confirms the local visual fix is active in source and launch/readiness source did not drift | It is one-time audit evidence around this diff; durable assertions already live in component/utility/store tests. |
| `SC-GUARD-001` | Project guard scripts, localization audits, `git diff --check`, and manual trailing-whitespace scan | Boundary, localization, literal-audit, and formatting constraints | These are existing project checks rather than new durable coverage artifacts. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser/manual perceived visual centering | Component tests cover the exact owner-controlled classes/structure; delivery stage owns renewed user verification after API/E2E | Medium: CSS utility structure strongly supports centering, but final perceived alignment is visual/product acceptance | Delivery should perform normal visual/user-verification hold. No API/E2E blocker. |
| Live provider catalog fetch | Provider API code unchanged and no credentials/services are required; representative provider schemas cover fixed/configurable/unsupported/explicit-off behavior | Low: catalog fixture divergence could still exist outside this diff | Delivery/product may visually spot-check real catalogs; no test addition required here. |
| Backend server GraphQL execution | Backend schema/server code unchanged; store tests cover outbound first-send payload shape and pre-GraphQL missing-model block | Low | No follow-up unless delivery finds runtime backend mismatch. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Current feedback/design/code-review decisions are sufficient; no active compatibility or stale-test issue found | N/A |

## Execution Plan

1. Execute the current valid focused Vitest suite for the reviewed frontend/component/shared-utility/store coverage: team form, run panel, launch summary, agent form, member override item, model config section, workspace selector, mobile launch card, presentation utilities, team config utilities, Thinking adapter, team config store, team contexts store, and team run store.
2. Run project guards: `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, and Node 22 localization audit.
3. Run `git diff --check` and manual trailing-whitespace scan over changed tracked/untracked text files.
4. Run temporary source grep/static checks for balanced disclosure-button layout, no chevron margin offset, centered workspace segment label structure, preserved route-key bridge, and unchanged readiness/materialization authorities.
5. If all pass and no durable coverage is added/updated/removed by API/E2E, write the execution coverage report and route to `delivery_engineer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable coverage is current and sufficient. API/E2E will refresh execution evidence only; prior round 7 API/E2E/delivery evidence is replaced as historical.
