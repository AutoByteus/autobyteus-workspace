# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-run-config-ui-retune/tickets/in-progress/team-run-config-ui-retune/code-review-report.md`
- Current Investigation Round: `3`
- Trigger: Code review Round 3 passed after the user-approved light-blue quiet-control color tuning; existing `api-e2e-*`, docs-sync, handoff, release/deployment, and earlier validation artifacts may describe pre-final source states and must be treated as stale/context only.
- Prior Investigation Reviewed: `Round 2` at this same canonical path; it covered the user-approved live UI tuning before the final light-blue quiet-control color pass and is superseded by this Round 3 refresh.
- Latest Authoritative Investigation: `Round 3`

## Current Requirement And Design Basis

The current approved scope remains a UI-only Team Run Configuration retune with no backend/API/store/data-model/launch-builder/persistence change:

- Team-level `Auto approve tools` renders directly after `WorkspaceSelector` and before Team Members Override while continuing to bind only to `TeamRunConfig.autoExecuteTools`.
- Team Members Override renders only when leaf members exist, defaults collapsed, uses a native disclosure button with a visible inline SVG chevron, reports `aria-expanded` / `aria-controls`, and can be expanded/collapsed without mutating config fields.
- Expanded member override controls preserve runtime/model/advanced config semantics, tri-state member auto-approval, meaningful-override pruning, nested route-key identity, and read-only/locked no-op behavior.
- Read-only or locked team configurations keep controls disabled/no-op while the disclosure remains operable for inspection.
- Expanded member override rows use a connected-list/shared-separator presentation, concise member-row copy, and the same authoritative fields (`TeamRunConfig.autoExecuteTools`, `MemberConfigOverride.autoExecuteTools`) as before.
- Round 2 user-approved live UI tuning moved the chevron beside the header label, strengthened connected-list separators, made member names more prominent, and introduced opt-in quiet control variants for dense Team/Agent/member/workspace/advanced model config surfaces.
- Round 3 user-approved tuning changed the opt-in quiet interactive control treatment to light-blue background/ring/hover/focus classes. The code-review report states this is presentation-only and still local to existing UI owners.

The implementation handoff's Legacy / Compatibility Removal Check is clean: old-behavior retained in scope is `No`, there is no backend/API/store/data-model/launch-builder change, no approval alias, no duplicate persisted state, no old/new layout mode, and no compatibility wrapper or feature flag.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team-level Auto approve order in `TeamRunConfigForm.vue` | Changed | Requirements/design require the auto-approval toggle after workspace selection and before member overrides; implementation/code review preserve this after Round 3. | Existing `TeamRunConfigForm.spec.ts` order coverage remains valid and must run on Round 3 source. |
| Team Members Override default-collapsed disclosure with ARIA | Changed / Added | Requirements/design/code review require collapsed-by-default, native disclosure semantics, `aria-expanded`, `aria-controls`, and non-mutating toggle state. | Existing form coverage remains valid; temporary source/visual probe should also confirm chevron-after-label placement. |
| Disclosure expand/collapse without config mutation | Preserved / Changed UI state only | Design acceptance and code review state disclosure toggles local UI state only. | Existing form coverage remains valid and must run. |
| Expanded member override edit semantics and nested route-key identity | Preserved | Requirements/design and Round 3 code review state member update data flow and authoritative persisted fields are unchanged. | Existing `TeamRunConfigForm.spec.ts`, `MemberOverrideItem.spec.ts`, `RunConfigPanel.spec.ts`, and utility coverage remain valid. |
| Read-only / locked inspectability with disabled inner controls | Preserved | Requirements/design and implementation handoff state selected configurations are read-only/no-op while disclosure remains inspectable. | Existing form/panel coverage remains valid. |
| Connected-list styling, stronger separators, member-name prominence | Changed | Implementation handoff/code review Round 2 plus Round 3 preservation. | Behavior/structure covered by component suites; visual density remains best validated by live screenshot/source probe rather than brittle pixel tests. |
| Concise member-row copy | Changed / Removed obsolete wording | Requirements/design and implementation handoff require concise copy and no legacy verbose row text. | Existing `MemberOverrideItem.spec.ts` plus localization audit remain valid. |
| Quiet select/control variants for dense run config surfaces | Added presentation-only variant | Implementation handoff/code review cover `SearchableGroupedSelect`, `SearchableSelect`, `RuntimeModelConfigFields`, `WorkspaceSelector`, `ModelConfigSection`, `ModelConfigAdvanced`, `AgentRunConfigForm`, and `TeamRunConfigForm`. | Existing behavior tests for Agent/Team/Workspace/ModelConfig remain valid; temporary source/visual probe verifies default-preserving opt-in shape. |
| Light-blue quiet-control background/ring/hover/focus treatment | Changed | Round 3 code review and implementation handoff identify final user-approved light-blue quiet-control treatment; final screenshots are `live-blue-quiet-controls-team-expanded.png` and `live-blue-quiet-controls-agent.png`. | No new durable test needed because this is presentation-only color tuning. Use temporary source/screenshot evidence to avoid brittle class/pixel assertions in durable tests. |
| Backend/API/store/data-model/launch-builder/persistence semantics | Preserved | Code review Round 3 says no backend/API/store/data-model/launch-builder/persistence behavior changed and authoritative `autoExecuteTools` fields remain unchanged. | No backend API/E2E update needed; existing utility/launch-readiness coverage remains valid evidence for preserved semantics. |
| Prior API/E2E/docs-sync/handoff/release/deployment/validation artifacts | Stale context only | Code review Round 3 downstream note says these artifacts may describe pre-final source state. | Replace canonical API/E2E investigation/report with Round 3 refreshed artifacts; delivery owns final docs/finalization refresh. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` — order/disclosure scenarios | Six-member team renders auto-approve row before override toggle; panel defaults hidden; header count, `aria-expanded`, `aria-controls`, panel id, chevron rotation, and expand/collapse behavior are asserted. | Team Run order/disclosure requirements and accessibility acceptance criteria. | Still Valid | Tests map to approved Team Run disclosure/order behavior. Round 3 did not alter data semantics. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` — runtime/global model catalog/pruning and read-only scenarios | Team global runtime/model changes, inherited member `llmConfig` pruning, nested route-key member updates after expansion, and read-only inspectability/no-op behavior. | Member override edit semantics, read-only behavior, no persistence shape change. | Still Valid | Round 3 quiet blue styling is presentation-only on the same owners. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Concise copy is rendered; old verbose/legacy visible strings are absent; member runtime/model/auto-approve/model-config behavior, cleanup, readiness, materialization, missing historical config, and compact advanced behavior are preserved. | Member row copy, member override semantics, authoritative `MemberConfigOverride.autoExecuteTools`. | Still Valid | Round 3 changed quiet control color only; row behavior remains current and required. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Agent run config runtime/model/workspace/auto-approve/read-only and advanced model config behavior. | Agent Run controls opt into the same quiet treatment without behavior changes. | Still Valid | Existing behavior suite is the right durable coverage for preservation of agent config semantics. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector.spec.ts` | Workspace selection/new path/display/disabled/locked/browser/Electron behavior. | `WorkspaceSelector` gets opt-in quiet variant; selection/persistence behavior unchanged. | Still Valid | Quiet styling is presentation-only and caller behavior remains current. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Advanced model config disclosure/default/sanitization/read-only/missing-historical behavior. | `ModelConfigSection` / `ModelConfigAdvanced` pass/apply quiet variants for advanced controls while preserving config semantics. | Still Valid | Final UI changes must not disturb advanced config semantics. | Execute as final durable coverage. |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | Config panel chooses agent/team forms, launches when readiness passes, preserves workspace event handling, and passes read-only mode for selected configs. | Desktop config entrypoint/read-only handoff and preserved launch data semantics. | Still Valid | Nearest existing integrated component boundary for Team/Agent config entrypoint. | Execute as broader executable coverage. |
| `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | Team config utilities, launch readiness, meaningful override behavior, and effective member records preserve `autoExecuteTools` semantics. | No backend/data-model semantics changed; authoritative fields preserved. | Still Valid | Important preserved-boundary coverage for utility/launch-readiness semantics. | Execute as broader executable coverage. |
| `autobyteus-web/components/agentTeams/SearchableGroupedSelect.vue` and `autobyteus-web/components/common/SearchableSelect.vue` default/quiet variant source | New `variant?: 'default' | 'quiet'` changes styling only and defaults to `default`. | Shared select owners expose default-preserving opt-in presentation variant. | Still Valid via caller coverage + temporary source/visual probe | No dedicated durable tests were found for these select components. Existing callers exercise behavior; new variant is visual/presentation-only. | Use temporary source/visual audit; do not add durable tests unless variant behavior expands beyond styling. |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue`, `WorkspaceSelector.vue`, `ModelConfigAdvanced.vue`, `ModelConfigSection.vue`, `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `MemberOverrideItem.vue` quiet control source | `controlVariant` defaults to `default`; Team/Agent/member dense run-config surfaces opt into `quiet`; Round 3 quiet class tokens use light-blue background/ring/hover/focus. | Round 3 color tuning is opt-in and presentation-only. | Still Valid via caller coverage + temporary source/visual probe | Class-specific durable tests would be brittle for color tuning; source/screenshot probe is the appropriate temporary evidence. | Use temporary source/visual audit. |
| Web/localization guard and literal audit | Boundary/literal compliance after copy and UI-owner changes. | Localization and web boundary constraints. | Still Valid | Source touches shared web component owners and UI copy. | Execute `guard:web-boundary`, `guard:localization-boundary`, and `audit:localization-literals`. |
| `git diff --check` | Whitespace validity. | Standard workflow check. | Still Valid | Round 3 source/docs/artifact state must be clean. | Execute. |
| Frontend browser E2E / Playwright/Cypress suite for desktop Team/Agent Run Configuration | Full running app route/browser interaction with persisted team definitions. | Residual visual risk was highlighted upstream. | Out Of Scope / Not Present | Repository inspection found no durable frontend browser E2E framework/config for this exact surface. Implementation/code review already captured live frontend screenshots accepted by the user. | Use screenshot review and temporary source/probe evidence; delivery refreshes integrated state. |
| `autobyteus-web/components/mobile/__tests__/MobileUxRefinement.spec.ts` mobile auto-approve scenarios | Mobile run setup binds auto-approve to launch config/context/member configs. | Data semantics are preserved, but mobile source was not touched. | Out Of Scope | Desktop/web run config UI only; no mobile source changed. | Do not execute in focused Round 3 scope. |
| Prior canonical `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` content | API/E2E findings from earlier source states. | Code review Round 3 says existing `api-e2e-*` artifacts may describe a pre-final source state. | Replace | These artifacts are not durable product tests and must be refreshed. | Overwrite canonical artifacts with Round 3 latest authoritative content. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior `api-e2e-coverage-investigation.md` / `api-e2e-execution-coverage-report.md` content | They described Round 1 or Round 2 source state and omitted the final Round 3 light-blue quiet-control tuning. | Code review Round 3 explicitly says existing API/E2E artifacts may describe a pre-final source state. | Code review report Round 3 downstream note. | This refreshed investigation and a refreshed execution report at the same canonical paths. | N/A |
| N/A for repository-resident durable tests | No stale durable component/API/E2E test requiring deletion was found. | Existing tests still represent approved current behavior. | Source/test inspection and code review Round 3 pass. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing durable component/integration coverage plus final live visual evidence and temporary source/screenshot probe adequately cover the current UI-only behavior. | N/A | No new repository-resident durable coverage is required during API/E2E. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No API/E2E-stage durable coverage update planned. | N/A | Round 3 source changes were already reviewed; API/E2E will execute existing valid coverage and temporary visual/source probes. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage requiring removal found. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-TRC-R3-001 | Use existing worktree dependency setup and run focused Vitest suites for Team/Agent/Member/Workspace/ModelConfig plus RunConfigPanel and team config utilities. | Executes valid durable behavior coverage against final Round 3 source. | Existing durable tests remain in the repo; no temporary file should remain. |
| TMP-TRC-R3-002 | Temporary Node source/screenshot audit of quiet blue class tokens, default-preserving variants, Team/Agent/member quiet opt-ins, disclosure chevron placement/source state, final screenshot files/dimensions, and static connected-list harness invariants if Playwright is available. | Verifies visual/presentation-only Round 3 tuning without committing brittle class/pixel assertions as durable tests. | Round 3 color tuning is subjective presentation; durable tests should stay behavior-focused. |
| TMP-TRC-R3-003 | Run `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, and `git diff --check`. | Confirms web boundary, localization, literal audit, and whitespace integrity after source/artifact edits. | These are standard executable checks, not new durable coverage files. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full fresh application route E2E from a newly started backend/frontend in API/E2E stage | No durable full-app browser E2E harness was found for this exact desktop Team/Agent Run Config surface. Final live screenshots were already captured and reviewed upstream for Round 3. | Low-to-medium visual residual risk remains for browser/runtime conditions not covered by component tests and screenshots. | Delivery should perform its integrated-state refresh/check and preserve/reconcile final visual evidence. No upstream reroute required. |
| Mobile run setup UI | Mobile source untouched and current task is desktop/web Team Run Config UI. | Low; shared data semantics are covered by utility/config tests. | None. |
| Installer/release artifacts created by an earlier delivery pass | Code review marked earlier downstream docs/report/release artifacts as stale/context only after Round 3. API/E2E does not own release build refresh. | Delivery artifact drift if not refreshed. | Delivery engineer must refresh docs/finalization/release evidence after API/E2E. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None found before execution. | N/A | Implementation handoff legacy/compatibility check is clean; code review Round 3 found no actionable findings; source inspection found UI-only changes. | N/A |

## Execution Plan

1. Execute focused durable coverage suites:
   - `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/ModelConfigSection.spec.ts components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/AgentRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts components/workspace/config/__tests__/WorkspaceSelector.spec.ts components/workspace/config/__tests__/RunConfigPanel.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts`
2. Execute a temporary source/screenshot probe for Round 3-only presentation evidence: quiet blue class tokens, default-preserving variants, quiet opt-ins, disclosure source placement, final screenshot files/dimensions, and connected-list harness invariants where available.
3. Execute guard/audit/whitespace checks:
   - `pnpm --dir autobyteus-web run guard:web-boundary`
   - `pnpm --dir autobyteus-web run guard:localization-boundary`
   - `pnpm --dir autobyteus-web run audit:localization-literals`
   - `git diff --check`
4. If all pass and no durable coverage files are changed, refresh the canonical execution coverage report and hand the cumulative package to `delivery_engineer`.
5. If any repository-resident durable coverage is added/updated/removed, refresh the execution report and route the cumulative package back to `code_reviewer` before delivery.
6. If a compatibility wrapper/alias/duplicate persisted state or behavior-breaking issue is found, classify and reroute according to the skill rules.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Round 3 is UI/presentation-only. Existing durable behavior coverage remains valid; no stale durable product test was found. The prior canonical API/E2E artifact contents are stale and are replaced by this Round 3 investigation.
