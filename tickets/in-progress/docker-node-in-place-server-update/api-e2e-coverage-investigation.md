# API/E2E Coverage Investigation — autobyteus-305, build step 1 (signed server package)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

All paths are in the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-003; editorial SR-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-005)
- Design Spec (required on every route): `design-spec.md` (SR-005, `Ready`), build step 1 of "Change / Refactor Sequence"
- Supplemental Task Artifacts: `options-report.md` (SR-003), `follow-ups.md` (FU-001..FU-005)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, 9.5/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: `1`
- Trigger: code review Pass for build step 1 (CRR-001), message from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: `N/A` (first round)
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

Build step 1 only: the image runs its server from the built-in server package at `/opt/autobyteus/server-package` (supervisord still runs `node dist/app.js`; no starter yet). Every default-variant release publishes that package per architecture, as archive, description and signature, from the job `publish-server-package` in `release-server-docker.yml`.

In scope for this round:

- **AC-011 / REQ-009:** per architecture, the archive, description and signature are published, and the image's built-in package is byte-identical to the published one. Its verification intent is "workflow dry run, comparison".
- **BEH-001 preserved:** `autobyteus-docker upgrade --all` still recreates on an image change and keeps the named volumes. The server now runs from the package.
- **Groundwork:** REQ-004 (signature over the description, public key committed) and REQ-008 (`system-level.json`, level check, `systemLevel` in `server-package.json`).
- **Removal plan:** `bootstrap.sh`, `AUTOBYTEUS_WORKSPACE_ROOT`, `AUTOBYTEUS_SKIP_SYNC`, the `/app` server layout.
- **Moved consumers:** the two Docker e2e probes, the CLI smoke test, compose (new `autobyteus-server-server-packages` volume), and the TESTING.md recipe.

Out of scope this round: AC-001..AC-010, AC-012 and AC-013 (steps 2–5).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`):
  - SCN-006 / BEH-001: the node owner runs `upgrade --all` to a new image. Only its BEH-001 part is in step 1; AC-006 needs the starter.
  - The release part of SCN-001/SCN-002 (UC-007, the source of packages).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - **RU-1, published node → step-1 image:** a node made by `new-container` from the published `:beta` gets `upgrade --all --image <step-1 image>`. The real trigger is the launcher command, against a Docker daemon whose only managed nodes are test-owned (code review CR-S5).
  - **RU-2, compose users:** `docker-start.sh up --build-local` with the new server-packages volume.
  - **RU-3, amd64 hosts:** a friend's amd64 machine runs the amd64 image. The package's native modules (Prisma engines, onnxruntime) are architecture-specific. Here it runs under QEMU on this arm64 host.
  - **RU-4, the TESTING.md recipe used by test runs:** a worktree's `dist` mounted read-only over `/opt/autobyteus/server-package/dist`. This is how both Docker probes run.
  - **RU-5, Windows owners:** the PowerShell launcher, which lost two `-e` items.
  - **RU-6, release owner:** a tag push publishes the 6 package files (CR-S1). Re-publish and zh dispatch are the forms CR-S2 and CR-S3.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): CC-04 (a dispatch whose `release_ref` version is not the tag) and CC-05 (an absolute link inside the package), both from the code review.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-003 / AC-011: package built into the image and published per architecture | Added | Handoff BEH-003 row; IMP-03/04, IMP-06/07 | Reuse IMP-06/07 (the workflow's own step bodies, byte identity). The GitHub run is only provable by a release |
| Server runs from `/opt/autobyteus/server-package` | Changed | `supervisor-autobyteus-server.conf`, Dockerfile runtime `COPY --from=server-package` | Real container starts: probes API-10/11, upgrade API-12, compose API-13, amd64 API-15 |
| BEH-001: `upgrade --all` keeps volumes | Preserved | `docker-runtime.sh start_node`; launcher `-e` args reduced | Real launcher against a real daemon (API-12) |
| Removed `bootstrap.sh`, `AUTOBYTEUS_WORKSPACE_ROOT`, `AUTOBYTEUS_SKIP_SYNC` | Removed | Removal plan | API-12/13: environment and file checks in the started container; IMP-01 retired-asset guard |
| Compose `autobyteus-server-server-packages` volume | Added | `docker-compose.yml` | API-13 |
| REQ-008 groundwork: `system-level.json`, check | Added | IMP-01, IMP-02 | Reuse |
| PowerShell launcher run args | Changed | `DockerRuntime.ps1` diff | API-14 parse check in a real `pwsh` |
| Docker e2e probe paths | Changed | probe diffs | API-10, API-11 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | No server source changed | — | — | — |
| API / transport / contract | Yes | C3 `server-package.json` and description format, frozen from the first release | IMP-01, IMP-06/07 | Only a real release proves the uploaded files | First release (user) |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Indirect | Nodes page against a Docker node whose server runs from the package | `nodes-docker-address-probe` (needs a run) | Package layout under a real browser journey | Browser probe API-11 |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes | Image start (supervisord → package), launcher recreate, compose start | IMP-05, IMP-09; fake-docker launcher tests | Real launcher upgrade from a published image; compose | Lifecycle API-12, API-13 |
| Persisted-data transition | Preserved | Volumes kept across recreate; `Not Affected` | — | Data written by `:beta` read by step 1 | API-12 |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | GitHub release upload, Docker Hub pull, signing secret | IMP-01 (fake gh/docker), IMP-06/07 (real docker, throwaway key), IMP-10 (secret set) | Real secret/key pair, 30-minute wait, upload | Only a release (needs the user) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, HEAD `4a968218e9` (code `01c56f1b95`, `5c33c1b7b0`).
- Project type and runtime stack: pnpm monorepo, Node 22, TypeScript server (`autobyteus-server-ts`), Nuxt/Electron web (`autobyteus-web`), Docker image `Dockerfile.monorepo`, bash and PowerShell launcher, GitHub Actions.
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/TESTING.md`. That is the worktree's copy, rewritten for the package layout in `5c33c1b7b0`. No closer `TESTING*.md` exists on the changed paths.
- Conflicting, missing, or unclear project instructions:
  - **O-1, `upgrade --all` reaches every labelled node:** `managed_node_names` (`docker-runtime.sh:67-85`) lists every container on the daemon with the label `com.autobyteus.launcher=server-docker`, whatever `AUTOBYTEUS_DOCKER_STATE_DIR` says. On this machine that includes the user's `autobyteus-server-0/1/2`, so `upgrade --all` on the host daemon would recreate them and could remove their image (`remove_unused_image_ids`). TESTING.md forbids touching them. The upgrade journey therefore runs against a separate test-owned Docker daemon (Docker-in-Docker), where the only managed nodes are test-owned.
  - **O-2, the address probe's default image:** `nodes-docker-address-probe.mjs` defaults `--docker-image` to the published `autobyteus/autobyteus-server:beta`. That image still has the `/app` layout, while the probe now reads `/opt/autobyteus/server-package/dist`. Until the first release with this change, the probe needs `--docker-image=<step-1 image>`. API-11 passes it.
  - **O-3, `upgrade` needs a registry:** `start_node` always runs `docker pull <image_ref>`, so a local-only tag cannot be the upgrade target. Inside the test daemon the step-1 image is served from a test-owned `registry:2` at `localhost:5000`.
- Required environment variables or secrets available: `N/A` for the planned cases. The release secret `SERVER_PACKAGE_SIGNING_KEY` exists only in GitHub and is not needed locally.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Docker server nodes | Test node rules | Never touch the user's nodes or volumes; test-owned container on `127.0.0.1`, free port, fresh volumes; the package recipe; `docker rm -f -v` |
| `TESTING.md` § Environments | Setup order | `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare`, `pnpm -C autobyteus-server-ts build`; one heavy run at a time; clean `env -i` for e2e |
| `TESTING.md` § Browser probes | Probe ownership | Probe owns its stack; fresh `--output-dir`; check the cleanup receipt |
| `TESTING.md` § Rerun by impact | Reuse | `git diff --name-only <validated> HEAD` decides Still valid / Rerun |
| `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs` header | Probe contract | `env -i PATH HOME TMPDIR RUN_PRISMA_ENGINE_DOCKER_E2E=1 pnpm -C autobyteus-server-ts test:e2e:prisma-engine-discovery:docker --image sha256:<id> --output-dir <new>`; needs network to `binaries.prisma.sh` |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` header | Probe contract | Needs a server build; `--docker-image=`, `--output-dir=`; 4–6 min |
| `scripts/public/docker/autobyteus-docker.sh` + `autobyteus-docker.d/bash/*` | Launcher | `AUTOBYTEUS_DOCKER_STATE_DIR`, `AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`; `new-container`, `upgrade --all [--image]`, `destroy --all`; bind mounts from the state dir |
| `autobyteus-server-ts/docker/docker-start.sh`, `build.sh`, `docker-compose.yml` | Compose path | `docker-start.sh up --build-local -p <project>` builds `autobyteus-server:latest` (single native platform, `--load`), runtime state in `docker/.runtime/` (git-ignored); `down -p <project> --volumes --delete-state` |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py:758-773` | PowerShell parse test | `pwsh -NoLogo -NoProfile -Command "$paths=@(…); foreach … [scriptblock]::Create(…)"`; skipped without `pwsh` (IMP-01 skip) |
| `.github/workflows/release-server-docker.yml` | Release path | No dry-run input; every dispatch pushes to Docker Hub and uploads to a GitHub release. `act` is not installed |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Workspace install and server build | worktree root | `pnpm install`; `pnpm -C autobyteus-server-ts prebuild`; `pnpm -C autobyteus-web exec nuxt prepare`; `pnpm -C autobyteus-server-ts build` | Serialized, one at a time | exit 0 | Untracked outputs stay in the worktree |
| Test Docker daemon (dind) | — | `docker run -d --privileged --name ab305-api-dind --label autobyteus.ab305-api=1 -v ab305-api-dind-lib:/var/lib/docker -v <test root>:<test root> docker:dind` | Isolated from the host daemon's containers; the test root is bind-mounted at the same path so the launcher's bind sources exist | `docker -H <dind> info` | `docker rm -f -v ab305-api-dind`; `docker volume rm ab305-api-dind-lib` |
| Test registry inside dind | — | `docker run -d -p 5000:5000 registry:2` (inside dind) | Serves the step-1 image to `docker pull` | `docker pull localhost:5000/...` | Removed with dind |
| Compose project | `autobyteus-server-ts/docker` | `./docker-start.sh up --build-local -p ab305-api-compose` | Builds `autobyteus-server:latest` (a new local tag; none exists now) | `/rest/health` 200 | `./docker-start.sh down -p ab305-api-compose --volumes --delete-state`; `docker image rm autobyteus-server:latest` |
| `pwsh` | — | `docker run --rm mcr.microsoft.com/dotnet/sdk:8.0 pwsh` (arm64) with the launcher sources mounted read-only (first try `mcr.microsoft.com/powershell:latest` pulled a 32-bit arm image that crashed under QEMU) | — | exit 0 | `--rm`; image removed after |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Data written by the published `:beta` server | GraphQL `createAgentDefinition` on the `:beta` node (the same mutation the Prisma probe uses) | Test-owned node volumes inside dind only | Removed with the dind volume |
| Root-home content (stands in for CLI sign-ins) | A marker file written in `/root` of the `:beta` node | No real credentials | Same |
| Probe data | Each probe's own mkdtemp root and containers | Probe-owned | Probe cleanup receipt |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected` for the data volume's formats. Step 1 changes no stored data, and the new compose volume is mounted empty.
- Design-spec and implementation-handoff references: design-spec "Persisted Data / State Transition Decision"; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: data the published `:beta` wrote (an agent definition through GraphQL, plus a root-home marker) is read unchanged by the step-1 server after `upgrade --all`. The step-1 server applies its own migrations at start, as every release does.
- Evidence planned: API-12 (read back through GraphQL, same named volumes, marker present). The Prisma probe API-10 covers recreation over the same data with this package.
- Migration-specific scenarios: `N/A`.
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/tests/test_server_package_release.py` (20 tests) | Describe, sign and key scripts; "Check system level"; package job step bodies with fake docker/gh; upload order; refusals | AC-011, REQ-004/008/009 | Still Valid | IMP-01 at `5c33c1b7b0`; read the test list in the code review | Reuse |
| `scripts/tests/test_docker_build_context_sources.py` | Build-context sources; retired assets incl. `bootstrap.sh` | Removal plan | Still Valid | IMP-01 | Reuse |
| `scripts/tests/test_public_docker_launcher_*.py` | Launcher args, state, recreate, volumes (fake docker) | BEH-001 | Still Valid | IMP-01 | Reuse; API-12 adds the real-daemon path |
| `test_public_docker_launcher_shared_workspace.py::test_powershell_launcher_parses_when_pwsh_is_available` | The PowerShell launcher parses | RU-5 | Still Valid, skipped in IMP-01 (no `pwsh`) | IMP-01 log line 55 | Run its command in a real `pwsh` (API-14) |
| `scripts/tests/server_docker_cli_smoke.py` | Image CLI layer and the package path probe | BEH-001 | Still Valid | IMP-09 | Reuse |
| `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs` | Prisma engines from the package; dist audit; recreation over the same data. Stage API003 also asserts that the pre-fix baseline resolver (`e22245f0`) selects the incompatible HOME cache | RU-4, BEH-001 | **Needs Update** (decided after API-10 round 1; was `Still Valid`). The baseline-prefers-cache precondition holds only in the `/app` layout. There `.pnpm` was at `/app/node_modules/.pnpm`, outside `appRoot=/app/autobyteus-server-ts`, so the baseline's `.pnpm` scan found nothing and fell back to the cache. In the package, `node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines` is inside `appRoot`, so the baseline also returns `bundled` | API-10 round 1 `events.jsonl`: `'bundled' !== 'cache'` at `native.mjs:15`. Layout check: `evidence/API-10-cause.log` | Update (see Durable Coverage To Update); rerun API-10 |
| `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs` | Nodes page and peer addresses with a Docker node | RU-4 | Still Valid (paths updated); default image transitional (O-2) | diff read | Run with `--docker-image` (API-11) |

## Planned Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps (for `Reused`: the implementation check ID) | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-011, REQ-004, REQ-008, REQ-009, REQ-013, BEH-001 | Scripts, workflow step bodies, launcher (fake docker/gh) | Reused | IMP-01 | Ran at `5c33c1b7b0`; `git diff --name-only 5c33c1b7b0 4a968218e9` touches only `tickets/`; header and `OK (skipped=2)` line present |
| API-02 | REQ-008 | Workflow lint, level check | Reused | IMP-02 | Same commit, same reason |
| API-03 | REQ-009 | Image build both architectures | Reused | IMP-03, IMP-04 | Images built from the `01c56f1b95` blobs; nothing outside `tickets/` changed since. These images are the subjects of API-10..API-15 |
| API-04 | AC-011, QR-001, REQ-004 groundwork | Package job step bodies on real images, byte identity, signature | Reused | IMP-06, IMP-07 | Same blobs; the evidence gives the manifest scripts, counts and `BYTE-IDENTICAL` |
| API-05 | BEH-001, REQ-009, REQ-013, read-only app root | Container start, TESTING recipe, CLI smoke, key creation, repository gates | Reused | IMP-05, IMP-08, IMP-09, IMP-10, IMP-11 | Same commit; each has its look-for line |
| API-10 | RU-4, REQ-009, BEH-001 | Real image + worktree dist; Prisma native engines from the package; recreation over the same data | Existing Test | `env -i PATH="$PATH" HOME=<tmp> TMPDIR=<tmp> RUN_PRISMA_ENGINE_DOCKER_E2E=1 pnpm -C autobyteus-server-ts test:e2e:prisma-engine-discovery:docker --image sha256:<step1 id> --output-dir <evidence>/API-10-prisma` | Code review hint 1 |
| API-11 | RU-4 | Browser (Nodes page) + host servers + Docker node from the package | Existing Test | `pnpm -C autobyteus-web test:e2e:nodes-docker-address --docker-image=autobyteus-server-305-test:step1 --output-dir=<evidence>/API-11-nodes-docker-address` | Code review hint 1 |
| API-12 | BEH-001 (preserved), REQ-009, Removal plan, persisted data `Not Affected` | Real launcher `new-container` + `upgrade --all` on a real (test-owned) Docker daemon | Journey | In dind: `new-container` from `autobyteus/autobyteus-server:beta` → health, GraphQL create, root-home marker → `upgrade --all --image localhost:5000/autobyteus-server-305-test:step1` → same volume names, new container, server cwd `/opt/autobyteus/server-package`, no `bootstrap.sh`, no removed env, data read back through GraphQL, marker present, `/mobile/` 200 → plain `upgrade --all` keeps it ("already running") → `destroy --all` keeps volumes | Code review hint 2; the real launcher path is not durable-automatable without a second daemon (see Durable Coverage To Add) |
| API-13 | Compose consumer, Removal plan | `docker-start.sh up --build-local` | Journey | `./docker-start.sh up --build-local -p ab305-api-compose` → 5 project volumes incl. `ab305-api-compose_autobyteus-server-server-packages` mounted at `/home/autobyteus/server-packages`, health 200, server cwd, no removed env → `down --volumes --delete-state` | Code review hint 3 |
| API-14 | RU-5 | PowerShell launcher sources in a real `pwsh` | Temporary Probe | The durable test's exact command in a real `pwsh` (`mcr.microsoft.com/dotnet/sdk:8.0`, arm64), sources mounted read-only | The durable test exists and skips without `pwsh`; this runs its assertion once |
| API-15 | RU-3, REQ-009 | amd64 image start (QEMU) | Temporary Probe | `docker run -d --platform linux/amd64 -p 127.0.0.1::8000 autobyteus-server-305-test:step1-amd64`, no volumes → health, server cwd, architecture `x64`, `server-package.json` arch | IMP-05 covered arm64 only; a one-off start check, not durable |
| API-16 | AC-011 (GitHub part) | Real release workflow | Not run | — | Needs a release (the user's request); no non-publishing run exists (no dry-run input, no `act`) |

- Test progress log needed: `Yes`

## Durable Coverage To Add

None. The launcher's real `upgrade --all` (API-12) needs a second Docker daemon, a registry and two 9 GB images. That is not a repository test the suites can run, so it stays a ticket journey. The fake-docker launcher tests (IMP-01) remain the durable layer.

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-10 | `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs`, stage API003 | Drop the pre-fix baseline resolver (`--baseline-ref`, `git show`, TypeScript transpile, `/fixture/base.mjs`). The incompatible cache's own schema engine, at its known path in the mounted HOME, now proves the fixture: its version names the wrong revision, and real native RPC fails with `-32601`. The current resolver must still select the package's bundled engines with that cache present, matched to the Prisma CLI's engines version, and the bundled RPC must succeed. The header text changes with it | The regression the probe guards (a retained `/root` with a stale engine cache must not decide the engines) stays fully asserted: current resolver, real RPC, startup log `Using Prisma engine overrides from bundled:`, recreation over the same HOME/data. Only the baseline comparison goes. In the package layout it can no longer show the old bug, so keeping it would assert a fact about old code, not about this product |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: install and build (serialized) → API-10 → API-11 → API-15 → API-14 → API-12 (dind) → API-13 (compose build). One heavy run at a time.
- Environment choices that materially affect the run: native arm64 for API-10..API-13; amd64 under QEMU for API-15; dind isolates the launcher from the user's nodes; the test root lives under `/private/tmp/ab305-api-e2e` (shared by Docker Desktop) and is bind-mounted into dind at the same path.
- Health / readiness checks: `/rest/health` returns `{"status":"ok"}`; supervisor status.
- Seed data / fixtures: GraphQL `createAgentDefinition` on the `:beta` node; a `/root` marker file.
- Test identities, authentication, permissions, or session state: none; runtime CLIs signed out.
- Requirement-linked journeys or scenarios: RU-1..RU-5.
- Evidence to capture: probe output folders and receipts; journey transcripts (launcher output, `docker inspect` mounts/env, health, GraphQL bodies, process cwd).
- Owned processes and temporary state to clean up: dind container and its volume (holding all API-12 nodes, volumes and the registry); compose project and its volumes; `autobyteus-server:latest`; pwsh image; probe roots. The containers `autobyteus-server-0/1/2` are never touched, and neither is the pre-existing `ab305-extract` container (implementation's).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-011 on GitHub: the real secret/key pair, runner disk, 30-minute wait, the upload of 6 files | Needs a release; the workflow has no non-publishing form, `act` is absent, and a fork run would push a public image | First release could be partial (R-05) or fail at the sign step (fails closed) | Yes (a release needs the user's request) | Delivery: watch the first release per RELEASE.md (23 assets); compare the published archive with the image's package |
| zh variant image build | Only its build argument changed (digest from `system-level.json`); covered by IMP-01; building zh is a full 9 GB build on another base | Low | No | None |
| AC-001..AC-010, AC-012, AC-013 | Steps 2–5 | — | No | Later steps |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (updated after API-10 round 1: `prisma-engine-discovery.docker.mjs`, see Durable Coverage To Update)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: `N/A`
- Notes: O-1 (launcher scope) is existing behavior that the user relies on (`upgrade --all` means every node). It is a test-safety constraint, not a defect.
