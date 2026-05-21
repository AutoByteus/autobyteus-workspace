# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Improve the Agent Packages update experience. Users can currently import an agent package from either a local path or a public GitHub URL. Local paths remain user-owned, so advanced users can manually pull upstream changes, but the app gives them no package-specific update visibility or reload affordance. GitHub URL imports are installed into app-managed storage, so users have no obvious safe way to update an already-imported package when the remote repository changes.

The desired experience is source-aware: app-managed GitHub packages should be checkable and updatable inside AutoByteus; local-path packages should clearly remain user-managed, while Git-backed local paths should be inspectable for upstream drift and reloadable after external changes.

## Investigation Findings

- `autobyteus-web/components/settings/AgentPackagesManager.vue` currently lists package rows with source labels and a `Remove` button only. It imports by detecting GitHub URLs client-side and calling the store.
- `autobyteus-web/stores/agentPackagesStore.ts` only supports `fetchAgentPackages`, `importAgentPackage`, and `removeAgentPackage`. Import/remove refresh application, agent definition, and team definition stores.
- `autobyteus-web/graphql/agentPackages.ts` exposes only `agentPackages`, `importAgentPackage`, and `removeAgentPackage` fields.
- `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` exposes the same list/import/remove shape. No update status, update command, reload command, or details query is exposed for agent packages.
- `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` is the authoritative server owner for package list/import/remove and cache refresh. It maps package source kind and package summaries.
- `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` does not `git clone`; it downloads a GitHub default-branch tarball from codeload into app-managed storage. Therefore an app-managed GitHub update should redownload/validate/atomically replace the managed package rather than run `git pull`.
- `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` persists package records with source kind, source URL/path, normalized source, root path, managed install path, and timestamps, but no installed branch/SHA, checked-at time, or latest-remote metadata.
- `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts` and `autobyteus-server-ts/src/agent-team-definition/providers/cached-agent-team-definition-provider.ts` maintain in-memory caches. Any package update or local package reload must refresh those caches, same as import/remove already does.
- Application packages have a similar GitHub/local import model and an internal `reloadPackage` service method, but agent packages do not expose a similar reload/update capability. The immediate request is Agent Packages, but the UX pattern should be compatible with Application Packages to avoid divergent package-management behavior.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: The server owns package import/remove and cache refresh, but it does not own a source-version/update invariant. GitHub import source metadata is persisted, but not enough to know the installed revision or compare it to remote. The frontend cannot safely solve this because app-managed package files and catalog caches are server-owned.
- Requirement or scope impact: The implementation should introduce server-owned package source state and update/reload commands, then expose them through GraphQL/store/UI. The frontend should not directly run Git/GitHub/filesystem operations.

## Recommendations

1. **Use a card/list UI, not a table-first UI.** Each package row should show identity, source ownership, counts, current status, and only the next useful action.
2. **For all local-path packages, show `Reload` only.** Do not try to detect or update local Git repositories in this MVP. Local folders are user-managed; users can pull/edit externally, then click `Reload` so AutoByteus rescans the package.
3. **For app-managed public GitHub URL imports, show `Update` only when remote changes are available.** The normal state should be quiet (`Up to date` or no noisy action). When the remote default branch changes, show a clear `Update` button.
4. **Keep GitHub updates Git-free.** Continue using GitHub metadata plus tarball download/replace so the desktop app does not need to package Git.
5. **Make update automatic after click.** Clicking `Update` should download, validate, replace the app-managed package, refresh server caches, and refresh frontend package/agent/team/application lists.
6. **Improve duplicate GitHub import feedback.** If a user pastes an already-imported GitHub URL, the UX should direct them to the existing row’s `Update` flow instead of only saying “already exists.”
7. **Keep the update owner server-side.** The frontend should call GraphQL commands; `AgentPackageService` or a package-source service should own status checks, update execution, registry metadata, rollback, and cache refresh.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

Rationale: The minimal high-value version spans server package metadata, GitHub remote check/update mechanics, GraphQL schema, frontend store, settings UI, and tests. Local Git auto-pull and Application Packages parity can be separated if needed.

## In-Scope Use Cases

- `UC-001` User can see whether an app-managed GitHub-imported agent package has not been checked, is up to date, has an update available, or failed to check/update.
- `UC-002` User can update an app-managed GitHub agent package without deleting/re-importing it or touching app-managed folders manually.
- `UC-003` User can reload/rescan any non-default agent package after its files changed externally.
- `UC-004` User receives clearer feedback when trying to import a GitHub package that already exists.

## Out of Scope

- Marketplace/discovery flows.
- Direct private GitHub URL import/update authentication. Private repositories should be supported through local-path import plus `Reload` in this change.
- Local Git repository status detection or pull/update execution.
- Full Git conflict resolution UI.
- Automatic background package updates without explicit user consent.
- Mandatory Application Packages parity in the first Agent Packages change, unless the implementation owner chooses a shared helper that makes parity cheap.

## Functional Requirements

- `R-001` Agent package rows must expose source-aware state and actions in addition to source kind.
- `R-002` All local-path agent packages must show a `Reload` action that rescans package files from disk without mutating the local folder.
- `R-003` App-managed public GitHub agent packages must support an explicit remote update check that does not require Git.
- `R-004` App-managed public GitHub agent packages must show an `Update` action when the remote default branch has changed or when installed revision metadata is unknown and the user chooses to update to latest.
- `R-005` GitHub package updates must be staged, validated as an agent package, and committed atomically so a failed update leaves the previous package usable.
- `R-006` GitHub package update success must refresh server-side agent definition and agent team definition caches and refresh frontend dependent catalogs.
- `R-007` The package registry must persist enough source metadata for app-managed GitHub packages to report installed revision and last-checked/update status.
- `R-008` Duplicate GitHub import attempts must provide actionable feedback pointing to the existing package/update flow.
- `R-009` Built-in/default package rows must not show user-triggered update/remove actions that imply user control over platform-owned content.

## Acceptance Criteria

- `AC-001` Given a local-path package row, the user sees `Reload`; clicking it rescans package files and refreshes package counts plus dependent agent/team/application lists without modifying local files.
- `AC-002` Given an app-managed public GitHub package row, when the package is up to date, the row does not show a primary `Update` button.
- `AC-003` Given an app-managed public GitHub package row and a newer remote default-branch revision, the row shows `Update`.
- `AC-004` Given the user clicks `Update`, AutoByteus downloads the latest GitHub archive, validates it, replaces the managed package, refreshes catalogs, and shows success.
- `AC-005` Given a managed GitHub package update download, extraction, validation, registry write, or cache refresh failure, the previously installed package remains registered and available.
- `AC-006` Given an app-managed GitHub package was imported before revision metadata existed, the UI presents a clear `Unknown installed version`/`Update to latest` path rather than requiring delete/re-import.
- `AC-007` Given a user imports a GitHub URL that already exists, the user sees a message that the package is already installed and can be updated from its row if updates are available.
- `AC-008` Given a direct private GitHub URL import is attempted without supported credentials, the user sees guidance to clone locally and import the local path.

## Constraints / Dependencies

- Current GitHub import uses public GitHub tarball download, not `git clone`; update design should avoid requiring Git for app-managed GitHub packages.
- Local path folders are user-owned; app-managed GitHub folders are AutoByteus-owned.
- Agent definition and team definition caches are in-memory and must be refreshed after package content changes.
- GitHub public API/codeload access can fail or rate-limit; status should represent errors clearly.
- Existing registry records lack revision metadata and need an explicit migration/unknown-version state.

## Assumptions

- Public GitHub default-branch updates are sufficient for this first UX improvement; branch/tag pinning can be added later if users need it.
- Users prefer explicit update control over silent auto-updates because package changes can alter agent behavior.
- A safe local Git pull, if provided, should be `ff-only` and gated by clean worktree/upstream checks.

## Risks / Open Questions

- Should the first implementation include local Git pull execution, or only local Git status plus reload/manual guidance?
- Should status checks run automatically when opening Settings, or only on demand to avoid latency/rate-limit surprises?
- Should branch/tag pinning be introduced now, or kept as a later enhancement?
- Should the same change include Application Packages parity, or should that be a follow-up after Agent Packages ships?
- How much revision detail should be shown in the row versus behind an expandable details panel?

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| `UC-001` | `R-001`, `R-003`, `R-004`, `R-007` |
| `UC-002` | `R-004`, `R-005`, `R-006`, `R-007` |
| `UC-003` | `R-002`, `R-006` |
| `UC-004` | `R-008` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| `AC-001` | Local package reload/rescan without mutation. |
| `AC-002` | Quiet up-to-date state for managed GitHub packages. |
| `AC-003` | Visible update availability for managed GitHub packages. |
| `AC-004` | Successful managed GitHub package update. |
| `AC-005` | Update rollback and package availability on failure. |
| `AC-006` | Existing imported package migration/unknown revision handling. |
| `AC-007` | Duplicate GitHub import UX. |
| `AC-008` | Direct private GitHub URL import guidance when unauthenticated. |

## Approval Status

Approved by user on 2026-05-21 in conversation; ready for design and architecture review.
