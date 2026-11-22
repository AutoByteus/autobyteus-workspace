# API/E2E Coverage Investigation — arm64-appimage-libz (autobyteus-28)

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision go in `api-e2e-execution-coverage-report.md`.

All ticket paths are under `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (approved at SR-001; SR-002 changed technical decision text only)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts: `probes/clean-root-runtime-probe.sh`, `probes/probe-runtime-needed.sh`, `probes/seeded-toolset-probe.sh`, `evidence/docker-chroot-shim/docker`, `evidence/published-appimage-runtime-needed.tsv`, `follow-ups.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass, 9.5/10, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass CRR-001 (reviewed route: `Medium` + `High`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-001 (Critical): the Linux arm64 AppImage's runtime has no `NEEDED` entries (the pinned static type2 runtime, sha256 `00cbdfcf…7444`) and loads in a clean Ubuntu 24.04 arm64 root (zlib1g only, no `libz.so`, no `libfuse.so.2`): `--appimage-version` and `--appimage-extract AppRun` exit 0. The published 1.5.14-beta.6 arm64 asset fails there with `libz.so`, exit 127.
- REQ-002 / AC-002 (Critical): in a clean Ubuntu 24.04 arm64 environment (zlib1g only, `libz.so` absent and asserted) with Electron's desktop libraries and a display, as a non-root user, the new arm64 AppImage starts AutoByteus through `--appimage-extract-and-run` (no `/dev/fuse` here); the app process and its server reach ready. The old AppImage fails at the loader in the same environment. The FUSE 3 mount on a real desktop is accepted untested (DEC-005).
- REQ-003 / AC-003 (Critical): `verify-clean-image-runtime.mjs` fails on the published 1.5.14-beta.6 arm64 AppImage naming the missing library, passes on the new one, fails closed before running the image when `libz.so` is present; passes on the x64 AppImage (CI form).
- REQ-004 / AC-004 (High): the x64 AppImage's runtime is byte-identical to the legacy `appimage-12.0.1` `runtime-x64` (NEEDED `libdl.so.2`, `libpthread.so.0`, `libz.so.1`, `libc.so.6`) and passes the clean-image check.
- REQ-005 / AC-005 (High): the build-only Desktop Release builds all five targets and passes every existing verify step plus the clean-image steps; artifact names and `latest*.yml` shapes unchanged.
- REQ-006 / AC-006: the Solution Designer's result to the user; not an API/E2E case (evidence TSV exists).
- QR-001: the gate does not depend on runner libraries and fails closed. QR-002: pinned, unmodified binaries; a build that does not use the pinned runtime fails.
- Design: `buildLinuxAppImage` (arm64: prepare toolset → set `ELECTRON_BUILDER_CACHE` → build → exactly one AppImage → `assertArm64AppImageRuntime` → restore); x64 unchanged; `verify-clean-image-runtime.mjs` in both Linux jobs (DS-001..DS-003).
- Implementation handoff Legacy/Compatibility check: clean (no fallback to the legacy runtime, no host-check fallback). Persisted data: `Not Affected`. No active signal from either section.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (arm64 user starts the AppImage on a stock system), SCN-002 (release job's clean-image gate), SCN-003 (x64 unchanged), SCN-004 (all other outputs unchanged).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-002a: a maintainer edits `release-desktop.yml` later; the gate must stay wired in both Linux jobs, on that job's own architecture's AppImage, unconditionally (trigger: a workflow change merged before a release). Nothing durable asserts the wiring today (see inventory); covered by AE-08.
  - SCN-001a: the user's actual launch passes through the native `AppRun` launcher, which refuses root and supervises Electron's sandbox start (`linux-install/cmd/launcher/main.go`, `internal/launch/supervise_linux.go`). AC-002's run therefore uses a non-root user and a real mount namespace (not a bare `chroot`, in which the kernel refuses `CLONE_NEWUSER` and Chromium's namespace sandbox could not start for reasons unrelated to the runtime).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 arm64 runtime (static type2) | Changed | design DS-001/DS-002; IMP-04/05/08/09 | AC-001 against the CI artifact; AC-002 app start through extract-and-run in a clean desktop root |
| BEH-002 clean-image gate in both Linux jobs | Added | DS-003; IMP-01/05/09 | AC-003 local form (shim) old/new/precondition; CI form from run logs; durable wiring test (AE-08) |
| BEH-003 x64 runtime | Preserved | DEC-002; IMP-09 | AC-004 runtime bytes + NEEDED from CI artifact; image tree vs published x64 |
| BEH-004 other outputs/gates | Preserved | IMP-09 | AC-005 from run 44956618584 jobs, artifact names, `latest*.yml` key shapes vs published beta.6 |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | Yes | Packaging: the AppImage runtime prefix that loads before `AppRun` | `linuxAppImageBuild.spec.ts` (mocked electron-builder), verifier unit test (fake docker) | Whether the real runtime starts the real app on a stock system | Packaged AppImage run in a clean Ubuntu 24.04 arm64 desktop root (AE-06) |
| Process / lifecycle | Yes | Runtime → extract → native `AppRun` → Electron → embedded server | None in repository | Start chain on a stock system | AE-06 |
| Persisted-data transition | No | `Not Affected` | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Release workflow (GitHub runners, Docker `ubuntu:24.04`), pinned github.com downloads | Workflow tests do not cover the new step | Gate wiring regressions; real CI execution | CI run logs (AE-03), durable wiring test (AE-08) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz`, branch `codex/arm64-appimage-libz`, validated commit `cd687a31e6` (source unchanged since `05996bd715`; later commits are documents).
- Project type and runtime stack: pnpm monorepo; Electron desktop (electron-builder 25.1.8, app-builder 5.0.0-alpha.10), Go native launcher, Node 22 release scripts, GitHub Actions.
- Project testing guideline path(s): `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/TESTING.md` (root; no closer `TESTING*.md` under `autobyteus-web/build`, `scripts/`); `docs/isolated-app-instances.md#linux` (headless/root-container recipes, Chromium sandbox rules).
- Conflicting, missing, or unclear project instructions: the isolated-app launcher runs an extracted `squashfs-root/autobyteus`; it does not go through the AppImage runtime, which is the changed boundary. AE-06 therefore runs the AppImage itself the way a user does (`./X.AppImage --appimage-extract-and-run`), following the guideline's non-root, Xvfb, sandbox-preserved rules; it is not an isolated-app instance (no renderer automation is needed for this packaging change). Recorded as a deliberate surface choice, not a guideline conflict.
- Changed build-input paths: `.github/workflows/release-desktop.yml`, `autobyteus-web/build/**`, `autobyteus-web/package.json`, `pnpm-lock.yaml`, `scripts/**` → fresh-start build required: reuse IMP-08 (fresh clone of `05996bd715`, frozen install, arm64 build, verify steps) as AE-09, plus the build-only release run (IMP-09, verified independently in AE-03/AE-05).
- Required environment variables or secrets available: `N/A` (no provider keys; build-only trust not needed since no rebuild; GitHub CLI authenticated for read-only run/release downloads).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Fresh-start build | Build-input list, fresh-clone procedure, build-only run for gate changes | Changed paths match; IMP-08 + run 44956618584 satisfy it |
| `TESTING.md` § Environment-specific setup: headless Linux and containers | Electron never as root; preserve sandbox; Xvfb around the whole session | AE-06 runs as uid 1000 in a private HOME, Xvfb owned by the run, no `--no-sandbox` |
| `docs/isolated-app-instances.md#linux` | Sandbox needs unprivileged userns or setuid helper; `ldd` for missing libraries | AE-06 uses a pivot_root mount namespace (userns allowed), installs only distribution packages Electron's `ldd` needs |
| `TESTING.md` rows / `scripts/tests/*` conventions | Workflow `run:` blocks are extracted and run with bash against fakes | AE-08 follows `test_desktop_release_server_package_wait.py` (imports `extract_step`, `run_bash`, `substitute_expressions`) |
| `.github/workflows/release-desktop.yml` lines 375-597 | Linux jobs and step order | Clean-image steps at 452 (x64) and 571 (arm64), after the layout step, before Prisma/server/upload |
| `probes/clean-root-runtime-probe.sh`, `evidence/docker-chroot-shim/docker` | Ticket evidence tools | Reused for AE-01/AE-02 with the official `ubuntu-base-24.04.5-base-arm64.tar.gz` (sha256 `a91d5a93…14f2`, verified) |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Clean Ubuntu 24.04 arm64 roots (probe/shim) | `/tmp` (mktemp) | probe / shim scripts | chroot as root; host network | — | script traps remove root |
| Clean desktop root (AE-06) | `/tmp/ae28/desktop-root` | extract ubuntu-base, `apt-get install --no-install-recommends` Electron's libraries + `xvfb xauth x11-utils` inside the root; assert `libz.so`/`libfuse.so.2` absent afterwards | ~0.5 GB; `unshare --mount --pid --fork` + `pivot_root`; `setpriv` to uid 1000 | `ldd` of extracted Electron resolves; Xvfb up | kill process group, unmount, `rm -rf` the root |
| AutoByteus via `--appimage-extract-and-run` | inside the root, HOME=/home/tester | `xvfb-run -a … /images/<AppImage> --appimage-extract-and-run` | embedded server on a localhost port the app chooses | `~/.autobyteus/logs/app.log`: `server is ready`; HTTP health answer; window present in `xwininfo` | SIGTERM to the launcher, verify no leftover processes |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| New arm64 AppImage | CI artifact `linux-arm64` of run 44956618584 (commit `05996bd715`), downloaded independently with `gh run download` | Read-only | Kept in `/tmp/ae28/dl` until the round ends, then removed |
| Old arm64 AppImage | Published release `v1.5.14-beta.6` asset, `gh release download` | Read-only | Same |
| x64 images | CI artifact `linux-x64`; published beta.6 x64 asset | Read-only | Same |
| Non-root identity | uid/gid 1000 created inside the clean root only | Host users untouched; user's `~/.autobyteus` never touched | Removed with the root |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `scripts/desktop-package/verify-clean-image-runtime.test.mjs` | Docker call shape (read-only, networkless, `ubuntu:24.04`), precondition before run, failure message, usage/no-docker | REQ-003, QR-001, DS-003 | Still Valid | IMP-01; read | Rerun (AE-07) |
| `autobyteus-web/scripts/__tests__/linuxAppImageBuild.spec.ts` | arm64 sequence (prepare, env set/restore, exactly one AppImage, assertion), x64 untouched | REQ-001, REQ-004, QR-002, N-2 | Still Valid | IMP-02; read | Rerun (AE-07) |
| `scripts/tests/test_desktop_release_server_package_wait.py`, `test_release_channel_workflow_steps.py` | Other desktop/docker workflow steps | — | Out Of Scope | read | None |
| Workflow wiring of the clean-image step in both Linux jobs | Not asserted by any test | REQ-003 ("so this can't come back"), BEH-002 | (gap) | `grep` of `scripts/tests`, `scripts/desktop-package` | Add Durable Coverage (AE-08) |
| Tests made untrue by this change | None found: no test references the removed inline Linux `build({...})` calls or the legacy arm64 runtime | — | — | `grep -rn "appimage-12.0.1\|LinuxTargetArch\|ELECTRON_BUILDER_CACHE"` over tests | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| AE-07 | REQ-001, REQ-003, REQ-004, QR-001, QR-002 | Build sequence and verifier units | Existing Test | `node --test scripts/desktop-package/verify-clean-image-runtime.test.mjs`; `NUXT_TEST=true pnpm exec vitest run scripts/__tests__/linuxAppImageBuild.spec.ts` (autobyteus-web) | Cheap independent rerun on the validated commit |
| AE-08 | REQ-003, AC-003, QR-001 | Release workflow Linux jobs | Durable | `python3 -m unittest scripts/tests/test_desktop_release_clean_image_step.py -v` | Pins the gate's wiring (job, order, unconditional, own-arch image, failure propagation) |
| AE-01 | AC-001, REQ-001, QR-002 | Runtime of the CI-built arm64 AppImage | Temporary Probe | `readelf -d`/`-l`; runtime-prefix sha256 vs pin; `clean-root-runtime-probe.sh` (libz.so and libfuse.so.2 absent asserted) with `--appimage-version`, `--appimage-extract AppRun` on the CI artifact and the published beta.6 asset | Needs the real released bytes; not a repository test |
| AE-02 | AC-003 (local form), QR-001 | `verify-clean-image-runtime.mjs` executing a real image | Temporary Probe | Verifier through the docker shim on: published beta.6 (expect fail, names `libz.so`), CI artifact (pass), root with `libz.so` (expect exit 3 before the image runs) | Docker absent on this host; the shim runs the exact script the verifier passes |
| AE-03 | AC-003 (CI form), AC-004 (clean-image pass), AC-005 | GitHub Actions run 44956618584 | Temporary Probe | `gh run view --log` for both clean-image steps and all verify steps; job conclusions | Independent read of the CI evidence |
| AE-04 | AC-004, REQ-004 | x64 runtime bytes | Temporary Probe | Runtime prefix of the CI x64 AppImage vs `appimage-12.0.1/runtime-x64` from the pinned legacy 7z (sha256 `d12ff7eb…c4`); `readelf -d` NEEDED; `unsquashfs -lls` tree vs published beta.6 x64 (paths/modes; file contents differ by version) | No x64 host for a same-commit v25 x64 build |
| AE-05 | AC-005, REQ-005 | Release outputs | Temporary Probe | Artifact names of the run vs published beta.6 names; `latest-linux*.yml` key structure vs published beta.6; `latest-linux-arm64.yml` sha512/size match the CI AppImage | Independent confirmation |
| AE-06 | AC-002, REQ-002 | Runtime → extract → `AppRun` → Electron → server | Journey | Clean desktop root (above); as uid 1000 under Xvfb: new image `--appimage-extract-and-run` → `app.log` `server is ready`, health endpoint, window; old image → loader `libz.so` error | The critical user path; nothing else runs it |
| AE-11 | REQ-002 (fallback path), BEH-001 | `--appimage-extract-and-run` cleanup after the app exits | Temporary Probe | Minimal AppImage with the static vs legacy runtime; OLD vs NEW app with `ELECTRON_RUN_AS_NODE=1`; `strace -f` of the runtime parent | Added after AE-06 showed the extracted app left in `$TMPDIR` after quit; an upstream binary behavior, not a repository-testable unit |
| AE-09 | DESIGN.md rule 12, AC-001, AC-005 | Fresh-start arm64 release build | Reused | IMP-08 | Ran on `05996bd715`; `git diff --name-only 05996bd715 cd687a31e6` touches only `tickets/`; log shows `build-exit=0` and the clean-image line |
| AE-10 | REQ-005 | Release script/workflow units | Reused | IMP-10 (and IMP-03 typecheck) | Same commit range argument; CI ran the root-refusing trust test |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| AE-08 | `scripts/tests/test_desktop_release_clean_image_step.py` | REQ-003's purpose is that a libz.so-needing runtime cannot be released again. The verifier unit test proves the script, not that both Linux jobs run it on their own AppImage, unconditionally, before upload. A later workflow edit could drop or misdirect the step with every test green. |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron, AppImage with native Go `AppRun` launcher.
- Testing guideline, README, or development instructions used: `TESTING.md` (headless Linux and containers), `docs/isolated-app-instances.md#linux`.
- Web-equivalent behavior: none changed.
- Shell-specific or lifecycle behavior: the AppImage runtime (packaging) and the start chain through `AppRun`.
- Chosen validation approach and why it fits the project: run the real CI-built AppImage the way a user without FUSE does, in a stock Ubuntu 24.04 arm64 root with only distribution desktop libraries added, as a non-root user with a run-owned Xvfb display. It exercises exactly the changed boundary (runtime) and the unchanged chain after it.
- Server/frontend setup when browser validation is used: N/A.
- How the run avoids disturbing an already-running desktop application: separate root filesystem, private HOME inside it, run-owned Xvfb display number, app-chosen ports; no isolated-app registry or user data touched.

## Live Environment And Fixture Plan

- Startup order and commands: build root → install packages → assert precondition → copy images → enter namespace → `setpriv` uid 1000 → `xvfb-run` owning the whole session (start, observe, stop).
- Environment choices that materially affect the run: no `/dev/fuse` (extract-and-run, as AC-002 states); pivot_root namespace so Chromium's user-namespace sandbox can start as on a desktop; host network shared.
- Health / readiness checks: `app.log` lines `Server health check successful, server is ready`; HTTP request to the embedded server's health URL; `xwininfo -root -tree` shows an AutoByteus window.
- Seed data / fixtures: none (fresh HOME).
- Test identities: uid 1000 inside the root.
- Requirement-linked journeys: AE-06 (new image start; old image loader failure).
- Evidence to capture: precondition listing, `ldd` result, launcher stdout/stderr, `app.log` excerpt, health response, window list, screenshot (supporting), process list, cleanup receipt.
- Owned processes and temporary state to clean up: the namespace's PID tree (dies with the PID namespace), Xvfb, `/tmp/ae28/desktop-root`, downloads.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| FUSE 3 mount start on a real arm64 desktop | No `/dev/fuse` on this host (DEC-005) | Low, bounded; extract-and-run fallback | No (accepted unverified risk, DEC-005) | None |
| x64 clean-image run locally | No x86-64 execution on this arm64 host (no binfmt) | Covered by CI step log (AE-03) | No | None |
| Same-commit electron-builder 25 x64 baseline tree | No x64 host; config/env unchanged by construction | Low | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| AE-11: the static type2 runtime (DEC-001, an unmodified official binary that QR-002 keeps unpatched) never removes `$TMPDIR/appimage_extracted_<md5>` after `--appimage-extract-and-run`. The whole app (1.2 GB) stays after every quit, while the legacy runtime and the AppImage docs remove it. The approved requirements rely on this fallback (Non-Goals, DEC-005, RSK-001) but no AC decides whether the leftover is acceptable | `Design Impact` | `evidence/api-e2e/AE-11-extract-and-run-cleanup.log`, `AE-06-app-start-extract-and-run.log` (attempt 6A) | Solution Designer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (add AE-08)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Update (round 1, after execution): AE-11 added and rerouted (see Ambiguities Or Reroute Triggers).
- Notes: no rebuild of the AppImage is planned; the CI artifact of run 44956618584 is the release-path output of the source under test.
