# Investigation Notes — autobyteus-305 (Docker nodes update their server in place)

## Investigation Meta

- Package identifier: `docker-node-in-place-server-update`
- Request / ticket: Project Task `autobyteus-305` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`
- Repository mode: `Git`
- Task worktree / branch: the worktree above, branch `codex/docker-node-in-place-server-update`
- Resolved base remote / branch / revision: `origin/personal` @ `9d59ab82ece9b3404b4d78f9f1b02f566943a197` (fetched and fast-forwarded 2026-10-30 at the user's request; 452 commits newer than the first base `d74f75a51a` of 2026-10-26; the branch had no commits of its own, only the untracked ticket folder)
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created from the freshly fetched `origin/personal`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities re-read 2026-10-30 after the skill update: `SKILL.md`, `references/requirements-engineering.md` (new: feasibility evidence per requirement; challenge what evidence contradicts), `templates/requirements-doc-template.md` (new Feasibility Evidence column); `RELEASE.md` on the new base (new: release smoke check, build-only release run before every tag, case study v1.5.9-beta.14)
- Authorities read (requirements reading gate; 2026-10-26): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; repository `AGENTS.md`, `DESIGN.md`, `RELEASE.md`, `GLOSSARY.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` (sections 1–5)
- Investigation status: requirements investigation complete; architecture investigation (design reading gate) starts after approval

## Initial Request And Clarifications

- Original request (Task description, the user 2026-10-25): every server change produces a new Docker image; after a desktop upgrade the user must pull a new image and recreate each Docker node. Releases are frequent (1.5.9-beta.1 to beta.7 in about three days) while the OS, Node and Chromium almost never change. He wants the server to upgrade itself inside the same container, triggered by him or by the desktop, so a new image is needed only when the system layer changes.
- Clarification (Project Task Manager message, 2026-10-26): the user's picture is "a Docker container is like a machine with a server running inside it; replace the server running inside the machine". Design ticket first; build only after he approves. The volumes fix (autobyteus-306) is not part of this Task. Restart-and-resume: 284 (bounded shutdown) is running with another team; 285 to 289 follow.
- User-supplied constraints: supply-chain safety (a node never runs code it has not verified); no automatic updates by default; nothing exposed to agents automatically; no secrets in logs; a failed update leaves the old version running; changes to his data folders need his approval and a backup; project vocabulary; proof from a clean clone and on a real Docker node; no release unless asked.
- Initial ambiguity: who may trigger, where builds come from and how they are verified, behavior for a friend's node, failure after the switch, how the starter and the versions fit together.

## Product And Domain Understanding

- Product area: Docker nodes (GLOSSARY: a node is one AutoByteus server; a Docker node on the same machine is still a remote node from the desktop's point of view), the public launcher `autobyteus-docker`, the release pipeline, the desktop's node list.
- Affected actors: the user (desktop + three Docker nodes on one machine today), a friend who runs a node on his own machine, the desktop app, each Docker node, the release workflows, GitHub and Docker Hub.
- Existing purpose: the launcher creates and upgrades containers; the image carries the system layer and the server together.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-26 | Code | `autobyteus-server-ts/docker/Dockerfile.monorepo` | How the image is built | Builder `node:22-bookworm` runs `pnpm install` for the whole workspace and builds; runtime `FROM autobyteus/chrome-vnc:${BASE_IMAGE_TAG}`; apt (git, ripgrep, curl); agent CLIs (Codex, Claude Code, Grok, Antigravity) installed at `latest` with `CLI_INSTALL_CACHE_BUSTER`; then copies the **whole workspace** `/app/node_modules` plus each package's dist; entry `/usr/local/bin/entrypoint.sh` | F-01, F-02 |
| 2026-10-26 | Code | `docker/entrypoint.sh`, `docker/supervisor-autobyteus-server.conf`, `docker/bootstrap.sh` | How the server process starts | entrypoint writes `.env` in the data dir, runs `bootstrap.sh` (a legacy git-sync of `autobyteus-ts`/`autobyteus-server-ts`, skipped because `AUTOBYTEUS_SKIP_SYNC=1` is the default and the launcher sets it), then hands over to the base image's `/entrypoint.sh` (supervisord). supervisord program `autobyteus_server`: `node dist/app.js`, `autorestart=true`, `startretries=20`, root | F-03 |
| 2026-10-26 | Code | `scripts/public/docker/autobyteus-docker.sh` and `autobyteus-docker.d/bash/{core,commands,container-config,docker-runtime}.sh` (PowerShell twin in `autobyteus-docker.d/powershell`) | How upgrade works today | `upgrade --all` requires `--all`; for each managed node `start_node` pulls the image, compares image id and config hash, recreates the container (`docker rm -f` + `docker run`) when either changed, keeps named volumes, then removes unused old images. Volumes per node: `<node>-data` → `/home/autobyteus/data`, `<node>-root-home` → `/root`, `<node>-chromium-profile` → `/home/vncuser/.config/chromium`, `<node>-workspace` → `/app/autobyteus-server-ts/workspace`; bind mounts for the node workspace and the shared folder. Launcher state: `~/.autobyteus/docker-server/nodes/<node>.env` with `IMAGE_REF` (the saved track) | F-04 |
| 2026-10-26 | Code | `.github/workflows/release-server-docker.yml` | How images are published | Every `v*` tag builds and pushes `linux/amd64,linux/arm64` with `CLI_INSTALL_CACHE_BUSTER=${{ github.run_id }}` (forces the CLI layer to rebuild every release), `provenance: false`, `sbom: false`; moves `:beta` forward; stable also moves `:latest`; permissions `contents: read` (it uploads nothing to the GitHub release today) | F-02, F-05 |
| 2026-10-26 | Doc | `RELEASE.md` | Release, rollback, deployment rules | A complete release has 17 GitHub assets (desktop, updater metadata, APK + `.sha256`); Docker users roll back by pinning an earlier tag; a release with an app-data migration normally cannot be rolled back; desktop updates never downgrade; deployment = the published image, upgraded with the launcher | F-05, F-11 |
| 2026-10-26 | Doc | `DESIGN.md` rule 9 | Version rules | Desktop, web UI, embedded server and every node run the same version; no version checks or negotiation, no old and new APIs side by side, clean-cut contract changes | F-12 |
| 2026-10-26 | Doc | `autobyteus-server-ts/docs/design/data_migration_guideline.md` §1–§5 | Data safety on update | Rollback after a migration is normally impossible; extra backup machinery needs an approved contract basis (§5) | F-11 |
| 2026-10-26 | Code | `autobyteus-server-ts/src/server-runtime.ts` | Startup order | Prisma schema migrations, then DB init, vault, app-data migrations, then build server and `listen`, then `recoverAfterListen`; any failure exits through `exitWithEmbeddedServerPlatformFatal`; SIGTERM/SIGINT close Fastify and exit | F-11 |
| 2026-10-26 | Code | `autobyteus-server-ts/package.json`; `grep` for a version in `src/` | Does the server know its release version? | Server package version is `0.1.1`; the release version lives only in `autobyteus-web/package.json` (`1.5.9-beta.9` at base). No server code reports a release version (only Memory Sync's `sourceServerVersion` field) | F-06 |
| 2026-10-26 | Code | `autobyteus-server-ts/src/api/security/remote-access-route-policy.ts`, `remote-access-auth-service.ts`, `remote-access-local-trust.ts` | Who can call a node | Desktops and browsers on the network are "trusted network" (no credential); paired phones carry a credential; route class `TRUSTED_NETWORK_OWNER` refuses phone credentials; `/rest/health` is public | F-07 |
| 2026-10-26 | Code | `autobyteus-web/types/node.ts`, `electron/updater/appUpdater.ts`, `components/settings/NodeManager.vue` (listing) | What the desktop knows | A `NodeEntry` has `id`, `name`, `baseUrl`, `nodeType`, `nodeId`; no node version. The desktop knows its own version (`app.getVersion()`) | F-06 |
| 2026-10-26 | Code | `autobyteus-web/scripts/prepare-server.mjs` | Is there already a portable server build? | Yes for the desktop: `pnpm deploy --legacy` of the server, prune node-pty prebuilds and onnxruntime, validate critical imports and Linux Prisma engines, then rebuild native modules for **Electron**. A Docker build needs the same staging without the Electron rebuild (native modules for the image's Node 22) | F-08 |
| 2026-10-26 | Doc | `tickets/done/update-checks-and-auto-updates/requirements-doc.md` (autobyteus-210) | The user's update rules | "The app itself is never updated automatically" (the user's decision); automatic updates are opt-in per kind; agent-runtime updates on remote or Docker nodes are out of scope ("their runtimes are updated on that node's computer or image", runtime-lifecycle-review D-3) | F-09, F-10 |
| 2026-10-26 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-restart-resume-investigation/tickets/in-progress/agent-restart-resume-investigation/restart-resume-investigation-report.md` (autobyteus-283) | Mid-turn runs after a restart | Step 0 bounded shutdown (autobyteus-284, branch `codex/busy-quit-shutdown-orphan`); step 1 record + manual resume; step 2 off/ask/auto policy; step 3 update-awareness at "install and restart" (count running agents, pass the resume choice as a one-shot intent); each node resumes its own runs; a Docker node runs under supervisord and `docker stop` gives 10 s | F-13 |
| 2026-10-26 | Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/requirements-doc.md` (autobyteus-284) | Can the server stop promptly? | Today stopping a busy run waits for the turn without a time limit (RC-1); the fix (bounded, awaited shutdown) is in progress with another team | F-13 |
| 2026-10-26 | Runtime | `docker images`, `docker ps -a` (read-only) | The user's setup | One local image `autobyteus/autobyteus-server:beta` (9.56 GB uncompressed); three managed nodes `autobyteus-server-0/1/2` on it | F-14 |
| 2026-10-26 | Runtime | `docker history --no-trunc autobyteus/autobyteus-server:beta` | Where the image's size is | Uncompressed: base `chrome-vnc` ≈ 3.5 GB (apt 2.97 GB + 253 MB + python 227 MB …), apt in our stage 36 MB, **agent CLIs 1.5 GB**, **workspace node_modules 1.87 GB**, server dist 29.5 MB, autobyteus-ts dist 9 MB, mobile web 12.8 MB, contracts < 1 MB each | F-01, F-02 |
| 2026-10-26 | Runtime | `docker buildx imagetools inspect --raw` for `1.5.9-beta.7/8/9` and their linux/arm64 manifests; `evidence/layer-diff.py` | What an upgrade downloads | Each beta → next beta adds 30 new layers = **1,373.7 MB compressed** of 2,535.7 MB; the big new layers are 826.7 MB (agent CLIs), 525.5 MB (workspace node_modules) and 14.0 MB (apt); the rest of the new layers ≈ 7 MB. Output: `evidence/layer-diff-output.txt` | F-02 |
| 2026-10-26 | Runtime | throwaway `docker run --rm --entrypoint bash autobyteus/autobyteus-server:beta` (`du` of `/app/node_modules/.pnpm`) | What is in node_modules | The image's node_modules include desktop/web build tools the server never loads: `app-builder-bin` 206 MB, `monaco-editor` 99 MB, `mermaid` 82 MB, `happy-dom`, `typescript`, two `esbuild`s, `7zip-bin`, FontAwesome …; server needs include `@anthropic-ai/claude-agent-sdk-linux-arm64` 222 MB (native, per architecture), `onnxruntime-web` 138 MB, Prisma ≈ 200 MB, `node-pty` 62 MB | F-02, F-08 |
| 2026-10-26 | Runtime | same throwaway container: `node --version`, `/etc/os-release`, `chromium --version`, `tar --version`, supervisord config | The system layer | Ubuntu 24.04.5, Node v22.23.3 (module ABI 127), glibc 2.39, arm64, Chromium 153, GNU tar 1.35, supervisord with `supervisorctl` and `conf.d` include | F-15 |
| 2026-10-26 | Runtime | `docker run --rm --entrypoint node autobyteus/autobyteus-server:beta -e '<ed25519 sign/verify>'` | Can the image verify a signature without new software? | `crypto.verify` with Ed25519 works in the image's Node 22: genuine → `true`, one changed byte → `false` | F-16 |
| 2026-10-26 | Runtime | `du -sh /Applications/AutoByteus.app/Contents/Resources/server`, `tar czf - server \| wc -c` | Size of a production server build | The desktop's packaged server (macOS) is 933 MB, **≈ 311 MB gzipped**; a Linux build for Docker is expected to be similar (estimate; to be measured in build step 1) | F-08 |
| 2026-10-26 | Runtime | `docker system df -v` (host metadata only) | Size of a node's data | Data volumes on this machine: 129 MB (`autobyteus-server-2-data`) to 1.35 GB (`autobyteus-server-0-data`) | F-11 |

### Re-analysis on the new base (2026-10-30, the user asked for a real analysis on the latest `origin/personal`)

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-30 | Command | `git diff --stat d74f75a51a 9d59ab82ec -- autobyteus-server-ts/docker scripts/public/docker .github/workflows autobyteus-server-ts/src/api/security autobyteus-server-ts/src/remote-access autobyteus-web/scripts/prepare-server.mjs DESIGN.md` | Did the surfaces this ticket relies on change? | No change in the Dockerfile, entry scripts, launcher (bash and PowerShell), release workflows, route policy, remote access, desktop server packaging, DESIGN.md. Changed: `RELEASE.md` (release smoke check, build-only release run before every tag), `GLOSSARY.md` (Memory and MCP secret words; no node words), `server-runtime.ts` (see next row) | F-01..F-08 still hold |
| 2026-10-30 | Code | `autobyteus-server-ts/src/server-runtime.ts`, `src/shutdown/server-process-shutdown.ts` (from the Windows/embedded shutdown work, 2026-10-24) | Shutdown on the new base | One owner (`ServerProcessShutdown`) now handles SIGINT/SIGTERM and the desktop's IPC shutdown request, with a startup barrier (a shutdown during startup cancels it at the next stage) and one cleanup. It does not bound a busy turn: that is still autobyteus-284 | F-13 |
| 2026-10-30 | Command | `git merge-base --is-ancestor codex/busy-quit-shutdown-orphan origin/personal`; branch log | Is 284 delivered? | Not merged; its last commit (2026-10-30) records code review CRR-003 Pass. `codex/agent-restart-resume-investigation` (283 report) unmerged; 285 and 287 not started | PRQ-001/002 |
| 2026-10-30 | Command | `git for-each-ref refs/tags` since 2026-10-23 | Release pace | 23 releases in 8 days: `v1.5.9-beta.1` (10-23) … `v1.5.9-beta.15`, `v1.5.9`, `v1.5.10-beta.1`, `v1.5.10`, `v1.5.11-beta.1` … `v1.5.11-beta.5` (10-30) | Problem statement |
| 2026-10-30 | Runtime | registry manifests for `1.5.10`, `1.5.11-beta.1..5`, both architectures; `evidence/layer-diff.py`; output `evidence/layer-diff-output-2026-10-30.txt` (manifests in `evidence/arm64/`, `evidence/amd64/`) | Re-measure the per-upgrade download | arm64: 1,378.7 / 1,390.9 / 1,399.0 / 1,399.0 / 1,399.0 MB; amd64: 1,413.1 / 1,425.9 / 1,436.1 / 1,436.1 / 1,436.2 MB. CLI layer grows (arm64 831 → 852 MB; amd64 863 → 886 MB); node_modules layer 526–529 MB; apt 14 MB. beta.3→4→5 CLI layers have equal size but new digests (rebuilt; whether the CLI versions changed was not checked) | F-02 |
| 2026-10-30 | Runtime | layer digests of `1.5.9-beta.7` vs `1.5.11-beta.5` (arm64) | Premise: the system layer rarely changes | Layers 0–26 (the `chrome-vnc` base: Ubuntu, Chromium, desktop, 1,162 MB compressed) are byte-identical across all 23 releases. **Premise confirmed** (Measured) | — |
| 2026-10-30 | Runtime | clean clone of `9d59ab82ec` built in `node:22-bookworm` (arm64): `pnpm install --frozen-lockfile`, contract builds, `prisma generate`, server `build`, `pnpm --filter autobyteus-server-ts deploy --legacy`; script `evidence/linux-server-build-measure.sh`, result `evidence/linux-server-build-result-2026-10-30.txt` | Real size of a Linux server build (ASM-001) | Deployed folder 885 MB, **235 MB** gzipped; it did not start (`Named export 'Prisma' not found`) because the deployed folder had no generated Prisma client. After `prisma generate` inside the deployed folder (what `prepare-server.mjs` does): 1.1 GB, **313 MB** gzipped. Largest parts: `claude-agent-sdk-linux-arm64` 224 MB (native, per architecture), `onnxruntime-web` 147 MB, `node-pty` 71 MB, Prisma engines; also `happy-dom` 25 MB, `typescript` 24 MB, `esbuild` 20 MB that a server at runtime likely does not need (trimming is a step-1 refinement, not measured) | F-08, QR-001 |
| 2026-10-30 | Runtime | that deployed folder mounted **read-only** into the published image `autobyteus/autobyteus-server:beta` (`6d52877c3685`), `node dist/app.js --host 127.0.0.1 --port 8123 --data-dir /tmp/d` with a `.env` like `entrypoint.sh` writes | Can a server built outside the image run on the image's system layer? | **Healthy after 7 s** (`/rest/health` ok; "Server listening on 127.0.0.1:8123"). A build made outside the image runs on the image's Node 22 / Ubuntu 24.04 / glibc 2.39, and needs no write access to its own folder (Reproduced) | REQ-001 feasibility |
| 2026-10-30 | Web (known practice, not fetched) | VS Code Remote (`~/.vscode-server`), WordPress and Nextcloud built-in updaters, Jenkins plugin updates in its volume, linuxserver.io Plex image `VERSION`; A/B updates (Android, ChromeOS) | Is this common? | In-container code updates are an established pattern; VS Code Remote matches the "client asks the server to match its version" shape. Counterpoint: Docker practice prefers immutable images (linuxserver.io recommends image updates), because in-place changes hide what runs; the design answers with signed builds, an exact version report, and the image as the path for system changes | DEC-001 |

## Relevant Existing Behavior And Supported Product Paths

Current-behavior IDs are `CUR-*` (renamed from `BEH-*` at SR-005, ARCH-REV-001 AR-012), so they do not collide with the requirements' `BEH-*` IDs.

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| CUR-001 | Operational | The user runs `autobyteus-docker upgrade --all [--tag …]` on the machine that hosts the nodes | Pull the saved (or given) image ref → for each node whose image or config changed, remove the container and run a new one with the same named volumes → remove unused images | Every node on that machine moves to the image's version; data, root home, Chromium profile and workspace volumes are kept; anything else in the container (software installed with apt or `npm -g`) is lost | F-04 | High (Read) |
| CUR-002 | User | The user updates the desktop app (Settings → Updates) | The desktop and its embedded server move to the new version; Docker nodes keep their version until the user runs BEH-001 | Rule 9: running different versions is the user's to fix | F-05, F-12 | High (Read) |
| CUR-003 | System | Server process exits | supervisord restarts it in the same container (`autorestart=true`, up to 20 retries) | The same server build restarts | F-03 | High (Read) |
| CUR-004 | System | Server start | Prisma migrations → DB → vault → app-data migrations → listen → recovery | A start failure exits the process with a fatal code | F-11 | High (Read) |
| CUR-005 | User | The user opens a remote node in the desktop | The desktop talks to the node's GraphQL/REST over the network without a credential | The node does not know or report its release version; the desktop shows none | F-06, F-07 | High (Read) |
| CUR-006 | System | A node restarts while runs are mid-turn | Nothing is recorded or resumed today; the user messages each agent | The 283 chain (284 → steps 1–5) brings them back once built | F-13 | High (Read) |
| CUR-007 | — | In-place update of a node's server | `No current supported behavior` | — | — | — |

## Relevant Codebase And Technical Facts

| ID | Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- | --- |
| F-01 | `Dockerfile.monorepo` runtime stage | One image = base system (`chrome-vnc`) + apt + agent CLIs + server | The "system layer" is everything except the server build | Split the server build into its own stage; the image keeps a built-in copy |
| F-02 | CLI layer + workspace node_modules | 1.35 GB of the 1.37 GB per-release download is the CLI layer (forced fresh every release) and a node_modules that includes desktop build tools | The download problem is mostly accidental image layering, not the server's size | A server-only production build is ≈ 0.3 GB (estimate); the image would also shrink |
| F-03 | `entrypoint.sh` + supervisord program | supervisord runs `node dist/app.js` directly | A starter can sit where supervisord's command is today | `bootstrap.sh` (legacy git sync, always skipped) is a dead path in the entry the change touches |
| F-04 | Launcher `start_node`/`run_container` | Creates containers with four named volumes and two bind mounts; config hash decides recreation | A new volume for server builds needs one recreation through the launcher | PowerShell twin must change too |
| F-05 | Release workflows | Docker workflow pushes images only; desktop/Android upload assets to the GitHub release | Server builds need a new publication path | `contents: write` and coordination with the release the desktop workflow creates |
| F-06 | Version | No server reports a release version; the desktop knows its own | The node must report its version for "match the desktop" | New, small status surface |
| F-07 | Route policy | Trusted network without credential; phones refused on owner routes | The update trigger belongs with owner routes; phones must not trigger it | Real cross-node authentication is autobyteus-300's |
| F-08 | `prepare-server.mjs` | Produces a portable server for the desktop (then rebuilds native modules for Electron) | A Docker build can reuse the staging, without the Electron rebuild | Native modules (node-pty, Prisma engines, claude-agent-sdk binary) make the build per architecture and per Node ABI |
| F-09 | autobyteus-210 decisions | The app is never updated automatically; automatic updates are opt-in per kind | A node's server update follows the same rule | — |
| F-10 | runtime-lifecycle-review D-3 (in 210) | Agent runtimes on Docker nodes are updated by the image | With in-place updates the CLIs stay at the image's versions between image upgrades | Visible behavior change; a decision for the user |
| F-11 | Startup + migration guideline + data volume sizes | Migrations run before listen; a migrated data folder cannot normally run an older build | "A failed update leaves the old version running" needs care when the new version fails after it has started | Copy the data folder before the switch, or accept today's rollback limits; 0.13–1.35 GB here |
| F-12 | DESIGN.md rule 9 | No version checks or cross-version contracts | Updating a node is the one place where a newer desktop must talk to an older node | Needs a narrow, frozen exception |
| F-13 | 283/284 | Bounded shutdown and resume are separate, planned work | "Mid-turn runs come back" depends on them | Prerequisite for the last build step |
| F-14 | The user's machine | 3 nodes share one image | Today one pull serves 3 nodes; in-place, each node would download its own build unless nodes on a machine share it | Design: share downloaded builds per machine |
| F-15 | System layer facts | Node 22 ABI 127, glibc 2.39, arm64/amd64, GNU tar, supervisord | The compatibility check can read these from the running system | A build declares what it needs; the node refuses an incompatible build before changing anything |
| F-16 | Node `crypto` | Ed25519 verify available in the image | Signature verification needs no new software in the image | Public key baked in the image; private key a CI secret |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Server build archive per architecture (new), its manifest and signature (new); the image's built-in server (changes shape); launcher state files (`IMAGE_REF`, unchanged meaning).
- Readers/writers: release workflow (new writer), the starter (new reader), the launcher (new volume).
- Evidence: F-01, F-04, F-05, F-08.

### Structural Surfaces

- Image entry and supervisord program; launcher (bash + PowerShell); release workflow; server: version/status and update request routes; desktop: Nodes page.
- Existing surfaces that help: supervisord restart, named-volume handling in the launcher, `prepare-server.mjs` staging, owner route class, `/rest/health`, Node Ed25519.

### Potential Structural Impacts To Investigate

- API or external-contract change: yes (a frozen node-update contract across versions; a new GitHub release asset family).
- Persistence schema or invariant change: no app-data schema change expected; a new server-builds volume; possible data-folder copy (decision).
- Security or privacy boundary change: yes (code download and execution; signing key custody; who may trigger).
- Concurrency or lifecycle change: yes (process switch inside the container; fallback; shared builds between nodes on a machine).
- Deployment/migration: one last image upgrade the old way to install the starter and the new volume.
- Confirmed absent today: any in-place update path, any server-version report, any signed server artifact.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Registry manifests + `layer-diff.py` | Upgrade beta.7→beta.8 and beta.8→beta.9 on a machine that has the older image | 1,373.7 MB and 1,373.6 MB to download (linux/arm64) | Measured | The pain is real and mostly in two layers | `evidence/layer-diff-output.txt`, `evidence/man-*.json`, `evidence/idx-*.json` |
| `docker history`; throwaway `du` | Composition of the image | CLIs 1.5 GB, node_modules 1.87 GB (with desktop build tools) | Measured | A server-only build is much smaller than the image | this file, Source Log |
| Throwaway Node run | Signature verify in the image | Ed25519 genuine `true`, tampered `false` | Reproduced | "Verified before it runs" is cheap to implement | this file |
| `du`/`tar czf` of the installed desktop's server | Production server build size | 933 MB / ≈ 311 MB gzipped (macOS) | Measured (macOS); Linux estimated | In-place download ≈ 0.3 GB per release | this file |

- Temporary diagnostics: `None` (only throwaway `--rm` containers from the published image; the user's three nodes and their volumes were not touched; `docker system df -v` reads host metadata only).
- Reproduction for implementation to start from: `evidence/layer-diff.py` (re-measure the image download after build step 1).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user, 2026-10-25 (Task) | No image re-download per release; update from the app or the desktop | Direct | REQ-001..REQ-004 | Trigger and source (DEC-002, DEC-003) |
| The user (Task constraints) | Verified code only; no automatic updates by default; failure keeps the old version; data changes need approval and backup | Direct | REQ-005..REQ-009 | DEC-005 |
| The user, 210 decision | The app is never updated automatically | Direct, recorded | REQ-006 | — |
| PTM message 2026-10-26 | Picture: replace the server inside the machine; 306 is not part of this Task | Direct (relayed) | Scope Guardrail | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| GitHub release assets | github.com/AutoByteus/autobyteus-workspace releases | Downloads by `releases/download/<tag>/<asset>` are not REST API calls (no 60/h quota) | 210's investigation of the REST quota; RELEASE.md | Release created by another workflow: ordering |
| Docker Hub | `autobyteus/autobyteus-server` | Anonymous pulls are rate-limited per IP; the container has no Docker daemon | release workflow | Not chosen as the build source |
| Base image `autobyteus/chrome-vnc:latest` | external tag | Floating tag; part of the system layer | Dockerfile | A base change is a system-layer change |
| Vendor CLIs at `latest` | npm / vendor installers | Refreshed only when the image is rebuilt | Dockerfile | Freshness on in-place nodes (DEC-006) |

## Persisted Data And State Facts

- Affected stored subject: none of the server's app data changes shape because of this feature. New: server builds (software) and update status. Possibly: a copy of the data folder taken before a switch (DEC-005).
- Location: data volume `/home/autobyteus/data` (DB, logs, memory, media, agents, skills); new server-builds storage (design).
- Approximate volume: data 0.13–1.35 GB on this machine; one server build ≈ 0.3 GB compressed / ≈ 0.9 GB unpacked (estimate).
- Current readers and writers: the server; the new version's migrations may convert data at its first start.
- Required preservation: all of the data volume; the old version must be able to run again after a failed update.
- Acceptable loss: none of the user's data; old server builds beyond the previous one may be deleted.
- Remaining gap: whether the new version's migrations ran before a failure (decides whether the old version can run on the data as left).

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The desktop surface (a version and an Update action on the Nodes page) is small; Product Design can be asked for build step 4 if the user wants it.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `options-report.md` | Solution Designer | The user-facing report: options, recommended design (proposal), build order, questions | Whole ticket | All | Ready for the user | Part of the approval basis (the decisions in it are the requirements' DEC rows) |
| `evidence/layer-diff.py`, `evidence/layer-diff-output.txt`, `evidence/man-*.json`, `evidence/idx-*.json` | Solution Designer | Measured per-release download | F-02 | QR-001 | Current | Evidence only |
| `evidence/layer-diff-output-2026-10-30.txt`, `evidence/arm64/`, `evidence/amd64/`, `evidence/idx-1.5.1*.json` | Solution Designer | Re-measured per-release download on the newest images, both architectures | F-02 | QR-001 | Current | Evidence only |
| `evidence/linux-server-build-measure.sh`, `evidence/linux-server-build-result-2026-10-30.txt` | Solution Designer | Real Linux server build size and start test on the published image | F-08 | REQ-001, QR-001 | Current | Evidence only; implementation starts step 1 from it |
| `follow-ups.md` | Solution Designer | Findings outside this ticket | — | — | Current | Not approval-bearing |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-01 | Unknown | Exact compressed size of a Linux server build | The bandwidth claim | Measured 2026-10-30: 313 MB gzipped (arm64, working build); trimming in step 1 | Resolved |
| U-03 | Unknown | A partial release can lack the Docker workflow's output (v1.5.9-beta.14 had only Android, iOS and Docker; the reverse can happen) | "Match the desktop's version" fails when no server build was published for that version | The node refuses with "no server build published for X" (AC-013) | Addressed in requirements |
| U-02 | Unknown | Whether the release created by the desktop workflow exists when the Docker workflow finishes | Upload of build assets | Design (architecture investigation) | Open |
| R-01 | Risk | A server release silently needs something new in the image (a package, a CLI) | An updated node would break | A system-layer check in CI and in the node (REQ-008) | Addressed in requirements |
| R-02 | Risk | A new version migrates data, then fails | The old version may not run on converted data | DEC-005 | Needs user |
| R-03 | Risk | Signing-key leak | Anyone could sign a build | Key only in a CI secret; rotation = new image | DEC-003 |
| R-04 | Risk | Restart-and-resume not ready | "Mid-turn runs come back" fails | Build step 5 waits for 284 and resume step 1 | Prerequisite |

## Requirement Implications

- Re-measured 2026-10-30 on the newest releases: 1.38–1.40 GB (arm64) and 1.41–1.44 GB (amd64) per upgrade, growing with the CLI layer; the system base was byte-identical across 23 releases; a working Linux server build is 313 MB compressed and runs on today's image unchanged (Measured, Reproduced). This supersedes the estimate below.
- The per-release download is 1.37 GB per architecture today (Measured), of which ≈ 7 MB is the server's own new code; a server-only build is ≈ 0.3 GB (estimate). Both the in-place way and the middle way can cut the download; only the in-place way avoids recreating the container and lets the desktop update a node on another machine.
- No current behavior exists for an in-place update, a node version report, or a signed server artifact.
- The update path must work from an older node version to a newer one: a narrow exception to rule 9 (DEC-007).
- Agent CLIs on in-place nodes would stay at the image's versions (DEC-006).
- Mid-turn runs depend on the 283 chain (Prerequisites).

## Architecture Investigation Findings

Design reading gate passed 2026-10-30 (`references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md`).

| ID | Method | Source | Finding | Design use |
| --- | --- | --- | --- | --- |
| A-01 | Run (throwaway container) | published image `/etc/supervisor/supervisord.conf`, `conf.d/base.conf`, `/entrypoint.sh` | Base supervisord includes `conf.d/*.conf`; base programs are dbus, tigervnc, xfce, fcitx, copyq, chrome, socat, websockify; our server program file is ours | The starter replaces our program's command; the `chrome-vnc` base is unchanged |
| A-02 | Read | `src/shutdown/server-process-shutdown.ts:9-47` | SIGINT/SIGTERM and an optional IPC request lead to one awaited cleanup and exit 0/1; startup is cancelled at the next stage | The starter stops with SIGTERM; the IPC wire (desktop protocol) is not used, keeping C4 frozen |
| A-03 | Read | `src/app.ts:17-80`, `src/config/app-config.ts:150-186` | Arguments `--host --port --data-dir`; app root = folder with `package.json` + `dist/app.js`/prisma | Start contract C4; each package folder is its own app root |
| A-04 | Read | `src/api/security/remote-access-route-policy.ts:65-67,73-85,167-170`; `src/api/rest/health.ts:3-8`; `src/api/rest/index.ts` | Route classes; phones refused on owner routes; health public; REST registration | `/rest/node-update` as `TRUSTED_NETWORK_OWNER` |
| A-05 | Probe | `curl` to `github.com/AutoByteus/autobyteus-workspace/releases/download/v1.5.11-beta.5/latest-linux.yml` (302), a missing asset (404), `/releases/latest` (302 → `v1.5.10`), `/releases.atom` (lists `v1.5.11-beta.5` first) | No REST API quota is used for downloads or track resolution | `ReleaseSource`; `NO_PACKAGE_FOR_VERSION` from the 404 (U-03) |
| A-06 | Read | `scripts/release_versions.py:1-29` | Recognized versions `X.Y.Z`, `X.Y.Z-beta.N`, semver precedence | `release-version.mjs` with shared test vectors |
| A-07 | Command | `git diff --name-only --diff-filter=A <tag>..<tag> -- prisma/migrations src/app-data-migrations/migrations` over the 23 tags since `v1.5.8` | 3 of 23 releases added migration folders (1.5.9-beta.3: 5 app-data; beta.5: 2; beta.9: 1); one folder per migration | `dataMigrations` in C3; copy only when new folders appear (DEC-005) |
| A-08 | Read | `components/settings/AboutSettingsManager.vue:205-206`; `components/settings/nodes/NodeRow.vue` (223 lines) | `appUpdateStore.currentVersion` is the app's version owner; rows exist per node | Desktop target version; `NodeServerUpdate.vue` child of the row |
| A-09 | Read | `Dockerfile.monorepo:95-122`; `entrypoint.sh:30-36`; `container-config.sh:34`; `DockerRuntime.ps1:396`; `docker-compose.yml:21-31`; `docker-start.sh:250-254`; `grep autobyteus-bootstrap` | `bootstrap.sh` exits at line 14 for the only value in use; no other caller | Removed (Principle 7) |
| A-10 | Read | `scripts/tests/test_public_docker_launcher_*.py`, `scripts/github-set-release-server-docker-secrets.sh` | Launcher tests are Python; secrets are set by a script with `gh` | Launcher tests extended; key creation with `gh secret set` |
| A-11 | Command | `gh auth status`; `gh secret list -R AutoByteus/autobyteus-workspace` (names only) | `gh` is signed in with `repo` scope; Docker Hub, Apple, Android secrets exist | The signing key is created with `gh secret set` in step 1, with the user told first |
| A-12 | Command | `gh run list --workflow release-server-docker.yml --limit 8` | 34–47 min per run | DEC-011 context; FU-003 |
| A-13 | Read | `src/config/app-config.ts:150-186`; `src/application-bundles/utils/bundled-application-resource-root.ts:13-20`; `src/api/static/mobile-web.ts:8` | The server reads its app root (mobile web, bundled resources) and does not write there; the read-only start test agrees | Packages stay read-only after unpack |

Unknowns left to implementation: U-02 (the package job waits for the release the desktop workflow creates); exact stop and confirm timings once autobyteus-284 merges.

## Notes For Architecture Design

- Map SCN-001..SCN-007 (requirements doc).
- Verified constraints: Node 22 ABI 127 / glibc 2.39 / arm64+amd64 in today's image; Ed25519 available; GNU tar; supervisord restarts a dead program; `/rest/health` is public; owner route class refuses phones.
- Remove the dead legacy git-sync path (`bootstrap.sh`, its env in `docker-compose.yml`) if the image entry is changed (Core Principle 7, touched file).
