# Implementation Handoff — autobyteus-305, build step 3 (in-place update by command)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High, independent architecture review selected. ARCH-REV-004 `Pass` for SR-009, which is SR-005 plus the step-3 delta: RU-23 (`NO_PACKAGES_VOLUME`, `updateBlocker`) and CR2-N1 (launcher `status`). Reports: `design-review-report.md`, `architecture-review-revision-record.md`.
- Requirements doc: `requirements-doc.md` (Approved, SR-003)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md` (up to SR-009)
- Design spec: `design-spec.md` (SR-009), "Change / Refactor Sequence" step 3
- Supplemental task artifacts: `handoff-step-3.md`, `delivery-receipt-verification-step2.md`, `options-report.md`, `follow-ups.md`
- Earlier rounds:
  - step 1: IR-001, passed CRR-001, finalized (DR-001);
  - step 2: IR-002, passed CRR-003 and API/E2E (API-REV-002), finalized (DR-002, merge `a0f4b491f7`).
  - Their evidence: `evidence/IMP-*`, `evidence/IMP2-*`.

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

## Current Implementation Summary

Build step 3: **the in-place update by command.** A Docker node replaces its server package inside its running container on `autobyteus-docker update` or `cli.mjs update`:
- it downloads the package and verifies its signature and binding;
- it checks that the package fits and that there is space for the package and, when needed, a data copy;
- it self-checks the package on loopback;
- it stops the old server, takes the data copy when the update brings a migration, and starts the new version as a trial;
- then it confirms and commits, or rolls back (data restored).

The launcher (bash and PowerShell) gets `update` with the IMAGE_REF → track table, and its `status` shows what each node's starter runs. Nodes without their own server-packages volume refuse with `NO_PACKAGES_VOLUME` and report it in their status as `updateBlocker`. The desktop UI (C1 POST, the row) is step 4.

- Implementation cycle: `Initial` (for step 3)
- Implementation revision record: `implementation-revision-record.md`, current `IR-003`
- Related solution revision IDs: `SR-009`
- Related architecture-review revision IDs: `ARCH-REV-004`
- Related code-review / API/E2E / delivery revision IDs: `N/A` for step 3
- Triggering finding IDs: `N/A`. ARCH-REV-004 notes N-2 (one gate rule for status and request) and N-3 (launcher `status` and `update` against stopped or pre-starter containers) are applied.
- Branch and commits: `codex/docker-node-in-place-server-update`, base `origin/personal` @ `6b34f900b6`:
  - `31df015657` feat(docker): in-place server update by command
  - `4985104751` fix(docker): a stopping starter leaves an update past its switch to the next boot
  - `c72107a0fd` fix(docker): boot deletes server packages nothing refers to
  - `71604951d4` test(docker): DS-006 download and package-match failures; RELEASE.md in-place update
  - the ticket-documents commit with this handoff and the `IMP3-*` evidence
  - The two `fix` commits are defects found by my own container proof (see IR-003).
- Not pushed. No release.

## Routing Classification (Mandatory)

- Task size: `Large`; Architecture risk: `High` (design-spec.md "Task Size And Architectural Risk")
- Classification confirmed or changed: `Confirmed`
- Rationale: step 3 delivers the supply-chain path (signature, binding, fit), the data copy and restore, a process state machine across a stop of the starter itself, a new frozen request surface (C2 `POST /updates`, the `cli.mjs update` arguments) and the launcher command in two shells. None of the design's escalation triggers fired:
  - the package is byte-identical (step 1);
  - the app root is read-only (step 2);
  - the bounded stop: the old server stopped within the limit in every proof run (no `update-stop-timeout` in the logs);
  - the data copy stays in the node's own volume.
- Selected route: `Code Review`
- New design impact: `None`. The decisions below stay inside the design.

## Reviewed Behavior Implementation Trace

| Behavior / AC | Approved Change | Implemented Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-003, REQ-001/002/004/009/015, AC-002, AC-008, AC-013 | Update by command to an exact or track-resolved newer version, verified, in the same container | `starter/cli.mjs update` → C2 `POST /updates` (`starter-socket.mjs`) → `UpdateService.request` (`update-service.mjs`: gates INVALID_VERSION → nodeBlocker (NO_PACKAGES_VOLUME, NEEDS_NEW_IMAGE) → UPDATE_RUNNING → track via `ReleaseSource.resolveTrack` → NOT_NEWER; request log with `requestedFrom`) → `UpdateRun` (`update-run.mjs`, DS-006 in call order) with `ReleaseSource` (`release-source.mjs`), `PackageVerifier` (`package-verifier.mjs`), `PackageStore` (unpack with the image's `tar`, install, trial transitions, `deleteOthers`), `SelfCheck` (`self-check.mjs`), `DataCopy` (`data-copy.mjs`), `UpdateStatus` (steps written before they run) | Container: 1.5.11-beta.5 → 1.5.12 → 1.5.13, same container ID and image ID, C1 shows the new version; NOT_NEWER exit 2; NO_PACKAGE_FOR_VERSION; tracks stable/beta (IMP3-06, -07, -09) |
| BEH-004, REQ-005, AC-003 | Any refusal before the switch changes nothing | Every pre-switch error removes this run's files (`#removeFiles`), keeps `state.json`, and leaves the old server running | Container: SIGNATURE_INVALID (other key), DESCRIPTION_MISMATCH (older signed pair renamed), ARCHIVE_MISMATCH, NEEDS_NEW_IMAGE, NO_PACKAGE_FOR_VERSION: the same pid, the same state each time (IMP3-07). Unit: 10 refusal/failure codes incl. SELF_CHECK_FAILED, DOWNLOAD_FAILED, a package/description mismatch after unpack (IMP3-01) |
| BEH-004, REQ-006, AC-004, DEC-005 | A new version that does not come up: the old version back, on its pre-update data when the update migrated | `UpdateRun.#switch`: needsCopy decided and space checked before the stop; copy complete before `beginTrial`; confirm = health within 180 s then alive 60 s; rollback = stop → restore → `rollBackTrial` → delete copy → discard → start old → `endUpdate` | Container: 1.5.14 migrates (table created), exits after 30 s → FAILED_AFTER_SWITCH, table gone, old version; 1.5.20 exits at start → FAILED_AFTER_SWITCH (IMP3-07, -08) |
| DS-007 (modes, stops) | One owner of the child; supervised and updating modes; a stop before the point of no return aborts, after it halts and the next boot recovers | `server-supervisor.mjs` (`beginUpdate`/`endUpdate`, `supervisedExit`, `shutdown`), `server-process.mjs` (spawn/stop/health shared with SelfCheck), `starter.mjs` (`run`, `stop` → `UpdateService.stopRun`), `UpdateRun.abort/halt` | Container: a stop during the trial, during the data copy (806 MB of 6 GB copied), and a kill during the restore (595 MB of 6 GB restored). Each next boot ended with the old version on intact data, `INTERRUPTED`, and no leftover packages (IMP3-08, -10). Unit: SERVER_EXITED_DURING_UPDATE, a stop before the switch, a stop during the trial (IMP3-01) |
| REQ-008, AC-005 | A package that needs a newer image is refused with the command | `PackageVerifier.checkFit` → NEEDS_NEW_IMAGE with `autobyteus-docker upgrade --all --tag <version>` | Container: system level 99 (IMP3-07) |
| QR/space, DEC-005 | Not enough space is refused before the stop | `UpdateRun.#prepare`: archive + unpacked + 512 MB, plus data size + 10 % + 512 MB when needsCopy; re-checked after the stop | Container: 900 MB volume (package) and 1.9 GB volume (package + copy) refused, nothing changed (IMP3-09) |
| RU-23 (SR-009) | `NO_PACKAGES_VOLUME` gate and `updateBlocker` | `system-facts.mjs` `isOwnMount` (`/proc/self/mountinfo` field 5); `UpdateService.nodeBlocker` is the one rule for both the request gate and the status (`status()` → `UpdateStatus.status(target, blocker)`), N-2; C1 passes `updateBlocker` on (`node-update-routes.ts`) | Container without the volume: status and C1 show the blocker; the request is refused with the same message (IMP3-09) |
| REQ-012, AC-006 | A recreated container keeps the newest installed version | Step-2 selection, with the installed package from this step | Container: recreated from the same image after 1.5.13 → still 1.5.13 (installed) (IMP3-06) |
| REQ-013, AC-012 | No secrets in logs | The starter logs names, versions, codes and messages only; the signing key never reaches a node | Container: the supervisor logs and state JSON of a full run, 28 KB, have no `PRIVATE KEY` and none of the test key's lines (IMP3-06) |
| DS-002, CR2-N1 | Launcher `update` (bash, PowerShell) with the track table; `status` shows the starter's state | bash `node-update.sh` (`starter_call` runs `cli.mjs` in the container and reads its JSON with the container's own node; `update_track_for_image_ref`; `update_node` follows the steps; `print_starter_line`); `commands.sh` (`update`, `--version`), `core.sh` help; PowerShell `NodeUpdate.ps1`, `Commands.ps1`, `Core.ps1`; entry module lists | Bash: 8 tests against the fake docker, whose `exec` runs the launcher's real in-container script with a fake `cli.mjs`: steps and result, failure exit code, the track table incl. a pinned and a custom image, `--all`, option refusals, a pre-starter image, and the status lines incl. "not available" (N-3) (IMP3-02). PowerShell: text contract only (no `pwsh`) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Starter (`autobyteus-server-ts/docker/starter/`, Node built-ins and the image's `tar`):
  - new: `update-service.mjs`, `update-run.mjs`, `release-source.mjs`, `package-verifier.mjs`, `self-check.mjs`, `server-process.mjs`, `update-error.mjs`;
  - changed: `server-supervisor.mjs`, `package-store.mjs`, `data-copy.mjs`, `update-status.mjs`, `system-facts.mjs`, `starter-socket.mjs`, `cli.mjs`, `starter.mjs`, `starter-paths.mjs`;
  - tests: `tests/update-flow.test.mjs` (new) and the extended fixtures. 48 starter tests in all.
- Server: `src/node-update/node-update-routes.ts` (`updateBlocker`), its test.
- Image: `Dockerfile.monorepo` copies the public key to `/opt/autobyteus/starter/server-package-signing-key.pem`. The system part is unchanged, so the level stays 1.
- Launcher: bash `node-update.sh` (new), `commands.sh`, `core.sh`, entry; PowerShell `NodeUpdate.ps1` (new), `Commands.ps1`, `Core.ps1`, entry. Tests: `scripts/tests/test_public_docker_launcher_update.py` (new); the shared fake docker gains `exec`.
- Docs: `autobyteus-server-ts/docker/README.md` (in-place update section, the starter's `update` form, the test source variable), `README.md` (launcher `update`), `RELEASE.md` (Deployment).

## Important Assumptions

Decisions inside the design, for the reviewer to confirm:

- **Refused versus failed** (the `state` in `UpdateState`):
  - `refused`: the request cannot be met, and nothing was changed. INVALID_VERSION, NOT_NEWER, UPDATE_RUNNING, NO_PACKAGES_VOLUME, NEEDS_NEW_IMAGE, NO_PACKAGE_FOR_VERSION, SIGNATURE_INVALID, DESCRIPTION_MISMATCH, ARCHIVE_MISMATCH, and NOT_ENOUGH_SPACE before the stop.
  - `failed`: something went wrong while doing it. DOWNLOAD_FAILED, SELF_CHECK_FAILED, SERVER_EXITED_DURING_UPDATE, FAILED_AFTER_SWITCH, INTERRUPTED, and NOT_ENOUGH_SPACE after the stop.
  - An unexpected error is `failed` with `code: null` and its message.
- **Request gates answer at once:** the C2/CLI answer is the gate result (202 `accepted` with the resolved version, 409 `refused`). A refused request leaves `update.json` alone. Every later outcome, including NO_PACKAGE_FOR_VERSION, goes to `update.json`; `cli.mjs update` returns at acceptance, as frozen.
- **Step names (frozen with C2):** `checking`, `downloading`, `preparing`, `restarting`, `confirming`, `rollingBack`. On success `step` keeps its last value (`confirming`).
- **A stop past the point of no return halts the run** (DS-007 rows "updating, steps 4–7 or rollback | SIGTERM"). The trial stays recorded and the next boot rolls it back. My proof first showed the run racing the exit (see IR-003).
- **Boot cleanup also deletes every installed package other than the current and the previous one** (DEC-013). This removes a package left by an update stopped after its download, and the interrupted trial's package. Before this fix, about 1 GB stayed on the volume (IR-003).
- **During the trial** the status already reports the trial's pid and version (`setRunning`). On rollback it reports the old version again; until then its `version` is the trial's. The update state says `confirming`.
- **The rollback records `failed` once the old server is spawned,** not once it answers its health check (supervision takes over from there).
- **Unpacking uses the image's `tar`** (`tar -xzf … --no-same-owner`), after the archive's SHA-256 matched the signed description; Node has no built-in tar.
- **`STOP_TIMEOUT`** (old server stopped by force) is logged and appended to the success message; it is not a result code.
- **Launcher JSON:** bash reads the CLI's JSON with the container's own `node`, because the host may have no JSON tool. It accepts only the known field names before assigning them (`printf -v`).
- **Proof without the launcher on this machine:** the launcher's default node names (`autobyteus-server-0..`) collide with the user's containers, so the real-container proof drove `cli.mjs` and C1 directly. The launcher's own logic is proven against the fake docker.

## Known Risks

- **The release that ships step 3:** its notes must tell launcher users to reinstall the launcher (`curl … | bash -s -- install`, or the PowerShell equivalent), then run `autobyteus-docker upgrade --all` (RU-23). Nodes made by an older launcher refuse with `NO_PACKAGES_VOLUME` until then. For delivery.
- **The real release path is still unproven:** GitHub-hosted packages and the production signing key are exercised only by the first release. The proof used the same scripts with a test key and a local source.
- **PowerShell** was not executed (no `pwsh`); its `update` and `status` are text-checked only.
- **During a data copy or restore the starter stays busy:**
  - the copy is asynchronous, so status still answers;
  - the restore is synchronous: a SIGTERM waits for it, and `docker stop`'s 10 s may SIGKILL the starter during a large restore. The next boot then repeats the restore (proven: IMP3-10).

## Task Design Health Assessment Implementation Check

- Change posture `Larger Requirement`; root cause `No Design Issue Found`; refactor `No Refactor Needed`.
- Implementation matched the reviewed assessment: `Yes`. Spawning and stopping a server moved into `server-process.mjs`, shared by ServerSupervisor and SelfCheck (no duplicate), with ServerSupervisor still the only owner of the node's child.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`; legacy retained: `No`.
- Dead code in touched files removed: `Yes`. The step-2 deferrals D-2 (track table, launcher status) are now used.
- Shared structures tight: `Yes` (one `UpdateState`, one gate rule for blocker and request, one `UpdateError` with `code` and `outcome`).
- Size guardrails: `Yes`. The largest starter file is `update-run.mjs` (202 lines); the launcher runtime files stay at 492/482 lines; the new modules are 127 and 95 lines.

## Persisted Data / State Transition Check

- Approved decision: `Not Affected` for the data formats; a byte copy and restore of the data folder per DEC-005; starter state with one writer.
- Implementation follows it: `Yes`:
  - the copy is written to `data-copy.partial` and renamed when complete;
  - `beginTrial` is written only after that;
  - restore clears and copies (repeatable);
  - `state.json` and `update.json` are written atomically.
- Deviation: `None`

## Environment Or Dependency Notes

- Local images kept for reuse:
  - `autobyteus-server-305-test:step3` (clean clone of `c72107a0fd`);
  - `autobyteus-server-305-test:step3-testkey` (test key and local source; built from IMP3-proof-Dockerfile.testkey).
- The proof's packages and test key are under `/tmp/ab305/proof/`. The throwaway private key was never committed or printed.
- All test containers and volumes were removed (label `autobyteus.validation=ab305-s3`: 0 left). The user's nodes `autobyteus-server-0/1/2` and their volumes were not touched.

## Checks Run

Evidence is in `evidence/` (`IMP3-*`). The proof harness is the `IMP3-proof-*` files.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP3-01 | `pnpm -C autobyteus-server-ts test:starter` | `71604951d4` | macOS arm64, Node 22 | all starter modules; update-flow with real processes, a local source, real archives, signed descriptions | AC-002..AC-006, AC-008, AC-013, DS-006, DS-007 | Pass | `IMP3-01-starter-tests.log` | `# pass 48`, `# fail 0` |
| IMP3-02 | `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` | `71604951d4` | macOS arm64 | launcher `update`/`status` (bash), track table, PowerShell text contract, earlier script tests | DS-002, CR2-N1, N-3 | Pass | `IMP3-02-script-tests.log` | `Ran 184 tests` … `OK (skipped=2)` |
| IMP3-03 | server unit tests around C1; `pnpm -C autobyteus-server-ts typecheck` | `71604951d4` | macOS arm64 | C1 incl. `updateBlocker`, route policy | REQ-011 | Pass | `IMP3-03-server-unit-and-typecheck.log` | `Tests  295 passed (295)`, `typecheck exit 0` |
| IMP3-04 | actionlint, shellcheck (vs base), `node --check`, system level, licensing, hygiene, secret gate | `71604951d4` | macOS arm64 | workflow, launcher, starter | REQ-013 | Pass | `IMP3-04-lint-and-gates.log` | `secret gate: PASS`, `System level 1` |
| IMP3-05 | image build from a clean clone; test image | `c72107a0fd` | Docker 29.0.1 | Dockerfile, key copy | — | Pass | `IMP3-05-image-build-clean-clone.log` | `COPY …server-package-signing-key.pem`, `exit 0` |
| IMP3-06 | S3-01: updates by command 1.5.11-beta.5 → 1.5.12 → 1.5.13 (migration), NOT_NEWER, log scan, recreation | `c72107a0fd` | test container + volumes, local source | DS-006 success path, DataCopy, commit, C1, selection | AC-002, AC-006, AC-008, AC-012, DEC-005 | Pass | `IMP3-06-proof-updates-by-command.log` | `same container: yes, same image: yes`; `table after: 1; data copy after: absent`; `PRIVATE KEY: 0`; `after recreation: version=1.5.13` |
| IMP3-07 | S3-02: NEEDS_NEW_IMAGE, ARCHIVE_MISMATCH, DESCRIPTION_MISMATCH, SIGNATURE_INVALID, NO_PACKAGE_FOR_VERSION; a trial that exits at start | `c72107a0fd` | same | gates and verification, rollback | AC-003, AC-004, AC-005, AC-013 | Pass | `IMP3-07-proof-refusals.log` | `(unchanged)` after each code; `FAILED_AFTER_SWITCH: 1.5.20 did not come up (it exited with code 3 …` |
| IMP3-08 | S3-03: migrate-then-fail with restore; container stop during the trial | `c72107a0fd` | same | rollback, restore, boot recovery | AC-004, DS-007 | Pass | `IMP3-08-proof-rollback-and-stops.log` | `table after rollback: 0`; after the trial stop `INTERRUPTED … this node runs 1.5.11-beta.5 again`, `table: 0` |
| IMP3-09 | S3-04: NOT_ENOUGH_SPACE (package; package + copy), NO_PACKAGES_VOLUME, tracks | `c72107a0fd` | tmpfs volumes, no volume | space checks, RU-23, ReleaseSource | RU-23, DEC-005, DS-002 | Pass | `IMP3-09-proof-space-volume-tracks.log` | `needs 2.06 GB … (the package and a copy of the data folder)`; `"updateBlocker":{"code":"NO_PACKAGES_VOLUME"`; `--track beta: {"accepted":true,"version":"1.5.13"}` |
| IMP3-10 | S3-05: `docker stop` during the copy, `docker kill` during the restore (6 GB data file) | `c72107a0fd` | same | DS-007 halt, boot cleanup and repeatable restore | DS-003, DS-007, DEC-005 | Pass | `IMP3-10-proof-stop-during-copy-and-restore.log` | `data-copy.partial 806M` → `INTERRUPTED`, `data file intact: yes`, no package left; kill at `595M` restored → `trial-rolled-back … dataRestored:true` |

- Not run, and why:
  - the launcher against real Docker (its node names collide with the user's containers on this machine): left to API/E2E with test-owned names;
  - PowerShell (no `pwsh`);
  - the real GitHub release path with the production key (needs a release);
  - amd64 (the starter is architecture-independent and the image build is unchanged since step 1);
  - the Docker e2e probes (unchanged by step 3).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: no rendered frontend changes in step 3 (the Nodes row is step 4).

## Downstream Coverage Hints / Suggested Scenarios

- The launcher on real Docker with test-owned node names (for example a state dir and a copy of the launcher with another `NODE_NAME_PREFIX`):
  - `update`, `update --all`, and `update` without `--version` on `latest`/`beta`/pinned images;
  - `status` with a stopped container and with a pre-starter image (N-3).
- An upgrade from a step-2 image node with its volume, then an in-place update.
- A second update after a rollback, to check that the failed version is not retried by itself.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- The launcher path above; PowerShell where `pwsh` is available.
- AC-001 (from the desktop) and AC-009/AC-010 come with step 4; AC-007 with step 5.
