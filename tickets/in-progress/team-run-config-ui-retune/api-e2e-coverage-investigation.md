# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/code-review-report.md`
- Current Investigation Round: `1`
- Trigger: Code review passed for Team Run Configuration UI retune; API/E2E coverage investigation and execution requested.
- Prior Investigation Reviewed: `N/A`
- Latest Authoritative Investigation: `Round 1`

## Current Requirement And Design Basis

The approved change is a UI-only retune of the desktop/web Team Configuration form. The current behavior to prove is:

- Team-level `Auto approve tools` renders directly after `WorkspaceSelector` and before Team Members Override while continuing to bind only to `TeamRunConfig.autoExecuteTools`.
- Team Members Override renders only when leaf members exist, defaults collapsed, exposes a visible chevron and native-button disclosure state through `aria-expanded` and `aria-controls`, and can be expanded/collapsed without mutating config fields.
- Expanded member override controls preserve existing runtime, model, advanced config, tri-state member auto-approval, meaningful-override pruning, nested route-key identity, and read-only/locked no-op behavior.
- Read-only or locked team configurations keep controls disabled/no-op while the disclosure remains operable for inspection.
- Expanded member override rows use connected-list/shared-separator presentation and concise copy (`Runtime`, `LLM Model`, `Auto approve`, `Global default`, `On`, `Off`) without adding backend/API/store/data-model behavior.
- The implementation handoff's Legacy / Compatibility Removal Check is clean: no compatibility mechanisms were introduced, old default-expanded behavior and unreliable CSS-icon chevron were removed, and no backend/model compatibility path is in scope.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team-level Auto approve order in `TeamRunConfigForm.vue` | Changed | REQ-TRC-001/002, AC-TRC-001; design DS-TRC-001/004; implementation handoff “Moved the existing team-level `Auto approve tools` row...” | Existing form component coverage must assert DOM/render order and unchanged binding/no-op semantics. |
| Team Members Override disclosure default collapsed with visible chevron and ARIA | Changed / Added | REQ-TRC-003/004/005, AC-TRC-002/003/004; design DS-TRC-002; implementation handoff disclosure bullet | Existing form component coverage must assert collapsed default, `aria-expanded`, `aria-controls`, chevron state, expand/collapse. |
| Disclosure expand/collapse must not mutate config | Preserved / Changed UI state only | REQ-TRC-007, AC-TRC-005; design DS-TRC-002 says local state only | Existing form component coverage must assert no mutation of `autoExecuteTools` or `memberOverrides`. |
| Expanded member override edit semantics | Preserved | REQ-TRC-006, AC-TRC-006; design DS-TRC-003; code review data-flow spine | Existing `TeamRunConfigForm.spec.ts`, `MemberOverrideItem.spec.ts`, and team-config utility coverage remain valid and should execute. |
| Read-only / locked inspectability with disabled inner controls | Preserved with collapsed disclosure UI | REQ-TRC-007, AC-TRC-007; wireframes scenarios 4/5/8; docs note selected configs inspectable | Existing form/panel coverage must assert read-only disclosure operable and controls disabled/no-op. |
| Connected-list member styling and nested grouping | Changed | REQ-TRC-008, AC-TRC-008/009; user wireframes; implementation handoff visual artifact | Component tests can validate structural selectors lightly; visual density itself is best covered by reviewed screenshot/temporary visual evidence, not brittle class assertions. |
| Concise member-row copy | Changed / Removed obsolete wording | REQ-TRC-011, AC-TRC-012; design removal plan and wireframes | Existing `MemberOverrideItem.spec.ts` coverage should assert concise strings and absence of old verbose/legacy visible wording. |
| Backend/API/store/launch data semantics | Preserved | AC-TRC-011; implementation/code review reports say backend/store/data-model paths untouched; `TeamRunConfig.autoExecuteTools` remains authoritative | No backend API E2E coverage update needed. Existing launch-builder/readiness coverage is still valid evidence for preserved semantics. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` — `places team auto approve before a collapsed accessible member override disclosure` | Six-member team renders auto-approve row before override toggle; panel defaults hidden; header count, `aria-expanded`, `aria-controls`, id linkage, and chevron rotation update on click. | REQ-TRC-001/003/004/005, AC-TRC-001/002/003/004/010, DS-TRC-001/002 | Still Valid | Current test directly maps to the approved initial render and disclosure requirements; updated during implementation before code review. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` — `toggles the member override disclosure without mutating config fields` | Expanding/collapsing disclosure leaves `config.autoExecuteTools` and `config.memberOverrides` unchanged while showing override count. | REQ-TRC-007, AC-TRC-005, design local-state spine DS-TRC-002 | Still Valid | Directly validates disclosure is UI-only and override summary derives from existing state. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` — existing runtime/global model catalog/pruning scenarios | Team global runtime/model controls and member inherited `llmConfig` pruning still work. | REQ-TRC-006, AC-TRC-006, DS-TRC-003/004 | Still Valid | UI retune must preserve these existing semantics; tests still exercise current required behavior. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` — nested leaf override route-key scenario | Nested team group renders under Team Members Override and emits updates using canonical nested route keys after expansion. | REQ-TRC-006/008/009, AC-TRC-006/009/010, DS-TRC-003 | Still Valid | Required by design and acceptance criteria for nested hierarchy and preserved edit path. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` — read-only selected/historical scenarios | Read-only mode disables controls, keeps disclosure operable for inspection, passes disabled/advanced/missing-history props, and ignores override update attempts. | REQ-TRC-002/006/007, AC-TRC-007/010, DS-TRC-005 | Still Valid | Directly maps to read-only inspectability and no-op behavior. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` — `renders concise member override copy` | Member row renders concise labels/options and does not show old verbose/legacy visible copy. | REQ-TRC-011, AC-TRC-012; design removal/decommission plan | Still Valid | Current visible copy requirement is explicit and durable at the row owner. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` — member runtime/model/auto-approve/model-config semantics | Row warnings, model resolution, stale `llmConfig` cleanup, inherited fallback, readiness/materialization, missing historical config, and advanced compact behavior. | REQ-TRC-006/007; AC-TRC-006/007/011; DS-TRC-003 | Still Valid | These tests guard preserved member override behavior after the styling/copy retune. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` — team form selection, launch, workspace/read-only wiring | Entry panel chooses TeamRunConfigForm, launches team when readiness passes, preserves workspace event handling, and passes read-only mode for selected team configs. | UC-004/005; DS-TRC-005; AC-TRC-007/011 | Still Valid | This is the nearest existing integrated component boundary for the desktop config entrypoint; TeamRunConfigForm internals are not asserted here. | Execute as broader executable coverage. |
| `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | Team config utilities, launch readiness, meaningful override behavior, and effective member records preserve `autoExecuteTools` semantics. | AC-TRC-006/011; design says backend/data semantics unchanged | Still Valid | Relevant to preserved data semantics; no UI-specific update needed. | Execute as broader executable coverage. |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` — mobile auto-approve binding | Mobile run setup binds team Auto approve to launch config/context/member configs. | AC-TRC-011 preserved semantics, but desktop/web UI retune does not change mobile surface | Out Of Scope | Mobile code was not changed; no desktop Team Members Override layout is involved. | Do not execute for this UI retune unless broad suite is requested. |
| `autobyteus-web/localization/messages/__tests__` and localization guard/audit scripts | Localization catalog/runtime integrity and absence of hardcoded literals. | Localization constraint and REQ-TRC-011 concise copy through catalogs | Still Valid | Implementation changed manual English/Zh-CN workspace catalogs; code review already ran guard/audit. | Execute guard/audit as final checks. |
| Repository-level browser E2E / Playwright tests for Team Configuration | Full running app route/browser flow for desktop Team Configuration. | Downstream hint asks to consider full UI/app path | Out Of Scope / Not Present | Repository search found no frontend Playwright/Cypress config or durable desktop Team Configuration E2E suite. Full route setup requires app data/server state outside this UI-only change. | Use existing component/integration coverage plus temporary visual/screenshot evidence; do not add a new browser E2E framework in this stage. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale durable API/E2E/component coverage requiring deletion was found in the changed scope. Existing tests that assumed immediate member override access were already updated before code review to account for the collapsed default while preserving mounted `v-show` behavior. | Requirements/design/code review all accept current updated tests. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing implementation-stage durable component coverage now covers the required changed behavior. | N/A | No additional repository-resident coverage is required at API/E2E stage. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No API/E2E-stage durable coverage update planned. | N/A | Tests were updated before code review and are now the valid durable coverage to execute. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage requiring removal found. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-TRC-001 | Use temporary dependency symlinks from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` if this worktree still lacks `node_modules`, then run focused Vitest/component/integration checks. | Executes valid durable coverage against the reviewed implementation in this worktree. | Dependency symlinks are environment setup only and will be removed after execution. |
| TMP-TRC-002 | Review existing visual verification screenshot and, if practical, use a one-off headless browser/DOM probe against `/tickets/in-progress/team-run-config-ui-retune/visual-verification/team-run-config-connected-list.html`. | Confirms the visual target artifact shows connected-list/shared-separator layout and global auto-approve before Team Members Override. | The static visual harness is task evidence only; it is not an app route and should not become durable repo coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full running desktop app route with real persisted team definitions | No existing frontend browser E2E infrastructure found for this surface; a real route depends on broader app/server/store data setup and would be disproportionate for a local UI retune already covered by component/integration tests. | Residual risk that app-shell data loading or CSS integration differs from component render/static visual harness. | Delivery should perform final integrated-state refresh/check. Future work can add durable browser E2E if the project introduces a frontend browser E2E framework. |
| Pixel-perfect visual density measurement | Component tests should not assert subjective line-density perception or Tailwind class details. | Minor visual-polish risk remains subjective. | Screenshot artifact reviewed; user-facing visual docs/docs sync owned by delivery if needed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement gaps, design impacts, unclear behavior, compatibility wrappers, or implementation local-fix triggers found during investigation. | N/A |

## Execution Plan

1. Confirm temporary dependency setup is needed because this worktree has no installed `node_modules`.
2. Create temporary symlinks for `node_modules`, `autobyteus-web/node_modules`, and `.nuxt` from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` only for local execution.
3. Run focused valid durable coverage:
   - `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts`
4. Run localization and whitespace checks:
   - `pnpm -C autobyteus-web guard:localization-boundary`
   - `pnpm -C autobyteus-web audit:localization-literals`
   - `git diff --check`
5. Perform temporary visual evidence review using the existing screenshot/HTML harness; do not add repository-resident browser E2E coverage.
6. Remove temporary dependency symlinks and record cleanup.
7. Write the canonical execution coverage report and route to `delivery_engineer` if all checks pass and no durable coverage was added/updated/removed during this stage.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: `N/A`
- Notes: Existing durable component/integration coverage is current and valid for this UI-only retune. No backend/API/store/model coverage update is required. No compatibility-only behavior was observed or retained in scope.
