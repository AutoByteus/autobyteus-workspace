# Remove Built-In Sample Applications Requirements

## Problem Summary

The repository currently keeps Brief Studio and Socratic Math Teacher in two places:

- `applications/...`
- `autobyteus-server-ts/application-packages/platform/applications/...`

That creates two editable copies of the same toy/sample applications.

This is not acceptable as the current product model because:

- it creates two potential sources of truth,
- it makes ownership confusing,
- it encourages drift between authoring and built-in package copies,
- these applications are not mature enough to be shipped as built-in platform applications,
- the current built-in materializer/source-root logic can still repopulate the managed built-in root from repo-local authoring roots unless the source boundary is explicitly tightened, and
- stale imported package rows with missing local paths can currently become unremovable when package settings and registry persistence drift apart.

## Product Principle

- The platform may keep **built-in application package infrastructure**.
- But **currently the shipped built-in application set shall be empty**.
- In-repo sample/teaching applications shall live only under `applications/` until they are deliberately promoted later.
- Repo-root `applications/` is an **authoring source**, not a built-in packaging source.
- Imported application packages remain **user-managed package links** and must stay removable even when the linked path is gone.

## Required Outcomes

- `R-001`: Brief Studio and Socratic Math Teacher shall no longer ship as built-in platform applications under `autobyteus-server-ts/application-packages/platform/applications/`.
- `R-002`: The built-in application package infrastructure shall remain in place so future mature built-in apps are still supported.
- `R-003`: `applications/` shall be the only in-repo source of truth for current sample/teaching applications.
- `R-004`: Discovery, package registry, and startup behavior shall continue to work when the built-in applications root exists but contains zero built-in applications.
- `R-005`: Docs and settings/debug surfaces shall stop implying that Brief Studio and Socratic Math Teacher are currently shipped built-ins.
- `R-006`: The design shall establish a promotion rule: future built-in apps are introduced only by explicit promotion after maturity, not by maintaining parallel editable copies.
- `R-007`: If future built-in promotion is needed, the built-in payload shall come from an explicit packaging/promotion flow rather than from manually maintained duplicate source trees.
- `R-008`: Built-in materialization shall resolve from the **server-owned built-in payload root only** and shall not treat repo-root `applications/` as a bundled built-in source.
- `R-009`: When the server-owned built-in payload root contains zero applications, built-in materialization shall preserve an empty managed built-in root as a valid steady state instead of recreating sample apps from any authoring tree.
- `R-010`: Repo-root `applications/` applications shall only enter discovery through explicit package-root registration/import or other deliberate non-built-in provisioning paths, never through implicit built-in materialization.
- `R-011`: Removing an imported application package shall succeed even when its local root path no longer exists.
- `R-012`: Imported-package removal shall reconcile both persisted package-root settings and persisted package registry records instead of assuming both stores are already in sync.
- `R-013`: A stale imported package row that is present only in package-root settings or only in package registry persistence shall remain removable from the Settings UI.

## Acceptance Criteria

- `AC-001`: No built-in sample application copies remain under `autobyteus-server-ts/application-packages/platform/applications/` for Brief Studio or Socratic Math Teacher.
- `AC-002`: Current app discovery/package infrastructure still initializes correctly with an empty built-in applications root.
- `AC-003`: Repo documentation clearly states that the current sample applications are authoring/sample apps under `applications/`, not shipped built-ins.
- `AC-004`: The design explicitly separates “keep built-in infrastructure” from “ship built-in applications now”.
- `AC-005`: The design explicitly documents promotion-to-built-in as a future explicit decision rather than the current state.
- `AC-006`: The design explicitly changes built-in materialization/source-root behavior so repo-root `applications/` is never treated as the bundled built-in payload for current startup/materialization.
- `AC-007`: The design makes the empty server-owned built-in payload a stable steady state: after startup/materialization, the managed built-in root stays empty when no promoted built-ins exist.
- `AC-008`: If a user-imported local application package root has been deleted on disk, the Settings UI can still remove the stale package row successfully.
- `AC-009`: If package-root settings and package registry persistence are out of sync, remove action still cleans up the stale package identity instead of failing with `Application package not found: <path>`.
