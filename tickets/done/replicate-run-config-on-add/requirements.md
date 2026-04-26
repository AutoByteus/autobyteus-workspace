# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement

When a user opens an existing agent or team run, inspects its configuration, and clicks the add/new-run control, the newly opened editable run configuration must start from the source run's configuration. In the reported team-run screenshot, the source configuration shows Thinking enabled with Reasoning Effort `xhigh`; after clicking add, the editable team-run form resets Thinking off/default instead of preserving `xhigh`. This wastes user effort and makes the add action behave unlike a convenient "run again with same settings" action.

## Investigation Findings

- The config panel already has two modes: selected-run read-only mode reads `contextsStore.activeRun?.config` / `teamContextsStore.activeTeamContext?.config`, and new-run mode reads `agentRunConfigStore.config` / `teamRunConfigStore.config`.
- Header add actions for both agent and team paths do attempt to seed a new run from the active selected context, but the agent path uses a shallow object spread and the team path uses ad hoc JSON cloning instead of the existing clone helpers in `useDefinitionLaunchDefaults.ts`.
- The visible reset is primarily caused by shared model-config UI lifecycle code: `RuntimeModelConfigFields.vue` always passes `clear-on-empty-schema="true"`; while runtime model catalogs are still loading, `modelConfigSchemaByIdentifier(...)` returns `null`; `ModelConfigSection.vue` immediately emits `null` for any existing `llmConfig` when the form is editable. Read-only source config does not emit because read-only blocks updates, so the selected run can display `xhigh` while the editable copied run loses it.
- Even if the immediate empty-schema clear is prevented, `ModelConfigSection.vue` has a second schema-change watcher that treats async schema arrival (`null` -> real schema) as a model switch and clears config when the config object reference is unchanged.
- Individual-agent new-run forms use the same `RuntimeModelConfigFields.vue` / `ModelConfigSection.vue` path, so individual agent add is also at risk.
- Running-panel group add currently clones the first run in a definition group, not necessarily the currently selected run/source, so it can also fail the user's "replicate from the run I clicked/selected" expectation.

## Recommendations

- Make source-run seeding explicit and centralized: use/extend existing config clone helpers to create editable agent/team run seeds from a selected source run and always deep-clone `llmConfig` / member overrides.
- Move "clear model config on user model/runtime change" ownership out of `ModelConfigSection.vue` and into the owners that know a user actually changed runtime/model (`RuntimeModelConfigFields`, member override model selection, and messaging binding launch-preset selection).
- Remove `ModelConfigSection`'s schema-arrival/schema-change reset behavior so async model catalog loading cannot erase a copied configuration.
- Add focused tests for team and individual source-run add, async schema loading preservation, explicit model-change clearing, and source immutability.

## Scope Classification (`Small`/`Medium`/`Large`)
Medium

## In-Scope Use Cases

- UC-1: Create a new team run from a selected existing team run/history context using the header add action, carrying forward the source run's configuration.
- UC-2: Create a new individual agent run from a selected existing agent run/history context using the header add action, carrying forward the source run's configuration.
- UC-3: Create a new run from a running-panel group or history definition row while a same-definition source is selected; prefer the selected/source configuration instead of an arbitrary first group item.
- UC-4: Preserve the existing fresh definition/default add behavior when there is no source run context.
- UC-5: Preserve stale-config cleanup when the user explicitly changes runtime/model selection in an editable form.

## Out of Scope

- Changing default runtime/model/reasoning defaults themselves.
- Changing backend run-start, run-history, or GraphQL contracts unless implementation uncovers missing persisted data.
- Migrating historical run records that lack saved model config fields.
- Adding a new team-history definition-row plus button where none exists today.
- Redesigning sidebar/history layout beyond add/new-run source seeding.

## Functional Requirements

- REQ-1: The team-run header add action invoked from a selected team run must seed the editable team configuration from that exact selected team run's config, including runtime kind, model identifier, `llmConfig`/thinking/reasoning fields, workspace, auto-execute, skill access, and member overrides.
- REQ-2: The individual-agent header add action invoked from a selected agent run must seed the editable agent configuration from that exact selected run's config, including runtime kind, model identifier, `llmConfig`/thinking/reasoning fields, workspace, auto-execute, and skill access.
- REQ-3: Source-run seeding must deep-clone mutable nested config so editing the new draft cannot mutate the source historical/live run.
- REQ-4: Async runtime model catalog/schema loading must not clear or reset a source-copied `llmConfig`; valid fields such as `reasoning_effort: "xhigh"` must survive the initial editable form mount.
- REQ-5: Explicit user changes to runtime kind or LLM model must still clear incompatible model-specific config so stale provider/model settings are not carried across user-selected model changes.
- REQ-6: Running-panel and history definition-level add actions that do not point at a specific source run must use a deterministic source policy: selected same-definition run first, otherwise the best recent same-definition template already known in local context, otherwise definition defaults.
- REQ-7: If the source run is missing older model-config fields, seeding must apply existing default/null handling only for the missing field and must not discard other present source fields.
- REQ-8: The seeding path must distinguish run identity from definition identity; a run id must never be treated as an agent/team definition id.

## Acceptance Criteria

- AC-1: Given a selected team run whose read-only config shows Thinking enabled and Reasoning Effort `xhigh`, when the user clicks the header add/new-run button, then the editable team-run configuration opens with Thinking enabled and Reasoning Effort `xhigh` before user edits.
- AC-2: Given a selected team run with non-default global runtime/model/workspace, auto-execute/skill access, and member overrides, when the user clicks header add, then the editable team-run form is pre-populated with those values.
- AC-3: Given a selected individual agent run with non-default runtime/model/workspace and `llmConfig`, when the user clicks header add, then the editable agent-run form is pre-populated with those values.
- AC-4: Given no selected source run context, when the user starts a new run from a definition/default context, then existing definition/default seeding remains unchanged.
- AC-5: Given an editable source-copied config while model schema data is initially unavailable and then loads, the copied `llmConfig` remains intact and is only sanitized against the real schema once available.
- AC-6: Given an editable copied config, when the user explicitly changes the LLM model or runtime, then model-specific `llmConfig` is cleared according to the existing stale-config cleanup policy.
- AC-7: Editing and starting the newly seeded run does not change the source run's persisted/displayed configuration.
- AC-8: Given an older source run with `llmConfig: null`, add/new-run opens successfully and uses the established null/default display behavior without blocking launch solely because historical config is absent.

## Constraints / Dependencies

- Must fit the current frontend state-management model: `RunConfigPanel` renders selected-read-only vs editable-new-run state from Pinia stores.
- Must preserve backend API contracts unless implementation proves source run data is unavailable.
- Must preserve model-catalog validation and stale config cleanup for explicit user model/runtime changes.
- Must keep team and individual agent behavior consistent while respecting their separate config stores and form components.

## Assumptions

- Historical run records already persist enough configuration to reconstruct the selected run's visible read-only form; the screenshots confirm at least the reported team run exposes `reasoning_effort: "xhigh"` in frontend context.
- Add from the selected run header is the primary reported path; group/header/history add paths should be aligned where they share the same source-seeding expectation.

## Risks / Open Questions

- Some old historical team runs may only reconstruct a dominant global config from per-member metadata; exact original global/member override intent may not be recoverable beyond the current reconstructed config.
- Runtime model schema absence can mean either "loading" or "schema-less model" today; implementation must avoid conflating those states when preserving copied config.
- Running-panel group add has no row-level source id in the emitted event; implementation must use selected same-definition source or deterministic fallback rather than inventing a run-specific click source.

## Requirement-To-Use-Case Coverage

- UC-1: REQ-1, REQ-3, REQ-4, REQ-5, REQ-7, REQ-8
- UC-2: REQ-2, REQ-3, REQ-4, REQ-5, REQ-7, REQ-8
- UC-3: REQ-3, REQ-5, REQ-6, REQ-8
- UC-4: REQ-5, REQ-7, REQ-8
- UC-5: REQ-5

## Acceptance-Criteria-To-Scenario Intent

- AC-1 validates the screenshot-reported team thinking/reasoning regression.
- AC-2 validates full team configuration replication, including member overrides.
- AC-3 validates the user's concern that individual agent add can fail the same way.
- AC-4 protects fresh default starts from accidental source-state leakage.
- AC-5 validates the async schema-loading root cause fix.
- AC-6 protects stale model-config cleanup when the user intentionally changes model/runtime.
- AC-7 protects source run immutability.
- AC-8 protects partial historical records.

## Approval Status

Proceeding from user-supplied bug report and explicit "please continue" instruction on 2026-04-26; requirements are design-ready for architecture review.
