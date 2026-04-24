# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined.

## Goal / Problem Statement

Historical/existing agent and agent-team run configuration screens currently appear editable even though there is no save/apply behavior for changing an already-created run. This creates a misleading UX: users can manipulate runtime, model, reasoning/thinking, workspace, auto-approve, skill access, and team-member override controls even though those edits are not meant to alter the historical run.

The frontend must make existing run configuration inspect-only for both agent runs and team runs, while still letting users expand and inspect model/thinking details that were persisted by the backend.

## Investigation Findings

- The right-side run configuration panel has two modes:
  - New-run configuration mode, backed by launch stores and intended to be editable.
  - Existing/historical run selection mode, identified by `selectedRunId`, backed by active run/team context config and intended for inspection.
- Existing run selection mode currently reuses the same forms used by editable launch configuration, so controls can remain enabled unless the run config itself is locked.
- Runtime/model fields normalize and emit default values on mount/update. In read-only historical mode this can create misleading local mutations even without a save button.
- Advanced model-thinking controls are collapsible. If collapsed for a historical run, users cannot easily verify persisted reasoning values such as `reasoning_effort: xhigh`.
- Previous browser evidence showed the clean-base UI with an existing team run selected had enabled controls and no read-only notice, while the split frontend UX patch disables controls and shows persisted `xhigh` values when backend metadata contains them.

## Recommendations

Implement this as a frontend-only UX change:

1. Detect existing/historical selection mode in `RunConfigPanel` and pass explicit `readOnly` state into the agent and team config forms.
2. Disable and guard all form controls and emitted mutations while in read-only mode.
3. Add a clear read-only notice for selected existing agent runs and selected existing team runs.
4. Keep model advanced/thinking sections expanded or expandable in read-only mode so persisted model-thinking values are visible.
5. Display backend-provided reasoning values such as `reasoning_effort: xhigh` exactly as provided by the current run config.
6. Do not add backend recovery, metadata materialization, Codex history probing, resume API changes, or persistence semantics in this ticket.

## Scope Classification (`Small`/`Medium`/`Large`)

Small.

## In-Scope Use Cases

- UC-HRC-UX-001: A user selects an existing/historical single-agent run and opens its run configuration panel.
- UC-HRC-UX-002: A user selects an existing/historical agent-team run and opens its team run configuration panel.
- UC-HRC-UX-003: A selected historical run has backend-provided model-thinking config such as `llmConfig: { "reasoning_effort": "xhigh" }`.
- UC-HRC-UX-004: A selected historical run has missing/null model config metadata. The frontend may show an explicit missing/not-recorded display state, but must not infer, recover, or materialize a value.
- UC-HRC-UX-005: A user configures a new agent or team run. New-run configuration must remain editable.

## Out of Scope

- Backend recovery or inference of missing `llmConfig` from Codex, Claude Code, AutoByteus runtime history, thread history, runtime logs, or global defaults.
- Backend materialization/persistence of effective model-thinking config at run creation time.
- Database or metadata backfill for old rows.
- Resume-runtime behavior, workspace resume behavior, and runtime/model switching semantics for resumed runs.
- Save/apply support for editing historical runs.
- Any non-frontend source changes outside the run configuration UX.

## Functional Requirements

- REQ-HRC-UX-001: Existing/historical agent run configuration must be inspect-only in the frontend.
- REQ-HRC-UX-002: Existing/historical team run configuration must be inspect-only in the frontend, including global team config and team-member override controls.
- REQ-HRC-UX-003: Existing/historical run configuration must show a clear read-only notice explaining that the selected existing run can be inspected but not edited.
- REQ-HRC-UX-004: Existing/historical run configuration must keep model advanced/thinking sections visible, expanded by default, or otherwise readily expandable in read-only mode.
- REQ-HRC-UX-005: If backend-provided run config includes a reasoning value such as `llmConfig.reasoning_effort = "xhigh"`, the frontend must display that value in read-only mode.
- REQ-HRC-UX-006: Read-only mode must not mutate the selected historical config through user interaction handlers or through runtime/model normalization emissions.
- REQ-HRC-UX-007: New-run configuration mode must remain editable and retain the existing launch configuration behavior.
- REQ-HRC-UX-008: This ticket must not introduce backend recovery, backend materialization, persistence backfill, or resume/runtime semantics.
- REQ-HRC-UX-009: If backend metadata lacks model-thinking config, the frontend may display an explicit not-recorded/missing state, but it must not claim a recovered or inferred value.

## Acceptance Criteria

- AC-HRC-UX-001: With an existing agent run selected, the run config form renders disabled runtime/model/workspace/auto-approve/skill controls and guards their update handlers.
- AC-HRC-UX-002: With an existing team run selected, the team config form renders disabled global runtime/model/workspace/auto-approve/skill controls and disabled member override controls, and guards their update handlers.
- AC-HRC-UX-003: Existing agent and team run config forms show localized read-only notices.
- AC-HRC-UX-004: Existing run mode does not show the launch/run button, preserving the distinction between inspecting an old run and configuring a new one.
- AC-HRC-UX-005: Existing run mode passes `readOnly` into runtime/model fields so normalization and model update events cannot write back to historical config.
- AC-HRC-UX-006: Advanced/thinking controls are expanded or visibly inspectable in read-only mode for agent, team-global, and team-member override config.
- AC-HRC-UX-007: A persisted backend value `reasoning_effort: xhigh` is visible in read-only mode for the applicable agent/team/member model config.
- AC-HRC-UX-008: New agent/team launch configuration remains editable and continues to emit/store launch config updates.
- AC-HRC-UX-009: The diff for this ticket contains no backend source, database, metadata-store, runtime-history, or resume-service changes.
- AC-HRC-UX-010: Focused frontend unit tests and localization guards pass for the changed config components.

## Constraints / Dependencies

- The frontend receives historical run config from the existing stores/contexts and GraphQL/resume config flows. This ticket consumes that data as-is.
- The backend source of truth for whether `llmConfig` is present or null is intentionally unchanged.
- Existing localization boundaries require new user-facing strings to live in localization message files.
- Team-member override display must respect existing team definition/member resolution utilities.

## Assumptions

- The user-approved scope is frontend-only and can proceed separately from the backend/root-cause ticket.
- The correct UX for historical rows is inspect-only unless a future, explicit edit-and-save feature is designed.
- Showing an explicit not-recorded state for null metadata is acceptable as frontend-only transparency because it does not infer or recover the missing value.

## Risks / Open Questions

- Backend/root-cause issue remains open for a later ticket: why some historical run metadata may have `llmConfig: null` despite a runtime using an effective thinking setting.
- If product later decides to support editing historical/resumed run configuration, that should be a separate design because it requires save/apply semantics and backend/runtime support.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case Coverage |
| --- | --- |
| REQ-HRC-UX-001 | UC-HRC-UX-001 |
| REQ-HRC-UX-002 | UC-HRC-UX-002 |
| REQ-HRC-UX-003 | UC-HRC-UX-001, UC-HRC-UX-002 |
| REQ-HRC-UX-004 | UC-HRC-UX-001, UC-HRC-UX-002, UC-HRC-UX-003 |
| REQ-HRC-UX-005 | UC-HRC-UX-003 |
| REQ-HRC-UX-006 | UC-HRC-UX-001, UC-HRC-UX-002 |
| REQ-HRC-UX-007 | UC-HRC-UX-005 |
| REQ-HRC-UX-008 | All use cases; scope guard |
| REQ-HRC-UX-009 | UC-HRC-UX-004 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-HRC-UX-001 | Agent historical config cannot be edited by UI interaction. |
| AC-HRC-UX-002 | Team historical config, including member overrides, cannot be edited by UI interaction. |
| AC-HRC-UX-003 | User understands why controls are disabled. |
| AC-HRC-UX-004 | Historical inspection is not confused with launching a new run. |
| AC-HRC-UX-005 | Read-only mode prevents implicit write-back from field normalization. |
| AC-HRC-UX-006 | User can inspect thinking/model details without needing editable controls. |
| AC-HRC-UX-007 | Persisted `xhigh` reasoning is shown when backend provides it. |
| AC-HRC-UX-008 | Existing launch flows are not regressed. |
| AC-HRC-UX-009 | Scope remains frontend-only. |
| AC-HRC-UX-010 | Changed components have focused executable coverage. |

## Approval Status

Approved by user in chat on 2026-04-24 with explicit scope: `Historical run config read-only UX`, frontend UX only, existing agent/team run config inspect-only, read-only notice, advanced/model-thinking visible, show backend-provided `xhigh`, and no backend recovery/materialization semantics.
