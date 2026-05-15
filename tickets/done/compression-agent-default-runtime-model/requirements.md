# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Compression/compaction currently runs through the selected built-in Memory Compactor agent (`autobyteus-memory-compactor` by default). That built-in agent is intentionally seeded with `defaultLaunchConfig: null` so the product does not hard-code a node-specific runtime/model. Today, when compaction is required and the selected compactor agent has no default runtime/model, `CompactionAgentSettingsResolver` throws configuration errors before creating the visible compactor run.

The requested behavior is to make unconfigured compactor runtime/model fields inherit from the currently running parent agent that triggered compaction. Explicit runtime/model values configured on the compactor agent must remain authoritative.

## Investigation Findings

- The built-in Memory Compactor template has `defaultLaunchConfig: null`, so fresh installs select a visible default compactor agent with no runtime/model launch defaults.
- `CompactionAgentSettingsResolver.resolve()` currently reads only the selected compactor agent definition. It throws when `defaultLaunchConfig.runtimeKind` or `defaultLaunchConfig.llmModelIdentifier` is absent.
- `ServerCompactionAgentRunner.runCompactionTask()` uses the resolver output directly to call `AgentRunService.createAgentRun(...)`; this is the authoritative compactor-run creation boundary.
- `AutoByteusAgentRunBackendFactory.buildAgentConfig()` already has the parent run's effective `runtimeKind`, `llmModelIdentifier`, `llmConfig`, and workspace when it creates the per-parent `compactionAgentRunner`, but it currently passes only `agentDefinitionId` and `workspaceRootPath` into the runner factory.
- Existing docs explicitly say there is “no active-model fallback”; this ticket is a product behavior change that supersedes that older decision.
- The settings UI and server setting description currently frame missing compactor runtime/model as “not configured” rather than “inherits from the running agent,” so copy/docs should be updated with the behavior change.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, localized
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with a small boundary-context gap
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, localized to the compaction runner factory/resolver boundary
- Evidence basis: `CompactionAgentSettingsResolver` owns runtime/model resolution but has no parent effective launch context; `AutoByteusAgentRunBackendFactory` owns creation of the parent-bound runner and has that context available.
- Requirement or scope impact: Runtime/model fallback must be centralized in the compaction settings resolver path and not duplicated by callers or UI workarounds.

## Recommendations

- Extend the parent-bound compaction runner factory input to include the parent run's effective runtime kind and model identifier.
- Extend `ServerCompactionAgentRunner` and `CompactionAgentSettingsResolver` so the selected compactor agent's explicit launch config wins, and missing runtime/model fields fall back to the parent run's effective values.
- Keep `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` required: fallback solves missing runtime/model on the selected compactor, not an entirely missing compactor selection.
- Update tests around resolver fallback, runner creation inputs, and explicit compactor override preservation.
- Update docs/settings copy that currently says missing compactor runtime/model fails with no fallback.

## Scope Classification (`Small`/`Medium`/`Large`)

Small-to-medium.

The runtime behavior change is localized, but it crosses the server compaction runner, AutoByteus backend factory injection, unit tests, and durable docs/UI copy.

## In-Scope Use Cases

- UC-001: A running parent agent triggers compaction while the selected built-in Memory Compactor agent has no runtime/model launch defaults.
- UC-002: A running parent agent triggers compaction while the selected compactor agent has explicit runtime/model launch defaults.
- UC-003: A selected compactor agent is partially configured, with one required launch field missing.
- UC-004: A compaction attempt has neither explicit compactor runtime/model nor parent fallback for a required field.
- UC-005: Operators inspect settings/docs and can understand that blank compactor runtime/model fields inherit from the running parent agent.

## Out of Scope

- Adding new runtime providers, model catalogs, or runtime/model selection UI beyond copy clarification.
- Changing compaction prompt/content policy or the compactor JSON output schema.
- Removing the selected compactor-agent setting entirely; the selected compactor definition remains required.
- Introducing hidden/internal compactor runs; compactor executions remain normal visible runs.
- Changing token-budget trigger policy, frontier planning, or memory pruning semantics.

## Functional Requirements

- REQ-001: When the selected compactor agent has explicit valid `defaultLaunchConfig.runtimeKind` and `defaultLaunchConfig.llmModelIdentifier`, compaction must use those explicit values.
- REQ-002: When the selected compactor agent is missing `runtimeKind`, compaction must use the triggering parent run's effective runtime kind.
- REQ-003: When the selected compactor agent is missing `llmModelIdentifier`, compaction must use the triggering parent run's effective model identifier.
- REQ-004: The fallback must be resolved at the authoritative compactor run configuration boundary, not through duplicated caller-specific or UI-specific workarounds.
- REQ-005: If `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is blank or points to a missing definition, compaction must still fail clearly; parent fallback must not invent a compactor definition.
- REQ-006: If a required runtime/model field is missing from both the selected compactor agent and the parent fallback context, compaction must fail before provider invocation with an actionable error naming the missing field and fallback source.
- REQ-007: Compaction status/error metadata must continue to report the effective compactor runtime/model used for the visible compactor run.
- REQ-008: Durable docs/settings copy must describe that blank compactor runtime/model fields inherit from the running parent agent.
- REQ-009: The behavior must be covered by executable validation for fallback, explicit override preservation, and no-fallback error paths without requiring real external model-provider calls.

## Acceptance Criteria

- AC-001: Given a parent run with runtime `R1` and model `M1`, and a selected compactor agent with `defaultLaunchConfig: null`, when compaction runs, `AgentRunService.createAgentRun(...)` is called for the compactor with runtime `R1` and model `M1` and no missing-runtime/model error is thrown.
- AC-002: Given a parent run with runtime `R1` and model `M1`, and a selected compactor agent with explicit runtime `R2` and model `M2`, when compaction runs, the compactor run uses `R2` and `M2`.
- AC-003: Given a selected compactor agent missing only runtime or only model, when parent fallback provides the missing field, the effective compactor run configuration uses the explicit configured field plus the parent-provided missing field.
- AC-004: Given no selected compactor agent, or a selected compactor id that cannot be loaded, compaction fails with the existing clear selected-agent configuration error.
- AC-005: Given a selected compactor agent with no runtime/model and a parent fallback context missing model or runtime, compaction fails before `createAgentRun(...)` with an error naming the missing field and parent fallback context.
- AC-006: Unit tests prove the resolver fallback and override precedence without calling real providers.
- AC-007: Backend factory unit tests prove the parent effective runtime/model are passed into the server-backed compaction runner factory.
- AC-008: Docs/settings copy no longer says there is no active-model fallback and instead states the new inheritance rule.

## Constraints / Dependencies

- Preserve visible normal compactor runs and run-history inspectability.
- Preserve explicit compactor-agent runtime/model overrides.
- Preserve the built-in Memory Compactor template's `defaultLaunchConfig: null`; do not hard-code Codex, Claude, LM Studio, OpenAI, or any model in the template.
- Keep fallback independent from provider-specific defaults.
- Avoid making UI selection the source of truth for fallback; the server runtime boundary must enforce it.

## Assumptions

- The parent run's effective runtime/model are available in `AgentRunConfig` when the AutoByteus backend builds the parent-bound `compactionAgentRunner`.
- Runtime/model fallback is field-level: an explicitly configured compactor field wins, and only missing required fields inherit from the parent.
- `llmConfig` is not a required field for this change. The compactor's explicit `llmConfig` remains in use when present; no model-parameter merging is required unless implementation finds an existing invariant that requires it.

## Risks / Open Questions

- Partial compactor configuration can create mixed effective launch configs, e.g. explicit model with inherited runtime. This is accepted for this scope because the same nullable default-launch shape already exists and the fallback is field-level; validation should cover the mixed case.
- If future runtime providers require additional launch fields beyond runtime/model, this resolver may need a broader effective-launch-context object later.
- The dedicated worktree currently does not have installed `node_modules`, so local test execution was not completed during analysis.

## Requirement-To-Use-Case Coverage

- UC-001: REQ-002, REQ-003, REQ-004, REQ-007, REQ-009
- UC-002: REQ-001, REQ-007, REQ-009
- UC-003: REQ-002, REQ-003, REQ-009
- UC-004: REQ-005, REQ-006
- UC-005: REQ-008

## Acceptance-Criteria-To-Scenario Intent

- AC-001 validates the user-reported built-in unconfigured compactor path.
- AC-002 validates explicit compactor launch preferences remain authoritative.
- AC-003 validates field-level fallback semantics.
- AC-004 validates selected compactor definition remains required.
- AC-005 validates irrecoverable missing fallback failures remain actionable.
- AC-006 validates the resolver owner enforces the invariant.
- AC-007 validates parent context reaches the resolver boundary.
- AC-008 validates durable operator-facing guidance changes with behavior.

## Approval Status

Approved by user on 2026-05-15.
