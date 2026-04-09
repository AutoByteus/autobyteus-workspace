# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Current`
- Investigation Goal:
  - Understand the current package-root registration model, the package discovery/runtime consequences of that model, the frontend naming and interaction constraints, and the cleanest architecture for direct GitHub repository import into managed internal storage.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale:
  - The change crosses server package registration, GraphQL/API boundaries, managed storage, download/import mechanics, settings UX, and tests.
  - The request still stays bounded to the agent-package management slice and does not require a broader agent/team authoring redesign.
- Scope Summary:
  - Replace the path-only `Agent Package Roots` management UX with a package-oriented management surface that still supports local package paths and additionally supports direct public GitHub repository import into app-managed storage.
- Primary Questions To Resolve:
  - Which subsystem should own package import/install behavior versus plain root registration?
  - Should the product/API boundary stay `agent package root`, or should it move to `agent package` while keeping root paths as an internal runtime detail?
  - What internal storage layout should hold GitHub-imported packages so discovery, removal, and duplicate handling stay clean?
  - How should package listing, identity, duplicate detection, and removal work when some packages are external references and others are app-managed installs?
  - What GitHub retrieval method best fits the current runtime: system `git`, direct source archive download, or some hybrid?

## Request Context

- User request summary:
  - Support pasting a GitHub link directly instead of requiring the user to clone/download manually.
  - Download the referenced package into the internal area where the product stores agents and agent teams.
  - Remove `roots` wording from the frontend because it is ugly and too implementation-specific; the user wants the product to talk about `Agent Package` / `Agent Packages`.
  - Run the software engineering workflow and stop after the design is completed and reviewed.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-agent-package-import`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-agent-package-import/tickets/done/github-agent-package-import`
- Current Branch: `codex/github-agent-package-import`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-agent-package-import`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on `2026-04-09`
- Task Branch: `codex/github-agent-package-import`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `origin/personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents:
  - Stop after Stage 5 design review.
  - No source-code edits are allowed in this turn because the workflow lock remains in effect.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-09 | Command | `git rev-parse --is-inside-work-tree && git branch --show-current && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Resolve repo/bootstrap context | Repo is git-based and `origin/personal` is the tracked default base | No |
| 2026-04-09 | Command | `git worktree list`, `git fetch origin personal`, `git worktree add -b codex/github-agent-package-import ... origin/personal` | Create the dedicated ticket worktree and branch required by the workflow | Dedicated worktree/branch created successfully from refreshed remote state | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts` | Inspect current package registration ownership | Current service is path-only; it validates absolute directories, updates `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, and refreshes definition caches | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts`, `autobyteus-web/graphql/agentPackageRoots.ts`, `autobyteus-web/stores/agentPackageRootsStore.ts` | Trace current API/store boundary | Current GraphQL and store contract is `path`-based and mirrors the root-registration model directly into the web app | No |
| 2026-04-09 | Code | `autobyteus-web/components/settings/AgentPackageRootsManager.vue`, `autobyteus-web/pages/settings.vue` | Inspect current frontend wording and interaction model | Current UI repeatedly exposes `Agent Package Roots`, uses a single absolute-path input, and lists raw filesystem paths as the main user-facing value | No |
| 2026-04-09 | Code | `autobyteus-web/components/settings/__tests__/AgentPackageRootsManager.spec.ts`, `autobyteus-web/pages/__tests__/settings.spec.ts` | Confirm current web contract expectations | Web tests encode `Agent Package Roots` copy, path-based add/remove behavior, and the `agent-package-roots` settings route id | No |
| 2026-04-09 | Code | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-roots-graphql.e2e.test.ts` | Confirm current server behavior and explicit rejection cases | Existing e2e tests explicitly reject URL-like inputs and assert that added roots remain registration-only with files left in place | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/config/app-config.ts`, `autobyteus-web/electron/server/services/AppDataService.ts` | Identify default storage roots and app-owned runtime directories | Desktop app data lives under `.../server-data`; default agent/team discovery uses `appDataDir`, while additional package roots come from `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts`, `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts`, `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Check how additional package roots affect the wider system | Discovery already treats every additional package as a normal local directory root containing `agents/` and/or `agent-teams/`; if GitHub imports materialize into a valid local root, existing discovery can reuse it directly | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts`, `autobyteus-web/electron/extensions/managedExtensionService.ts` | Find an existing app-owned download/install pattern | The codebase already has a strong pattern for managed downloads into app data with cached artifacts, install roots, and persisted registry/state metadata | No |
| 2026-04-09 | Code | `autobyteus-server-ts/src/utils/download-utils.ts`, `autobyteus-server-ts/src/utils/downloader.ts` | Check reusable low-level download primitives | Server already has generic HTTP download helpers, but not a package-specific installer or registry layer | No |
| 2026-04-09 | Command | `rg -n "\"tar\"|\"adm-zip\"|\"unzipper\"|\"decompress\"|\"simple-git\"|\"isomorphic-git\"" autobyteus-server-ts/package.json autobyteus-web/package.json package.json pnpm-lock.yaml autobyteus-web/pnpm-lock.yaml` | Check current runtime/tooling assumptions for GitHub import | Server package does not currently depend on an archive-extraction or git library; web package depends on `tar`, which should not be pulled across the web/server boundary casually | No |
| 2026-04-09 | Web | GitHub Docs: `Downloading source code archives` and `REST API endpoints for repositories` | Verify GitHub-supported archive and metadata shapes before selecting an import strategy | GitHub documents stable source archive URLs for branches/tags/commits and the repository API exposes repository metadata and `archive_url`; this supports an archive-download design without requiring a local git clone | No |
| 2026-04-09 | Doc | `tickets/done/agent-team-local-member-import-analysis/requirements.md`, `tickets/done/agent-team-local-member-import-analysis/proposed-design.md` | Reuse prior package-root analysis context | Earlier work intentionally elevated `Agent Package Root` as the canonical term, but this new request reopens the product/API boundary because the surface now manages imported packages, not only raw roots | No |

## Current Behavior / Current Flow

### Entrypoints And Boundaries

- Primary user-facing entrypoint:
  - `autobyteus-web/components/settings/AgentPackageRootsManager.vue`
- Current API boundary:
  - GraphQL `agentPackageRoots`, `addAgentPackageRoot(path)`, `removeAgentPackageRoot(path)`
- Current server owner:
  - `AgentPackageRootService`
- Current runtime/discovery consumers:
  - agent discovery,
  - team discovery,
  - skill discovery.

### Current Execution Flow

- Current list flow:
  - `Settings UI -> agentPackageRoots store -> GraphQL query -> AgentPackageRootService.listAgentPackageRoots() -> appConfig.getAppDataDir() + getAdditionalAgentPackageRoots() -> path-based summary counts`
- Current add flow:
  - `Settings UI path input -> GraphQL addAgentPackageRoot(path) -> AgentPackageRootService.addAgentPackageRoot(path) -> absolute directory validation -> update AUTOBYTEUS_AGENT_PACKAGE_ROOTS -> refresh agent/team caches`
- Current remove flow:
  - `Settings UI remove(path) -> GraphQL removeAgentPackageRoot(path) -> AgentPackageRootService.removeAgentPackageRoot(path) -> remove path from AUTOBYTEUS_AGENT_PACKAGE_ROOTS -> refresh agent/team caches`
- Current downstream discovery flow:
  - `appConfig.getAppDataDir() + AUTOBYTEUS_AGENT_PACKAGE_ROOTS paths -> FileAgentDefinitionProvider / FileAgentTeamDefinitionProvider / skill-discovery -> agents and teams become visible`

### Ownership Or Boundary Observations

- The current service owns raw readable-root registration, not package installation or source provenance.
- The GraphQL and frontend contracts expose the same root-centric shape without a richer package abstraction.
- Discovery already consumes local package roots cleanly, which means a future GitHub import should end by materializing a local validated package root rather than creating a separate discovery mode.
- There is currently no durable package metadata store for:
  - source kind,
  - source URL,
  - managed-install lifecycle,
  - duplicate detection identity,
  - removal semantics beyond raw path removal.

### Current Behavior Summary

- Local filesystem package roots are supported today.
- URL-like inputs are intentionally rejected.
- Added paths are registration-only: files remain where they already are.
- The UI exposes infrastructure details that are useful internally (`root path`) but not aligned with the product intent the user described (`agent package import`).

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts` | Validate/list/add/remove package roots | Owns the current path-based product contract; no source-kind or managed-install model exists | Main current owner, but too narrow to remain the final UX/API owner once GitHub imports exist |
| `autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts` | Package-root GraphQL boundary | Query/mutations are named and shaped around root paths | API boundary should likely move to package-oriented naming and identifiers |
| `autobyteus-web/stores/agentPackageRootsStore.ts` | Package-root store | Current store mirrors the path-only GraphQL contract exactly | Store should become package-oriented and stop using raw path as the primary user-action identity |
| `autobyteus-web/components/settings/AgentPackageRootsManager.vue` | Settings UI | Single text input assumes absolute path; success messages and list rows are root/path centered | UI needs both naming cleanup and interaction redesign |
| `autobyteus-web/pages/settings.vue` | Settings navigation and section routing | User-facing nav label and route section use `Agent Package Roots` / `agent-package-roots` | Frontend product naming likely needs a clean cut to `Agent Packages` / `agent-packages` |
| `autobyteus-server-ts/src/config/app-config.ts` | Default app data + additional package root configuration | Additional package roots are stored as a comma-separated env-backed path list | Existing config can still remain the low-level runtime root list, but it cannot by itself represent package provenance or managed-install metadata |
| `autobyteus-web/electron/server/services/AppDataService.ts` | Desktop app app-data ownership | Desktop-managed server data root is `.../server-data` | GitHub-installed packages can live safely under app data without colliding with current default discovery so long as they are installed into a separate subdirectory and registered as additional roots |
| `autobyteus-server-ts/src/agent-definition/providers/file-agent-definition-provider.ts` | Shared/team-local agent discovery and write routing | Already reads additional package roots as local directories and writes in place when source paths are writable | Managed GitHub packages can reuse current discovery/edit flows if their installed root is writable |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | Team discovery and write routing | Same root-based discovery assumption as agents | Managed GitHub packages can reuse team flows without a special team-discovery branch |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Bundled skill discovery from package roots | Also uses the same root list | One installed local root is enough to make imported GitHub package skills discoverable |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/messaging-gateway-installer-service.ts` | App-owned managed download/install | Uses app-data-managed roots, download cache, checksum/verification, extraction, and install directories | Strong existing install-owner pattern to reuse conceptually for GitHub package import |
| `autobyteus-web/electron/extensions/managedExtensionService.ts` | App-owned extension registry/state | Uses persisted registry metadata keyed by logical install identity rather than raw paths alone | Good precedent for a structured package metadata registry separate from runtime path usage |
| `autobyteus-server-ts/src/utils/download-utils.ts` | Generic server-side file download | Reusable low-level primitive but not an owner of package install policy | Should stay off the main package-import spine as a helper primitive |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-09 | Probe | Read `agent-package-roots-graphql.e2e.test.ts` invalid-input test | Current e2e contract explicitly treats GitHub URLs as invalid because the add mutation requires an absolute path | GitHub import must be a deliberate contract redesign, not a lenient validation tweak |
| 2026-04-09 | Probe | Read `AppDataService.ts` and `app-config.ts` | Default package storage is app-owned `server-data`; additional roots are discrete extra directories | GitHub package installs should be stored inside app data but not flattened directly into the default `agents/` and `agent-teams/` folders |
| 2026-04-09 | Probe | Read `file-agent-definition-provider.ts`, `file-agent-team-definition-provider.ts`, `skill-discovery.ts` | Additional package roots already participate uniformly in discovery | Import design should end in a normal local root and reuse current discovery instead of inventing a separate GitHub-aware discovery code path |
| 2026-04-09 | Probe | Read `messaging-gateway-installer-service.ts` and `managedExtensionService.ts` | The codebase already models app-owned downloads with dedicated install roots, download cache, persisted metadata, and managed removal behavior | GitHub package import should reuse this ownership shape instead of treating the settings page as the installer |
| 2026-04-09 | Probe | Dependency search for archive/git libraries | Server currently lacks a first-class archive-extraction or git dependency | The design should avoid assuming a preinstalled git executable and should make archive extraction an explicit server-owned concern if needed |

## External / Public Source Findings

- Public API / spec / issue / upstream source:
  - GitHub Docs: `Downloading source code archives`
  - GitHub Docs: `REST API endpoints for repositories`
- Version / tag / commit / freshness:
  - Docs pages crawled in April 2026
- Relevant contract, behavior, or constraint learned:
  - GitHub documents source archive URLs for branches, tags, and commits, and notes that branch/tag archives can move while commit archives are content-stable.
  - GitHub’s repository API response includes repository metadata and an `archive_url` template that can be used to derive download URLs.
- Why it matters:
  - The product can support public GitHub import through archive download plus extraction without depending on a user-installed git toolchain.
  - If the design wants deterministic package identity later, it can pin a resolved commit; for the initial import UX, repository-root import against the current default branch is viable.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures:
  - None yet
- Required config, feature flags, env vars, or accounts:
  - None yet
- External repos, samples, or artifacts cloned/downloaded for investigation:
  - None yet
- Setup commands that materially affected the investigation:
  - `git fetch origin personal`
  - `git worktree add -b codex/github-agent-package-import /Users/normy/autobyteus_org/autobyteus-worktrees/github-agent-package-import origin/personal`
- Cleanup notes for temporary investigation-only setup:
  - Dedicated worktree exists at `/Users/normy/autobyteus_org/autobyteus-worktrees/github-agent-package-import`

## Findings From Code / Docs / Data / Logs

- Current naming and current behavior are tightly coupled because the product/API boundary is literally a root-path management surface.
- Adding GitHub import cleanly requires richer persisted metadata than the current env-backed comma-separated path list can represent on its own.
- The existing discovery architecture is actually favorable: once a valid package root exists locally, agent/team/skill discovery already knows what to do.
- The codebase already contains a better ownership pattern for managed downloads:
  - one authoritative service owns install lifecycle,
  - low-level download helpers stay off-spine,
  - app data stores both install artifacts and registry metadata.
- The frontend request to remove `roots` wording is not just cosmetic. Once the feature manages both:
  - external local package references, and
  - managed GitHub-installed packages,
  the user-facing entity is broader than a raw root path.

## Constraints / Dependencies / Compatibility Facts

- Current persisted additional-root config is `AUTOBYTEUS_AGENT_PACKAGE_ROOTS` as a comma-separated path list.
- Current downstream discovery expects readable local directories containing `agents/` and/or `agent-teams/`.
- Current package-root APIs use raw `path` as both input and removal identity.
- Existing users or automation may already rely on the current additional-root setting.
- The server package does not currently ship an archive extraction dependency, so archive install mechanics need explicit ownership and packaging if chosen.
- The request explicitly stops at design; implementation, migration, and test execution are downstream work.

## Open Unknowns / Risks

- Unknown:
  - Should the clean cut rename extend through GraphQL/store/component/route ids, or should some internal root-oriented ids remain hidden behind frontend-only label changes?
  - Why it matters:
    - The user asked specifically for frontend cleanup, but GitHub import also makes the product/API boundary less root-centric.
- Unknown:
  - Should duplicate GitHub import of the same normalized repository URL be rejected, reused, or treated as a refresh?
  - Why it matters:
    - Managed packages can become user-edited after import, so silent refresh could destroy user changes.
- Unknown:
  - Which GitHub URL shapes should be accepted in v1?
  - Why it matters:
    - Repository-root URLs are straightforward, but users may paste `.git`, `tree/branch`, or `blob` URLs copied from the browser.
- Unknown:
  - How much source metadata should the settings UI expose?
  - Why it matters:
    - Raw paths are useful for debugging, but path-first presentation is exactly what the user dislikes.

## Notes For Architect Designer

- Model GitHub import as a managed package-install path that ends in a normal local package root.
- Keep download/archive helpers off the main line; one package-management owner should govern validation, install/remove lifecycle, metadata persistence, and cache refresh.
- Make the user-facing/package-management boundary package-oriented, not raw-root-oriented.
- Be explicit about which low-level concept, if any, still remains a `root` after the rename and which callers are allowed to care about it.
