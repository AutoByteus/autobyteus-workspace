# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed initial bootstrap in dedicated worktree.
- Current Status: Requirements approved by user; design spec produced for architecture review.
- Investigation Goal: Understand current Agent Packages import/list/remove behavior for local and GitHub sources, determine where update status/actions should live, and propose the best UX/architecture direction.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The change likely spans frontend display/actions, backend package management commands, source metadata, remote status checks, package reload/reindex behavior, and tests.
- Scope Summary: Add/update UX and underlying source-aware package update support for app-managed GitHub imports and local Git-backed paths.
- Primary Questions To Resolve:
  - What files own package import/list/remove on the frontend?
  - What backend APIs and domain services own package import/storage?
  - Does package metadata retain source URL, branch/ref, local path, installed path, commit SHA, or status?
  - What update action is safest for app-managed GitHub imports?
  - How should local Git path update checks and actions be presented without silently mutating user-owned folders?

## Request Context

User reports that the Agent Packages frontend currently supports importing agent packages from a local folder or GitHub URL. Local folders are easy for advanced users because they can pull updates themselves. GitHub URL imports are installed into app-managed storage, and on another computer the user has no obvious way to update an already-imported GitHub package. User also suggested that local packages that are Git repositories could show whether upstream updates exist and optionally offer an update action.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-update-ux`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-update-ux/tickets/agent-package-update-ux`
- Current Branch: `codex/agent-package-update-ux`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-update-ux`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-05-21.
- Task Branch: `codex/agent-package-update-ux`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This is currently an analysis/design task. Do not implement until requirements are approved.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-21 | Command | `git remote show origin` | Resolve tracked remote default branch for bootstrap | Remote HEAD branch is `personal`. | No |
| 2026-05-21 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating task worktree | Completed successfully. | No |
| 2026-05-21 | Command | `git worktree add -b codex/agent-package-update-ux /Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-update-ux origin/personal` | Create dedicated task worktree/branch | Worktree created at latest `origin/personal` commit `aa58fabc`. | No |
| 2026-05-21 | Other | User request and screenshot | Capture observed product pain and current UI copy | UI says GitHub packages are installed into app-managed storage while local paths remain in place; visible package rows currently show source badges and Remove buttons only. | No |
| 2026-05-21 | Command | `rg -n "Agent Packages|agent package|agentPackage|agent_packages|package path|GitHub packages|Import Package|Local Path|github" autobyteus-web autobyteus-server-ts autobyteus-ts docs -S` | Find current package-management frontend/backend files | Found `AgentPackagesManager.vue`, `agentPackagesStore.ts`, `graphql/agentPackages.ts`, server GraphQL types, service, installer, registry store, tests, and mirrored application package code. | No |
| 2026-05-21 | Code | `autobyteus-web/components/settings/AgentPackagesManager.vue` | Inspect current Agent Packages UI owner | Lists rows, source label, source/path, `Remove`; import input detects GitHub URLs; no check/update/reload/details actions. | Yes |
| 2026-05-21 | Code | `autobyteus-web/stores/agentPackagesStore.ts` | Inspect frontend state/action owner | Store supports fetch/import/remove only; import/remove refresh applications, agent definitions, and agent teams. | Yes |
| 2026-05-21 | Code | `autobyteus-web/graphql/agentPackages.ts` | Inspect GraphQL operations available to frontend | Query/mutations expose list/import/remove fields only; no update status, update, reload, or details operation. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | Inspect server GraphQL schema owner | `AgentPackage` exposes package metadata/counts/removability; resolver has `agentPackages`, `importAgentPackage`, `removeAgentPackage` only. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Inspect backend package command owner | Service owns list/import/remove, maps source types, updates root settings and registry, refreshes agent/team caches after import/remove, removes managed GitHub dirs on remove. No update/reload. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | Inspect persisted package metadata | Records persist `packageId`, `rootPath`, `sourceKind`, `source`, `normalizedSource`, `managedInstallPath`, `createdAt`, `updatedAt`; no branch/SHA/checked status. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | Determine actual GitHub import mechanism | Installer fetches GitHub repo metadata, downloads default branch tarball through codeload, extracts/validates/renames into app-managed storage; it does not create a Git clone. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts` | Inspect normalized source identity | Supports public `github.com` URLs, normalizes owner/repo, derives install key, builds API/codeload URLs for default branch archive. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/agent-definition/providers/cached-agent-definition-provider.ts` | Check cache behavior after package content changes | Agent definitions use a full in-memory cache with explicit `refresh`; package content update must trigger refresh. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/agent-team-definition/providers/cached-agent-team-definition-provider.ts` | Check team cache behavior after package content changes | Agent teams use a full in-memory cache with explicit `refresh`; package content update must trigger refresh. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` and related application package UI/store/GraphQL files | Check mirrored package-management model | Application packages share local/GitHub import concepts and have an internal `reloadPackage` method, but GraphQL/UI do not expose package update. This suggests a future consistency concern. | Yes |
| 2026-05-21 | Code | `autobyteus-server-ts/tests/unit/agent-packages/agent-package-service.test.ts`, `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`, `autobyteus-web/components/settings/__tests__/AgentPackagesManager.spec.ts`, `autobyteus-web/stores/__tests__/agentPackagesStore.spec.ts` | Identify existing test shape | Existing tests cover local import, GitHub import duplicate detection, rollback on import/remove failures, UI import/remove behavior, and dependent catalog refresh after import/remove. New update/reload behavior needs parallel tests. | Yes |
| 2026-05-21 | Other | User conversation approval after simplified MVP discussion | Confirm requirement scope before design | User approved local-path `Reload` only and public GitHub URL `Update` when updates are available; ticket kickoff requested. | No |
| 2026-05-21 | Command | `git status --short --branch` | Verify dedicated worktree after requirements approval | Work remains on `codex/agent-package-update-ux` in `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-update-ux`; branch reports behind `origin/personal` by 3 after remote advanced. | Delivery refresh handles final integration; no design blocker. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Agent Packages settings page (`autobyteus-web/components/settings/AgentPackagesManager.vue`).
- Current execution flow:
  - UI loads packages on mount through `useAgentPackagesStore().fetchAgentPackages()`.
  - UI import normalizes `github.com/...` to `https://github.com/...` and labels it `GITHUB_REPOSITORY`; otherwise labels input `LOCAL_PATH`.
  - Store sends GraphQL `IMPORT_AGENT_PACKAGE` or `REMOVE_AGENT_PACKAGE` mutations.
  - Server GraphQL resolver calls `AgentPackageService`.
  - Local import validates a local package root, adds it to additional roots, writes a linked local registry record, and refreshes agent/team caches.
  - GitHub import normalizes the public GitHub repository source, checks duplicates, downloads the default branch tarball into app-managed storage, validates the extracted root, adds the managed install path as an additional root, writes a managed GitHub registry record, and refreshes agent/team caches.
  - Remove removes the additional root and registry record, refreshes caches, and deletes the app-managed directory if the package source is GitHub.
- Ownership or boundary observations:
  - `AgentPackageService` is the correct authoritative boundary for package lifecycle and cache refresh.
  - `GitHubAgentPackageInstaller` is an internal mechanism for materializing a GitHub repository into app-managed storage.
  - The frontend store is a command/query adapter and should not own filesystem, GitHub, Git, registry, or cache-refresh policy.
- Current behavior summary: The system can install and remove packages by source kind but does not represent source version, update status, update action, local Git status, or reload after external file changes.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant plus Boundary Or Ownership Issue
- Refactor posture evidence summary: Required behavior depends on a new package source state/update invariant. Adding only a frontend button would bypass server ownership and leave cache refresh, rollback, and registry metadata unsafely distributed. A small backend model expansion and command boundary are needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `AgentPackagesManager.vue` | Rows expose source type and remove only. | UX lacks update/reload state/action. | Add state/action UI after backend capabilities exist. |
| `agentPackagesStore.ts` | Store refreshes dependent catalogs after import/remove. | Update/reload should reuse the same refresh-dependent-catalog pattern. | Add store methods for check/update/reload. |
| `agent-packages.ts` GraphQL resolver | Only list/import/remove operations exist. | Frontend cannot perform update through an authoritative API. | Add check/update/reload operations or status query. |
| `AgentPackageService` | Owns registry/root changes and cache refresh. | Correct owner for update/reload transaction and rollback. | Extend service rather than adding a separate frontend/electron path. |
| `GitHubAgentPackageInstaller` | Downloads tarballs, does not clone. | Managed GitHub update should not be designed as `git pull`; it should fetch latest metadata/archive and replace atomically. | Add metadata/latest commit check and install/update support. |
| `AgentPackageRegistryStore` | No installed SHA/default branch/check status fields. | Cannot accurately say whether a managed GitHub package is stale. | Add persistent source-version metadata with migration for old records. |
| Cached providers | Definition/team catalogs are cached. | Package content update without cache refresh would leave stale UI/runtime definitions. | Update/reload commands must refresh caches. |
| Application packages code | Similar local/GitHub import model exists. | Risk of UX drift if agent/app package update experiences diverge. | Consider shared helper or follow-up parity. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/AgentPackagesManager.vue` | Agent Packages settings UI | List/import/remove only; direct strings for some copy; no details/check/update/reload. | Add source status display and actions here, driven by store state. |
| `autobyteus-web/stores/agentPackagesStore.ts` | Frontend state and GraphQL command/query adapter | Fetch/import/remove; refreshes dependent catalogs after mutations. | Add check/update/reload actions and per-package status state. |
| `autobyteus-web/graphql/agentPackages.ts` | Frontend GraphQL document owner for agent packages | No status/update/reload operations. | Extend fields/fragments to include package source state and commands. |
| `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | Server GraphQL schema/resolver for agent packages | Exposes list/import/remove only; does not expose managed path or source version metadata. | Add explicit status types and mutations/queries. |
| `autobyteus-server-ts/src/agent-packages/types.ts` | Backend package DTO/domain types | `AgentPackageRecord` lacks revision/status fields. | Extend with source-version metadata and result/status types. |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Authoritative agent package lifecycle owner | Correct place for update/reload transactions, rollback, registry updates, and cache refresh. | Extend service; do not bypass from UI. |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | GitHub archive materialization into app-managed storage | Uses GitHub API plus codeload tarball; not a clone. | Add or pair with updater that can fetch latest SHA, download staging archive, and replace managed dir safely. |
| `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | JSON registry persistence for package records | Persisted metadata insufficient for update availability. | Add persisted installed commit/default branch/last checked fields. |
| `autobyteus-server-ts/src/application-packages/services/application-package-registry-service.ts` | Application package lifecycle owner | Similar source model; has internal reload method. | Keep UX/design compatible; possible shared source-state helper. |
| `autobyteus-server-ts/tests/unit/agent-packages/agent-package-service.test.ts` | Unit tests for service behavior | Existing rollback patterns for import/remove are relevant to update rollback. | Add update success/failure/rollback/cache tests. |
| `autobyteus-web/components/settings/__tests__/AgentPackagesManager.spec.ts` | UI tests | Current tests cover import/remove only. | Add status/action rendering and click tests. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-21 | Code trace | Static trace through Agent Packages UI/store/GraphQL/service/installer | No executable app repro was needed to establish missing update surface; code confirms the screenshot behavior. | Requirements can be drafted without running the UI. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used beyond existing code's GitHub API/codeload URL behavior.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: Current code uses GitHub REST repository metadata and codeload default-branch tarball URLs.
- Why it matters: Update implementation should be compatible with the current no-git-dependency import model.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for analysis. Implementation validation will need mocked installer/GitHub API and optionally local temp Git repos.
- Required config, feature flags, env vars, or accounts: Existing tests use temp roots and `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` for package roots.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The current product model distinguishes app-managed GitHub packages from user-owned local paths, but that distinction is not carried into update behavior.
2. App-managed GitHub packages are tarball installs, so update should be `fetch latest metadata -> download archive to staging -> validate -> atomic replace -> registry update -> cache refresh`, not `git pull`.
3. Local packages need at least a `Reload` button because users can change files externally and the server caches definitions/teams.
4. Optional local Git update checks should be non-mutating and explicit because local folders are user-owned.
5. The service already has rollback patterns for import/remove; update should follow that transaction style.
6. Application Packages mirror the same source concepts and should not drift indefinitely from Agent Packages UX.

## Constraints / Dependencies / Compatibility Facts

- GitHub imports are app-managed; local path imports remain user-owned.
- Existing managed GitHub directories may not contain `.git` metadata.
- Existing registry records do not have installed commit/default branch; they need a clear `unknown` state/migration.
- GitHub public API/codeload access may fail; UI must show failures without corrupting existing packages.
- Local Git checks depend on `git` availability if implemented through Git CLI; absence must degrade gracefully.
- Agent/team caches are in-memory and require explicit refresh after file changes.

## Clarified UX Direction From User Follow-Up

- The preferred managed GitHub UX should stay simple: if a package has an update, show an `Update` button; clicking it should update and reload/rescan automatically.
- This can be done without packaging Git because the managed GitHub path can continue using GitHub metadata plus tarball download/replace.
- For local paths that are GitHub repositories, best-effort update detection is possible without Git by reading `.git` metadata and querying GitHub, but actual safe update of a user-owned local folder is not recommended without Git or a deliberate JS Git implementation.
- Therefore the MVP recommendation is: managed GitHub packages get `Update`; local packages get `Reload`; local GitHub paths may get `Remote update available` guidance but not a primary app-managed `Update` button.
- Private repositories are safe in the local-path flow because AutoByteus can rescan files already on disk without GitHub credentials. Remote update detection for private repositories should degrade to `status unavailable/manual pull` unless an authenticated-source feature is added later. Direct private GitHub URL import remains out of scope for the unauthenticated public-GitHub tarball updater.


## Final MVP Direction From User Clarification

- Local-path packages are intentionally simple: show `Reload` only. No local Git status detection, no local pull/update, and no distinction between public/private local repositories in the MVP.
- Public GitHub URL imports are app-managed and public-only. They should expose `Update` when remote changes are available.
- The GitHub update implementation should not require packaging Git; continue using GitHub metadata plus tarball download/validate/replace.
- Private GitHub repositories should be handled by cloning locally outside AutoByteus, importing the local path, and using `Reload` after the user updates that folder.

## Open Unknowns / Risks

- Whether first implementation should include local Git status detection, or defer local Git awareness to a follow-up and ship only local `Reload` plus managed GitHub `Update`.
- Whether update checks should be automatic on page open or explicit to avoid network latency/rate-limit issues.
- Whether branch/tag pinning should be introduced now or later.
- Whether Application Packages parity should be included now or follow Agent Packages.
- Whether the UI should expose revision SHAs inline or only in details.

## Notes For Architect Reviewer

If this proceeds to implementation, architecture review should focus on preserving `AgentPackageService` as the authoritative package lifecycle boundary, keeping `GitHubAgentPackageInstaller` or a new updater as an internal mechanism, avoiding frontend filesystem/Git bypasses, and designing the package source state shape so it can be reused for Application Packages without duplicating policy.
