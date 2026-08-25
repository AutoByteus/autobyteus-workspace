# UI/UX Specification

## Status (`Draft`/`Requirements-ready`/`Refined`)

Refined — approved with `requirements.md` on 2026-08-25 and re-approved after architecture finding F-001. The stopped existing-Team surface does not add Reset-to-inherited.

## UX Goal

Let users revise the selected model's Thinking/advanced settings only after an existing standalone or team run is stopped, without implying that its runtime, model, workspace, or definition can change. Keep active configuration locked, make the explicit Stop-then-edit-then-Save workflow obvious, and reuse automatic resume on the next message.

## Related Requirements And Acceptance Criteria

- Requirements: REQ-002–REQ-005, REQ-008, REQ-010–REQ-012.
- Acceptance criteria: AC-001–AC-014 and AC-016.

## Users / Personas / Contexts

- A user tuning cost/latency/reasoning quality between turns on a long-lived standalone run.
- A user switching a Codex run between Default and Fast service tier or changing reasoning effort.
- A user changing AutoByteus or Claude model thinking/reasoning settings between turns.
- A team operator changing root defaults or configured nested-team/member settings without recreating the team run.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Standalone user | Existing run is inactive/offline | Change supported model settings | New config saved; run remains inactive; draft clean | REQ-001, REQ-002, REQ-004–REQ-007; AC-001, AC-012–AC-014 |
| UXJ-002 | Standalone user | Existing run is active, including active-idle | Stop it, then change Codex/AutoByteus/Claude model settings | Config saved while stopped; run remains ready for automatic resume | REQ-002, REQ-004–REQ-007, REQ-011; AC-002–AC-004, AC-016 |
| UXJ-003 | Team operator | Existing root is active or stopped | Stop the root if needed, then change root/nested-team/configured-agent model settings directly | Narrow team changes saved without a stopped-run Reset action; root remains stopped | REQ-003–REQ-008, REQ-015; AC-005–AC-008, AC-015 |
| UXJ-004 | Any user | Draft exists but eligibility/catalog/server result changes | Avoid unsafe save or accidental persistence | Draft retained on Save rejection, or dropped on navigation; canonical config/state reconciled | REQ-005, REQ-009–REQ-014; AC-003, AC-004, AC-008–AC-013 |

## Journey Details

### UXJ-001 — Inactive standalone edit

1. User selects a stopped/inactive Agent Run and opens **Agent Configuration**.
2. Runtime, model, workspace, definition, Auto approve tools, and other fixed controls remain disabled.
3. A compact notice says: **“This run is stopped. Model settings will be used when it resumes.”**
4. Current-schema Thinking and Advanced controls are enabled. The user changes one or more values.
5. The footer location that showed **Run Agent** before launch now shows one primary **Save** button for the selected existing run.
6. Save changes to `Saving…`; controls and duplicate submit are disabled.
7. Success announces **“Model settings updated. They will be used when this run resumes.”** The form refreshes to canonical values and becomes clean.

### UXJ-002 — Stop an active standalone run, then edit

1. User selects any active Agent Run. The full configuration remains locked, including Thinking/advanced settings, and the selected-run **Save** action is disabled.
2. A compact notice says: **“Stop this run before changing model settings.”** The existing Stop workflow remains the only way to end the active runtime.
3. After Stop completes and authoritative state becomes Offline/Stopped, model-setting controls unlock and the footer offers Save.
4. User changes settings and saves. Save does not stop or start a runtime. The next message resumes the same run automatically.

### UXJ-003 — Team edit

1. User selects an existing Team Run and opens **Team Configuration**.
2. Root model settings appear first. **Team member overrides** expands the configured nested-team/member tree.
3. Runtime/model/workspace/auto controls remain disabled at every scope; only model settings are editable.
4. Each non-root scope may display `Inherited` or `Customized` as a descriptive draft-start state using REQ-008's value-based rule. The stopped existing-run editor offers no **Reset to inherited** action, including when fixed runtime/model differs from the parent.
5. Parent changes use REQ-008's draft-start matching-propagation rule without adding a new impact-preview workflow. A divergent or already-directly-edited branch remains unchanged and can be edited directly using its own fixed model's schema. A direct edit after propagation overrides that scope's propagated value.
6. The whole root must be stopped. While it is active—even if all members appear idle—the form stays locked with **“Stop this team before changing model settings.”**
7. Successful Save refreshes the stored execution-tree projection and leaves the root Offline/Stopped.

### UXJ-004 — Recovery and unsaved navigation

1. If a stopped run is restored by a message while a draft is open, inputs and Save become unavailable and the form relocks.
2. After it is stopped again, the UI reloads canonical values; an earlier draft rejected by the server remains visible only long enough to explain the rejection and must not be treated as canonical.
3. Validation errors appear next to the relevant control and in an alert summary. No active runtime is stopped.
4. Catalog failure preserves stored values, disables editing, and offers **Retry model options**.
5. Save failure preserves the draft unless canonical reconciliation proves a different value committed. An indeterminate outcome blocks further Save until refresh finishes.
6. Back/navigation does not save local edits. Reopening the configuration shows canonical stored values.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| `RunConfigPanel` launch/selected modes | Host configuration and its contextual footer action | A new draft or persisted run/team is selected | launch `Run Agent`/`Run Team`; selected active locked/disabled `Save`; selected stopped clean/dirty/saving `Save` | Run before launch; Stop active run elsewhere; Save after stop |
| `AgentRunConfigForm` | Show fixed launch facts plus stopped-only editable model settings | Standalone selected | active locked; stopped schema loading/error/unavailable/dirty | Stop while active; Save through panel after stop |
| `TeamRunConfigForm` | Show root and configured-member stopped-only model-setting scopes | Team selected with stored execution tree | active-root locked; stopped member expansion/dirty/saving; descriptive inheritance badge but no Reset | Stop root while active; edit a scope directly; Save through panel after stop |
| `RuntimeModelConfigFields` | Separate fixed runtime/model presentation from editable `llmConfig` | Current runtime/model known | runtime/model fixed; model config editable/disabled | Emit draft `llmConfig` only |
| `ModelConfigSection` | Schema-driven Thinking and advanced parameters | Current model schema loaded | enabled, unsupported, historical residual, validation error | Update draft |
| Save footer | Commit the local model-setting draft | Selected existing run | disabled/no-op, saving, reconciling, success/failure | Save |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Eligible inactive, clean | Change model setting | Control updates; Save enables if valid | Dirty | Local draft only | Save, continue edit, leave without saving |
| Dirty | Save | Button label `Saving…`; controls disabled | Saving | Server validates and claims lifecycle transition | Wait |
| Save success | Server returns canonical result | Success status announced | Clean, inactive/offline | Canonical config/status replaces draft | Send next message; edit again |
| Active/active-idle selected | Open configuration | `Stop this run/team before changing model settings.` | Entire form locked; selected-run Save visible but disabled | None | Use existing Stop action |
| Divergent or directly edited Team scope | Expand the stopped scope, edit it directly, or edit an ancestor | Scope remains/becomes `Customized`; its own model controls use its fixed runtime/model; no Reset action is shown | Directly editable locally; later ancestor propagation stops before this branch | Local draft changes only; a later direct edit overrides an earlier propagated value | Edit directly, Save, or leave |
| Restore begins before Save | Status update/server rejection | `This run resumed before settings were saved. Stop it and try again.` | Form relocked | No persisted change | Stop, reopen/reload, edit again |
| Save claims before restore | Concurrent message | Saving continues; message waits or retries | Saving then stopped/clean | Config atomically persists | Message resumes after save or user retries |
| Client/server validation failure | Save or response | Field messages + alert summary | Dirty, editable | No stop, no persisted change | Correct or leave without saving |
| Catalog loading | Open/refresh | `Loading model options…` status | Read-only model config | No normalization or persistence | Wait |
| Catalog error | Load fails | Error alert + Retry | Read-only model config | Stored values preserved | Retry |
| Historical/unrepresentable value | Schema loaded without current representation | Stored value shown as unavailable | Read-only affected config; Save unavailable | None | Retry catalog if relevant |
| Persistence failure | Server result | Error explains settings were not saved | Reconciled stopped state; draft/canonical difference explicit | Canonical reread | Retry or leave without saving |
| Indeterminate persistence | Server result | `Update outcome is being verified…` alert/status | Inputs and Save blocked | Canonical reconciliation | Wait/retry refresh |
| No-op draft | Values equal canonical | Dirty state clears | Save disabled | None | Continue edit/back |
| Unsaved navigation | Back/select another run | Normal navigation | Draft is discarded | No persisted change | Reopen canonical configuration |

## Markdown Wireframes / Visual Structure

### Existing standalone run

```text
Agent Configuration                                      [←]

Agent Definition
[ Research Agent                                      🔒 ]

Runtime
[ Codex App Server                                    🔒 ]

LLM Model
[ OpenAI / GPT-5.6-Luna                               🔒 ]
  Runtime and model are fixed for this existing run.

Thinking                                           [ on ]
Advanced  ˄
  Reasoning Effort                      [ high          ]
  Fast mode                             [ Fast          ]

[shown only after the existing Stop action completed]
This run is stopped. Saved settings are used when it resumes.

Workspace / Auto approve tools / other fixed fields       🔒

                                                    [Save]
```

Before this run was launched, the same footer location used `[Run Agent]`.

### Existing team run

```text
Team Configuration                                       [←]

Team Definition
[ Software Engineering Team                           🔒 ]

Root model settings
Runtime [Codex App Server 🔒]   Model [GPT-5.6-Luna 🔒]
Thinking [on]  Reasoning [medium]  Fast mode [Default]

Team member model settings (4)                         [⌄]
  /implementation_engineer       Inherited
  /code_reviewer                 Customized
  /test_team                     Inherited                   [⌄]

This team is stopped. Saved settings are used when it resumes.
                                                    [Save]
```

Before this team was launched, the same footer location used `[Run Team]`.

## Non-Happy-Path States

### Loading

- While run config/editability loads, render a non-interactive skeleton or status; do not briefly enable controls based on stale local state.
- While runtime-scoped model options load, retain fixed runtime/model text and stored model values; announce `Loading model options…`.
- During Save, preserve layout, show one progress status, disable inputs/actions, and prevent a second submission.

### Empty

- If the fixed model has no configurable schema, show **“This model has no adjustable settings.”** The selected-run Save action remains disabled.
- If a team has no configurable members beyond root, omit the member section.

### Error And Recovery

- Field validation errors are placed adjacent to controls and referenced by `aria-describedby`.
- Server errors use a `role="alert"` summary without clearing the draft.
- Catalog errors provide Retry; update failures provide Retry only after lifecycle/canonical reconciliation.
- If the selected run disappears, show **“This run is no longer available.”** and offer return to history; do not keep an editable orphan draft.

### Disabled / Unavailable

- Fixed fields use disabled/read-only styling plus text, not color alone, to communicate immutability.
- Every active state uses the same clear boundary: `Stop this run before changing model settings` or `Stop this team before changing model settings`.
- If automatic restore begins before Save, the form relocks and explains that the run must be stopped again.

### Permission / Authentication

No new role/permission model is introduced. Existing access to the selected run configuration governs access to this operation. Authentication/authorization failures use the standard GraphQL error path and do not alter the draft or stored config.

## Responsive And Platform Behavior

- In narrow panels, the Save button remains full-width or naturally fits the existing footer.
- Labels and selected values wrap rather than overflow; team addresses may truncate visually but retain full `title`/accessible text.
- The Save footer remains reachable after long team/member forms and follows the panel's existing footer layout.

## Accessibility And Keyboard Behavior

- All editable inputs, disclosure buttons, Retry, and Save are reachable and operable by keyboard.
- Disabled native controls are not focus targets; their fixed value and lock explanation remain available as text.
- Advanced/member disclosures expose `aria-expanded` and `aria-controls`.
- Saving uses `aria-busy="true"` on the form/action region and a polite live region for progress/success; rejections/failures use `role="alert"`.
- Status and inheritance are not communicated by color alone.

## Content, Labels, And Validation Messages

- Primary action: **Save**
- Fixed-field help: **Runtime and model are fixed for this existing run.**
- Inactive notice: **This run is stopped. Saved model settings will be used when it resumes.**
- Active standalone: **Stop this run before changing model settings.**
- Active team: **Stop this team before changing model settings.**
- Restore race rejection: **This run resumed before settings were saved. Stop it and try again.**
- No schema: **This model has no adjustable settings.**
- Catalog error: **Model options could not be loaded. Saved settings were not changed.**

## Data And API Dependencies

- Authoritative standalone/team resume configuration, lifecycle status, and model-setting editability.
- Runtime-scoped model catalog/schema for the fixed runtime/model.
- Narrow standalone and team Save operations returning canonical config, lifecycle/editability, outcome/error code, and reconciliation state.
- Existing status/event refresh and inactive-run automatic restore paths.

## Out Of Scope

- Editing runtime/model identity or any non-`llmConfig` field.
- Editing reusable definitions from this surface.
- Editing transient task executions.
- Porting the pre-launch Team `Reset to inherited` action into stopped existing-run editing.
- Live progress granularity beyond what the update operation can truthfully report.
- New visual design system components when existing form, alert, disclosure, and button patterns suffice.

## Open Decisions / Risks

- Stopped-only editing and the contextual Run-to-Save interaction were approved by the user on 2026-08-25. Save never stops or interrupts an active runtime.
- The stopped Team Configuration may retain descriptive inherited/customized badges, but adds no Reset-to-inherited action. A direct scope edit uses that scope's fixed model; a parent/default edit flows only through the REQ-008 value-matching chain. Existing pre-launch Reset behavior remains unchanged.
- Effective support across AutoByteus, Codex, and Claude is approved; the missing Claude `llmConfig` execution bridge is required behind the same UI.
- A current schema can become unavailable after a draft begins; canonical stored data must win and the draft must not be auto-sanitized.

## Approval Status

Approved on 2026-08-25 with `requirements.md` and re-approved after F-001. The UI remains locked until the user manually stops the standalone run or entire root Team; the stopped form reuses the existing hierarchy, enables only model-setting controls, adds contextual Save, adds no Reset-to-inherited action, and leaves the run/team stopped after Save.
