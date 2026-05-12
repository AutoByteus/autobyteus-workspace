# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete`
- Current Status: `Design-impact re-entry complete; requirements/design refined for install-once CLI primary flow`
- Investigation Goal: Understand the current Docker start/release scripts, documentation, released image assumptions, and Electron Settings/Nodes note surface so a source-repo-free install-once end-user start experience can be designed.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`
- Scope Classification Rationale: The change likely crosses Docker distribution scripts/docs and Electron Settings/Nodes UI, but does not require server runtime changes.
- Scope Summary: Make server Docker startup discoverable and executable by packaged-app users without requiring a source checkout, using install-once public launcher guidance as the primary flow.
- Primary Questions To Resolve:
  - Where is the current Docker start script and what does it do? `Resolved`
  - What Docker start commands are documented today, including multiple-container/multi-node usage? `Resolved`
  - How are server Docker images published and tagged today? `Resolved`
  - Where does the Electron app render Settings/Nodes notes and how are those notes configured? `Resolved`
  - Should the target solution be hosted script, bundled script, generated command copy, or a combination? `Resolved: hosted public launcher plus installed local CLI primary; one-shot raw execution secondary/advanced`

## Request Context

The user reports that maintainers can conveniently start/release server Docker from a source-tree script, but packaged Electron app users do not have the source code and therefore do not discover or run that script. The user asks for ways to make Docker startup easier, comparing to `curl`-based installers or downloadable batch scripts, and suggests surfacing commands in the application Settings/Nodes notes. Follow-up clarification: the public script should not expose the developer `--project second-node` concept; it should let users start one or multiple released server containers with automatic names and ports. Downstream implementation/review clarification on 2026-05-12 further refined the UX: repeated-use commands should not re-download the script every time. The primary public flow is now install-once plus direct `autobyteus-docker ...` commands, with raw one-shot execution demoted to advanced/temporary usage.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/in-progress/docker-end-user-start-flow`
- Current Branch: `codex/docker-end-user-start-flow`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-05-12.
- Task Branch: `codex/docker-end-user-start-flow`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: `None`
- Notes For Downstream Agents: The original shared checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is branch `personal`; authoritative artifacts and future source changes should remain in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-12 | Command | `pwd`, `ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Resolve initial workspace and repo context | Superrepo contains Docker, server, web, and ticket folders. | No |
| 2026-05-12 | Command | `git status --short --branch`, `git remote -v`, `git branch -vv --all`, `git worktree list --porcelain` | Discover current branch/worktree/remotes and existing task worktrees | Initial checkout was `personal` tracking `origin/personal`; many existing codex worktrees; no matching task worktree. | No |
| 2026-05-12 | Command | `git fetch origin --prune` | Refresh tracked remote refs before creating ticket worktree | Fetch succeeded; `origin/HEAD` is `origin/personal`. | No |
| 2026-05-12 | Command | `git worktree add -b codex/docker-end-user-start-flow /Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow origin/personal` | Create dedicated task worktree/branch per workflow | Worktree created at `be56cab9` from latest `origin/personal`. | No |
| 2026-05-12 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/SKILL.md` | Follow solution-designer workflow | Requires bootstrap artifacts before deep investigation and design spec after requirements approval. | No |
| 2026-05-12 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Load shared design authority | Use spine/ownership model, no boundary bypass, no compatibility wrappers. | No |
| 2026-05-12 | Command | `find . -iname '*docker*'`; `rg -n "docker|Docker|compose|start-docker|Docker Hub|autobyteus-server" ...` | Locate Docker scripts/docs/workflows and related ticket history | Found `autobyteus-server-ts/docker/docker-start.sh`, root docs, server Docker docs, release workflow, all-in-one personal Docker assets. | No |
| 2026-05-12 | Doc | `README.md` sections `Run The Published Server Docker`, `All-in-one Docker startup`, `Release workflow` | Understand current user docs and release facts | Docs already provide direct `docker run`; source checkout helper documented separately; release workflow publishes server Docker tags. | No |
| 2026-05-12 | Doc | `autobyteus-server-ts/docker/README.md` | Understand server Docker quick start and helper commands | Published image direct `docker run` documented; source helper supports variants, remote pull, multiple projects, management commands, auth persistence, endpoints. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/docker/docker-start.sh` | Inspect maintainer helper behavior | Bash source-tree script manages `up/down/ps/logs/ports`, project normalization, random port allocation, `.runtime/<project>.env`, `--pull-remote`, variants, and compose lifecycle. | No |
| 2026-05-12 | Code | `autobyteus-server-ts/docker/docker-compose.yml` | Inspect runtime options required to run server image | Compose config maps backend/VNC/noVNC/debug ports, sets server/data/env defaults, persists workspace/data/root volumes, uses local alias image and monorepo build path. | No |
| 2026-05-12 | Code | `.github/workflows/release-server-docker.yml` | Understand image publishing/tagging | Push tags `v*` and manual dispatch build/push multi-arch image to Docker Hub. Stable default publishes version + `latest`; prerelease omits `latest`; manual can publish `zh`. | No |
| 2026-05-12 | Code | `autobyteus-web/pages/settings.vue` | Find Settings → Nodes route/component | Settings sidebar includes `nodes`; content renders `<NodeManager v-if="activeSection === 'nodes'" />`. | No |
| 2026-05-12 | Code | `autobyteus-web/components/settings/NodeManager.vue` | Inspect current Nodes surface | NodeManager shows current node, remote browser sharing, add remote node, full sync, configured nodes. No Docker-start guidance exists today. | No |
| 2026-05-12 | Code | `autobyteus-web/stores/nodeStore.ts`, `autobyteus-web/electron/nodeRegistryStore.ts`, `autobyteus-web/types/node.ts` | Understand node ownership/boundary | Node registry stores node profiles with baseUrl/type/capabilities; app owns remote node registration, not external Docker lifecycle. | No |
| 2026-05-12 | Code | `autobyteus-web/utils/nodeHostValidation.ts`, `autobyteus-web/utils/nodeCapabilityProbe.ts` | Understand add-node validation | Add node normalizes host, warns for loopback/plain HTTP, probes `/health`; this can remain the next step after external Docker startup. | No |
| 2026-05-12 | Code | `autobyteus-web/localization/messages/en/settings.ts`, `autobyteus-web/localization/messages/en/settings.generated.ts`, `autobyteus-web/scripts/guard-localization-boundary.mjs`, `autobyteus-web/scripts/audit-localization-literals.mjs` | Confirm UI copy constraints | Settings strings live in catalogs; localization guard forbids raw vue-i18n and direct messages imports; product literals are audited. | No |
| 2026-05-12 | Code | `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | Understand existing NodeManager test style | Component tests mock stores/probe/validation and can be extended for a Docker guidance card. | No |
| 2026-05-12 | Code | `autobyteus-web/build/scripts/build.ts` | Check Electron packaging resources | App packages renderer/server/icons resources; not needed for a raw-URL launcher, but bundled resources are available if future one-click/local asset route is chosen. | No |
| 2026-05-12 | Command | `git remote get-url origin` | Derive public repository URL shape for tag-pinned raw script option | Remote maps to GitHub repo `AutoByteus/autobyteus-workspace`; raw URLs can be derived if repo is public. | Confirm public hosting if needed |
| 2026-05-12 | Command | `find scripts -maxdepth 2 -type f` | Inspect root script folder organization | Root `scripts/` already contains release, Docker secret setup, Android, seed/sync, and helper scripts; user-facing scripts should use a subfolder to avoid flat-folder growth. | No |
| 2026-05-12 | Other | User approval and clarification in chat | Confirm refined requirements before design | User approved kicking off the ticket; confirmed Settings → Nodes should show copyable commands and public launcher should help users/developers start Docker containers. | No |
| 2026-05-12 | Other | User clarified CLI semantics in chat | Resolve whether extra-node command should require a flag | Decision: plain `start` should be the default/idempotent command, while extra containers should use `start --new`; the user found `start another` awkward and preferred the `--new` flag. | No |
| 2026-05-12 | Other | Design Impact reroute from `implementation_engineer` | Resolve repeated-use UX after initial implementation used raw one-shot commands as primary examples | User expectation is Anaconda-like install-once flow: install/download launcher once, then run `autobyteus-docker start`, `autobyteus-docker start --new`, `autobyteus-docker urls`, etc. directly. This changes Settings/docs command catalog shape and installer/PATH requirements. | Refine requirements/design and route back through architecture review |
| 2026-05-12 | Other | User clarification in chat after rework handoff | Resolve launcher-script update vs Docker-container update semantics | User agreed `update` should update the script itself. Server Docker image/container refresh belongs to `start`: check/pull image; if no new image, keep/start existing container; if image changed, remove/recreate managed container from new image and start it. | Record in requirements/design and notify architecture reviewer |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - For repo users: `autobyteus-server-ts/docker/docker-start.sh`.
  - For no-clone users: long direct `docker run` command in `README.md` / `autobyteus-server-ts/docker/README.md`.
  - For app users: Settings → Nodes only helps after the server already exists (`Add Remote Node`).
- Current execution flow:
  - Source checkout flow: user enters repo docker folder → runs `./docker-start.sh up --pull-remote` → script pulls/retags Docker Hub image or builds local image → Docker Compose starts container → script prints endpoints → user can add/focus node in app separately. Multiple instances use developer-facing `--project` naming.
  - No-clone doc flow: user copies long `docker run` command → fixed ports/volumes are used → user manually stops via `docker stop autobyteus-server`.
  - App flow: user opens Settings → Nodes → enters name/base URL → app validates/probes → app persists remote node and optionally bootstraps sync.
- Ownership or boundary observations:
  - `docker-start.sh` owns source-checkout Docker lifecycle, including multi-instance and port allocation.
  - NodeManager/node registry owns app-level node registration and sync; it should not secretly own Docker lifecycle execution.
  - Current no-clone docs duplicate a subset of Docker lifecycle policy as a static `docker run` command.
- Current behavior summary:
  - The robust lifecycle script exists, but only at a source-tree boundary. Packaged users can use Docker only if they find and adapt docs manually.

## Design-Impact Re-entry Findings (2026-05-12)

- Downstream implementation correctly identified a requirement gap: making `curl -fsSL <raw>/autobyteus-docker.sh | bash -s -- start` the primary command is source-repo-free, but still inconvenient for normal repeated use because it downloads/evaluates the launcher every time.
- Refined primary UX: Settings/docs should show an install command first, then direct local commands:
  - macOS/Linux install: `curl -fsSL <raw>/autobyteus-docker.sh | bash -s -- install`.
  - Windows install: `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <raw>/autobyteus-docker.ps1 | iex; autobyteus-docker install"`.
  - Repeated commands: `autobyteus-docker start`, `autobyteus-docker start --new`, `autobyteus-docker urls`, `autobyteus-docker status`, `autobyteus-docker logs`, `autobyteus-docker stop`.
- Install destination design:
  - macOS/Linux defaults to `${AUTOBYTEUS_DOCKER_INSTALL_DIR:-$HOME/.local/bin}/autobyteus-docker`; installer reports path and prints PATH/direct-path guidance when needed.
  - Windows defaults to `${env:AUTOBYTEUS_DOCKER_INSTALL_DIR}` or `%LOCALAPPDATA%\AutoByteus\bin`; installer writes a PowerShell launcher and command shim and reports/reconciles User PATH guidance without admin/Machine PATH changes.
- Install/update scope: `install` is idempotent and can be rerun to update/reinstall; an explicit `update` alias is allowed. Full uninstall and Docker data cleanup are out of scope except manual notes.
- Update semantics clarification: `autobyteus-docker update` updates only the installed launcher script. Docker server image/container refresh belongs to `autobyteus-docker start`, which should check/pull the configured image, avoid recreation when unchanged, and stop/remove/recreate the managed container when the image changed while preserving volumes/runtime state/friendly identity and ports where possible.
- Boundary implication: installer/PATH behavior belongs in the public launcher, not in the Vue component or node registry. The frontend command catalog only displays the correct command strings and grouping.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Feature`
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`
- Refactor posture evidence summary: A small boundary extraction is needed: create an end-user launcher boundary independent of the source checkout, and make app/docs depend on that boundary instead of duplicating source-tree script internals.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User request | Existing start script is source-tree-only and not discoverable for packaged-app users | Distribution boundary is wrong for end-user startup | Design standalone launcher + app guidance |
| `docker-start.sh` | Useful lifecycle policy is coupled to source files and `.runtime` under repo docker folder; its `--project` vocabulary is developer-facing | Cannot just paste this script path or terminology into packaged app instructions | Extract/source-repo-free launcher needed with user-facing node/container naming |
| Root/server Docker docs | Direct `docker run` is no-clone but long, fixed-port, and less capable than helper | Current user path is documented but not easy enough and duplicates launch policy | Make launcher primary docs path |
| NodeManager | Correct place to add/focus remote nodes, but no server-start guidance | UI should guide users before Add Remote Node without owning Docker process control | Add guidance card |
| Release workflow | Docker image tags align with desktop release tags for stable releases | App can construct version-aware commands | Design command composer |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/docker-start.sh` | Source-checkout server Docker lifecycle helper | Rich lifecycle commands and port management, but depends on source checkout | Keep as developer helper; do not require packaged users to run it |
| `autobyteus-server-ts/docker/docker-compose.yml` | Source compose definition for server image/build | Encodes ports, env vars, volumes, restart policy | Standalone launcher can generate equivalent compose/run state outside repo |
| `.github/workflows/release-server-docker.yml` | Server Docker release image build/publish | Publishes version and latest image tags | Launcher should default to those image names/tags |
| `README.md` | Root setup/release docs | Direct no-clone docker run plus source helper documented | Update no-clone path to launcher-first |
| `autobyteus-server-ts/docker/README.md` | Server Docker docs | Documents direct docker run and source helper | Update to distinguish end-user launcher vs repo helper |
| `autobyteus-web/pages/settings.vue` | Settings page section routing | Nodes section renders `NodeManager` | No page-level structural change needed |
| `autobyteus-web/components/settings/NodeManager.vue` | Node management UI | Adds/probes remote nodes, syncs, lists nodes | Add Docker guidance card here or as extracted child component |
| `autobyteus-web/stores/nodeStore.ts` | Renderer node registry state/actions | Persists node metadata through Electron/localStorage | No schema change needed |
| `autobyteus-web/electron/nodeRegistryStore.ts` | Electron node registry persistence/sanitization | Stores node registry file in user data | No change needed |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Settings localization catalogs | User-facing settings strings should be here | New card copy must be localized |
| `autobyteus-web/components/settings/__tests__/NodeManager.spec.ts` | NodeManager unit tests | Existing pattern for component behavior/mocks | Extend or add card-specific tests |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-12 | Static trace | Read `docker-start.sh` `up` branch | `up --pull-remote` pulls remote image and retags local alias; no container recreation if digest unchanged | Launcher should preserve easy update behavior where feasible |
| 2026-05-12 | Static trace | Read `NodeManager.vue` `onAddRemoteNode` | Existing add-node flow normalizes URL, probes capabilities, persists node, optionally bootstraps sync | Docker guidance only needs to produce a reachable base URL; existing add-node flow can handle registration |

## External / Public Source Findings

- Public API / spec / issue / upstream source: `None used`
- Version / tag / commit / freshness: `N/A`
- Relevant contract, behavior, or constraint learned: `N/A`
- Why it matters: `N/A`

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Future validation may require Docker; no Docker runtime was invoked during design investigation.
- Required config, feature flags, env vars, or accounts: None for investigation. Docker Hub image availability will matter for E2E.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. There are two current user paths:
   - no-clone but manual/long/static (`docker run` docs),
   - convenient but source-checkout-only (`docker-start.sh`).
2. The app has no discovery surface for starting a Docker node; it only registers a node after the user already knows a base URL.
3. The release image and desktop release tag are aligned enough for app-version-aware command generation.
4. A standalone launcher is the clean boundary: app/docs can tell users how to run it, while Docker lifecycle details live in the launcher.
5. Raw GitHub URLs are a viable first distribution path for installing scripts because the repo is public and they do not require release asset workflow changes; GitHub Release assets are a possible polish/follow-up if desired. The public script can default to Docker Hub `latest` while accepting an optional tag override.
6. The repeated-use public UX should not remain raw one-shot execution. The launcher must have an install/update boundary so Settings/docs can teach direct `autobyteus-docker ...` commands.
7. Launcher update and server image update must be separate: `update` refreshes the local CLI script, while `start` performs Docker image check/pull and conditional managed-container recreation.

## Constraints / Dependencies / Compatibility Facts

- Packaged users must not need source checkout paths.
- Packaged users should not have to re-download the launcher script for every repeated lifecycle command; install-once is the primary public command model.
- `autobyteus-docker update` must not be overloaded to update the server container; server image/container update behavior lives under `start`.
- Docker must be installed on user machines; installing Docker itself is outside scope.
- Existing source helper remains useful for maintainers/developers and should not be removed by this task; its `--project` flag should be treated as an internal/developer concept, not the user-facing launcher vocabulary.
- Dedicated root script subfolder recommendation: use a namespace such as `scripts/public/docker/` (or `scripts/user/docker/`) for raw-URL public launchers so future user-facing scripts can grow without mixing with maintainer automation.
- Node registry schema does not need to know whether a node was started by Docker.
- UI copy must satisfy localization boundaries.

## Open Unknowns / Risks

- Whether the GitHub repository raw content URL is publicly accessible for all intended users.
- Whether to prefer raw tag URLs immediately or add release-asset publishing for nicer URLs.
- Windows PowerShell execution policy, quoting details, command shim behavior, and User PATH behavior.
- Whether validation environment has Docker access for true E2E startup.
- Whether a future one-click in-app Docker start is desired; currently considered out of scope because it would shift Docker process ownership into Electron.

## Notes For Architect Reviewer

If the user approves the requirements, design should be spine-first around:

`Settings → Nodes guidance card -> command composer -> public launcher install -> installed autobyteus-docker CLI -> Docker Hub image/container -> printed base URL -> Add Remote Node existing flow`

Key boundary rule: NodeManager may present and copy commands, but installer/PATH behavior and Docker lifecycle policy should belong to the standalone launcher, not scattered across Vue template literals or hidden inside node registry code.
