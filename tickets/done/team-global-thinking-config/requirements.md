# Requirements

## Status
- Design-ready
- Status history:
  - Draft (bootstrap from user request on 2026-03-30)
  - Design-ready (investigation completed and scope refined on 2026-03-30)

## Date
- 2026-03-30

## Goal / Problem Statement
- Team run configuration currently exposes the team-level default LLM model, but not the team-level model configuration / thinking settings.
- For Codex App Server team runs, users want to configure thinking once at the team/global level so members inherit it automatically, while still allowing per-member overrides when needed.
- Reopened team configurations should preserve that lazy/global editing model instead of forcing users to reconfigure each member manually.

## Scope Triage
- Scope: Small
- Rationale:
  - The feature reuses existing frontend building blocks (`ModelConfigSection`, existing team launch expansion, existing member-level `llmConfig` transport).
  - No backend GraphQL/schema expansion is required because per-member `llmConfig` is already supported.
  - The main work is contained to web config UI/state plus deterministic restore inference.

## In-Scope Use Cases
- UC-101: User selects a team global model in `TeamRunConfigForm` and sees the team/global model configuration / thinking controls directly below it.
- UC-102: User sets a team/global model config (for example Codex reasoning effort) and launches a team without touching member overrides; every launched member inherits that global config.
- UC-103: User opens a member override item, sees the inherited global config by default, and changes only that member's model config when a custom override is needed.
- UC-104: User reopens or restores an existing team run and the config UI reconstructs a reasonable global default plus only meaningful member overrides instead of treating every member as fully overridden.
- UC-105: User changes runtime or model such that the previous model config is no longer valid; incompatible global/member model config is cleared or sanitized rather than silently leaking stale params.

## Requirements
- R-101 (`requirement_id: R-101-team-global-model-config-field`)
  - `TeamRunConfig` must carry a team/global `llmConfig` field so inherited model config is explicit in state.
- R-102 (`requirement_id: R-102-team-global-model-config-ui`)
  - `TeamRunConfigForm` must render the reusable model-config / thinking UI immediately after the team global model selector when the selected model exposes a config schema.
- R-103 (`requirement_id: R-103-member-inherits-global-model-config`)
  - Member override UI must treat the team/global `llmConfig` as the effective default when a member-specific `llmConfig` override is absent.
- R-104 (`requirement_id: R-104-team-launch-expands-global-model-config`)
  - Draft team contexts and create-team-run launch payloads must expand the team/global `llmConfig` into each member unless that member has its own `llmConfig` override.
- R-105 (`requirement_id: R-105-team-restore-infers-global-defaults`)
  - Team reopen/hydration flows must infer a stable team/global default configuration from persisted member metadata and only materialize member overrides for divergent values.
- R-106 (`requirement_id: R-106-config-sanitization-on-runtime-or-model-change`)
  - Changing runtime/model must clear or sanitize incompatible global/member model config so stale provider-specific params are not retained.

## Acceptance Criteria
- AC-101 (`acceptance_criteria_id: AC-101`)
  - Given a team config with a selected model that exposes model-config schema, the team form renders the global thinking/model-config controls below `Default LLM Model (Global)`.
- AC-102 (`acceptance_criteria_id: AC-102`)
  - Given a temporary team run with team-global `llmConfig` set and no member override `llmConfig`, the create-team-run mutation sends that config for every member.
- AC-103 (`acceptance_criteria_id: AC-103`)
  - Given a member override item without its own `llmConfig`, the member override UI uses the team-global config as the effective displayed config.
- AC-104 (`acceptance_criteria_id: AC-104`)
  - Given a member changes its model config away from the inherited value, only that member persists a `llmConfig` override and other members continue inheriting the team-global config.
- AC-105 (`acceptance_criteria_id: AC-105`)
  - Given reopened/restored team metadata with common member config, the reconstructed `TeamRunConfig` exposes a team-global `llmConfig` and omits redundant member overrides.
- AC-106 (`acceptance_criteria_id: AC-106`)
  - Given runtime/model changes that invalidate current config schema, incompatible team-global/member model-config values are cleared or sanitized.

## Constraints / Dependencies
- Frontend scope is `autobyteus-web`.
- Team reopen/hydration currently reconstructs config from member metadata only; there is no explicit persisted top-level team `llmConfig` object.
- Existing backend team-run member metadata (`llmConfig`) remains the source of truth for persisted execution behavior.
- Sandbox restrictions block creating a dedicated git ticket branch/worktree; workflow artifacts must remain in the current checkout.

## Assumptions
- A majority/frequency-based heuristic with deterministic fallback is acceptable for reconstructing team-global defaults from persisted member metadata.
- `ModelConfigSection` remains the single reusable UI owner for model-specific thinking configuration.
- Team-wide skill access remains global-only for this change; no per-member skill-access override is introduced.

## Open Questions / Risks
- When member models differ substantially, the inferred global default may not perfectly match the originally edited draft, but it should minimize noisy overrides and remain faithful to persisted member truth.
- Member override clearing logic must avoid leaving an empty override record when the effective config matches the team-global default.

## Requirement Coverage Map
- R-101 -> UC-101, UC-102, UC-104
- R-102 -> UC-101
- R-103 -> UC-103
- R-104 -> UC-102
- R-105 -> UC-104
- R-106 -> UC-105

## Acceptance Criteria Coverage Map (Stage 7)
- AC-101 -> AV-101
- AC-102 -> AV-102
- AC-103 -> AV-103
- AC-104 -> AV-104
- AC-105 -> AV-105
- AC-106 -> AV-106
