# Agent Packages

## Scope

Owns the server-side lifecycle for package roots that contribute shared agents,
team-local agents, and agent teams to the definition catalogs. This module is
the authoritative boundary for package source identity, import, removal, local
reload, managed GitHub update checks, managed GitHub update execution, and
post-mutation cache refresh.

## TS Source

- `src/agent-packages`
- `src/api/graphql/types/agent-packages.ts`

## Main Services And Stores

- `src/agent-packages/services/agent-package-service.ts`
- `src/agent-packages/stores/agent-package-root-settings-store.ts`
- `src/agent-packages/stores/agent-package-registry-store.ts`
- `src/agent-packages/installers/github-agent-package-installer.ts`

## Source Ownership Model

| Source kind | Ownership | Supported lifecycle |
| --- | --- | --- |
| `BUILT_IN` | Platform-owned default package root. | Listed for inventory only; not removable, reloadable, checkable, or user-updatable. |
| `LOCAL_PATH` | User-owned local folder linked into AutoByteus. | Import, remove, and explicit reload/rescan. AutoByteus validates and reads the folder but does not pull Git or mutate the source folder. |
| `GITHUB_REPOSITORY` | AutoByteus-managed installation copied from a public GitHub repository archive. | Import, remove, update check, and explicit update through archive download/validation/replacement. No system `git` binary is required. |

## GitHub Update State

Managed GitHub package registry records persist source metadata:

- default branch
- installed revision
- latest checked revision
- latest checked time
- last update/check error
- update status

The update status values are:

- `NOT_CHECKED`: metadata exists but no update check has been run yet.
- `UNKNOWN`: an installed revision is missing, usually for a legacy managed
  GitHub record created before revision metadata was persisted. The package can
  be updated to latest to normalize the record.
- `UP_TO_DATE`: installed revision matches the latest known default-branch
  revision.
- `UPDATE_AVAILABLE`: latest known default-branch revision differs from the
  installed revision.
- `CHECK_FAILED`: the last metadata refresh failed; the package remains usable
  with its previous files.
- `UPDATE_FAILED`: the last update attempt failed; the package remains usable
  with the prior package files and recorded metadata/error.
- `RELOAD_AVAILABLE`: local packages can be rescanned after external edits.
- `NOT_APPLICABLE`: built-in/platform-owned packages do not expose user
  lifecycle actions.

## GraphQL Contract

`agentPackages` returns package inventory plus `updateInfo` for row actions and
copy. Mutations are thin adapters over `AgentPackageService`:

- `importAgentPackage(input)` links a local path or installs a public GitHub
  repository archive.
- `removeAgentPackage(packageId)` removes a non-default package source.
- `reloadAgentPackage(packageId)` validates and rescans a local package without
  mutating its folder.
- `checkAgentPackageUpdates(packageIds?)` refreshes managed GitHub
  default-branch metadata for all or selected GitHub packages.
- `updateAgentPackage(packageId)` downloads, validates, and replaces a managed
  GitHub package with the latest default-branch archive.

## Runtime And Cache Refresh Invariant

Every successful package import, removal, local reload, or managed GitHub update
must refresh the package-derived agent definition and agent team definition
caches before returning the latest package inventory. Frontend stores then
refresh Applications, Agents, and Agent Teams so source mutations are visible in
the same session.

## Failure And Rollback Rules

- Duplicate GitHub imports are rejected with guidance to use the existing row's
  update/check flow.
- Direct private GitHub URL imports are not authenticated. Users should clone or
  sync private repositories locally, import the local path, and use local
  package reload after external updates.
- GitHub update checks never modify package files. Check failures persist
  `CHECK_FAILED` metadata and preserve the previous package state.
- GitHub updates stage the new archive materialization, validate package shape,
  update registry metadata, refresh caches, and then commit the replacement.
  If metadata fetch, staging, validation, registry write, cache refresh, or
  replacement commit fails, the previous package record/files remain available
  and `UPDATE_FAILED` metadata records the error.

## Notes

- Public GitHub default-branch archives are the only managed remote update path
  in this module. Local Git pull/status execution is intentionally out of
  scope.
- Managed install paths are support/debug details. User-facing list rows should
  prefer repository identity for GitHub packages and the selected local path for
  local packages.
- Agent and team definition modules own definition parsing, identity, and
  edit-time invariants; Agent Packages owns package source lifecycle and cache
  refresh coordination.
