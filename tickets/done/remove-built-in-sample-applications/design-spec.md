# Remove Built-In Sample Applications Design

## Current-State Read

The current repository keeps the same sample applications in two places:

- the app authoring/sample root: `applications/...`
- the server built-in package payload: `autobyteus-server-ts/application-packages/platform/applications/...`

This is the wrong current-state product model.

It creates:

- duplicate editable trees,
- ambiguous ownership,
- unnecessary sync burden,
- and the false impression that these toy/sample applications are mature shipped built-ins.

Two implementation-impact issues are now confirmed:

1. the current built-in materializer/source-root logic is still broad enough that deleting only the server-side built-in copies is not a stable end state, and
2. the current imported-package removal flow can strand stale local package rows when package-root settings and package registry persistence drift out of sync.

The design must therefore govern both the built-in source-root boundary and the stale imported-package cleanup boundary explicitly.

## Design Principle

Separate these stages clearly:

1. **Sample / authoring application**
   - lives under `applications/`
   - is the only current in-repo source of truth
   - is never implicitly treated as a built-in payload source

2. **Promoted built-in application**
   - only exists after explicit product promotion
   - is materialized from the server-owned built-in payload root only
   - is not the current status for Brief Studio or Socratic Math Teacher

And keep imported-package cleanup equally clear:

3. **Imported package cleanup**
   - reconciles stale package identity across settings and registry persistence
   - does not require the linked filesystem path to still exist
   - does not require the stale package to still be present in both persistence surfaces

## Spine Inventory

| spine_id | start | end | governing owner | why it matters |
| --- | --- | --- | --- | --- |
| `SP-001` | Server startup / package-registry refresh | Built-in package entry + managed built-in root ready for discovery | `ApplicationPackageRegistryService` | Defines what package roots exist before bundle discovery starts. |
| `SP-002` | Built-in materialization | Managed built-in root populated or intentionally left empty | `BuiltInApplicationPackageMaterializer` | Governs how the packaged built-in payload becomes the managed built-in discovery root. |
| `SP-003` | Bundle discovery | Catalog snapshot contains only real built-in bundles plus explicit additional packages | `ApplicationBundleService` | Ensures repo authoring roots do not appear as built-ins unless deliberately imported/provisioned. |
| `SP-004` | User clicks remove on stale package row | Stale package identity removed from all package persistence surfaces and UI list refreshes | `ApplicationPackageRegistryService` | Ensures user-facing package cleanup succeeds even when imported package path is gone or settings/registry drift exists. |

## Chosen Design

### 1. Keep built-in package infrastructure

Keep:

- built-in package root concept
- built-in package materializer capability
- package registry support for platform-owned built-ins

This infrastructure is valid for future use.

### 2. Empty the current built-in application payload

Remove current built-in sample app payloads from:

- `autobyteus-server-ts/application-packages/platform/applications/brief-studio`
- `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher`

Result:

- built-in infrastructure remains,
- but the built-in application set is currently empty.

### 3. Make `applications/` the only current source of truth

For current sample/teaching apps:

- `applications/brief-studio`
- `applications/socratic-math-teacher`

are the only authoritative in-repo roots.

No second editable copy should exist inside the server package tree.

### 4. Tighten the built-in materialization source boundary

This is the missing design clarification.

#### Authoritative owner

- `BuiltInApplicationPackageMaterializer`

#### Authoritative rule

`BuiltInApplicationPackageMaterializer` must materialize from the **server-owned built-in payload root only**.

That means:

- the materializer's bundled source root represents packaged built-in payload content owned by the server package,
- repo-root `applications/` is **not** a valid implicit built-in materialization source,
- repo-root authoring applications only participate in discovery through explicit non-built-in package-root provisioning/import paths.

#### Consequence

Deleting the built-in payload under `autobyteus-server-ts/application-packages/platform/applications/` is only valid together with this boundary tightening.

Without it, the system can still reintroduce sample apps into the managed built-in root through overly broad source-root resolution.

### 5. Stable empty built-in steady state

The server/package infrastructure must continue to behave correctly when:

- built-in root exists,
- server-owned built-in payload root contains zero apps,
- and managed built-in materialization therefore produces an empty `<app-data-dir>/application-packages/platform/applications/` tree.

That is a valid steady state, not an error and not a cue to scan repo-root `applications/` for replacement built-ins.

### 6. Discovery/package expectations after the clarification

After this change:

- built-in package registry entry still exists,
- managed built-in root still exists,
- built-in application count may legitimately be zero,
- bundle discovery sees zero built-in applications unless explicit promoted payload content exists,
- repo-root `applications/` content remains authoring-only until explicitly imported/provisioned through a non-built-in path.

### 7. Make stale imported packages always removable

This is the adjacent cleanup bug that must now be included in the same ticket.

#### Authoritative owner

- `ApplicationPackageRegistryService`

#### Authoritative rule

Removing an imported package is a **reconciliation cleanup operation** across package persistence surfaces, not a happy-path delete that assumes settings and registry are already synchronized.

That means a user-visible imported package row must remain removable when any of these are true:

- the linked local filesystem path no longer exists,
- the package root still exists in settings but the registry record is missing,
- the package root still exists in registry persistence but the settings entry is missing.

#### Removal contract

For removable non-built-in packages:

1. resolve the package row from the registry snapshot,
2. attempt to remove the package root from package-root settings **if present**,
3. attempt to remove the package record from registry persistence **if present**,
4. refresh catalog/definition caches,
5. return the refreshed package list.

Absence in one persistence surface is not a hard error if the stale package identity was cleaned from the other authoritative surface.

#### User-visible result

A missing/stale imported local package should still be removable from Settings. The remove action should clear the row instead of surfacing `Application package not found: <path>` merely because one persistence surface was already missing the root.

### 8. Promotion rule for the future

Future built-in application promotion should be explicit.

When an app becomes mature enough, the platform may decide to promote it to built-in. But that promotion should not mean manually maintaining two parallel source trees.

Preferred future rule:

- author in `applications/`
- promote/package explicitly into server-owned built-in payload when intentionally shipping
- then built-in materialization copies from that payload into the managed built-in root

## Interface / Boundary Clarification

### `BuiltInApplicationPackageMaterializer`

Responsibilities:

- determine the packaged built-in source root
- materialize built-in payload content into the managed built-in root
- preserve empty built-in payload as a valid materialization outcome

It must **not**:

- infer built-in applications from repo-root `applications/`
- silently broaden built-in source resolution to authoring roots
- act as a promotion mechanism from authoring/sample state to built-in state

### `ApplicationPackageRootSettingsStore`

Responsibilities remain:

- protect the managed built-in root from being registered as an additional root
- protect the packaged built-in source root from being registered as an additional root
- add/remove configured additional package roots when explicitly requested

It is a persistence surface, not the authoritative cleanup coordinator.

It must not force `ApplicationPackageRegistryService` callers to pre-know whether a stale package still exists in settings before cleanup can proceed.

### `ApplicationPackageRegistryStore`

Responsibilities remain:

- persist imported package registry records
- look up records by package id, root path, or normalized source
- add/remove package records when the authoritative service tells it to

It is also a persistence surface, not the authoritative cleanup coordinator.

### `ApplicationPackageRegistryService`

Responsibilities:

- govern package snapshot composition,
- govern package import/remove/reload flows,
- reconcile across package-root settings and package registry persistence,
- refresh dependent bundle/definition caches after authoritative package changes.

It must not assume both persistence surfaces are already synchronized before remove can succeed.

### `ApplicationBundleService`

Responsibilities remain:

- discover built-ins from the managed built-in root
- discover other apps from explicit additional roots

It must not gain fallback logic that reclassifies repo-root authoring applications as built-ins.

## Concrete Good / Bad Shapes

### Good built-in shape

`server-owned built-in payload root -> BuiltInApplicationPackageMaterializer -> managed built-in root -> bundle discovery`

### Bad built-in shape

`repo-root authoring applications -> BuiltInApplicationPackageMaterializer -> managed built-in root -> built-in discovery`

The bad shape is exactly what this ticket must forbid.

### Good removal shape

`Settings remove action -> ApplicationPackageRegistryService -> remove from settings if present + remove registry record if present -> refresh -> row disappears`

### Bad removal shape

`Settings remove action -> ApplicationPackageRegistryService -> require settings entry first -> fail before registry cleanup`

The bad removal shape is what strands stale package rows today.

## Change Inventory

### Remove

- `autobyteus-server-ts/application-packages/platform/applications/brief-studio`
- `autobyteus-server-ts/application-packages/platform/applications/socratic-math-teacher`

### Modify

- built-in materializer/source-root resolution logic so the packaged built-in source root is server-owned only
- application-package removal logic so stale imported packages can be removed even when settings/registry persistence drift exists
- docs that currently imply repo-local samples are current built-ins or can implicitly materialize as built-ins

### Keep

- built-in package registry/model/materializer infrastructure itself
- managed built-in root concept
- future possibility of promoted built-ins

## Rejected Design

### Rejected: keep the duplicate sample app trees “for convenience”

Rejected because it keeps two sources of truth and guarantees long-term drift/confusion.

### Rejected: remove built-in package infrastructure entirely

Rejected because the user explicitly wants to keep the infrastructure for future mature built-in applications.

### Rejected: let the materializer treat repo-root `applications/` as a fallback built-in source

Rejected because it collapses authoring state and shipping state into the same boundary and makes an empty built-in payload impossible to keep stable.

### Rejected: treat stale imported package removal as settings-only delete

Rejected because imported package persistence already spans both package-root settings and package registry state; a settings-only precondition strands user-visible stale rows.

## Migration / Refactor Sequence

1. Tighten the built-in materializer/source-root rule so it resolves only the server-owned built-in payload root.
2. Update imported-package removal so `ApplicationPackageRegistryService` reconciles both settings and registry persistence instead of assuming both are present.
3. Verify the empty payload path yields an empty managed built-in root without errors.
4. Verify stale/missing imported local package rows remain removable from Settings.
5. Remove Brief Studio and Socratic Math Teacher from `autobyteus-server-ts/application-packages/platform/applications/`.
6. Update documentation and debug/settings wording to reflect that current built-in app count is zero.
7. Keep future promotion as a later explicit packaging concern, not part of this cleanup ticket.

## One-Sentence Decision

Keep the built-in application package system, but make the current built-in app set empty, tighten built-in materialization so only the server-owned built-in payload root can feed the managed built-in root, and make imported-package removal reconcile stale package identity across settings and registry persistence so missing-path rows remain removable.
