# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/requirements.md`
- Investigation Notes: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/investigation-notes.md`
- Design Spec: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-spec.md`
- Solution / Design Re-entry Report 1: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report.md`
- Solution / Design Re-entry Report 2: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-2.md`
- Solution / Design Re-entry Report 3: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/solution-design-reentry-report-3.md`
- Delivery User Verification Feedback 1: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback.md`
- Delivery User Verification Feedback 2: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-2.md`
- Delivery User Verification Feedback 3: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/delivery-user-verification-feedback-3.md`
- Design Review Report: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/design-review-report.md`
- Implementation Handoff: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/implementation-handoff.md`
- Code Review Report: `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification/tickets/in-progress/workspace-run-config-ui-simplification/code-review-report.md`
- Current Investigation Round: `4`
- Trigger: Code-review round 7 pass after the third delivery-feedback / round-4 implementation rework and local `CR-002` fix for team `Auto approve tools` title-row alignment.
- Prior Investigation Reviewed: `Round 3` at this canonical path. Prior API/E2E and delivery evidence is stale after the round-4 rework and is historical only.
- Latest Authoritative Investigation: `Round 4 / this file`

## Current Requirement And Design Basis

The latest authoritative requirements are the third delivery-verification re-entry requirements. The team-run form must now render the final top-level order `Team Definition` -> `Workspace Directory` -> `Skill Access` -> sticky footer, with no outer bordered Team Definition group. Within the borderless Team Definition section, the selected team, unified `Team run defaults` card, and `Team member overrides` section must remain in that order. `Team run defaults` must be expanded by default for editable drafts, must use one card shell with an internal expanded body, must directly summarize runtime/model/concrete `llmConfig`/empty config, must use exact editable action copy `Edit Team Default`, and must contain team `Auto approve tools` before member overrides. The round-7 code-review local fix specifically requires the team `Auto approve tools` toggle to sit in the title row and the description to be below that row.

Member overrides must stay compact by default for editable drafts. Opening the section should show one-line leaf member rows with role/status/override indicators, independent per-row expansion, explicit `Auto Approve Override` selector (`Use global` -> omitted `autoExecuteTools`, `Yes` -> `true`, `No` -> `false`), explanatory copy, and `Reset to default` clearing a member override. Read-only selected/historical inspection must remain inspectable and non-editable.

Shared UI changes remain in force: `WorkspaceSelector` uses a compact left-aligned Existing/New pill and no redundant green `Workspace: ...` success line while preserving errors/locked/guidance; `RunConfigPanel` shows a compact team-only footer launch summary with nested leaf member count, runtime, and model without owning readiness; `ModelConfigSection`/`ModelConfigBasic` render non-configurable/fixed Thinking as neutral disabled rather than highlighted active, while unsupported/no-schema models render no Thinking row where applicable.

Launch semantics remain unchanged and authoritative outside presentation helpers: `teamRunLaunchReadiness.ts` still blocks missing effective team model and workspace issues, and `buildTeamRunMemberConfigRecords(...)`/first-send store paths still materialize complete per-member runtime, model, `llmConfig`, auto-approve, skill-access, workspace id, and workspace root data. The implementation handoff's Legacy / Compatibility Removal Check is clean: no compatibility mechanisms were introduced; old separate defaults editor card, old top-level team auto-approve placement, old ambiguous member auto-execute checkbox path, and old workspace success-line presentation were removed from active UI.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Final top-level team form order and borderless Team Definition hierarchy | Changed / Removed old outer card | `REQ-001`..`REQ-003`, `AC-001`, `AC-002`, design review round 4 | Existing `TeamRunConfigForm.spec.ts` now covers order and absence of outer `border`; retain and execute. |
| Unified `Team run defaults` card with expanded editor body | Changed / Removed separate editor card | `REQ-004`..`REQ-007`, `AC-003`..`AC-008`, implementation handoff | Existing `TeamRunConfigForm.spec.ts` covers default-open editor inside summary card, hide/edit action copy, concrete/empty config; retain and execute. |
| Team `Auto approve tools` moved before member overrides and title-row aligned | Changed / Local fix for `CR-002` | `REQ-008`, `REQ-009`, `AC-009`, `AC-010`, code review round 7 | Existing focused `TeamRunConfigForm.spec.ts` covers relative ordering and title-row/description structure; retain and execute. |
| Member override section collapsed by default with discoverable summary | Changed / Preserved compact design | `REQ-010`, `REQ-011`, `AC-011`, `AC-012` | Existing `TeamRunConfigForm.spec.ts` covers collapsed default and active override names/count; retain and execute. |
| Leaf member rows independently expand and show field-specific override indicators | Added | `REQ-012`..`REQ-015`, `AC-013`..`AC-016` | Existing `MemberOverrideItem.spec.ts` covers collapsed row and reset, but inspection found no direct durable assertions for field indicator selection or multiple independent expansion. Update this existing spec before execution. |
| Member `Auto Approve Override` tri-state selector maps to existing optional boolean shape | Changed / Removed old checkbox/copy | `REQ-016`..`REQ-018`, `AC-018`, `AC-019` | Existing `MemberOverrideItem.spec.ts` covers `Use global`/`Yes`/`No` storage mapping; retain and execute after adding adjacent indicator/independent-expansion coverage. |
| Workspace selector compact pill and no green selected-workspace success text | Changed / Removed success line | `REQ-024`, `REQ-025`, `AC-027`, `AC-028` | Existing `WorkspaceSelector.spec.ts` covers compact left-aligned pill and absence of `Workspace: ...` text; retain and execute. |
| Team footer launch summary near `Run Team` | Added | `REQ-026`, `AC-029`, design review residual risk for nested leaf count | Existing `RunConfigPanel.spec.ts` and `teamRunConfigPresentation.spec.ts` cover nested leaf count/runtime/model display; retain and execute. |
| Non-configurable/fixed Thinking renders neutral disabled, not blue/on; unsupported/no-schema states remain honest | Changed / Shared display fix | `REQ-027`, `AC-030` | Existing `ModelConfigSection.spec.ts`, `TeamRunConfigForm.spec.ts`, `AgentRunConfigForm.spec.ts`, and `MemberOverrideItem.spec.ts` cover neutral disabled and shared caller behavior; retain and execute. |
| Launch readiness blocks missing model; first-send materializes complete per-member records | Preserved | `REQ-019`, `REQ-020`, `AC-020`, `AC-021`, implementation handoff boundaries preserved | Existing `RunConfigPanel.spec.ts`, `agentTeamRunStore.spec.ts`, `agentTeamContextsStore.spec.ts`, and `teamRunConfigUtils.spec.ts` remain valid; retain and execute. |
| Backend GraphQL/server contract | Preserved / Out of scope | Requirements Out of Scope; implementation handoff says backend launch boundaries untouched | No backend durable coverage changes required. Frontend first-send payload tests remain sufficient. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Verifies borderless Team Definition order, defaults open and unified with editor body, member overrides collapsed, team auto approve before overrides, title-row alignment/description below, exact `Edit team default` copy/no old copy, helper suppression, concrete/empty config, missing-model summary, disclosure reset, pruning, nested route keys, and read-only no-op inspection | `REQ-001`..`REQ-011`, `REQ-019`, `REQ-021`..`REQ-023`, `REQ-028`; `AC-001`..`AC-012`, `AC-020`..`AC-026` | Still Valid | Source inspection lines 322-385 and related cases cover the current round-4 UI and `CR-002` fix | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Verifies collapsed leaf row, tri-state auto approve storage mapping, reset no-op/clear behavior, stale model/config pruning, workspace metadata serialization readiness/materialization helpers, missing historical config, and compact advanced behavior | `REQ-012`..`REQ-018`, `REQ-020`, `REQ-027`; `AC-013`..`AC-019`, `AC-020`, `AC-030` | Needs Update | Existing tests cover several member behaviors, but no direct assertion was found for field indicators marking only explicitly overridden fields or for multiple leaf cards remaining independently expanded | Add focused tests to this existing file, then execute and route coverage-code changes through code review. |
| `autobyteus-web/components/workspace/config/__tests__/WorkspaceSelector.spec.ts` | Verifies disabled/locked display behavior, no redundant `Workspace: ...` success line, compact left-aligned Existing/New pill, strong selected state, and preserved error/locked/new-path behavior | `REQ-024`, `REQ-025`; `AC-027`, `AC-028` | Still Valid | Source inspection shows assertions for no `Workspace: Temp Workspace`, `inline-flex`, `rounded-full`, `bg-blue-700`, and `text-white` | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/RunConfigPanel.spec.ts` | Verifies rendering team form, team-only launch summary with nested leaf count/runtime/model, run creation, workspace preloading, blocking issue display, and read-only selected config propagation | `REQ-019`, `REQ-020`, `REQ-026`, `REQ-028`; `AC-021`, `AC-022`, `AC-029` | Still Valid | Source inspection shows nested leaf count summary and readiness blocking assertions | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/ModelConfigSection.spec.ts` | Verifies shared model-config renderer behavior including neutral fixed Thinking, configurable on/off, unsupported/no-schema handling by absence, default disclosure, opt-in inline single row, compact preservation, and missing-historical priority | `REQ-023`, `REQ-027`; `AC-026`, `AC-030` | Still Valid | Tests cover owner of thinking state and advanced-row predicate | Retain and execute. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Verifies shared runtime/model helper and advanced behavior remain available for non-team callers, plus selected read-only config | `REQ-022`, `REQ-023`, `REQ-027`; `AC-025`, `AC-026`, `AC-030` | Still Valid | Prevents team-only helper suppression/direct-row behavior from leaking to agent form | Retain and execute. |
| `autobyteus-web/utils/__tests__/teamRunConfigPresentation.spec.ts` | Verifies defaults summary concrete config entries, deterministic sorting/truncation/title detail, missing-model precedence, member override summary names/count, and footer launch summary derivation | `REQ-006`, `REQ-011`, `REQ-021`, `REQ-026`; `AC-006`, `AC-007`, `AC-012`, `AC-023`, `AC-029` | Still Valid | Source inspection shows footer summary and concrete config cases | Retain and execute. |
| `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | Verifies effective member config resolution, explicit `llmConfig` presence semantics, reconstruction, and launch-readiness utility interactions | `REQ-018`..`REQ-020`; `AC-020`, `AC-021` | Still Valid | Launch/materialization helpers unchanged and still relevant | Retain and execute. |
| `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts` | Verifies temp-team local materialization from `TeamRunConfig`, including inherited/overridden runtime/model/config and nested topology | `REQ-020`; `AC-020` | Still Valid | Materialization authority unchanged | Retain and execute. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Verifies temporary first-send GraphQL `memberConfigs` for mixed, nested, and defaults-only launch cases plus missing-model pre-GraphQL blocking | `REQ-019`, `REQ-020`; `AC-020`, `AC-021` | Still Valid | Store tests verify complete payloads and pre-mutation model block | Retain and execute. |
| Source grep for removed old UI copy/shape | Ad hoc source audit for old `Change run default(s)`, current team-member `Auto-execute`, and workspace success line | `REQ-007`, `REQ-016`, `REQ-025`; `AC-008`, `AC-018`, `AC-028` | Still Valid as temporary investigation evidence | Grep found old run-default copy only in negative tests/docs note; current member override uses new `Auto Approve Override` keys; inactive/unrelated historical `Auto-execute` keys exist outside the active team-member override path | Use as investigation/execution evidence; no source cleanup needed in API/E2E. |
| Prior `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` round 3 contents | Historical coverage decisions/results for second-feedback implementation | Superseded by third-feedback rework and `CR-002` local fix | Replace | Code review round 7 explicitly marks prior API/E2E/delivery evidence stale after round-4 rework | Replace canonical artifacts with round 4 investigation/report. |
| Full browser/Electron/manual E2E | End-to-end visual app run | UI behavior | Out Of Scope | Component/store tests exercise changed DOM/copy/styling/shared-component/readiness/materialization boundaries directly; no dedicated full app harness is necessary here | Not required for this task. |
| Backend GraphQL/server tests | Server schema/domain contract | Backend launch contract preservation | Out Of Scope | Backend/server code/schema unchanged; frontend first-send GraphQL payload and pre-mutation blocking are covered | No backend test changes. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Prior API/E2E round 3 artifact contents | Post-second-reentry evidence/result before third-feedback hierarchy/member/workspace/footer/thinking rework and `CR-002` local fix | Code review round 7 says prior API/E2E and delivery artifacts are stale after the latest implementation rework | Delivery feedback 3, solution re-entry 3, design review round 4, code review round 7 | This round 4 canonical investigation/report | N/A |
| None in repository-resident tests | N/A | Current inspected tests either remain valid or require focused updates rather than removal | Source/test inspection and current requirements | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None as a new file | N/A | N/A | N/A | The missing coverage can be added by updating the existing `MemberOverrideItem.spec.ts` owner. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `DCU-MEMBER-001` | `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Add a focused assertion that a member with explicit runtime and auto approve overrides shows only runtime and auto approve summary indicators and field-level `Overridden` badges, not model/model-config indicators | `REQ-014`, `AC-015` | Confirms field indicators reflect actual explicit override shape. |
| `DCU-MEMBER-002` | `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Add a harness assertion that two member rows can both be expanded at once and toggled independently | `REQ-013`, `AC-014` | Confirms local per-item expansion behavior rather than accidental accordion behavior. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `TEMP-SC-001` | Final targeted Vitest command for team form, member override item, workspace selector, run panel, shared model config section, agent form preservation, presentation utility, config utility, temp context store, and first-send store coverage | Current valid durable coverage passes in the repository test environment after round-4 rework and API/E2E coverage updates | Command output is one-time evidence; durable assertions remain in source tests. |
| `TEMP-SC-002` | Guard commands (`guard:web-boundary`, `guard:localization-boundary`, Node 22 localization literal audit) plus `git diff --check` and manual trailing-whitespace scan | Boundary/localization/whitespace constraints still pass after round-4 rework and coverage updates | Project checks, not task-specific durable coverage. |
| `TEMP-SC-003` | Source grep for removed old rendered copy/presentation strings in the active changed frontend paths | Old active rendered `Change run default(s)`, team-member `Auto-execute`, and workspace success text do not reappear in the current changed path | Investigation/source-audit evidence only; durable negative assertions remain in component tests where relevant. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser-driven/manual UI E2E against running Nuxt/Electron | The changed boundaries are localized Vue component DOM behavior and Pinia store materialization paths; existing test harnesses directly exercise those boundaries without external services | Low | None for this task. Delivery may still perform visual/user verification under its normal hold. |
| Backend server GraphQL execution | Backend/server code/schema unchanged; frontend first-send GraphQL payload and missing-model pre-mutation rejection are covered | Low | None for this task. |
| Broad TypeScript check | Prior implementation/code review documented pre-existing broad project/test type noise unrelated to this change; targeted Vitest compiles/executes changed paths successfully | Low for scoped change | No API/E2E blocker; track broad TS cleanup separately if desired. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before validation execution | N/A | Requirements/design decide layout, copy, field indicators, expansion, reset, readiness, and materialization semantics; code review has no unresolved findings | N/A |

## Execution Plan

1. Update only the existing repository-resident durable coverage file `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` for `DCU-MEMBER-001` and `DCU-MEMBER-002`.
2. Execute targeted Vitest coverage for `AgentRunConfigForm`, `TeamRunConfigForm`, `MemberOverrideItem`, `WorkspaceSelector`, `RunConfigPanel`, `ModelConfigSection`, `teamRunConfigPresentation`, `teamRunConfigUtils`, `agentTeamContextsStore`, and `agentTeamRunStore`.
3. Execute `guard:web-boundary`, `guard:localization-boundary`, `npx --yes node@22 ./scripts/audit-localization-literals.mjs`, `git diff --check`, manual trailing-whitespace scan, and source grep evidence for removed active strings.
4. Persist the refreshed round 4 execution coverage report.
5. Because API/E2E will update repository-resident durable coverage after code review round 7, route the cumulative package back to `code_reviewer` for a narrow coverage-code re-review if execution passes.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Prior round 3 API/E2E evidence is stale and replaced by this round 4 plan. No stale repository-resident tests require removal. API/E2E will add focused member override durable assertions, so a post-execution coverage-code re-review by `code_reviewer` is required before delivery resumes.
