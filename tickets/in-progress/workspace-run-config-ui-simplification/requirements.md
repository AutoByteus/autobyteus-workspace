# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined / Design-ready — third delivery-verification re-entry revision captured on 2026-07-01 11:38 PDT.

## Goal / Problem Statement

Improve the AutoByteus Workspace team-run configuration UI so common team launch defaults are visible and easy to edit, member overrides are available without overwhelming the form, and the final launch action shows enough context for a confident `Run Team` click.

The first and second re-entry rounds improved grouping, default-open team run defaults, direct config summary display, exact `Edit Team Default` copy, helper-text density, and single-row advanced display. The third delivery-stage user verification identified additional layout and member-override clarity gaps that must be resolved before finalization:

1. Remove the outer bordered container around the `Team Definition` group; use typography, spacing, and child-card indentation to express hierarchy.
2. Merge the `Team run defaults` summary card and expanded editor card into one card with an internal expanded area/divider.
3. Move team-level `Auto approve tools` before `Team member overrides`, ideally inside/near team defaults, and align its toggle with the title row while placing description below the title.
4. Remove redundant green `Workspace: Temp Workspace` success text from workspace selection.
5. Add a compact team launch summary above/near the `Run Team` button, such as member count, runtime, and model.
6. Restyle the `Existing` / `New` workspace segmented control as a left-aligned, content-width pill with a stronger selected state.
7. Rename member-level `Auto-execute` to `Auto Approve Override`, replace the ambiguous tri-state checkbox/icon with an explicit three-state selector (`Use global` / `Yes` / `No`), and explain that it follows or overrides team `Auto approve tools`.
8. Redesign expanded member override cards as one-line collapsible summaries with multiple independent expansions, field-level override indicators, and `Reset to default`.
9. Fix misleading unsupported/non-configurable Thinking display so a non-toggleable/unsupported Thinking state is not shown as highlighted on.

The UI must still preserve launch semantics: team runs require an effective model before launch, per-member records must still materialize complete runtime/model/config values, and member overrides must remain stored in the existing `MemberConfigOverride` shape.

## Investigation Findings

- Current round-3 code is on branch `codex/workspace-run-config-ui-simplification` in worktree `/Users/bingq/.autobyteus/server-data/temp_workspace/autobyteus-workspace-run-config-ui-simplification`, tracking `origin/personal` at HEAD `4331f1013cbefbf6409d6c45b269ee31ca9da562` with unfinalized ticket changes.
- `TeamRunConfigForm.vue` still wraps the team-name, defaults, and member-overrides area in `class="space-y-4 rounded-lg border border-slate-200 bg-white p-4"`; the user now wants no outer border container.
- `TeamRunConfigForm.vue` renders `TeamRunDefaultsSummary.vue` and a separate white editor card. The user wants the summary and editor merged into one card.
- `TeamRunConfigForm.vue` currently places `Auto approve tools` after `WorkspaceSelector`; member override rows still refer to a global auto-execute value before the user sees that global setting. The user wants team auto approve moved before member overrides.
- `WorkspaceSelector.vue` is shared by agent and team run forms. It currently renders full-width equal segmented buttons and a green success line such as `Workspace: Temp Workspace`. Both are presentation-only and can be corrected in the shared component.
- `RunConfigPanel.vue` owns the sticky footer and `Run Team` button. It has access to effective team config and active team definition, so it is the correct place to render a compact launch summary above the button.
- `MemberOverrideItem.vue` currently renders full edit controls whenever the member override tree is open, including a tri-state checkbox whose labels still say `Auto-execute`. The user wants each member item to own its own collapsed/expanded state and clearer override-specific controls.
- `MemberOverrideTree.vue` owns the recursive member list and forwards member override updates. It can continue to recurse while `MemberOverrideItem.vue` owns each leaf row/card expansion.
- `ModelConfigSection.vue` and `ModelConfigBasic.vue` own Thinking switch display for team defaults, agent defaults, and member override rows. The unsupported/non-configurable Thinking visual correction should be shared there to avoid duplicating thinking-state semantics in member cards.
- Existing launch-readiness and materialization boundaries remain appropriate and are not part of this UX-only re-entry.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI Cleanup rework with a local display bug correction for non-configurable Thinking.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes. Third feedback changes form information architecture, component composition, member item expansion behavior, local/shared presentation boundaries, and launch-footer context.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Localized UI presentation and file-responsibility drift risk in `TeamRunConfigForm.vue` and `MemberOverrideItem.vue`; shared display defect risk in `ModelConfigSection.vue`/`ModelConfigBasic.vue` for non-configurable Thinking visuals. No backend launch-domain issue.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, bounded to frontend UI components, presentation utilities, localization, tests, and docs.
- Evidence basis: User verification feedback 3 explicitly requests layout hierarchy changes, merged card composition, workspace selector restyling, footer summary, member auto-approve override redesign, collapsible member cards, reset behavior, and Thinking visual correction. Current code maps those concerns to existing UI owners.
- Requirement or scope impact: Add third re-entry requirements while preserving prior information architecture, exact copy, direct config summaries, scoped helper suppression, single-row advanced behavior, readiness, and launch materialization semantics.

## Recommendations

- Use the final top-level form order: `Team Definition` -> `Workspace Directory` -> `Skill Access` -> sticky launch footer. Team-level `Auto approve tools` moves inside the `Team run defaults` card before `Team member overrides`.
- Remove the team group outer border; use a top-level section title matching `Workspace Directory`/`Skill Access`, with child cards slightly indented under `Team Definition`.
- Make `TeamRunDefaultsSummary.vue` the card shell for the defaults summary plus an expanded-content slot/body. `TeamRunConfigForm.vue` supplies `RuntimeModelConfigFields` and team `Auto approve tools` as the expanded body.
- Apply workspace segmented-control styling in `WorkspaceSelector.vue` itself because both current users should share the cleaner workspace selector.
- Remove green workspace success text globally from `WorkspaceSelector.vue`; keep errors, locked messages, and existing-mode guidance.
- Add a team-only compact footer summary in `RunConfigPanel.vue`, backed by a pure presentation helper so the footer does not duplicate formatting logic.
- Let `MemberOverrideItem.vue` own independent leaf-card expansion and reset behavior; keep `MemberOverrideTree.vue` as the recursive list owner.
- Represent member auto approve override as explicit persisted tri-state values mapped to existing data: `Use global` -> `autoExecuteTools` omitted, `Yes` -> `true`, `No` -> `false`.
- Correct non-configurable Thinking switch visual in `ModelConfigSection.vue`/`ModelConfigBasic.vue` so display semantics stay shared and consistent.

## Scope Classification (`Small`/`Medium`/`Large`)

Large within frontend UI scope.

## In-Scope Use Cases

- Open a new editable team run and see a clean, borderless top-level hierarchy with indented team child cards.
- See a single `Team run defaults` card whose summary and expanded editor are visually unified.
- See/edit team `Auto approve tools` before any member override controls.
- Open the workspace selector and see a compact left-aligned segmented control without redundant green selected-workspace text.
- Review member count, runtime, and model near the `Run Team` button before launching.
- Open member overrides and see one-line member summaries before expanding individual member edit forms.
- Expand multiple member override cards independently.
- Identify exactly which member fields are overridden.
- Clear all overrides for one member with `Reset to default`.
- Set member auto approve override explicitly to `Use global`, `Yes`, or `No` with explanatory copy.
- See unsupported/non-configurable Thinking display as disabled neutral rather than highlighted active.
- Preserve read-only selected/historical inspection with disabled controls and no mutation.

## Out of Scope

- Changing backend `TeamMemberConfigInput` or `MemberConfigOverride` schema.
- Introducing a launch mode that omits per-member `llmModelIdentifier`.
- Adding new runtimes, providers, model discovery behavior, or schema definitions.
- Persisting run-level edits back into the team definition.
- Adding member-level workspace or skill-access overrides; these fields do not exist today.
- Redesigning unrelated running-team monitoring surfaces.
- Replacing all segmented controls in the product; this scope only updates `WorkspaceSelector.vue`.
- Changing launch readiness or per-member materialization semantics.

## Functional Requirements

- `REQ-001`: The team-run form must present a clear top-level section order: `Team Definition`, `Workspace Directory`, `Skill Access`, then the sticky launch footer.
- `REQ-002`: The `Team Definition` section must not use an outer bordered card/container around all team-related content; hierarchy must be expressed through section title typography, spacing, and child-card indentation.
- `REQ-003`: The selected team definition, `Team run defaults`, and `Team member overrides` must remain in that order within the `Team Definition` section.
- `REQ-004`: `Team run defaults` must be expanded by default for editable new/draft team runs so runtime/model/default config controls are immediately available.
- `REQ-005`: `Team run defaults` must be one unified card: summary/header and expanded editor content must share one outer card shell, with an internal divider/spacing between summary and editor body.
- `REQ-006`: The `Team run defaults` summary/header must directly display current runtime, model, and concrete model-config values.
- `REQ-007`: The run-defaults summary action must not render `Change run defaults` or `Change run default`; the editable open/edit action must render exact English copy `Edit Team Default` with equivalent localized catalog entries.
- `REQ-008`: Team-level `Auto approve tools` must move before `Team member overrides`, preferably inside the `Team run defaults` card as a team-level default inherited by members.
- `REQ-009`: The team `Auto approve tools` toggle must align with its title row; its description must sit below the title rather than vertically centering the toggle against the whole description block.
- `REQ-010`: The `Team member overrides` section must sit after team defaults and remain collapsed at the section level by default for editable new/draft team runs.
- `REQ-011`: Active member overrides must remain visible in collapsed section mode through count and member identity summary.
- `REQ-012`: When the member override section is open, each leaf member item must default to a one-line collapsed summary row showing member name, role label, override status, and an expand/collapse affordance.
- `REQ-013`: Multiple leaf member override cards must be independently expandable at the same time.
- `REQ-014`: Expanded member cards must show field-level override indicators for runtime override, LLM model override, LLM config override, and auto approve override when those fields are explicitly overridden.
- `REQ-015`: Expanded member cards must provide a `Reset to default` control that clears all explicit overrides for that member by emitting/storing no meaningful `MemberConfigOverride`.
- `REQ-016`: Member-level auto approve must be labeled `Auto Approve Override` and represented as a clear three-state selector: `Use global`, `Yes`, `No`.
- `REQ-017`: Member-level auto approve explanatory copy must state that `Use global` follows the team `Auto approve tools` setting and `Yes`/`No` override it for that member.
- `REQ-018`: Member-level override controls must preserve existing runtime override, LLM model override, model config, and auto-approve override semantics and stored data shape.
- `REQ-019`: Launch readiness must continue to block when no effective team model is configured, with a clear required-model state in the defaults summary and the existing footer/blocking-message authority preserved.
- `REQ-020`: Existing launch materialization paths must continue to produce complete per-member launch records with `llmModelIdentifier`, `runtimeKind`, `llmConfig`, auto-execute/auto-approve, skill-access, and workspace values.
- `REQ-021`: Concrete model-config rendering must handle empty config, primitive values, booleans, arrays/objects, and long values predictably using normalized key order and compact truncation/tooltip or equivalent accessible detail.
- `REQ-022`: The helper paragraphs under the team defaults editor's `Runtime` and `Default LLM Model (Global)` controls must remain removed for this form only.
- `REQ-023`: The team defaults editor must continue bypassing the `Advanced` disclosure when, after thinking-toggle-owned keys are excluded, exactly one visible advanced config row remains and `Thinking` is effectively enabled.
- `REQ-024`: The `WorkspaceSelector` Existing/New segmented control must render as a left-aligned content-width pill with a solid dark-blue/white selected state and subtle gray/transparent unselected state.
- `REQ-025`: `WorkspaceSelector` must not render redundant green selected-workspace success text such as `Workspace: Temp Workspace`; errors, locked messages, and existing-mode guidance must remain.
- `REQ-026`: The sticky `Run Team` footer must include a compact team launch summary near/above the button with at least member count, runtime, and model.
- `REQ-027`: Non-configurable or unsupported Thinking must not be displayed as an enabled blue/highlighted switch; it must render as absent or disabled neutral/gray with explanatory text where a row is shown.
- `REQ-028`: Read-only selected team-run configuration must remain inspectable and non-editable; disclosure/expansion defaults may prioritize compact inspection, but field mutation and reset must remain disabled/no-op.

## Acceptance Criteria

- `AC-001`: Given a selected team with a configured default model, when the new team-run form opens, the top-level order is `Team Definition`, `Workspace Directory`, `Skill Access`, then the sticky footer.
- `AC-002`: Given the team form is rendered, `data-test="team-definition-group"` or equivalent team section wrapper has no outer border/card styling around all team content; child cards are visually indented under the `Team Definition` title.
- `AC-003`: Given a new editable team run, when the form opens, `Team run defaults` is expanded and `select#team-run-runtime-kind` is visible without clicking a disclosure.
- `AC-004`: Given `Team run defaults` is expanded, the summary/header and runtime/model editor share one outer card and the editor appears inside an internal expanded area below the summary.
- `AC-005`: Given the user clicks `Hide Team Default`, only the editor/body area collapses; the defaults summary remains in the same card.
- `AC-006`: Given a current `llmConfig` such as `{ reasoning_effort: "high", service_tier: "fast" }`, the defaults summary/header displays concrete config entries such as `reasoning_effort: high` and `service_tier: fast` rather than only `Changed` or `Configured`.
- `AC-007`: Given no `llmConfig`, the defaults summary/header explicitly communicates no custom/default config is set instead of implying hidden configuration.
- `AC-008`: Given the run defaults summary renders an editable open/edit action, the action text is `Edit Team Default`; across all editable summary states, no rendered English text includes `Change run defaults` or `Change run default`.
- `AC-009`: Given the team defaults card is rendered, `Auto approve tools` appears before `Team member overrides` and not as a separate top-level section after workspace.
- `AC-010`: Given `Auto approve tools` is rendered, the toggle aligns with the title row and the description appears below the title.
- `AC-011`: Given no member overrides exist, when the form opens, the member override section is collapsed and the summary indicates all members are using team defaults.
- `AC-012`: Given member overrides exist, when the form opens, the collapsed member summary displays active override count and enough member identity to make hidden overrides discoverable.
- `AC-013`: Given the user opens member override editing, each leaf member first renders as a one-line summary row rather than a full edit form.
- `AC-014`: Given two leaf member rows are expanded by the user, both expanded forms remain open at the same time.
- `AC-015`: Given a member has explicit runtime and auto approve overrides only, the expanded card marks those two fields as overridden and does not mark model/model-config fields as overridden.
- `AC-016`: Given the user clicks `Reset to default` for a member, that member's override entry is removed/cleared and the row status returns to `Using team defaults`.
- `AC-017`: Given a read-only or locked team config, `Reset to default` and member override controls cannot mutate the config.
- `AC-018`: Given a member auto approve override is unset, the selector shows `Use global`; choosing `Yes` stores `autoExecuteTools: true`, choosing `No` stores `autoExecuteTools: false`, and choosing `Use global` removes `autoExecuteTools` from the override.
- `AC-019`: Given the member auto approve selector is visible, explanatory copy or info text states that `Use global` follows team `Auto approve tools`.
- `AC-020`: Given a runtime or model change through the global defaults editor, existing pruning of inherited member-only model/config overrides still occurs.
- `AC-021`: Given the current run default model is missing, the form still blocks launch through the existing readiness path and shows a model-required state that guides the user to edit team defaults.
- `AC-022`: Given read-only selected team-run inspection, runtime/model/default controls and member override controls are inspectable but cannot mutate the selected configuration.
- `AC-023`: Given a long or object-valued config entry, the summary remains compact and exposes enough full value detail through tooltip/title or equivalent accessible text.
- `AC-024`: Given the team defaults editor is visible, there are no helper paragraphs below the `Runtime` select or the `Default LLM Model (Global)` selector, while runtime-unavailable warnings still render when applicable.
- `AC-025`: Given another `RuntimeModelConfigFields` usage outside `TeamRunConfigForm`, existing helper text behavior remains available when that caller passes helper text.
- `AC-026`: Given the team defaults editor renders a schema where `Thinking` is effectively on and exactly one non-thinking advanced field remains, the field is visible directly and `[data-testid="advanced-params-toggle"]` is not rendered for that single-row case.
- `AC-027`: Given the workspace selector is rendered, the Existing/New control is content-width and left-aligned rather than a full-width equal two-column bar, with selected tab solid dark-blue and white text.
- `AC-028`: Given Temp Workspace is selected in the workspace selector, the select field displays it but no green text line `Workspace: Temp Workspace` is rendered below it.
- `AC-029`: Given a team config is ready to run, the sticky footer above/near `Run Team` shows a compact summary with member count, runtime, and model.
- `AC-030`: Given the model has no configurable Thinking support or only a non-toggleable/fixed Thinking representation, the Thinking control is not highlighted blue/on; if shown, it is disabled neutral/gray with explanatory copy.

## Constraints / Dependencies

- Use existing localization catalogs; do not hardcode new user-facing UI copy in Vue templates.
- Keep `RuntimeModelConfigFields.vue` shared and preserve non-team helper behavior.
- Keep `ModelConfigSection.vue` as the owner of schema/advanced/Thinking rendering; do not duplicate thinking-state interpretation in member cards.
- Keep `WorkspaceSelector.vue` shared between agent and team forms; the segmented-control and green-success-text changes apply to both current callers unless implementation uncovers a blocker.
- Preserve `teamRunLaunchReadiness.ts`, `teamRunConfigUtils.ts`, and launch store materialization semantics.
- Preserve existing runtime/model catalog loading and scoped runtime behavior.

## Assumptions

- The exact English copy `Edit Team Default` remains required from the second re-entry.
- Team `Auto approve tools` belongs with team defaults because member auto approve is an override of that team-level value.
- Member card role label can be `Coordinator` for the coordinator and `Agent`/`Member` for other leaf agent members; nested route/breadcrumb can remain secondary text.
- Field-level override indicators apply only to fields that exist in `MemberConfigOverride`: runtime, model, model config, and auto approve.
- The footer launch summary is team-only for this ticket; agent footer summary can be considered separately if desired later.

## Risks / Open Questions

- The exact visual spacing/indentation must be tuned to the existing Tailwind style; acceptance should verify hierarchy rather than one exact pixel value.
- If future member-level fields are added, override indicators should be extended deliberately rather than inferred generically.
- Thinking semantics differ across providers. The safe target is visual honesty: non-configurable/fixed states must not look like user-enabled active switches.
- The compact footer summary must avoid becoming a second readiness owner; it should display readiness-relevant facts but not decide launchability.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases Covered |
| --- | --- |
| `REQ-001`..`REQ-003` | Clean top-level hierarchy and team grouping |
| `REQ-004`..`REQ-007`, `REQ-021`..`REQ-023` | Default-open team defaults, exact copy, concrete config, scoped helper/single-row behavior |
| `REQ-008`, `REQ-009`, `REQ-016`, `REQ-017` | Team auto approve before member auto approve overrides |
| `REQ-010`..`REQ-015`, `REQ-018` | Compact member override list, expansion, field indicators, reset, stored semantics |
| `REQ-019`, `REQ-020` | Readiness and launch materialization preservation |
| `REQ-024`, `REQ-025` | Workspace selector visual refinements |
| `REQ-026` | Footer launch summary |
| `REQ-027` | Thinking display correction |
| `REQ-028` | Read-only/locked inspection safety |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-001`..`AC-005` | Final form hierarchy and merged defaults card |
| `AC-006`..`AC-008`, `AC-024`..`AC-026` | Prior re-entry defaults-summary behavior remains intact |
| `AC-009`, `AC-010`, `AC-018`, `AC-019` | Team/member auto approve relationship is clear |
| `AC-011`..`AC-017`, `AC-020` | Member override UI is compact but functionally equivalent |
| `AC-021`, `AC-022` | Existing readiness/read-only invariants are preserved |
| `AC-027`, `AC-028` | Workspace selector visual changes are verifiable |
| `AC-029` | Launch footer summary is visible before Run Team |
| `AC-030` | Unsupported/non-configurable Thinking no longer looks active/enabled |

## Approval Status

Third re-entry requirements are treated as design-ready based on explicit delivery-stage user verification feedback captured in `delivery-user-verification-feedback-3.md`. Architecture review is required before implementation rework resumes.
