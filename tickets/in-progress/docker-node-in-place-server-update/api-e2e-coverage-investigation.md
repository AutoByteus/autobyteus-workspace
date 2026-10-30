# API/E2E Coverage Investigation — autobyteus-305, build step 2 (starter and server-packages volume)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

Round 1 validated build step 1 (API-REV-001, Pass; step 1 is merged into `personal` as `eec6522b27`). Its plan is in git at `48c2d82ea1` and summarized in `api-e2e-revision-record.md`. This file is now the round-2 plan, for build step 2.

## Investigation Meta

All paths are in the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-005; SR-006 wording; SR-007 step-1 receipt)
- Design Spec: `design-spec.md` (SR-005), "Change / Refactor Sequence" step 2; DS-003, DS-007, C1/C2/C4
- Supplemental Task Artifacts: `handoff-step-2.md`, `delivery-receipt-verification-step1.md`, `options-report.md`, `follow-ups.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-003, Pass, 9.5/10; CR2-N1)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A` for step 2 (step 1: DR-001)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002` (this round)
- Current Investigation Round: `2`
- Trigger: code review Pass of build step 2 (CRR-003), message from `/software_engineering_team/code_reviewer`
- Prior Investigation Reviewed: round 1 (step 1), `48c2d82ea1`
- Latest Authoritative Investigation: this file, round 2

## Current Requirement And Design Basis

Build step 2:

- **Starter under supervisord.** At boot it recovers an interrupted trial and cleans up leftovers, then chooses (DS-003) one of three outcomes:
  - the installed package, when it fits and is not older than the built-in one;
  - the built-in package, when it fits and is not older than the newest version that already ran, which it records as current;
  - `NEEDS_NEW_IMAGE`: no server; the starter stays up and serves its status.
- **`ServerSupervisor` owns the server child (DS-007):** its own process group; the server's exit ends the starter with the same code; SIGTERM leads to a bounded stop.
- **C2 status:** `GET /status[?target=]` on the starter socket, and `cli.mjs status`.
- **C1 `GET /rest/node-update`:** route class `TRUSTED_NETWORK_OWNER`, so phones are refused. It answers `unavailable` without `AUTOBYTEUS_STARTER_SOCKET` and `error` when the starter does not answer, and passes a 400 from the starter on.
- **Launcher (bash and PowerShell):** the `<node>-server-packages` volume, config hash v7, the storage text. The PowerShell module `ContainerConfig.ps1` is new.

In scope this round:

- BEH-001 / REQ-012 / AC-006, the boot-selection part. The in-place install that makes "installed" reachable comes with step 3; IMP2-08 covered it by writing state.
- BEH-007 / REQ-011, the status part.
- AC-009, the phone part.
- DS-003 and DS-007.
- The DEC-014 first move to the starter image.

Not in scope: AC-001..AC-005, AC-007, AC-008, AC-010, AC-012 and AC-013 (steps 3–5). CR2-N1 says the launcher's `status` does not show `NEEDS_NEW_IMAGE` until step 3. That is accepted and gets recorded, not failed.

## Supported Scenarios And Real Usage

- Designer and reviewer scenarios covered:
  - **SCN-006 / CR2-S1:** first move to the starter image with `upgrade --all`.
  - **CR2-S2:** server crash. Reused from IMP2-07.
  - **CR2-S3:** container stop and start.
  - **CR2-S4:** retargeting to an older image gives `NEEDS_NEW_IMAGE`.
  - **CR2-S5:** C1 from the trusted network, and from a phone.
- Real-use scenarios added from investigating the implemented behavior:
  - **RU-21, from the published `:beta`:** the next release carries steps 1 and 2 together. The published `:beta` has the `/app` layout and no starter, so most users go straight from it to the starter image. Trigger: the installed launcher's node, then the reinstalled launcher's `upgrade --all`.
  - **RU-22, from a step-1 image:** nodes built from `personal` after step 1 (the handoff's hint).
  - **RU-23, installed launcher not refreshed:** a user who has not reinstalled the launcher (v6, no server-packages volume) upgrades to the starter image. The starter then keeps `state.json` in the container layer. That is fine in step 2, but it matters for step 3 (observation only).
  - **RU-24, PowerShell launcher actually run** (Windows owners): `new-container`, `storage`, `upgrade --all` against a real daemon. Before this round it was never executed, only parsed.
  - **RU-25, compose users with the starter image:** the compose file mounts `autobyteus-server-server-packages`, and the starter records its state there.
  - **RU-26, the launcher's own `stop`, then plain `upgrade --all`:** the launcher's `docker start` path. The starter boots again over the same `state.json`.
- Technically possible but contrived (not tested): CC-06 (supervisord SIGKILL of the starter while a server ignores SIGTERM for more than 30 s). The reviewer rejected it as unreachable with the bounded shutdown.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Starter as the supervisord program; boot selection (DS-003) | Added | IR-002 trace; IMP2-01, IMP2-06, IMP2-08 | Reuse the unit and container checks. Through the launcher: first move (API-12 A/B/C), stop/start (API-12 A), `NEEDS_NEW_IMAGE` by retargeting (API-12 D) |
| `ServerSupervisor` (DS-007) | Added | IMP2-01, IMP2-07 | Reuse (crash, stop timing). `docker stop`/`start` through API-12 |
| C2 status and `cli.mjs status` | Added | IMP2-01, IMP2-06 | API-12 (each phase), API-10 (the probe reads the pid from it) |
| C1 `GET /rest/node-update`, route class | Added | IMP2-03, IMP2-06 (made-up phone bearer) | API-21: a real node, a real paired phone credential (403) with a positive control, targets newer/same/older/invalid |
| Launcher volume, hash v7, storage text (bash) | Changed | IMP2-02 (fake docker) | API-12 on a real daemon |
| PowerShell launcher (`ContainerConfig.ps1`) | Changed | IMP2-02 text contract only; parse skipped | API-14 parse; API-22 real run against a real daemon |
| Prisma probe pid source | Changed | diff | API-10 |
| Persisted data | Preserved (`Not Affected`); new starter state | handoff | API-12: data from `:beta` and step 1 read back; `state.json` across restarts |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Starter selection, supervision, status | 26 starter tests with real child processes (IMP2-01) | The real image, real volumes, the launcher's lifecycle | Lifecycle (API-12) |
| API / transport / contract | Yes | C1 (frozen), C2 (frozen), route class | Unit tests with fastify inject (IMP2-03); container curl (IMP2-06) | A real paired phone credential; the C1 relay over the real socket in a launcher node | Live API (API-21) |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Indirect | Nodes page against a starter-run Docker node | Address probe | Starter in the way of the browser journey | Browser probe (API-11) |
| Authentication / session / permissions | Yes | `TRUSTED_NETWORK_OWNER` on `/rest/node-update` | Route-policy unit test | Real phone credential | API-21 |
| Desktop renderer / shell | No | — | — | — | — |
| Process / lifecycle | Yes | supervisord → starter → server; container stop/start; recreate | IMP2-06/07/08 on bare containers | Launcher-managed recreate with the volume; restart over state | API-12, API-22, API-13 |
| Persisted-data transition | Preserved + new state | `state.json`/`update.json` in the volume | Unit; IMP2-08 | Survival across stop/start and recreate | API-12 |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No new | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`, HEAD `5939cc48be`. The code is in `b1029fc1b0`; `82e2e7f931` changes `TESTING.md` only.
- Testing guideline: `TESTING.md` of the worktree. It now has a "Docker starter" layer (`pnpm -C autobyteus-server-ts test:starter`), and the Docker rule covers package choice in test nodes. No closer guideline exists.
- Instructions learned or carried from round 1:
  - **O-1:** `upgrade --all` reaches every launcher-labelled container on the daemon, so the launcher runs only on a test-owned `docker:dind` daemon.
  - **O-3:** the launcher always pulls, so images come from a registry inside dind.
- **O-5, emulating "a newer release image":** `NEEDS_NEW_IMAGE` through the launcher needs a node that ran a newer version than an image's built-in package, and the only step-2 image is `1.5.11-beta.5`. I derive an image from `step2` whose `server-package.json` says `1.5.12-beta.1`, which is the only field the selection reads (`package-store.mjs choose`). It is named and recorded as an emulation. A real rebuild with a bumped version would only add build time.
- **O-6, running the PowerShell launcher:** `pwsh` is not on the host. A throwaway image, `mcr.microsoft.com/dotnet/sdk:8.0` (arm64, pwsh 7.4) plus the docker CLI from `docker:cli`, runs the real `autobyteus-docker.ps1` inside dind's network namespace. It uses `AUTOBYTEUS_DOCKER_STATE_DIR`/`AUTOBYTEUS_DOCKER_SHARED_WORKSPACE_DIR`, which `Core.ps1` honors, and a test root at the same path in both containers. This is Linux `pwsh`, not Windows: the Windows default paths (`%LOCALAPPDATA%`) are not exercised.
- Phone credential (API-21): the real pairing flow on the node. The pairing URL must be one a phone can reach: `pairing-url-policy.ts` refuses loopback (learned in the first run). The rerun pairs with the node's private address. `PUT /rest/remote-access/settings {phoneAccessEnabled:true}`, then `POST /rest/remote-access/pairing-sessions`, then `POST /rest/remote-access/pairing-exchanges` gives an `mra_…` credential. That flow is taken from `tests/e2e/remote-access/phone-access-running-routes.e2e.test.ts`. The device is revoked afterwards.
- Secrets: none needed.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Docker server nodes, § Environments, § Browser probes, Rerun by impact | As round 1 | Rebuild the worktree's `dist` after the base merge before the probes mount it |
| `autobyteus-server-ts/docker/README.md` | Starter usage | `docker exec <container> node /opt/autobyteus/starter/cli.mjs status` |
| `autobyteus-server-ts/docker/starter/*.mjs` | Selection, status shape | `choose()` reads only `server-package.json` and `state.json`; the C2 `version`/`state`/`server`/`update`/`target.relation` fields |
| `src/node-update/*.ts`, `remote-access-route-policy.ts`, `src/api/rest/remote-access.ts` | C1 and pairing | As above |
| Launcher bash/PowerShell | As round 1 | v7 hash; `server_packages_volume` |

| Component / Dependency | Start / Setup | Readiness | Stop / Cleanup |
| --- | --- | --- | --- |
| Worktree install and build | `pnpm install`, `prebuild`, `nuxt prepare`, `pnpm -C autobyteus-server-ts build` | exit 0 | untracked outputs |
| `ab305-api-dind` + registry | as round 1 | `docker info` | `docker rm -f -v`, volume rm |
| Derived image `ab305-api-step2-labelled-1.5.12-beta.1` | `docker build` from `step2` (one `RUN` editing `server-package.json`) | inspect | `docker image rm` |
| pwsh helper image `ab305-api-pwsh-docker` | `FROM mcr.microsoft.com/dotnet/sdk:8.0` + `COPY --from=docker:cli` | `pwsh -v`, `docker version` | `docker image rm` (with its bases) |
| Compose project `ab305-api-compose` | `docker-start.sh up --no-build -p ab305-api-compose` with `step2` tagged `autobyteus-server:latest` (a tag owned by this run; none exists) | health | `down --volumes --delete-state`; untag |

## Persisted Data Transition Coverage Basis

- Decision: `Not Affected` for the data folder. The new starter state (`state.json`, `update.json`) has one writer and a tolerant reader.
- Representative existing data:
  - an agent definition created through GraphQL on `:beta` (phase A) and on step 1 (phase B), plus a `/root` file;
  - after the move, `state.json` records `{current:{source:"builtIn",version:"1.5.11-beta.5"}}`, and it survives `docker stop`/`start` and the launcher's `stop` + `upgrade --all`.
- Evidence planned: API-12.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/starter/tests/*.test.mjs` (26) | Selection, recovery, supervision, socket, CLI | DS-003, DS-007, C2 | Still Valid | IMP2-01 | Reuse |
| `tests/unit/node-update/node-update-routes.test.ts`, `route-policy.test.ts` | C1 relay outcomes; phone 403 | REQ-011, AC-009 | Still Valid | IMP2-03 | Reuse; API-21 adds the real-credential path |
| `scripts/tests/test_public_docker_launcher_*.py` | Launcher args, v7 hash, volume, storage (fake docker); PowerShell text contract | BEH-001 | Still Valid | IMP2-02 | Reuse; API-12/API-22 add the real daemon |
| `…shared_workspace.py::test_powershell_launcher_parses_when_pwsh_is_available` | Parses `autobyteus-docker.ps1`, `Core.ps1`, `DockerRuntime.ps1`, `Commands.ps1` | RU-24 | Still Valid: the source list already includes `ContainerConfig.ps1` (test file line 37) | read | Run its command in a real `pwsh` (API-14) |
| `prisma-engine-discovery.docker.mjs` | pid from `cli.mjs status` | RU-4 | Still Valid | diff | Run (API-10) |
| `nodes-docker-address-probe.mjs` | unchanged | RU-4 | Still Valid | — | Run (API-11) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps (`Reused`: check ID) | Why |
| --- | --- | --- | --- | --- | --- |
| API-20 | AC-006 (selection), REQ-011, AC-009, DS-003, DS-007, BEH-001, REQ-013 | Starter units, launcher fakes, server units, lints, image build, container boot/C1/supervision/selection | Reused | IMP2-01..IMP2-08 | `git diff --name-only 82e2e7f931 5939cc48be` touches only `tickets/`; IMP2-05..08 used `b1029fc1b0` inputs, and only `TESTING.md` changed after it. Each has a header and a look-for line |
| API-10 | RU-4 | Prisma Docker probe on `step2` (pid from `cli.mjs status`) | Existing Test | as round 1, `--image sha256:50b3211b4b38…`, `--output-dir evidence/API-10-step2-prisma` | Hint 5 |
| API-11 | RU-4 | Nodes page browser probe with a `step2` Docker node | Existing Test | as round 1, `--docker-image=autobyteus-server-305-test:step2`, `--output-dir=evidence/API-11-step2-nodes-docker-address` | Hint 5 |
| API-12 | CR2-S1, CR2-S3, CR2-S4, RU-21..23, RU-26, BEH-001, REQ-012/AC-006 selection, BEH-007 | Real bash launchers on a test-owned dind daemon | Journey | **A** (RU-21): `origin/personal` launcher `new-container --tag beta`, seed, new launcher `upgrade --all --image <step2>`; volume, v7 label, starter and `cli.mjs status`, `state.json`, data kept; `storage` lists the volume; `docker stop`/`start`; launcher `stop` + plain `upgrade --all`. **B** (RU-22): same from a step-1 image. **C** (RU-23): `origin/personal` launcher `upgrade --all --image <step2>` (no volume), starter state in the container layer; then the new launcher's plain `upgrade --all` recreates once (v7) and mounts the volume. **D** (CR2-S4): new launcher on the labelled `1.5.12-beta.1` image, then `upgrade --all --image <step2>` (older): `NEEDS_NEW_IMAGE`, no server, the starter up for 60 s with the same pid (no restart loop), the message in `cli.mjs status` and the log, and what the launcher's `status` shows (CR2-N1); then back to the newer image, which runs again | Hints 1–3; the real launcher lifecycle is not durable-automatable here (needs a second daemon) |
| API-21 | AC-009 (phone), REQ-011, C1 | C1 on a real launcher node | Journey (in API-12 phase A) | `GET /rest/node-update` without and with `target` newer/same/older/`latest` (400); pair a phone through the public pairing flow, then C1 with its bearer (403 `REMOTE_ACCESS_AUTH_INVALID`); positive control: the same credential on `GET /rest/remote-access/status` or GraphQL works; revoke | Hint 4 |
| API-14 | RU-24 | PowerShell sources in a real `pwsh` | Temporary Probe | the durable test's command with all 5 module files | Hint 6 |
| API-22 | RU-24, BEH-001 | The real PowerShell launcher against the dind daemon | Journey | Helper image; `pwsh autobyteus-docker.ps1 new-container --tag beta` → `storage` → `upgrade --all --image <step2>` → checks as API-12 A (volume, v7, starter, health) → `destroy --all` keeps volumes | Hint 6; never executed before |
| API-13 | RU-25 | Compose with the step-2 image | Journey | `docker-start.sh up --no-build -p ab305-api-compose` with `step2` tagged `autobyteus-server:latest`; starter running, `state.json` in the project's server-packages volume; down | The compose volume now has a reader |
| API-15 | — | amd64 | Not run | — | No step-2 amd64 image. The starter is architecture-independent JavaScript, its architecture fit is unit-tested (IMP2-01), and the package build is unchanged since step 1's amd64 proof |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

- To add: none. The launcher journeys need a second Docker daemon and multi-GB images, so they stay ticket journeys.
- To update: none (the PowerShell parse test already lists `ContainerConfig.ps1`).
- To remove: none.

## Live Environment And Fixture Plan

- Order (one heavy run at a time): install/build → API-10 → API-11 → API-14 → dind: API-12 (A–D, with API-21 inside A) → API-22 → teardown → API-13.
- Evidence: probe folders; journey transcripts with `CHECK PASS/FAIL` lines; `cli.mjs status` JSON; `state.json`; launcher output.
- Cleanup: as round 1, plus the derived and helper images and the `autobyteus-server:latest` tag. Not touched: `autobyteus-server-0/1/2` and their volumes, the implementation's `autobyteus-server-305-test:*` images, `ab305-extract`.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| amd64 step-2 image | No image; the starter is JavaScript | Low | No | — |
| PowerShell launcher on Windows (default `%LOCALAPPDATA%` paths, Docker Desktop for Windows) | No Windows host | Low: the change is in the run args, hash and text, all exercised on Linux `pwsh` | No | — |
| PowerShell `new-container` / fresh port pick | Pre-existing `Get-UsedPorts` bug found in API-22 (round-2 execution); identical on `origin/personal` | Windows owners cannot create nodes with the PowerShell launcher | No | FU-006 (follow-up; the step-2 paths are proven with the unpatched launcher) |
| The launcher `status` line for `NEEDS_NEW_IMAGE` | Step 3 (D-2, CR2-N1) | Accepted by review | No | Step 3 |

## Ambiguities Or Reroute Triggers

None known at planning.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Notes: none
