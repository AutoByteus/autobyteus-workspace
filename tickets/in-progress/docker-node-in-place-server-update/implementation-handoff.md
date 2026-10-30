# Implementation Handoff — autobyteus-305, build step 2 (starter and server-packages volume)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High, independent architecture review selected. ARCH-REV-003 `Pass` confirms that the ARCH-REV-002 Pass of SR-005 covers step 2 (`design-review-report.md`, `architecture-review-revision-record.md`).
- Requirements doc: `requirements-doc.md` (Approved, SR-003)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (SR-005 design; SR-006 wording; SR-007 step 1 receipt)
- Design spec: `design-spec.md` (SR-005), "Change / Refactor Sequence" step 2
- Supplemental task artifacts: `handoff-step-2.md`, `delivery-receipt-verification-step1.md`, `options-report.md`, `follow-ups.md`
- Design review report: `design-review-report.md` (ARCH-REV-003 Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Earlier round: build step 1 (IR-001) passed code review (CRR-001) and API/E2E, and was finalized into `personal` (merge `eec6522b27`, DR-001). Its record is `implementation-revision-record.md` IR-001 and the step-1 evidence `evidence/IMP-*`.

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

## Current Implementation Summary

Build step 2: **the starter and the server-packages volume.** supervisord now runs the starter, which chooses and runs the node's server package and serves its status. The server relays that status to the desktop over C1 `GET /rest/node-update`. The launcher gives every node a `<node>-server-packages` volume. Nothing updates in place yet (step 3).

- Implementation cycle: `Initial` (for step 2)
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-005` (SR-006, SR-007)
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A` for step 2 (step 1: CRR-001, CRR-002)
- Related API/E2E revision IDs: `N/A` for step 2
- Related delivery revision IDs: `N/A` for step 2 (step 1: DR-001)
- Triggering finding IDs: `N/A`. Carried from step 1: CR-N1 (code side) is done here; CR-N2 and CR-N3 were already done in step-1 delivery.
- Branch and commits: `codex/docker-node-in-place-server-update`, base `origin/personal` @ `77fb8bf2d1`:
  - `b1029fc1b0` feat(docker): the starter runs the node's server package
  - `82e2e7f931` docs(testing): the Docker starter test layer and its package choice in test nodes
  - the ticket-documents commit that carries this handoff and the `IMP2-*` evidence
- Not pushed. No release.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section: design-spec.md "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: step 2 adds a new process owner between supervisord and the server, the frozen contracts C1, C2 (status) and C4 (start), a server route, launcher changes in two shells with a config-hash bump (every node is recreated once), and boot recovery code that restores the data folder. No escalation trigger fired:
  - the server does not write into its app root: the installed package runs from the volume (IMP2-08 F);
  - the server's bounded stop (autobyteus-284) ends within the starter's limit: a supervisord stop took 0.14 s (IMP2-07 C).
- Selected route: `Code Review`
- Lightweight self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. The deviations D-1..D-3 below stay within the design's intent and are for the reviewer to confirm.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / REQ-012 / AC-006 (DS-003) | The node keeps the newest version it already ran; an older image's built-in package never replaces it; when nothing it may run fits, `NEEDS_NEW_IMAGE` | `starter/starter.mjs` (`NodeStarter.run`: recovery and cleanup → `PackageStore.choose` → `ServerSupervisor.start` or refuse → socket); `starter/package-store.mjs` (`choose`, the three outcomes; `state.json`); `starter/system-facts.mjs` (fit: Node module version, architecture, system level from `/opt/autobyteus/system-level`) | Done. Unit: 8 package-store cases (IMP2-01). Container: NEEDS_NEW_IMAGE with no server, the starter up and no restart loop; an older current → the built-in package becomes current; an installed newer package runs from the volume (IMP2-08) |
| DS-007 (mode supervising) | One owner of the server child; the server's exit ends the starter with its code; SIGTERM → stop the server → exit 0 | `starter/server-supervisor.mjs`: spawn `node <pkg>/dist/app.js --host --port --data-dir` (C4) detached (own group), cwd the package, `AUTOBYTEUS_STARTER_SOCKET` in env; stop: SIGTERM, 120 s, SIGKILL of the group; the group is killed after every exit; a start waits up to 30 s for a free port; `exitCodeOf` (128 + signal) | Done. Unit: 5 cases with real child processes (IMP2-01). Container: SIGKILL of the server → exit 137 → supervisord restart → new server; `supervisorctl stop` → exit 0 in 0.14 s (IMP2-07) |
| DS-003 recovery and cleanup | An interrupted trial is rolled back (data copy restored), the update recorded `failed: INTERRUPTED`; leftovers removed | `NodeStarter.#recoverAndClean`; `PackageStore.rollBackTrial`, `removeLeftovers`; `starter/data-copy.mjs` (`restore`, repeatable; `delete`); `UpdateStatus.markInterrupted` | Done and unit-tested (IMP2-01: 2 boot cases). A trial can arise only from step 3 on (D-3) |
| BEH-007 / REQ-011 (C2 status, C1 GET) | The node reports its version, its last update and whether a new image is needed | C2: `starter/starter-socket.mjs` `GET /status[?target=]` on `/run/autobyteus/starter.sock` (0600), `starter/update-status.mjs` (the node's version, `server`, `update.json` as `UpdateState`, `target.relation`); `starter/cli.mjs status` (one JSON line, exit 0/1). C1: `src/node-update/node-update-routes.ts`, `src/node-update/starter-client.ts`; registered in `src/api/rest/index.ts`; `TRUSTED_NETWORK_OWNER` in `remote-access-route-policy.ts` | Done. Unit: C1 6 cases, route policy (phone 403), socket 400 (IMP2-01, IMP2-03). Container: CLI and C1 answers, phone 403, `INVALID_VERSION` 400 (IMP2-06) |
| Launcher (DS-002 groundwork) | `<node>-server-packages` volume, config hash, storage text | bash `container-config.sh` (run args, hash input, storage text moved here), `core.sh` (`CONFIG_HASH_VERSION` v7, `SERVER_PACKAGES_CONTAINER_PATH`); PowerShell new `ContainerConfig.ps1` (`Get-StateConfigHash`, `Get-ContainerRunArgs`, `Write-StorageForNode` moved from `DockerRuntime.ps1`), `Core.ps1`, entry module list | Done (IMP2-02 launcher tests). The IMAGE_REF → track table is deferred to step 3 (D-2) |
| Image | supervisord runs the starter | `Dockerfile.monorepo` (after the system-part marker: `/opt/autobyteus/system-level`, `/opt/autobyteus/starter/*.mjs`, `/home/autobyteus/server-packages`); `supervisor-autobyteus-server.conf` (`exec node /opt/autobyteus/starter/starter.mjs`, `stopwaitsecs=30` per the reviewer's note) | Done (IMP2-05, IMP2-06). System level unchanged: the system part did not change |
| Derived consumers | e2e test takes the server pid from the starter | `prisma-engine-discovery.docker.mjs`: `cli.mjs status` → `server.pid` | Done (syntax checked; the run is left to API/E2E) |
| CR-N1 (step 1, code side) | The way-out command for a zh re-publish names `-f publish_zh=true` | "Check system level" step of `release-server-docker.yml` | Done (IMP2-02: step test for default and zh) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Starter (new, Node built-ins only): `autobyteus-server-ts/docker/starter/`
  - `starter.mjs` (NodeStarter), `server-supervisor.mjs`, `package-store.mjs`, `update-status.mjs`, `starter-socket.mjs`, `cli.mjs`, `data-copy.mjs`;
  - small owned helpers: `release-version.mjs`, `system-facts.mjs`, `state-file.mjs` (atomic JSON writes), `starter-log.mjs`, `starter-paths.mjs`;
  - `tests/*.test.mjs` (26 tests, `pnpm -C autobyteus-server-ts test:starter`).
- Server: `src/node-update/node-update-routes.ts`, `src/node-update/starter-client.ts`, `src/api/rest/index.ts`, `src/api/security/remote-access-route-policy.ts`; tests `tests/unit/node-update/node-update-routes.test.ts`, `tests/unit/remote-access/route-policy.test.ts`.
- Image: `autobyteus-server-ts/docker/Dockerfile.monorepo`, `supervisor-autobyteus-server.conf`.
- Launcher: `scripts/public/docker/autobyteus-docker.d/bash/{core,container-config,docker-runtime}.sh`, `powershell/{Core,ContainerConfig,DockerRuntime}.ps1`, `autobyteus-docker.ps1`.
- Shared version vectors: `scripts/tests/release_version_vectors.json`, used by `test_release_versions.py` and `starter/tests/release-version.test.mjs`.
- Docs: `autobyteus-server-ts/docker/README.md` (starter, `cli.mjs status`, volume), `README.md`, `autobyteus-server-ts/README.md` (volume), `TESTING.md` (starter layer; package choice in test nodes; own commit).

## Important Assumptions

Deviations and decisions inside the design, for the reviewer to confirm:

- **D-1, boot order:** the design orders the boot socket → selection → start. The starter runs selection → start → socket. The C2 status then always describes a chosen state, with no "starting" value outside the frozen `state` enum. The socket is still listening before the server can use it: the server reaches the starter only while serving a C1 request, which it cannot do before it listens (seconds later).
- **D-2, launcher track table and status deferred to step 3:**
  - The IMAGE_REF → track table has no user until the launcher's `update` command (step 3); adding it now would be dead code (Principle 7).
  - The launcher's `status` printing the starter's state (DS-003 step 5) needs the same parsing of the CLI's JSON as `update`, so both go with step 3.
  - Until then, `NEEDS_NEW_IMAGE` is visible with `docker exec <container> node /opt/autobyteus/starter/cli.mjs status` (documented in the Docker README) and in the node's log.
- **D-3, recovery before it is reachable:** boot recovery of a trial (DS-003 step 1) is implemented in step 2, as scoped, with `DataCopy.restore`/`delete`. A trial is first recorded by step 3's `UpdateRun`; until then only unit tests reach this path. `DataCopy.take` and `needsCopy` come with step 3.
- **C2 status field meaning (frozen now):**
  - `version` is the node's version: the chosen package's version, or in `needsNewImage` the newest version that already ran (`state.current`);
  - `server` (`pid`, `packageVersion`, `source`) is present only while a server runs;
  - `update` is `update.json` merged over an idle `UpdateState`, keeping fields this starter does not know;
  - a `target` that is not a release version is answered `400 { code: "INVALID_VERSION", message }`, and C1 passes that 400 on.
- **`cli.mjs` socket:** `AUTOBYTEUS_STARTER_SOCKET` overrides the default `/run/autobyteus/starter.sock`, the same variable the server uses. Tests use it; `docker exec` uses the default.
- **Supervision details:**
  - after any server exit the starter kills the server's process group, so nothing it left outlives it (R-06);
  - before a start it waits up to 30 s for the port to be free, then starts anyway and logs `server-port-still-in-use`;
  - an exit by signal is passed on as 128 + the signal number (SIGKILL → 137);
  - `stopwaitsecs=30` follows the reviewer's note.
- **File size rule:** `DockerRuntime.ps1` (556 lines) and `docker-runtime.sh` (511) were over 500. The volume and storage text could not be added there, so PowerShell's config hash, run arguments and storage text moved to the new `ContainerConfig.ps1` (mirroring bash's `container-config.sh`), and bash's `print_storage_for_node` moved to `container-config.sh`. Now: 482 and 492 lines.
- **Config hash v7:** the new volume and its target are hash inputs, so `upgrade --all` recreates every node once and mounts the volume (DEC-014).

## Known Risks

- **The first image with the starter on a user's node:** `upgrade --all` recreates every node (new image and v7 hash). The new, empty `<node>-server-packages` volume makes the starter run the built-in package and record it. Not run on a launcher-managed test node here; listed for API/E2E.
- **A supervisord SIGKILL of the starter:** after `stopwaitsecs`, the detached server would outlive it, holding the port; the next starter waits 30 s for the port, then starts and the server fails to bind. This needs a server that ignores SIGTERM for more than 30 s, which the bounded shutdown of autobyteus-284 prevents. `docker stop` ends every process anyway.
- **PowerShell:** no `pwsh` on this machine, so the PowerShell launcher was checked by the text-contract tests only (its parse tests skip: `skipped=2`), not executed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` (feature)
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed`. The size-rule moves in the launcher are file placement, not a redesign.
- Implementation matched the reviewed assessment: `Yes`
- Routed as `Design Impact`: `N/A`
- Evidence / notes: the server needed only the thin C1 relay; the starter owns everything else.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. A container from an older image keeps its old entry; the new image has only the starter (DEC-014).
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. `supervisorctl pid` is no longer used by the e2e test. No new code is without a caller except the recovery path (D-3, scoped by the design).
- Dead code found elsewhere, added to `follow-ups.md`: none new
- Shared structures remain tight: `Yes` (`state.json` entries `{ source, version }`; one `UpdateState` shape; one owner of the node's version)
- Canonical shared design guidance reapplied: `Yes`
- Size guardrails: `Yes`. The largest new source file is `package-store.mjs` (124 lines); the files over 500 lines were shrunk, not grown.
- Notes: none

## Persisted Data / State Transition Check

- Approved decision: `Not Affected` for the data folder's formats; new starter state (`state.json`, `update.json`) with one writer and a tolerant reader
- Implementation follows it: `Yes`. Both files are written atomically (temporary file, then rename). The reader treats a missing file as no state, and update fields it does not know are kept.
- Deviation: `None`

## Environment Or Dependency Notes

- The local test image `autobyteus-server-305-test:step2` (`sha256:50b3211b4b38…`, arm64) is kept for reuse; the step-1 images too. All test containers and volumes were removed (`docker rm -f -v`, `docker volume rm`). The user's nodes `autobyteus-server-0/1/2` and their volumes were not touched.

## Checks Run

Evidence is in `evidence/` (files `IMP2-*`).

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP2-01 | `pnpm -C autobyteus-server-ts test:starter` | `82e2e7f931` | macOS arm64, Node 22 | all starter modules: selection, recovery, supervision with real child processes, socket, CLI, version vectors | AC-006, DS-003, DS-007, REQ-011 | Pass | `IMP2-01-starter-tests.log` | `# pass 26`, `# fail 0` |
| IMP2-02 | `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` | `82e2e7f931` | macOS arm64 | launcher (bash; PowerShell text contract), shared version vectors, workflow steps incl. CR-N1 | BEH-001, CR-N1 | Pass | `IMP2-02-script-tests.log` | `Ran 176 tests` … `OK (skipped=2)` |
| IMP2-03 | `vitest run tests/unit/node-update tests/unit/remote-access tests/unit/api tests/architecture`; `pnpm -C autobyteus-server-ts typecheck` | `82e2e7f931` | macOS arm64 | C1 route and client, route policy, REST, tracked-import guard | REQ-011, AC-009 (phone) | Pass | `IMP2-03-server-unit-and-typecheck.log` | `Tests  294 passed (294)`, `typecheck exit 0` |
| IMP2-04 | actionlint, shellcheck (vs base), check-system-level, licensing, hygiene, secret gate | `82e2e7f931` | macOS arm64 | workflow, launcher shell, level | REQ-013 | Pass | `IMP2-04-lint-and-gates.log` | `secret gate: PASS`, `System level 1: … unchanged` |
| IMP2-05 | `docker buildx build --load --platform linux/arm64 … -t autobyteus-server-305-test:step2 .` | `b1029fc1b0` inputs | Docker 29.0.1 | Dockerfile, starter copy, system-level file | — | Pass | `IMP2-05-image-build.log` | `COPY autobyteus-server-ts/docker/starter/*.mjs /opt/autobyteus/starter/`, `exit 0` |
| IMP2-06 | test container with test-owned volumes; `cli.mjs status`; C1 with targets; invalid target; phone bearer; process tree, socket mode, env | `b1029fc1b0` | arm64 | starter boot, C2, C1, route class, C4 env | REQ-011, AC-009, C4 | Pass | `IMP2-06-container-boot-status-c1.log` | `"relation":"newer"`, `400`, `403`, `server pgid: 101, starter pgid: 51`, `srw-------` |
| IMP2-07 | SIGKILL of the server; `supervisorctl stop` / `start` | `b1029fc1b0` | arm64 | DS-007 supervising | DS-007, R-04, R-06 | Pass | `IMP2-07-container-supervision.log` | `exit status 137; not expected` then a new pid; `stopped: autobyteus_server (exit status 0)`, `stop took .137` s |
| IMP2-08 | state written on the test volume while stopped: newer current (NEEDS_NEW_IMAGE), older current, installed 1.5.12 | `b1029fc1b0` | arm64 | DS-003 selection in the image | AC-006, REQ-012 | Pass | `IMP2-08-container-selection.log` | `"state":"needsNewImage"` + `RUNNING … uptime 0:00:19`; `"source":"installed"` + `server cwd: /home/autobyteus/server-packages/packages/1.5.12` |

- Not run, and why:
  - PowerShell execution: no `pwsh` here;
  - `test:e2e:prisma-engine-discovery:docker` (now reads the pid from `cli.mjs status`) and `test:e2e:nodes-docker-address`: heavy probe-owned stacks, left to API/E2E;
  - the launcher's `upgrade --all` from a step-1 image to the step-2 image on a test-owned node: API/E2E;
  - an amd64 build of the step-2 image: the starter is architecture-independent JavaScript, and the package build is unchanged from step 1 (amd64 proven in IMP-04/IMP-07);
  - the full server `test:unit`: only the route registration and route policy changed in the server; the suites around them ran (IMP2-03).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: step 2 changes no rendered frontend. The desktop UI is step 4.

## Downstream Coverage Hints / Suggested Scenarios

- Launcher on test-owned nodes only (never `autobyteus-server-0/1/2`):
  - `new-container` with a step-2 image: the volume exists and `storage` lists it;
  - `upgrade --all` from a step-1 image: the node is recreated once (v7), the data is kept, the starter runs the built-in package.
- `docker stop` / `docker start` of a node: the starter boots again and selects the same package (`state.json` is kept in the volume).
- C1 from a desktop on the trusted network and from a phone credential, against a real node.
- The two Docker e2e probes against `autobyteus-server-305-test:step2`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The launcher upgrade path and the Docker e2e probes listed above.
- Step 2 delivers no in-place update yet: AC-001..AC-005, AC-008 and AC-013 come with steps 3 and 4.
