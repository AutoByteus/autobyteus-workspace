# Design Spec — autobyteus-305 (Docker nodes update their server in place)

## Solution And Approval Basis

- Current solution revision ID: `SR-005` (design revised after ARCH-REV-001 Fail; previous design round SR-004)
- Approved requirements baseline: `requirements-doc.md` at `SR-003`, approved by the user on 2026-10-30 in the Solution Designer conversation ("Yeah, yeah, I feel like you're recommended. These are good … I accept that."). DEC-004, DEC-005 and DEC-011 were decided by the user the same day; their quotes are in the requirements' Decisions table.
- Behavior-defining supplements: `options-report.md` at SR-003. This design refines §4 of the report. Where they differ, this spec governs and the difference is listed in "Changes against the options report" below.
- Design status: `Ready` (revision for ARCH-REV-001 AR-001..AR-012; see "Resolution of ARCH-REV-001" at the end)
- Canonical investigation notes: `investigation-notes.md` (same folder)
- Authorities read (design reading gate, 2026-10-30): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (root), `docs/design-cases.md` (Cases 2, 5, 9, 13 apply), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–§5, `RELEASE.md` (current `origin/personal`), `GLOSSARY.md`. `references/design-examples.md` was not used.
- Conflicts and discrepancies:
  - DESIGN.md rule 9 (no cross-version contracts) conflicts with the feature. It is resolved by the user's DEC-007: four frozen contracts (C1–C4 below), written into rule 9 as its only exception.
  - No other conflict found.

## Current-State Read

- **Image:** one image holds the system and the server together (`autobyteus-server-ts/docker/Dockerfile.monorepo:44-137`).
  - The runtime stage copies the **whole workspace** `node_modules` (line 95) plus each package's `dist`.
  - supervisord runs `node dist/app.js` directly (`docker/supervisor-autobyteus-server.conf:2`), with `autorestart=true` and `startretries=20` (lines 5–7).
  - The base image's supervisord includes `conf.d/*.conf`; its own programs are VNC, xfce, Chrome, socat and websockify (base `/etc/supervisor/conf.d/base.conf`, read from the published image).
- **Upgrade today:** the launcher's `start_node` pulls the image and recreates the container whenever the image ID or config hash differs (`scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh:299-386`).
  - Four named volumes per node (`container-config.sh:36-39`) and two bind mounts survive the recreation.
  - The PowerShell twin is `autobyteus-docker.d/powershell/DockerRuntime.ps1`.
- **Server lifecycle:** `startConfiguredServer` runs Prisma migrations, the DB, the vault, app-data migrations, then listens and recovers (`autobyteus-server-ts/src/server-runtime.ts`).
  - One owner, `ServerProcessShutdown`, answers SIGINT/SIGTERM and an optional IPC request, cancels a startup in progress, and exits with code 0 or 1 (`src/shutdown/server-process-shutdown.ts:9-47`).
  - The app root is the folder holding `package.json` plus `dist/app.js` or prisma (`src/config/app-config.ts:150-186`). It is only read at runtime: a deployed package mounted read-only started healthy (investigation notes, 2026-10-30).
- **Access:** desktops and browsers reach a node without a credential, as "trusted network". Phones carry a credential and are refused on `TRUSTED_NETWORK_OWNER` routes (`src/api/security/remote-access-route-policy.ts:73-85, 161-166`). `/rest/health` is public (lines 65-67; `src/api/rest/health.ts:3-8`).
- **Version:** no server reports its release version. The release version lives only in `autobyteus-web/package.json`.
  - The desktop renderer's one source of its own version is `appUpdateStore.currentVersion` (`components/settings/AboutSettingsManager.vue:205-206`).
- **Nodes page:** rows come from `components/settings/nodes/NodeList.vue` and `NodeRow.vue` (223 lines), backed by the nodes view store.
- **Releases:** the Docker workflow pushes images only, with `permissions: contents: read` (`.github/workflows/release-server-docker.yml:27-28`).
  - It has three forms: a tag push (default variant); a manual dispatch of the default variant, which also re-publishes an existing tag via `release_ref` (`:61-71`); and a manual `publish_zh` dispatch that builds from `chrome-vnc:zh` and tags `<version>-zh` / `latest-zh` (`:94-99, 187-202`).
  - `:beta` moves to every newest recognized release, beta or stable (`:218-242`). The launcher defines `beta` as "Newest build, beta or stable" (`core.sh:54`).
  - Release assets download through a 302 to blob storage; a missing asset gives 404; `/releases/latest` redirects to the newest stable tag; `releases.atom` lists betas. None of these use the REST API quota (probe, 2026-10-30).
- **Version ordering:** `scripts/release_versions.py` recognizes only `X.Y.Z` and `X.Y.Z-beta.N`, with semver precedence (header, lines 1-29).
- **Legacy:** `docker/bootstrap.sh` is a git-sync of the source repos.
  - It exits at line 14 for `AUTOBYTEUS_SKIP_SYNC=1`: the image default, `container-config.sh:34`, `DockerRuntime.ps1:396`, and the default in `docker-compose.yml:26` and `.env.example:18`.
  - With the documented value `0` (`.env.example:12`, `docker-start.sh:250`), it only clones into `/app/src` (`bootstrap.sh:10, 76-96`), and nothing reads `/app/src` (repository grep).
  - `AUTOBYTEUS_WORKSPACE_ROOT` is read only by `bootstrap.sh:9`, and is set in `container-config.sh:25`, `DockerRuntime.ps1:387` and `docker-compose.yml:12`.
- **Consumers of the image layout `/app/autobyteus-server-ts`:**
  - `TESTING.md:193-196` (the team's rule for running a worktree's server in a test container);
  - `scripts/tests/server_docker_cli_smoke.py:24`;
  - `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs:142,159`;
  - `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs:130,147-148,197,210,213,226` (including `supervisorctl pid autobyteus_server`);
  - `docker-compose.yml:37-41` (four volumes);
  - `autobyteus-server-ts/docker/README.md`.

No structural problem in the current server forces a refactor. The feature adds new owners at the image and starter level, and a small node-update surface in the server and the desktop.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: new runtime owner (the starter: about 10 files), Dockerfile restructuring, a release-workflow job, launcher changes in bash and PowerShell, a server REST surface, and a desktop UI surface. Four subsystems change: image, CI, server, web.
- Architectural risk: `High`
- Risk rationale:
  - it downloads and runs code (supply chain);
  - it creates new cross-version contracts (C1–C4) by an explicit exception to rule 9;
  - it adds a new process owner between supervisord and the server (process lifecycle);
  - it copies and restores the user's data folder (data safety);
  - it adds a GitHub Actions secret, and the workflow gains `contents: write`.
- Escalation trigger: return a `Design Impact` if implementation finds any of these:
  - the package cannot be made byte-identical between the image and the release asset;
  - the server writes into its app root at runtime;
  - the bounded stop (autobyteus-284) cannot finish within the starter's stop limit;
  - a supported container path needs the data copy in a shared location.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Read | `Dockerfile.monorepo:44-137`; `supervisor-autobyteus-server.conf` | Image layout; supervisord command | D-IMG-1..3, starter as supervisord's program | — |
| Run | published image `/etc/supervisor/{supervisord.conf,conf.d/base.conf}`, `/entrypoint.sh` | Base includes `conf.d`; our program file is ours; no base change | No change to `chrome-vnc` | — |
| Measured / Reproduced | `evidence/linux-server-build-result-2026-10-30.txt` | `pnpm deploy --legacy` + `prisma generate` → 1.1 GB, 313 MB gz; starts healthy in 7 s, mounted read-only on the published image | Package = deployed folder; app root read-only; start contract C4 | Trimming (step 1) |
| Reproduced | throwaway `node` in the image (2026-10-26) | Ed25519 verify built in | Verification in the starter, with no extra software | — |
| Read | `src/shutdown/server-process-shutdown.ts:9-47` | SIGTERM triggers bounded cleanup and exit; IPC optional | The starter stops the server with SIGTERM, not the desktop IPC wire | Busy-turn bound needs 284 |
| Read | `src/config/app-config.ts:150-186` | App root = package root | Each package folder is a self-contained app root | — |
| Read | `src/api/security/remote-access-route-policy.ts:73-85,161-166` | `TRUSTED_NETWORK_OWNER` refuses phones | `/rest/node-update` takes that class | — |
| Probe | `curl` against GitHub releases (2026-10-30) | 302/404 on assets; `latest` redirect; `releases.atom` | Package source and track resolution without API quota | — |
| Read | `scripts/release_versions.py:1-29` | Strict version grammar and precedence | The starter's version ordering uses the same grammar | Two implementations (Python CI, JS starter) |
| Command | `git diff --diff-filter=A` of `prisma/migrations`, `src/app-data-migrations/migrations` across 23 tags | 3 of 23 releases added migrations; one folder per migration | Data-copy rule (DEC-005): package lists its migration folders | — |
| Read | `components/settings/AboutSettingsManager.vue:205-206` | `appUpdateStore.currentVersion` | The desktop's target version comes from that one owner | — |
| Read | `container-config.sh:13-52`; `core.sh:2-16` | Run arguments; config hash version `v6` | Add volume `<node>-server-packages`; raise config hash input | — |

## Intended Change

A Docker node runs its server from a **server package**, a self-contained server folder, and can replace that package inside its running container on the user's request. A small, stable **starter** in the image does the replacement: download, verify, check fit, self-check, stop, optional data copy, switch, confirm, or fall back.

Every release publishes signed packages per architecture next to the desktop installers. The image still ships with the same package built in.

## Change Scope (Mandatory)

- **In scope:** UC-001..UC-007, covering the following areas:
  - **Image:** Dockerfile stages, the starter, the signing public key, the system level, supervisord program.
  - **CI:** package extraction, description, signing and upload in the Server Docker Release workflow; the system-level check.
  - **Launcher:** the `<node>-server-packages` volume and the `update` command, in bash and PowerShell.
  - **Server:** the `node-update` REST surface and the starter client.
  - **Desktop:** the update line on the Nodes page's remote node rows.
  - **Docs:** `DESIGN.md` rule 9 exception, `GLOSSARY.md`, `RELEASE.md`, `autobyteus-server-ts/docker/README.md`.
- **Derived consumers:**
  - `RELEASE.md` asset count (17 → 23) and the delivery check that reads it: updated.
  - The launcher's `print_storage_for_node` and `print_urls` texts: add the server volume.
  - `desired_config_hash` (`container-config.sh:2-11`): add the new volume, so existing containers are recreated once by `upgrade --all`.
  - `scripts/tests/test_public_docker_launcher_*.py`: extended.
  - The desktop's `dockerNodeLauncherCommands.ts`: adds `update`.
  - **Old image layout** (AR-005), each changed in the build step that moves the layout (step 1 for paths, step 2 for the starter):
    - `TESTING.md:193-196`, rewritten: mount a deployed package read-only over `/opt/autobyteus/server-package` in a test container with fresh volumes;
    - `scripts/tests/server_docker_cli_smoke.py:24`: path updated;
    - `nodes-docker-address-probe.mjs:142,159`: paths updated;
    - `prisma-engine-discovery.docker.mjs`: paths updated; the server PID is taken from the starter's status (`server.pid`), not from `supervisorctl pid`;
    - `docker-compose.yml`: adds the `autobyteus-server-server-packages` volume (MP-001);
    - `autobyteus-server-ts/docker/README.md` and the root `README.md` Docker section: rewritten.
- **Deliberately left alone:**
  - The `chrome-vnc` base image.
  - The agent-runtime CLIs and their update rules (FU-002).
  - The `<node>-workspace` volume at `/app/autobyteus-server-ts/workspace`. It is kept with its name, though the server no longer runs from `/app`; removing a mounted volume is a data-folder change this ticket does not have approval for (FU-004).
  - The desktop's embedded server and its updater.
  - Restart-and-resume internals (autobyteus-285/287).
  - Node-to-node authentication (autobyteus-300).
  - The image-per-release cadence (DEC-011; FU-003).
- **Follow-ups:** FU-001, FU-002, FU-003, FU-004.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Path / Spine IDs |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-002 | User | REQ-003, REQ-011, AC-001, AC-010 | Click "Update to <version>" on a remote node row | No version, no action (F-06) | Version shown; update on click only | DS-001, DS-005 |
| BEH-003 | System | REQ-001, REQ-002, REQ-004, REQ-005, REQ-009, REQ-015, AC-001..AC-003, AC-008, AC-011, AC-013 | Update request (desktop or command) | None | Verified in-place replacement | DS-001, DS-002, DS-006 |
| BEH-004 | System | REQ-005, REQ-006, AC-003, AC-004 | Failure at any step | None | Nothing changes before the switch; old version (and data, after a migration) back after it | DS-006, DS-007 |
| BEH-005 | System | REQ-008, AC-005 | Package needs a newer system level or another Node module version or architecture | None | Refused before any change, with the command | DS-006 |
| BEH-001 | Operational | REQ-012, AC-006 | `autobyteus-docker upgrade --all` | Recreate, keep volumes (F-04) | Preserved; the node keeps the newest version it may run | DS-003 |
| BEH-006 | System | REQ-010, AC-007 | Runs mid-turn at the switch | Lost (F-13) | Bounded stop (284), automatic resume (285/287) | DS-006 (stop step) |
| BEH-007 | User | REQ-011 | Opening the Nodes page | None | Version, progress, result, "new image needed" | DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `options-report.md` | User-facing options and proposal | All | This design refines §4 | Approved at SR-003 |
| `evidence/linux-server-build-measure.sh`, `evidence/linux-server-build-result-2026-10-30.txt` | Package build and start proof | REQ-001, REQ-009 | Step 1 starts from it | Evidence |
| `evidence/layer-diff.py` + outputs | Download measurements | QR-001 | Re-measure after step 1 | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature).
- Current design issue found: `No` for the server.
  - The image's whole-workspace `node_modules` copy (`Dockerfile.monorepo:95`) is accidental weight that this design removes anyway, because the image now carries the server package instead.
- Structural triggers:
  - **Capability-area reuse** (fires):
    - process restart → supervisord stays the owner of crash restarts;
    - stop → the server's `ServerProcessShutdown` via SIGTERM;
    - health → `/rest/health`;
    - owner-only routes → the route policy's `TRUSTED_NETWORK_OWNER`;
    - app version → `appUpdateStore`;
    - package staging → the desktop's `prepare-server.mjs` approach, but not its Electron rebuild.
  - **Several kinds or forms** (fires): two entry forms reach one update. Both go through the starter's one `UpdateService.request` with identical gates (Case 2). The CLI form skips only the phone check, which applies to network requests.
  - **Split sequence** (guarded): the update sequence has one owner, `UpdateRun`, which calls each mechanism itself in order. No callback reaches another collaborator (Case 1).
  - **Derived data** (fires): new volume → config hash, storage text, tests; asset count → RELEASE.md.
  - **Persisted-data transition** (fires): data copy and restore only; no format change. See below.
  - **Vocabulary drift** (guarded): "server package", "built-in server package", "starter", "system level" and "in-place update" are added to GLOSSARY.md. "Build" is not used as a noun for the package.
  - **Behavior by absence** (guarded): every refusal is an explicit outcome with a code (Interface table). A missing asset is `NO_PACKAGE_FOR_VERSION`, not "not found therefore …".
  - **Legacy cleanup** (fires): `bootstrap.sh` and its environment are dead in the touched entry files and are removed.
- Root cause classification: `No Design Issue Found`.
- Refactor needed now: `No`. The removal of dead `bootstrap.sh` is part of this change (Principle 7).
- Evidence: Current-State Read.
- Design response: add owners where none exist (starter, node-update surface); reuse every existing owner listed above.
- Intentional deferrals: FU-003 (image only when the system changes), FU-004 (unused `/app/autobyteus-server-ts/workspace` volume).

## Terminology

These words go into `GLOSSARY.md`, Nodes section, in step 1:

- **Server package:** one release's server for one architecture: a folder with `server-package.json`, `package.json`, `dist/`, `prisma/`, `node_modules/` and `mobile-web/`. It is published as `autobyteus-server-<version>-linux-<arch>.tar.gz` with its **package description** (`.json`) and **signature** (`.json.sig`).
- **Built-in server package:** the server package inside an image, at `/opt/autobyteus/server-package`, byte-identical to that release's published one.
- **Starter:** the program in the image that runs the node's server package and replaces it on request (`/opt/autobyteus/starter`).
- **In-place update:** replacing a Docker node's server package inside its running container.
- **System level:** a whole number naming what the image provides beyond Node and the architecture (system tools, base image). An image provides one; a server package needs one.

"Node" keeps its GLOSSARY meaning; the Docker node is a remote node from the desktop's point of view.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in this scope:
  - `docker/bootstrap.sh` and its call in `entrypoint.sh:30`;
  - the `AUTOBYTEUS_SKIP_SYNC` environment in `container-config.sh:34`;
  - the git-sync variables in `docker-compose.yml:21-31`;
  - the server path check `entrypoint.sh:32-36`. It checks `/app/autobyteus-server-ts/dist/app.js`; the starter now owns finding a runnable package;
  - `AUTOBYTEUS_WORKSPACE_ROOT` (`container-config.sh:25`, `DockerRuntime.ps1:387`, `docker-compose.yml:12`);
  - the git-sync lines in `.env.example:12-18` and `docker-start.sh:250-254`, and `AUTOBYTEUS_SKIP_SYNC` in `DockerRuntime.ps1:396` and `prisma-engine-discovery.docker.mjs:210`;
  - the runtime-stage copy of the workspace `node_modules` (see the Removal plan for the full list).
- Compatibility wrappers, dual paths or legacy fallbacks this design keeps: `None`.
  - The built-in package is not a fallback path. It is the image's current server, chosen by the one selection rule (DS-003).

## Persisted Data / State Transition Decision (Mandatory)

- **Stored subjects:**
  - (a) the user's data volume `/home/autobyteus/data` (0.13–1.35 GB here);
  - (b) new starter state in `/home/autobyteus/server-packages`: `state.json`, `update.json`, `packages/<version>/`, and `data-copy/` only during a migration update.
- **Change:** no change to any server data format. (b) is new and written only by the starter.
- **Readers and writers:**
  - (a) is read and written by the running server version, which may migrate it on its first start (Data Migration Guideline §4).
  - (b) is read and written by the starter only. The server reads it only through the starter socket (C2), never from files.
- **Required invariants:**
  - a node never runs a version older than one that already ran on its data;
  - after a failed migration update, the old version runs on the pre-update data.
- **Decision:** `Not Affected` for (a)'s formats. (a) is copied and restored byte for byte by DEC-005. (b) is new state with one writer; its reader is tolerant and ignores unknown fields.
- **Rationale:** the copy exists only for updates whose package lists a migration folder the running package does not have (3 of 23 releases). It is deleted when the new version is confirmed. There is no migration machinery.
- **Constraints:**
  - free space must be checked before the copy (statfs on `/home/autobyteus/server-packages`);
  - the copy lives in the node's own server volume, never in a shared location: it contains the vault.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002, BEH-003 | Click on the Nodes page | Node runs the new version; row shows it | Starter `UpdateRun` (sequence); desktop store (presentation) | The user's main path |
| DS-002 | Primary End-to-End | BEH-003 | `autobyteus-docker update` on the host | Same | Starter `UpdateRun` | Second entry form, same gates |
| DS-003 | Primary End-to-End | BEH-001, BEH-004 | Container start (supervisord starts the starter) | Server package running and supervised | Starter `NodeStarter` | Selection of the package; recovery of an interrupted trial |
| DS-004 | Primary End-to-End | BEH-003 (REQ-009) | Tag push | Image on Docker Hub and package, description and signature per architecture on the release | Server Docker Release workflow | Source of every package |
| DS-005 | Return-Event | BEH-007 | `UpdateRun` step change | Row text | Starter `UpdateStatus` | Progress and result |
| DS-006 | Bounded Local | BEH-003..BEH-006 | `UpdateRun.start` | Confirmed, refused or rolled back | `UpdateRun` | The step machine |
| DS-007 | Bounded Local | BEH-004 | Child exit or signal | Starter exit, or a step result for `UpdateRun` | `ServerSupervisor` | One owner of the server child |

## Primary Execution Spine(s)

- **DS-001:** `Nodes page row (NodeServerUpdate.vue) -> nodeServerUpdateStore -> node REST POST /rest/node-update (server NodeUpdateRoutes) -> StarterClient (unix socket) -> Starter UpdateService.request -> UpdateRun -> ReleaseSource (GitHub) -> PackageVerifier -> PackageStore (unpack) -> SelfCheck -> ServerSupervisor.beginUpdate -> ServerSupervisor.stop -> DataCopy.take (if migrations) -> PackageStore.beginTrial -> ServerSupervisor.start(new) -> confirm -> PackageStore.commitTrial -> DataCopy.delete -> ServerSupervisor.endUpdate | rollBack -> node serves new version -> store polling shows it`
- **DS-002:** `autobyteus-docker update [--name|--all] [--version X] -> docker exec <container> node /opt/autobyteus/starter/cli.mjs update … -> Starter socket POST /updates -> UpdateService.request -> UpdateRun …` (from here as DS-001)
- **DS-003:** `supervisord -> starter.mjs (NodeStarter.boot) -> recovery/cleanup (PackageStore, DataCopy) -> StarterSocket.listen -> PackageStore.choose(built-in, installed) -> ServerSupervisor.start | NEEDS_NEW_IMAGE (stay up, no server) -> supervise until signal or child exit`
- **DS-004:** `tag push -> prepare-release -> check-system-level -> docker build (stage server-package → runtime) and push -> per architecture: docker create + cp /opt/autobyteus/server-package -> describe-server-package.mjs -> tar.gz + sha256 -> sign-server-package.mjs (Ed25519, secret) -> wait for the GitHub release -> gh release upload --clobber (3 files per architecture)`

  Per workflow form (AR-006):

  | Form | Image built | Package job | Notes |
  | --- | --- | --- | --- |
  | Tag push (default variant) | Yes | Runs; uploads 6 files | AC-011 byte identity applies |
  | Manual dispatch, default variant (new tag or re-publish of an existing tag via `release_ref`) | Yes | Runs; replaces all 6 files with `--clobber` (archive first, then description, then signature) | A node fetching during the replacement may get `ARCHIVE_MISMATCH` once; a retry succeeds. The re-published image's built-in package matches the new files |
  | Manual `publish_zh` | Yes (`chrome-vnc:zh` base) | **Does not run** | The zh image's built-in package is built in that run, so AC-011 does not apply to zh images. zh nodes update in place from the default run's package. The package does not depend on the base image; the system level covers the zh base (below) |

  System level inputs: the Dockerfile's runtime system section (from `FROM … AS runtime` through the CLI install) plus the pinned base digests. Both are kept in `system-level.json` (`{ level, baseImages: { default: "<digest>", zh: "<digest>" }, systemInputsSha256 }`), and the workflow passes the digest for its variant. A changed zh digest also changes the hash, so it needs a level raise like any system change.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The row asks the node for its status, offering the app's version as target. The starter answers whether that target is newer. On click, the server forwards the request to the starter, which runs the update while the old server keeps serving until the stop step. The row polls status; during the restart it shows "Restarting…", then the new version. | Node, server package, update | `UpdateRun` | Status, request logging, version ordering |
| DS-002 | The launcher maps the node's saved image reference to a track (table under Interface Boundary Mapping), or refuses, then runs the starter's CLI inside the container. The CLI is a socket client of the same `UpdateService`. | Same | `UpdateRun` | Track resolution inside the starter: `stable` = the tag `/releases/latest` redirects to; `beta` = the newest recognized release, beta or stable, in `releases.atom` |
| DS-003 | At start, the starter cleans up or rolls back what an interrupted update left, and opens its socket. It then applies the selection rule: run the installed package or the built-in one, or refuse with `NEEDS_NEW_IMAGE` when the newest version that already ran cannot run on this image and only older packages fit. On refusal it stays up, serving its status, and runs no server. Otherwise `ServerSupervisor` starts the package and supervises it. | Built-in package, installed package | `NodeStarter` (boot), `ServerSupervisor` (child) | Logging |
| DS-004 | The release builds the image once; the package is taken out of it per architecture, described, signed and uploaded. | Package, description, signature | Workflow | System-level check, secret handling |
| DS-005 | Every step transition is written to `update.json` and served by `GET /status`. The server relays it; the desktop polls every 2 s while an update runs. | Update status | `UpdateStatus` | — |
| DS-006 | `verify → fit → download → unpack → self-check → stop → [data copy] → trial start → confirm → commit`, or a refusal before stop, or a rollback after it. | — | `UpdateRun` | — |
| DS-007 | `ServerSupervisor` is the one owner of the running server child. In mode `supervising`, an exit of the child ends the starter with the child's code (supervisord restarts it). An update takes the child with `beginUpdate()` (mode `updating`): from then on every exit is a result `UpdateRun` awaits, until `endUpdate()` hands the resulting child back. SIGTERM is forwarded in both modes. | — | `ServerSupervisor` | — |

## Spine Actors / Main-Line Nodes

Main-line nodes: Nodes page row; `nodeServerUpdateStore`; server `NodeUpdateRoutes`; `StarterClient`; starter `UpdateService`; `UpdateRun`; `ReleaseSource`; `PackageVerifier`; `PackageStore`; `SelfCheck`; `ServerSupervisor`; `DataCopy`; `NodeStarter`; the release workflow.

## Ownership Map

- **`NodeStarter`** (starter): boot of the starter. It owns:
  - the boot cleanup and interrupted-update recovery (through `PackageStore` and `DataCopy`);
  - the selection outcome: run, or `NEEDS_NEW_IMAGE`;
  - the socket's lifetime and the starter's exit.
  It is not the owner of the server child (`ServerSupervisor`), of crash restarts (supervisord) or of update sequencing (`UpdateRun`).
- **`ServerSupervisor`** (starter): the one owner of the server child that runs now. It owns:
  - spawn of `node <package>/dist/app.js --host --port --data-dir` (C4) in its own process group, with `AUTOBYTEUS_STARTER_SOCKET` in the child's environment;
  - stop: SIGTERM, a 120 s limit, then SIGKILL of the group, then a port-free check;
  - health probe;
  - the mode `supervising | updating` and the exit handling of each mode (DS-007).
- **`UpdateService`** (starter): the single entry for update requests from both forms. It owns:
  - the gates: valid version grammar (or a valid track, resolved first); newer than running; no update running; a server is running (not in `NEEDS_NEW_IMAGE`);
  - the request log line, with `requestedFrom`;
  - the creation of one `UpdateRun` at a time.
- **`UpdateRun`** (starter): sequencing of one update and its rollback. It calls each mechanism itself, in order.
- **`ReleaseSource`** (starter): URLs and download of a version's description, signature and archive, plus track resolution. Its only network calls go to `github.com` and the redirect targets.
- **`PackageVerifier`** (starter): it checks, in this order:
  1. the Ed25519 signature over the description bytes;
  2. binding: `description.version` equals the requested version, `description.arch` equals `process.arch`, and `archive.name` equals `autobyteus-server-<requested>-linux-<arch>.tar.gz` (AR-004);
  3. fit: Node module version and system level;
  4. after download, the archive SHA-256;
  5. after unpack, that `server-package.json` equals the description without `archive`.
- **`PackageStore`** (starter): the layout of `/home/autobyteus/server-packages`, unpacking into a temporary folder then an atomic rename, and the `state.json` transitions (current, previous, trial). It also deletes old packages.
- **`SelfCheck`** (starter): starts a candidate package in an isolated environment, waits for health within 120 s, then stops it and deletes the environment. The environment (AR-011):
  - a fresh folder `/home/autobyteus/server-packages/self-check-<random>/` holding `data/` (with its own `.env`: `APP_ENV=production`, `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:<port>`, `DB_TYPE=sqlite`, `LOG_LEVEL=INFO`), `workspace/` and `home/`;
  - an environment built from scratch: `PATH`, `NODE_ENV=production`, `HOME=<folder>/home`, `AUTOBYTEUS_TEMP_WORKSPACE_DIR=<folder>/workspace`; no inherited `AUTOBYTEUS_*` variables and no `AUTOBYTEUS_STARTER_SOCKET`;
  - host `127.0.0.1` and a free port.
  It is a separate process, not the supervised child.
- **`DataCopy`** (starter): `needsCopy` (the description's `dataMigrations` against the running package's `server-package.json`), the free-space check, copy, restore (repeatable: it clears the data folder's contents and copies back) and delete of `/home/autobyteus/data`.
- **`UpdateStatus`** (starter): `update.json` and its JSON shape (C2). It also holds the running version reported in C2 status, taken from the `server-package.json` of the package `ServerSupervisor` started: the one owner of "which version runs" (AR-009).
- **`StarterSocket` / `cli.mjs`** (starter): thin transport. They own no policy.
- **Server `NodeUpdateRoutes`:** HTTP shape C1, the route class, the client address; it relays to `StarterClient`. Thin. Starter presence is explicit: `AUTOBYTEUS_STARTER_SOCKET` absent → `inPlaceUpdate: "unavailable"`, `version: null` (embedded or dev server); present but not answering → `inPlaceUpdate: "error"` with a message.
- **Desktop `nodeServerUpdateStore`:** per entry: fetch status, request the update, poll, map to row states. It uses `appUpdateStore.currentVersion` as the target.
- **Workflow:** builds, extracts, describes, signs and uploads. It checks the system level.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Server `NodeUpdateRoutes` + `StarterClient` | Starter `UpdateService` | Only port 8000 is published; the starter is not on the network | Version ordering, gates, any update step |
| `StarterSocket`, `cli.mjs` | `UpdateService` / `UpdateStatus` | Local transport for the server and the host command | Gates (both forms reach the same `request`) |
| Launcher `update` command | `cli.mjs` inside the container | The host owner's entry | Version resolution (done by the starter) |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/bootstrap.sh` and the `COPY`/`chmod` of it (`Dockerfile.monorepo:116,122`) | Dead: with `AUTOBYTEUS_SKIP_SYNC=1` (image default, launcher, compose default) it exits at line 14. With the documented `0` it only clones into `/app/src` (`bootstrap.sh:10, 76-96`), which nothing reads (repository grep for `/app/src`). No other caller (`grep autobyteus-bootstrap`) | — | Removes the git-sync of separate repos |
| `entrypoint.sh:30-36` (bootstrap call, `app.js` path check) | Bootstrap dead; the starter finds and checks the package | Starter `PackageSelection` | `.env` creation stays (`entrypoint.sh:19-28`) |
| `-e AUTOBYTEUS_SKIP_SYNC=1` in `container-config.sh:34` and `DockerRuntime.ps1:396`; git-sync variables in `docker-compose.yml:21-31`; the git-sync lines in `.env.example:12-18` and `docker-start.sh:250-254`; `-e AUTOBYTEUS_SKIP_SYNC=1` in `prisma-engine-discovery.docker.mjs:210` | Dead with bootstrap | — | Changes the config hash (a recreation happens anyway) |
| `-e AUTOBYTEUS_WORKSPACE_ROOT=/app` in `container-config.sh:25`, `DockerRuntime.ps1:387`, `docker-compose.yml:12` | Dead: read only by `bootstrap.sh:9` (repository grep) | — | Same recreation |
| Runtime-stage `COPY` of the workspace `node_modules` and package `dist` folders (`Dockerfile.monorepo:95-114`) | The image carries the server package instead | Stage `server-package` → `/opt/autobyteus/server-package` | The image gets smaller (desktop build tools gone) |
| `docker/supervisor-autobyteus-server.conf` command `node dist/app.js` | The starter runs the package | Same file, command `node /opt/autobyteus/starter/starter.mjs` | `autorestart`, `startretries` kept |

## Return Or Event Spine(s) (If Applicable)

DS-005: `UpdateRun step change -> UpdateStatus.write(update.json) -> GET /status (socket) -> server GET /rest/node-update -> nodeServerUpdateStore poll (2 s while running) -> NodeServerUpdate.vue`. While the server is down (stop → confirm), polls fail. The store shows "Restarting…" for up to 5 minutes, then "Not reachable" with the last known state, and keeps polling every 10 s, so the row recovers by itself.

## Bounded Local / Internal Spines (If Applicable)

- **DS-006**, parent `UpdateRun`. Before the point of no return:

  `checkGates → fetchDescription (404 → NO_PACKAGE_FOR_VERSION) → verifySignature → verifyBinding → checkFit → needsCopy? (DataCopy.needsCopy) → checkSpace (package: archive.size + unpackedSize + 512 MB; plus, when needsCopy, the data folder's size + 10 % + 512 MB; else NOT_ENOUGH_SPACE) → ensurePackage (download to downloads/ → verifySha → unpack to packages/.<version>.partial → matchDescription → rename to packages/<version>) → selfCheck`

  - Each step writes `update.json` before it runs.
  - Any refusal or failure here ends the run with `refused` or `failed`. The old server keeps serving, `state.json` is untouched, and temp files are removed.

  From the point of no return, in call order:

  1. `supervisor.beginUpdate()` (mode `updating`);
  2. `supervisor.stop()` (old);
  3. if `needsCopy`: `DataCopy.take()`. Space is re-checked first; if it no longer fits: `supervisor.start(old)` → `endUpdate()` → `failed: NOT_ENOUGH_SPACE` (no trial was recorded, the data is untouched);
  4. `PackageStore.beginTrial({ version: new, previous: old, dataCopy })`, written only after the copy is complete;
  5. `supervisor.start(new)`;
  6. confirm: health within 180 s, then alive 60 s;
  7. commit: `PackageStore.commitTrial()` (`current=new`, `previous=old`, trial cleared) → `DataCopy.delete()` → `PackageStore.deleteOthers(current, previous)` → `supervisor.endUpdate()` → `succeeded`.

  Rollback, on a failed confirm (the trial child exited, or no health in time), in call order:

  1. `supervisor.stop()` (new, if still running);
  2. if `trial.dataCopy`: `DataCopy.restore()`;
  3. `PackageStore.rollBackTrial()` (`current=previous`, trial cleared);
  4. `DataCopy.delete()`;
  5. `supervisor.start(old)` → `endUpdate()` → `failed: FAILED_AFTER_SWITCH`.

  The failed version is not retried by itself.

- **DS-007**, parent `ServerSupervisor`. Exit cases, each with its result:

  | Mode / phase | Event | Result |
  | --- | --- | --- |
  | `supervising` | child exits | starter exits with the child's code; supervisord restarts it (preserved CUR-003) |
  | `supervising` | SIGTERM/SIGINT | stop child → exit 0 |
  | before the point of no return (`UpdateRun` running, mode still `supervising`) | old child exits by itself | `UpdateRun` is aborted: temp files removed, `failed: SERVER_EXITED_DURING_UPDATE`; then the `supervising` rule applies (starter exits, supervisord restarts the old package) |
  | before the point of no return | SIGTERM | `UpdateRun` aborted (temp removed, `failed: INTERRUPTED`) → stop child → exit 0 |
  | `updating`, steps 2–3 (stop, copy) | SIGTERM | exit after the current step's process is stopped; no trial recorded, so boot runs the old package and deletes a partial `data-copy/` |
  | `updating`, steps 4–7 (trial) | trial child exits / no health | rollback (above) → `FAILED_AFTER_SWITCH` |
  | `updating`, steps 4–7 or rollback | SIGTERM | stop child → exit; `state.trial` stays → boot rollback → `INTERRUPTED` |

  In mode `supervising`, `ServerSupervisor` reports an exit to `NodeStarter` through the promise `exited` that `start()` returns. `NodeStarter` awaits it, aborts an active `UpdateRun` (which removes its temp files), then exits. In mode `updating`, `UpdateRun` awaits the same promise instead. There is one awaiter at a time, set by `beginUpdate`/`endUpdate`.

- **DS-003**, parent `NodeStarter`. Boot, in call order:

  1. **Recovery:** if `state.trial` exists, the trial was interrupted (container stop, crash, power loss). Run, in order:
     1. if `trial.dataCopy`: `DataCopy.restore()` (repeatable);
     2. `PackageStore.rollBackTrial()`;
     3. `DataCopy.delete()`;
     4. record `failed: INTERRUPTED` in `update.json`.

     A trial is never resumed: supervisord's restarts must not retry a failing version.
  2. **Cleanup:** without a trial, delete any leftover `data-copy/`, `downloads/*`, `packages/.*.partial` and `self-check-*`. An `update.json` still `running` becomes `failed: INTERRUPTED`.
  3. **Socket:** open it.
  4. **Selection** (`PackageStore.choose`), with N = the newest version that already ran on this node (`state.current`, else none):
     - if the installed `state.current` package fits this image and is not older than the built-in one, run it;
     - else if the built-in package fits and is not older than N, run it, and set `current` to the built-in one;
     - else `NEEDS_NEW_IMAGE`: "This node already ran <N>; this image can run only <B>. Use an image of version <N> or newer: `autobyteus-docker upgrade --all --tag <N>`".
  5. **Start or refuse:**
     - run: `ServerSupervisor.start(choice)`, mode `supervising`;
     - `NEEDS_NEW_IMAGE`: no server; the starter stays up (supervisord does not loop) and serves C2 status with the code and message; the launcher's `status` and `update` print it. The desktop sees the node as unreachable.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `ReleaseVersion` (`release-version.mjs`) | DS-001, DS-002, DS-003 | `UpdateService`, `PackageSelection`, `ReleaseSource` | Grammar `X.Y.Z[-beta.N]`, comparison, the same rules as `release_versions.py` | Gates and selection | Ordering scattered into callers |
| `StarterLog` | all starter spines | all starter owners | One-line JSON log to stdout (supervisord log) with fields; no secrets exist to log | Diagnosis | — |
| `SystemFacts` | DS-003, DS-006 | `PackageVerifier`, `PackageSelection` | Reads `process.versions.modules`, `process.arch`, and `/opt/autobyteus/system-level` | Fit | — |
| Workflow `check-system-level.mjs` | DS-004 | Workflow | Fails CI when the Dockerfile's system section or the pinned base digests changed without raising the level | Clear "new image needed" signal | — |
| Request logging | DS-001 | `UpdateService` | Logs version, `requestedFrom` (client address, or `host command`) | DEC-004 | — |

## Ownership Boundaries

- The starter is the only owner of the server-package layout, `state.json`, `update.json` and the data copy. Nothing else reads or writes `/home/autobyteus/server-packages`.
- The server reaches the starter only through C2 (the socket). The desktop reaches the node only through C1.
- supervisord remains the owner of restarting the starter after an exit. The starter never restarts a crashed server by itself, outside an update's own stop and start.
- `ServerSupervisor` is the only code that spawns, stops or awaits the server child. `UpdateRun` acts on it only through `beginUpdate`/`stop`/`start`/`endUpdate`. `SelfCheck` runs its candidate as its own separate process.
- The server's shutdown remains owned by `ServerProcessShutdown`. The starter only sends SIGTERM and waits.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Starter socket API (C2) | `UpdateService`, `UpdateStatus`, `PackageStore`, all steps | Server `StarterClient`, `cli.mjs` | Server reading `state.json`/`update.json` or writing into `/home/autobyteus/server-packages`; CLI running steps itself | Extend C2 (frozen: add optional fields only) |
| Node REST `/rest/node-update` (C1) | Server relay | Desktop store | Desktop calling the socket, GraphQL duplicates | Extend C1 (optional fields only) |
| `UpdateRun` | Step mechanisms | `UpdateService` | `UpdateService` or socket calling `DataCopy`/`ServerSupervisor` directly | — |
| `ServerSupervisor` | The child process, its mode, exit handling | `NodeStarter`, `UpdateRun` | Anyone else spawning or signalling the server; `UpdateRun` awaiting the child without `beginUpdate` | — |

## Dependency Rules

- Starter files import only Node built-ins (`node:crypto`, `node:http`, `node:fs`, `node:child_process`, `node:net`, `node:os`, `node:path`). They do not import any `autobyteus-*` package or server code: the starter outlives many server versions.
- The server's `node-update` files may import Fastify and read `process.env.AUTOBYTEUS_STARTER_SOCKET`. They must not import anything from `autobyteus-server-ts/docker/`.
- The desktop calls C1 only; it never constructs starter socket paths or GitHub URLs.
- The workflow scripts (`scripts/server-package/*.mjs`) import Node built-ins only.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| C1 `GET /rest/node-update?target=<version>` | This node's server package and update | Status for the desktop | `target`: release version grammar; optional | Returns `{ inPlaceUpdate: "available"\|"unavailable"\|"error", version: string\|null, target?: { version, relation: "newer"\|"same"\|"older" }, update?: UpdateState, message?: string }`. `version` and `relation` come from C2 (the starter's one owner). `unavailable` when `AUTOBYTEUS_STARTER_SOCKET` is absent; `error` when it is set but the socket does not answer |
| C1 `POST /rest/node-update` body `{ version }` | Same | Request an update | Exact version | `202 { accepted: true }`, or `409 { refused: code, message }`. Route class `TRUSTED_NETWORK_OWNER` (phones `403`). `requestedFrom` = the request's client address |
| C2 `GET /status[?target=]`, `POST /updates { version \| track, requestedFrom }` over `/run/autobyteus/starter.sock` (0600, root) | Same | Status and request | `version` grammar, or `track: "stable"\|"beta"` (CLI only) | Status: `{ version, state: "running"\|"needsNewImage", server?: { pid, packageVersion, source: "builtIn"\|"installed" }, target?, update, message? }`. The same `UpdateService.request` for both forms |
| C2, host form: `node /opt/autobyteus/starter/cli.mjs status` and `cli.mjs update (--version <X> \| --track stable\|beta)` | Same | Host owner's entry | As above | Prints one JSON line (the C2 response). Exit 0 = accepted or ok, 2 = refused (code in the JSON), 1 = error. `requestedFrom` = `host command` |
| C3 package description `autobyteus-server-<version>-linux-<arch>.json` + `.json.sig`, and the package's own `server-package.json` | One release, one architecture | Verification, fit, the running version | — | Description: `{ version, arch, nodeModuleVersion, systemLevel, dataMigrations: string[], archive: { name, sha256, size, unpackedSize } }`; signature = base64 Ed25519 over the exact file bytes. `server-package.json` = the description without `archive`; starters of any image version read it |
| C4 server start | The server process | Run | — | `node <pkg>/dist/app.js --host --port --data-dir`; environment adds `AUTOBYTEUS_STARTER_SOCKET`; SIGTERM stops; `GET /rest/health` 200 when listening; `.env` in the data folder (written by `entrypoint.sh`) |

**Track resolution for `update` without `--version`**, applied by the launcher (bash and PowerShell) from the node's saved `IMAGE_REF` (AR-007):

| Saved `IMAGE_REF` | Track passed to the starter | Meaning (starter) |
| --- | --- | --- |
| `autobyteus/autobyteus-server:latest` or `:latest-zh` | `stable` | The tag `/releases/latest` redirects to |
| `autobyteus/autobyteus-server:beta` | `beta` | The newest recognized release (beta or stable) in `releases.atom`. The feed lists the 10 newest releases; the newest is always among them |
| A pinned version tag (`:1.5.10`, `:1.5.11-beta.2`, `:1.5.10-zh`) | none: refused before calling the starter | "This node is pinned to <tag>; pass --version" |
| Another repository (`--image …`) | none: refused | "This node uses a custom image; pass --version" |

`--version X` is accepted for every kind.

`UpdateState` = `{ state: "idle"|"running"|"succeeded"|"failed"|"refused", targetVersion, step, code, message, startedAt, finishedAt, requestedFrom }`.

Refusal and failure codes, each an explicit outcome:
- `INVALID_VERSION`
- `NOT_NEWER`
- `UPDATE_RUNNING`
- `NO_PACKAGE_FOR_VERSION` (404 on the description)
- `SIGNATURE_INVALID`
- `DESCRIPTION_MISMATCH` (signed, but for another version, architecture or asset name: AR-004)
- `ARCHIVE_MISMATCH`
- `NEEDS_NEW_IMAGE`, with the launcher command in the message (at update and at boot)
- `NOT_ENOUGH_SPACE`
- `DOWNLOAD_FAILED`
- `SELF_CHECK_FAILED`
- `SERVER_EXITED_DURING_UPDATE`
- `STOP_TIMEOUT` (the old server did not exit; it was stopped by force and the update continues; recorded, not a refusal)
- `FAILED_AFTER_SWITCH` (old version restored)
- `INTERRUPTED` (rolled back or cleaned up at boot)

**Frozen across versions** (DESIGN.md rule 9 exception, DEC-007): C1, C2 (including the `cli.mjs` arguments, output and exit codes), C3 (including `server-package.json`) and C4.
- Fields and codes may be added as optional values; nothing is renamed or removed.
- A client shows `message` for a code it does not know. This is how the frozen contract grows, not version negotiation.

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| C1 GET/POST | Yes | Yes (`target`/`version` grammar) | Low | — |
| C2 | Yes | Yes (`version` or `track`, mutually exclusive) | Low | Refuse both or neither: `INVALID_VERSION` |
| C3 | Yes | Yes | Low | — |
| C4 | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Same Everywhere (Glossary)? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Self-contained server folder | server package | Yes | Yes (new entry) | "build" / "bundle" creeping in | Use "server package" in code, assets, UI, docs |
| Image's copy | built-in server package | Yes | Yes | — | — |
| Image program | starter | Yes | Yes | "launcher" already means the host CLI `autobyteus-docker` | Never call the starter a launcher |
| Image capability number | system level | Yes | Yes | "system layer" in the Task text | "System level" is the number; "system part" in prose |
| Feature | in-place update | Yes | Yes | "upgrade" (image recreation) | Keep "upgrade" for the image path and "update" for in-place, as the commands do |
| REST path | `/rest/node-update` | Yes | Node per GLOSSARY | — | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Crash restart | supervisord program | Reuse | Already the owner | — |
| Stop the server | `ServerProcessShutdown` (SIGTERM) | Reuse | One shutdown owner | IPC wire not used: it is the desktop's evolving protocol, and C4 must stay frozen |
| Health | `/rest/health` | Reuse | Public, after listen | — |
| Phone refusal | `TRUSTED_NETWORK_OWNER` | Reuse | Same class as owner routes | — |
| App version | `appUpdateStore.currentVersion` | Reuse | One owner | — |
| Package staging | `prepare-server.mjs` approach | Extend in the Dockerfile stage (deploy + `prisma generate`) | Proven by the probe | The Electron native rebuild does not apply |
| Version ordering | `release_versions.py` | Create New (`release-version.mjs`) with the same rules and a shared test-vector file | The starter cannot run Python | Recorded tradeoff |
| Nodes UI | `NodeRow.vue` | Extend with a child component | Rows already exist | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Decision |
| --- | --- | --- | --- |
| Image (`autobyteus-server-ts/docker/`) | Dockerfile stages, entrypoint, supervisord program, public key, system level | DS-003, DS-004 | Extend |
| Starter (`autobyteus-server-ts/docker/starter/`) | All starter owners | DS-001..DS-003, DS-005..DS-007 | Create New |
| Release CI (`.github/workflows/release-server-docker.yml`, `scripts/server-package/`) | Extraction, description, signing, upload, level check | DS-004 | Extend + Create New scripts |
| Launcher (`scripts/public/docker/`) | Volume, `update` command | DS-002 | Extend |
| Server (`autobyteus-server-ts/src/node-update/`) | C1, relay, version | DS-001, DS-005 | Create New |
| Desktop (`autobyteus-web/`) | Row line, store | DS-001, DS-005 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping: the draft needed no extraction beyond `release-version.mjs` and `starter-paths.mjs`.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Version grammar and ordering | `starter/release-version.mjs` | Starter | Gates, selection, track resolution | Yes | Yes | A general semver library |
| Paths and limits (volume layout, socket, timeouts) | `starter/starter-paths.mjs` | Starter | Every starter owner | Yes | Yes | A settings registry |
| Description shape (C3) | `scripts/server-package/describe-server-package.mjs` (writer); `starter/package-verifier.mjs` (reader, validates its required fields) | CI / starter | One writer, one strict reader | Yes | Yes | Shared code across CI and the image (they are separate programs; the field list is fixed by C3) |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| C3 description | Yes | Yes (no duplicate version fields; `server-package.json` inside equals the description minus `archive`) | Low | Verifier checks equality |
| `state.json` `{ current, previous, trial? }` | Yes | Yes | Low | Each item is `{ source: "builtIn" \| "installed", version }`; `trial` adds `previous`, `dataCopy: boolean` |
| `UpdateState` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/starter/starter.mjs` | Starter | `NodeStarter` | Boot: recovery and cleanup, socket, selection outcome (run or `NEEDS_NEW_IMAGE`), signals, exit (DS-003); the child itself belongs to `ServerSupervisor` |
| `starter/update-service.mjs` | Starter | `UpdateService` | Gates, one run at a time, request log |
| `starter/update-run.mjs` | Starter | `UpdateRun` | DS-006 sequence and rollback |
| `starter/release-source.mjs` | Starter | `ReleaseSource` | URLs, downloads, track resolution |
| `starter/package-verifier.mjs` | Starter | `PackageVerifier` | Signature, SHA-256, fit, description match |
| `starter/package-store.mjs` | Starter | `PackageStore` | Layout, unpack, `state.json`, cleanup, `PackageSelection.choose` |
| `starter/self-check.mjs` | Starter | `SelfCheck` | Candidate start on loopback |
| `starter/server-supervisor.mjs` | Starter | `ServerSupervisor` | The one owner of the server child: spawn, stop, health, port check, modes, exit handling |
| `starter/data-copy.mjs` | Starter | `DataCopy` | Space check, copy, restore, delete |
| `starter/update-status.mjs` | Starter | `UpdateStatus` | `update.json`, `UpdateState` |
| `starter/starter-socket.mjs` | Starter | C2 transport | Local HTTP on the unix socket |
| `starter/cli.mjs` | Starter | C2 client | `update`, `status` subcommands |
| `starter/release-version.mjs` | Starter | `ReleaseVersion` | Grammar and ordering |
| `starter/starter-paths.mjs` | Starter | Constants | Paths, socket, limits |
| `starter/tests/*.test.mjs` (`node --test`) + `scripts/tests/release_version_vectors.json` | Starter / CI | Tests | Unit tests; vectors shared with `release_versions.py` tests |
| `docker/server-package-signing-key.pem` | Image | Public key | Ed25519 public key (the private key is the secret `SERVER_PACKAGE_SIGNING_KEY`) |
| `docker/system-level.json` | Image | System level | `{ level, baseImages: { default, zh }, systemInputsSha256 }` |
| `docker/Dockerfile.monorepo` | Image | Stages | `builder` → `server-package` (deploy + `prisma generate` + mobile web + `server-package.json`) → `runtime` (system part, starter, key, `/opt/autobyteus/system-level`, built-in package); base pinned by digest |
| `docker/entrypoint.sh` | Image | Entry | `.env` creation, hand-over to the base entrypoint |
| `docker/supervisor-autobyteus-server.conf` | Image | Program | Command = starter |
| `scripts/server-package/describe-server-package.mjs` | CI | Writer of C3 and `server-package.json` | Fields, migration folder list |
| `scripts/server-package/sign-server-package.mjs` | CI | Signing | Ed25519 sign from the secret in env; never prints it |
| `scripts/server-package/check-system-level.mjs` | CI | Level check | Hash of the system inputs vs `system-level.json` |
| `scripts/server-package/generate-signing-key.mjs` | Ops | One-time key creation | Writes the public key file; pipes the private key to `gh secret set` |
| `.github/workflows/release-server-docker.yml` | CI | Workflow | Level check; package job per architecture; `contents: write` for the upload; waits for the release to exist |
| `scripts/public/docker/autobyteus-docker.d/bash/{core,commands,container-config,docker-runtime}.sh`, `powershell/*.ps1` | Launcher | Host CLI | Volume, `update`, storage text |
| `autobyteus-server-ts/src/node-update/node-update-routes.ts` | Server | C1 | GET/POST, client address |
| `src/node-update/starter-client.ts` | Server | C2 client | Socket requests to `AUTOBYTEUS_STARTER_SOCKET`; `unavailable` when the variable is absent, `error` when the socket does not answer |
| `src/api/rest/index.ts`, `src/api/security/remote-access-route-policy.ts` | Server | Wiring, route class | Register; classify `/rest/node-update` as `TRUSTED_NETWORK_OWNER` |
| `autobyteus-web/stores/nodeServerUpdateStore.ts` | Desktop | Store | Status, request, poll |
| `autobyteus-web/components/settings/nodes/NodeServerUpdate.vue` | Desktop | Row line | States below |
| `autobyteus-web/components/settings/nodes/NodeRow.vue` | Desktop | Row | Renders `NodeServerUpdate` for remote entries |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Desktop | Texts | New keys |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Desktop | Guide card | `update` command |
| `DESIGN.md`, `GLOSSARY.md`, `RELEASE.md`, `autobyteus-server-ts/docker/README.md` | Docs | — | Rule 9 exception (C1–C4), terms, 23 assets and the key secret, user docs |

Every file stays under 500 lines. `update-run.mjs` is expected to be the largest (about 250).

## Applied Patterns (If Any)

- **State machine:** `UpdateRun` steps (DS-006), and `PackageStore` trial states (`current`/`previous`/`trial`): the A/B update pattern.
- **Adapter:** `NodeUpdateRoutes` + `StarterClient` (HTTP → socket).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/starter/` | Folder | Starter | All starter code and tests | Imports of server or workspace packages |
| `autobyteus-server-ts/src/node-update/` | Folder | Server | C1 and its relay | Update steps, version ordering |
| `scripts/server-package/` | Folder | CI | Describe, sign, level check, key generation | Image or starter code |
| `/opt/autobyteus/starter/` (in image) | Folder | Image | Starter files and public key | Writable state |
| `/opt/autobyteus/server-package/` (in image) | Folder | Image | Built-in server package | — |
| `/home/autobyteus/server-packages/` (volume `<node>-server-packages`) | Folder | Starter | `packages/<version>/`, `downloads/`, `state.json`, `update.json`, `data-copy/` (only during a migration update) | Anything another node can see |

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Mixed-Layer Risk | Justification |
| --- | --- | --- | --- | --- |
| `docker/starter/` | Main-Line Domain-Control (separate program) | Yes | Low | One program, flat folder of 14 small files |
| `src/node-update/` | Transport | Yes | Low | Three files |
| `scripts/server-package/` | Off-Spine (CI) | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Sequence ownership | `UpdateRun.run(): await verifier.verify(desc, sig); …; await supervisor.beginUpdate(); await supervisor.stop(); if (needsCopy) await dataCopy.take(); await store.beginTrial(...)` | `verifier.verify(desc, sig, () => store.unpack(...))` (a callback reaching another collaborator) | Case 1 |
| Two entry forms | Server POST → socket `POST /updates` → `UpdateService.request`; CLI → socket `POST /updates` → `UpdateService.request` | The CLI calling `UpdateRun` directly, skipping the gates | Case 2 |
| Data copy | New migration folders `{"project-task-titles"}` → copy; `{}` → no copy | Always copy; or copy into the shared or data volume | DEC-005; secrets stay in the node's volume |
| Selection at boot | installed `1.5.12` and built-in `1.5.11` → run installed; installed `1.5.11` and built-in `1.5.13` (new image) → run built-in, current = built-in; installed `1.5.12` does not fit the new image and built-in `1.5.11` is older → `NEEDS_NEW_IMAGE`, no server, starter up (AR-001) | Running the built-in whenever the image changed; running the older built-in because it is "the newest that fits" | REQ-012, AC-006 |
| Exit of the trial child | `UpdateRun` awaits `supervisor.start(new)` → the exit arrives as its step result → rollback → `FAILED_AFTER_SWITCH` | The supervising rule ends the starter and boot reports `INTERRUPTED` | AC-004, AR-002 |
| Status during restart | Polls fail → "Restarting…" → new version | Showing "Failed" on the first refused connection | User-visible truth |
| Row texts (DEC-018) | "1.5.11-beta.4 · [Update to 1.5.11-beta.5] · Same version as this app" | "Update to this app's version" | The user's choice |

Row states (`NodeServerUpdate.vue`, remote entries only):
- **Same version:** version only.
- **Node older** (`relation: "newer"` for the app's version): button "Update to <version>", line "Same version as this app".
- **Node newer than the app:** version plus "Newer than this app. Update this app."
- **`inPlaceUpdate: "unavailable"`:** version, or "Version unknown", and no button.
- **Running:** step text (Downloading / Checking / Preparing / Restarting…).
- **Succeeded:** "Updated to <version>".
- **Refused, or failed with the old version running:** the message; for `NEEDS_NEW_IMAGE`, the launcher command with a copy button.

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Starter running both the old `/app` layout and packages | Containers made from older images | Rejected | Old images keep their old entry; the new image has only the package layout; one last `upgrade --all` (DEC-014) |
| Version negotiation between desktop and node for other APIs | Mismatch after an update | Rejected (rule 9) | Only C1–C4 are frozen |
| Keeping `bootstrap.sh` for compose users | Compose variables | Rejected | Dead; variables removed |
| Shared builds volume across nodes (options report §4) | Fewer downloads | Rejected (design) | Per-node volume: the data copy holds the vault and must not be visible to other nodes' agents; per-node download is 313 MB versus 1.4 GB today |

## Derived Layering (If Useful)

`Desktop (C1 client) → Server relay (C1 → C2) → Starter (owner) → GitHub / filesystem / server process (C4)`.

## Change / Refactor Sequence

Each step is reviewed and merged on its own. Build steps match the options report §5.

1. **Signed server package.**
   - Dockerfile: `server-package` stage; runtime copies the built-in package; base pinned by digest; `system-level.json`.
   - `scripts/server-package/*`; workflow package job (needs the release; it polls for it up to 30 min, U-02); `generate-signing-key.mjs`.
   - Create the key: the Solution Designer or implementation tells the user before running `gh secret set SERVER_PACKAGE_SIGNING_KEY` (user's instruction, 2026-10-30).
   - GLOSSARY terms; removal of `bootstrap.sh` and the related environment (Removal plan).
   - Consumers of the moved layout, in this step: `TESTING.md:193-196` rewritten for the package layout; `server_docker_cli_smoke.py`, `nodes-docker-address-probe.mjs`, `prisma-engine-discovery.docker.mjs` paths; `docker-compose.yml` server-packages volume; Docker READMEs.
   - The workflow's three forms as in DS-004 (the package job does not run for `publish_zh`).
   - For this step only, the image still runs the built-in package with `node dist/app.js` through supervisord (no starter yet). The proof is that the published asset is byte-identical to the image's package and verifies with the public key.
   - Re-measure the download (QR-001).
2. **Starter and server volume.**
   - Starter boot, recovery, selection with `NEEDS_NEW_IMAGE`, `ServerSupervisor` (DS-003, DS-007); C1 GET (version and `inPlaceUpdate` from C2; `AUTOBYTEUS_STARTER_SOCKET` presence).
   - Consumers moved to the starter: `prisma-engine-discovery.docker.mjs` takes the server PID from `cli.mjs status` (`server.pid`).
   - Launcher: `<node>-server-packages` volume, config hash; the IMAGE_REF → track table.
3. **In-place update by command.**
   - `UpdateService`, `UpdateRun`, `ReleaseSource`, `PackageVerifier`, `SelfCheck`, `DataCopy`, `UpdateStatus`, socket, CLI, launcher `update` (bash and PowerShell).
   - Proof on a real Docker node built from a clean clone, with a test key and a local release source: AC-001..AC-006, AC-008, AC-012, AC-013. The tests include: an older signed pair renamed to a newer version (`DESCRIPTION_MISMATCH`); a trial that exits at start (`FAILED_AFTER_SWITCH`); a container stop during the copy, during the trial and during the restore (boot outcomes); not enough space for the copy before the stop (refused, nothing changed).
4. **Desktop.** C1 POST, `nodeServerUpdateStore`, `NodeServerUpdate.vue`, texts. AC-001, AC-009, AC-010.
5. **Mid-turn runs come back.** After autobyteus-284, -285 and -287: the stop step relies on the bounded stop, and the resume is automatic (DEC-015). AC-007.

The test release source: `AUTOBYTEUS_SERVER_PACKAGE_SOURCE` (base URL), read by the starter from its own environment only. It is set only in test containers built with a test public key; production images have the GitHub base and the production key.

## Key Tradeoffs

- **The starter owns the update, not the server.**
  - Pro: the trust anchor and the fallback live in a small, rarely changing program, so a broken server release cannot break its own way back.
  - Con: a starter bug needs a new image (the old way).
- **A full loopback start as the self-check, not a new self-check mode.**
  - Pro: no new server code and the most faithful check.
  - Con: about 7–20 s, and it starts background services on an empty temporary data folder (deleted after).
- **Per-node volume, not shared:** 3 downloads on a 3-node machine (0.94 GB versus 1.4 GB today), but no cross-node secrets exposure and no cross-node cleanup coordination.
- **Version ordering in two languages** (Python CI, JS starter), kept identical by a shared test-vector file.

## Risks

- **R-01, silent system needs:** a server that needs a new system tool without a level bump. Mitigated by the CI check on the system inputs and by the self-check. Residual: a tool used only at runtime.
- **R-02, migration then failure:** handled by DEC-005.
- **R-03, signing-key leak:** the key lives only in GitHub; rotation means a new key pair and one new image.
- **R-04, the busy-turn stop is not bounded until 284 merges:** the starter's stop limit (120 s, then SIGKILL of the server's process group, then a port-free check) keeps the update bounded meanwhile. The runs are then lost, as on any restart today, until step 5.
- **R-05, release asset timing (U-02):** the package job waits for the GitHub release the desktop workflow creates. If it never appears, the job fails, and the release is partial in the RELEASE.md sense. Nodes then refuse that version with `NO_PACKAGE_FOR_VERSION`.
- **R-07, confirm window and resume (step 5):** resumed runs may write during the 60 s alive window; a rollback with a data copy drops those writes. This is within DEC-005, which defines a failed update as the new version not coming up. Step 5's design names it.
- **R-06, processes outliving the server** (Case 9): the starter kills the server's process group after exit and checks the port is free before starting the new package. Tool commands in their own sessions are the server's cleanup responsibility (`ServerProcessShutdown`).

## Changes against the options report (refinements within the approved requirements)

- Packages are **not** shared between nodes on a machine: one volume per node (DEC-016 revised by the Solution Designer). There are two reasons:
  - agents run as root on each node, so with a shared writable package volume, one node's agents could change the code another node runs;
  - the data copy holds the node's vault.
  The download becomes about 0.94 GB per release on a 3-node machine instead of 0.31 GB, still less than 1.4 GB today. The user is asked to confirm this changed figure.
- The self-check is a loopback start of the package, with no new server mode.
- The update-request switch was dropped by the user (DEC-004).

## Guidance For Implementation

- Reproduction to start from: `evidence/linux-server-build-measure.sh` (build and deploy steps), plus the start test in `evidence/linux-server-build-result-2026-10-30.txt`.
- Never print the private key or the secret value; the signing script reads it from the environment and writes only the signature.
- Do not touch the user's running nodes `autobyteus-server-0/1/2` or their volumes; use test containers and test volumes only.
- Every refusal code has a test; every step of DS-006 has a failure test (a step forced to fail leaves `state.json` and the data unchanged before `stopServer`, and restores them after).

## Resolution of ARCH-REV-001 (SR-005)

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 | Selection has an explicit third outcome, `NEEDS_NEW_IMAGE`: the starter stays up, serves status, logs, runs no server; the launcher shows the message | DS-003 boot step 4–5; examples |
| AR-002 | `ServerSupervisor` is the one owner of the server child, with modes `supervising` and `updating`, handed over by `beginUpdate`/`endUpdate`; exit-case table | Ownership Map; DS-007 table; Boundary map; file mapping |
| AR-003 | `needsCopy` and the space check come before the stop; the copy is complete before `beginTrial`; rollback order restore → state → delete → start; commit order state → delete; boot recovery and cleanup | DS-006, DS-003 |
| AR-004 | `PackageVerifier` binds version, architecture and asset name after the signature check (`DESCRIPTION_MISMATCH`); a test with an older signed pair renamed | Ownership Map; codes; step 3 tests |
| AR-005 | Consumers of the old layout listed with a decision and a step; TESTING.md rule rewritten; compose volume added | Current-State Read; Change Scope; step 1–2 |
| AR-006 | Three workflow forms traced; no package job for `publish_zh`; AC-011 scoped to default images; zh base digest in the system-level inputs | DS-004 table |
| AR-007 | `beta` = newest recognized release, beta or stable; `stable` = `/releases/latest`; IMAGE_REF → track table with refusals | DS-002; Interface section |
| AR-008 | Removal plan adds `AUTOBYTEUS_WORKSPACE_ROOT`, `.env.example`, the e2e test's SKIP_SYNC; evidence sentence corrected | Removal plan; Current-State Read |
| AR-009 | The starter alone reports the running version; `ServerPackageInfo` removed; `AUTOBYTEUS_STARTER_SOCKET` makes starter presence explicit (`unavailable` versus `error`) | C1, C4, Ownership Map |
| AR-010 | Frozen set names `cli.mjs` arguments, output and exit codes (C2) and `server-package.json` (C3); unknown codes show `message` | Interface section |
| AR-011 | `SelfCheck` environment specified: fresh folder, own `.env`, own temp workspace and home, scratch environment, loopback, free port | Ownership Map |
| AR-012 | Requirements text fixed (REQ-006 row, DEC-005 reasoning, SCN-001, REQ-003 wording to match AC-009); investigation behavior IDs renamed `CUR-001..CUR-007` | requirements-doc.md; investigation-notes.md |
| Residual: DEC-016 figure | Stronger reason stated; the user is asked to confirm | Changes against the options report |
| Residual: status after 5 min | The store keeps polling every 10 s | DS-005 |
| Residual: confirm window and automatic resume | Noted for step 5: resumed runs write data during the 60 s window, and a rollback with a copy drops those writes (within DEC-005: the new version did not come up) | Risks R-07 |
