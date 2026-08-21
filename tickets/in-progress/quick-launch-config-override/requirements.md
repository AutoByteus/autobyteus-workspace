# Quick-Launch Configuration Override Requirements

## Status (`Design-ready — Approved`)

## Goal / Problem Statement

Correct the existing-run quick-launch behavior so the configuration the user edits in the event-monitor launch panel is the configuration actually used by the new run. The confirmed defect is in team quick launch: a historical/live team execution is flattened into a global configuration plus an explicit override for every member, so a newly selected global model, runtime, model configuration, or auto-approval setting remains visually selected while the launch payload continues to use the old per-member values. The standalone-agent path is currently correct and must remain correct.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | From a selected team run, the header `+` action creates an editable team launch draft. However, the selected run is projected with every member's effective runtime/model/model-config/auto-approval values encoded as explicit overrides. Editing the visible global fields does not replace those old effective values in the member launch records. | Project an existing team execution into a canonical global-baseline-plus-genuine-deltas draft. Global edits must reach every member that inherits that field and must be present in the submitted member launch records and the new execution. | The selected team run supplies the starting effective configuration; the source run and team definition remain unchanged; `Run Team` still creates a separate run. | REQ-001, REQ-002, REQ-003, REQ-005; AC-001, AC-002, AC-005, AC-007 |
| BEH-002 | From a selected standalone-agent run, the header `+` action copies its config into an editable draft; form edits flow into the temporary new-run context and later `PrepareAgentRun` input. Investigation found no stale-source defect in this path. | Preserve this behavior and cover it against regression: the edited runtime/model/model config/workspace/auto-approval values remain on the temporary context and are submitted when the first message prepares the real run. | Standalone runs remain lazy-created: `Run Agent` creates/selects the temporary context; the backend run is prepared on first message. | REQ-001, REQ-006; AC-006 |
| BEH-003 | Because every projected team member is marked overridden, the UI can report overrides even when a member is identical to the chosen global (coordinator) baseline, and those redundant fields shadow later global edits. | Only material per-member differences from the canonical global baseline count as overrides. Members with genuine differing values keep those differences and continue to override only the applicable global fields. | The existing "global unless overridden" interaction model and explicit member-override controls remain unchanged. | REQ-002, REQ-003, REQ-004; AC-002, AC-003, AC-004 |
| BEH-004 | Persisted team execution trees store each member's effective launch configuration. The frontend reads that data to build the selected-run configuration view. | Existing trees remain directly readable. The reader derives a minimal base-plus-delta view without rewriting stored history, while preserving each member's effective launch settings when the draft is not edited. | Execution-tree schema, run-history files, and active/historical run immutability remain unchanged. | REQ-002, REQ-007; AC-002, AC-008 |

## Investigation Findings

- The supported team path is `TeamWorkspaceView.createNewTeamRun` -> `buildEditableTeamRunSeed(activeTeamContext.view.getConfigurationView())` -> `teamRunConfigStore` edits -> `RunConfigPanel.handleRun` -> `agentTeamRunStore.launchDraft` -> `buildTeamRunMemberConfigRecords` -> `CreateAgentTeamRun`.
- `createTeamConfigurationView` in `autobyteus-web/services/teamExecution/teamExecutionContextFactory.ts` chooses the coordinator's effective settings as global fields but also writes every member's complete effective runtime, model, model config, and auto-approval values into `memberOverrides`.
- `buildTeamRunMemberConfigRecords` correctly prefers an explicit member field over the global field. Therefore the redundant projected values legally but incorrectly shadow the newly edited global values.
- A disposable focused Vitest probe reproduced the defect deterministically: a two-member old-model execution was projected, the quick-launch global model/config was changed to `new-model`/`xhigh`, and the produced member launch records remained `old-model`/`low` for both members.
- The supplied run context is consistent with the report. The apparent source team run (`software_engineering_team_915e4b79d07545dcb15945824cf92e41`) and newly created team run (`software_engineering_team_06607b8fd9644de58fb3de3790228d1d`) contain identical `gpt-5.6-sol`/`xhigh` effective settings for every member. Because the intended changed value is not recorded before submission, this is corroborating rather than conclusive evidence by itself. Token-usage state confirms that the new solution-designer runtime actually used `gpt-5.6-sol`, so the result is not only a stale display.
- Existing focused frontend suites passed 91/91 tests. They prove the individual seed/edit/submission pieces but do not cover the projection -> global edit -> member-payload boundary where the defect occurs.
- The standalone-agent source/edit/copy/submission path does not use team member overrides and is supported by the passing focused tests; no corresponding source defect was found.

## Relevant Supplemental Task Artifacts

None. The user-supplied screenshots and disposable probe result are evidence logged in `investigation-notes.md`; intended behavior is fully specified here.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Shared Structure Looseness`
- Refactor posture: `Needed Now`
- Evidence basis: The current team execution projector emits a `TeamRunConfig` whose `memberOverrides` field conflates effective materialized values with genuine deltas. Architecture-level inspection also confirmed that the override type redundantly carries an unused agent definition identity and that model-config equality duplicates a shallower normalizer than the canonical launch-config rule. That representation is then consumed correctly by the draft store and payload builder, producing the wrong user-visible result.
- Requirement or scope impact: The fix must replace redundant all-member overrides with a canonical minimal-delta projection at the existing execution-tree-to-configuration boundary. It must not bypass override semantics in the payload builder or globally clear genuine per-member differences.

## Recommendations

- Keep the coordinator's effective launch configuration as the established canonical global baseline.
- For each member, project only fields that differ from that baseline; omit the member override entirely when it contains no material difference.
- Compare model-configuration records semantically rather than by object identity or key order.
- Keep member identity on the canonical address key/current leaf definition and remove the unused identity field from the setting-delta type.
- Reuse the canonical recursive model-config normalizer instead of retaining a second shallow normalization policy.
- Preserve `teamRunConfigStore` and `buildTeamRunMemberConfigRecords` as the owners of draft edits and effective per-member payload construction; correct their input representation instead of adding submission-time special cases.
- Add a regression test that spans execution-tree projection through a global edit to produced team member launch records.

## Scope Classification (`Medium`)

The source correction is localized to the frontend team execution/configuration projection, but correctness crosses the event-monitor quick-launch entrypoint, immutable team draft, per-member payload builder, post-launch execution view, persisted-history reader, and standalone-agent regression boundary.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Start a new team run from the selected team event monitor, change one or more global launch fields, and launch members with the edited values wherever they inherit globally.
- UC-002: Start a new team run from an existing team without edits and preserve the source run's effective per-member launch settings.
- UC-003: Start from a heterogeneous team, edit global fields, and retain only genuine per-member differences as overrides.
- UC-004: Start a new standalone-agent run from the selected agent event monitor and retain the edited draft through temporary context creation and first-message backend preparation.
- UC-005: Inspect an existing team run's read-only configuration as a canonical effective global-plus-delta view without changing stored history.

### Out of Scope

- Updating or saving agent/team definition defaults from the quick-launch panel.
- Mutating the source run, an already-running execution, or historical run data.
- Adding member-specific workspace or skill-access controls; `TeamRunConfig.memberOverrides` does not currently represent those fields.
- Recovering the original authoring-time distinction between "explicit" and "inherited" when only flattened effective execution settings were persisted. The supported canonical reconstruction uses the coordinator as baseline and material differences as overrides.
- Redesigning the event monitor, moving the `+` action, changing labels, or adding a new save workflow.
- Changing runtime/provider model-update behavior for an already-created run.
- Broadly refactoring the standalone-agent form's existing direct reactive edits; the path is correct for this scope.

### Preserved Behavior Boundary

- Preserve BEH-002's lazy standalone creation lifecycle, BEH-003's genuine override semantics, and BEH-004's stored execution-tree schema and immutability.
- A quick-launch edit is per-run and must never persist back to the selected source run or definition.
- Existing loading, readiness, disabled/pending, and error behavior in `RunConfigPanel` and the team draft owner remains unchanged.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **REQ-001 — Independent editable draft.** The selected agent/team execution may seed a new quick-launch draft, but subsequent draft edits and launch must not mutate the source execution, its stored history, or its definition defaults. Covers UC-001 through UC-004.
- **REQ-002 — Canonical team configuration projection.** When reconstructing `TeamRunConfig` from a stored/live team execution tree, the coordinator's effective runtime, model identifier, model config, auto-approval, skill access, and workspace remain the global baseline. A member override may contain only supported fields whose effective values differ from the corresponding global baseline. An override with no material differing field must be omitted. Covers UC-001, UC-002, UC-003, and UC-005.
- **REQ-003 — Global edit propagation.** Editing a global team runtime, model identifier, model config, or auto-approval setting must affect every member that has no genuine override for that field. Current stale inherited model-config pruning rules must continue to apply when runtime/model changes make inherited config invalid. Covers UC-001 and UC-003.
- **REQ-004 — Genuine override preservation.** A member whose effective field differs from the global baseline must retain that explicit difference through quick-launch seeding, editing of unrelated/global fields, payload construction, and new-run creation. Covers UC-002 and UC-003.
- **REQ-005 — Exact admitted team snapshot.** `Run Team` must submit the selected immutable draft snapshot; the generated `memberConfigs`, server execution tree, hydrated configuration, and runtime-observable model must agree on the resulting effective values. Covers UC-001 through UC-003.
- **REQ-006 — Standalone-agent regression protection.** For an agent quick launch, edited runtime, model, model config, workspace, auto-approval, and supported skill-access values must be copied into the new temporary context and then into `PrepareAgentRunInput`; the source agent run remains unchanged. Covers UC-004.
- **REQ-007 — Existing history remains directly usable.** Current schema-v1 team execution-tree files must be read without migration or rewrite. Canonicalization occurs in the frontend projection and preserves the source tree's effective per-member launch meaning. Covers UC-002 and UC-005.

## Acceptance Criteria

- **AC-001 — Uniform team global edit reaches launch.** Given an existing team whose members all effectively use old global runtime/model/model-config/auto-approval values, when the user quick-launches it and changes those visible global fields, every inheriting member record submitted through `CreateAgentTeamRun` contains the edited values, and the newly hydrated execution tree/configuration reports those values.
- **AC-002 — No-edit round trip preserves effects.** Given any supported existing team execution, projecting it to a quick-launch draft and producing member launch records without edits yields the same effective runtime, model identifier, model config, and auto-approval value for every configured member.
- **AC-003 — Heterogeneous member differences remain.** Given members A and B that match the coordinator baseline and member C that differs in model/runtime/config/auto-approval, after a global edit A and B use the edited global values while C retains only its genuine differing fields; unrelated override fields continue to inherit.
- **AC-004 — Override presentation is truthful.** In both editable and read-only team configuration views, a member identical to the global baseline is not counted or labeled as overridden; a member with at least one material difference is, and its effective displayed values remain correct through inheritance.
- **AC-005 — Source immutability.** After editing and launching a quick-launch draft, the selected source run configuration, execution-tree file, and agent/team definition default launch config are byte-for-byte/logically unchanged by this flow.
- **AC-006 — Standalone-agent edits survive both stages.** Given an existing agent run, after quick-launch editing and `Run Agent`, the selected temporary context contains the edited values; after the first message, `PrepareAgentRunInput` contains the same values and the source context is unchanged.
- **AC-007 — Exact team payload/result agreement.** For a successful team launch, each submitted member's effective configuration equals the matching configured member's `launchConfiguration` in the returned/hydrated execution tree; no submission-time fallback may reintroduce source values.
- **AC-008 — No persisted-data migration.** Existing schema-v1 team histories—including representative uniform and heterogeneous records—load through the new projection without file rewrite, startup migration, data loss, or failure.
- **AC-009 — Existing launch safety states remain.** Pending launch, workspace loading, invalid model/runtime readiness, and read-only selected-run states keep their existing disabled/error behavior; no edit is admitted once the immutable team draft is in flight.

## Constraints / Dependencies

- The authoritative implementation baseline is refreshed `origin/personal` commit `6ceaf2ec5349752d0afb6d9be3326833451a4aca` in `codex/quick-launch-config-override`.
- `TeamRunConfig` represents a global baseline and supported per-member overrides; the server API consumes fully materialized per-member records.
- The execution tree persists only effective member launch settings, not authoring-time inheritance intent. The coordinator baseline plus material deltas is therefore the canonical reconstruction for this UI.
- Model-config equality must use the existing normalized/semantic comparison behavior (`modelConfigsEqual`) rather than reference or raw key-order equality.
- No compatibility wrapper, dual projection, or submission-time exception may be added.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Schema-v1 `memory/agent_teams/<teamRunId>/team_run_execution_tree.json` files and `memory/team_run_history_index.json`; the observed installation has 509 team execution trees.
- Required outcome: `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all execution trees and member effective `launchConfiguration` records unchanged; derive the tighter frontend view at read time.
- Unacceptable data loss or corruption: Any rewrite, deletion, mutation of source run history, or loss of a genuine per-member effective difference.
- Relevant availability, maintenance-window, or rollout constraints: None; the change is a version-agnostic reader projection and requires no maintenance window.
- Related requirement and acceptance-criteria IDs: REQ-002, REQ-007; AC-002, AC-005, AC-008.

## Assumptions

- The event-monitor `+` action is intended to create a per-launch editable copy, not to save definition defaults.
- "Global" means inherited by all members except fields represented by a genuine per-member difference.
- Using the root coordinator's effective settings as the reconstructed global baseline is approved current behavior and remains the least-loss canonical representation available from flattened execution history.
- Empty, `null`, and key-order differences in model config are handled according to current normalizers/equality helpers.

## Risks / Open Questions

- The user approved the canonical reconstruction rule: a projected per-member value equal to the global baseline is inheritance, so later global edits apply to that member; genuinely different values remain explicit overrides.
- A historical execution cannot prove whether an equal member value was deliberately authored as an explicit "freeze" against future changes; no such freeze contract exists in the current UI or persisted schema. The canonical minimal-delta rule intentionally rejects that unobservable distinction.
- The supplied run data records identical source/new values but not the user's pre-submit intended new selection. The deterministic probe confirms the code defect independently.
- Member-specific workspace/skill-access differences are outside the current `TeamRunConfig` override shape and outside this ticket.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-004 |
| REQ-002 | UC-001, UC-002, UC-003, UC-005 |
| REQ-003 | UC-001, UC-003 |
| REQ-004 | UC-002, UC-003 |
| REQ-005 | UC-001, UC-002, UC-003 |
| REQ-006 | UC-004 |
| REQ-007 | UC-002, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance-Criteria ID | Scenario Intent |
| --- | --- |
| AC-001 | Uniform existing team -> edit global fields -> submitted and hydrated values are new |
| AC-002 | Existing team -> no edits -> effective per-member round trip is lossless |
| AC-003 | Mixed team -> edit globals -> inheritors change, genuine differences remain |
| AC-004 | Read/edit UI -> override badge/count corresponds only to genuine deltas |
| AC-005 | Any quick launch -> source run/history/definition remain unchanged |
| AC-006 | Existing agent -> edit -> temporary context -> first-message mutation uses edits |
| AC-007 | Team GraphQL payload -> server execution tree/hydration agree member by member |
| AC-008 | Representative stored schema-v1 histories -> load without migration or rewrite |
| AC-009 | Invalid/pending/read-only states -> existing launch guards remain effective |

## Approval Status

Approved by the user on 2026-08-21. The approved rule is: when reconstructing a quick-launch draft from an existing team, member values equal to the coordinator/global baseline are inheritance (not explicit overrides), while genuinely different member values remain overrides. The user also confirmed that standalone-agent quick launch correctly applies edited model and runtime values and authorized design work under the project design principles.
