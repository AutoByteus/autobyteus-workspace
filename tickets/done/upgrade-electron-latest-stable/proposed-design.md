# Proposed Design Document — Upgrade Electron To Latest Stable

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Define clean dependency/runtime upgrade path from Electron 38 to `42.4.1`, including native rebuild package replacement and validation spine. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/upgrade-electron-latest-stable/investigation-notes.md`
- Requirements: `tickets/in-progress/upgrade-electron-latest-stable/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `/Users/normy/autobyteus_org/autobyteus-skills/software-engineering-workflow-skill/shared/design-principles.md`

## Summary

The target design is a clean dependency-baseline upgrade, not a signing-policy patch. The Electron runtime owner remains `autobyteus-web/package.json`; pnpm lockfiles remain metadata outputs; `prepare-server` continues to invoke the `electron-rebuild` binary, but that binary must be provided by the current `@electron/rebuild` package instead of deprecated `electron-rebuild@3.2.9` so Electron 42 ABI is understood.

No Electron runtime source APIs or signing source files are redesigned. The main structural work is preserving clear ownership boundaries:

- Dependency target owner: `autobyteus-web/package.json`.
- Workspace lock owner: root `pnpm-lock.yaml`.
- Package-local historical lock metadata: `autobyteus-web/pnpm-lock.yaml`, removed if stale/inconsistent instead of retained as legacy metadata.
- Native rebuild owner: existing `autobyteus-web/scripts/prepare-server.mjs` and shell path, with CLI dependency replacement plus removal of the package-manager fallback to the deprecated rebuild package.
- Packaging owner: existing `autobyteus-web/build/scripts/build.ts`.
- Validation owner: Stage 7 artifact plus durable test/package commands.

## Goal / Intended Change

Upgrade the desktop runtime to verified latest stable `electron@42.4.1` and keep native rebuild/package validation compatible with Electron 42. The package metadata should make a deliberate major Electron upgrade visible and lockfiles should resolve consistently.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action in this scope: remove the deprecated direct dependency on `electron-rebuild@3.2.9` from project metadata and replace it with `@electron/rebuild@4.0.4`.
- Not in scope: retaining a parallel old Electron 38 fallback, dual Electron dependency, or compatibility wrapper around two rebuild tools.
- Gate rule: design would fail if it kept both `electron-rebuild` and `@electron/rebuild` as parallel direct dependencies just to preserve old behavior.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `REQ-001` | Verify latest stable Electron target. | `AC-001` | Official/npm latest is used. | `UC-001` |
| `REQ-002` | Update Electron metadata to latest stable. | `AC-001`, `AC-002` | Package/lock resolves `42.4.1`. | `UC-002` |
| `REQ-003` | Keep native rebuild compatible with Electron 42 ABI. | `AC-003` | Rebuild CLI supports Electron 42 ABI. | `UC-003` |
| `REQ-004` | Keep lock/package metadata consistent. | `AC-002` | Locks updated or rationale recorded. | `UC-002`, `UC-003` |
| `REQ-005` | Preserve signing implementation; validate signing-adjacent behavior only. | `AC-006` | No signing source/config changes unless justified. | `UC-004` |
| `REQ-006` | Validate major upgrade with tests and package smoke. | `AC-003`, `AC-004`, `AC-005`, `AC-007` | Tests/package/risk screen pass or blockers recorded. | `UC-003`, `UC-004`, `UC-005` |
| `REQ-007` | Sync durable docs/rationale. | `AC-008` | Docs updated or no-impact recorded. | `UC-006` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine | Desktop scripts call `prepare-server`, generate Electron output, transpile Electron/build scripts, then run `electron-builder`. | `autobyteus-web/package.json` scripts `build:electron*`; `autobyteus-web/build/scripts/build.ts:main()` | Whether Electron 42 on-demand binary download alters first-run timing. |
| Current Ownership Boundaries | Package metadata owns dependency versions; `prepare-server` owns native rebuild; `build.ts` owns electron-builder config. | `autobyteus-web/package.json`; `autobyteus-web/scripts/prepare-server.mjs`; `autobyteus-web/build/scripts/build.ts` | Whether package-local lockfile is actively consumed. |
| Current Coupling / Fragmentation Problems | Direct `electron-rebuild@3.2.9` package is deprecated and its locked `node-abi` cannot detect Electron 42. | Stage 1 `/tmp` node-abi probe; `pnpm view electron-rebuild`; `prepare-server.mjs` rebuild call. | None for design; validation must prove replacement works. |
| Existing Constraints / Compatibility Facts | CI desktop release jobs use Node 22; local Node is `v22.21.1`; `@electron/rebuild@4.0.4` requires Node `>=22.12.0`. | `.github/workflows/release-desktop.yml`; `node -v`; `pnpm view @electron/rebuild@4.0.4 engines`. | GitHub setup-node `22` should currently resolve a compliant Node 22 minor. |
| Relevant Files / Components | Dependency metadata, locks, prepare-server rebuild scripts, packaging docs; no runtime API code changes discovered. | `autobyteus-web/package.json`; `pnpm-lock.yaml`; `autobyteus-web/pnpm-lock.yaml`; `autobyteus-web/scripts/prepare-server.mjs`; `autobyteus-web/scripts/prepare-server.sh`; `autobyteus-web/docs/electron_packaging.md`; `autobyteus-web/README.md` | Whether docs need explicit update after implementation. |

## Current State (As-Is)

- `autobyteus-web/package.json` declares `electron: ^38.1.2`; root lock resolves Electron `38.8.2`; package-local lock resolves `38.8.0`.
- `autobyteus-web/package.json` declares direct `electron-rebuild: 3.2.9`.
- `prepare-server.mjs` and `prepare-server.sh` use the CLI name `electron-rebuild`, reading the Electron version from package metadata.
- `electron-builder@25.1.8` packages the app through `build/scripts/build.ts`.
- `electron-updater@6.8.3` owns update checks through `electron/updater/appUpdater.ts`.
- Signing implementation is already custom and recently fixed; this ticket must not modify signing policy unless Electron 42 package validation proves a required design impact.

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Verified Electron release source | Installed Electron binary/version used by desktop scripts | Desktop dependency metadata owner (`autobyteus-web/package.json`) | Ensures the app actually resolves the latest stable runtime instead of the minimum fixed patch. |
| `DS-002` | `Primary End-to-End` | Desktop package build script | Packaged app artifacts with rebuilt native modules | Packaging owner (`build.ts`) with native rebuild owner (`prepare-server.mjs`) | Covers the high-risk Electron 42 ABI/native-module packaging path. |
| `DS-003` | `Primary End-to-End` | Stage 7 validation commands | Recorded validation evidence and docs handoff | Workflow validation owner | Prevents hiding a major runtime upgrade inside metadata-only changes. |
| `DS-004` | `Bounded Local` | `prepare-server` reads Electron version specifier | `node-pty` rebuilt for Electron ABI | Native server bundle preparation owner | This internal flow is the key native ABI risk. |
| `DS-005` | `Return-Event` | Electron 42 package/test/build result | Re-entry classification or handoff evidence | Workflow gate owner | Test/build outcomes determine whether implementation stays local or re-enters design/requirements. |

## Primary Execution / Data-Flow Spine(s)

- `DS-001`: `Electron official/npm latest -> autobyteus-web/package.json -> pnpm lockfiles -> installed electron package -> electron CLI/runtime version`
- `DS-002`: `pnpm build:electron:mac -> prepare-server -> @electron/rebuild CLI -> node-pty native rebuild -> electron-builder -> macOS dmg/zip/app artifacts`
- `DS-003`: `Stage 7 scenario matrix -> electron version check -> electron tests -> mac package smoke -> artifact/signing-adjacent checks -> Stage 8 review/docs handoff`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| Electron release/npm source | External authority | Establishes target version `42.4.1` and runtime stack. |
| `autobyteus-web/package.json` | Dependency baseline owner | Declares Electron and rebuild dependency versions. |
| pnpm lockfiles | Deterministic resolution metadata | Pins exact Electron/rebuild package resolution for reproducible install/build. |
| `prepare-server.mjs` | Native server bundle owner | Rebuilds native modules for the Electron runtime. |
| `@electron/rebuild` CLI | Native rebuild tool | Provides Electron 42 ABI-aware rebuild path while keeping the existing CLI command name. |
| `build.ts` | Desktop packaging owner | Runs electron-builder and emits platform artifacts. |
| Stage 7 validation artifact | Verification owner | Records acceptance criteria closure. |

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The external latest-stable source sets the target, package metadata declares it, lockfiles pin it, and installed tooling confirms Electron resolves to `42.4.1`. | Latest stable target, dependency manifest, lock metadata, installed Electron binary. | `autobyteus-web/package.json` for manifest; root `pnpm-lock.yaml` for workspace resolution. | npm dist-tag verification; lock regeneration. |
| `DS-002` | Package build starts from documented scripts, bundles the server, rebuilds native `node-pty` against Electron 42 ABI, then electron-builder emits app/update artifacts. | Build script, server bundle, native rebuild, packaged artifact. | `autobyteus-web/build/scripts/build.ts` and `autobyteus-web/scripts/prepare-server.mjs`. | Node ABI mapping; on-demand Electron binary download; signing credentials. |
| `DS-003` | Validation runs dependency/version checks, focused Electron tests, package smoke, and diff checks before docs/handoff. | Scenario matrix, test command, build command, artifact evidence, docs sync. | Workflow Stage 7/8/9 artifacts. | Environment infeasibility handling; compensating evidence. |
| `DS-004` | `prepare-server` strips a leading range operator from the package Electron specifier, passes the exact version to `electron-rebuild`, and rebuilds `node-pty`. | Manifest version read, CLI invocation, native module output. | `prepare-server.mjs`. | Deprecated tool replacement while retaining CLI name. |
| `DS-005` | Validation failures return to the correct workflow stage instead of being patched directly. | Failure result, classification, re-entry path. | `workflow-state.md`. | Re-entry discipline. |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/package.json` | Desktop runtime dependency baseline. | Build sequencing, signing policy, updater runtime implementation. | Modify direct dependencies only. |
| Root `pnpm-lock.yaml` | Workspace deterministic dependency resolution. | Dependency intent. | Generated/updated from package metadata. |
| `autobyteus-web/pnpm-lock.yaml` | Package-local historical deterministic metadata if retained. | Workspace source of truth. | Remove stale local lock when consistent regeneration is not truthful. |
| `prepare-server.mjs` / `prepare-server.sh` | Native server staging and Electron ABI rebuild invocation. | Dependency version selection. | Keep ownership unchanged; remove the missing-CLI `pnpm dlx electron-rebuild` fallback so rebuild always uses the direct project dependency. |
| `build.ts` | Electron-builder configuration and artifact generation. | Native ABI package selection. | Keep source unchanged unless validation proves builder incompatibility. |
| `appUpdater.ts` | Runtime update behavior. | Dependency baseline. | Validate through tests; do not modify by default. |

## Return / Event Spine(s)

- `DS-005`: `Validation command result -> Stage 7 scenario status -> Workflow gate decision -> Stage 6/7/8 re-entry or Stage 8 review`

## Bounded Local / Internal Spines

- `DS-004`: Parent owner `prepare-server.mjs`.
  - Chain: `read web manifest -> normalize Electron version specifier -> run electron-rebuild CLI -> normalize node-pty spawn-helper execute bits -> publish server bundle`.
  - Why explicit: Electron 42 changes native ABI; the rebuild CLI must understand ABI `146` or desktop packaging breaks.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? |
| --- | --- | --- | --- |
| Official/npm version verification | Dependency baseline owner | Prevent stale “latest” assumptions. | `Yes` |
| Lock regeneration | Dependency metadata owner | Produce deterministic install metadata. | `Yes` |
| Node ABI support | Native rebuild owner | Ensure rebuild tooling understands Electron 42. | `Yes` |
| Signing-adjacent observation | Packaging validation owner | Record unsigned/signed package behavior without changing signing policy. | `Yes` |
| Docs sync | Handoff owner | Promote durable runtime/build expectations after validation. | `Yes` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Electron dependency declaration | `autobyteus-web/package.json` | `Reuse` | Existing owner for desktop runtime dependencies. | N/A |
| Native module rebuild | `autobyteus-web/scripts/prepare-server.mjs` | `Reuse` | Already owns server bundle and `node-pty` rebuild. | N/A |
| Package generation | `autobyteus-web/build/scripts/build.ts` | `Reuse` | Already owns electron-builder config and targets. | N/A |
| Updater behavior | `autobyteus-web/electron/updater/appUpdater.ts` | `Reuse` | Existing sole updater boundary. | N/A |
| Validation evidence | Workflow Stage 7 artifact | `Reuse` | Existing workflow validation owner. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web` dependency metadata | Electron/rebuild dependency baseline. | `DS-001`, `DS-004` | Desktop package owner. | `Reuse` | Modify package metadata only. |
| pnpm workspace metadata | Deterministic lock resolution. | `DS-001` | Workspace package manager. | `Reuse` | Root lock canonical. |
| Desktop server preparation | Native module staging/rebuild. | `DS-002`, `DS-004` | `prepare-server.mjs` / `prepare-server.sh`. | `Reuse` | Keep owner; remove package-manager fallback so the direct dependency is authoritative. |
| Desktop packaging | Electron-builder artifact generation. | `DS-002` | `build.ts`. | `Reuse` | No config changes planned. |
| Workflow validation/docs | Evidence and long-lived docs. | `DS-003`, `DS-005` | Ticket workflow. | `Reuse` | Stage artifacts + docs. |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - Package metadata declares Electron and rebuild tool versions.
  - `prepare-server` reads package metadata but does not own or hardcode package-manager resolution.
  - `build.ts` invokes packaging after server resources are prepared; it does not bypass `prepare-server` native rebuild ownership.
  - Validation commands depend on package scripts instead of directly invoking nested internals unless inspecting outputs.
- Authoritative public entrypoints versus internal owned sub-layers:
  - `pnpm -C autobyteus-web build:electron:*` scripts are authoritative package build entrypoints.
  - `prepare-server.mjs` is an internal build-step owner used by those scripts.
  - `@electron/rebuild` is an internal tool dependency behind `prepare-server`.
- Authoritative Boundary Rule:
  - Do not add validation/build paths that bypass `prepare-server` and call native rebuild internals independently as the normal package path.
  - Do not add alternate package scripts for Electron 42 while keeping old Electron 38 path.
- Forbidden shortcuts:
  - No dual Electron dependencies.
  - No old `electron-rebuild` plus new `@electron/rebuild` direct dependency in parallel.
  - No signing source edits to “make the upgrade look fixed” unless validation proves actual incompatibility.
- Temporary exceptions and removal plan: none.

## Architecture Direction Decision

- Chosen direction: `Modify` dependency metadata and root lockfile; `Remove` deprecated direct rebuild package and stale package-local lockfile; `Add` direct `@electron/rebuild` package; `Keep` existing build, updater, signing, and prepare-server ownership boundaries while deleting the legacy package-manager fallback inside prepare-server scripts.
- Rationale:
  - Complexity: small source surface, avoids unnecessary build-script churn because replacement package keeps the CLI name.
  - Testability: explicit Stage 7 scenarios prove version resolution, rebuild CLI, tests, and package output.
  - Operability: exact Electron baseline is visible and deterministic; no runtime fallback ambiguity.
  - Evolution cost: future Electron upgrades remain package metadata + validation, with current rebuild tooling.
- Data-flow spine clarity assessment: `Yes`.
- Spine inventory completeness assessment: `Yes`.
- Ownership clarity assessment: `Yes`.
- Off-spine concern clarity assessment: `Yes`.
- Authoritative Boundary Rule assessment: `Yes`.
- File placement within the owning subsystem assessment: `Yes`.
- Outcome: `Modify`, `Add`, `Remove`, `Keep`.

## Common Design Practices Applied

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Adapter/tool replacement | `electron-rebuild` package -> `@electron/rebuild` package | Keeps same CLI contract while updating implementation package. | Native rebuild owner. | No new wrapper needed. |
| Validation gate | Stage 7 scenarios | Makes major runtime risk explicit. | Workflow validation owner. | Required before code review/docs. |
| Clean-cut replacement | Remove deprecated direct package | Avoids legacy compatibility. | Dependency metadata owner. | No dual-tool fallback. |

## Ownership And Structure Checks

| Check | Result | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | `No` | Existing package scripts already centralize build command chains. | Keep |
| Responsibility overload exists in one file or one optional module grouping | `No` | Dependency metadata, native rebuild, packaging, updater are separate owners. | Keep |
| Proposed indirection owns real policy, translation, or boundary concern | `N/A` | No new source indirection proposed. | Remove/avoid empty indirection |
| Every off-spine concern has a clear owner on the spine | `Yes` | Version verification, lock generation, ABI support, docs sync mapped above. | Keep |
| Authoritative Boundary Rule is preserved | `Yes` | Use existing package/build entrypoints and no direct bypass. | Keep |
| Existing capability area/subsystem was reused or extended where natural | `Yes` | Reuse package metadata, prepare-server, build.ts, updater tests/docs. | Reuse |
| Repeated structures were extracted into reusable owned files where needed | `N/A` | No repeated source structures introduced. | Keep Local |
| Current structure can remain unchanged without spine/ownership degradation | `Yes` for source boundaries; `No` for deprecated rebuild dependency. | Stage 1 native ABI probe. | Change dependency metadata only. |

## Optional Alternatives

| Option | Summary | Pros | Cons | Decision | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Only bump `electron` to `42.4.1`. | Smallest diff. | Likely breaks native rebuild because old `node-abi` cannot detect Electron 42. | Rejected | Investigation showed native rebuild risk is real. |
| B | Bump Electron and replace `electron-rebuild` with `@electron/rebuild`; keep build source unchanged. | Solves target and native ABI risk with minimal ownership-preserving diff. | Requires lockfile update and package smoke. | Chosen | Best balance of cleanliness and scope. |
| C | Also bump `electron-builder` and `electron-updater` to latest. | More current dependencies. | Broadens ticket beyond Electron runtime; may introduce unrelated package/update changes. | Rejected by default | Only revisit if validation proves required. |
| D | Add source wrapper to choose rebuild tool dynamically. | Could preserve old behavior. | Creates legacy dual-path compatibility and empty indirection. | Rejected | Violates clean-cut policy. |

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Modify` | `autobyteus-web/package.json` | same | Set Electron dependency to exact latest stable `42.4.1`. | Desktop dependency metadata. | Exact pin makes the verified major runtime baseline explicit. |
| `C-002` | `Remove` | `autobyteus-web/package.json` direct `electron-rebuild` | N/A | Deprecated package lacks Electron 42 ABI support through current locked node-abi. | Native rebuild dependency. | Remove direct old package. |
| `C-003` | `Add` | N/A | `autobyteus-web/package.json` direct `@electron/rebuild: 4.0.4` | Replacement package provides same `electron-rebuild` CLI and current ABI support. | Native rebuild dependency. | Existing scripts can keep CLI name. |
| `C-004` | `Modify` | `pnpm-lock.yaml` | same | Resolve Electron/rebuild package changes deterministically. | Workspace lock metadata. | Generated by pnpm install/update. |
| `C-005` | `Remove` | `autobyteus-web/pnpm-lock.yaml` | N/A | Remove stale package-local lock metadata after clean regeneration produced inconsistent pseudo-workspace churn. | Lock metadata cleanup. | Root `pnpm-lock.yaml` remains canonical. |
| `C-006` | `Modify` | `autobyteus-web/docs/electron_packaging.md` and/or README docs | same | Record Electron 42 baseline/native rebuild expectation if docs are impacted. | Durable docs. | Stage 9 final decision. |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Direct `electron-rebuild@3.2.9` dependency | Deprecated and ABI mapping does not know Electron 42. | Direct `@electron/rebuild@4.0.4` package in `autobyteus-web/package.json`; same `electron-rebuild` CLI. | In This Change | No wrapper/fallback retained. |
| Electron 38 dependency baseline | Superseded by latest stable Electron 42. | Exact `electron@42.4.1` dependency and lock. | In This Change | No dual runtime. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/package.json` | Desktop package metadata | Dependency baseline owner | Electron/runtime and rebuild tool dependency declarations. | Package metadata belongs in package manifest. | N/A |
| `pnpm-lock.yaml` | Workspace package manager metadata | Deterministic resolver | Lock exact dependency graph. | Existing canonical workspace lock. | N/A |
| `autobyteus-web/pnpm-lock.yaml` | Package-local package manager metadata | Historical/local lock metadata | Remove stale local lock if not truthfully regenerable. | Existing repository-resident lock. | N/A |
| `autobyteus-web/docs/electron_packaging.md` | Durable docs | Desktop packaging docs owner | Electron baseline/native rebuild notes. | Existing detailed packaging docs. | N/A |

## Reusable Owned Structures Check

No shared runtime structures, DTOs, schemas, mappers, or models are introduced. Reusable owned structure extraction is `N/A`.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Shared Core Vs Specialized Variant Decision Is Sound? | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| N/A | `N/A` | `N/A` | `Low` | `N/A` | No shared data model changes. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/package.json` | Desktop package metadata | Desktop dependency baseline | Electron and native rebuild dependency declarations. | Existing package manifest. | N/A |
| `pnpm-lock.yaml` | Workspace package manager | Deterministic install resolution | Root workspace dependency graph. | Existing canonical lock. | N/A |
| `autobyteus-web/pnpm-lock.yaml` | Package-local package manager | Stale local lock metadata | Removed when not truthfully regenerable. | Existing lockfile. | N/A |
| `autobyteus-web/docs/electron_packaging.md` / README | Docs | Desktop packaging documentation | Electron 42/native rebuild/package validation notes. | Existing docs are natural durable owner. | N/A |

## Derived Implementation Mapping

| Target File | Change Type | Mapped Spine ID | Owner / Off-Spine Concern | Responsibility | Key APIs / Interfaces | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/package.json` | `Modify` | `DS-001`, `DS-004` | Dependency metadata owner | Set `electron` to `42.4.1`; replace `electron-rebuild` with `@electron/rebuild`. | package manifest dependency fields. | Source/package edit only after Stage 6 unlock. |
| `pnpm-lock.yaml` | `Modify` | `DS-001` | Workspace lock owner | Resolve exact Electron/rebuild package versions. | pnpm lockfile. | Generated/updated by pnpm. |
| `autobyteus-web/pnpm-lock.yaml` | `Remove` | `DS-001` | Package-local lock cleanup | Remove stale repository-resident local lock after inconsistent regeneration attempt. | pnpm lockfile. | Root `pnpm-lock.yaml` remains canonical. |
| Docs file TBD | `Modify` or `N/A` | `DS-003` | Docs owner | Record durable upgrade/build expectations. | Markdown docs. | Stage 9 decides final docs impact. |

## File Placement And Ownership Check

| File | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? | Flat-Or-Over-Split Risk | Action | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Package manifest | `autobyteus-web/package.json` | same | Desktop web/electron package metadata. | `Yes` | `Low` | `Keep` | Correct owner. |
| Root lockfile | `pnpm-lock.yaml` | same | Workspace dependency lock. | `Yes` | `Low` | `Keep` | Correct owner. |
| Package-local lockfile | `autobyteus-web/pnpm-lock.yaml` | N/A | Stale package-local historical lock metadata. | `N/A` after removal | `Low` | `Remove` | Avoid retaining inconsistent legacy metadata; root lock is canonical. |
| Packaging docs | `autobyteus-web/docs/electron_packaging.md` | same | Desktop packaging docs. | `Yes` | `Low` | `Keep` | Existing durable docs owner. |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Native rebuild package replacement | `devDependencies: { "@electron/rebuild": "4.0.4" }` while scripts use `pnpm exec electron-rebuild` from the direct project dependency | Keep `electron-rebuild@3.2.9`, add `@electron/rebuild` only as fallback, or use `pnpm dlx electron-rebuild` | The CLI contract remains stable while package ownership is modernized and deterministic. |
| Electron target pin | `"electron": "42.4.1"` with lock resolving `42.4.1` | `"electron": ">=40.9.3"` or broad range that only encodes minimum fix | User requested latest stable, not minimum fixed version. |
| Validation path | Use package script `pnpm -C autobyteus-web build:electron:mac -- --arm64` | Directly run `electron-builder` with ad-hoc config and skip `prepare-server` | Package script preserves authoritative build boundary and native rebuild path. |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep Electron 38 fallback/range beside Electron 42 | Could reduce risk if package build fails. | `Rejected` | Single latest stable Electron baseline with workflow re-entry for failures. |
| Keep `electron-rebuild@3.2.9` and add `@electron/rebuild` in parallel | Could preserve old lock behavior. | `Rejected` | Replace direct deprecated package with current package that owns the same CLI. |
| Add or retain package-manager/script fallback to old rebuild tooling | Could hide missing local CLI or work around ABI detection. | `Rejected` | Use ABI-aware supported rebuild package as a direct dependency; missing CLI is a package metadata failure. |
| Change signing implementation as part of Electron upgrade | Signing was adjacent in prior ticket. | `Rejected` by default | Validate package/signing-adjacent output without changing signing code. |

## Derived Interface Boundary Mapping

| Owning File | Mapped Spine ID | Owner / Off-Spine Concern | Subject Owned | Concern / Responsibility | Interfaces / APIs / Methods | Accepted Identity Shape(s) | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `autobyteus-web/package.json` | `DS-001` | Dependency metadata | Electron runtime baseline | Direct dependency declarations | npm package specifiers | Package names and semver exact versions | package manager consumes manifest | npm registry/pnpm |
| `prepare-server.mjs` / `prepare-server.sh` | `DS-004` | Native rebuild owner | Native server bundle | Rebuild `node-pty` for Electron | `pnpm exec electron-rebuild -v <version> -m <dir> -w node-pty` | Electron version string from manifest | Rebuilt native module | Direct `@electron/rebuild` CLI |
| Stage 7 artifact | `DS-003` | Validation owner | Acceptance criteria closure | Scenario matrix and evidence | Shell commands/checks | scenario IDs + AC IDs | pass/fail/blocker evidence | package scripts |

## Scope-Appropriate Separation Of Concerns Check

- UI/frontend scope: no UI source changes planned.
- Non-UI/infrastructure scope: package manifest owns dependency declarations; build scripts own packaging; prepare-server owns native staging; docs own durable expectations.
- Integration/infrastructure scope: `@electron/rebuild` remains an integration/tool dependency behind the existing prepare-server boundary.
- Ownership note: no new helper is introduced; existing owners are reused.
- File-placement note: all planned changes remain in existing owning files.
- Layout note: compact metadata/docs-only layout is clearer than adding new folders or scripts.

## Interface Boundary Check

| Interface / API / Query / Command / Method | Subject Owned | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous-ID Or Generic-Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| `pnpm -C autobyteus-web exec electron-rebuild -v <version> -m <targetDir> -w node-pty` | Native module rebuild | `Yes` | `Yes` (`version`, module dir, package name) | `Low` | Keep; dependency package supplies compatible CLI. |
| `pnpm -C autobyteus-web build:electron:mac -- --arm64` | Desktop mac package build | `Yes` | `Yes` (`--arm64` target) | `Low` | Use in validation. |
| Package dependency specifier `electron: 42.4.1` | Electron runtime baseline | `Yes` | `Yes` (exact version) | `Low` | Apply in Stage 6. |

## Naming Decisions

| Item Type | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| Package dependency | `electron` | `electron` | Official runtime package name. | Version changes only. |
| Package dependency | `electron-rebuild` | `@electron/rebuild` | Current supported package name; old package deprecated. | Binary remains `electron-rebuild`. |
| Ticket files | N/A | Existing workflow artifact names | Workflow convention. | Keep. |

## Naming Drift Check

| Item | Current Responsibility | Does Name Still Match? | Corrective Action | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `prepare-server.mjs` | Prepare bundled server resources and rebuild native modules. | `Yes` | `N/A` | N/A |
| `build.ts` | Electron-builder package orchestration. | `Yes` | `N/A` | N/A |
| `electron-rebuild` direct package name | Native rebuild dependency. | `No` | Replace package with `@electron/rebuild`. | `C-002`, `C-003` |
| `autobyteus-web/pnpm-lock.yaml` | Stale package-local lock metadata. | `No` after target cleanup. | Remove stale file; root lock is canonical. | `C-005` |

## Existing-Structure Bias Check

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Native rebuild scripts | `Low` | Add new rebuild script wrapper. | `Keep` | Existing owner is correct; package replacement is enough. |
| Package-local lockfile | `Medium` | Remove stale lockfile and declare root lock only. | `Keep/update` | Removal is broader lock policy cleanup; updating is lower-risk for this ticket. |
| Signing scripts | `Low` | Modify signing policy for Electron 42. | `Keep` | No evidence of required signing source change. |

## Anti-Hack Check

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Minimum fixed version `40.9.3` instead of latest stable | `High` | Use verified latest stable `42.4.1`. | Reject shortcut | User explicitly requested latest stable. |
| Keep deprecated rebuild package despite ABI failure risk | `High` | Replace with `@electron/rebuild`. | Reject shortcut | Native packaging must be validated. |
| Invoke electron-builder directly in validation to avoid prepare-server failures | `High` | Use package build script and fix real native rebuild issue. | Reject shortcut | Would hide native server packaging risk. |

## Dependency Flow And Cross-Reference Risk

| Dependency Boundary | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| Package manifest -> pnpm lock | npm registry | package scripts, CI, local dev | `Low` | Regenerate lock and verify resolution. |
| `prepare-server` -> `electron-rebuild` CLI | Direct `@electron/rebuild` package | packaged server native modules | `Medium` | Replace deprecated package, remove package-manager fallback, and run package smoke. |
| `build.ts` -> electron-builder | `electron-builder@25.1.8` | desktop artifacts | `Medium` | Validate package build; only update builder if needed by evidence. |
| `appUpdater.ts` -> electron-updater | `electron-updater@6.8.3` | update checks/download/install | `Low/Medium` | Run existing Electron tests; package metadata smoke. |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Direct `electron-rebuild@3.2.9` dependency and missing-CLI fallback | Remove from `autobyteus-web/package.json`; remove fallback from prepare-server scripts; remove lock entries when pnpm regenerates if unused. | Replaced by direct `@electron/rebuild`. | `pnpm -C autobyteus-web exec electron-rebuild --help`; package metadata; package smoke; lock grep. |
| Electron 38 lock entries | Update root lock and remove stale local lock; ensure no direct Electron 38 resolution remains for `autobyteus-web`. | Replaced by `electron@42.4.1`. | `rg "electron@38|version: 38\." pnpm-lock.yaml autobyteus-web/package.json`; package-local lock absent. |

## Data Models

No app data models are changed.

## Error Handling And Edge Cases

- If `electron-builder@25.1.8` fails with Electron 42-specific incompatibility, classify as `Local Fix` if dependency-only, or `Design Impact` if packaging architecture changes are needed.
- If Electron 42 binary is not downloaded at install time, validation should intentionally run `pnpm -C autobyteus-web exec electron --version` to trigger/confirm on-demand resolution before package build.
- If package-local lockfile update is not feasible through pnpm without disturbing workspace metadata, record rationale and ensure root lock is canonical.
- If local package smoke lacks signing credentials, record unsigned local build status without modifying signing source.
- If Node engine for `@electron/rebuild` fails in CI, update CI/documented Node minor as design impact; current Node 22 evidence suggests this is unlikely.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered | Fallback Path Covered | Error Path Covered | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `REQ-001` | Verify latest stable Electron target. | `Yes` | `Yes` | `Yes` | `FS-UC-001` |
| `UC-002` | `REQ-002`, `REQ-004` | Update Electron package metadata and lockfiles. | `Yes` | `Yes` | `Yes` | `FS-UC-002` |
| `UC-003` | `REQ-003` | Upgrade native rebuild dependency path. | `Yes` | `Yes` | `Yes` | `FS-UC-003` |
| `UC-004` | `REQ-005` | Preserve signing implementation during validation. | `Yes` | `N/A` | `Yes` | `FS-UC-004` |
| `UC-005` | `REQ-006` | Run focused Electron tests and package smoke. | `Yes` | `Yes` | `Yes` | `FS-UC-005` |
| `UC-006` | `REQ-007` | Sync durable docs. | `Yes` | `N/A` | `Yes` | `FS-UC-006` |

## Migration / Rollout

1. Stage 6 package metadata edit:
   - Set `electron` to exact `42.4.1`.
   - Remove `electron-rebuild` direct dependency.
   - Add `@electron/rebuild` exact `4.0.4`.
2. Regenerate root lockfile.
3. Remove stale package-local lockfile if clean regeneration is inconsistent; root lock remains canonical.
4. Run install/version/rebuild/test/package validation in Stage 6/7.
5. Re-enter if native rebuild or package smoke reveals incompatibility.
6. Sync durable docs in Stage 9.

## Change Traceability To Implementation

| Change ID | Implementation Task(s) | Verification | Status |
| --- | --- | --- | --- |
| `C-001` | Edit Electron dependency to `42.4.1`. | `pnpm -C autobyteus-web exec electron --version`; lock inspection. | Planned |
| `C-002` | Remove direct `electron-rebuild`. | `rg "electron-rebuild" autobyteus-web/package.json pnpm-lock.yaml`; ensure no direct importer old package. | Planned |
| `C-003` | Add direct `@electron/rebuild@4.0.4`. | `pnpm -C autobyteus-web exec electron-rebuild --help`; package metadata; package smoke. | Planned |
| `C-004` | Regenerate root lock. | `pnpm install --lockfile-only`; lock diff. | Planned |
| `C-005` | Remove stale package-local lockfile if clean regeneration is inconsistent. | package-local lock absence and root lock inspection. | Planned |
| `C-006` | Docs update/no-impact decision. | Stage 9 docs sync. | Planned |

## Design Feedback Loop Notes

| Date | Trigger | Classification | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-06-19 | Initial design | N/A | N/A | Yes | v1 design created. | Open for Stage 5 review |
| 2026-06-19 | Stage 6 no-legacy cleanup | Local implementation sharpening | Missing-CLI package-manager fallback could bypass direct dependency and old package cleanup. | Yes (AC-003 clarified) | Design text updated to remove stale local lock and package-manager fallback. | Applied without new use cases. |

## Open Questions

- Resolved: clean local-lock regeneration created inconsistent pseudo-workspace churn, so `autobyteus-web/pnpm-lock.yaml` is removed and root `pnpm-lock.yaml` remains canonical.
- Resolved in Stage 7: `electron-builder@25.1.8` packaged Electron 42.4.1 successfully on local macOS ARM64.
- Resolved in Stage 7: installed package metadata and package smoke resolved/downloaded Electron 42 without adding a pre-build command.
