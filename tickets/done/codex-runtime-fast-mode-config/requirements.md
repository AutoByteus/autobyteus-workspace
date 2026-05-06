# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready; approved by user on 2026-05-06 for design handoff.

## Goal / Problem Statement

When a user selects the Codex runtime in Autobyteus launch/runtime configuration, the UI does not expose Codex Fast mode. The local Codex CLI/app-server supports Fast mode through the interactive `/fast` command and through app-server `serviceTier` request fields. Users need a first-class launch-time configuration option so a Codex run can be started/resumed with Fast mode without manually typing `/fast` inside an already-running Codex session.

## Investigation Findings

- Local Codex CLI version is `codex-cli 0.128.0`.
- Codex `/fast` is not a reasoning-effort shortcut. Upstream Codex implements it as a service-tier selection (`ServiceTier::Fast`), serialized through app-server as `serviceTier: "fast"` and user/profile config as `service_tier`.
- The local generated Codex app-server schema includes:
  - `ThreadStartParams.serviceTier?: "fast" | "flex" | null`.
  - `ThreadResumeParams.serviceTier?: "fast" | "flex" | null`.
  - `TurnStartParams.serviceTier?: "fast" | "flex" | null` with description: “Override the service tier for this turn and subsequent turns.”
  - `ModelListResponse.Model.additionalSpeedTiers: string[]`.
- A live app-server probe confirmed `thread/start` accepts `serviceTier: "fast"` and returns `serviceTier: "fast"` for the local default model `gpt-5.5`.
- Live local `model/list` on 2026-05-06 reports `additionalSpeedTiers: ["fast"]` for `gpt-5.5` and `gpt-5.4`; models such as `gpt-5.4-mini`, `gpt-5.3-codex`, and `gpt-5.3-codex-spark` report no additional fast tier.
- Autobyteus already has an end-to-end `llmConfig` channel across frontend launch/default forms, GraphQL inputs, run config, team member overrides, metadata persistence, and Codex bootstrap. That channel currently carries Codex `reasoning_effort`.
- The Codex model normalizer (`autobyteus-server-ts/src/agent-execution/backends/codex/codex-app-server-model-normalizer.ts`) currently converts `supportedReasoningEfforts` into `config_schema.reasoning_effort` but ignores `additionalSpeedTiers`.
- The Codex runtime thread configuration and app-server calls currently propagate `reasoningEffort` only; they do not include `serviceTier` in `thread/start`, `thread/resume`, or `turn/start`.
- The frontend schema-driven model config UI can already render enum parameters, but `ModelConfigSection.vue` is organized around “Thinking” and currently only shows the advanced schema section when `hasThinkingSupport(schema)` is true. Because current fast-capable Codex models also expose `reasoning_effort`, a `service_tier` enum would appear in Advanced if added to the same schema; however, a robust UI should render non-thinking runtime/model parameters even when a future schema has no thinking keys.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior parity improvement.
- Initial design issue signal (`Yes`/`No`/`Unclear`): No broad design issue found; small Codex-runtime integration gap.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Local Implementation Defect in the Codex-specific model normalizer/thread configuration path.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed for backend architecture; small local UI generalization may be appropriate so model config is not thinking-only.
- Evidence basis: Local code read, generated Codex app-server schema, live app-server probe, and official upstream Codex 0.128.0 source.
- Requirement or scope impact: Feature crosses Codex model catalog normalization, frontend model-config schema rendering, backend Codex bootstrap/thread dispatch, and tests. Existing `llmConfig` persistence path should absorb storage/GraphQL without a new top-level contract.

## Recommendations

- Implement Fast mode as a Codex `service_tier`/`serviceTier` setting, not as `reasoning_effort=low`.
- Expose the option only when Codex `model/list` advertises `additionalSpeedTiers` containing `fast` for the selected model.
- Store the selected value in existing `llmConfig` as `service_tier: "fast"`; absence/null means default/off and preserves current behavior.
- Normalize and apply `llmConfig.service_tier` in the Codex backend, passing it to app-server `thread/start`, `thread/resume`, and `turn/start`.
- Keep `flex` out of the first UI unless the product explicitly wants a separate advanced service-tier choice; `/fast off` maps to unset/default, not necessarily to `flex`.
- Add focused unit tests around schema normalization, backend propagation, and frontend rendering/sanitization. Add or update a live Codex integration/probe test gated by `RUN_CODEX_E2E=1` if appropriate.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## Scope Classification Rationale

The change is conceptually small but crosses multiple layers: Codex model metadata, frontend launch configuration, backend runtime bootstrap, app-server request payloads, and validation. It should not require database migrations or broad API contract changes because `llmConfig` already persists arbitrary model/runtime configuration.

## In-Scope Use Cases

- A user selects Codex runtime and a fast-capable model, then enables Fast mode before launching a single-agent run.
- A user sets Fast mode in default launch preferences so future Codex launches use it.
- A user configures Fast mode on team-level or member-level Codex runtime/model config where existing model config controls appear.
- A resumed/restored Codex run with stored `llmConfig.service_tier: "fast"` continues to pass the service tier to Codex app-server.
- Users can still configure Codex reasoning effort independently of Fast mode.

## Out of Scope

- Modifying OpenAI Codex CLI/app-server itself.
- Writing global Codex profile config such as `~/.codex/config.toml`.
- Enforcing account/billing eligibility beyond Codex app-server model metadata and runtime errors.
- Auto-enabling Fast mode based on account type or Codex feature flags.
- Applying Fast mode interactively to already-running sessions without a run config update/restart; the requirement is launch/runtime configuration parity.
- Changing non-Codex runtime configuration behavior.

## Functional Requirements

- FR-001: The backend Codex model catalog must detect `additionalSpeedTiers`/`additional_speed_tiers` from Codex `model/list` rows.
- FR-002: The backend Codex model catalog must include a schema-driven config parameter for Fast mode only for models that advertise the `fast` speed tier.
- FR-003: The frontend runtime/model configuration surface must allow users to select/enable Fast mode for fast-capable Codex models anywhere existing `llmConfig` editing is supported.
- FR-004: The frontend must not retain or submit stale Fast mode config after changing to a model whose schema does not include Fast mode.
- FR-005: The selected Fast mode value must be represented in existing `llmConfig` as `service_tier: "fast"` and must survive existing default-launch, single-run, team-run, member-override, GraphQL, metadata, and restore paths.
- FR-006: The backend must normalize Codex service tier values and ignore invalid/unsupported values rather than forwarding them to Codex app-server.
- FR-007: Codex runtime startup/resume must pass the normalized service tier to app-server `thread/start` and `thread/resume` when selected.
- FR-008: Codex turn dispatch must pass the normalized service tier to app-server `turn/start` when selected so the setting applies to the turn and future turns per app-server contract.
- FR-009: Existing Codex `reasoning_effort` behavior must remain unchanged and coexist with `service_tier`.
- FR-010: Non-Codex runtimes must not display Codex Fast mode and must not change runtime behavior.

## Acceptance Criteria

- AC-001: With Codex runtime and a fast-capable model from local `model/list` (for example `gpt-5.5` or `gpt-5.4` as observed on 2026-05-06), the UI shows a configurable Fast mode / service-tier option.
- AC-002: With Codex runtime and a non-fast-capable model from local `model/list` (for example `gpt-5.4-mini` or `gpt-5.3-codex` as observed on 2026-05-06), the UI does not show/submit Fast mode.
- AC-003: Enabling Fast mode produces `llmConfig.service_tier === "fast"`; resetting to default/off removes that key or makes `llmConfig` null if no other config remains.
- AC-004: A Codex run launched with Fast mode sends `serviceTier: "fast"` in `thread/start` and `turn/start`; default/off runs omit/null that field.
- AC-005: A Codex run restored/resumed with Fast mode sends `serviceTier: "fast"` in `thread/resume` and subsequent `turn/start`.
- AC-006: Reasoning effort can still be selected and submitted alongside Fast mode, e.g. `{ reasoning_effort: "high", service_tier: "fast" }`.
- AC-007: Invalid values such as `{ service_tier: "turbo" }` are dropped/ignored before app-server calls.
- AC-008: Unit tests cover backend model normalization, service-tier normalization, thread manager/start/resume payloads, turn payloads, and frontend schema rendering/sanitization.
- AC-009: Existing tests for runtime config, team config, and Codex reasoning effort continue to pass.

## Constraints / Dependencies

- Depends on Codex app-server protocol fields present in local `codex-cli 0.128.0` and official upstream source/tag `rust-v0.128.0`.
- Depends on current `model/list` metadata containing `additionalSpeedTiers` for fast-capable models.
- Must preserve existing `llmConfig` JSON compatibility; no migration should be required.
- Must avoid defaulting users into Fast mode; absence means current Codex/default behavior.
- UI copy should make clear that Fast mode is a Codex speed/service-tier setting and separate from reasoning effort.

## Assumptions

- The intended feature is runtime/launch configuration exposed through the application UI/settings path, not requiring users to type `/fast` manually inside an already-running Codex session.
- `service_tier: "fast"` is the appropriate stable config key inside Autobyteus `llmConfig` because Codex user/profile config uses snake_case `service_tier`, while app-server requests use camelCase `serviceTier`.
- “Fast mode off/default” should be represented by an absent/null `service_tier`, matching `/fast off` behavior and preserving Codex defaults.

## Risks / Open Questions

- UI terminology: whether to label the control “Fast mode” (user-friendly) or “Service tier” (protocol-aligned). Recommendation: label “Fast mode” and describe it as Codex service tier.
- Whether to expose `flex` as an advanced service-tier option. Recommendation: do not expose it in the initial Fast mode feature unless requested, because `/fast off` maps to unset/default rather than explicit `flex`.
- Current `ModelConfigSection.vue` is thinking-oriented; if implementation only appends `service_tier` beside `reasoning_effort`, current fast-capable models work, but a small generic-model-config UI adjustment is safer.
- Live model availability and `additionalSpeedTiers` values may change over time; tests using live Codex should be gated and tolerant.

## Requirement-To-Use-Case Coverage

- Single-agent Codex launch: FR-001 through FR-010, AC-001, AC-003, AC-004, AC-006, AC-007.
- Default launch preferences: FR-003, FR-005, FR-009, AC-003, AC-006.
- Team/member overrides: FR-003, FR-005, FR-009, AC-003, AC-006.
- Model-change cleanup: FR-002, FR-004, AC-002, AC-003.
- Restore/resume: FR-005, FR-007, FR-008, AC-005.
- Non-Codex safety: FR-010, AC-009.

## Acceptance-Criteria-To-Scenario Intent

- AC-001/AC-002 validate capability-gated visibility.
- AC-003 validates frontend config shape and reset behavior.
- AC-004/AC-005 validate backend protocol application for new and restored threads.
- AC-006 validates independence from reasoning effort.
- AC-007 validates defensive normalization.
- AC-008/AC-009 validate regression coverage.

## Approval Status

Approved by user on 2026-05-06. User confirmed the design intent: Fast mode should be shown in configuration when selecting a fast-capable Codex model.
