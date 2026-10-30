# API/E2E Execution Coverage Report — autobyteus-305, build step 3 (in-place update by command)

The run record and the result. The plan is `api-e2e-coverage-investigation.md`; the history is `api-e2e-revision-record.md`.

Earlier rounds:

- round 1: step 1, API-REV-001, Pass 95%; report at `48c2d82ea1`;
- round 2: step 2, API-REV-002, Pass 94.7%; report at `c052bb1aff`.

Both steps are merged into `personal`. This file now holds the round-3 result.

## Round

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003`
- Test progress log: `api-e2e-test-progress.md` (section "Round 3")
- Round and trigger: round 3, after code review Pass of build step 3 (CRR-005)
- Prior round reviewed: round 2 (Pass). No failure was open from it.
- Deviations from the investigation's plan: none in the cases. Two step-print checks were stricter than the launcher's design; see API-31 and API-36 Notes.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/evidence/` (round-3 files `API-3x-*`)

## Routing Classification

- Task size `Large`, architectural risk `High`, input route `Reviewed`, successful-output route `Code Review`.
- Proportional test-code review decision: `Not Applicable`. No durable test code changed.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-3 | `213d86955a` (docs on top of `a17033dc30`; starter code `c72107a0fd`, launcher code at HEAD) | Test-owned `docker:dind` on Docker Desktop 29.0.1 (macOS 26.5.2 arm64), `dockerd --registry-mirror=http://127.0.0.1:5000` | Test image `sha256:63c8a7958efe…` = `autobyteus-server-305-test:step3` (clean clone of `c72107a0fd`) plus the throwaway test public key and `AUTOBYTEUS_SERVER_PACKAGE_SOURCE=http://172.18.0.1:18080/releases`, served as `autobyteus/autobyteus-server:{beta,latest,1.5.11-beta.5}` through the mirror (O-7), and as the custom ref `127.0.0.1:5000/ab305/custom:s3`. Also `step1` and `step2` images. Bash launchers: this branch, `origin/personal` @ `6b34f900b6` (step 2) and `77fb8bf2d1` (step 1, v6), run by macOS `/bin/bash` 3.2.57 | Release source: `IMP3-proof-release-source.mjs` in the test daemon (stable 1.5.12, feed 1.5.13,1.5.12). Packages 1.5.12–1.5.20 built by `IMP3-proof-make-packages.sh` from the step-3 image's own built-in package, signed with a fresh throwaway key (deleted after the run) |
| ENV-5 | same | Linux `pwsh` 7.4 (`mcr.microsoft.com/dotnet/sdk:8.0` + the docker CLI) in the test daemon's network namespace | This branch's `autobyteus-docker.ps1` | Nodes created by a patched copy (FU-006); `status`/`update` by the unpatched launcher |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-30 | AC-002..AC-006, AC-008, AC-012, AC-013, RU-23, DS-006, DS-007 | Starter (48 tests with real processes and archives), launcher fakes, C1, lints, clean-clone image, container proofs incl. stops during trial, copy and restore | Reused IMP3-01..IMP3-10 | — | Pass | — | — | Only `tickets/` changed after `71604951d4`, which itself touches only tests and RELEASE.md; IMP3-05..10 used the `c72107a0fd` image my test image is built on. IMP3-08/10 (container stop during the trial and the copy, kill during the restore) are the DS-007 stop evidence; the launcher has no part in those paths |
| API-31 | AC-002, AC-006, AC-008, DEC-005, RU-31, RU-32, RU-33, RU-37, CR2-N1, N-3 | Real bash launchers on a test-owned daemon (phase 1) | `evidence/API-3x-launcher-update.sh <worktree> evidence/API-3x-launcher-update.log <test root>`, phase 1 | ENV-3 | Pass | `API-3x-launcher-update.log` (sections "API-31"), `API-3x-launcher-update.sh`, `API-3x-Dockerfile.{T,B,C}` | `CHECK PASS: docker pull of autobyteus/autobyteus-server:beta resolves to the test image through the mirror`; step-2 node → `upgrade --all --tag beta`: `node 0 data kept after the upgrade`, `status line … shows the starter's version`. `update --name autobyteus-server-0`: `updating to 1.5.13` … `Updated to 1.5.13.`, `same container and same image after the update`, `node 0 runs 1.5.13, installed`, `the 1.5.13 migration ran (table present)`, `data written by 1.5.11-beta.5 kept`, `no data copy left after the commit`, C1 `"version":"1.5.13"`. `update --all`: `refused (NOT_NEWER)` (0), `updating to 1.5.12` (1, stable), `This node is pinned to 1.5.11-beta.5; pass --version.` (2), `This node uses a custom image (…); pass --version.` (3); `--version 1.5.12`: 2 and 3 updated. `status`: `server: 1.5.13`, `server: not available (container exited)`, `server: not available (no starter answer; images before the starter have none)`; `the container is not running; start it first.`; `… run: autobyteus-docker upgrade --all`. AC-006: `node 0 keeps the installed 1.5.13 (built-in 1.5.11-beta.5 is older)`, `node 0 runs the image's 1.5.21 (built-in)` | One `CHECK FAIL: launcher printed the steps and the result`. The check wanted `checking`/`downloading` and `restarting` lines, but the launcher prints the step it sees at each 2 s poll: here `preparing` and `confirming`. With the local source, checking and downloading take under 2 s, and `restarting` (stop, copy of a small data folder, trial spawn) is also short. The target and the result were printed every time. This is the launcher's design (poll and print changes), so the failure is the check's expectation, not a defect; see the residual note. **Observation:** after the move to the 1.5.21 image, `state.json` still lists `previous: builtIn 1.5.11-beta.5`, a package that image no longer has. Nothing reads `previous` outside an update (downgrades are a non-goal; DEC-013 keeps it for rollback), so no criterion is affected |
| API-32 | AC-003, AC-004, AC-005, AC-008, AC-012, AC-013, RU-34 | Real bash launcher, a fresh `beta` node (phase 2) | Same script, phase 2 | ENV-3 | Pass | `API-3x-launcher-update.log` (sections "API-32") | `failed (FAILED_AFTER_SWITCH): 1.5.14 did not come up (it exited with code 3 within 60 s of answering); 1.5.11-beta.5 runs again on the data as it was before the update.`; `the 1.5.14 migration is gone (data restored)`, `no data copy or 1.5.14 package left`; `90 s later: same update record`, `after a restart: still 1.5.11-beta.5, the update record unchanged`, `exactly one update request for 1.5.14`; `second update succeeded`. `RESULT … (NOT_NEWER)`, `(INVALID_VERSION)`, `(NEEDS_NEW_IMAGE): This update needs a new Docker image: it needs system level 99, this image provides 1. Get it with: autobyteus-docker upgrade --all --tag 1.5.15`, `(ARCHIVE_MISMATCH)`, `(DESCRIPTION_MISMATCH)`, `(SIGNATURE_INVALID): The package description for 1.5.18 is not signed by AutoByteus.`, `(NO_PACKAGE_FOR_VERSION): No server package was published for 1.5.19 …`, each with `the same starter pid, state.json unchanged`; AC-012: `scanned 211338 bytes …`, `no 'PRIVATE KEY' and no line of the test private key in the node's logs` | The exit-at-start case (1.5.20) is reused from IMP3-07; the migrate-then-fail case is run here through the launcher |
| API-33 | RU-23, RU-35 | Node of the step-1 (v6) launcher, new launcher (phase 3) | Same script, phase 3 | ENV-3 | Pass | `API-3x-launcher-update.log` (section "API-33") | `server: 1.5.11-beta.5, in-place update unavailable: /home/autobyteus/server-packages is not this node's own volume, so an update would be lost when the container is recreated. Reinstall the launcher, then run: autobyteus-docker upgrade --all`; `refused (NO_PACKAGES_VOLUME)`; after `upgrade --all`: `Launcher config changed …; recreating`, `no blocker in status, server-packages volume mounted` | The RU-23 path a user with an old launcher takes |
| API-36 | RU-36 | PowerShell launcher in Linux `pwsh` (phase 4) | Same script, phase 4 | ENV-5 | Pass | `API-3x-launcher-update.log` (section "API-36") | `pwsh autobyteus-docker.ps1 status` → `server: 1.5.11-beta.5`; `update --name autobyteus-server-0` → `updating to 1.5.13` … `Updated to 1.5.13.`, `the node runs 1.5.13 installed, same container`; `status` → `server: 1.5.13`; `--version 1.5.12` → `refused (NOT_NEWER)`; stopped: `server: not available (container exited)`, `the container is not running; start it first.` | One `CHECK FAIL: PowerShell update printed the target and steps`, with the same cause as in API-31: polling. The target and the result were printed |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-002: host command `update` with a version or without (newest on the node's track) → the node runs it in the same container and image; unknown version refused | Yes | API-31 (track beta and stable, named versions, `--all`, the same container and image), API-36 (PowerShell), API-32 (`latest` INVALID_VERSION, 1.5.19), API-30 | Proven | — |
| AC-003: altered or wrongly signed build, or altered description → refused before anything changes, the old version keeps serving without a restart, reason shown | Yes | API-32 (ARCHIVE_MISMATCH, DESCRIPTION_MISMATCH, SIGNATURE_INVALID with the same pid and state), API-30 (IMP3-07) | Proven. The production key is exercised only by a real release | The production-key signature is checked by the first release (the user's request); the logic is the same with the test key |
| AC-004: a verified build that fails → the old version on its pre-update data, "failed after switch, old version restored", not retried by itself | Yes | API-32 (1.5.14 migrate-then-exit: data restored, no retry over 90 s and a restart, the next update works), API-30 (IMP3-07 exit at start; IMP3-08) | Proven | — |
| AC-005: needs a newer system layer → refused, "needs a new Docker image" with the launcher command | Yes | API-32 (1.5.15), API-30 | Proven | — |
| AC-006: `upgrade --all` to an image whose built-in is older than the installed version keeps it; newer → the image's version | Yes | API-31 (both directions, through the launcher), API-30 (IMP3-06), round 2 API-12 D (`NEEDS_NEW_IMAGE` alternate) | Proven | — |
| AC-008: target equal to or older than the running one → refused, nothing changes | Yes | API-31, API-32, API-36 (NOT_NEWER) | Proven | — |
| AC-012: no tokens, keys or credentials in logs | Yes | API-32 (log scan of a node after a full update, a rollback and seven refusals), API-30 (IMP3-06) | Proven | — |
| AC-013: no server build published → "no server build was published for X", nothing changes | Yes | API-32 (1.5.19), API-30 | Proven | — |
| RU-23: `NO_PACKAGES_VOLUME` and `updateBlocker`; the fix by `upgrade --all` | Yes | API-33, API-30 (IMP3-09) | Proven | — |
| AC-001, AC-009 (request part), AC-010; AC-007 | — | — | Not in step 3 | Steps 4 and 5 |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 95% | API-31..API-36, API-30 | Production key and GitHub source (release only) | The first release |
| Changed-boundary execution directness | 80% | 95% | Real launchers in both shells against real starters | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | Docker's own mirror pull path for the default repository; packages from the release scripts; data written by the earlier version | Local release source instead of GitHub (the design's test source) | The first release |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Three launcher generations as users have them; macOS `/bin/bash` 3.2 | Windows host for PowerShell | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | Rollback with restore, no retry across a restart, seven refusals, stopped and pre-starter nodes; stops during the update (IMP3-08/10) | — | — |
| User-surface (CLI) confidence | 85% | 95% | Readable target, refusal reasons and results in both shells; `status` lines for every node state | Short steps are not always shown (polling) | — |
| Durable regression coverage quality and relevance | 90% | 93% | 48 starter tests, 8 launcher `update` tests (fake docker, real in-container script) | PowerShell `update`/`status` only text-checked in the repository (FU-006's executed test would cover it) | FU-006 |

- Overall post-repository confidence: 86% (below 90% in five categories, so broader validation was required)
- Overall final confidence: 94.7% (simple average)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default 95% target met: `No`, 94.7%. The gap is durable execution coverage of the PowerShell launcher (FU-006, pre-existing). Every step-3 PowerShell path was executed in API-36.
- Residual risks:
  - the production key and GitHub source are proven only at the first release (user-only);
  - the release that ships step 3 must tell launcher users to reinstall the launcher, then `upgrade --all` (RU-23; the handoff's Known Risks, for delivery);
  - polling shows short steps irregularly.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle` + `CLI` (both launchers on a test-owned daemon)
- Gap addressed: the repository and implementation evidence never ran the launcher against a real starter (fake docker, or `cli.mjs` directly), never ran PowerShell, and never tested `update --all`, the track table against real images, or the restart after a rollback.
- Browser validation: not needed. Step 3 changes no rendered UI and no browser-reached API besides the additive `updateBlocker`, which API-33 shows through the status the launcher reads.

## Persisted-Data Transition Checks

- Decision: `Not Affected` (formats); DEC-005 copy and restore.
- Representative data: agent definitions written through GraphQL by 1.5.11-beta.5 (the built-in package of the step-2 image or the step-3 test image).
- Proven:
  - migration update 1.5.13: table created, data kept, copy removed (API-31);
  - migrate-then-fail 1.5.14: table gone, data kept, copy and package removed (API-32);
  - image changes after the in-place update keep the data (API-31).
- Version-specific branches or fallbacks: `No`

## Compatibility / Legacy Scope Check

- Compatibility mechanisms introduced or tolerated: `No`. Nodes of older launchers are refused with a way out (NO_PACKAGES_VOLUME), not served by a second path.

## Durable Coverage Changed In The Codebase

- None this round.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| GitHub releases | The design's test source variable, pointed at `IMP3-proof-release-source.mjs` (same URL layout, `/latest` redirect, `.atom` feed) | No release | GitHub-specific redirects and CDN: first release |
| Production signing key | A throwaway key in a test image | The private key is only in GitHub | First release |
| Docker Hub for `autobyteus/autobyteus-server` | The test daemon's registry mirror | The track table needs the real repository name | None for the launcher logic |
| The user's host daemon | `docker:dind` (O-1) | `upgrade --all` and `update --all` reach every labelled container | — |
| "Newer release" image for AC-006 | Version label 1.5.21 (O-5) | Only one real step-3 version | Selection reads only that field |
| Windows | Linux `pwsh` | No Windows host | Platform-neutral logic |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| `ab305-api-dind` and its volume (all nodes, volumes, registry, release source, test images) | Yes | `docker rm -f -v`, `docker volume rm` | Removed |
| `docker:dind`, the pwsh helper and its bases | Yes | `docker image rm` (the script removed the helper) | Removed |
| `/private/tmp/ab305-api-e2e` incl. the throwaway private key and the 2.4 GB packages | Yes | `rm -rf` | Removed; the Dockerfiles and the script are kept in `evidence/` |
| `autobyteus-server-305-test:*` images, container `ab305-extract`, `/tmp/ab305/proof` (the implementation's) | No | Not touched | Kept |
| `autobyteus-server-0/1/2` and their volumes | No (the user's) | Never touched | Untouched |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven: none for step 3. User-only: the production-key path at the first release.
- Next recipient from `get_handoff_rules`: code reviewer (Large/High pass; no test code changed)
- Notes:
  - Two step-print checks in API-31 and API-36 were stricter than the launcher's polling design; the target and the result always print.
  - The stale `state.json` `previous` after an image change is an observation only.
  - FU-006 still applies to PowerShell `new-container`.
