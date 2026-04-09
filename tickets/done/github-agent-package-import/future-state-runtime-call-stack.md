# Future-State Runtime Call Stacks (Debug-Trace Style)

Use this document as a future-state (`to-be`) execution model derived from the design basis.
Prefer exact `file:function` frames, explicit branching, and clear state/persistence boundaries.
Do not treat this document as an as-is trace of current code behavior.

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint
  - `[ASYNC]` async boundary
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v2`
- Requirements: `tickets/done/github-agent-package-import/requirements.md` (status `Refined`)
- Source Artifact:
  - `tickets/done/github-agent-package-import/proposed-design.md`
- Source Design Version: `v2`
- Shared Design Principles:
  - `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`
- Common Design Practices:
  - `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md`
- Referenced Sections:
  - Spine inventory sections: `DS-001`, `DS-002`, `DS-003`, `DS-004`
  - Ownership sections:
    - `Ownership Boundaries`
    - `Boundary Encapsulation Map`
    - `Dependency Rules`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- Current path-only mutations, root-centric naming, and blanket URL rejection are intentionally excluded from these to-be call stacks.
- The primary spines below are stretched to show:
  - the UI or API entry,
  - the authoritative package-management owner,
  - the internal persistence or installer boundary,
  - the downstream runtime consequence.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-001`, `DS-004` | `Primary End-to-End` | `AgentPackageService` | `Requirement` | `REQ-003`, `REQ-004`, `REQ-005` | `N/A` | Open the `Agent Packages` settings surface | `Yes/Yes/Yes` |
| `UC-002` | `DS-001` | `Primary End-to-End` | `AgentPackageService` | `Requirement` | `REQ-001`, `REQ-009`, `REQ-013` | `N/A` | Link a local package path | `Yes/N/A/Yes` |
| `UC-003` | `DS-002` | `Primary End-to-End` | `AgentPackageService` | `Requirement` | `REQ-002`, `REQ-014`, `REQ-015`, `REQ-017`, `REQ-018`, `REQ-020`, `REQ-025` | `N/A` | Import a public GitHub repository URL | `Yes/N/A/Yes` |
| `UC-004` | `DS-002` | `Bounded Local` | `GitHubAgentPackageInstaller` | `Requirement` | `REQ-007`, `REQ-008`, `REQ-017`, `REQ-018`, `REQ-019`, `REQ-025` | `N/A` | Install the GitHub package into app-managed storage | `Yes/Yes/Yes` |
| `UC-005` | `DS-003` | `Primary End-to-End` | existing discovery providers/services | `Requirement` | `REQ-008`, `REQ-020`, `REQ-024` | `N/A` | Discover a newly registered package through existing providers | `Yes/N/A/Yes` |
| `UC-006` | `DS-004` | `Bounded Local` | `AgentPackageService` | `Design-Risk` | `REQ-011`, `REQ-012`, `REQ-021`, `REQ-022`, `REQ-023`, `REQ-024` | `Keep built-in, linked-local, and managed-GitHub entries deterministic so package identity, removal mode, and list presentation cannot drift across callers.` | Merge the package catalog view | `Yes/N/A/Yes` |
| `UC-007` | `DS-001` | `Primary End-to-End` | `AgentPackageService` | `Requirement` | `REQ-006`, `REQ-009`, `REQ-020` | `N/A` | Remove a linked local package | `Yes/N/A/Yes` |
| `UC-008` | `DS-001` | `Primary End-to-End` | `AgentPackageService` | `Requirement` | `REQ-006`, `REQ-010`, `REQ-020`, `REQ-025` | `N/A` | Remove a managed GitHub package | `Yes/N/A/Yes` |
| `UC-009` | `DS-002` | `Primary End-to-End` | `AgentPackageService` | `Requirement` | `REQ-012`, `REQ-015`, `REQ-016`, `REQ-025` | `N/A` | Reject a duplicate GitHub import | `Yes/N/A/Yes` |
| `UC-010` | `DS-001`, `DS-002` | `Primary End-to-End` | `AgentPackageService` | `Requirement` | `REQ-013`, `REQ-014`, `REQ-018`, `REQ-019` | `N/A` | Reject malformed or unsupported import input | `Yes/Yes/Yes` |

## Transition Notes

- No temporary migration branch is modeled in the future-state call stacks.
- `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` remains the steady-state low-level discovery input, but it is no longer treated as the product-facing package-management API.

## Use Case: UC-001 [Open the `Agent Packages` settings surface]

### Spine Context

- Spine ID(s): `DS-001`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It proves the clean rename from roots to packages is reflected in the route, page, GraphQL contract, and rendered list.
- Why This Spine Span Is Long Enough:
  - It covers route selection, UI mount, client store, GraphQL query, authoritative service, package merge, and list rendering.

### Goal

- Show an `Agent Packages` surface that renders package-oriented entries instead of raw roots.

### Preconditions

- Settings page is available.
- Built-in app-data storage is available.

### Expected Outcome

- The route/query id is `agent-packages`.
- The page heading and actions use `Agent Packages` terminology.
- The UI renders package rows with stable package identity.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/pages/settings.vue:resolveActiveSection("agent-packages")
├── autobyteus-web/components/settings/AgentPackagesManager.vue:onMounted() [ENTRY]
├── autobyteus-web/stores/agentPackagesStore.ts:fetchAgentPackages() [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:agentPackages() [ENTRY]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:listAgentPackages() [ASYNC]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts:listAdditionalRootPaths() [IO]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:listPackageRecords() [IO]
│   ├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:mergePackageCatalogEntries(...) [STATE]
│   └── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:sortPackageEntries(...) [STATE]
└── autobyteus-web/components/settings/AgentPackagesManager.vue:renderPackageRows(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] root is configured in settings but has no registry metadata
autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:mergePackageCatalogEntries(...)
└── synthesize LOCAL_PATH package entry from normalized root path [STATE]
```

```text
[ERROR] route points at a removed legacy section id
autobyteus-web/pages/settings.vue:resolveActiveSection("agent-package-roots")
└── autobyteus-web/pages/settings.vue:resolveActiveSection("agent-packages") # future-state target does not preserve a legacy alias
```

### State And Data Transformations

- route id -> active settings section
- roots + registry records -> merged package entries
- package entries -> rendered package rows

### Observability And Debug Points

- Logs emitted at:
  - invalid section id handling,
  - registry load failure,
  - package catalog merge failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether the raw root path is visible in the default row layout remains a presentation decision only.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Link a local package path]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It preserves existing local linking while moving the API surface from raw roots to explicit package import intent.
- Why This Spine Span Is Long Enough:
  - It covers UI submit, explicit source-kind API input, root validation, root registration, registry persistence, cache refresh, and list refresh.

### Goal

- Register one valid absolute local package directory as a linked package without copying files.

### Preconditions

- Submitted path is an absolute readable directory.
- The directory contains `agents/` and/or `agent-teams/`.

### Expected Outcome

- The path is added to the additional root list.
- A linked-local package record is persisted.
- The package becomes visible in the package list.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/AgentPackagesManager.vue:handleImportSubmit(...)
├── autobyteus-web/stores/agentPackagesStore.ts:importAgentPackage({ sourceKind: "LOCAL_PATH", source }) [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input) [ENTRY]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:importAgentPackage(input) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts:validatePackageRoot(source) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts:addAdditionalRootPath(source) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:upsertLinkedLocalPackageRecord(source) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:refreshDefinitionCaches() [ASYNC]
│   └── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:listAgentPackages() [ASYNC]
└── autobyteus-web/components/settings/AgentPackagesManager.vue:showImportSuccess(...)
```

### Branching / Fallback Paths

```text
[ERROR] submitted local path is unreadable or not a valid package root
autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts:validatePackageRoot(source)
└── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input)
```

### State And Data Transformations

- absolute path string -> normalized root path
- normalized root path -> linked-local registry record
- updated roots + registry -> refreshed `AgentPackage[]`

### Observability And Debug Points

- Logs emitted at:
  - package-root validation failure,
  - root settings write failure,
  - cache refresh failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Import a public GitHub repository URL]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It is the primary new business capability requested by the user.
- Why This Spine Span Is Long Enough:
  - It covers UI input, explicit GitHub source-kind API input, authoritative orchestration, managed install, registration, cache refresh, and refreshed list output.

### Goal

- Import a supported public GitHub repository URL as one managed package.

### Preconditions

- Submitted source is a supported `github.com` repository-identifying URL.
- Network access to GitHub is available.

### Expected Outcome

- The repository source is normalized.
- The package is installed under `<appDataDir>/agent-packages/github/<owner>__<repo>/`.
- The installed root is registered and listed as a managed GitHub package.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/AgentPackagesManager.vue:handleImportSubmit(...)
├── autobyteus-web/stores/agentPackagesStore.ts:importAgentPackage({ sourceKind: "GITHUB_REPOSITORY", source }) [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input) [ENTRY]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:importAgentPackage(input) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts:normalizeGitHubRepositorySource(source) [STATE]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:findGitHubPackageBySource(...) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:installFromRepositorySource(...) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts:addAdditionalRootPath(managedInstallPath) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:upsertManagedGitHubPackageRecord(...) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:refreshDefinitionCaches() [ASYNC]
│   └── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:listAgentPackages() [ASYNC]
└── autobyteus-web/components/settings/AgentPackagesManager.vue:showImportSuccess(...)
```

### Branching / Fallback Paths

```text
[ERROR] GitHub metadata lookup or archive retrieval fails
autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:installFromRepositorySource(...)
└── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input)
```

### State And Data Transformations

- GitHub URL -> normalized repository source descriptor
- repository source descriptor -> managed install path `<appDataDir>/agent-packages/github/<owner>__<repo>/`
- managed install path + source metadata -> managed package record

### Observability And Debug Points

- Logs emitted at:
  - source normalization failure,
  - duplicate detection lookup failure,
  - network or install failure,
  - root settings or registry write failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Supported GitHub URL variants remain an input-normalization policy detail, not a boundary gap.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Install the GitHub package into app-managed storage]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Bounded Local`
- Governing Owner: `GitHubAgentPackageInstaller`
- Why This Use Case Matters To This Spine:
  - It captures the internal managed-install lifecycle that must remain encapsulated behind the package service.
- Why This Spine Span Is Long Enough:
  - This bounded local spine covers the full installer lifecycle from GitHub resolution through staging, validation, and final managed placement.
- If `Spine Scope = Bounded Local`, Parent Owner:
  - `AgentPackageService`

### Goal

- Materialize a public GitHub repository as a validated local package root under app-managed storage.

### Preconditions

- The caller already normalized and accepted the GitHub source.
- No duplicate package exists for the normalized source.

### Expected Outcome

- A staged archive is downloaded and extracted.
- The extracted repository root is validated as a package.
- The validated package is moved into `<appDataDir>/agent-packages/github/<owner>__<repo>/`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:installFromRepositorySource(repositorySource)
├── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:resolveRepositorySource(repositorySource) [IO]
├── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:deriveManagedInstallKey(repositorySource) [STATE]
├── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:downloadRepositoryArchive(...) [IO]
├── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:extractArchiveToStaging(...) [IO]
├── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:normalizeExtractedRepositoryRoot(...) [STATE]
├── autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts:validatePackageRoot(...) [IO]
└── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:finalizeManagedInstall(...) [IO] # moves to <appDataDir>/agent-packages/github/<owner>__<repo>/
```

### Branching / Fallback Paths

```text
[FALLBACK] metadata response does not expose a directly usable archive URL
autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:resolveRepositorySource(repositorySource) [IO]
└── build canonical public source-archive URL from normalized owner or repository or ref [STATE]
```

```text
[ERROR] extracted repository root fails package-shape validation
autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts:validatePackageRoot(...)
└── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:cleanupFailedInstall(...) [IO]
```

### State And Data Transformations

- normalized source -> `<owner>__<repo>` install key + resolved archive descriptor
- archive bytes -> extracted staging directory
- staging directory -> validated managed install path `<appDataDir>/agent-packages/github/<owner>__<repo>/`

### Observability And Debug Points

- Logs emitted at:
  - metadata resolution failure,
  - archive download failure,
  - extraction failure,
  - package-shape validation failure,
  - staging cleanup failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-005 [Discover a newly registered package through existing providers]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: existing discovery providers/services
- Why This Use Case Matters To This Spine:
  - It validates the core architectural simplification: package import ends as normal local-root registration, so discovery does not fork.
- Why This Spine Span Is Long Enough:
  - It covers cache refresh, provider reads, and visible agent or team or skill effects.

### Goal

- Make a newly linked or imported package visible through the same discovery flows already used today.

### Preconditions

- A package root was successfully added to the additional root list.
- Cache refresh was triggered.

### Expected Outcome

- Agents, teams, and bundled skills from the new root become discoverable through existing services.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:refreshDefinitionCaches() [ASYNC]
├── autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts:refreshCache() [ASYNC]
│   └── autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts:getAllVisible() [IO]
├── autobyteus-server-ts/src/agent-team-definition/services/agent-team-definition-service.ts:refreshCache() [ASYNC]
│   └── autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts:getAll() [IO]
└── autobyteus-server-ts/src/skills/services/skill-service.ts:listSkills(...) [ASYNC]
    └── autobyteus-server-ts/src/skills/services/skill-discovery.ts:scanBundledSkillsFromDefinitionRoot(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] newly registered root becomes unreadable before cache refresh completes
autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts:getAllVisible() [IO]
└── warning or error is surfaced back to the package-service refresh caller
```

### State And Data Transformations

- updated root list -> provider scan targets
- provider scan results -> refreshed cached definitions

### Observability And Debug Points

- Logs emitted at:
  - cache refresh failure,
  - unreadable root warning from downstream providers.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-006 [Merge the package catalog view]

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Bounded Local`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It is the local design-risk spine that keeps identity, source-kind, and removal policy deterministic across list, import, and remove flows.
- Why This Spine Span Is Long Enough:
  - This bounded local spine covers the full internal merge lifecycle that shapes the user-facing package catalog.
- If `Spine Scope = Bounded Local`, Parent Owner:
  - `AgentPackageService`

### Goal

- Build one deterministic in-memory `AgentPackage[]` view from built-in storage, additional roots, and persisted metadata.

### Preconditions

- Built-in package root is known from app config.
- Additional roots and registry records can be loaded.

### Expected Outcome

- Each root path resolves to exactly one package entry.
- Source-kind, counts, and removal mode are stable.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:mergePackageCatalogEntries(...)
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:createBuiltInPackageEntry(...) [STATE]
├── autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts:listAdditionalRootPaths() [IO]
├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:listPackageRecords() [IO]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:indexRegistryByRootPath(...) [STATE]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:materializeConfiguredPackageEntries(...) [STATE]
├── autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts:buildPackageSummary(...) [IO]
└── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:sortPackageEntries(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] two registry records claim the same normalized source or root path
autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:indexRegistryByRootPath(...)
└── throw metadata consistency error before list or remove proceeds
```

### State And Data Transformations

- built-in root -> synthesized built-in package entry
- root list + registry records -> configured package entries
- configured package entries + summary counts -> stable `AgentPackage[]`

### Observability And Debug Points

- Logs emitted at:
  - duplicate registry identity detection,
  - stale registry reconciliation,
  - summary-build failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- Whether stale registry records are auto-pruned or surfaced diagnostically remains an implementation policy detail only.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-007 [Remove a linked local package]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It proves package-id-based removal can preserve unregister-only behavior for linked local packages.
- Why This Spine Span Is Long Enough:
  - It covers UI action, package-id resolution, root unregister, metadata cleanup, and cache refresh.

### Goal

- Remove a linked local package without touching the external source directory.

### Preconditions

- The selected package id resolves to a removable `LOCAL_PATH` package entry.

### Expected Outcome

- The root is removed from additional roots.
- Registry metadata is removed or no longer surfaced.
- External files remain in place.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/AgentPackagesManager.vue:handleRemove(packageId)
├── autobyteus-web/stores/agentPackagesStore.ts:removeAgentPackage(packageId) [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:removeAgentPackage(packageId) [ENTRY]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:removeAgentPackage(packageId) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:resolvePackageById(packageId) [STATE]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts:removeAdditionalRootPath(rootPath) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:removePackageRecord(packageId) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:refreshDefinitionCaches() [ASYNC]
│   └── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:listAgentPackages() [ASYNC]
└── autobyteus-web/components/settings/AgentPackagesManager.vue:showRemoveSuccess(...)
```

### Branching / Fallback Paths

```text
[ERROR] package id does not resolve or resolves to a non-removable built-in entry
autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:resolvePackageById(packageId)
└── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:removeAgentPackage(packageId)
```

### State And Data Transformations

- package id -> resolved local package entry
- resolved package entry -> root unregister + registry cleanup

### Observability And Debug Points

- Logs emitted at:
  - package-id resolution failure,
  - root settings removal failure,
  - cache refresh failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-008 [Remove a managed GitHub package]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It proves package metadata drives differentiated managed-delete behavior.
- Why This Spine Span Is Long Enough:
  - It covers UI action, package-id resolution, root unregister, managed install deletion, registry cleanup, and cache refresh.

### Goal

- Remove one managed GitHub package and delete its app-managed install directory.

### Preconditions

- The selected package id resolves to a removable managed GitHub package entry.

### Expected Outcome

- The managed root is unregistered.
- The managed install directory under `<appDataDir>/agent-packages/github/<owner>__<repo>/` is deleted.
- Registry metadata is removed.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/AgentPackagesManager.vue:handleRemove(packageId)
├── autobyteus-web/stores/agentPackagesStore.ts:removeAgentPackage(packageId) [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:removeAgentPackage(packageId) [ENTRY]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:removeAgentPackage(packageId) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:resolvePackageById(packageId) [STATE]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts:removeAdditionalRootPath(rootPath) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:removeManagedInstall(managedInstallPath) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:removePackageRecord(packageId) [IO]
│   ├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:refreshDefinitionCaches() [ASYNC]
│   └── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:listAgentPackages() [ASYNC]
└── autobyteus-web/components/settings/AgentPackagesManager.vue:showRemoveSuccess(...)
```

### Branching / Fallback Paths

```text
[ERROR] managed install directory deletion fails
autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:removeManagedInstall(...)
└── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:removeAgentPackage(packageId)
```

### State And Data Transformations

- package id -> resolved managed package entry
- managed package entry -> root unregister + managed delete from `<appDataDir>/agent-packages/github/<owner>__<repo>/` + registry cleanup

### Observability And Debug Points

- Logs emitted at:
  - package-id resolution failure,
  - managed delete failure,
  - cache refresh failure.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-009 [Reject a duplicate GitHub import]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It proves duplicate rejection is owned centrally by normalized GitHub source identity rather than by raw path or installer side effects.
- Why This Spine Span Is Long Enough:
  - It covers user submit, source normalization, duplicate lookup, authoritative rejection, and UI error presentation.

### Goal

- Reject a second import of the same normalized GitHub repository without touching install state.

### Preconditions

- A managed GitHub package already exists for the normalized repository source.

### Expected Outcome

- The second import returns a clear duplicate error.
- No new install directory is created.
- No existing managed package under `<appDataDir>/agent-packages/github/<owner>__<repo>/` is modified.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/AgentPackagesManager.vue:handleImportSubmit(...)
├── autobyteus-web/stores/agentPackagesStore.ts:importAgentPackage({ sourceKind: "GITHUB_REPOSITORY", source }) [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input) [ENTRY]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:importAgentPackage(input) [ASYNC]
│   ├── autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts:normalizeGitHubRepositorySource(source) [STATE]
│   ├── autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:findGitHubPackageBySource(...) [IO]
│   └── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input) # duplicate error response
└── autobyteus-web/components/settings/AgentPackagesManager.vue:showImportError(...)
```

### Branching / Fallback Paths

```text
[ERROR] registry lookup fails before duplicate decision can be made
autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts:findGitHubPackageBySource(...) [IO]
└── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input)
```

### State And Data Transformations

- raw GitHub URL -> normalized repository source
- normalized repository source -> duplicate decision

### Observability And Debug Points

- Logs emitted at:
  - normalization failure,
  - registry lookup failure,
  - duplicate rejection.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-010 [Reject malformed or unsupported import input]

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `AgentPackageService`
- Why This Use Case Matters To This Spine:
  - It proves the future-state surface differentiates local and GitHub input explicitly and rejects unsupported or invalid values before persistence.
- Why This Spine Span Is Long Enough:
  - It covers UI capture, explicit source-kind submission, service validation, and user-visible validation failure.

### Goal

- Return a clear validation error for malformed paths, unsupported URLs, or invalid extracted package shapes.

### Preconditions

- User submits one invalid import attempt.

### Expected Outcome

- No root is added.
- No managed install is persisted.
- The user receives a clear validation error.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/settings/AgentPackagesManager.vue:handleImportSubmit(...)
├── autobyteus-web/stores/agentPackagesStore.ts:importAgentPackage({ sourceKind, source }) [ASYNC]
├── autobyteus-server-ts/src/api/graphql/types/agent-packages.ts:importAgentPackage(input) [ENTRY]
├── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:importAgentPackage(input) [ASYNC]
│   └── autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts:validateImportInput(input) [STATE]
└── autobyteus-web/components/settings/AgentPackagesManager.vue:showImportError(...)
```

### Branching / Fallback Paths

```text
[FALLBACK] unsupported raw input cannot be classified into LOCAL_PATH or GITHUB_REPOSITORY on the client
autobyteus-web/components/settings/AgentPackagesManager.vue:handleImportSubmit(...)
└── autobyteus-web/components/settings/AgentPackagesManager.vue:showImportError(...) # client-side validation before API call
```

```text
[ERROR] GitHub archive extracts successfully but repository root fails package-shape validation
autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts:validatePackageRoot(...)
└── autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts:cleanupFailedInstall(...) [IO]
```

### State And Data Transformations

- raw user input -> explicit import command or validation error
- extracted repository root -> package-shape validation result

### Observability And Debug Points

- Logs emitted at:
  - unsupported source-kind classification,
  - malformed input rejection,
  - invalid package-shape rejection.

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? `No`
- Any naming-to-responsibility drift detected? `No`

### Open Questions

- None.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
