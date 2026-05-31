# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; implementation pending user approval.
- Investigation Goal: Determine whether backend Docker-related files in this repository should be updated due to newer changes in `/Users/normy/autobyteus_org/browser_docker`.
- Scope Classification (`Small`/`Medium`/`Large`): Medium if implemented
- Scope Classification Rationale: The core change is one Docker mount contract, but it spans public Bash/PowerShell launchers, source-helper compose, personal all-in-one compose, docs, and tests.
- Scope Summary: `browser_docker` 1.3.5 adds a persistent Chromium profile contract for downstream images. This repo launches server images based on `autobyteus/chrome-vnc` but does not mount the profile path, so it should be updated. A separate uncommitted browser-base mobile-safe Chrome wrapper is also needed upstream; backend already supplies the `AUTOBYTEUS_NODE_PROFILE=mobile-safe` env expected by that wrapper.
- Primary Questions To Resolve:
  1. What changed recently in `/Users/normy/autobyteus_org/browser_docker`?
  2. Which Docker assets in this repository consume or duplicate that base image contract?
  3. Are any updates required for correctness, security, size, or build reliability?
  4. What validation should accompany any recommended change?

## Request Context

User asked: “could you please check whether our backend docker related should be updated or not, because the base image repo /Users/normy/autobyteus_org/browser_docker has updates, you can look at the git history from browser docker then you can see what changes are then. please analyse”

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/backend-docker-browser-base-analysis`
- Current Branch: `codex/backend-docker-browser-base-analysis`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed from the original checkout before worktree creation.
- Task Branch: `codex/backend-docker-browser-base-analysis` tracking `origin/personal`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` was on `personal` behind `origin/personal` by one commit and had untracked `blingda.txt`; task work proceeds in the dedicated worktree instead.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-30 | Command | `pwd`; `git rev-parse --show-toplevel`; `git status --short --branch`; `git remote -v`; `git symbolic-ref refs/remotes/origin/HEAD`; `ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment discovery | Original checkout is git repo on `personal`, behind `origin/personal` by one commit; untracked `blingda.txt`; remote default resolves to `origin/personal`. | No |
| 2026-05-30 | Command | `git worktree list --porcelain`; `git fetch origin --prune`; `git status --short --branch`; `git symbolic-ref refs/remotes/origin/HEAD` | Required remote refresh and existing worktree check | Existing worktrees listed; remote fetch completed; base branch `origin/personal` confirmed. | No |
| 2026-05-30 | Setup | `git worktree add -b codex/backend-docker-browser-base-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis origin/personal` | Create dedicated task worktree/branch | Worktree created at `21d05cf9`; branch tracks `origin/personal`. | No |
| 2026-05-30 | Command | `find . -maxdepth 4 \( -iname '*docker*' -o -name 'compose*.yml' -o -name 'compose*.yaml' -o -name 'Dockerfile*' \)` | Locate local Docker surfaces | Found root `docker/`, server Docker under `autobyteus-server-ts/docker`, message gateway Docker, web Docker, public launchers, and Docker tickets. | No |
| 2026-05-30 | Code | `docker/Dockerfile.allinone`; `autobyteus-server-ts/docker/Dockerfile.monorepo`; `docker/compose.personal-test.yml`; `autobyteus-server-ts/docker/docker-compose.yml` | Inspect backend/server image base usage and launch volumes | Server Dockerfile uses `FROM autobyteus/chrome-vnc:${BASE_IMAGE_TAG}`; all-in-one uses `FROM autobyteus/chrome-vnc:${CHROME_VNC_TAG}` default `zh`; neither compose file mounts `/home/vncuser/.config/chromium`. | Yes — add profile volume if implementation approved. |
| 2026-05-30 | Code | `scripts/public/docker/autobyteus-docker.sh`; `scripts/public/docker/autobyteus-docker.ps1`; `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Inspect public launcher run args and validation | Launchers mount workspace, data, and root home volumes but not Chromium profile; both set `AUTOBYTEUS_NODE_PROFILE=mobile-safe` in the mobile-safe branch; tests assert current volume/run-arg contract. | Yes — update launchers/tests if implementation approved. |
| 2026-05-30 | Code/Doc | `README.md`; `autobyteus-server-ts/docker/README.md`; `docker/README.md` | Inspect user-facing Docker docs | Direct-run examples and persistence docs list workspace/data/root volumes, but not Chromium profile persistence. | Yes — update docs if implementation approved. |
| 2026-05-30 | Repo | `/Users/normy/autobyteus_org/browser_docker` `git status --short --branch`; `git log --oneline --decorate --graph --all -n 40`; `git branch -vv`; file listing | Inspect base-image repository state and history | Repo is on `codex/docker-browser-link-open-fix` tracking `origin/main`; `origin/main` is `e44cc80 Release 1.3.5 persistent Chromium profile`; local worktree has modified `Dockerfile`, modified `base.conf`, untracked `start-chrome.sh`. | Yes — distinguish committed contract from uncommitted upstream work. |
| 2026-05-30 | Repo | `git show --stat --oneline --decorate e44cc80`; `git show e44cc80 -- Dockerfile README.md VERSION base.conf docker-compose.chrome-vnc.yml entrypoint.sh run-container.sh` | Inspect committed browser-base update | 1.3.5 changes persist Chromium profile via volumes in browser compose/run scripts and adds entrypoint ownership/chmod for `/home/vncuser/.config/chromium`; README says downstream images should mount that path. | No |
| 2026-05-30 | Repo | `git diff -- Dockerfile base.conf`; `cat start-chrome.sh` in `browser_docker` | Inspect uncommitted browser-base changes | Uncommitted changes copy `start-chrome.sh`, make `[program:chrome]` call it, and add `--no-sandbox` when `AUTOBYTEUS_NODE_PROFILE=mobile-safe`. | Yes — base repo should finish/publish this before backend claims mobile-safe Chrome fixed. |
| 2026-05-30 | Command | `docker buildx imagetools inspect autobyteus/chrome-vnc:latest`; `:zh`; `:1.3.5`; `:1.3.5-zh`; `:1.3.4`; `:1.3.4-zh`; `autobyteus/autobyteus-server:latest` | Check published registry state | `chrome-vnc:latest` and `:1.3.5` resolve to digest `sha256:bc4d58...`; `chrome-vnc:zh` still equals `1.3.4-zh` digest `sha256:a66d...`; `1.3.5-zh` not found; `autobyteus/autobyteus-server:latest` exists at digest `sha256:0d703...`. | Yes — publish zh variant if all-in-one should receive base fix. |
| 2026-05-30 | Command | `docker images --format ... | grep -E 'autobyteus/(chrome-vnc|autobyteus-server)|autobyteus-server|autobyteus-personal'` | Check local Docker image state | Local `autobyteus/autobyteus-server:latest` is present and recent; local `autobyteus/chrome-vnc:latest`/`:zh` tags are older local images. | No |
| 2026-05-30 | Probe | `docker run --rm --entrypoint /bin/bash autobyteus/autobyteus-server:latest -lc 'grep ... /entrypoint.sh /etc/supervisor/conf.d/base.conf'` | Inspect actual published server image content | Server image contains the 1.3.5 profile ownership block in `/entrypoint.sh`; Chrome command is still direct `/usr/bin/chromium ...` and does not include uncommitted `start-chrome.sh`. | No |
| 2026-05-30 | Probe | Disposable `docker run --rm -d --name codex-browser-base-mobile-safe-probe -e AUTOBYTEUS_SKIP_SYNC=1 -e AUTOBYTEUS_NODE_PROFILE=mobile-safe ... autobyteus/autobyteus-server:latest`; after 12s inspect/tail chrome logs; then `docker rm -f` | Test current mobile-safe Chrome behavior without privileged flags | Container stayed running, but Chromium repeatedly failed with `Failed to move to new namespace ... Operation not permitted` and zygote fatal errors. This matches why the uncommitted base wrapper adds `--no-sandbox` for `mobile-safe`. | Yes — coordinate base publish/rebuild; backend env is already present. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Docker container creation through public launchers (`scripts/public/docker/autobyteus-docker.sh` / `.ps1`), source helper compose (`autobyteus-server-ts/docker/docker-compose.yml`), or personal all-in-one compose (`docker/compose.personal-test.yml`).
- Current execution flow:
  1. User starts/pulls/builds a server image based on `autobyteus/chrome-vnc`.
  2. Launch surface creates a container with app data/root/workspace volumes.
  3. Base `/entrypoint.sh` starts supervisord and Chromium/VNC processes.
  4. Since no launch surface mounts `/home/vncuser/.config/chromium`, browser profile state remains container-filesystem state and is lost on container recreation.
- Ownership or boundary observations:
  - `browser_docker` owns Chromium/VNC process startup semantics and base image filesystem preparation.
  - This repo owns downstream server/container launch volume contracts and user-facing launcher/docs.
  - Public launchers own safe managed-container recreation via image/config hash.
- Current behavior summary: Backend Docker consumes the updated base but does not yet satisfy the new downstream mount recommendation; mobile-safe Chrome additionally depends on an uncommitted base wrapper not yet present in the published server image.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / dependency-contract alignment, plus a mobile-safe browser bug exposed by base-image state.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant / Duplicated Policy Or Coordination.
- Refactor posture evidence summary: Existing Docker launch ownership is coherent; no broad refactor needed. The invariant "server images with Chromium/VNC persist the browser profile path" is missing across launch surfaces and docs.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `browser_docker` README lines 100 and 133 | Base repo says Chromium profile is persisted by mounting `/home/vncuser/.config/chromium` and downstream images should mount it too. | Backend launch surfaces must own the downstream volume mount. | Yes |
| `autobyteus-server-ts/docker/docker-compose.yml` lines 37-40 | Server source helper mounts workspace/data/root, not Chromium profile. | Missing launch invariant. | Yes |
| `docker/compose.personal-test.yml` lines 71-73 | All-in-one mounts data and gateway memory, not Chromium profile. | Missing launch invariant. | Yes |
| Public launcher run args | Bash/PowerShell launchers mount workspace/data/root but not Chromium profile. | Missing public no-clone persistence invariant; launcher config hash must change to recreate existing nodes. | Yes |
| Disposable mobile-safe runtime probe | Current server image's mobile-safe Chromium fails with namespace/zygote error. | Do not claim backend volume update fixes mobile-safe Chrome; base wrapper publish/rebuild is separate. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/Dockerfile.monorepo` | Builds published/source server image from `autobyteus/chrome-vnc:${BASE_IMAGE_TAG}` and adds server/CLI runtime. | Base image reference is already parameterized; no Dockerfile change needed for profile mount. | Keep Dockerfile as consumer of base; do not duplicate Chromium startup. |
| `docker/Dockerfile.allinone` | Builds personal all-in-one runtime from `autobyteus/chrome-vnc:${CHROME_VNC_TAG}` default `zh`. | Default `zh` base currently remains older in registry; no profile mount in compose. | Add compose mount; publish `zh` base before expecting full effect. |
| `scripts/public/docker/autobyteus-docker.sh` | Bash public launcher for no-clone users; owns container run args, state, config hash, storage output. | Missing Chromium profile volume; already sets `AUTOBYTEUS_NODE_PROFILE=mobile-safe`. | Add profile volume and config hash version bump; update storage output. |
| `scripts/public/docker/autobyteus-docker.ps1` | PowerShell peer launcher. | Same missing volume; parity required. | Mirror Bash behavior and tests. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Durable launcher contract tests. | Current assertions cover workspace/data/root volumes and mobile-safe privileged mount omissions. | Extend assertions to Chromium profile volume and config hash version. |
| `autobyteus-server-ts/docker/docker-compose.yml` | Source helper compose for server image. | Missing Chromium profile volume. | Add named volume. |
| `docker/compose.personal-test.yml` | Personal all-in-one compose. | Missing Chromium profile volume for main all-in-one. | Add named volume. |
| `README.md`; `autobyteus-server-ts/docker/README.md` | User-facing Docker usage and storage docs. | Persistence docs omit Chromium profile volume. | Update direct-run examples and storage sections. |
| `/Users/normy/autobyteus_org/browser_docker/entrypoint.sh` | Base image startup. | Ensures mounted Chromium profile dir exists, is owned by `vncuser`, mode 700. | Backend can safely mount named volume; base handles permissions. |
| `/Users/normy/autobyteus_org/browser_docker/base.conf` working tree | Base supervisor process policy. | Uncommitted branch routes Chrome through `start-chrome.sh`. | Should be committed/published upstream if mobile-safe Chrome is required. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-30 | Probe | `docker run --rm --entrypoint /bin/bash autobyteus/autobyteus-server:latest -lc 'grep -n "CHROMIUM_PROFILE_DIR\|chromium" /entrypoint.sh; grep -n "\[program:chrome\]\|command=.*chrom" -A3 /etc/supervisor/conf.d/base.conf'` | Published server image contains `CHROMIUM_PROFILE_DIR=/home/vncuser/.config/chromium` entrypoint block, but Chrome command is direct `/usr/bin/chromium ...`, not the uncommitted wrapper. | Profile mount is usable now; mobile-safe wrapper is not yet in server image. |
| 2026-05-30 | Probe | Disposable mobile-safe-style `docker run` of `autobyteus/autobyteus-server:latest`, no privileged flags, `AUTOBYTEUS_NODE_PROFILE=mobile-safe`, then tail `/var/log/supervisor/chrome.err.log`. | Chrome repeatedly failed: `Failed to move to new namespace ... Operation not permitted`; zygote fatal error; supervisor gave up after retries. | Confirms separate base-image mobile-safe Chrome fix is needed; backend already passes the env expected by the uncommitted wrapper. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Docker Hub registry inspected via `docker buildx imagetools inspect`; local upstream repo `/Users/normy/autobyteus_org/browser_docker` inspected via git.
- Version / tag / commit / freshness:
  - `browser_docker` committed upstream: `e44cc8070ffcba717f40d3731b07516e9cf18eee` / `Release 1.3.5 persistent Chromium profile`, dated 2026-05-29.
  - `autobyteus/chrome-vnc:1.3.5` and `:latest`: digest `sha256:bc4d58e90da78f74c761583790a93b86ec0eabe5037a4fc8d08e2a8b70c44e94`.
  - `autobyteus/chrome-vnc:1.3.5-zh`: not found.
  - `autobyteus/chrome-vnc:zh` / `:1.3.4-zh`: digest `sha256:a66d93597cb1e7d2b62db17fad31988a1672855142a48ef2d1cc1a75947640f4`.
  - `autobyteus/autobyteus-server:latest`: digest `sha256:0d703039645b1ac5aab79edad93cb76c2305683b2e89cfd5af407095fdbe729e`.
- Relevant contract, behavior, or constraint learned: Downstream images should mount `/home/vncuser/.config/chromium`; base entrypoint prepares ownership/permissions for mounted volume.
- Why it matters: Without a downstream mount, browser cookies/local storage/preferences are not preserved across server container removal/recreation, which is common in launcher upgrade/reset flows.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Docker daemon for registry inspect and disposable container probe.
- Required config, feature flags, env vars, or accounts: Disposable probe used `AUTOBYTEUS_SKIP_SYNC=1`, `AUTOBYTEUS_NODE_PROFILE=mobile-safe`, `AUTOBYTEUS_SERVER_HOST=http://localhost:8000`.
- External repos, samples, or artifacts cloned/downloaded for investigation: Local repo `/Users/normy/autobyteus_org/browser_docker`; Docker Hub registry metadata via Docker Buildx.
- Setup commands that materially affected the investigation: Dedicated worktree creation recorded above; disposable container `codex-browser-base-mobile-safe-probe` was removed after log capture.
- Cleanup notes for temporary investigation-only setup: `docker rm -f codex-browser-base-mobile-safe-probe` executed at the end of the probe.

## Findings From Code / Docs / Data / Logs

### Base repo committed changes

- `e44cc80 Release 1.3.5 persistent Chromium profile` updates `VERSION` to 1.3.5.
- Base `entrypoint.sh` now creates/chowns/chmods `/home/vncuser/.config/chromium` so a mounted volume is writable by `vncuser`.
- Base `run-container.sh` and compose files mount `chromium-profile:/home/vncuser/.config/chromium`.
- Base README explicitly tells downstream images to mount the same path.

### Base repo uncommitted changes

- Branch/worktree: `codex/docker-browser-link-open-fix` with modified `Dockerfile`, modified `base.conf`, untracked `start-chrome.sh`.
- `start-chrome.sh` adds Chromium args and conditionally prepends `--no-sandbox` when `AUTOBYTEUS_NODE_PROFILE=mobile-safe`.
- The public backend launchers already set this env for mobile-safe containers, so no backend env-shape change is needed.

### Backend repo impact

- `autobyteus-server-ts/docker/Dockerfile.monorepo` and `docker/Dockerfile.allinone` already consume `autobyteus/chrome-vnc` by tag arg.
- The missing backend-owned piece is launch-time persistence at `/home/vncuser/.config/chromium`.
- Public launcher state/config hash must change so existing managed containers are recreated to attach the new volume.

## Constraints / Dependencies / Compatibility Facts

- No backward-compatible dual path is needed; attaching the named volume is the clean target for future container lifecycle.
- Existing Chromium profile data stored only in old container layers will not automatically move into the new named volume.
- `autobyteus/chrome-vnc:zh` must be published from 1.3.5 or newer before zh/all-in-one paths receive the committed profile-permission change from the base image.
- `browser_docker` mobile-safe no-sandbox wrapper must be committed/published and then server image rebuilt before public launcher mobile-safe noVNC/Chrome is fixed.

## Open Unknowns / Risks

- Whether the user wants backend implementation now or wants to first finish/publish the pending `browser_docker` no-sandbox wrapper.
- Whether `autobyteus/chrome-vnc:zh` should be published immediately; current all-in-one default uses `zh`.
- Whether migrating profile data from an existing container filesystem is worth a separate manual recovery guide. Recommended answer for this scope: no automatic migration, future persistence only.

## Notes For Architect Reviewer

No downstream design handoff yet because requirements are not user-approved. If approved, the design should be small and file-level: add the Chromium profile volume to launch surfaces, bump launcher config hash, update docs/tests, and coordinate—but not duplicate—the base-image mobile-safe Chrome wrapper.


## Latest Recheck Addendum — 2026-05-30

After the user asked to re-check against latest backend `origin/personal`, the task branch was fast-forwarded to `2f545609568b7cb369e4b4b086fa9268cb7fd3e8` (`v1.3.34`). The new backend code removes active `mobile-safe` Docker profile support but still has no active `/home/vncuser/.config/chromium` mounts in launchers, compose files, docs, or tests.

`browser_docker` was fetched to latest `origin/main` (`2bc0b4a`) including browser Docker `1.3.6` (`3951af5`). Browser Docker now publishes both default and `zh` 1.3.6 images and adds stale Chromium profile lock cleanup in `/entrypoint.sh`; it still documents that downstream images should mount `/home/vncuser/.config/chromium`.

Pulled `autobyteus/autobyteus-server:latest` / `1.3.34` (`sha256:3481434ac9412641261f7f890cc6a25c61723bbcd1e980b5602c7c21749ed315`) still includes only the old Chromium profile ownership block, not the 1.3.6 stale-lock cleanup. Recommendation remains: add backend Chromium profile volume mounts and then rebuild/publish the server image against browser Docker 1.3.6.

Detailed recheck report: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/latest-recheck-2026-05-30.md`.

## Design Re-entry Investigation — Code Review CR-001 (2026-05-30)

### Trigger

Code review round 1 returned `Fail` with classification `Design Impact`. The functional Chromium profile-volume changes were locally coherent and targeted checks passed, but both changed public launcher source files exceeded the Stage 8 changed-source `>500` effective non-empty-line hard limit.

### Additional Sources Consulted

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-30 | Review Artifact | `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/review-report.md` | Understand Stage 8 failure and required re-entry | `CR-001` requires design re-entry for public launcher source structure/distribution. | Yes — revise design and route to architecture review. |
| 2026-05-30 | Command | `git status --short --branch` in task worktree | Inspect implementation state after failed review | Implementation changed docs, compose files, tests, and both public launcher files. | Yes — implementation must rework launcher structure. |
| 2026-05-30 | Command | `rg -n "\\S" scripts/public/docker/autobyteus-docker.sh | wc -l`; `rg -n "\\S" scripts/public/docker/autobyteus-docker.ps1 | wc -l` | Verify review line-count evidence | Bash launcher: `801`; PowerShell launcher: `797`. | Yes — source split required. |
| 2026-05-30 | Command | `git diff --numstat -- scripts/public/docker/autobyteus-docker.sh scripts/public/docker/autobyteus-docker.ps1` | Check whether the size issue is caused by a large diff or pre-existing monoliths | Bash delta `6/3`; PowerShell delta `6/1`. The files were already oversized, but they are changed source files in this task. | Yes — design must address existing monolith because the task needs launcher changes. |
| 2026-05-30 | Code | `scripts/public/docker/autobyteus-docker.sh`; `scripts/public/docker/autobyteus-docker.ps1` function listings and current contents | Identify natural split boundaries | Each launcher combines entry/help, install/update, state/path handling, Docker inspection/run/reconciliation, port allocation, output formatting, and command dispatch in one file. Natural module boundaries exist without changing the CLI surface. | Yes — split into thin entry/loader plus platform modules. |
| 2026-05-30 | Workflow Rule | `/Users/normy/.codex/skills/software-engineering-workflow-skill/stages/08-code-review/code-review-template.md` | Confirm hard gate semantics | Changed source implementation files with effective non-empty line count `>500` default to Design Impact and Stage 8 fail; no soft band/default exception. | Yes — design must include explicit line-count acceptance criterion. |

### Current Public Launcher Structure Finding

The public launchers are correctly placed under `scripts/public/docker/`, but their source responsibility is too broad for any task that must edit them. Both files combine these separate concerns:

1. public command/help entry;
2. install/self-update behavior;
3. state path and workspace path resolution;
4. node/state serialization;
5. Docker inspection and reconciliation;
6. port selection;
7. `docker run` argument construction;
8. storage/URL/status/log output;
9. command dispatch.

The Chromium profile-volume behavior belongs to the Docker run/config-hash/storage owners, but adding it directly to the monolithic entry files violates the changed-source size gate. The appropriate design response is a public launcher source split that keeps the no-clone user contract while making source ownership reviewable.

### Re-entry Design Constraint

The revised design must preserve these existing user-facing commands:

- Bash install: `curl -fsSL <script-url> | bash -s -- install`
- Bash temporary command: `curl -fsSL <script-url> | bash -s -- <command> [options]`
- PowerShell install: `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker install"`
- PowerShell temporary command: `powershell -NoProfile -ExecutionPolicy Bypass -Command "irm <script-url> | iex; autobyteus-docker <command> [options]"`
- Installed CLI command: `autobyteus-docker <command> [options]`

Preserving that contract may use a thin public entry script that loads platform modules from local installed files or the public raw source base. It must not require users to clone the repository or manually download module files.
