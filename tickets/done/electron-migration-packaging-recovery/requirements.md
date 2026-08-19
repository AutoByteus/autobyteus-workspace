# Electron Migration And Packaging Recovery Requirements

## Status

`Refined`

Refined from both Stage 10 real-data verification rounds in `investigation-notes.md` on 2026-08-16. `UV-002` adds the missing migrated-history discoverability contract while preserving all previously approved migration and packaging behavior.

## Relevant Supplemental Artifacts

| Artifact | Purpose | Requirement / Acceptance Scope | Approval Applicability |
| --- | --- | --- | --- |
| `future-state-runtime-call-stack.md` | Exact target call paths, fallbacks, mutation boundaries, and retry lifecycle | All requirements; especially `R-MIG-011`–`020` / `AC-MIG-011`–`020` | Historical v6 context; Stage 4 regeneration required after design v7 |
| `workflow-state.md` | Append-only stage, lock, and re-entry history | Process gate for all acceptance work | Process context; `N/A` |
| `implementation.md` | Planned source/test mapping and preserved completed work | All implementation-bound criteria | Downstream plan; `N/A` |
| `design-review-report.md` / `architecture-review-revision-record.md` | Current architecture verdict and finding history | Design readiness for all criteria | Review evidence; `N/A` |

The canonical complete supplement inventory is maintained in `investigation-notes.md`.

## Goal / Problem Statement

Correct two branch-only release blockers while preserving the original `agent-team-universal-task-delegation` delivery record:

1. App-data migration must classify legitimate on-disk TeamRun states, enforce prerequisite order, converge safely from the mixed state left by the released failed/partially advanced attempt, and reconcile every validated current TeamRun into the persisted Team history index used by GraphQL and the workspace sidebar.
2. The canonical Linux Electron build must package the web application without traversing a pnpm workspace link outside the Electron app root or requiring manual link materialization.

The desired result is a clean new ticket that changes only corrective migration, packaging, durable validation, and directly impacted documentation.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-MIG-010` | `20260814` can successfully promote and validate V1 TeamRun packages while leaving them absent from `team_run_history_index.json`; GraphQL and the workspace sidebar then report no history for the correct workspace. | The same migration atomically reconciles one Team history row for every validated current/promoted V1 root, so workspace history immediately exposes those Team runs after startup. | Exact workspace filtering remains unchanged; unresolved/invalid/residue roots remain invisible; Team member Agents are not duplicated into standalone Agent history. | `R-MIG-015`–`020`; `AC-MIG-015`–`020` |

## Design Health Assessment

- Change posture: `Bug Fix` within the existing persisted-data transition.
- Initial design issue signal: `Yes`.
- Root cause classification: `Missing Invariant` with a bounded `Boundary Or Ownership Issue` between V1 package promotion/admission and the persisted Team history projection.
- Refactor posture: `Likely Needed`, bounded to extracting one current-tree-to-history-row projector and adding one migration-owned index reconciler; no runtime or public API refactor is required.
- Evidence basis: eight validated V1 packages exist while the strict Team history index contains only two rows; the runtime catalog filters index rows but never synthesizes missing rows.
- Requirement impact: adds `R-MIG-015`–`020`, `AC-MIG-015`–`020`, and `UC-MIG-010`; all earlier behavior remains in force.

## Confirmed Scope Classification

`Medium`

The user-visible outcomes are narrow, but implementation crosses migration orchestration, filesystem classification, predecessor/current token evidence, current V1 history projection, atomic filesystem persistence, reusable test fixtures, package dependency classification, lockfile state, and full AppImage validation.

## In-Scope Use Cases

| Use Case ID | Source | Verifiable Behavior |
| --- | --- | --- |
| `UC-MIG-001` | Requirement | A clean predecessor cohort completes canonical identity before execution-tree V1. |
| `UC-MIG-002` | Requirement | A historical manifest-only Team directory is positively recognized and skipped without mutation. |
| `UC-MIG-003` | Requirement | A complete validated V1 root is recognized as current and never parsed as predecessor data. |
| `UC-MIG-004` | Requirement | A retry over the observed mixed partial state converts remaining predecessor/token data, then finishes remaining V1 promotion. |
| `UC-MIG-005` | Requirement | Ambiguous, malformed, or incomplete current/predecessor state fails before destructive mutation and remains retryable. |
| `UC-MIG-006` | Design-Risk | A failed prerequisite blocks only its declared dependents before attempt creation; independent migrations still run. |
| `UC-MIG-007` | Design-Risk | Current V1 task-Team identity evidence is derived from the validated execution tree rather than predecessor task schema. |
| `UC-MIG-008` | Design-Risk | An interrupted V1 promotion uses validated protected predecessor sources instead of parsing live V1 target files as predecessor data. |
| `UC-MIG-009` | User Verification | A retryable V1 migration converts released segment-based communication addresses even when the older communication-address migration and canonical migration are already terminal successes. |
| `UC-MIG-010` | User Verification | A retryable V1 migration reconciles every validated current/promoted TeamRun into the Team history index so GraphQL/sidebar workspace history exposes it without runtime fallback or standalone-Agent duplication. |
| `UC-PKG-001` | Requirement | The Team stream contracts package remains available to Nuxt generation but is absent from the Electron production Node dependency graph. |
| `UC-PKG-002` | Requirement | The exact canonical Linux x64 Electron build completes from ordinary workspace links without a workaround. |
| `UC-PKG-003` | Requirement | The produced AppImage contains a startable embedded server and reaches app-data migration startup against disposable data. |
| `UC-TEST-001` | Design-Risk | Durable V1 migration tests use repository test fixtures, not a time-bound ticket path. |

## Requirements

| Requirement ID | Expected Outcome |
| --- | --- |
| `R-MIG-001` | One read-only migration-owned classifier determines each Team root state before conversion: `PREDECESSOR`, `CURRENT_V1`, `HISTORICAL_RESIDUE`, or `INVALID`. |
| `R-MIG-002` | `PREDECESSOR` requires authoritative `team_run_metadata.json`; `CURRENT_V1` requires all three current files plus current package validation; `HISTORICAL_RESIDUE` requires a valid legacy Team manifest marker and absence of predecessor/current authority files; every other state is `INVALID`. |
| `R-MIG-003` | Canonical identity, token task indexing, and execution-tree V1 consume the same classification semantics; no component independently guesses that missing metadata means predecessor, current, or residue. |
| `R-MIG-004` | App-data definitions can declare prerequisite migration IDs. The runner checks them before `markRunning`: terminal success (`SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`) permits execution; any other status blocks that dependent without creating/incrementing its record. |
| `R-MIG-005` | A blocked dependent does not stop unrelated required migrations from executing in registry order. Manual execution of a blocked dependent returns a typed prerequisite failure before mutation/attempt creation. |
| `R-MIG-006` | Canonical token task-Team mapping parses predecessor task files only for classified predecessor roots and derives task-Team chains from the validated execution tree for current V1 roots. Historical residue contributes no mapping. Invalid roots contribute an actionable failure. |
| `R-MIG-007` | Retrying the observed mixed cohort converts all remaining supported predecessor files and canonical token addresses, leaves complete V1 roots unchanged, skips recognized residue, and then lets V1 promote remaining eligible predecessor roots. |
| `R-MIG-008` | A second run after successful convergence is an idempotent terminal success with no new backups, file rewrites, or migration attempts for already successful definitions. |
| `R-MIG-009` | Invalid/ambiguous roots and conversion failures report exact root/path/classification context, preserve source bytes and protected backups, and do not fabricate metadata or delete user data. |
| `R-MIG-010` | The fix introduces no runtime dual reader, compatibility adapter, broad ignore-all-`ENOENT` branch, or fallback that admits unvalidated legacy/current state. Released predecessor reading remains isolated to one-time migration code. |
| `R-MIG-011` | During predecessor package planning, `20260814_team_run_execution_tree_v1` accepts either an exact four-field `TeamExecutionAddress` or the released segment-based communication address as migration evidence, normalizes it through one migration-owned converter, and resolves the exact sender/receiver AgentRun IDs against the planned execution tree before target-package validation. |
| `R-MIG-012` | The V1 retry must not depend on rerunning or changing the terminal semantics of `20260701_team_communication_projection_addresses` or `20260801_team_canonical_identity`; no new migration ID is introduced while `20260814` remains unreleased and retryable. |
| `R-MIG-013` | Exact current predecessor addresses are accepted without an independent source rewrite; malformed, ambiguous, or root-mismatched released addresses fail before cohort promotion with precise row/side context and preserved predecessor bytes/backups. |
| `R-MIG-014` | An operational-equivalent state with `20260701` and `20260801` terminal-success records plus a failed `20260814` record converges on retry, promotes every otherwise-valid predecessor root, and is byte/path/backup/attempt idempotent after success. |
| `R-MIG-015` | Before `20260814_team_run_execution_tree_v1` reports success, `team_run_history_index.json` contains exactly one row for every complete validated current or successfully promoted V1 root and no row for historical residue, invalid, or unresolved predecessor roots. |
| `R-MIG-016` | Each reconciled row derives overlapping current facts from the validated V1 execution tree, including TeamRun/definition identity, canonical workspace association, creation time, and archive state. Existing valid index-only history such as summary and termination time is preserved; absence of a reconstructable summary must not hide an otherwise valid run. |
| `R-MIG-017` | Team history-index reconciliation uses strict existing-index validation, creates a protected backup only when an existing index will change, and commits the deterministic complete row set atomically. Invalid/unreadable input or write failure records a contextual retryable migration failure while preserving prior index and Team-package bytes. |
| `R-MIG-018` | Reconciliation projects every currently validated V1 root even when another predecessor root remains unresolved, while never exposing that unresolved root. Successfully promoted roots in a partially failed attempt likewise remain discoverable through history. |
| `R-MIG-019` | A byte-equivalent reconciliation performs no write and creates no backup; after terminal migration success, later startup remains byte/path/backup/attempt idempotent. |
| `R-MIG-020` | The history repair remains owned by the existing unreleased `20260814` migration. It does not edit or rerun `20260521_team_run_history_index_v2`, introduce a new migration ID, add runtime V1-directory scanning/fallback, or create standalone Agent history rows for Team members. |
| `R-PKG-001` | `@autobyteus/team-stream-contracts` remains a Nuxt build input but is not classified as an Electron application production Node dependency in `autobyteus-web/package.json` or the root lockfile. |
| `R-PKG-002` | Web tests/generation continue to execute runtime Team stream schema parsing from bundled assets after dependency reclassification. |
| `R-PKG-003` | `CI=true NO_TIMESTAMP=1 CSC_IDENTITY_AUTO_DISCOVERY=false AUTOBYTEUS_BUILD_FLAVOR=personal corepack pnpm -C autobyteus-web build:electron:linux:x64` exits `0` without replacing, deleting, dereferencing, or restoring the workspace link. |
| `R-PKG-004` | The resulting AppImage retains the embedded server, Prisma/runtime dependencies, required notices, and normal updater/artifact metadata. |
| `R-PKG-005` | Packaging leaves the checked-in dependency source and `autobyteus-web/node_modules/@autobyteus/team-stream-contracts` link unchanged; only expected ignored build outputs are created. |
| `R-TEST-001` | Reusable migration scenarios required by server tests live under `autobyteus-server-ts/tests/fixtures`; no durable test depends on `tickets/in-progress` or `tickets/done`. |

## Acceptance Criteria

| Acceptance Criteria ID | Measurable Expected Outcome |
| --- | --- |
| `AC-MIG-001` | A fixture with a valid legacy `team_run_manifest.json`, matching directory `teamRunId`, `runVersion: 1`, member bindings, and no predecessor/current authority files is classified `HISTORICAL_RESIDUE`; canonical and V1 record a skip and produce no file changes. |
| `AC-MIG-002` | A root with no metadata and all three valid V1 files is classified `CURRENT_V1`; canonical does not call predecessor metadata/task converters and the V1 migration records `Already a complete validated V1 package`. |
| `AC-MIG-003` | A V1 tree containing nested task-Team executions yields the same root ID, ordered task-Team run chain, and logical Team address required by canonical token planning without reading the V1 task file as predecessor schema. |
| `AC-MIG-004` | A valid predecessor root is classified `PREDECESSOR`; canonical metadata/task conversion and dependent token-address conversion succeed with atomic backups/transaction behavior preserved. |
| `AC-MIG-005` | When canonical status is `FAILED`, execution-tree V1 is not called, no V1 record is created or incremented, and a later independent required definition still executes. |
| `AC-MIG-006` | Direct/manual V1 execution with canonical `FAILED`, `RUNNING`, or `NOT_RUN` throws the typed prerequisite error before V1 execution and before attempt creation. |
| `AC-MIG-007` | A mixed fixture containing predecessor roots, complete V1 roots, historical residue, old token addresses, and prior V1-success filesystem output converges successfully in one retry; all recoverable roots validate under current V1 schemas afterward. |
| `AC-MIG-008` | Re-running the successful mixed fixture leaves a byte/path/backup inventory unchanged and successful migration attempt counts unchanged. |
| `AC-MIG-009` | A partial V1 package, malformed V1 package, malformed legacy manifest, or unknown directory is classified `INVALID`, returns a precise failure, and preserves every pre-run byte. |
| `AC-MIG-010` | Focused source/test audit finds no new runtime legacy reader, compatibility wrapper, metadata fabrication, or unconditional missing-file skip. |
| `AC-MIG-011` | A predecessor fixture whose communication sender/receiver addresses use released `segments` evidence—including configured members, nested task-Team segments, and task-Agent segments—produces the same exact V1 sender/receiver AgentRun IDs as the equivalent four-field address fixture. |
| `AC-MIG-012` | With persisted records `20260701=SUCCEEDED`, `20260801=SUCCEEDED`, and `20260814=FAILED`, startup retries only the required `20260814` work, promotes every valid released-address root, records V1 success, and does not increment either terminal prerequisite attempt count. |
| `AC-MIG-013` | Exact four-field communication addresses remain a no-op input; malformed, empty, contradictory, or root-mismatched segment addresses produce a root/message-index/address-side failure before any cohort promotion and preserve every pre-run source byte. |
| `AC-MIG-014` | Re-running after `AC-MIG-012` leaves the complete byte/path/backup inventory and successful migration attempt counts unchanged. |
| `AC-MIG-015` | Given a stale index with two rows plus the observed eight validated V1 packages, reconciliation produces eight unique Team history rows; `workspaceRunHistory` for the registered superrepo workspace returns the five matching Software Engineering Team runs. |
| `AC-MIG-016` | For an existing valid row, reconciliation preserves its non-empty summary and termination time while correcting overlapping tree-owned fields; for a missing row with no reconstructable summary, it writes a valid empty summary and the run remains visible. |
| `AC-MIG-017` | A malformed existing index or injected pre-commit/write failure leaves the exact pre-run index and all Team-package bytes unchanged, creates no committed partial index, records the index path/context, and leaves `20260814` retryable. |
| `AC-MIG-018` | A mixed cohort containing validated current roots plus one invalid/unresolved predecessor produces history rows only for the validated roots and reports the unresolved root separately; no valid current row is suppressed by the unrelated failure. |
| `AC-MIG-019` | Re-running reconciliation over an already equivalent index produces a skip/no-change result with identical index bytes/path inventory and no new backup; a later startup after migration success does not increment attempts. |
| `AC-MIG-020` | Source/test audit finds no new migration ID, no change to the terminal `20260521` migration, no runtime package-to-history fallback/scan, and no Team-member row added to `run_history_index.json`. |
| `AC-PKG-001` | `pnpm --filter autobyteus list --prod --depth 1` no longer includes `@autobyteus/team-stream-contracts`, while install/typecheck/Nuxt generation can still resolve it. |
| `AC-PKG-002` | Focused web Team streaming/hydration/execution tests exercising contract runtime schemas pass after dependency reclassification. |
| `AC-PKG-003` | The exact canonical Linux x64 command in `R-PKG-003` exits `0`; its log contains no `must be under autobyteus-web` failure and records a produced personal x64 AppImage. |
| `AC-PKG-004` | Before and after full packaging, `readlink autobyteus-web/node_modules/@autobyteus/team-stream-contracts` is unchanged and git diff contains only planned ticket/source/test/docs/lockfile edits. |
| `AC-PKG-005` | Packaged-server verification against a disposable data directory passes Prisma migration, app-data migration entry, `/rest/health`, and clean shutdown using the packaged Electron runtime. |
| `AC-TEST-001` | The V1 migration test suite passes after using server-owned fixtures, and `rg` finds no server test reference to `tickets/(in-progress|done)` for those scenarios. |

## Constraints / Dependencies

- Base source is exactly `origin/codex/agent-team-universal-task-delegation@840fa0d2443f624a36a507905540164f80c7640e`.
- Preserve the original ticket and dirty delivery evidence in the original checkout.
- Do not mutate, delete, fabricate, or manually repair files in `/home/ryan-ai/.autobyteus/server-data` during implementation/automated validation.
- Operational data may be read for diagnosis; mutation tests use synthetic/disposable copies and databases.
- Preserve per-file backup/rename behavior and token transaction rollback semantics unless design evidence proves a safer replacement.
- Preserve continuation of independent app-data migrations; do not implement global fail-fast.
- Do not add a V1-specific repository-reading prerequisite guard beside the runner; dependency admission belongs to the authoritative runner boundary.
- Do not edit the released `20260701` migration as the recovery mechanism, do not require terminal migration records to rerun, and do not create a replacement migration ID while the retryable `20260814` transition remains unreleased.
- Do not edit or rerun the completed `20260521_team_run_history_index_v2` as the V1 projection repair. Current V1 tree-to-index reconciliation belongs to `20260814` and normal runtime remains index-driven.
- The user's operational `20260814` record produced by this unreleased candidate is already terminal success. Automated verification must use synthetic/disposable copied state; resetting or repairing the operational migration record/index requires separate explicit authorization.
- The embedded server keeps `@autobyteus/team-stream-contracts` as a real runtime dependency and continues using its portable workspace-package staging.
- Full AppImage build is Stage 7 evidence after focused tests pass.

## Assumptions

- The observed manifest marker is sufficient to positively identify the historical residue cohort when its required identity fields validate and no newer authority files exist.
- Complete V1 package validation remains the authority for current-state admission.
- `SUCCEEDED_WITH_WARNINGS` remains terminal prerequisite success, matching existing runner semantics.
- Nuxt bundles all web uses of Team stream runtime schemas; Electron main/build code has no direct import.
- The canonical Linux build environment has cached/installable dependencies and native packaging prerequisites already demonstrated by the workaround build.

## Persisted Data Outcome

- Stored subject/location: current V1 TeamRun packages under `memory/agent_teams/*` and the derived `memory/team_run_history_index.json` projection.
- Required outcome: `Migration Required` within the existing unreleased `20260814_team_run_execution_tree_v1` transition.
- Preserve: every validated V1 package, every valid existing index-only summary/termination value, and the exact prior index bytes on failed reconciliation.
- Transform/rebuild: deterministically reconcile the complete Team history row set from validated V1 roots; exclude invalid, residue, and unresolved predecessor roots.
- Unacceptable loss/corruption: deleting or rewriting Team packages, silently replacing a malformed index with an empty one, losing valid index-only history fields, partial index writes, or duplicating Team member Agents into standalone history.
- Rollout constraint: no automatic rerun of terminal development-machine records; disposable copied state supplies verification.
- Related IDs: `R-MIG-015`–`020`, `AC-MIG-015`–`020`.

## Out Of Scope

- Changing database schema migrations or repairing the operational production database manually.
- Correcting the base-feature-branch Team-stream `AGENT_STATUS` contract mismatch or token-ledger Prisma/schema mismatch discovered during manual verification; track those runtime defects separately.
- Automatically resetting a terminal migration record or mutating the user's operational history index solely because an unreleased development build previously ran incomplete `20260814` code.
- Supporting unknown legacy Team directory shapes.
- Runtime recovery/reactivation of live tasks across restart.
- Changing V1 file schemas, public Team APIs, UI behavior, or Electron release version.
- Replacing the embedded-server staging pipeline when the failing workspace link is in the web app production dependency graph.
- Publishing a release, tag, or update; Stage 10 remains user-verification gated.

## Open Questions / Risks

- The design must decide whether to migrate the existing custom-provider prerequisite guard to the generic runner contract now or leave it as explicitly documented pre-existing specialization. No second migration-specific guard may be introduced.
- Full AppImage validation is resource-intensive; a packaging environment failure unrelated to source must be classified separately with retained evidence.
- A synthetic mixed-state integration fixture must represent the real partial-promotion shape without copying private user content into the repository.
- Reconciliation must preserve index-only history fields without making the legacy index authoritative over overlapping current V1 execution-tree fields.
- The strict index read/write boundary and deterministic row projector must be reusable by migration reconciliation without teaching normal runtime to scan V1 directories as a fallback.

## Requirement-To-Use-Case Coverage

| Requirement IDs | Use Case IDs |
| --- | --- |
| `R-MIG-001`–`R-MIG-003` | `UC-MIG-001`–`UC-MIG-005`, `UC-MIG-007` |
| `R-MIG-004`, `R-MIG-005` | `UC-MIG-001`, `UC-MIG-006` |
| `R-MIG-006` | `UC-MIG-003`, `UC-MIG-004`, `UC-MIG-007` |
| `R-MIG-007`, `R-MIG-008` | `UC-MIG-004` |
| `R-MIG-009`, `R-MIG-010` | `UC-MIG-002`, `UC-MIG-003`, `UC-MIG-005` |
| `R-MIG-011`–`R-MIG-014` | `UC-MIG-004`, `UC-MIG-009` |
| `R-MIG-015`–`R-MIG-020` | `UC-MIG-004`, `UC-MIG-010` |
| `R-PKG-001`, `R-PKG-002` | `UC-PKG-001` |
| `R-PKG-003`–`R-PKG-005` | `UC-PKG-002`, `UC-PKG-003` |
| `R-TEST-001` | `UC-TEST-001` |

## Acceptance-Criteria-To-Stage-7 Scenario Intent

| Scenario ID | Mapped Acceptance Criteria | Planned Validation Mode |
| --- | --- | --- |
| `SCN-MIG-001` | `AC-MIG-001`, `AC-MIG-002`, `AC-MIG-009` | Unit filesystem classification matrix |
| `SCN-MIG-002` | `AC-MIG-003` | Unit current-V1 execution-tree token index |
| `SCN-MIG-003` | `AC-MIG-004`, `AC-MIG-007`, `AC-MIG-008` | Integration disposable mixed-state migration + retry |
| `SCN-MIG-004` | `AC-MIG-005`, `AC-MIG-006` | Unit runner prerequisite/attempt semantics |
| `SCN-MIG-005` | `AC-MIG-010` | Source and runtime-boundary audit |
| `SCN-MIG-006` | `AC-MIG-011`, `AC-MIG-013` | Unit released/exact/malformed communication-address conversion matrix |
| `SCN-MIG-007` | `AC-MIG-012`, `AC-MIG-014` | Integration operational-equivalent failed-V1 retry plus exact second-run inventory |
| `SCN-MIG-008` | `AC-MIG-015`–`AC-MIG-020` | Integration stale-index/current-V1 reconciliation, GraphQL workspace-history visibility, failure atomicity, partial-cohort exposure, idempotency, and source audit |
| `SCN-PKG-001` | `AC-PKG-001`, `AC-PKG-004` | Manifest/lockfile production-graph test and link snapshot |
| `SCN-PKG-002` | `AC-PKG-002` | Web unit/integration tests + Nuxt generation |
| `SCN-PKG-003` | `AC-PKG-003`–`AC-PKG-005` | Linux x64 full build + packaged server lifecycle |
| `SCN-TEST-001` | `AC-TEST-001` | V1 migration suite + repository path audit |

## Approval Status

The user explicitly approved continuing the migration improvement and re-entering requirements/design after `UV-002`. This refined behavior basis is therefore the input to proposed design v7; source changes remain locked pending the remaining workflow gates.
