# Remove Built-In Sample Applications Investigation Notes

## Status

- Bootstrap Status: Completed
- Current Status: Clarification gap and adjacent stale-package-removal bug investigated; authoritative design requires update before implementation
- Ticket Scope: Medium
- Severity: Medium-High architecture cleanliness issue with direct implementation impact

## Environment

- Repo worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-sample-applications`
- Branch: `codex/remove-built-in-sample-applications`
- Base/finalization branch: `origin/personal`

## User Clarification

The user explicitly clarified the intended product rule:

- keep built-in package/materializer infrastructure,
- but ship **no built-in applications right now**,
- keep Brief Studio / Socratic only in `applications/`,
- only promote an application into the built-in payload later through an explicit maturity/promotion decision,
- and stale/missing imported package rows should remain removable instead of getting stuck in Settings.

## Current Duplicate Layout

### Authoring/sample roots

- `applications/brief-studio`
- `applications/socratic-math-teacher`

### Current built-in package copies

- `autobyteus-server-ts/application-packages/platform/applications/brief-studio`
- `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher`

This means the same sample apps currently exist in two repository locations.

## Current Server Assumption

The current server-side package system still models built-in apps as a first-class built-in package root.

Key evidence:

- `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts`
  - `getRegistrySnapshot()` always calls `builtInMaterializer.ensureMaterialized()`.
  - The built-in package entry is always included in the registry snapshot.
- `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts`
  - `getBuiltInRootPath()` treats the managed built-in root as a special protected root.
  - `getBundledSourceRootPath()` also treats one bundled source root as a special protected root.
- `autobyteus-server-ts/docs/modules/applications.md`
  - still documents built-in applications as materialized from bundled resources into `<app-data-dir>/application-packages/platform/applications/`.

## New Design-Impact Gap Found During Implementation

Implementation found that deleting the server-owned built-in app payload alone is not stable.

### Code evidence

- `autobyteus-server-ts/src/application-packages/services/built-in-application-package-materializer.ts`
  - `getBundledSourceRootPath()` calls `resolveBundledApplicationResourceRoot(this.config.getAppRootDir())`.
  - `ensureMaterialized()` copies `<bundledSourceRoot>/applications` into the managed built-in root.
- `autobyteus-server-ts/src/application-bundles/utils/bundled-application-resource-root.ts`
  - walks upward from `serverAppRootDir` until it finds any ancestor containing `application-packages/platform/applications`.
  - then returns that ancestor's `application-packages/platform` as the bundled source root.

### Why this matters

The earlier design package assumed:

- remove the built-in app payload under `autobyteus-server-ts/application-packages/platform/applications/`
- leave the materializer/infrastructure alone
- built-in set becomes empty

But the actual implementation boundary still treats the resolved bundled source root as the authoritative built-in source, and the implementation team reports that current source-root/materializer behavior can still repopulate Brief Studio and Socratic into the managed built-in root from repo-local authoring/app-package trees unless that source boundary is explicitly tightened.

So the earlier design was incomplete.

## Adjacent Bug Found: Missing Imported Package Cannot Be Removed Cleanly

The Settings UI can show a stale imported local package whose filesystem path is already gone, but clicking **Remove** can fail with:

- `Application package not found: <path>`

### Code evidence

- `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts`
  - `getRegistrySnapshot()` intentionally surfaces both:
    - package roots present in settings but missing from registry, and
    - package roots present in registry but missing from settings.
  - `removePackage()` currently does:
    1. find package in snapshot
    2. call `rootSettingsStore.removeAdditionalRootPath(targetPackage.packageRootPath)` **unconditionally**
    3. remove the registry record
- `autobyteus-server-ts/src/application-packages/stores/application-package-root-settings-store.ts`
  - `removeAdditionalRootPath()` throws `Application package not found: <resolved>` when the root is not in configured additional roots.
- `autobyteus-server-ts/tests/unit/application-packages/application-package-service.test.ts`
  - already has coverage that registry/settings mismatches are surfaced as diagnostics.
  - but no coverage currently guarantees that a mismatched stale package row remains removable.

### Root cause

The problem is not the missing filesystem path by itself.

The real issue is that imported package persistence currently has **two authoritative persistence surfaces**:

1. package-root settings (`AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`)
2. package registry persistence (`application-packages/registry.json`)

`removePackage()` currently assumes the package is present in both stores and removes the settings entry first. When a row survives only in registry persistence, remove fails before registry cleanup can run.

### Why this matters architecturally

The Settings UI is intentionally showing stale package rows so the user can repair or remove them. That means remove behavior must be a **reconciliation cleanup operation**, not a happy-path delete that assumes persistence is already synchronized.

## Important Nuance

The problem is **not** the existence of built-in package infrastructure itself.

The two concrete problems are:

1. the built-in materialization/source-root boundary is still too loose conceptually, and
2. imported-package removal still assumes synchronized settings/registry state.

Without explicit design rules for both, implementation has to infer policy and can leave stale state stuck in user-facing Settings.

## Design Implication

The correct cleanup must now include these coupled decisions:

1. keep the infrastructure,
2. empty the current built-in application payload,
3. keep the sample apps only under `applications/`,
4. explicitly constrain built-in materialization to the **server-owned built-in payload root only**, never the repo-root authoring tree, and
5. make imported-package removal reconcile whichever persistence surfaces still contain the stale package identity.

## Architectural Conclusion

Current state mixes two lifecycle stages:

1. **authoring / sample stage**
2. **platform built-in shipping stage**

and also leaves imported-package cleanup split across two persistence surfaces without one tolerant reconciliation rule.

Those boundaries must be made explicit. Right now Brief Studio and Socratic are still in stage 1, so they must not also appear in stage 2, and stale imported package identities must remain removable even when package settings and registry persistence drift apart.
