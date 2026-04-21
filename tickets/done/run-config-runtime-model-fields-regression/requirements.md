# Run Config Runtime/Model Fields Regression Requirements

## Status (`Draft`/`Design-ready`/`Refined`)

- `Design-ready`

## Goal / Problem Statement

A post-merge regression on `personal` removed the runtime/model configuration section from the normal **Agent Run** and **Team Run** configuration forms.

The regression was introduced while adding application launch/setup behavior for application-owned runtime orchestration. That application work must not degrade or change the normal platform-owned agent/team run flow.

## Investigation Findings

- The regression path is in shared UI reuse, not backend runtime orchestration.
- `AgentRunConfigForm.vue` and `TeamRunConfigForm.vue` still consume `RuntimeModelConfigFields.vue`.
- `RuntimeModelConfigFields.vue` gained app-specific `showRuntimeField`, `showModelField`, and `showModelConfigSection` props in commit `8009d88f`.
- In the current Vue prop shape, omitted optional boolean props collapse to absent=`false` semantics, so older callers that omit those props now hide runtime/model/model-config sections unintentionally.
- `ApplicationLaunchSetupPanel.vue` still works because it passes the new props explicitly, which proves the regression came from a shared field-policy leak across product surfaces.
- Targeted Vitest coverage for `AgentRunConfigForm` and `TeamRunConfigForm` currently fails on `personal`, confirming the bug is reproducible in the repository state, not only from screenshots.

## Recommendations

- Restore platform run configuration ownership of runtime/model field-presence semantics.
- Keep application launch/setup as its own top-level UI boundary.
- Limit any remaining sharing to lower-level field primitives rather than a mixed wrapper that decides cross-surface field visibility.
- Add durable regression tests so future application setup changes cannot silently remove runtime/model controls from normal agent/team run configuration.

## Scope Classification (`Small`/`Medium`/`Large`)

- `Medium`

## In-Scope Use Cases

- Agent run configuration in the workspace / agent detail run flow.
- Agent team run configuration in the workspace / team detail run flow.
- Application launch/setup UI only where it currently reuses and influences shared runtime/model configuration fields.
- Shared launch-config UI abstractions reused by those surfaces.
- Targeted durable validation for the affected run configuration forms and the application setup boundary.

## Out of Scope

- Backend runtime orchestration changes unrelated to the UI regression.
- Expanding application launch/setup beyond the field-policy boundary cleanup needed to stop the regression.
- Broad redesign of unrelated run configuration sections such as workspace, auto-approve, or skill-access controls.
- New product behavior for application launch defaults beyond preserving the intended limited/locked presentation.

## Functional Requirements

- `requirement_id: R-001` — Agent run configuration shall continue to show runtime selection, model selection, and model-config controls unless the run is explicitly locked by normal run semantics.
- `requirement_id: R-002` — Team run configuration shall continue to show runtime selection, model selection, and model-config controls unless the run is explicitly locked by normal run semantics.
- `requirement_id: R-003` — Application launch/setup behavior shall not be allowed to hide, weaken, or repurpose the normal agent/team run configuration surface through shared component defaults.
- `requirement_id: R-004` — Shared UI components used by both platform run configuration and application setup shall not rely on omitted optional boolean props whose framework default semantics can silently invert visibility.
- `requirement_id: R-005` — The design shall establish a cleaner boundary between platform run configuration UI and application-specific launch/setup UI.
- `requirement_id: R-006` — The preferred target is that application-specific setup owns its own form/component boundary instead of extending the platform run-config component with app-specific visibility toggles.
- `requirement_id: R-007` — If any lower-level UI primitives remain shared, they shall be shared below the level where app-specific field-presence policy is decided.
- `requirement_id: R-008` — The regression fix shall include durable validation so future application setup changes cannot remove runtime/model controls from agent/team run configuration unnoticed.
- `requirement_id: R-009` — Ticket closure shall require the targeted web unit tests covering agent/team run configuration visibility to pass on the branch that ships the fix.

## Acceptance Criteria

- `acceptance_criteria_id: AC-001` — Agent run configuration visibly renders the runtime selector again.
- `acceptance_criteria_id: AC-002` — Agent run configuration visibly renders the model selector again.
- `acceptance_criteria_id: AC-003` — Team run configuration visibly renders the runtime selector again.
- `acceptance_criteria_id: AC-004` — Team run configuration visibly renders the model selector again.
- `acceptance_criteria_id: AC-005` — Application setup still supports its intended limited/default-launch field presentation without depending on hidden-by-default behavior in the shared run-config component.
- `acceptance_criteria_id: AC-006` — The design explicitly explains why application work was able to affect platform run configuration and how the new boundary prevents recurrence.
- `acceptance_criteria_id: AC-007` — The targeted `AgentRunConfigForm` and `TeamRunConfigForm` tests pass in the fixing branch.

## Constraints / Dependencies

- The authoritative workspace is the dedicated ticket worktree at `/Users/normy/autobyteus_org/autobyteus-worktrees/run-config-runtime-model-fields-regression`.
- The current task branch is `codex/run-config-runtime-model-fields-regression`.
- The tracked upstream/base branch is `origin/personal`, and the expected finalization target is `personal`.
- The fix must respect the existing platform run-form behavior except where the regression removed runtime/model controls.
- Validation depends on the existing Vitest coverage under `autobyteus-web/components/workspace/config/__tests__/`.

## Assumptions

- Existing locked-run semantics for agent/team run forms remain valid and do not need redesign in this ticket.
- Application setup still needs a limited/default-launch presentation, but that policy should be owned by the application surface instead of the shared run-config wrapper.
- No backend API contract changes are required to restore the missing runtime/model controls.

## Risks / Open Questions

- The implementation may be tempted to keep a thin shared visibility-policy API in `RuntimeModelConfigFields.vue`; if so, explicit default tests are still required to prevent the same regression class from returning.
- The exact lower-level primitive extraction shape can remain implementation-flexible, but the final code must preserve the boundary that keeps application-specific field policy out of platform run forms.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Case(s) |
| --- | --- |
| `R-001` | Agent run configuration field restoration |
| `R-002` | Team run configuration field restoration |
| `R-003` | Prevent application setup from altering normal platform run configuration |
| `R-004` | Remove unsafe omitted-boolean visibility semantics from shared UI behavior |
| `R-005` | Restore clear platform-vs-application UI ownership |
| `R-006` | Keep application setup on its own top-level component boundary |
| `R-007` | Limit sharing to lower-level stable field primitives |
| `R-008` | Add durable regression validation |
| `R-009` | Gate closure on targeted unit-test pass |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| `AC-001` | User opening Agent Run config can select runtime again |
| `AC-002` | User opening Agent Run config can select model again |
| `AC-003` | User opening Team Run config can select runtime again |
| `AC-004` | User opening Team Run config can select model again |
| `AC-005` | Application setup keeps its constrained field presentation without controlling platform run-config defaults |
| `AC-006` | Downstream reviewers and implementers can see the root cause and the protective boundary change clearly |
| `AC-007` | The targeted branch proves the regression is fixed through executable validation |

## Approval Status

- Resumed from an existing in-progress ticket package on `2026-04-21`.
- The design package is treated as approved for implementation continuation because the user explicitly asked to pick up and continue driving this ticket and the architecture review result is `Pass`.
