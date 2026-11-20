# API/E2E Execution Coverage Report — Ubuntu AppImage Conditional Sandbox

## Round and package
- **API-REV-001 / round 1 result:** **Blocked** for final AC-001–006 sign-off; no production implementation failure observed. Date: 2026-09-24.
- **Trigger:** CRR-002 Pass (renewed Medium / High source review after IR-002).
- **Worktree:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation` at reviewed source baseline `40d1849d5068ca53099eb141b7a9dffa1f129561` before this API/E2E-owned verifier fix.
- **Authority:** ticket-local `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md` (SR-005), `design-spec.md`, `architecture-design-handoff-sr005.md`, `design-review-report.md` and `architecture-review-revision-record.md` (ARCH-REV-002 Pass), `implementation-handoff.md` and `implementation-revision-record.md` (IR-002), `code-review-report.md` and `code-review-revision-record.md` (CRR-002 Pass), plus `api-e2e-coverage-investigation.md` and `api-e2e-test-case-ledger.md`. Delivery report/revision: N/A.
- **Classification/route:** Medium / High; reviewed route; on eventual Pass, Code Reviewer proportionally reviews changed durable test code. Current Blocked result does **not** route a Pass or Fail handoff.
- **Prior API/E2E result/confidence:** N/A; no prior API/E2E record. `api-e2e-revision-record.md` establishes API-REV-001.

## Investigation and execution basis
The coverage investigation was written before tests or the durable verifier edit, then updated when real AppImage extraction exposed `ENOBUFS`. The existing nine-case launcher suite, native AppImage layout validator, updater metadata validator, existing packaged Electron E2E harness and Electron unit suite were assessed against approved SR-005 behavior. No stale/compatibility-only test was found. Approved persisted-data outcome is **Not Affected**; no user-data migration, compatibility shim, or data reader change occurred. Only isolated E2E roots were used; the user's running v1.4.78 app and production data were not touched.

## Ledger reconciliation and changed-boundary matrix
Canonical ledger: `api-e2e-test-case-ledger.md`; initialized before execution, case attempts and long-build checkpoints recorded. AE-001/002/003/004/008 completed Pass; AE-005/006/007 completed Blocked. No case remains running. The ticket-local `evidence/api-rev-001/` directory contains logs and probes; the locally built artifact is `autobyteus-web/electron-dist/AutoByteus_personal_linux-x64-1.4.78.AppImage` (SHA-256 `604e64769baaf583cd395bf050639512166b2ce273480f02cf2012a05f9c27be`). This local artifact is **not** a published release.

| Case | AC / boundary | Execution and direct observation | Result / limitation |
| --- | --- | --- | --- |
| AE-001 | AC-001–003,005 / launcher branches | `node --test autobyteus-web/scripts/test-appimage-launcher.mjs`: 9 pass, 0 fail, 0 skip. Positive, negative, missing and ambiguous probe fixtures, exact fatal/status gate, Node/argv, signal and hook remain deterministic. | Pass as stubbed durable evidence, not Chromium/package proof. `launcher-suite.log`. |
| AE-008 | Regression | Bash syntax and build/Electron TypeScript pass; Electron suite 152 pass, 1 intentionally skipped. | Pass; `shell-check.log`, `transpile-*.log`, `electron-suite.log`. |
| AE-002 | AC-006 plus layout for AC-002/005 | Native x64 release-flavor build succeeded using pre-existing extracted GCC/make toolchain and owned pnpm shim. `file` reports x86-64 ELF AppImage; `latest-linux.yml` has valid x64 entry and numeric embedded `blockMapSize`; extracted artifact has executable launcher, real ELF and desktop marker without unconditional `--no-sandbox`. | Pass x64 only. `x64-build-retry.log`, `x64-artifact-checks.log`, `x64-layout-recheck.log`. |
| AE-003 | AC-001,003,004 / restricted Ubuntu x64 | New AppImage no-flag direct launch reached embedded `/rest/health`; Playwright adapter obtained first Electron window. Desktop-marker launch also reached health 200 and first packaged `app.asar/dist/renderer/index.html` window. Captured exact Chromium sandbox FATAL before bootstrap, **one** wrapper retry line, app's reduced-isolation WARN and embedded server running. Before/after four relevant sysctl/AppArmor settings identical. | Pass on Ubuntu **26.04** only; representative 24.04 is not tested. `restricted-direct-harness.log`, `restricted-playwright-window.log`, `desktop-equivalent-{result,stderr,app,window}.log`, `host-policy-{before,after}-desktop.txt`, `host-policy-diff.txt`, `restricted-app.log`. |
| AE-004 | AC-005 / packaged Node and real ELF | `ELECTRON_RUN_AS_NODE=1` AppImage `-e` exited 0; `process.execPath` ends `/autobyteus-real`, spaced argument preserved; no GUI flag. Direct GUI process also spawned embedded server through real ELF and reached running. | Pass x64. `packaged-node-mode.log`, `restricted-app.log`. |
| AE-005 | AC-002 / capable host | Only available host is Ubuntu 26.04 with `/usr/bin/unshare -Ur true` EPERM. No safe way to assert **actual renderer isolation** on a namespace-capable host; modifying host AppArmor would violate the approved boundary and still not prove a real capable-host default. | **Blocked**; no AC-002 Pass. `external-target-feasibility.txt`. |
| AE-006 | AC-006 / ARM64 | Current machine x86_64; no native ARM64 host/runner or emulation available locally. Workflow defines ARM64 native job, but no run of this current package was observed. | **Blocked**; no ARM64 artifact/runtime claim. `external-target-feasibility.txt`, workflow. |
| AE-007 | AC-006 / updater | Released old and newly built local AppImages both report version 1.4.78. No staged newer release/update feed exists for an older-to-newer install/relaunch. Static x64 metadata passed but cannot substitute for this journey. | **Blocked**; no update/relaunch claim. `external-target-feasibility.txt`, `x64-artifact-checks.log`. |

## Durable coverage changed
- **Updated:** `autobyteus-web/scripts/verify-linux-appimage-layout.mjs`. Its prior `execFileSync(..., stdio:'pipe')` captured over 1 MiB of extraction paths from the 535 MiB package and failed `ENOBUFS` before assertions. It now ignores extraction stdout while retaining stderr, timeout and every artifact assertion. Real package recheck passed. This is a bounded API/E2E test-harness `Local Fix`, **not** a production launcher correction.
- Added: none. Removed: none. Existing nine-case launcher suite remains valid. This changed durable path requires proportional test-code review **after final validation Pass** on the reviewed route; current result remains Blocked.
- Initial `corepack pnpm` build invocation stopped `spawn pnpm ENOENT` because nested scripts require a `pnpm` executable on PATH; owned temporary shim allowed the documented build to finish. This was environment setup, not a production build failure. Both failed attempts are disclosed in `x64-build.log` and `x64-artifact-checks.log`.

## Confidence scorecard
Post-repository scores are recorded in `api-e2e-coverage-investigation.md` (overall **67.1%**). Final after restricted-host broader validation:

| Category | Post-repository | Final | Evidence and residual gap |
| --- | ---: | ---: | --- |
| Requirement/AC proof | 50% | **50%** | AC-001/003/004/005 substantial x64 proof; critical AC-002 and ARM64/update parts of AC-006 wholly unproved. The critical missing portion caps this category. |
| Changed-boundary directness | 75% | **75%** | Actual x64 package and restricted-host wrapper/Chromium executed; capable-host sandbox and updater boundary missing. |
| Cross-boundary integration realism/mock gap | 65% | **75%** | Actual AppImage → Electron GUI/server and desktop marker covered; update and ARM64 remain absent. |
| Environment/config/fixture fidelity | 50% | **50%** | Isolated release-flavor Ubuntu 26.04 x64 is real; required capable and ARM64 hosts and staged update feed absent. |
| Failure/edge/lifecycle/recovery | 75% | **75%** | Actual fatal, one retry, warning and harness-owned process cleanup plus deterministic negative/missing/ambiguous/status/signal cases; updater recovery is unproved. |
| User-surface/desktop-shell | 65% | **75%** | Both x64 entrypaths opened a packaged GUI window with server ready; actual capable-host renderer isolation and 24.04 not observed. |
| Durable regression relevance | 90% | **90%** | Nine focused cases and working real-artifact layout gate; platform/updater matrix remains external. |

- **Overall final confidence:** **70.0%** (490/7, simple mean, rounded to one decimal). Broader validation increased direct restricted-host confidence but also exposed the decisive unproved host/release matrix; the average must not hide category scores of 50%.
- Every critical AC directly proven: **No** (AC-002 and AC-006 missing; 24.04 portion of AC-001 untested).
- Applicable category below 90: **Yes**. Default >=95 overall and >=90 each target: **No**. No Pass is permissible even though tested x64 restricted-host journeys succeeded.

## Broader validation, runtime and cleanup
- Decision: **Required**, executed using project-supported packaged Electron direct and Playwright adapters, plus a temporary desktop-marker probe and Node CLI; **partially Blocked** on external target availability. Browser dev mode was not chosen: this is an AppImage/Chromium process-security and lifecycle change, not web-equivalent renderer UI. Actual desktop execution was justified as the only direct proof of the package boundary, using isolated E2E profile, temporary roots and non-default loopback ports. User's running app was neither signaled nor reused.
- Runtime: Ubuntu 26.04 LTS x86_64, Linux 7.0.0-31-generic, Electron 42.4.1, electron-builder 25.1.8, AppImage v1.4.78 local build. Direct E2E used port 44681; desktop-marker probe 39189; Playwright probes used their own free ports. No accounts/secrets/seeded product data needed. Existing production data root untouched.
- Host policy comparison: `host-policy-diff.txt` is empty for `kernel.unprivileged_userns_clone`, `user.max_user_namespaces`, `kernel.apparmor_restrict_unprivileged_userns`, `kernel.apparmor_restrict_unprivileged_unconfined`. No policy edit command was run. This is evidence for the exercised host, not a claim about all installations.
- Cleanup: Project adapters confirmed owned process-tree exit; temporary probe scripts and isolated `/tmp/autobyteus-api-rev-001-{restricted,desktop}` roots removed after copying logs. Build-generated untracked SDK `dist` directories removed. User's pre-existing AppImage process remained running. The new ignored local x64 AppImage and metadata remain in worktree for resumption; the 236 KiB ticket evidence is retained. Owned temporary pnpm shim/toolchain binaries in `/tmp` were not altered after use; the extracted toolchain pre-existed this round.

## Preliminary classification, result and resume dependency
- **Result:** Blocked, not Fail. No observed product defect; the durable verifier failure was locally corrected and rechecked. No requirement/design contradiction was found. Residual scenario IDs: AE-005, AE-006, AE-007; AC-002 and AC-006 remain critical unproven gates.
- **Exact missing dependency to resume:** (1) access to a namespace-sandbox-capable Ubuntu 20/22 or equivalent Linux host for direct and desktop launches with actual renderer sandbox inspection, ideally also representative restricted Ubuntu 24.04; (2) a native ARM64 CI runner/host on this package for artifact/layout/metadata and smoke; (3) an authorized isolated staged newer-version AppImage/update feed, paired with the older release, for real update/install/relaunch. A published production release is **not** requested or authorized by this validation.
- **Recommended recipient:** user/caller for target provision or explicit acceptance of an incomplete validation matrix. Per API/E2E skill, no inter-member handoff while Blocked. On provision, reuse the canonical ledger, recheck AE-005–007 first, update these two canonical reports, append API-REV-002, and only then route a Pass or Fail by `get_handoff_rules`.

## Latest authoritative result
**Blocked — 70.0% final confidence.** Local x64 restricted-host package checks pass, but AC-002 actual capable-host sandbox and AC-006 ARM64/update-relaunch are not directly proven. No final delivery or release claim.
