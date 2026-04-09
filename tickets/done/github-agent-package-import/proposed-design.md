# Proposed Design Document

## Design Version

- Current Version: `v2`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| `v1` | Initial draft | Reframed the current root-registration surface as a package-oriented catalog, added managed GitHub package install lifecycle, preserved low-level runtime root compatibility, and defined the clean product/API rename from `roots` to `packages`. | `1` |
| `v2` | Stage 5 `Requirement Gap` re-entry | Pinned the managed GitHub install subtree to `<appDataDir>/agent-packages/github/<owner>__<repo>/`, carried that rule through service and installer ownership, and removed ambiguity about root-level app-data placement. | `3` |

## Artifact Basis

- Investigation Notes: `tickets/done/github-agent-package-import/investigation-notes.md`
- Requirements: `tickets/done/github-agent-package-import/requirements.md`
- Requirements Status: `Refined`
- Shared Design Principles: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/design-principles.md`
- Common Design Practices: `/Users/normy/.codex/skills/software-engineering-workflow-skill/shared/common-design-practices.md`

## Summary

The product/API boundary moves from `Agent Package Roots` to `Agent Packages`.

The core design decision is:

- keep the existing low-level runtime discovery model based on readable local package roots,
- but add a new authoritative package-management owner that understands user-facing package identity, package source kind, managed GitHub installs, and package removal semantics.

That produces a clean split:

- product/API/UI surface: `Agent Packages`
- low-level runtime/discovery detail: `package root path`

GitHub import is modeled as a managed install flow:

- parse and normalize a public GitHub repository URL,
- download a source archive into app-managed storage,
- stage and finalize it under `<appDataDir>/agent-packages/github/<owner>__<repo>/`,
- extract and validate it as a package root,
- register the installed root into the existing additional-root runtime list,
- persist package metadata for later listing and removal,
- refresh definition caches so existing discovery/runtime flows can reuse the new package immediately.

Local path packages remain supported, but they are presented as linked packages rather than as raw root paths.

## Goal / Intended Change

- Support direct import of a public GitHub repository URL without requiring the user to clone manually.
- Store imported GitHub packages under app-managed storage inside the server app-data area, specifically under `<appDataDir>/agent-packages/github/<owner>__<repo>/`.
- Preserve current local-path package linking.
- Present the settings feature as `Agent Packages` instead of `Agent Package Roots`.
- Replace raw path identity at the product/API boundary with stable package identity and source-kind-aware behavior.
- Reuse current runtime discovery, editing, and bundled-skill behavior by ensuring imported packages end as normal local package roots.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy product/API code paths.`
- Required action:
  - remove `Agent Package Roots` naming from the frontend, web store, GraphQL boundary, and settings route id,
  - remove raw-path mutation identity from the product/API boundary,
  - remove the product-level assumption that package management is only root registration.
- Explicit non-removal note:
  - `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` remains as an internal low-level runtime root registry, not as a retained legacy product/API surface.
- Gate rule:
  - the design is invalid if it keeps old root-centric UI/API aliases or turns GitHub support into an ambiguous overloaded `add path` shortcut with no package identity model.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| `REQ-001`, `REQ-009` | Preserve local-path linking with unregister-only removal | `AC-003`, `AC-007` | Local package linking still works and removal leaves external files in place | `UC-002`, `UC-007` |
| `REQ-002`, `REQ-007`, `REQ-008`, `REQ-017`, `REQ-018`, `REQ-019`, `REQ-025` | Support managed GitHub package import into app-owned storage with a pinned subtree | `AC-004`, `AC-005`, `AC-006`, `AC-011`, `AC-015` | GitHub import succeeds without git, installs under the dedicated app-data package subtree, validates package shape, and becomes discoverable | `UC-003`, `UC-004`, `UC-005` |
| `REQ-003`, `REQ-004`, `REQ-005` | Rename product/API boundary to `Agent Packages` | `AC-001`, `AC-002` | Settings/UI/API route names become package-oriented | `UC-001`, `UC-006` |
| `REQ-006`, `REQ-011`, `REQ-012`, `REQ-022`, `REQ-023` | Represent packages by package identity and source-kind-aware metadata | `AC-012`, `AC-013` | Built-in, local, and GitHub entries are distinguishable and removable by the correct policy | `UC-006`, `UC-007`, `UC-008` |
| `REQ-015`, `REQ-016` | Normalize GitHub repository identity and enforce duplicate policy | `AC-010` | Duplicate GitHub import is rejected cleanly | `UC-009` |
| `REQ-024` | Preserve runtime discovery compatibility for existing additional roots | `AC-014` | Existing configured roots still participate in runtime discovery | `UC-005`, `UC-006` |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Settings page uses one path input through a root-centric GraphQL/store/service chain | `AgentPackageRootsManager.vue`, `agentPackageRootsStore.ts`, `agent-package-roots.ts`, `agent-package-root-service.ts` | None |
| Current Ownership Boundaries | `AgentPackageRootService` owns raw path validation and settings mutation, but not package provenance or managed install lifecycle | `agent-package-root-service.ts` | None |
| Current Coupling / Fragmentation Problems | Product/API/UI contract is built around root paths, while downstream discovery only cares about readable local package roots | GraphQL types, store, UI, discovery providers | Whether route ids should also clean-cut rename |
| Existing Constraints / Compatibility Facts | Runtime discovery already works with any readable local root and existing users may rely on `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` | `app-config.ts`, discovery providers, requirements | None |
| Relevant Files / Components | App-managed install patterns already exist elsewhere in the codebase | `messaging-gateway-installer-service.ts`, `managedExtensionService.ts` | None |

## Current State (As-Is)

- The settings surface lists the default app-data root plus extra linked roots and exposes raw paths as the main user-facing value.
- `addAgentPackageRoot(path)` only accepts absolute existing directories and explicitly rejects URL-like input.
- Additional package roots are persisted as a comma-separated env-backed list.
- Agent/team/skill discovery already reuses those roots uniformly.
- There is no package metadata registry for source kind, source URL, or removal policy.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | Settings package-management surface | Package list/import/remove result plus cache refresh | `AgentPackageService` | This is the authoritative product/API boundary for the feature |
| `DS-002` | `Primary End-to-End` | `importAgentPackage` with `GITHUB_REPOSITORY` input | Managed installed package root registered and discoverable | `AgentPackageService` with `GitHubAgentPackageInstaller` as owned off-spine concern | This is the new business path the user asked for |
| `DS-003` | `Primary End-to-End` | Registered package roots | Existing agent/team/skill availability | existing discovery providers/services | This proves the design can reuse current runtime discovery instead of inventing a second discovery model |
| `DS-004` | `Bounded Local` | Package list/remove identity resolution inside the service | Source-kind-aware merged `AgentPackage` view over built-in root, env roots, and registry metadata | `AgentPackageService` | Package identity and remove behavior depend on deterministic root/metadata reconciliation |

## Primary Execution / Data-Flow Spine(s)

- `Settings UI -> agentPackages store -> GraphQL AgentPackage resolver -> AgentPackageService -> root settings store + package registry store -> package summary builder -> cache refresh`
- `Settings UI -> GraphQL importAgentPackage(GITHUB_REPOSITORY) -> AgentPackageService -> GitHubAgentPackageInstaller -> GitHub metadata/archive retrieval -> <appDataDir>/agent-packages/github/<owner>__<repo>/ -> root validator -> root settings store + package registry store -> cache refresh`
- `Runtime/service consumer -> appConfig root list -> file agent provider / file team provider / skill discovery -> caches -> visible runtime definitions`

## Spine Actors / Main-Line Nodes

| Node | Role In Spine | What It Advances |
| --- | --- | --- |
| `AgentPackagesManager` + Pinia store | UI entrypoint | User actions and source-type-aware input handling |
| GraphQL `AgentPackageResolver` | Thin API entry boundary | Package list/import/remove requests |
| `AgentPackageService` | Governing owner | Package catalog semantics, import/remove orchestration, identity, cache refresh |
| `GitHubAgentPackageInstaller` | Managed-install execution owner | URL normalization, download, extraction, validation, staged install |
| `AgentPackageRootSettingsStore` | Low-level runtime-root persistence owner | Read/write of `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` |
| `AgentPackageRegistryStore` | Metadata/provenance owner | Package source kind, source URL, managed install metadata |
| Existing discovery providers/services | Downstream runtime effect | Agents, teams, and skills become visible from local roots |

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | The settings surface calls one package-oriented API boundary. The service reconciles the built-in storage entry, low-level root list, and package metadata registry into user-facing `AgentPackage` entries and handles package import/remove semantics without exposing raw root logic to callers. | package entry, package identity, package source kind | `AgentPackageService` | root settings persistence, registry persistence, summary counting, cache refresh |
| `DS-002` | A GitHub package import flows through the package service into a managed installer that downloads an archive, stages extraction, validates the resulting package root, finalizes it under `<appDataDir>/agent-packages/github/<owner>__<repo>/`, records metadata, registers the root, and then refreshes caches so the package becomes discoverable immediately. | normalized GitHub repository source, managed install path, package metadata | `AgentPackageService` | download utilities, archive extraction, GitHub metadata fetch, temporary staging cleanup |
| `DS-003` | Once a package root is registered, the existing agent, team, and skill discovery paths continue to work unchanged because they already consume a list of readable local roots. | registered local package root | existing discovery providers | cache refresh only |
| `DS-004` | Inside the service, package listing and removal depend on a deterministic merge of default root, env-based additional roots, and registry metadata keyed by root path and normalized source identity. | built-in entry, linked local package entry, managed GitHub package entry | `AgentPackageService` | root-path normalization, registry enrichment, removal-mode selection |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `AgentPackageService` | Package identity, source-kind semantics, import/remove orchestration, merged package listing, cache refresh | raw archive download details, UI rendering, discovery internals | This is the authoritative package-management boundary |
| `GitHubAgentPackageInstaller` | GitHub URL normalization, metadata fetch, archive retrieval, extraction staging, install-root validation, and final placement under `agent-packages/github/<owner>__<repo>` | settings mutation, package list synthesis, cache refresh | Installer is invoked only by the service |
| `AgentPackageRootSettingsStore` | Low-level serialization and mutation of `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` | package source metadata or GitHub logic | Keeps env-string logic out of the service core |
| `AgentPackageRegistryStore` | Structured package metadata persistence | root list mutation or discovery | Registry stores provenance and managed-install metadata only |
| Existing discovery providers/services | Reading visible agents/teams/skills from registered roots | package source semantics, GitHub lifecycle | Downstream consumers remain unchanged in the target design |
| Web settings UI/store | Input capture, source-type auto-detection, package list rendering | package install orchestration, root persistence, GitHub lifecycle | Thin entry boundary only |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Web settings component/store | `AgentPackageService` | Collect user input and render package state | install lifecycle, removal policy, root merge logic |
| GraphQL resolver | `AgentPackageService` | Network/API boundary | package provenance logic or root persistence details |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `Agent Package Roots` naming in frontend/store/GraphQL route boundary | Product/API boundary is now package-oriented | `Agent Packages` naming and `agent-packages` route id | `In This Change` | clean-cut rename |
| Raw path as package remove identity | GitHub-managed packages need stable logical identity and differentiated removal policy | package id + metadata registry | `In This Change` | path may remain as secondary detail only |
| Path-only `AgentPackageRootService` as the product/API owner | It cannot represent source kind, managed installs, or package lifecycle cleanly | `AgentPackageService` + explicit off-spine stores/installers | `In This Change` | root details become internal |
| URL-like input rejection as the product contract | GitHub import becomes a first-class supported path | explicit `GITHUB_REPOSITORY` import path | `In This Change` | validation becomes source-kind-aware instead |

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentPackageService`
- bounded local spine: `read built-in root -> read env roots -> read registry entries -> merge by normalized root path -> synthesize AgentPackage[]`
- why it matters:
  - list rendering, duplicate detection, and removal all depend on the same deterministic merged package view.

- Parent owner: `GitHubAgentPackageInstaller`
- bounded local spine: `normalize URL -> derive <owner>__<repo> install key -> fetch repository metadata -> build archive URL -> download archive -> extract to temp -> normalize extracted root -> validate package -> move to <appDataDir>/agent-packages/github/<owner>__<repo>/`
- why it matters:
  - this is the critical internal lifecycle that must remain encapsulated behind one install owner.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Package summary counting and root validation | `AgentPackageService` | Count shared/local/team definitions and validate package-root shape | `Yes` |
| Root settings store | `AgentPackageService` | Read/write normalized runtime roots from env-backed settings | `Yes` |
| Package registry store | `AgentPackageService` | Persist source kind, source URL, managed install metadata | `Yes` |
| GitHub download helpers | `GitHubAgentPackageInstaller` | Low-level fetch/write of archive payloads | `Yes` |
| Archive extraction | `GitHubAgentPackageInstaller` | Expand downloaded source archive into staging directory | `Yes` |
| Cache refresh | `AgentPackageService` | Refresh agent/team caches after mutation | `Yes` |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| User-facing package management boundary | current `agent-package-roots` slice | `Extend` via rename to `agent-packages` | Same product area, but broader ownership model is needed | N/A |
| Low-level root discovery | `app-config` + existing discovery providers | `Reuse` | Current runtime already consumes local roots correctly | N/A |
| Managed app-owned download/install pattern | managed messaging + managed extensions patterns | `Extend` conceptually | Same lifecycle shape exists already | N/A |
| HTTP file download primitive | `download-utils.ts` / `downloader.ts` | `Reuse` | Already does the low-level file fetch/write work | N/A |
| GitHub package install lifecycle owner | none | `Create New` | No current subsystem owns repository-source normalization and package extraction/install | Existing areas provide only primitives/patterns, not the package-install concern itself |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-packages` server subsystem | Package list/import/remove API, root+registry merge, source-kind semantics, GitHub install orchestration | `DS-001`, `DS-002`, `DS-004` | `AgentPackageService` | `Create New` via rename/expansion of current package-root slice | New authoritative owner |
| Existing discovery subsystems (`agent-definition`, `agent-team-definition`, `skills`) | Reading definitions from registered local roots | `DS-003` | existing providers/services | `Reuse` | No new GitHub-specific discovery path |
| Web settings package-management surface | Package list rendering and simplified source-type input capture | `DS-001` | web settings UI/store | `Extend` via rename to package-oriented surface | Route id becomes `agent-packages` |
| Config/settings persistence | Low-level env-backed root list | `DS-001`, `DS-004` | `AgentPackageRootSettingsStore` | `Reuse` | Internal only, no longer product-facing |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - web settings UI/store -> GraphQL package resolver -> `AgentPackageService`
  - `AgentPackageService` -> `AgentPackageRootSettingsStore`
  - `AgentPackageService` -> `AgentPackageRegistryStore`
  - `AgentPackageService` -> `GitHubAgentPackageInstaller`
  - `GitHubAgentPackageInstaller` -> download utilities / extraction helper / app-config paths
  - existing discovery providers -> `appConfig.getAppDataDir()` + `getAdditionalAgentPackageRoots()`
- Authoritative public entrypoints versus internal owned sub-layers:
  - Callers above package management must use `AgentPackageService` via GraphQL and must not call settings service, registry store, or installer directly.
  - `GitHubAgentPackageInstaller` is internal to `AgentPackageService`; no UI/API caller may depend on it directly.
- Forbidden shortcuts:
  - Do not let the web store call `server-settings-service` or mutate raw path strings directly.
  - Do not let GraphQL/UI remove packages by raw path once package ids exist.
  - Do not let the installer write `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` or refresh caches directly.
  - Do not make discovery providers consult the package metadata registry.
- Boundary bypasses that are not allowed:
  - `Resolver -> RootSettingsStore` bypassing `AgentPackageService`
  - `Resolver -> GitHubAgentPackageInstaller` bypassing `AgentPackageService`
  - `UI -> path-only GraphQL add/remove root` after the rename
- Temporary exceptions and removal plan:
  - `None`

## Architecture Direction Decision (Mandatory)

- Chosen direction:
  - `Package-oriented catalog boundary over existing local-root runtime discovery, with a managed GitHub installer behind the catalog service.`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`):
  - `complexity`: reuses current discovery instead of adding a parallel GitHub-aware discovery path.
  - `testability`: package list/import/remove can be tested at the catalog boundary with clear source-kind and removal-mode semantics.
  - `operability`: managed installs are isolated under `<appDataDir>/agent-packages/github/`, easy to remove, and do not pollute the default `agents/` and `agent-teams/` folders.
  - `evolution cost`: future refresh/update flows can extend package metadata and installer behavior without redesigning discovery again.
- Data-flow spine clarity assessment: `Yes`
- Spine span sufficiency assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`):
  - `Add`, `Rename/Move`, `Remove`

## Common Design Practices Applied (If Any)

| Practice / Pattern | Where Used | Why It Helps Here | Owner / Off-Spine Concern | Notes |
| --- | --- | --- | --- | --- |
| Managed install ending in a normal local root | GitHub import path | Preserves current discovery/runtime behavior | `AgentPackageService` + `GitHubAgentPackageInstaller` | Central design choice |
| Split product/API boundary from low-level runtime detail | Package catalog vs root-path config | Lets UI talk about packages while runtime still consumes roots | `AgentPackageService` | Avoids leaking storage details |
| Stable logical identity over raw path | Package id + normalized GitHub source | Enables differentiated remove policy and duplicate detection | `AgentPackageService` | Root path remains secondary technical detail only |
| Existing-capability reuse | Discovery providers and download utils | Reduces scope and avoids ad hoc helper sprawl | discovery subsystems + download utilities | Keeps new work focused |

## Ownership And Structure Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers exists and needs a clearer owner | `Yes` | list/import/remove all need source-kind, package-id, and removal-mode semantics | Extract clear owner |
| Responsibility overload exists in one file or one optional module grouping | `Yes` | current root service cannot cleanly own catalog semantics plus GitHub install plus registry metadata as-is | Split |
| Proposed indirection owns real policy, translation, or boundary concern | `Yes` | service, installer, registry store, and root settings store each own distinct policy | Keep |
| Every off-spine concern has a clear owner on the spine | `Yes` | registry, root settings, download, extraction, summary counting all serve the package service or installer | Keep |
| Primary spine is stretched far enough to expose the real business path instead of only a local edited segment | `Yes` | DS-001 and DS-002 span UI/API -> owner -> downstream effect | Keep |
| Authoritative Boundary Rule is preserved | `Yes` | UI/API callers use the service; installer and stores remain internal | Keep |
| Existing capability area/subsystem was reused or extended where it naturally fits | `Yes` | discovery, config, download primitives reused | Reuse/Extend |
| Repeated structures were extracted into reusable owned files where needed | `Yes` | package registry record and root settings store become explicit owned structures | Extract |
| Current structure can remain unchanged without spine/ownership degradation | `No` | root-only service/UI/API cannot express managed GitHub package lifecycle | Change |

## Optional Alternatives

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| `A` | Keep current `addAgentPackageRoot(path)` API and allow it to accept URLs as a special case | Smaller immediate patch | Keeps raw-path identity, no package metadata model, no clear remove policy for managed installs, still root-centric UI | `Rejected` | Too ambiguous and weak on ownership |
| `B` | Use internal `git clone` into app data for GitHub packages | Familiar repo workflow | Depends on git availability, heavier runtime dependency, not aligned with the “no Git knowledge needed” goal | `Rejected` | Archive-based import is cleaner for public repos |
| `C` | Introduce package catalog service with managed archive install and preserve low-level root discovery | Clean product/API boundary and minimal downstream discovery churn | Requires new metadata store and installer owner | `Chosen` | Best balance of clarity and scope |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `Rename/Move` | `autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts` | `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | Product/API boundary becomes package-oriented | server GraphQL, schema | clean cut rename |
| `C-002` | `Rename/Move` | `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts` | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Root-only service becomes package catalog owner | server package management | broadened ownership |
| `C-003` | `Add` | `N/A` | `autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts` | Encapsulate env-backed root list read/write | server package management | internal low-level boundary |
| `C-004` | `Add` | `N/A` | `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | Persist package metadata/provenance and managed-install state | server package management | JSON registry under app data |
| `C-005` | `Add` | `N/A` | `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | Own GitHub archive install lifecycle and placement under `agent-packages/github/<owner>__<repo>` | server package management | app-managed install owner |
| `C-006` | `Add` | `N/A` | `autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts` | Normalize and validate supported GitHub repository URLs | server package management | source identity helper |
| `C-007` | `Add` | `N/A` | `autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts` | Centralize package validation and counts | server package management | keeps counting logic out of service core |
| `C-008` | `Rename/Move` | `autobyteus-web/components/settings/AgentPackageRootsManager.vue` | `autobyteus-web/components/settings/AgentPackagesManager.vue` | Frontend surface becomes package-oriented | web settings UI | clean cut rename |
| `C-009` | `Rename/Move` | `autobyteus-web/stores/agentPackageRootsStore.ts` | `autobyteus-web/stores/agentPackagesStore.ts` | Store becomes package-oriented | web state | clean cut rename |
| `C-010` | `Rename/Move` | `autobyteus-web/graphql/agentPackageRoots.ts` | `autobyteus-web/graphql/agentPackages.ts` | GraphQL docs become package-oriented | web GraphQL | clean cut rename |
| `C-011` | `Modify` | `autobyteus-web/pages/settings.vue` | same path | Change nav label and route id to `agent-packages` | settings page | user-facing naming |
| `C-012` | `Modify` | current e2e/web tests around package roots | same test areas | Replace root-centric expectations with package-oriented contract and GitHub import coverage | server e2e, web tests | remove URL rejection expectation |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `agent-packages/services/agent-package-service.ts` | `agent-packages` | Service boundary | Package list/import/remove orchestration | One authoritative product/API owner | Yes |
| `agent-packages/stores/agent-package-root-settings-store.ts` | `agent-packages` | Low-level persistence boundary | Read/write additional root paths | One low-level concern | Yes |
| `agent-packages/stores/agent-package-registry-store.ts` | `agent-packages` | Metadata persistence boundary | Structured package metadata and managed install info | One registry concern | Yes |
| `agent-packages/installers/github-agent-package-installer.ts` | `agent-packages` | Managed install owner | GitHub metadata/archive install lifecycle | One lifecycle concern | Yes |
| `agent-packages/utils/github-repository-source.ts` | `agent-packages` | Shared helper | Normalize supported GitHub URL shapes | Reused by service + installer | Yes |
| `agent-packages/utils/package-root-summary.ts` | `agent-packages` | Shared helper | Validate package-root shape and count definitions | Used by list/import validation | Yes |
| `api/graphql/types/agent-packages.ts` | server GraphQL | API boundary | Package query/mutation types | Single subject-owned boundary | Yes |
| `components/settings/AgentPackagesManager.vue` | web settings | UI boundary | Render package list and simplified import form | Single UI responsibility | Yes |
| `stores/agentPackagesStore.ts` | web settings | Client state boundary | Fetch/import/remove package list | Single client-state owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Package summary counting and validation | `package-root-summary.ts` | `agent-packages` | List and import validation need the same package-root rules | `Yes` | `Yes` | an unowned misc helper |
| GitHub URL normalization | `github-repository-source.ts` | `agent-packages` | Duplicate detection and installer both need the same canonical repository identity | `Yes` | `Yes` | ad hoc regexes spread across UI/API |
| Package registry record shape | `agent-package-registry-store.ts` domain types | `agent-packages` | Service and installer share the same metadata model | `Yes` | `Yes` | path-only bag of optional fields |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentPackage` GraphQL type | `Yes` | `Yes` | `Low` | Keep source kind, removal mode, and package id explicit |
| Package registry record | `Yes` | `Yes` | `Low` | Keep root path, normalized source, and managed install path (`<appDataDir>/agent-packages/github/<owner>__<repo>`) singular, not overlapping |
| GitHub repository source descriptor | `Yes` | `Yes` | `Low` | Normalize one canonical repository identity string before storage |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | `agent-packages` | Governing owner | Package list/import/remove semantics | Canonical package-management owner | Yes |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | `agent-packages` | Internal owned mechanism | GitHub package install lifecycle | Encapsulated managed install flow | Yes |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts` | `agent-packages` | Internal owned mechanism | Additional root path persistence | Encapsulates env serialization | Yes |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | `agent-packages` | Internal owned mechanism | Package metadata persistence | Encapsulates registry file IO | Yes |
| `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | server GraphQL | Authoritative API boundary | Query/mutation package contract | Single subject-owned boundary | Yes |
| `autobyteus-web/components/settings/AgentPackagesManager.vue` | web settings | UI entry boundary | Package list rendering and one-field import UX | Single settings responsibility | Yes |
| `autobyteus-web/stores/agentPackagesStore.ts` | web settings | Client-state boundary | Package state and mutations | Single client-store subject | Yes |

## Ownership Boundaries

- `AgentPackageService` is the authoritative package-management boundary.
- `GitHubAgentPackageInstaller`, `AgentPackageRootSettingsStore`, and `AgentPackageRegistryStore` are internal owned mechanisms behind that boundary.
- Existing discovery providers remain the authoritative boundaries for agent/team/skill discovery from registered roots.
- The web store and GraphQL resolver remain thin request/response boundaries and must not own package lifecycle policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentPackageService` | GitHub installer, root settings store, registry store, cache refresh, summary builder | GraphQL resolver, tests, future package-management callers | `Resolver -> installer/store directly` | expand service API, not by bypassing it |
| Existing discovery providers/services | root scanning and definition reads | runtime/UI/service consumers | `package service -> registry -> custom discovery path` | keep package service focused on registration, not discovery reimplementation |

## Dependency Rules

- `AgentPackageService` may depend on:
  - app-config/app-data path access,
  - server settings service indirectly through the root settings store,
  - registry store,
  - GitHub installer,
  - existing agent/team services for cache refresh.
- `GitHubAgentPackageInstaller` may depend on:
  - download utilities,
  - archive extraction helper,
  - GitHub repository source helper,
  - app-config-derived directories and the dedicated `agent-packages/github` subtree policy.
- The web store may depend only on the GraphQL package boundary.
- No caller above `AgentPackageService` may depend on its internal stores or installer directly.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `agentPackages` query | package catalog | List built-in, linked, and managed packages | none | source-kind-aware list |
| `importAgentPackage(input)` | package catalog | Import/link one package | `{ sourceKind, source }` | explicit source type even if UI auto-detects |
| `removeAgentPackage(packageId)` | package catalog | Remove one package by logical identity | `packageId` | removal policy chosen from metadata |
| `AgentPackage` GraphQL object | package catalog entry | User-facing package summary | `id`, `sourceKind`, `removalMode`, optional `rootPath` secondary detail | package-oriented, not root-oriented |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `agentPackages` | `Yes` | `Yes` | `Low` | keep list subject singular |
| `importAgentPackage(input)` | `Yes` | `Yes` | `Low` | keep `sourceKind` explicit |
| `removeAgentPackage(packageId)` | `Yes` | `Yes` | `Low` | do not regress to raw path input |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Product surface | `Agent Packages` | `Yes` | `Low` | adopt clean cut |
| Service boundary | `AgentPackageService` | `Yes` | `Low` | use as canonical owner |
| Managed install owner | `GitHubAgentPackageInstaller` | `Yes` | `Low` | keep lifecycle-specific name |
| Low-level path store | `AgentPackageRootSettingsStore` | `Yes` | `Low` | keep root detail internal |

## Applied Patterns (If Any)

- `Service + internal stores/installers` pattern:
  - `AgentPackageService` owns policy and orchestration.
  - `GitHubAgentPackageInstaller` owns one install lifecycle.
  - stores own one persistence concern each.
- `Managed install with staged extraction` pattern:
  - mirrors existing app-owned install flows already used elsewhere in the codebase.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-packages/` | `Folder` | package-management subsystem | All package catalog/import/remove concerns | One coherent server owner | unrelated agent/team discovery logic |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | `File` | authoritative boundary | Package catalog orchestration | Product/API package owner | low-level archive extraction code |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | `File` | internal owned mechanism | GitHub install lifecycle | One install concern | settings mutation or cache refresh |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts` | `File` | internal owned mechanism | env-backed root persistence | One low-level concern | GitHub normalization or UI semantics |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | `File` | internal owned mechanism | metadata registry IO | One registry concern | root list mutation |
| `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | `File` | API boundary | GraphQL package types/resolver | Single subject-owned API | installer internals |
| `autobyteus-web/components/settings/AgentPackagesManager.vue` | `File` | UI boundary | package list UI and simplified import form | user-facing package management | server lifecycle logic |
| `autobyteus-web/stores/agentPackagesStore.ts` | `File` | client-state boundary | query/mutation coordination | single client state owner | heuristic package semantics beyond API contract |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-packages/` | `Mixed Justified` | `Yes` | `Low` | Small focused subsystem; internal split into `services`, `stores`, and `installers` keeps lifecycle and persistence readable |
| `api/graphql/types/` | `Transport` | `Yes` | `Low` | Existing transport boundary pattern |
| `components/settings/` | `Transport` | `Yes` | `Low` | Existing web settings boundary pattern |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| GitHub import API call | `importAgentPackage({ sourceKind: "GITHUB_REPOSITORY", source: "https://github.com/acme/agent-pack" })` | `addAgentPackageRoot("https://github.com/acme/agent-pack")` | Keeps subject and identity explicit |
| Local package remove | `removeAgentPackage("local:/Users/me/my-agents")` -> unregister only | `removeAgentPackageRoot("/Users/me/my-agents")` | Removal behavior should be package-aware, not path-first |
| GitHub package list row | `acme/agent-pack` with source badge `GitHub` and path secondary | primary title is raw app-data install path | Matches the user’s request to stop leading with roots |
| Managed GitHub install path | `<appDataDir>/agent-packages/github/acme__agent-pack/` | `<appDataDir>/agent-packages/github/agent-pack/` or direct placement under `<appDataDir>/` | Prevents repo-name collisions while keeping one folder per imported repo |
| Built-in storage row | `Built-in Package Storage` with non-removable badge | raw `/Users/.../server-data` as the headline | Keeps the internal default root visible without making the path the product concept |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `agentPackageRoots` GraphQL fields as aliases | Existing in-repo callers use them today | `Rejected` | Rename the in-repo API boundary to `agentPackages` cleanly |
| Keep `agent-package-roots` route id as a hidden alias | Existing tests and deep links may reference it | `Rejected` | Move to `agent-packages` consistently in touched frontend paths |
| Overload path mutation to accept GitHub URLs | Smaller short-term diff | `Rejected` | explicit `importAgentPackage(input)` boundary |
| Depend on system `git clone` internally | Familiar repository workflow | `Rejected` | use archive-based managed install path |

## Derived Layering (If Useful)

- Transport/UI layer:
  - settings component/store, GraphQL resolver
- Main-line domain/control layer:
  - `AgentPackageService`
- Internal persistence/install layer:
  - root settings store, metadata registry store, GitHub installer
- Downstream consumer layer:
  - existing discovery providers and cache-backed services

## Migration / Refactor Sequence

1. Introduce `agent-packages` server subsystem with package service, root settings store, registry store, and GitHub installer.
2. Rename GraphQL boundary from root-oriented names to package-oriented names.
3. Rename web component/store/graphql/settings route to `Agent Packages`.
4. Switch the settings UI to the new package list and import/remove mutations.
5. Keep runtime discovery reading the low-level root list unchanged.
6. Add GitHub import and managed removal tests.
7. Delete the old root-centric service/component/store/graphql files and old route/test expectations in touched scope.

## Key Tradeoffs

- Preserving `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` internally reduces downstream discovery churn at the cost of keeping one low-level root concept in the implementation.
- Rejecting duplicate GitHub imports avoids destructive overwrite of managed packages but defers explicit refresh/update UX to a later slice.
- Keeping raw root path as optional secondary detail helps diagnostics while still moving the primary UI concept to packages.

## Risks

- GitHub archive extraction requires a server-owned extraction mechanism that is not yet present.
- The package registry and low-level root list must stay reconciled; stale metadata cleanup rules need to be implemented carefully.
- Some existing automation may depend on the old GraphQL/store/route names; this design intentionally chooses a clean-cut rename in touched product/API paths.

## Guidance For Implementation

- Keep the service boundary authoritative. Do not let the UI, GraphQL resolver, or installer grow separate package semantics.
- Keep discovery unchanged unless a concrete implementation need proves otherwise.
- Make GitHub source normalization deterministic and reuse it everywhere duplicate policy matters.
- Keep local-path and GitHub removal semantics explicit through metadata rather than inferring behavior from path location heuristics alone.
