# Investigation Notes

## Investigation Meta

- Package identifier: `server-docker-build-speed` (Project Task `autobyteus-520`)
- Request / ticket: autobyteus-520, "Speed up the Server Docker release build" (FU-002 of the beta.9 release, autobyteus-519)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed`, branch `codex/server-docker-build-speed`
- Resolved base remote / branch / revision: `origin/personal` at `1fdca761aaea6bb03eacc19f2deb1f76505501e0` (fetched 2026-11-17)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md)
- Bootstrap result: worktree created from freshly fetched `origin/personal`
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read: requirements gate `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md` (2026-11-17); architecture gate in `design-spec.md`
- Investigation status: Complete for requirements and design; final numbers come from the build-only run (AC-001)

## Initial Request And Clarifications

- Original request: the founder (2026-11-17, relayed by the beta.9 delivery engineer): "Earlier the time used is mostly just, I guess, one hour ... now it's like way more than one hour ... we should create a ticket to solve it." His earlier question about building the server package apart from Docker was withdrawn ("forget what I said").
- Clarifications received: none needed; the Task (autobyteus-520) gives the direction, constraints and Done-when.
- User-supplied facts and constraints: keep "the published package is the image's own" (autobyteus-305/412) or an equivalent stated guarantee; the six package files and the Docker `:beta`/`:latest` tag rules stay; prove it with a build-only run and a before/after step table; no release without the founder's word; never move or delete a published tag; no secrets in logs; finalized on `personal` like any change; do not touch the beta.9 release in progress; RELEASE.md says what changed and how to rerun a failed architecture; the next release uses it (PM verifies).
- Initial ambiguity: whether to keep any layer cache; how a build-only run of this workflow works (the workflow has no build-only mode today; the referenced run 44105389247 is the Desktop Release's build-only mode).

## Product And Domain Understanding

- Product area: release pipeline, `Server Docker Release` workflow (`.github/workflows/release-server-docker.yml`) and the order between it and `Desktop Release` on the GitHub release.
- Affected actors or systems: the founder and delivery engineers (wait for a release), Docker users (`autobyteus/autobyteus-server` tags), desktops and Docker nodes (updater files and server packages).
- Existing operational purpose: on a tag push, build the multi-arch server image, push its tags, move `:beta`, then take the server package out of the pushed image per architecture, sign it and upload six files to the GitHub release; the Desktop Release publishes its updater files only after those six files are there.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17 | Code | `.github/workflows/release-server-docker.yml` (400 lines) | Current pipeline | One job builds `linux/amd64,linux/arm64` on `ubuntu-latest` with QEMU; `cache-from/to: type=gha,mode=max`; `Move beta tag` after the build; package job `needs: [prepare-release, build-and-push]` extracts `/opt/autobyteus/server-package` from `IMAGE:TAG --platform`; package job waits 30 min for the GitHub release | Design |
| 2026-11-17 | Code | `autobyteus-server-ts/docker/Dockerfile.monorepo` | Where build time goes | `builder` stage (`node:22-bookworm`): pnpm install, contract builds, prisma generate, server build, mobile web build, `pnpm deploy` with native modules; `runtime` stage FROM pinned `chrome-vnc` digest, apt-get, cache-busted CLI install; package copied into `/opt/autobyteus/server-package` | Dockerfile unchanged by design |
| 2026-11-17 | Code | `.github/workflows/release-desktop.yml` lines 1-80, 584-756 | Order contract, build-only mode, arm runner | "Wait for the server packages" polls 120 x 30 s (60 min); Desktop already uses `runs-on: ubuntu-24.04-arm` for Linux ARM64; its build-only mode is `workflow_dispatch` with `publish_release=false` | Reuse runner label |
| 2026-11-17 | Runtime | `gh run view 44105389247` | The referenced build-only run | It is a Desktop Release dispatch (`publish_release` false) on `codex/bundled-claude-code-514`; "Build Linux ARM64" ran on `ubuntu-24.04-arm` in 7 min 17 s | Server Docker needs its own build-only mode |
| 2026-11-17 | Runtime | `gh run list --workflow release-server-docker.yml -L 15` and `gh run view <id> --json jobs` for 44123354990, 44047761247, 44001643374, 43211753804 | Per-step timings | See Runtime table | Before/after table |
| 2026-11-17 | Runtime | `gh run view 44047761247 --log --job 133917650725`, `gh run view 44001643374 --log --job <build job>`; parsed with `/tmp/sd520/scripts/steps.py` (BuildKit `#N DONE`/`CACHED` lines) | Which Dockerfile steps and exports take the time | See Runtime table | — |
| 2026-11-17 | Runtime | `gh api repos/AutoByteus/autobyteus-workspace/actions/cache/usage` and `.../actions/caches?per_page=100` | Cache limit claim | 11,021,901,306 bytes in 102 entries; 87 entries under `refs/tags/v1.5.13-beta.8`, the largest being `buildkit-blob-*` entries of 508-942 MB each | — |
| 2026-11-17 | Runtime | `gh release view <tag> --json createdAt` vs run start for beta.6-beta.9; `gh run list --workflow release-android.yml` | When the GitHub release exists | The Android APK Release creates the release about 6-7 min after the tag push (beta.6: 11:44:38 -> 11:50:22; beta.9: 16:13:50 -> 16:20:38); the Desktop Release about 30 min | Package job wait margin |
| 2026-11-17 | Web | `https://hub.docker.com/v2/repositories/autobyteus/autobyteus-server/tags/1.5.13-beta.8` | Image size for disk needs | amd64 2.44 GB, arm64 2.41 GB compressed | Disk guard |
| 2026-11-17 | Command | `gh repo view AutoByteus/autobyteus-workspace --json visibility,diskUsage` | Runner cost; checkout size | `PUBLIC`; 2.65 GB | Standard GitHub-hosted arm64 runners are free for public repositories |
| 2026-11-17 | Code | `scripts/release_versions.py`, `scripts/server-package/*.mjs`, `scripts/check_licensing.py` | What each job needs from the checkout | `is-newest` reads `git tag -l` (or `--tags-file`); package scripts need only `scripts/server-package/` and `autobyteus-server-ts/docker/server-package-signing-key.pem`; the licensing check runs `git ls-files` (works at depth 1) | Lighter checkouts |
| 2026-11-17 | Code | `scripts/tests/test_server_package_release.py`, `test_release_channel_workflow_steps.py`, `test_server_docker_cli_latest_defaults.py`, `test_docker_build_context_sources.py` | Tests that pin the workflow | They extract named steps (`extract_step`) and run them with fake `docker`/`gh`/git origins; they assert `needs: [prepare-release, build-and-push]`, the matrix, the `if` conditions and the beta-tag behaviour | Implementation updates them |
| 2026-11-17 | Doc | `RELEASE.md` (release table line 284, order 286-333, recovery 335-400, Server Docker tags 498-502, system level 522-523), `autobyteus-server-ts/docker/README.md` "GitHub Release Automation" | Contracts to keep and docs to update | Order contract and 30/60-minute waits are documented; recovery uses `gh run rerun <run-id> --failed` | Docs sync |
| 2026-11-17 | Code | `git show --stat cc9e2855ec` ("ci(release): free disk before server docker build", 2026-06-01) | Why the disk cleanup exists | Added when runners had less free disk; today `df -h /` shows 79 GB free before cleanup (145 GB disk) | Disk guard instead of unconditional cleanup |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Tag push `v*` | Resolve metadata -> one job builds both architectures (arm64 under QEMU) and pushes the version tag (and `:latest` for stable) -> `Move beta tag` -> package jobs per architecture | Build step 27-46 min (beta.6-beta.8), > 95 min for beta.9; whole run 39-60 min | Runtime table | Measured |
| BEH-002 | Contract | autobyteus-305/412 | Package jobs take `/opt/autobyteus/server-package` out of the pushed tag's image for each platform, archive, describe, sign and upload `.tar.gz`, `.json`, `.json.sig` | The published package is the image's own | Workflow lines 287-400 | Read |
| BEH-003 | Contract | autobyteus-412, RELEASE.md 286-310 | Desktop publish job waits up to 60 min for the six package files, then uploads `latest*.yml` | Every `latest*.yml` is newer than the six package files | release-desktop.yml 700-756 | Read |
| BEH-004 | Contract | RELEASE.md 498-502 | Version tag; `:latest` for stable only; `:beta` moved forward only when the tag is the newest recognized release tag, decided after the build with freshly fetched tags; zh variant manual only, no `:beta`, no packages | Unchanged tag rules | Workflow, tests in `test_release_channel_workflow_steps.py` | Read |
| BEH-005 | Operational | `workflow_dispatch` with `release_tag` (+ `publish_zh`) | Re-publishes an existing tag (default or zh) | Re-publish replaces the package files with `--clobber` | Workflow lines 7-25, RELEASE.md | Read |
| BEH-006 | Operational | Failed job | `gh run rerun <run-id> --failed` reruns the single build job, which builds both architectures again | A failed arm64 build costs a full two-architecture rebuild | RELEASE.md 375-380 | Read |
| BEH-007 | Operational | None today | No build-only mode for the Server Docker Release: every dispatch publishes | — | Workflow inputs | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `release-server-docker.yml` job `build-and-push` | QEMU + Buildx, one `build-push-action` per variant for both platforms, GHA cache, summary, Move beta tag | Main cost | Split per architecture on native runners, merge by digest |
| `release-server-docker.yml` job `publish-server-package` | Matrix per platform; full checkout (2.3-2.4 min), unconditional disk cleanup (1.5-2.6 min), extract from tag, sign, wait 30 min for release, upload | ~6 min per job on the critical path | Sparse checkout, conditional disk cleanup, extract from the verified per-architecture digest |
| `release-desktop.yml` "Wait for the server packages" | 60-min poll for six files | Must keep working; a faster server run only helps | Unchanged |
| `Dockerfile.monorepo` | Builder stage is architecture-specific (native modules: node-pty, onnxruntime, Prisma engines; `pnpm deploy`) | A native runner builds each architecture without emulation | No Dockerfile change needed; `$BUILDPLATFORM` cross-build not needed once each runner is native |
| `scripts/server-package/check-system-level.mjs` | Hashes base digests and the runtime stage up to the end-of-system-part marker | Must still run before each build | Unchanged; run in each build job |
| `scripts/release_versions.py is-newest` | Reads `git tag -l` | Beta decision after both builds | Keep the `Move beta tag` step script unchanged; give its job a cheap full-history (treeless) checkout |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Docker Hub `autobyteus/autobyteus-server` tags and per-architecture manifests; GitHub release assets `autobyteus-server-<version>-linux-<x64|arm64>.{tar.gz,json,json.sig}`.
- Readers: Docker users and the launcher (`autobyteus-docker upgrade --tag beta|latest`), Docker nodes (server packages), the Desktop Release wait step.
- Evidence paths: RELEASE.md table line 284; docker README "GitHub Release Automation".

### Structural Surfaces

- CI workflow jobs, runners, registry pushes, GitHub release uploads, the signing secret.
- Existing structural surfaces that support the change: `ubuntu-24.04-arm` (already used by Desktop), `docker/build-push-action` push-by-digest outputs, `docker buildx imagetools create`, `actions/upload-artifact`/`download-artifact`.

### Potential Structural Impacts To Investigate

- API or external-contract change: none to tags or asset names (preserved).
- Persistence schema or invariant change: none.
- Security or privacy boundary change: secrets usage unchanged (Docker Hub login, signing key); build-only adds no new secret.
- Concurrency or lifecycle change: jobs run in parallel; build-only must not share the release concurrency group.
- Deployment/ownership change: workflow only.
- Confirmed: no app code or Dockerfile change.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| Job/step timings via `gh run view --json jobs` | beta.6 run 43211753804 | Build job 52:59 (build step 47:58); package jobs ~6:20; run 59:30 | Measured | Baseline | this table |
| same | beta.7 run 44001643374 | Build job 52:43 (build step 45:43); package jobs ~5:50; run 58:48 | Measured | Baseline | — |
| same | beta.8 run 44047761247 | Build job 31:42 (build step 27:20); package jobs 5:38 / 7:09; run 39:00 | Measured | Baseline | — |
| same | beta.9 run 44123354990 | Build step started 16:16:24, still running at 17:58 UTC (> 100 min) | Measured (in progress; the beta.9 delivery engineer adds the end time) | Baseline | — |
| BuildKit log parse of beta.8 build step | Where the 27:20 go | arm64 builder under QEMU: pnpm install 157 s, contract builds 66 s, prisma 13 s, server build 263 s, mobile web build 275 s, deploy 64 s (~14 min, the critical path, done at 08:52:10, 15.5 min after start); amd64 equivalents: 40 s, ~10 s, -, 44 s, 46 s, 28 s (~3 min); image export+push 68 s; **export to GitHub Actions cache 664 s (11 min)**; **0 steps CACHED** | Measured | Emulation and cache export are the two causes; the cache brings nothing | `/tmp/sd520/b8.txt` (disposable) |
| BuildKit log parse of beta.7 build step | Where the 45:43 go | arm64 under QEMU: pnpm install 213 s, server build 352 s, mobile web 375 s, deploy 89 s; arm64 builder done 20.6 min after start; image export 112 s; **export to GitHub Actions cache 1433 s (24 min)**; **0 steps CACHED** | Measured | Cache export time varies 11-24 min and explains most of the 32 vs 53 min spread | `/tmp/sd520/beta7-build.log` (disposable) |
| Actions cache API | Cache scope | 87 of 102 entries belong to `refs/tags/v1.5.13-beta.8`; 10.2 GB of the listed 100 entries; beta.9 cannot read beta.8's entries (GitHub restricts cache reads to the current ref and the default branch) | Measured (entries) / Read (GitHub's ref isolation rule) | Per-tag GHA cache can never hit across releases; it also evicts the Desktop/Android pnpm and Gradle caches | — |
| `df -h /` lines in beta.8 build log | Free disk on `ubuntu-latest` | 79 GB available before cleanup, 101 GB after | Measured | Unconditional cleanup (1-3 min) is not needed for a 2.4 GB single-architecture image | — |
| Checkout step of the beta.8 package job | Cost of a depth-1 full checkout | `git fetch --depth=1` 09:05:33 -> 09:07:57 (2 min 24 s) for 95,551 files | Measured | Package jobs need two paths only | — |
| GitHub release creation times | When package uploads can start | Android creates the release 6-7 min after the tag push; Desktop ~30 min | Measured | A ~15-min server run reaches the release after Android normally; if Android fails, the package job waits for Desktop (~30 min) | Raise the package job's wait to 60 min (DEC-005) |

- Temporary diagnostics: None (only read-only `gh` queries; logs saved under `/tmp/sd520`, not committed).
- Reproduction for implementation to start from: None (CI timing; the build-only run is the proof).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (2026-11-17, relayed) | Release used to take about an hour, now far more; solve it | Direct quote in the Task | REQ-001 | None |
| PM (autobyteus-520) | Keep package guarantee, tag rules, six files; build-only proof; RELEASE.md; next release uses it | Task text | REQ-002..REQ-008 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| GitHub-hosted `ubuntu-24.04-arm` runner | GitHub docs; already used by release-desktop.yml | Native arm64 Linux runner, free for public repositories | Desktop run 44105389247 "Build Linux ARM64" succeeded on it | Free disk on that image not measured: covered by the disk guard |
| GitHub Actions cache | GitHub docs | 10 GB per repository; entries readable only from the same ref or the default branch | Cache API above | — |
| Docker Buildx / `docker/build-push-action@v6` | Docker docs ("Distribute build across multiple runners") | `outputs: type=image,name=<image>,push-by-digest=true,name-canonical=true,push=true` returns `digest`; `docker buildx imagetools create -t <tag> <image>@<d1> <image>@<d2>` makes the multi-arch index; `--dry-run` prints it without pushing | Docker documentation pattern | Verified only by the build-only run and the next release |
| `actions/upload-artifact@v4` / `download-artifact@v4` | GitHub | Artifacts belong to the run and stay available to re-run attempts; a re-upload under the same name needs `overwrite: true` | GitHub docs | Rerun path proven at the first failed-leg rerun only |
| Docker Hub | — | Untagged per-architecture manifests pushed by digest are reachable by digest only, not listed as tags | Docker registry behaviour | Build-only runs leave untagged manifests (DEC-004) |

## Persisted Data And State Facts

- Affected stored or external subject: Docker Hub tags and GitHub release assets; no app data.
- Required semantics to preserve: tag names, `:beta` forward-only rule, `:latest` for stable only, six asset names, signature and description format.
- Acceptable loss: none of the published artifacts; Actions cache entries (`buildkit-blob-*`) are disposable and age out.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated` (CI infrastructure; no UI).

## Product Design Findings

- N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | — | — | — | — | No supplements; the before/after timing table is produced by validation (AC-001) |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Build time of the arm64 builder on a native 4-vCPU arm64 runner | REQ-001 target | Build-only run (AC-001) | Open until validation |
| R-001 | Risk | Each architecture installs the "latest" CLIs at its own time; a leg rerun hours later can carry newer CLI versions than the other architecture | Images of one tag can differ in CLI versions | Accepted: CLI versions are already "latest at build time" by design; server package code is identical (same commit and lockfile) | Accepted |
| R-002 | Risk | `Move beta tag` and the package upload are not exercised by a build-only run | First exercised at the next release | PM verifies the next release (Task Done-when); step scripts kept unchanged where possible; unit tests cover them | Accepted |
| R-003 | Risk | GHA cache entries from beta.8/beta.9 stay until they age out (7 days unused) | Cache pressure for other workflows for a week | No action; they expire | Accepted |

## Architecture Investigation Findings

- Entrypoints: tag push `v*` and `workflow_dispatch`; concurrency group `server-docker-release-<release_tag|ref_name|run_id>`.
- The builder stage is architecture-specific (native `node-pty`, `onnxruntime-node`, Prisma engines, `pnpm deploy --prod` resolves platform optional packages). Building it once on `$BUILDPLATFORM` for both targets would need per-target native module selection; with native runners per architecture the emulation cost disappears without that risk, so the Dockerfile stays as it is.
- The only cacheable layers before the source `COPY` are `corepack enable`, `pnpm install` (when manifests and lockfile are unchanged), the base pulls and the runtime `apt-get`: about 1-2 min natively (beta.8 amd64: install 40 s, apt-get 37 s). Every layer after the source `COPY` changes every release, so `mode=max` exports gigabytes that are never reused. Evidence: 0 cache hits in beta.7 and beta.8 while the export took 11-24 min.
- `Move beta tag` needs tags fetched after the build and `git show ${GITHUB_SHA}:scripts/release_versions.py`. A treeless full-history checkout (`fetch-depth: 0`, `filter: tree:0`) fetches only commits, so `git fetch --tags` stays cheap and `git show` fetches the one tree/blob on demand; the step script can stay byte-identical.
- The concurrency group of a build-only dispatch must differ from any release's group, or a build-only run with a release tag would queue behind (or block) that release.
- Package version check: `describe-server-package.mjs description --version` must equal the package's own `server-package.json` version; a build-only run on a branch has no release tag, so it takes the version from the package.

## Requirement Implications

- The slowness has two measured causes in this workflow (emulated arm64; a GHA cache export that costs 11-24 min and is never hit), plus ~4-5 min of avoidable checkout and disk cleanup in the package jobs. Removing them needs no Dockerfile change.
- A build-only mode is needed in this workflow to prove the gain without publishing.
- Faster server runs shift the order with the GitHub release creation; the package job's 30-min wait should cover the Desktop-created release when Android fails.

## Notes For Architecture Design

- Scenarios to realize: SCN-001 (tag push), SCN-002 (manual re-publish incl. zh), SCN-003 (build-only), SCN-004 (rerun of one failed architecture).
- Keep: tag names and rules, six assets, signature format, package job's default-variant-only rule, `contents: write` only on the package job, `Move beta tag` decision after the builds, CLI cache buster.
- Verify in validation: build-only run timings (new vs beta.8/beta.9), the merged index's platforms/digests (dry run), each package's `arch` matches its leg.
