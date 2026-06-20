# Future-State Runtime Call Stacks — Upgrade Electron To Latest Stable

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/in-progress/upgrade-electron-latest-stable/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/in-progress/upgrade-electron-latest-stable/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - Data-Flow Spine Inventory
  - Primary Execution / Data-Flow Spine(s)
  - Ownership Map
  - Change Inventory
  - Error Handling And Edge Cases

## Future-State Modeling Rule

These are target (`to-be`) execution/validation models derived from the approved design basis. They are not current implementation traces. Package metadata files are represented as ownership frames because the primary changes are dependency metadata and deterministic package-manager resolution.

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001` | `Primary End-to-End` | Desktop dependency metadata owner | `Requirement` | `REQ-001` | N/A | Verify latest stable Electron target | Primary/Fallback/Error |
| `UC-002` | `DS-001` | `Primary End-to-End` | Desktop dependency + pnpm lock owners | `Requirement` | `REQ-002`, `REQ-004` | N/A | Update package metadata and lockfiles | Primary/Fallback/Error |
| `UC-003` | `DS-002`, `DS-004` | `Primary End-to-End`, `Bounded Local` | Native server bundle preparation owner | `Requirement` | `REQ-003`, `REQ-006` | N/A | Rebuild native modules for Electron 42 ABI | Primary/Fallback/Error |
| `UC-004` | `DS-002` | `Primary End-to-End` | Packaging/signing validation owner | `Requirement` | `REQ-005`, `REQ-006` | N/A | Preserve signing implementation while packaging | Primary/N/A/Error |
| `UC-005` | `DS-003`, `DS-005` | `Primary End-to-End`, `Return-Event` | Workflow validation owner | `Requirement` | `REQ-006` | N/A | Run focused Electron tests and package smoke | Primary/Fallback/Error |
| `UC-006` | `DS-003` | `Primary End-to-End` | Docs sync owner | `Requirement` | `REQ-007` | N/A | Synchronize durable docs or no-impact rationale | Primary/N/A/Error |
| `UC-007` | `DS-001`, `DS-002` | `Primary End-to-End` | Electron binary/package resolution owner | `Design-Risk` | `REQ-006` | Electron 42 no longer downloads binary during npm postinstall; first CLI/package run must still obtain and use the binary. | Validate Electron 42 on-demand binary resolution | Primary/Fallback/Error |

## Transition Notes

- No temporary compatibility runtime behavior is designed.
- Electron 38 baseline and deprecated direct `electron-rebuild` dependency are replaced cleanly in package metadata and lockfiles.
- If validation reveals package-local `autobyteus-web/pnpm-lock.yaml` cannot be updated without policy churn, remove it as stale local metadata and keep the root lock canonical.

## Use Case: UC-001 Verify Latest Stable Electron Target

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: Desktop dependency metadata owner (`autobyteus-web/package.json`)
- Why This Use Case Matters: Prevents using only the minimum ShipIt-fixed version and ensures latest stable target is deliberate.

### Goal

Resolve the authoritative latest stable Electron version and make that target the dependency baseline.

### Preconditions

- Latest stable source is checked during Stage 1/2.
- `requirements.md` records `42.4.1` unless authoritative source changes.

### Expected Outcome

The target Electron dependency is `42.4.1` and validation confirms the installed CLI/runtime reports `v42.4.1`.

### Primary Runtime Call Stack

```text
[ENTRY] external/electron-releases.org:readLatestStable()
├── external/npm-registry:readDistTag("electron", "latest") [IO]
├── tickets/in-progress/upgrade-electron-latest-stable/requirements.md:setTargetVersion("42.4.1") [STATE]
├── autobyteus-web/package.json:devDependencies.electron("42.4.1") [IO]
├── pnpm-lock.yaml:importers.autobyteus-web.devDependencies.electron(version="42.4.1") [IO]
└── node_modules/electron/cli.js:printVersion() [IO]
    └── stdout:"v42.4.1"
```

### Branching / Fallback Paths

```text
[FALLBACK] authoritative latest stable changes before Stage 6
external/electron-releases.org:readLatestStable()
├── tickets/in-progress/upgrade-electron-latest-stable/requirements.md:refineTargetVersion(newVersion) [STATE]
├── tickets/in-progress/upgrade-electron-latest-stable/proposed-design.md:bumpDesignVersion() [STATE]
└── tickets/in-progress/upgrade-electron-latest-stable/future-state-runtime-call-stack.md:regenerateForTarget(newVersion) [STATE]
```

```text
[ERROR] npm latest and Electron release page disagree
external/npm-registry:readDistTag("electron", "latest") [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md:blockStage("1 or 2", reason="authoritative target mismatch") [STATE]
```

### State And Data Transformations

- Electron release page/latest dist-tag -> exact semver target.
- Exact semver target -> package metadata specifier and lock resolution.

### Observability And Debug Points

- Investigation notes record URL and command evidence.
- Stage 7 records `pnpm -C autobyteus-web exec electron --version`.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`.
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`.
- Any naming-to-responsibility drift detected? `No`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 Update Package Metadata And Lockfiles

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: Desktop dependency metadata and pnpm lock owners.
- Why This Use Case Matters: Package metadata and lockfiles determine the actual Electron runtime used in desktop package builds.

### Goal

Change package dependency metadata and deterministic lock outputs to resolve Electron 42 and current rebuild tooling.

### Preconditions

- Requirements are design-ready.
- Stage 5 review has reached `Go Confirmed` before source/package edits.

### Expected Outcome

`autobyteus-web/package.json` and the canonical root lock agree on Electron `42.4.1` and `@electron/rebuild@4.0.4`; stale package-local lock metadata is absent.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/package.json:editDevDependencies()
├── autobyteus-web/package.json:set("electron", "42.4.1") [IO]
├── autobyteus-web/package.json:remove("electron-rebuild") [IO]
├── autobyteus-web/package.json:set("@electron/rebuild", "4.0.4") [IO]
├── pnpm-workspace.yaml:selectImporter("autobyteus-web")
├── pnpm:installLockfileOnly(workspaceRoot=".") [IO]
│   ├── pnpm-lock.yaml:updateImporter("autobyteus-web") [IO]
│   ├── pnpm-lock.yaml:resolvePackage("electron@42.4.1") [IO]
│   └── pnpm-lock.yaml:resolvePackage("@electron/rebuild@4.0.4") [IO]
└── autobyteus-web/pnpm-lock.yaml:removeStalePackageLocalLock() [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] package-local lockfile cannot be regenerated cleanly
pnpm:installLockfileOnly(workdir="autobyteus-web") [IO]
└── autobyteus-web/pnpm-lock.yaml:removeStalePackageLocalLock() [IO]
    └── tickets/in-progress/upgrade-electron-latest-stable/implementation.md:recordLockfileRemovalRationale(path="autobyteus-web/pnpm-lock.yaml") [STATE]
```

```text
[ERROR] lockfile still resolves Electron 38 after update
pnpm-lock.yaml:inspectPackage("electron") [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md:stayInStage6(reason="lock mismatch") [STATE]
```

### State And Data Transformations

- Manifest dependency specs -> pnpm lock importer entries.
- npm registry package metadata -> exact lock packages and integrity entries.

### Observability And Debug Points

- `git diff -- autobyteus-web/package.json pnpm-lock.yaml autobyteus-web/pnpm-lock.yaml` and package-local lock absence.
- `rg "electron@38|version: 38\."` scoped to lockfiles after update.

### Design Smells / Gaps

- Legacy fallback branch present? `No`.
- Coupling introduced? `No`.
- Naming drift? `No`; deprecated package name removed.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-003 Rebuild Native Modules For Electron 42 ABI

### Spine Context

- Spine ID(s): `DS-002`, `DS-004`
- Spine Scope: `Primary End-to-End`, `Bounded Local`
- Governing Owner: `autobyteus-web/scripts/prepare-server.mjs`
- Why This Use Case Matters: The app bundles a Node server with native `node-pty`; Electron 42 uses a newer ABI that old rebuild metadata cannot detect.

### Goal

Ensure the native rebuild path uses an Electron 42-aware rebuild CLI from the direct project dependency without package-manager fallback code.

### Preconditions

- Package metadata directly depends on `@electron/rebuild@4.0.4`.
- Node runtime is `>=22.12.0`.
- Server resources can be staged by `prepare-server`.

### Expected Outcome

`prepare-server` invokes `pnpm exec electron-rebuild -v 42.4.1 -m <resources/server> -w node-pty`, the CLI resolves via `@electron/rebuild`, and `node-pty` rebuild succeeds for Electron ABI `146`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/package.json:scripts.prepare-server()
├── autobyteus-web/scripts/prepare-server-dispatch.mjs:dispatchPrepareServer() [ASYNC]
├── autobyteus-web/scripts/prepare-server.mjs:stageRuntimeBundle() [ASYNC]
│   ├── autobyteus-web/scripts/prepare-server.mjs:deployServerPackageToStage() [IO]
│   ├── autobyteus-web/scripts/prepare-server.mjs:installPortableRuntimeDependencies() [IO]
│   └── autobyteus-web/scripts/prepare-server.mjs:validateCriticalImports() [IO]
├── autobyteus-web/scripts/prepare-server.mjs:rebuildNativeModulesForElectron() [ASYNC]
│   ├── autobyteus-web/scripts/prepare-server.mjs:readJson("autobyteus-web/package.json") [IO]
│   ├── autobyteus-web/scripts/prepare-server.mjs:getElectronVersionSpecifier(webManifest) [STATE]
│   ├── autobyteus-web/scripts/prepare-server.mjs:runCommand("pnpm", ["-C", webRoot, "exec", "electron-rebuild", "-v", "42.4.1", "-m", targetDir, "-w", "node-pty"]) [IO]
│   │   └── node_modules/@electron/rebuild/lib/cli.js:runRebuildForElectron(version="42.4.1", module="node-pty") [IO]
│   └── autobyteus-web/scripts/prepare-server.mjs:normalizeNodePtySpawnHelpers(targetDir) [IO]
└── autobyteus-web/scripts/prepare-server.mjs:publishStageToTarget() [IO]
```

### Branching / Fallback Paths

```text
[FALLBACK] CLI binary not found after package metadata update
autobyteus-web/scripts/prepare-server.mjs:runCommand("pnpm", ["exec", "electron-rebuild", ...]) [IO]
└── # No package-manager fallback; missing direct CLI is a build failure that should be fixed in package metadata.
```

```text
[ERROR] rebuild CLI cannot detect Electron 42 ABI
node_modules/@electron/rebuild/lib/cli.js:runRebuildForElectron(version="42.4.1") [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md:declareReEntry(triggerStage=6, classification="Local Fix", returnPath="6") [STATE]
```

### State And Data Transformations

- Package specifier `42.4.1` -> normalized rebuild version `42.4.1`.
- Electron version -> ABI mapping (`146`) -> rebuilt `node-pty` native module.

### Observability And Debug Points

- `pnpm -C autobyteus-web exec electron-rebuild --help` plus package metadata inspection.
- Full package build logs around “Rebuilding native modules for Electron”.
- Packaged server resource checks under `electron-dist/*/Resources/server`.

### Design Smells / Gaps

- Legacy branch present? `No`; missing-CLI package-manager fallback is removed so the build cannot silently use a different rebuild package.
- Tight coupling introduced? `No`.
- Naming drift? `No`; package replacement is explicit.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-004 Preserve Signing Implementation While Packaging

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: Packaging/signing validation owner (`build.ts` + existing signing adapter)
- Why This Use Case Matters: User clarified signing issues are already fixed and must not be mixed into this Electron upgrade.

### Goal

Validate the package output without modifying signing-policy source.

### Preconditions

- Electron package metadata updated.
- Existing build script and signing adapter remain unchanged unless validation proves incompatibility.

### Expected Outcome

Package build uses existing mac signing config; local environment either skips signing/notarization because credentials are absent or signs as configured. No signing source/config changes are introduced by default.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/package.json:scripts.build:electron:mac(args=["--arm64"])
├── autobyteus-web/scripts/prepare-server.mjs:stageRuntimeBundle() [ASYNC]
├── autobyteus-web/build/scripts/build.ts:main() [ASYNC]
│   ├── autobyteus-web/build/scripts/build.ts:resolvePlatformTargets("MAC", "ARM64") [STATE]
│   ├── autobyteus-web/build/scripts/build.ts:sanitizeConfig(options) [STATE]
│   └── node_modules/electron-builder/out/builder.js:build(config.mac.sign="./build/dist/macSign.js") [IO]
│       └── autobyteus-web/build/dist/macSign.js:signIfConfigured(file, options) [IO]
└── autobyteus-web/electron-dist:emitMacArtifacts() [IO]
```

### Branching / Fallback Paths

```text
[ERROR] Electron 42 package build requires signing-source change
node_modules/electron-builder/out/builder.js:build(...) [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md:declareReEntry(triggerStage=6, classification="Design Impact", returnPath="1 -> 3 -> 4 -> 5 -> 6") [STATE]
```

### State And Data Transformations

- Signing env -> electron-builder signing decisions.
- Build config -> app/DMG/ZIP/update metadata artifacts.

### Observability And Debug Points

- `git diff -- autobyteus-web/build autobyteus-web/electron` to confirm signing sources unchanged unless justified.
- Build logs: signing skipped or signing identity used.
- Existing mac signing-policy verifier if app bundle exists.

### Design Smells / Gaps

- Legacy branch present? `No`.
- Tight coupling introduced? `No`.
- Naming drift? `No`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 Run Focused Electron Tests And Package Smoke

### Spine Context

- Spine ID(s): `DS-003`, `DS-005`
- Spine Scope: `Primary End-to-End`, `Return-Event`
- Governing Owner: Workflow validation owner.
- Why This Use Case Matters: Electron major upgrade risk must be validated through executable checks, not only lockfile diff.

### Goal

Close all executable acceptance criteria through deterministic commands and recorded evidence.

### Preconditions

- Stage 6 package metadata and lock changes are complete.
- Dependencies are installed or lockfile-only update is sufficient for the selected command.

### Expected Outcome

Electron version, rebuild CLI, test suite, and mac ARM64 package smoke pass, or any failure is classified and re-entered.

### Primary Runtime Call Stack

```text
[ENTRY] tickets/in-progress/upgrade-electron-latest-stable/api-e2e-testing.md:initializeScenarioMatrix()
├── shell:run("pnpm install --frozen-lockfile") [IO]
├── shell:run("pnpm -C autobyteus-web exec electron --version") [IO]
├── shell:run("pnpm -C autobyteus-web exec electron-rebuild --help") [IO]
├── shell:run("pnpm -C autobyteus-web test:electron") [IO]
├── shell:run("CI=true AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm -C autobyteus-web build:electron:mac -- --arm64") [IO]
├── shell:run("find autobyteus-web/electron-dist -maxdepth ...") [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/api-e2e-testing.md:recordScenarioResults() [STATE]
```

### Branching / Fallback Paths

```text
[FALLBACK] package build is environment-blocked but install/tests pass
shell:run("pnpm -C autobyteus-web build:electron:mac -- --arm64") [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/api-e2e-testing.md:recordBlockedScenario(reason, compensatingEvidence, residualRisk) [STATE]
```

```text
[ERROR] test or build fails with local implementation issue
shell:run(validationCommand) [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md:declareReEntry(triggerStage=7, classification="Local Fix", returnPath="6 -> 7") [STATE]
```

```text
[ERROR] test or build reveals missing requirement/design behavior
shell:run(validationCommand) [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md:declareReEntry(triggerStage=7, classification="Requirement Gap or Design Impact", returnPath="2/1 -> 3 -> 4 -> 5 -> 6 -> 7") [STATE]
```

### State And Data Transformations

- Scenario matrix -> command execution -> pass/fail/blocker evidence.
- Build output paths -> artifact existence records.

### Observability And Debug Points

- Command stdout/stderr summarized in Stage 7 artifact.
- `electron-dist` artifact list.
- Diff review for signing source preservation.

### Design Smells / Gaps

- Legacy branch present? `No`.
- Tight coupling introduced? `No`.
- Naming drift? `No`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-006 Synchronize Durable Docs Or No-Impact Rationale

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: Docs sync owner.
- Why This Use Case Matters: The Electron baseline and native rebuild expectation are durable operational knowledge, not only ticket-local information.

### Goal

Update long-lived docs if the implemented dependency/runtime baseline changes documented packaging expectations.

### Preconditions

- Stage 7 validation passes.
- Stage 8 code review passes.

### Expected Outcome

`docs-sync.md` records updated docs or explicit no-impact rationale; likely durable doc owner is `autobyteus-web/docs/electron_packaging.md`.

### Primary Runtime Call Stack

```text
[ENTRY] tickets/in-progress/upgrade-electron-latest-stable/docs-sync.md:planDocsSync()
├── autobyteus-web/docs/electron_packaging.md:readCurrentPackagingDocs() [IO]
├── autobyteus-web/README.md:readCurrentBuildCommandDocs() [IO]
├── tickets/in-progress/upgrade-electron-latest-stable/api-e2e-testing.md:readValidationSummary() [IO]
├── autobyteus-web/docs/electron_packaging.md:updateElectronBaselineIfImpacted() [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/docs-sync.md:recordResult("Updated" or "No impact") [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] docs reveal implementation ambiguity
tickets/in-progress/upgrade-electron-latest-stable/docs-sync.md:recordBlockedFinding() [STATE]
└── tickets/in-progress/upgrade-electron-latest-stable/workflow-state.md:declareReEntry(triggerStage=9, classification="Requirement Gap or Unclear") [STATE]
```

### State And Data Transformations

- Validation evidence -> durable docs summary.
- Docs inspection -> docs-sync result.

### Observability And Debug Points

- Stage 9 `docs-sync.md` lists files changed or no-impact rationale.
- Git diff for docs.

### Design Smells / Gaps

- Legacy branch present? `No`.
- Tight coupling introduced? `No`.
- Naming drift? `No`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 Validate Electron 42 On-Demand Binary Resolution

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: Electron binary/package resolution owner.
- Why This Use Case Matters: Electron 42 no longer downloads the Electron binary in npm postinstall; first CLI/package use must still download/resolve it.

### Goal

Make on-demand Electron binary behavior explicit in validation so package builds do not fail unexpectedly.

### Preconditions

- Dependencies installed after Electron 42 metadata update.
- Network access available for first Electron binary resolution if cache is cold.

### Expected Outcome

`pnpm -C autobyteus-web exec electron --version` resolves/downloads the binary and prints `v42.4.1`; subsequent package build uses the resolved runtime.

### Primary Runtime Call Stack

```text
[ENTRY] shell:run("pnpm -C autobyteus-web exec electron --version") [IO]
├── node_modules/electron/cli.js:ensureElectronBinary() [IO]
│   ├── node_modules/electron/install.js:downloadIfMissing(version="42.4.1", platform=hostPlatform, arch=hostArch) [IO]
│   └── node_modules/electron/dist/Electron.app:cacheBinary(version="42.4.1") [IO]
└── node_modules/electron/cli.js:printVersion() [IO]
    └── stdout:"v42.4.1"
```

### Branching / Fallback Paths

```text
[FALLBACK] binary is missing before package build
shell:run("pnpm -C autobyteus-web exec install-electron --no") [IO]
└── shell:run("pnpm -C autobyteus-web exec electron --version") [IO]
```

```text
[ERROR] binary download blocked by network/cache environment
node_modules/electron/install.js:downloadIfMissing(...) [IO]
└── tickets/in-progress/upgrade-electron-latest-stable/api-e2e-testing.md:recordBlockedScenario("Electron binary download blocked", compensatingEvidence, residualRisk) [STATE]
```

### State And Data Transformations

- Installed npm package metadata -> on-demand platform binary cache.
- Cached binary -> package build runtime.

### Observability And Debug Points

- `electron --version` stdout.
- Stage 7 notes if `install-electron` fallback is required.
- Build logs if electron-builder triggers binary resolution itself.

### Design Smells / Gaps

- Legacy branch present? `No`; `install-electron` fallback is Electron 42’s documented on-demand path, not an old-runtime compatibility branch.
- Tight coupling introduced? `No`.
- Naming drift? `No`.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
