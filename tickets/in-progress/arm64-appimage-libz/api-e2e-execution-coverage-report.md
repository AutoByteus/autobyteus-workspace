# API/E2E Execution Coverage Report — arm64-appimage-libz (autobyteus-28)

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-001 on IR-002 / SR-002
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - Added AE-11 (extract-and-run cleanup). AE-06 showed that the static runtime leaves the extracted app in `$TMPDIR` after the app quits. The legacy runtime, and the AppImage documentation for `--appimage-extract-and-run`, remove it.
  - AE-06 needed five harness attempts. Attempts 1-3 were Xvfb setup inside the namespace; no image ran. Attempt 4 used a wrong health port and a stop that real use does not produce. Attempts 5 and 6A are the evidence (see the AE-06 row). Openbox and wmctrl were added to the root for 6A, and the precondition was re-asserted after that install.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/arm64-appimage-libz/tickets/in-progress/arm64-appimage-libz/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of `scripts/tests/test_desktop_release_clean_image_step.py`) once the AE-11 decision allows a Pass
- Proportional test-code review decision: `Required` (on Pass)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `cd687a31e6` (worktree; source = `05996bd715`) + uncommitted AE-08 test | Ubuntu 24.04.5 aarch64 container (linuxkit 6.12), root | Node 22.23.3, Python 3, pnpm via Corepack | No Docker, no `/dev/fuse`, no x86-64 execution |
| ENV-2 | `05996bd715` | GitHub `ubuntu-22.04` (x64) and `ubuntu-24.04-arm` runners, macOS, Windows | Build-only Desktop Release run 44956618584 | Logs and artifacts read with `gh` |
| ENV-3 | — | Clean root: official `ubuntu-base-24.04.5-base-arm64.tar.gz` (sha256 `a91d5a93…14f2`), chroot | Images: CI `linux-arm64` artifact (sha256 `02525c59…5f42`), published v1.5.14-beta.6 arm64 (sha256 `64382b42…f337`) | Only `zlib1g` (`libz.so.1`), no `libz.so`, no `libfuse.so.2` |
| ENV-4 | — | Clean desktop root: ENV-3 base + `apt-get install --no-install-recommends` of Electron's libraries, `xvfb xauth x11-utils imagemagick curl procps` (+ `openbox wmctrl` for 6A, `strace` for AE-11) | Same images | Precondition asserted after every install: `zlib1g-dev` 0, `libz.so` 0, `libfuse.so.2` 0. Entered with `unshare --mount --pid` + `pivot_root`, run as uid 1000 with a fresh HOME. Display `:187` owned by the session. Chromium sandbox untouched |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AE-07 | REQ-001, REQ-003, REQ-004, QR-001, QR-002 | Verifier and build-sequence units | `node --test scripts/desktop-package/verify-clean-image-runtime.test.mjs`; (autobyteus-web) `NUXT_TEST=true pnpm exec vitest run scripts/__tests__/linuxAppImageBuild.spec.ts` | ENV-1 | Pass | `AE-07-units.log` | `# pass 3`; `Tests  7 passed (7)` | Independent rerun of IMP-01/IMP-02 |
| AE-08 | REQ-003, AC-003, QR-001 | Release workflow Linux jobs | `python3 -m unittest scripts/tests/test_desktop_release_clean_image_step.py -v`, then 3 workflow mutations (arm64 gate `if: false`; arm64 gate on the x64 image; x64 gate removed), workflow restored | ENV-1 | Pass | `AE-08-clean-image-step-test.log` | `Ran 6 tests … OK`; each mutation `FAILED`; `(empty = restored)` | New durable test |
| AE-01 | AC-001, REQ-001, QR-002 | Runtime of the CI arm64 AppImage | `readelf -d/-l`; prefix length from ELF headers (`AE-06-probe-scripts/elfend.py`) and its sha256; `probes/clean-root-runtime-probe.sh <ubuntu-base> <image> --appimage-version` and `--appimage-extract AppRun`, NEW and OLD | ENV-3 | Pass | `AE-01-arm64-runtime-clean-root.log` | NEW: `NEEDED count: 0`, `static-pie linked`, `prefix: 00cbdfcf…7444`, `exit=0` twice. OLD: `[libz.so]`, `libz.so: cannot open shared object file`, `exit=127` twice. Root: `libz.so (unversioned) in tarball: 0  libfuse.so.2: 0` | The pinned sha256 equals the file in the independently downloaded upstream archive (same log) |
| AE-02 | AC-003 (local form), QR-001 | `verify-clean-image-runtime.mjs` executing real images | `UBUNTU_BASE_TARBALL=… node scripts/desktop-package/verify-clean-image-runtime.mjs <image>` with `evidence/docker-chroot-shim/docker` on PATH: OLD, NEW, NEW in a root with a `libz.so` symlink | ENV-3 | Pass | `AE-02-verifier-clean-image-local.log` | OLD rerun: `(exit 127): /autobyteus.AppImage: error while loading shared libraries: libz.so`; NEW: `Verified the AppImage runtime loads…`; precondition: `(exit 3): clean image has /lib/aarch64-linux-gnu/libz.so` | The first OLD attempt failed on the missing exec bit (`gh release download` writes 0644): a fixture fix, recorded in the log |
| AE-03 | AC-003 (CI form), AC-004, AC-005 | GitHub run 44956618584 | `gh run view 44956618584 --json …`; `gh run view --log` excerpts | ENV-2 | Pass | `AE-03-ci-run-44956618584.log` | `"conclusion":"success"`, `headSha 05996bd715…`; both jobs `success Verify Linux … runs in a clean Ubuntu image` with `Verified the AppImage runtime loads and extracts AppRun in a clean ubuntu:24.04 image without libz.so`; arm64 `file`: `static-pie linked`; `Packaged server startup validation passed` on both | — |
| AE-04 | AC-004, REQ-004 | x64 runtime and image tree | Prefix sha256 of the CI x64 image vs `runtime-x64` from the pinned `appimage-12.0.1.7z`; `readelf -d`; `unsquashfs -lls` paths+modes vs the published beta.6 x64 | ENV-1 | Pass | `AE-04-x64-runtime-and-tree.log` | `NEW prefix length 188392, prefix sha256 24da8e0e…0bc30` = legacy `runtime-x64`; NEEDED `libdl.so.2, libpthread.so.0, libz.so.1, libc.so.6`; `packaging-level diff lines: 0` (CORRECTED section) | The 56 differing entries are server `dist`/`mobile-web` build files that changed between beta.6 and the base. The first listing skipped 3 entries on both sides; corrected in the same log |
| AE-05 | AC-005, REQ-005 | Release outputs | Run artifacts vs the beta.6 tag run; built file names (run log) vs published asset names; `latest-linux*.yml` key structure vs published; arm64 yml sha512/size vs the CI image; release record | ENV-1/2 | Pass | `AE-05-release-outputs.log` | `names equal … yes`; `key structure equal: yes` twice; `files[0].sha512 == sha512(AppImage): True`; `files[0].size == file size: True 351223217` | — |
| AE-06 | AC-002, REQ-002 | Runtime → extract → native `AppRun` → Electron → embedded server, as a user starts it without FUSE | In ENV-4 as uid 1000 under Xvfb (`AE-06-probe-scripts/`): OLD `--appimage-extract-and-run`; NEW `--appimage-extract-and-run`; wait for `server is ready`; process tree, sandbox namespaces, windows, `GET /rest/health`, screenshot; stop with a terminal Ctrl+C (attempt 5); quit by closing the window under openbox (attempt 6A) | ENV-4 | Pass | `AE-06-desktop-root-precondition.log`, `AE-06-app-start-extract-and-run.log`, `AE-06-app-log-excerpt.log`, `AE-06-new-app-window.png` | OLD: `old exit=127`, `libz.so: cannot open shared object file`. NEW: `server ready=yes after 8s`; `"autobyteus": ("autobyteus" "autobyteus")  1200x800`; `{"status":"ok","message":"Server is running"}` `HTTP 200`; renderer `user:[4026533649]` vs browser `user:[4026531837]`, `seccomp 2`; `processes with --no-sandbox (pgrep excludes itself): 0`; Ctrl+C: `remaining processes … (none)`; window close: `runtime exit=0`, `remaining app processes: 0`, `Server process exited with code 0`. Screenshot: Chat home "Daily Assistant" with the model list loaded | Attempt 5's `no --no-sandbox … 1` counted its own `grep`; 6A rechecks it with `pgrep` (0). The one `[ERROR]` in app.log is the server's `Overwriting existing tool definition for name: 'search_web'`, unrelated |
| AE-11 | REQ-002 (fallback path), BEH-001 preserved runtime behavior; no AC decides it | `--appimage-extract-and-run` cleanup after the app exits | Minimal AppImage (static vs legacy runtime + a shell `AppRun`); OLD vs NEW app with `ELECTRON_RUN_AS_NODE=1`; NEW GUI quit (AE-06 6A); `strace -f` of the static runtime parent; host overlay fs as root | ENV-4, ENV-1 | Fail (finding; rerouted as `Design Impact`) | `AE-11-extract-and-run-cleanup.log` | static minimal: `left in /tmp: appimage_extracted_d56a94…`; legacy minimal and OLD app: `left in /tmp: none`; NEW app: `entries: 31371  size: 1.2G`; strace: `wait4 … exit_group(0)` with no filesystem call between them | Official type2-runtime release `20251108` (`commit/dd6cebe`), unmodified; its source has the cleanup but the binary never runs it. A second start reuses the same folder (one per image md5) |
| AE-09 | DESIGN.md rule 12, AC-001, AC-005 | Fresh-start arm64 release build | Reused: IMP-08 | — | Pass (Reused) | `../IMP-08-fresh-start-arm64-build.log` | `build-exit=0`; `Verified the AppImage runtime loads and extracts AppRun in a clean ubuntu:24.04 image without libz.so` | Ran on `05996bd715`; `git diff --name-only 05996bd715 cd687a31e6` touches only `tickets/` |
| AE-10 | REQ-005 | Release script/workflow units, typecheck | Reused: IMP-10, IMP-03 | — | Pass (Reused) | `../IMP-10-release-script-units.log`, `../IMP-03-build-scripts-tsc.log` | verifier `# pass 3`; workflow tests `OK`; `production errors: 0` | Same commit-range argument; CI ran the root-refusing trust test (AE-03, "Check native and signed-record units" success) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | AE-01, AE-03 (CI `file`), AE-09 | Proven | — |
| AC-002 | Yes | AE-06 | Proven (extract-and-run start). FUSE 3 mount start: Accepted Unverified Risk (DEC-005) | No `/dev/fuse` here and no arm64 desktop; DEC-005 accepts it |
| AC-003 | Yes | AE-02 (local: old fails naming `libz.so`, new passes, `libz.so` present fails closed), AE-03 (CI form, both arches), AE-08 (wiring) | Proven | — |
| AC-004 | No (High) | AE-04, AE-03 (x64 clean-image pass) | Proven | A same-commit electron-builder 25 x64 baseline was not built (no x64 host); the packaging-level tree equals the published beta.6 x64 |
| AC-005 | No (High) | AE-03, AE-05, AE-09 | Proven | — |
| AC-006 | No | — | Not an API/E2E case (Solution Designer's result; `evidence/published-appimage-runtime-needed.tsv`) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | AE-01..06, AE-08 | FUSE mount (DEC-005, accepted) | — |
| Changed-boundary execution directness | 75% | 95% | Real released bytes in clean roots (AE-01, AE-02, AE-06) | Local Docker is a chroot stand-in; CI ran real Docker (AE-03) | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | CI artifacts, real Electron and server, real verifier | — | — |
| Environment, configuration, identity, and fixture fidelity | 70% | 90% | Stock ubuntu-base + distro packages, non-root, sandbox active (AE-06) | Xvfb with openbox, not a full desktop session; no FUSE | A real arm64 desktop (DEC-005) |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 75% | Old fails at the loader (AE-01, AE-02, AE-06); precondition fails closed (AE-02, AE-08); Ctrl+C and window-close stops clean up all processes (AE-06) | **AE-11:** the extract-and-run fallback leaves the 1.2 GB extracted app in `$TMPDIR` after every quit; the shipped legacy runtime removes it | Solution Designer's decision on AE-11 |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | Window, rendered UI, health 200, sandbox namespaces (AE-06) | Mount path (DEC-005) | — |
| Durable regression coverage quality and relevance | 90% | 95% | AE-07, AE-08 with mutation proof | Runtime behavior itself is guarded by the build assertion and the CI step, not by a repository test | — |

Overall: (95 + 95 + 95 + 90 + 75 + 95 + 95) / 7 = **91%**. One category is below 90% (lifecycle, because of AE-11), so the gate blocks `Pass`.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` + `Lifecycle` (packaged AppImage in a clean desktop root)
- Confidence gap or residual risk it addresses, and the expected gain: repository tests mock electron-builder and Docker, and no repository surface runs the runtime. AE-06 proves the real start chain on a stock system.
- Browser validation needed, and why or why not: No. The renderer is unchanged; the window and rendered UI were observed in the packaged app itself.
- If `Blocked`: N/A

## Desktop Application Validation

- Approach executed: the packaged CI AppImage run the way a user without FUSE runs it (`./X.AppImage --appimage-extract-and-run`), as a non-root user in a stock Ubuntu 24.04 arm64 root with a session-owned display. This is not an isolated-app instance (see the investigation for why).
- Cases proving shell-specific or lifecycle behavior: AE-06 (start, sandbox, server ready, stop/quit), AE-11 (cleanup after exit).
- Effect on any already-running desktop application: None. Separate root, display `:187`, fresh HOME; host X servers `:99/:102/:103` untouched.
- Behavior not directly proven and its confidence consequence: the FUSE 3 mount start (DEC-005, accepted).

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (no fallback to the legacy runtime; AE-07 and AE-09 confirm the build fails otherwise)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `scripts/tests/test_desktop_release_clean_image_step.py` | Added | AE-08 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Docker `ubuntu:24.04` (local AE-02) | `evidence/docker-chroot-shim/docker`: chroot of the official ubuntu-base with the same content | No Docker on this host | Host network and a copied file instead of a read-only bind; CI ran real Docker (AE-03) |
| Docker (AE-08) | Fake `docker` that records its call | Unit-level wiring test | Proves wiring, not container behavior (AE-02/AE-03 do) |
| Desktop session | Xvfb (+ openbox for 6A) | Headless container | No compositor or real GPU; the GPU process ran on SwiftShader |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `/tmp/ae28/` (downloads ~2 GB, desktop root, minimal AppImages, tmptest 1.2 GB leftover) | Yes | Kept until the AE-11 decision, then `rm -rf /tmp/ae28` | Pending (needed for rerun) |
| Namespaces, Xvfb `:187`, app processes | Yes | End with the PID namespace; the stuck attempt 1 namespace was killed by SIGKILL to its init | Done: `ps` shows no `unshare --mount --pid`, `Xvfb :187` or app process |
| Temporary `libz.so` symlink in the desktop root (AE-11 comparisons) | Yes | Removed after each use | `libz.so files in root: 0` |
| Workflow mutations (AE-08) | Yes | `git checkout -- .github/workflows/release-desktop.yml` | `(empty = restored)` |
| Corepack shim `/tmp/ae28/bin` | Yes | Removed with `/tmp/ae28` | Pending |

## Preliminary Classification

- `Design Impact` (AE-11): the design picked the static runtime (DEC-001) and relies on `--appimage-extract-and-run` as the fallback for hosts without FUSE (DEC-005, RSK-001, Non-Goals, `electron_packaging.md` § Linux AppImage Runtime). That runtime, an unmodified official binary that QR-002 forbids patching, never removes its extracted folder. Each quit therefore leaves the whole app, 1.2 GB, in `$TMPDIR`: in RAM where `/tmp` is a tmpfs, on disk until reboot otherwise. The folder is reused per image version, so leftovers grow by one per version. The legacy runtime removes it. No AC decides whether this is acceptable, and no code defect is involved (the implementation ships the design's pinned binary exactly), so it is not a `Local Fix`.
- Recommended owner: Solution Designer (decide: accept and document, for example a docs note or follow-up and/or `--appimage-extract` + `squashfs-root/AppRun` as the documented no-FUSE path; or change the runtime choice).

## Latest Authoritative Result

- Result: `Fail` on AE-11 only, rerouted to the Solution Designer as a `Design Impact`. Every acceptance criterion in scope (AC-001..AC-005) is proven.
- Criteria not proven, parts only the user can check, or accepted as unverified risk: AC-002 FUSE 3 mount start — Accepted Unverified Risk (DEC-005).
- Evidence decisions requested: None.
- Preliminary classification and recommended owner: `Design Impact`, Solution Designer.
- Next recipient from `get_handoff_rules`: `/solution_designer` (Design Impact upstream issue).
- Notes: if the decision accepts AE-11 as documented behavior, only the report and confidence update remain (no rerun). If the runtime or the documented fallback changes, rerun AE-01, AE-02, AE-06 and AE-11 on the new build.
