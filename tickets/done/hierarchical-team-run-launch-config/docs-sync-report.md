# Docs Sync Report

## Scope

- Ticket: `hierarchical-team-run-launch-config`
- Delivery revision: `DR-005`
- Trigger: `CRR-024 Pass` after `SR-015` -> `ARCH-REV-007` -> `IR-014` -> `CRR-023 Pass` -> `API-REV-011 Pass`
- Reviewed ticket HEAD: `5305bfa2049ed56e6ff917dbee8c17e3a8ac3a8f`
- Integrated base: `origin/personal@87b1b584592be95b1c8ee076f1d0ab3986a13f18`
- Refresh result: already current, 26 ahead / 0 behind; no base commit integrated
- Current execution: API-REV-011 `Pass / 98%`; changed file 8/8 and stored/shared cohort 112/112
- Retained production build: CRR-022 Pass; IR-014 changes no production source

## Why Docs Were Updated

The DR-004 long-lived docs correctly described editable hierarchical authoring,
but two still named the deleted `StoredTeamRunConfigForm.vue` and
`StoredTeamRunConfigTree.vue` card/tree path. The current SR-012–SR-015 design
and implementation restore one visual form for editable configuration and later
stored inspection while keeping their data/capability models structurally
separate. Three frontend documents therefore required updates.

This is durable architecture and user behavior, not ticket-only detail. Future
work must preserve all of the following together:

- one shared form/tree/control presentation before and after launch;
- distinct editable and stored capabilities throughout the recursive model;
- immutable V2 topology/order and exact stored values as the history authority;
- disabled stored controls with operable disclosures, no Reset, no Run, and no
  mutation;
- exact producer-backed historical field/value fallback without editable
  default substitution, duplication, or write-back; and
- exclusion of the synthetic CR/catalog-injection scenario from current product
  acceptance while the runtime classifier remains generic.

## Long-Lived Docs Reviewed

| Doc Path | Result | Rationale |
| --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` | `Updated` | Removed deleted stored-card component references; documented discriminated editable/stored form models, shared presentation, stored projector, and exact historical residual rules. |
| `autobyteus-web/docs/settings.md` | `Updated` | Replaced the separate stored Team inspector with shared locked form behavior and field/value-exact historical presentation. |
| `autobyteus-web/docs/agent_execution_architecture.md` | `Updated` | Recorded the capability split, projector boundaries, forbidden authoring state in stored models, V2 authority, and generic producer-bounded historical classifier. |
| `autobyteus-web/docs/agent_integration_minimal_bridge.md` | `No change` | Team creation inputs and V2 hydration transport did not change. |
| `autobyteus-web/docs/memory.md` | `No change` | Memory topology and migration boundaries did not change. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | `No change` | No server planning, launch, persistence, or restore behavior changed. |
| `autobyteus-server-ts/docs/modules/run_history.md` | `No change` | V2 package/catalog/history authority is unchanged; only frontend presentation/adaptation changed. |
| `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | `No change` | No startup or migration-order delta. |
| `autobyteus-server-ts/README.md` | `No change` | No operator, production-upgrade, or deployment delta. |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | `No change` | No memory projection or storage delta. |
| `autobyteus-server-ts/docs/features/memory_sync.md` | `No change` | No sync/import/migration delta. |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | `No change` | No context-file/media delta. |
| `autobyteus-server-ts/docs/features/task_agent_identity_future_improvements.md` | `No change` | No execution identity/allocation delta. |

## Docs Updated

| Doc | Durable Correction |
| --- | --- |
| `autobyteus-web/docs/agent_teams.md` | Main-file inventory now names `HistoricalModelConfigFallback`, form-model types, editable/stored projectors, and historical classifier. Selected-run/hydration sections now describe shared form presentation with structurally stored-only data. |
| `autobyteus-web/docs/settings.md` | Existing TeamRun Settings reuse the editable visual hierarchy with disabled controls and operable disclosures. Stored identity/topology/effective values/workspace display come from V2, without fabricated authoring state. Historical explicit values remain exact once and are never replaced by current defaults. |
| `autobyteus-web/docs/agent_execution_architecture.md` | `RunConfigPanel` selects editable or stored projectors into a discriminated recursive form model. Stored nodes forbid draft/override/workspace-operation/catalog-operation/mutation capabilities. The pure historical classifier uses schema order plus stable removed-key order and remains generic/provenance-free. |

## Removed / Replaced Components Recorded

| Removed / Superseded | Current Authority |
| --- | --- |
| `StoredTeamRunConfigForm.vue` | `TeamRunConfigForm.vue` over `StoredTeamRunFormModel` |
| `StoredTeamRunConfigTree.vue` | `TeamMemberConfigTree.vue` with stored/editable node discrimination |
| `StoredLaunchConfigurationCard.vue` | Shared Team/Agent controls plus `HistoricalModelConfigFallback.vue` when a current control cannot exactly represent an explicit saved value |
| Authoring-shaped stored sentinels/optional kitchen-sink fields | Neutral display fields plus parallel `Editable*` and `Stored*` capability models |
| Editable Default normalization for explicit stored values | `projectHistoricalModelConfigFields(...)` exact current-control/residual projection |
| Synthetic CR/free-text acceptance path | Out Of Scope / Non-Blocking; no current producer, no product machinery, and no blocking rerun |

## Validation

- Targeted `git diff --check`: Pass.
- Markdown fence balance: Pass.
- Relative Markdown link resolution: Pass.
- Deleted component/current-path scan: Pass.
- Updated implementation-reference existence: Pass.
- Stored-model forbidden-authoring-dependency spot check: Pass.
- Evidence: `delivery-evidence/delivery-docs-validation-dr005.txt`.

## Delivery Continuation

- Result: `Pass`.
- DR-005 completion: the current Electron candidate was rebuilt and
  integrity-checked before hands-on verification.
- DR-006 update: the user explicitly completed verification and authorized
  repository finalization plus a new release on 2026-08-25.
- Finalization docs impact: `No additional durable project-doc change`; the
  post-signal target refresh introduced no base/source/test behavior delta.
- Release notes: `release-notes.md` captures the user-facing durable changes for
  the documented v1.4.58 release path.
