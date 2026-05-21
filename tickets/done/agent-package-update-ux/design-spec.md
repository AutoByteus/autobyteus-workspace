# Design Spec

## Current-State Read

The current Agent Packages flow is a source-aware import/remove flow but not a source-version/update flow.

Frontend current path:

`AgentPackagesManager.vue -> agentPackagesStore.ts -> graphql/agentPackages.ts -> GraphQL server`

Backend current path:

`AgentPackageResolver -> AgentPackageService -> AgentPackageRootSettingsStore / AgentPackageRegistryStore / GitHubAgentPackageInstaller -> AgentDefinitionService + AgentTeamDefinitionService cache refresh`

Current behavior and constraints:

- `autobyteus-web/components/settings/AgentPackagesManager.vue` lists package rows, source labels, counts, source/path, and `Remove` for removable rows. It detects GitHub URL input and sends `sourceKind: GITHUB_REPOSITORY`; everything else is `LOCAL_PATH`.
- `autobyteus-web/stores/agentPackagesStore.ts` only has `fetchAgentPackages`, `importAgentPackage`, and `removeAgentPackage`. Import/remove already refresh dependent frontend catalogs: applications, agent definitions, and agent team definitions.
- `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` exposes `agentPackages`, `importAgentPackage`, and `removeAgentPackage` only.
- `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` is the authoritative package lifecycle boundary. It owns package list/import/remove, root settings mutation, registry mutation, rollback for import/remove, and backend agent/team cache refresh.
- `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` imports GitHub packages by GitHub API metadata plus codeload tarball extraction. It does not clone a Git repository and should remain Git-free for this task.
- `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` persists source kind, source, normalized source, root path, managed install path, and timestamps, but no installed revision/latest revision/check metadata.
- Cached agent and team definition providers require explicit refresh after package content changes.

The target must keep local paths user-managed and app-managed GitHub imports AutoByteus-managed. The frontend must not manipulate package folders or GitHub directly.

## Intended Change

Add a minimal package-update UX and server capability:

- Local-path packages show `Reload`; clicking it rescans package files from disk, refreshes backend catalogs, refreshes frontend package counts and dependent lists, and does not modify local files.
- Public GitHub URL imports remain app-managed and Git-free. They are checked through GitHub metadata. When a newer remote revision is available, the row shows `Update`.
- Clicking `Update` downloads the latest GitHub archive to staging, validates it, atomically replaces the managed package directory, updates registry revision metadata, refreshes caches/catalogs, and shows success/error feedback.
- Existing GitHub registry records without revision metadata become `UNKNOWN`/`not checked` state and can be updated to latest without delete/re-import.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded
- Evidence:
  - The backend package owner stores GitHub source identity but not installed/latest revision state, so it cannot answer whether an app-managed GitHub package is stale.
  - The frontend has no authoritative API for package update/reload; a frontend-only solution would bypass server-owned package files, registry metadata, rollback, and cache refresh.
  - `GitHubAgentPackageInstaller` already owns GitHub tarball materialization; extending that path preserves the no-Git dependency decision.
- Design response:
  - Extend `AgentPackageService` as the authoritative lifecycle boundary with `reload`, `check updates`, and `update` commands.
  - Extend registry record metadata for GitHub revision/check state.
  - Keep GitHub download/update mechanics behind `GitHubAgentPackageInstaller` or a sibling GitHub package source helper used only by the service.
  - Extend GraphQL/store/UI as thin command/query surfaces.
- Refactor rationale:
  - A small refactor is needed to separate GitHub repository version metadata and archive materialization from the one-shot import-only flow. This prevents duplicated GitHub fetch/download policy between import and update.
- Intentional deferrals and residual risk, if any:
  - Local Git status detection and local pull/update are deferred. Local paths show only `Reload` in this MVP.
  - Direct private GitHub URL import/authentication is deferred. Private repos are handled through local-path import plus `Reload`.
  - Application Packages parity is deferred unless reusable GitHub helper extraction makes it cheap; this design keeps helper shapes reusable for follow-up.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: existing GitHub registry records without revision metadata are normalized into the new single metadata model with `installedRevision: null`, `latestRevision: null`, `updateStatus: UNKNOWN`, not processed through a permanent dual path.
- No compatibility wrapper or old update flow will be kept. Import, check, update, and reload all return the updated package list shape.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Local package row `Reload` click | Refreshed package rows and dependent catalogs | `AgentPackageService` | Defines the safe user-managed local folder rescan path. |
| DS-002 | Primary End-to-End | GitHub package update check on settings page | Package row status says up-to-date/update-available/error | `AgentPackageService` | Defines where remote state is checked and persisted. |
| DS-003 | Primary End-to-End | GitHub package row `Update` click | Managed package replaced and catalogs refreshed | `AgentPackageService` | Defines the app-managed update transaction. |
| DS-004 | Return-Event | Backend command result | Store state and row success/error feedback | `agentPackagesStore` | Makes user feedback and dependent frontend reload explicit. |
| DS-005 | Bounded Local | GitHub update staging transaction | Install directory commit or rollback | `GitHubAgentPackageInstaller` / GitHub package materializer | Prevents failed downloads/validation/refresh from corrupting installed packages. |

## Primary Execution Spine(s)

- `Local package row -> AgentPackagesStore.reloadAgentPackage -> GraphQL reloadAgentPackage -> AgentPackageService.reloadPackage -> Package root validation + cache refresh -> package list returned -> frontend dependent catalogs refreshed`
- `Agent Packages page -> AgentPackagesStore.checkAgentPackageUpdates -> GraphQL checkAgentPackageUpdates -> AgentPackageService.checkGitHubPackageUpdates -> GitHub metadata fetch -> registry update metadata -> package list returned -> row status rendered`
- `GitHub package row -> AgentPackagesStore.updateAgentPackage -> GraphQL updateAgentPackage -> AgentPackageService.updateGitHubPackage -> GitHub archive materializer staging transaction -> registry update + cache refresh -> package list returned -> frontend dependent catalogs refreshed`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user clicks `Reload` on a local-path row. The frontend sends a package id to the server. The server validates that the package exists and is reloadable, validates the root still has package shape, refreshes package-derived backend caches, returns the updated list, and the frontend refreshes dependent catalogs. | Package row, store command, GraphQL mutation, package service, cache refresh | `AgentPackageService` | Root validation, package list mapping, frontend dependent catalog refresh |
| DS-002 | The settings page checks managed GitHub rows. The server fetches GitHub default-branch revision metadata without Git, compares it to installed metadata, writes latest check state, and returns package rows with update state. | Package page, store command, GraphQL mutation, package service, GitHub metadata reader, registry | `AgentPackageService` | GitHub API normalization, rate/error handling, status mapping |
| DS-003 | A user clicks `Update` on a managed GitHub row. The server stages a fresh archive for the latest remote revision, validates it, swaps it into the managed install path, updates registry metadata, refreshes caches, and returns package rows. Rollback restores the previous install if commit/refresh fails. | Package row, store command, GraphQL mutation, package service, GitHub materializer, registry, cache refresh | `AgentPackageService` | Staging paths, archive extraction, validation, atomic swap, rollback cleanup |
| DS-004 | Backend command responses update the local Pinia package list and trigger existing dependent frontend store refreshes. Success/error messages render on the settings page. | GraphQL result, Pinia store, UI row | `agentPackagesStore` | Loading state, per-package action state, success/error copy |
| DS-005 | The GitHub materializer uses a temporary staging directory and backup directory so archive replacement is all-or-rollback from the service perspective. | staging dir, extracted root, install dir, backup dir | `GitHubAgentPackageInstaller` / materializer | Tar extraction, filesystem rename/rm, cleanup |

## Spine Actors / Main-Line Nodes

- `AgentPackagesManager.vue`: visible settings surface and action origin.
- `agentPackagesStore.ts`: frontend command/query adapter and dependent frontend catalog refresh coordinator.
- `AgentPackageResolver`: GraphQL transport boundary.
- `AgentPackageService`: authoritative package lifecycle and source-state owner.
- `AgentPackageRegistryStore`: persisted package source and revision metadata owner.
- `GitHubAgentPackageInstaller` or extracted GitHub package materializer: GitHub metadata/archive/staging mechanism.
- `AgentDefinitionService` / `AgentTeamDefinitionService`: backend cache refresh targets.

## Ownership Map

- `AgentPackagesManager.vue` owns row layout, labels, action visibility, action loading states, and success/error copy only.
- `agentPackagesStore.ts` owns GraphQL calls, package list state, per-action loading/error state, and frontend dependent catalog refresh after mutating commands.
- `AgentPackageResolver` is a thin transport facade. It must not own package source policy.
- `AgentPackageService` owns package identity, lifecycle commands, source-kind rules, allowed actions, validation sequencing, rollback coordination, registry updates, and backend cache refresh.
- `AgentPackageRegistryStore` owns JSON persistence, normalization of old/new records into one shape, and record upsert/remove methods.
- `GitHubAgentPackageInstaller` / materializer owns GitHub HTTP calls, archive URL construction, staging extraction, validation handoff, and install-dir replacement mechanics.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentPackageResolver` | `AgentPackageService` | GraphQL transport mapping | Source status policy, filesystem mutation, rollback |
| `agentPackagesStore.ts` | Server GraphQL package commands | Frontend state/action bridge | GitHub fetch, package folder mutation, registry state |
| `AgentPackagesManager.vue` | `agentPackagesStore.ts` / server package service | User interaction and display | Package update decision logic beyond rendering returned state |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Import-only GitHub metadata shape | GitHub rows need installed/latest revision and check state | New GitHub source metadata on `AgentPackageRecord` | In This Change | Existing records normalize into unknown state. |
| UI rows with source label but no local reload/GitHub update action | Rows hide the necessary next action | Extended `AgentPackagesManager.vue` row actions | In This Change | Keep layout, add minimal actions/status. |
| Duplicate GitHub import dead-end copy | User needs update guidance for already-installed package | Improved import error mapping/copy | In This Change | Can be handled in service error message or frontend catch. |
| Local Git status/pull idea | Out of MVP and unsafe without Git/auth decisions | Local `Reload` only | In This Change | Explicitly do not add local update button. |

## Return Or Event Spine(s) (If Applicable)

- `AgentPackageService command -> [AgentPackage] GraphQL return -> agentPackagesStore replaces rows -> refreshDependentCatalogs -> AgentPackagesManager renders status/success/error`.
- Update failures return a GraphQL error and keep previous package rows in the store unless the server returns a safe updated list; the UI shows the store error.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `GitHubAgentPackageInstaller` / materializer.
- Chain: `fetch metadata -> download archive to staging -> extract -> validate package root -> move current install to backup -> move staged install into managed path -> update registry/cache via service -> remove backup OR rollback backup`.
- Why it matters: this is the core corruption-prevention mechanism for app-managed GitHub updates.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| GitHub source normalization | DS-002, DS-003 | `AgentPackageService` | Normalize owner/repo/source identity | Prevent duplicate/update identity drift | UI/server mismatch and duplicate records |
| GitHub metadata fetch | DS-002, DS-003 | GitHub materializer | Fetch default branch and latest commit SHA | Enables update availability without Git | Service grows HTTP details and duplicates installer policy |
| Registry metadata normalization | DS-002, DS-003 | `AgentPackageRegistryStore` | Default missing metadata to unknown state | Handles existing records cleanly | Permanent dual-path compatibility branches |
| Package root validation | DS-001, DS-003 | `AgentPackageService` | Ensure root still contains `agents`, `agent-teams`, or `applications` | Prevent invalid package contents from being loaded | Invalid rows/caches after update/reload |
| Frontend dependent catalog refresh | DS-001, DS-003, DS-004 | `agentPackagesStore` | Refresh applications, agents, teams after mutation | Keeps visible lists consistent | UI shows stale package-derived entities |
| Action loading state | DS-004 | `AgentPackagesManager.vue` / store | Disable row actions while command runs | Avoid duplicate update/reload clicks | Racey commands and confusing feedback |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Package lifecycle commands | Agent packages service | Extend | It already owns import/remove/rollback/cache refresh. | N/A |
| GitHub tarball materialization | `GitHubAgentPackageInstaller` | Extend/extract within same subsystem | It already owns GitHub API, codeload, staging extraction. | N/A |
| Package source metadata persistence | Agent package registry store | Extend | It already persists package records. | N/A |
| GraphQL transport | Existing agent packages GraphQL resolver | Extend | Same package subject and identity. | N/A |
| Frontend package state | Existing agent packages Pinia store | Extend | Same UI feature and dependent catalog refresh. | N/A |
| Local Git status/pull | None in current agent package subsystem | Defer | Out of MVP; local path is user-managed. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Agent Packages | Package list/import/remove/reload/check/update lifecycle | DS-001, DS-002, DS-003 | `AgentPackageService` | Extend | Main domain owner. |
| Backend GitHub Package Materialization | GitHub metadata/archive/staging/install replacement | DS-002, DS-003, DS-005 | `AgentPackageService` | Extend | Keep no-Git implementation. |
| Backend Persistence | Registry JSON record metadata | DS-002, DS-003 | `AgentPackageRegistryStore` | Extend | Normalize legacy rows to target shape. |
| GraphQL API | Transport commands/types | DS-001, DS-002, DS-003 | `AgentPackageService` | Extend | Resolver remains thin. |
| Frontend Settings Packages | Row status/actions and feedback | DS-004 | `agentPackagesStore` / UI | Extend | Minimal layout change. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-packages/types.ts` | Backend Agent Packages | Package domain types | Add source metadata/update status types | Existing type home for package DTOs/records | Yes |
| `autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts` | Backend GitHub Package Materialization | GitHub source utility | Add archive URL for arbitrary ref/commit if needed | Existing GitHub URL utility | Yes |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | Backend GitHub Package Materialization | GitHub materializer | Fetch repository revision metadata; stage archive; replace managed install | Existing materializer owner | Yes |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | Backend Persistence | Registry store | Normalize and persist source metadata; update source metadata by package id | Existing registry store | Yes |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Backend Agent Packages | Package lifecycle owner | Add reload/check/update commands and status mapping | Existing authoritative service | Yes |
| `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | GraphQL API | Transport facade | Add update status object/enums and reload/check/update mutations | Existing resolver/type file | Yes |
| `autobyteus-web/graphql/agentPackages.ts` | Frontend GraphQL | GraphQL document owner | Add fields/fragments and new mutations | Existing document file | Yes |
| `autobyteus-web/stores/agentPackagesStore.ts` | Frontend Settings Packages | Frontend package store | Add check/update/reload actions; maintain action loading; refresh dependent catalogs | Existing store owner | Yes |
| `autobyteus-web/components/settings/AgentPackagesManager.vue` | Frontend Settings Packages | UI surface | Render row status, `Reload`, `Update`, `Check again`, messages | Existing UI owner | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Agent package field selection in GraphQL documents | `AgentPackageFields` fragment in `autobyteus-web/graphql/agentPackages.ts` | Frontend GraphQL | List/import/remove/reload/check/update should return same row shape | Yes | Yes | A broad mixed fragment for unrelated package subjects |
| GitHub revision metadata shape | `AgentPackageGitHubSourceMetadata` in `types.ts` | Backend Agent Packages | Registry, service, and GraphQL mapping need one semantic shape | Yes | Yes | Kitchen-sink metadata for local paths |
| Package list mapping after mutations | Existing `mapAgentPackage` and service list return shape | Backend Agent Packages | All commands return current package list consistently | Yes | Yes | Separate per-command DTO drift |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentPackageGitHubSourceMetadata` | Yes | Yes | Low | Fields must mean installed/latest remote revision only; do not include local Git fields. |
| `AgentPackageUpdateInfo` | Yes | Yes | Medium | Keep as display/action state derived from package record; avoid duplicating raw metadata meanings. |
| `AgentPackageRecord.sourceMetadata` | Yes | Yes | Low | Keep nullable/nested per source kind; local path has no GitHub metadata. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-packages/types.ts` | Backend Agent Packages | Package domain types | Define update status enum, GitHub source metadata, update info DTO, updated record shape | Existing domain type file | Yes |
| `autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts` | Backend GitHub Materialization | Source URL utility | Build GitHub API/archive URLs and normalize source | Existing GitHub source utility | Yes |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | Backend GitHub Materialization | Materializer | Provide metadata fetch and staged install/replace functions | Keeps HTTP/archive details out of service | Yes |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | Backend Persistence | Registry store | Persist normalized source metadata and update metadata by package id | Existing JSON store owner | Yes |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Backend Agent Packages | Authoritative package service | Reload/check/update orchestration, rollback, action/status mapping, cache refresh | Existing lifecycle owner | Yes |
| `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | GraphQL API | Resolver facade | Expose new DTO/enums and mutations | Existing GraphQL boundary | Yes |
| `autobyteus-web/graphql/agentPackages.ts` | Frontend GraphQL | GraphQL document owner | Shared package fragment and new operations | Existing frontend GraphQL file | Yes |
| `autobyteus-web/stores/agentPackagesStore.ts` | Frontend Settings Packages | Pinia store | New action methods and action-state handling | Existing package UI store | Yes |
| `autobyteus-web/components/settings/AgentPackagesManager.vue` | Frontend Settings Packages | UI component | Minimal row status/action rendering | Existing settings component | Yes |
| `autobyteus-web/generated/graphql.ts` | Frontend Generated Types | Generated artifact | Regenerated GraphQL TypeScript types if this repo tracks generated output | Existing generated file | Yes |

## Ownership Boundaries

- The authoritative package lifecycle boundary is `AgentPackageService`. All package folder changes, source checks, update decisions, registry writes, and backend cache refreshes must pass through it.
- The GitHub materializer is internal to the package service. Callers must not use it directly through GraphQL or frontend code.
- The registry store persists records but does not decide whether a package can be reloaded/updated.
- The frontend store calls GraphQL and refreshes frontend stores after successful package mutations; it does not decide GitHub staleness except by rendering server-returned status.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentPackageService` | Registry store, root settings store, GitHub materializer, cache refresh | GraphQL resolver | Resolver/front-end directly updating registry or folders | Add service methods/DTOs |
| `GitHubAgentPackageInstaller` / materializer | GitHub API, codeload URLs, staging, extraction | `AgentPackageService` | Service duplicating archive download/extraction logic in multiple branches | Add materializer method |
| `agentPackagesStore.ts` | Apollo calls and dependent frontend refresh | `AgentPackagesManager.vue` | Component directly calling Apollo and refreshing unrelated stores | Add store methods |

## Dependency Rules

Allowed:

- UI -> Pinia store -> frontend GraphQL documents -> GraphQL resolver -> `AgentPackageService`.
- `AgentPackageService` -> registry/root settings/GitHub materializer/cache refresh services.
- Registry store -> file persistence utility.
- GitHub materializer -> GitHub source utils/download/tar extraction.

Forbidden:

- UI or Pinia store directly manipulating app-managed package directories.
- UI or Pinia store directly checking GitHub remote status.
- GraphQL resolver using registry store or GitHub materializer directly for package policy.
- Local path `Reload` attempting Git pull/status/update in this MVP.
- Managed GitHub update requiring system Git.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentPackageService.reloadAgentPackage(packageId)` | Agent package | Validate and rescan package-derived catalogs | Existing `packageId` | UI only shows for local path. |
| `AgentPackageService.checkAgentPackageUpdates(packageIds?)` | Managed GitHub package source state | Fetch latest remote revision and persist status | Optional list of `packageId`; omitted means managed GitHub packages | Mutation because it writes last-check metadata. |
| `AgentPackageService.updateAgentPackage(packageId)` | Managed GitHub package | Replace app-managed package with latest remote archive | Existing `packageId` | Reject non-GitHub/local/default packages. |
| `reloadAgentPackage(packageId: String!): [AgentPackage!]!` | GraphQL package command | Transport reload command | `packageId` | Returns list for store consistency. |
| `checkAgentPackageUpdates(packageIds: [String!]): [AgentPackage!]!` | GraphQL package command | Transport check command | Optional package IDs | Can check all GitHub rows on page load. |
| `updateAgentPackage(packageId: String!): [AgentPackage!]!` | GraphQL package command | Transport update command | `packageId` | Returns list after update. |

Rule:

- Do not add a generic `packageAction(action, id)` boundary. Reload/check/update have different subject rules and should remain explicit.

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `reloadAgentPackage` | Yes | Yes | Low | Keep local/rescan semantics in service validation. |
| `checkAgentPackageUpdates` | Yes | Yes | Medium | Name as update check and limit behavior to managed GitHub packages. |
| `updateAgentPackage` | Yes | Yes | Low | Reject local/default package ids. |
| `AgentPackage.updateInfo` | Yes | N/A | Medium | Keep as server-derived action/status state, not raw command policy. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Local package rescan | `Reload` | Yes | Low | Use existing user-approved term. |
| Managed GitHub package update | `Update` | Yes | Low | Show only when available. |
| Update status DTO | `AgentPackageUpdateInfo` | Yes | Medium | Do not use for unrelated local Git status. |
| GitHub metadata | `AgentPackageGitHubSourceMetadata` | Yes | Low | Keep GitHub-specific. |

## Applied Patterns (If Any)

- Transactional staging/rollback pattern inside the GitHub materializer for managed package replacement.
- Registry pattern remains in `AgentPackageRegistryStore` for persisted package lookup.
- Thin facade pattern remains in GraphQL resolver and UI store.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-packages/types.ts` | File | Agent Packages domain | Package source metadata/update types | Existing package type owner | UI-only strings |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | File | GitHub materializer | No-Git GitHub metadata/archive/staged replacement | Existing GitHub installer | Package lifecycle policy beyond materialization |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | File | Registry persistence | Persist/normalize package records with source metadata | Existing registry owner | GitHub HTTP calls |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | File | Package lifecycle | Reload/check/update orchestration and status mapping | Existing authoritative service | UI rendering/loading state |
| `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | File | GraphQL facade | Transport DTOs and mutations | Existing resolver file | Business policy |
| `autobyteus-web/graphql/agentPackages.ts` | File | Frontend GraphQL documents | Shared fragments and operations | Existing document owner | Component state |
| `autobyteus-web/stores/agentPackagesStore.ts` | File | Frontend package store | Store methods/action state/dependent frontend refresh | Existing Pinia owner | Filesystem/GitHub logic |
| `autobyteus-web/components/settings/AgentPackagesManager.vue` | File | Settings UI | Row statuses/actions | Existing UI owner | Package lifecycle policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-packages/services` | Main-Line Domain-Control | Yes | Low | Service already owns lifecycle. |
| `src/agent-packages/installers` | Off-Spine Concern | Yes | Medium | Name is import-oriented; acceptable if methods stay GitHub materialization. If file gets too large, extract `github-agent-package-materializer.ts`. |
| `src/agent-packages/stores` | Persistence-Provider | Yes | Low | Registry JSON persistence only. |
| `src/api/graphql/types` | Transport | Yes | Low | Resolver remains thin. |
| `autobyteus-web/components/settings` | UI | Yes | Low | Existing settings section manager. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Local row | `Status: Local folder` + `[Reload]` | `Status: Git repo update available` + `[Update]` | MVP intentionally avoids local Git/update complexity. |
| GitHub row with update | `Status: Update available` + primary `[Update]` | Always-visible `Update` button even when up to date | Keeps UI simple and avoids unnecessary action. |
| Managed GitHub update | `fetch sha -> download tarball for sha -> validate -> swap -> refresh` | `git pull` in app-managed directory | No packaged Git dependency. |
| Existing metadata | `installedRevision: null` means unknown, show `Update to latest` or check state | Keep separate old-record branch forever | Avoids compatibility-wrapper drift. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Preserve old GitHub records with no metadata path | Existing users have records without revision fields | Rejected as a separate path | Normalize all records into one target metadata shape with unknown revision. |
| Add local Git update while keeping local path reload | User asked if technically possible | Rejected for MVP | Local paths get `Reload` only. |
| Switch GitHub imports to `git clone` | Would make updates simple conceptually | Rejected | Continue public GitHub API + tarball replacement. |
| Frontend-only update/check | Faster UI patch | Rejected | Server owns package files/registry/cache refresh. |

## Derived Layering (If Useful)

- UI layer: `AgentPackagesManager.vue`.
- Frontend state/transport layer: `agentPackagesStore.ts`, `graphql/agentPackages.ts`.
- Server transport layer: `api/graphql/types/agent-packages.ts`.
- Domain lifecycle layer: `AgentPackageService`.
- Persistence/materialization mechanisms: registry/root settings stores and GitHub materializer.

## Migration / Refactor Sequence

1. Add backend types for GitHub source metadata and update info.
2. Extend registry store normalization so all records include target source metadata shape; existing GitHub records default to unknown metadata.
3. Extend GitHub materializer:
   - fetch repository metadata plus latest commit SHA,
   - build archive URL for a stable ref/SHA,
   - stage and validate a package archive,
   - replace an existing managed install with backup/rollback support.
4. Extend `AgentPackageService`:
   - map update info into `AgentPackage`,
   - add `reloadAgentPackage`,
   - add `checkAgentPackageUpdates`,
   - add `updateAgentPackage`,
   - keep import using the new metadata path so new imports record installed revision.
5. Extend GraphQL DTOs/mutations and regenerate/update frontend generated GraphQL types if required.
6. Extend frontend GraphQL fragments and Pinia store methods.
7. Extend `AgentPackagesManager.vue` with row status and minimal actions:
   - local path: `Reload`, `Remove`,
   - GitHub: `Update` only when available, optional `Check again`, `Remove`,
   - built-in: default badge only.
8. Update unit/component/e2e tests.
9. Remove any temporary branches or duplicated old record handling created during migration.

## Key Tradeoffs

- Git-free GitHub updates are less feature-rich than clone/pull but avoid packaging Git and match the existing public GitHub import model.
- Auto-checking GitHub rows improves visibility but can add network latency/rate-limit exposure. Prefer page-open check with loading state and safe error display; implementation can throttle by `lastCheckedAt` if needed.
- Returning the full package list from mutations matches existing import/remove store behavior but may be heavier than returning one row. Consistency is more valuable here.
- Local Git status is deferred to keep local paths simple and avoid implying AutoByteus can update user-owned folders.

## Risks

- GitHub API/codeload failures or rate limits can make status unavailable. UI must treat this as row-level failure, not page failure.
- Atomic directory replacement can fail on some platforms if files are locked. Rollback and error messages are required.
- Existing GitHub packages with unknown installed revision cannot know whether they are stale until checked or updated. UI should say unknown/update-to-latest, not falsely up-to-date.
- Cache refresh after update failure must not leave definitions empty if rollback succeeds.
- If application package scanning depends on separate application package registry only, frontend application refresh may not reflect agent package application count; do not expand this task into application package architecture unless tests expose a concrete defect.

## Guidance For Implementation

- Keep UI changes minimal; do not redesign the full settings page.
- Do not add `Details` unless needed for error/debug copy; it is not part of the MVP requirement.
- Prefer stable test IDs for new row actions, e.g. `agent-package-reload-button-${packageId}` and `agent-package-update-button-${packageId}` using safe encoding if needed.
- Add backend tests for:
  - existing GitHub record normalizes to unknown update metadata,
  - check marks up-to-date/update-available,
  - update success replaces managed package and refreshes caches,
  - update failure rolls back previous install,
  - local reload validates and refreshes without modifying folder,
  - non-GitHub update is rejected.
- Add frontend tests for:
  - local rows render `Reload`,
  - GitHub rows render `Update` only when update status is available,
  - clicking reload/update calls store methods and shows success,
  - duplicate import message is actionable.
