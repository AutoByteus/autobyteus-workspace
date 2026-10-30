# API/E2E Execution Coverage Report — autobyteus-305, build step 1 (signed server package)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review Pass (CRR-001) of build step 1
- Prior round reviewed: `N/A`
- Deviations from the investigation's plan, and why:
  - API-10 failed in round 1 at stage API003. Its cause was a layout-bound precondition in the probe, not product behavior (Cases, API-10 Notes). I updated the probe as the investigation's "Durable Coverage To Update" records, committed it on its own (`4c356d69b7`) and reran it.
  - API-14 needed a second image: the first PowerShell image was 32-bit ARM and crashed under QEMU.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (test-code review of the changed durable test)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | `4c356d69b7` (round 1 of API-10: `4a968218e9`); the images were built from `01c56f1b95`'s blobs, and nothing outside `tickets/` and the probe changed since (`git diff --name-only 5c33c1b7b0 4c356d69b7`) | macOS 26.5.2 arm64, Docker Desktop, Docker 29.0.1 | `autobyteus-server-305-test:step1` `sha256:ae18d6c1a66e…` (arm64, package `1.5.11-beta.5 linux-arm64`); worktree server `dist` built by `pnpm -C autobyteus-server-ts build`; Node v22.23.1; headless Chrome for API-11 | Clean `env -i` with private HOME/TMPDIR under `/private/tmp/ab305-api-e2e`; probe-owned containers, ports on `127.0.0.1`, no user volumes |
| ENV-2 | same | macOS arm64 host, amd64 under QEMU | `autobyteus-server-305-test:step1-amd64` `sha256:8588804dc903…` (package `linux-x64`) | No volumes, `127.0.0.1` free port |
| ENV-3 | same | Test-owned Docker daemon `docker:dind` (server 29.9.2) in container `ab305-api-dind` on the host daemon, reached via `DOCKER_HOST=tcp://127.0.0.1:<port>` | Published `autobyteus/autobyteus-server:beta` pulled from Docker Hub; step-1 image pushed to a test registry `localhost:5000` inside dind; launcher run with macOS `/bin/bash` 3.2.57 | Only test-owned nodes are visible to `upgrade --all`; launcher state and shared workspace under `/private/tmp/ab305-api-e2e/api12`, bind-mounted into dind at the same path |
| ENV-4 | same | macOS arm64, Docker 29.0.1 | `docker-start.sh up --build-local` → `autobyteus-server:latest` built from this worktree (linux/arm64) | Compose project `ab305-api-compose`, its own volumes and ports |
| ENV-5 | same | `mcr.microsoft.com/dotnet/sdk:8.0` linux/arm64 | PowerShell 7.4.22 | Worktree mounted read-only |

## Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-011, REQ-004, REQ-008, REQ-009, REQ-013, BEH-001 | Scripts, workflow step bodies, launcher (fake docker/gh) | Reused IMP-01 | — | Pass | — | — | Ran at `5c33c1b7b0`; only `tickets/` changed before my probe commit, which IMP-01 does not exercise. 2 skips: the `pwsh` parse (run here as API-14) and a host-port collision case |
| API-02 | REQ-008 | Workflow lint, level check | Reused IMP-02 | — | Pass | — | — | Same reason |
| API-03 | REQ-009 | Image build, both architectures | Reused IMP-03, IMP-04 | — | Pass | — | — | The images built there are the subjects of API-10..API-15 |
| API-04 | AC-011, QR-001, REQ-004 groundwork | Package job's own step bodies on real images: extraction, archive, description, signature; manifest comparison | Reused IMP-06, IMP-07 | — | Pass | — | — | Dockerfile, scripts and workflow unchanged since `01c56f1b95`. Byte identity on both architectures (45296 entries arm64; 83897 manifest lines amd64), signature verifies with the throwaway key, a tampered description does not, 0.28 GB per archive |
| API-05 | BEH-001, REQ-009, REQ-004/QR-003, REQ-013 | Container start, TESTING recipe read-only, CLI smoke, key creation, repository gates | Reused IMP-05, IMP-08, IMP-09, IMP-10, IMP-11 | — | Pass | — | — | Same commit; IMP-08 shows the server does not write into its app root (read-only package) |
| API-10 | RU-4, REQ-009, BEH-001 | Real step-1 image with the worktree's `dist` mounted read-only over `/opt/autobyteus/server-package/dist`. Prisma native engines from the package with an incompatible engine cache in the retained HOME; recreation over the same HOME/data | `env -i PATH="$PATH" HOME=<tmp> TMPDIR=<tmp> RUN_PRISMA_ENGINE_DOCKER_E2E=1 pnpm -C autobyteus-server-ts test:e2e:prisma-engine-discovery:docker --image sha256:ae18d6c1a66ef2e7a497f3ba239ae457b3a69b73658bf14fba918dcb523082ce --output-dir evidence/API-10-prisma` | ENV-1 | Pass (round 2) | `API-10-prisma/console.log`, `events.jsonl`, `dist-audit.json`, `native-proof.json`, `startup-first.log`, `startup-recreated.log`, `recreation-proof.json`, `cleanup.json`; round 1: `API-10-prisma-round1-fail/`, `API-10-cause.log` | `events.jsonl`: `"API002","result":"Pass","details":"5749 dist entries audited; 0 allowed changes"`, `"API003","result":"Pass"`, `"API004","result":"Pass"`, `"API005","result":"Pass","details":"different container ID; same mounts/source; API data and wrong-cache bytes preserved; HTTP200/statusok x3"`; `native-proof.json` `"source": "bundled"`, `"sourcePath": "/opt/autobyteus/server-package/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines"`, `wrongRpc` `-32601`; startup logs `Using Prisma engine overrides from bundled:`; `cleanup.json` `"containersRemaining": []`, `"rootAbsent": true` | **Round 1 (`4a968218e9`) failed** at API003: `'bundled' !== 'cache'` at `native.mjs:15`. **Cause** (`API-10-cause.log`): the stage proved its fixture by showing that the pre-fix resolver `e22245f0` selects the HOME cache. That resolver scans `<appRoot>/node_modules/.pnpm/@prisma+engines@*`. In the `/app` layout the store was at `/app/node_modules/.pnpm`, outside `appRoot=/app/autobyteus-server-ts`, so the scan found nothing and it fell back to the cache. In the package the store is inside `appRoot`, so even the pre-fix code finds the bundled engines. The failure is in the test's precondition, not in the product: the current resolver was not reached in round 1. **Fix** `4c356d69b7`: the cache's own schema engine now proves the fixture; the current-resolver assertions are unchanged. Round 2 dist audit: 0 differences between the image's `dist` and this worktree's build |
| API-11 | RU-4 | Browser: Nodes page in headless Chrome against two host servers of this worktree and a Docker node from the step-1 image (worktree `dist` mounted over the package's `dist`) | `env -i PATH="$PATH" HOME=<tmp> TMPDIR=<tmp> pnpm -C autobyteus-web test:e2e:nodes-docker-address --docker-image=autobyteus-server-305-test:step1 --output-dir=evidence/API-11-nodes-docker-address` | ENV-1 | Pass | `API-11-nodes-docker-address/README.txt`, `nodes-docker-address-probe.json`, `docker-node.log`, `ND-*.png` | `nodes-docker-address-probe.json`: `"result": "Pass"`, cases `ND-01`..`ND-05` each `"result": "Pass"`, `"imageDistDiff": {"changed": [], "onlyMounted": [], "onlyImage": []}`, `"cleanup": {"frontendExited": true, "serversLeft": 0, "rootRemoved": true, …}`; `docker-node.log`: `App root directory: /opt/autobyteus/server-package` | Run with `--docker-image` because the probe's default, the published `:beta`, still has the `/app` layout (investigation O-2). That holds until the first release with this change. Host LAN, tailnet and IPv6 addresses in the receipt were redacted before commit (README) |
| API-12 | BEH-001 (preserved), REQ-009, Removal plan, persisted data `Not Affected` | Real launcher (`new-container`, `upgrade --all`, plain `upgrade --all`, `storage`, `destroy --all`) on a real, test-owned Docker daemon, from the published `:beta` to the step-1 image. Phase A: upgrade by the new launcher. Phase B: upgrade by the `origin/personal` launcher users have installed | `evidence/API-12-launcher-upgrade.sh <worktree> evidence/API-12-launcher-upgrade.log` | ENV-3 | Pass | `API-12-launcher-upgrade.log`, `API-12-launcher-upgrade.sh` | `CHECK PASS: the test daemon has no launcher-managed containers before the run`. In each phase: `Image changed for autobyteus-server-0; recreating the managed container while keeping named volumes.`, `CHECK PASS: phase A: same named volumes mounted at the same places`, `server cwd: /app/autobyteus-server-ts` (`:beta`) then `server cwd: /opt/autobyteus/server-package` (step 1), `CHECK PASS: phase A: definition written by :beta read back unchanged by step 1`, `CHECK PASS: phase A: root-home file kept`, `autobyteus-server-0 is already running with the current image and launcher config.`, `CHECK PASS: phase A: all four named volumes kept`; final `CHECK FAILURES: 0` (both phases) | The published `:beta` came from Docker Hub, `sha256:9657209ba499…`, the same digest as the host's `:beta`. Data was seeded through GraphQL on `:beta` (`createAgentDefinition`) and read back through GraphQL on step 1. A `/root` file stood in for CLI sign-ins. **Phase B** proves that users who keep the old installed launcher can upgrade: that launcher still passes `AUTOBYTEUS_WORKSPACE_ROOT`/`AUTOBYTEUS_SKIP_SYNC`, and the step-1 image ignores them. The new launcher's plain `upgrade --all` then keeps that container: the config hash is unchanged, confirming CC-08 on a real daemon. The launcher's unused-image cleanup ran as before (`Keeping image …` / `Removed unused AutoByteus server image …`, inside the test daemon only). A stopped holder container kept `:beta` between phases. The test daemon, its volume and the test root were removed afterwards |
| API-13 | Compose consumer, Removal plan | `docker-start.sh up --build-local` | `evidence/API-13-compose.sh <worktree> evidence/API-13-compose-start.log <build log>` | ENV-4 | Pass | `API-13-compose-start.log`, `API-13-compose-build-excerpt.log`, `API-13-compose.sh` | `Wrote server-package.json: 1.5.11-beta.5 linux-arm64, Node modules 127, system level 1, 61 migrations`; `FROM docker.io/autobyteus/chrome-vnc@sha256:b2fde77f…` (= `system-level.json` `baseImages.default`); `volume ab305-api-compose_autobyteus-server-server-packages -> /home/autobyteus/server-packages rw=true`; `CHECK PASS: compose node healthy 3x`; `server cwd: /opt/autobyteus/server-package`; `CHECK PASS: server-packages volume is empty (step 1 writes nothing there)`; `CHECK PASS: project volumes removed`; `CHECK FAILURES: 0` | Fresh image build from this worktree (about 5 min). The container's `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29695` came from my shell, which carries the live app's variable: compose interpolates `${AUTOBYTEUS_SERVER_HOST:-…}` from the caller's environment. That is existing compose behavior and none of the checks depend on it. The full build log (1065 lines) was not committed; the excerpt holds its key lines |
| API-14 | RU-5 | PowerShell launcher sources in a real `pwsh` | The durable test's command in `mcr.microsoft.com/dotnet/sdk:8.0` (pwsh 7.4.22), sources mounted read-only, plus a control copy with a syntax error | ENV-5 | Pass | `API-14-powershell-launcher-parse.log` | 4 × `parsed: …` lines then `exit 0`; control `Missing ')' in function parameter list.` and `control exit 1`; `grep exit 1 (1 = none found)` for the removed env items | Parse only, as the durable test asserts; the run arguments are the bash launcher's mirror (IMP-01). The first attempt used `mcr.microsoft.com/powershell:latest`, which pulled a 32-bit `arm` image that crashed under QEMU (`qemu: uncaught target signal 6`); discarded and the image removed |
| API-15 | RU-3, REQ-009 | amd64 image starts its built-in package | `evidence/API-15-amd64-image-start.sh evidence/API-15-amd64-image-start.log`: `docker run -d --platform linux/amd64 -p 127.0.0.1::8000 autobyteus-server-305-test:step1-amd64`, no volumes | ENV-2 | Pass | `API-15-amd64-image-start.log` | `health after 13s: {"status":"ok",…}`; `server cwd: /opt/autobyteus/server-package`; `node arch: x64 127`; `Using Prisma engine overrides from bundled: … (query=libquery_engine-debian-openssl-3.0.x.so.node, …)`; `CHECK FAILURES: 0` | Under emulation; native amd64 hardware not available here. The native-module choice (debian-openssl x64 engines) is the architecture-specific part and is exercised |
| API-16 | AC-011 (GitHub part) | Real release workflow | Not run | — | Not Tested | — | — | Needs a release, which needs the user's request. The workflow has no dry-run input (every dispatch pushes to Docker Hub and uploads to a release), and `act` is not installed. A fork run would publish an image |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-011, local part: per architecture the package job's own steps produce the archive, description and signature; the image's built-in package is byte-identical to that archive; the signature verifies over the description | Yes | API-04 (IMP-06, IMP-07), API-01 (IMP-01: step bodies, upload order, refusals), API-03, plus API-10/API-11 (image `dist` = worktree build, 0 differences) | Proven | — |
| AC-011, GitHub part: the release really carries the 6 files, signed with the real secret, after the 30-minute wait | Yes | API-16 | Only The User Can Check | I looked for a run that does not publish. The workflow has no dry-run input: every form pushes the image to Docker Hub and uploads to a GitHub release. `act` is not installed, and a fork run would publish an image. The private key exists only as the GitHub secret, and the sign step checks it against the committed public key, failing closed on a mismatch. Only a release proves it, and a release needs the user's request. Delivery: on the first release, check the 23 assets (RELEASE.md) and compare a published archive with the image's `/opt/autobyteus/server-package` |
| BEH-001 (preserved): `upgrade --all` recreates on an image change and keeps the named volumes; the server runs from the package | Yes | API-12 (both launchers), API-05 (IMP-05, IMP-09), API-10 (recreation over the same HOME/data) | Proven | — |
| REQ-008 groundwork (system level declared, checked) | No (AC-005 is step 3) | API-01, API-02, API-13 (base pinned to `baseImages.default`; `systemLevel: 1` in `server-package.json`) | Proven for step 1 | — |
| REQ-004 groundwork (signature, public key) | No (AC-003 is step 3) | API-04, API-05 (IMP-10) | Proven for step 1 | — |
| Removal plan (`bootstrap.sh`, `AUTOBYTEUS_WORKSPACE_ROOT`, `AUTOBYTEUS_SKIP_SYNC`, `/app` server layout) | No | API-12, API-13, API-14, API-01 | Proven | — |
| AC-001..AC-010, AC-012, AC-013 | — | — | Not in step 1 | Steps 2–5 |

## Validation Confidence Scorecard (Mandatory)

Scored over what can be proven without the user; the GitHub part of AC-011 is listed for delivery, not scored as a gap.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | API-04, API-01, API-12, API-10, API-11 | The GitHub run itself (user-only) | The first release |
| Changed-boundary execution directness | 85% | 95% | Real images, real launcher on a real daemon, real compose, real browser, real `pwsh` | amd64 only under QEMU | Native amd64 hardware |
| Cross-boundary integration realism and mock gap | 85% | 95% | IMP-06/07 run the job's step bodies with real docker and GNU tar; API-12 pulls the published `:beta` from Docker Hub; only `gh` (upload) was faked, which is the user-only release part | GitHub runner specifics (disk, `jq`) | The first release |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean `env -i`, macOS `/bin/bash` 3.2, `origin/personal` launcher as users have it installed, data written by the released server | QEMU for amd64 | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Recreate, plain no-op upgrade, destroy keeps volumes, old-launcher upgrade, recreation over a retained HOME with an incompatible cache, read-only package (IMP-08), tampered description refused (IMP-06) | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 95% | API-11 (Nodes page with a package-layout Docker node) | No desktop change in step 1 | — |
| Durable regression coverage quality and relevance | 90% | 95% | Updated Prisma probe (no layout-bound precondition), 20 new script tests, both probes run on the new layout | The real launcher journey stays a ticket journey (needs a second daemon) | — |

- Overall post-repository confidence: 88%, after the repository checks (API-01..API-05, API-10, API-11) and before the lifecycle runs API-12..API-15. Below 90% in three categories, so broader validation was required.
- Overall final confidence: 95%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the first release is the first real run of `publish-server-package` (secret/key pair, runner disk, 30-minute wait, R-05 partial release).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` (launcher upgrade on a test-owned daemon, compose start, amd64 start), `Browser` (API-11), `CLI` (`pwsh`)
- Confidence gap or residual risk it addresses, and the expected gain: repository evidence used fake docker for the launcher and never started the image through the launcher, compose or on amd64. These runs prove the real start paths and the volume and data continuity.
- Browser validation needed, and why or why not: yes, through the existing probe (API-11). The Nodes page talks to a Docker node whose server now runs from the package.
- If `Blocked`: the GitHub release part is not blocked but user-only (above).

## Persisted-Data Transition Checks (When Applicable)

- Approved persisted-data decision: `Not Affected`
- Representative existing data used: an agent definition written through GraphQL by the published `:beta` server, plus a `/root` file, in the node's own volumes (API-12); the Prisma probe's GraphQL-created definition over a retained HOME/data (API-10).
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the direct-use outcome: API-12 (read back unchanged), API-10 API005.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none for step 1. The new compose volume stays empty (API-13).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. The old launcher's dead `-e` args (phase B) are ignored by the new image; nothing in the image reads them.
- Durable coverage added or retained only for compatibility-only behavior: `No`. The probe update removed a comparison with pre-fix code that no longer applies.
- Reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal: Obsolete Assertion, Upstream Evidence, And Replacement Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs` (commit `4c356d69b7`) | Updated | API-10 | Removed the stage API003 assertion "the pre-fix resolver `e22245f0` selects the incompatible cache", along with its `--baseline-ref`, `git show` and TypeScript transpile. That premise holds only in the `/app` layout, which the design removes (`API-10-cause.log`). The replacement proof of the fixture: the cache's own schema engine reports the wrong revision and fails native RPC with `-32601`. The current-resolver assertions are unchanged (`bundled`, version-matched, RPC succeeds), plus API004/API005 |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: `git show 4c356d69b7`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| GitHub release upload, real signing secret | Fake `gh` and a throwaway key (IMP-01, IMP-06/07) | Needs a release | User-only part of AC-011 |
| The user's host Docker daemon for `upgrade --all` | A test-owned `docker:dind` daemon | `upgrade --all` reaches every launcher-labelled container, including the user's nodes | None for the launcher logic; dind is a real Docker engine |
| Registry for the step-1 image | `registry:2` inside dind | The image is unpublished; the launcher always `docker pull`s | None |
| amd64 hardware | QEMU | arm64 host | Emulation timing only |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| API-10 and API-11 probe containers, temp roots, host servers, Nuxt, Chrome | Yes | Probe cleanup | `cleanup.json` `containersRemaining: []`, `rootAbsent: true`; API-11 `serversLeft: 0`, `rootRemoved: true` |
| `ab305-api-dind` container, `ab305-api-dind-lib` volume (held all API-12 nodes, volumes, registry) | Yes | `docker rm -f -v`, `docker volume rm` | Removed |
| Compose project `ab305-api-compose`, its 5 volumes and network, `.runtime/ab305-api-compose.env` | Yes | `docker-start.sh down --volumes --delete-state` | Removed (`CHECK PASS: project volumes removed`) |
| `autobyteus-server:latest` (built by API-13), `docker:dind`, `registry:2`, `mcr.microsoft.com/dotnet/sdk:8.0`, `mcr.microsoft.com/powershell:latest` | Yes | `docker image rm` | Removed |
| `ab305-api15-amd64` container | Yes | `docker rm -f -v` | Removed |
| `/private/tmp/ab305-api-e2e` (homes, logs, scripts, test roots) | Yes | `rm -rf` (scripts and key log excerpts kept in `evidence/`) | Removed |
| `autobyteus-server-305-test:step1`, `:step1-amd64` | No (implementation) | Kept for later steps and reruns; remove with `docker image rm` when done | Kept |
| Container `ab305-extract` (Created, image `edac202142db…`, created 2026-10-30T15:29Z) | No (left by the implementation's dry run) | Not touched. Its owner removes it: `docker rm ab305-extract` | Kept |
| `autobyteus-server-0/1/2` and their volumes | No (the user's) | Never touched; the upgrade journey ran on a separate daemon | Untouched |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): the GitHub part of AC-011 (the first release, user's request needed)
- Preliminary classification and recommended owner (on `Fail`): `N/A`
- Next recipient from `get_handoff_rules`: code reviewer (test-code review of `4c356d69b7`)
- Notes: the address probe's default `--docker-image` is the published `:beta`, which has the `/app` layout until the first release with this change. Until then the probe needs `--docker-image=<step-1 image>` (investigation O-2). This resolves itself with that release and is not a defect.
