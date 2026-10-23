# Docs Sync Report

## Scope

- Ticket: `seal-migrations-per-folder` (autobyteus-280). `Large` / `High`, reviewed route.
- Trigger: DR-001, the code reviewer's delivery handoff (CRR-003 Pass; API-REV-001 Pass at 95.5%)
- Bootstrap base reference: `27f2d2f72d` (merge base of `9244e1340e` and `origin/personal`)
- Integrated base reference used for docs sync: `origin/personal` @ `b54c755aa5`, merged by `8904a45087`
- Post-integration verification reference: DLV-01..DLV-06

## Why Docs Were Updated

- Summary: this ticket seals the app-data migration area. Each migration lives in its own folder; there is one shared frozen layer; no imports in either direction between production and migration code; capabilities replace migration-id checks; `autobyteus-ts/src/memory/migration/` moved into the area. The implementation wrote the rule into the Data Migration Guideline and updated the module docs. Delivery completed the guideline's frozen-layer wording.
- Why this should live in long-lived project docs: every future migration and every migration retirement follows these rules.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | The sealing rule, the reasoning (Django, Rails), layout, imports, capabilities, retirement (REQ-010, AC-007) | **Updated** | Named only `frozen/server/` and `frozen/autobyteus-ts/`, though the code also has `frozen/application-sdk-contracts/` (code-review Residual Risks). It said "never `autobyteus-ts`" without naming the other workspace packages that the boundary test refuses since CR-001 |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Custom providers held back while their migration is pending | No change | Describes the `custom_llm_providers` capability, `CUSTOM_PROVIDERS_MIGRATION_PENDING`, built-ins only, the server still starting, and the Settings retry |
| `autobyteus-server-ts/docs/modules/token_usage.md` | G-2 history gate | No change | `TOKEN_USAGE_CURRENT_SCHEMA_INVALID` (exit) concerns a missing current schema, not migration gating, and is unchanged |
| `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`, `docs/modules/agent_team_execution.md`, `autobyteus-ts/docs/agent_memory_design.md` | Paths into the moved code | No change | The paths point to `frozen/...` and exist |
| Repo-wide grep of `*.md` for `app-data-migrations/legacy`, `memory/migration`, `STARTUP_BLOCKED` | Stale paths and old startup blocking | Clean | Remaining `memory/migration` mentions say it moved to `frozen/autobyteus-ts/` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/data_migration_guideline.md` | Completion | Frozen layer: `frozen/<package>/<original path>`, naming `frozen/server/`, `frozen/autobyteus-ts/` and `frozen/application-sdk-contracts/`. Imports: never another workspace package (`autobyteus-*`, `@autobyteus/*`) | Matches the code layout and the boundary test's `WORKSPACE_PACKAGE` rule (CR-001) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Sealed migration area | Folder per migration; one frozen layer; imports in neither direction; `tests/architecture/app-data-migration-boundaries.test.ts` enforces it | design spec, REQ-001..005 | data migration guideline |
| Capability readiness | Production code names a capability, never a migration id; only that feature is gated, never startup | REQ-006 | guideline; `llm_management.md` |
| Retiring a migration | Oldest first; delete its folder, test folder and registry line; delete frozen files the boundary test reports unused | REQ-010 | guideline |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `src/app-data-migrations/legacy/` | `src/app-data-migrations/frozen/` | guideline (lessons table notes "formerly `legacy/`") |
| `autobyteus-ts/src/memory/migration/` | `frozen/autobyteus-ts/memory/migration/` | `autobyteus-ts/docs/agent_memory_design.md` |
| Startup blocking on a pending custom-provider migration (`…STARTUP_BLOCKED`) | The `custom_llm_providers` capability (`CUSTOM_PROVIDERS_MIGRATION_PENDING`) | `llm_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, finalization
