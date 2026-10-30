# API/E2E Coverage Investigation — autobyteus-305, build step 3 (in-place update by command)

The plan for round 3. Results are in `api-e2e-execution-coverage-report.md`. Earlier rounds:

- round 1: step 1, API-REV-001; plan at `48c2d82ea1`;
- round 2: step 2, API-REV-002; plan at `c052bb1aff`.

Both steps are merged into `personal`.

## Investigation Meta

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

- Requirements Doc: `requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (up to SR-010)
- Design Spec: `design-spec.md` (SR-009), "Change / Refactor Sequence" step 3; DS-002, DS-006, DS-007
- Supplemental Task Artifacts: `handoff-step-3.md`, `delivery-receipt-verification-step2.md`, `options-report.md`, `follow-ups.md` (FU-001..FU-006)
- Design Review Report: `design-review-report.md` (ARCH-REV-004, Pass; N-2, N-3)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-003)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-005, Pass, 9.5/10; CR3-N1)
- Code Review Revision Record: `code-review-revision-record.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`; this round `API-REV-003`
- Current Investigation Round: `3`
- Trigger: code review Pass of build step 3 (CRR-005)
- Prior Investigation Reviewed: round 2 (`c052bb1aff`). Nothing is open from it; FU-006 is a follow-up and RU-23 was taken into step 3 (SR-009).

## Current Requirement And Design Basis

Step 3 adds the in-place update by command:

- **Entry:** `autobyteus-docker update [--name <node> | --all] [--version <v>]` (bash and PowerShell). Without `--version`, the node's saved image ref decides the track: `autobyteus/autobyteus-server:latest` → stable, `:beta` → beta; a pinned tag or a custom image is refused with "pass --version". The launcher runs `cli.mjs update`, which calls C2 `POST /updates`, then follows `cli.mjs status` to the result.
- **Gates:** `UpdateService` checks INVALID_VERSION → NO_PACKAGES_VOLUME / NEEDS_NEW_IMAGE → UPDATE_RUNNING → track → NOT_NEWER.
- **`UpdateRun` (DS-006):**
  - checking: download, signature, binding, fit, SHA;
  - preparing: unpack, package match, space, self-check;
  - restarting: stop, data copy when the package brings a new migration, trial;
  - confirming: health, then alive 60 s;
  - then commit, or rollback with the data restored.
- **Stops (DS-007):** a stop before the switch aborts the run; a stop after it halts the run, and the next boot recovers.
- **RU-23:** without its own server-packages mount, a node refuses with NO_PACKAGES_VOLUME and its status carries `updateBlocker`.
- **CR2-N1:** the launcher's `status` shows each node's starter state, or "not available" for a stopped container or a pre-starter image (N-3).

In scope: AC-002, AC-003, AC-004, AC-005, AC-006, AC-008, AC-012, AC-013, the RU-23 gate and the DS-007 stop rows.

Not in scope: AC-001, AC-009 (request part) and AC-010 (step 4); AC-007 (step 5).

The implementation proved the starter's behavior in a real container (IMP3-06..IMP3-10) by driving `cli.mjs` and C1 directly. The real launcher against real Docker was not run, and neither was PowerShell.

## Supported Scenarios And Real Usage

- Designer scenarios:
  - **SCN-002 / UC-002:** the node owner updates a node by command, to a named version or to the newest on the node's track.
  - **SCN-003:** refusals before anything changes.
  - **SCN-004:** a new version that does not come up.
  - **SCN-005:** a package that needs a newer image.
  - **SCN-006 / AC-006:** moving to a new image after an in-place update.
- Real-use scenarios added:
  - **RU-31, step-2 nodes:** a node a user made with the current `personal` launcher (step 2, with its volume) gets the step-3 image by `upgrade --all`, then updates in place. This is the reviewer's item 2.
  - **RU-32, several nodes:** `update --all` across nodes on different tracks: `latest`, `beta`, a pinned tag, a custom image.
  - **RU-33, nodes the launcher cannot update:** `status` and `update` against a stopped container and against a pre-starter image (N-3).
  - **RU-34, after a failed update:** the failed version is not retried by itself, including across a container restart, and the owner's next update works. This is the reviewer's item 3.
  - **RU-35, an older installed launcher:** a node created by the step-1 (v6) launcher has no volume. The new launcher's `update` refuses NO_PACKAGES_VOLUME, `status` says why, and `upgrade --all` fixes it.
  - **RU-36, Windows owners:** PowerShell `update` and `status`.
  - **RU-37, a later image upgrade:** after the in-place update, a new `:beta` image arrives with an older built-in package (the node keeps its installed one), then with a newer one (the node runs the image's).
- Technically possible but contrived (not tested): none beyond those the design and review set aside.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Material Risk Not Exercised By It | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Starter update service, run, verifier, store, self-check, data copy | 48 starter tests (IMP3-01); container proofs IMP3-06..10 | — | Reuse |
| API / transport / contract | Yes | C2 `POST /updates`, `cli.mjs update` (frozen), C1 `updateBlocker` | IMP3-01, IMP3-03, IMP3-06/09 | Through the launcher's JSON reading | Lifecycle (launcher) |
| Process / lifecycle | Yes | Update in a launcher-managed container; restart after rollback; image upgrades after an in-place update | IMP3-06..10 (bare containers) | Launcher-managed recreate with the volume; `update --all` | Lifecycle |
| CLI | Yes | bash and PowerShell `update`, `status` | Fake-docker tests (bash); text contract (PowerShell) | Real docker exec, real JSON from a real starter, real waits; PowerShell never run | CLI on a test-owned daemon |
| Persisted data | Yes | Data copy and restore; installed packages in the volume | IMP3-06/08/10 | Data written by the released server, through the launcher | Lifecycle |
| Supply chain | Yes | Signature with the image's key | IMP3-07 (test key) | The production key: first release only | — |
| Browser / desktop | No (step 4) | — | — | — | — |

## Project Execution Discovery

- Worktree HEAD `213d86955a` (docs only on top of `a17033dc30`). Code commits: `31df015657`, `4985104751`, `c72107a0fd`; `71604951d4` changes only tests and RELEASE.md. The image `autobyteus-server-305-test:step3` was built from a clean clone of `c72107a0fd`, so the starter in it is the reviewed code.
- Testing guideline: `TESTING.md` (unchanged by step 3). Constraints as in rounds 1–2: O-1 (dind), O-3 (registry).
- **O-7, the track table needs the default repository name.** `update_track_for_image_ref` resolves a track only for `autobyteus/autobyteus-server:latest|beta`, and `new-container`/`upgrade` always `docker pull`. Inside the test daemon, `dockerd --registry-mirror=http://127.0.0.1:5000` serves `docker.io/autobyteus/autobyteus-server:<tag>` from the test registry, which holds the step-3 test-key image under `beta`, `latest` and `1.5.11-beta.5`. The pull therefore goes through Docker's normal mirror path, and the launcher sees the real repository name. Docker Hub is not reached for that repository.
- **O-8, test release and key:**
  - a fresh throwaway Ed25519 key pair (never committed; the private key is deleted at cleanup);
  - packages built with the implementation's harness `IMP3-proof-make-packages.sh`, which uses the repository's `describe-server-package.mjs` and `sign-server-package.mjs`, from the step-3 image's own built-in package;
  - the local release source `IMP3-proof-release-source.mjs` as a container in the test daemon (stable `1.5.12`, feed `1.5.13,1.5.12`);
  - test images `FROM` step 3 with the test public key and `AUTOBYTEUS_SERVER_PACKAGE_SOURCE=http://<test daemon bridge gateway>:18080/releases`. This is the design's test-only source variable.
- **O-9, versions:** the harness publishes 1.5.12 (plain), 1.5.13 (migration), 1.5.14 (migration, exits 30 s after start), 1.5.15 (system level 99), 1.5.16 (archive altered), 1.5.17 (older pair renamed), 1.5.18 (other key), 1.5.20 (exits at start); 1.5.19 is absent. The AC-006 images are the test image again with another ID (built-in `1.5.11-beta.5`), and the test image with `server-package.json` labelled `1.5.21` (O-5 emulation, as in round 2).
- PowerShell: Linux `pwsh` 7.4 with the docker CLI in the test daemon's network namespace. Nodes are created by a patched copy (FU-006); the unpatched launcher runs `update` and `status`.

## Persisted Data Transition Coverage Basis

- Decision: `Not Affected` for formats. DEC-005 byte copy and restore; installed packages and starter state in the node's volume.
- Planned evidence:
  - data written through GraphQL by the node's earlier version is read back after a successful migration update (1.5.13) and after a rollback (1.5.14);
  - the test migration's table exists after 1.5.13 and is absent after the 1.5.14 rollback;
  - `data-copy` is absent after both.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Validity | Action |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docker/starter/tests/*.test.mjs` (48) | All starter behavior, incl. the update flow with real processes and archives | Still Valid (IMP3-01) | Reuse |
| `scripts/tests/test_public_docker_launcher_update.py` (8) and the other launcher tests | bash `update`/`status` against the fake docker running the real in-container script with a fake `cli.mjs`; PowerShell text contract | Still Valid (IMP3-02) | Reuse; API-31 and API-36 add real docker and a real starter |
| `tests/unit/node-update/node-update-routes.test.ts` | C1 incl. `updateBlocker` | Still Valid (IMP3-03) | Reuse |
| Docker probes (Prisma, nodes address) | Unchanged by step 3 | Still Valid | Not rerun: step 3 does not change the server, the package build or the start (the image's start path is exercised by every API-3x node) |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Planned Steps (`Reused`: check ID) | Why |
| --- | --- | --- | --- | --- | --- |
| API-30 | AC-002..AC-006, AC-008, AC-012, AC-013, RU-23, DS-006, DS-007 | Starter, launcher fakes, C1, lints, image, container proofs | Reused | IMP3-01..IMP3-10 | Only `tickets/` changed after `71604951d4`; IMP3-05..10 used the `c72107a0fd` image, and `71604951d4` touches only tests and RELEASE.md |
| API-31 | AC-002, AC-006, AC-008, DEC-005, RU-31, RU-32, RU-33, RU-37, CR2-N1, N-3 | Real bash launchers on a test-owned daemon | Journey, phase 1 | Step-2 launcher (`origin/personal`) node on the step-2 image (with volume), seed, new launcher `upgrade --all --tag beta` (step-3 test image). Then `update --name autobyteus-server-0` (no version → beta → 1.5.13, migration): same container and image, data kept, table created, copy gone, C1 1.5.13. Add nodes on `latest`, pinned `1.5.11-beta.5` and a custom ref. `update --all` (no version): 0 NOT_NEWER, 1 → stable 1.5.12, 2 pinned refusal, 3 custom refusal. `update --all --version 1.5.12`: 0 and 1 NOT_NEWER, 2 and 3 update. `status` for all. Stop node 3 → `status` "not available (container exited)", `update` → "not running". A pre-starter node (step 1) → `status` "not available (no starter answer…)", `update` → "did not answer … upgrade --all". New `:beta` images: built-in 1.5.11-beta.5 with another ID → node 0 recreated, still 1.5.13 (installed); built-in labelled 1.5.21 → node 0 runs 1.5.21 (built-in) | Reviewer items 1 and 2; AC-006 through the launcher |
| API-32 | AC-003, AC-004, AC-005, AC-013, AC-008, AC-012, RU-34 | Real bash launcher, a fresh node on `beta` | Journey, phase 2 | Seed; `update --version 1.5.14` → `failed (FAILED_AFTER_SWITCH)`, old version, table absent, data kept. 90 s with no new attempt; `docker restart` → still 1.5.11-beta.5, still the failed state. `update --version 1.5.12` → success (second update after the rollback). Refusals through the launcher: 1.5.12 again (NOT_NEWER), 1.5.15 (NEEDS_NEW_IMAGE + command), 1.5.16 (ARCHIVE_MISMATCH), 1.5.17 (DESCRIPTION_MISMATCH), 1.5.18 (SIGNATURE_INVALID), 1.5.19 (NO_PACKAGE_FOR_VERSION), `latest` (INVALID_VERSION); each leaves the same server pid and `state.json`. Log scan for the test key and credentials | Reviewer item 3; refusals through the real launcher |
| API-33 | RU-23, RU-35 | Step-1 (v6) launcher node, new launcher | Journey, phase 3 | v6 `new-container --tag beta` (no volume) → new `status` "in-place update unavailable: …"; `update --version 1.5.12` → `refused (NO_PACKAGES_VOLUME)`; new `upgrade --all` (v7, volume) → `status` without the blocker | The RU-23 user path |
| API-36 | RU-36 | PowerShell launcher (Linux `pwsh`) | Journey, phase 4 | Node by the patched copy on `beta`; unpatched `status`, `update` (no version → 1.5.13), `status`, `update --version 1.5.12` (NOT_NEWER), stopped container `status`/`update` | Reviewer item 4 |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

None. These journeys need a second Docker daemon, a registry mirror, signed multi-hundred-MB packages and several 9 GB images, so they stay ticket journeys. The durable layers are the starter tests and the fake-docker launcher tests.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| The production key and GitHub-hosted packages | Needs a release | The first release proves it | Yes (a release needs the user) | Delivery at the first release with step 3 |
| amd64 | No step-3 amd64 image; the starter is JavaScript; `tar` and `node` are the image's | Low | No | — |
| Windows PowerShell host | No Windows host | Low (platform-neutral logic) | No | — |

## Investigation Decision

- Proceed: `Yes`. Durable changes: `No`. Reroute: `No`.
