# API/E2E Test-Case Ledger — Ubuntu AppImage Conditional Sandbox

- Worktree: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation`.
- Investigation: `api-e2e-coverage-investigation.md`; execution report: `api-e2e-execution-coverage-report.md`; revision record: `api-e2e-revision-record.md` (API-REV-001).
- Scope: multi-case, long build and cross-host validation; initialize before execution.

| Case ID | Case / journey | AC IDs | Planned order |
| --- | --- | --- | ---: |
| AE-001 | Deterministic launcher policy suite | 001–003,005 | 1 |
| AE-008 | TypeScript, shell and Electron regression | regression | 2 |
| AE-002 | x64 native package/layout/metadata | 001–006 | 3 |
| AE-003 | Restricted Ubuntu package GUI/server/diagnostic/policy | 001,003,004 | 4 |
| AE-004 | Packaged Node/real-ELF behavior | 005 | 5 |
| AE-005 | Capable-host actual renderer isolation | 002 | 6 |
| AE-006 | ARM64 native package and smoke | 006 | 7 |
| AE-007 | Older-to-newer updater/relaunch | 006 | 8 |

## Execution events
| Seq | Case | Timestamp | Event | Command / configuration | Expected | Observed | Result | Evidence | Next action |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AE-001 | 2026-09-24T11:41:25Z | Completed | `node --test autobyteus-web/scripts/test-appimage-launcher.mjs` | 9 deterministic cases; 0 skips | 9 pass, 0 fail, 0 skip; fixture-only probe replacement | Pass | `evidence/api-rev-001/launcher-suite.log` | Continue AE-008; packaged boundary still open |
| 2 | AE-008 | 2026-09-24T11:41:55Z | Completed | `bash -n`; `corepack pnpm --dir autobyteus-web transpile-{build,electron}`; `test:electron --run` | Build/Electron TS and affected Electron regression pass | All pass; 152 pass, 1 skipped in Electron suite | Pass | `evidence/api-rev-001/{shell-check,transpile-build,transpile-electron,electron-suite}.log` | Continue native x64 package |
| 3 | AE-002 | 2026-09-24T11:42:10Z | Started/checkpoint | `corepack pnpm build:electron:linux:x64`; local toolchain PATH | Build new x64 package | Initial attempt stopped immediately: nested `pnpm` not on PATH (not a package failure). Created owned /tmp pnpm shim for retry. | N/A | `evidence/api-rev-001/x64-build.log` | Retry with shim; no artifact claimed |
| 4 | AE-002 | 2026-09-24T11:43:10Z | Checkpoint | Native x64 build retry with owned pnpm shim and extracted GCC/make | Complete build and package | Shared/server preparation progressed; Nuxt client transforming; no AppImage yet. | N/A | `evidence/api-rev-001/x64-build-retry.log` | Wait, inspect final result |
| 5 | AE-002 | 2026-09-24T11:46:00Z | Checkpoint | New 535 MiB AppImage; metadata/layout checks | Valid layout and metadata | Build and updater metadata pass; durable layout verifier crashes `ENOBUFS` while capturing extraction stdout (>1 MiB), before assertions. | N/A | `evidence/api-rev-001/{x64-build-retry,x64-artifact-checks}.log` | Narrow verifier fix then rerun |
| 6 | AE-002 | 2026-09-24T11:46:40Z | Completed | Native x64 build; metadata validator; fixed layout verifier | New x64 AppImage with common launcher/real ELF/desktop marker, metadata | Build pass; ELF x64; SHA-256 `604e64769baaf583cd395bf050639512166b2ce273480f02cf2012a05f9c27be`; metadata pass; layout pass after stdout fix. | Pass | `evidence/api-rev-001/{x64-build-retry,x64-artifact-checks,x64-layout-recheck}.log` | Continue restricted-host actual launch |
| 7 | AE-003 | 2026-09-24T11:49:00Z | Completed | New AppImage direct E2E harness, then private desktop marker through same package; isolated roots/ports | No-flag GUI/server; exact fatal then one fallback, log; no host policy writes | Direct health-ready at port 44681 and app warning/server running; desktop-equivalent health 200 at 39189, captured exact pre-start FATAL and one fallback line; before/after policy diff empty. | Pass (Ubuntu 26.04 x64 only) | `evidence/api-rev-001/{restricted-direct-harness,restricted-app,restricted-server,desktop-equivalent-result,desktop-equivalent-stderr,host-policy-before-desktop,host-policy-after-desktop,host-policy-diff}.log` plus `.txt` policy files | AC-001 representative 24.04 remains untested; continue Node mode |
| 8 | AE-004 | 2026-09-24T11:49:30Z | Completed | `ELECTRON_RUN_AS_NODE=1` new AppImage `-e` with spaced argv | Real ELF used, caller argv preserved, no GUI flag | Exit 0; `process.execPath` ends `/autobyteus-real`; argv retains `two words`; Electron 42.4.1. Direct GUI embedded server also reached running via real ELF. | Pass | `evidence/api-rev-001/packaged-node-mode.log`, `restricted-app.log` | Continue host/architecture/update feasibility |
| 9 | AE-003 | 2026-09-24T11:51:00Z | Checkpoint (additional proof) | Playwright Electron adapter on direct and desktop-marker AppImage | First GUI window exists | Both launch modes opened a first Electron window; desktop-marker window URL is packaged `app.asar/dist/renderer/index.html`; owned roots/processes cleaned by adapter. | Pass | `evidence/api-rev-001/{restricted-playwright-window,desktop-equivalent-window}.log` | Continue cross-host feasibility |
| 10 | AE-005 | 2026-09-24T11:51:10Z | Completed | Host inventory and real `unshare -Ur true` | Capable host, actual renderer isolation on direct/desktop | Only Ubuntu 26.04 x64 restricted host available; unshare EPERM. Changing host AppArmor to emulate capability would violate scope and not prove real capable-host package. | Blocked | `evidence/api-rev-001/external-target-feasibility.txt` | Need sandbox-capable Ubuntu 20/22 or equivalent runner with package and process inspection |
| 11 | AE-006 | 2026-09-24T11:51:10Z | Completed | Native architecture/tool inventory; release workflow inspection | Native ARM64 build, layout/metadata/smoke | Host x86_64; no ARM64 native runner/container/QEMU here; workflow defines ARM64 job but no run of current HEAD. | Blocked | `evidence/api-rev-001/external-target-feasibility.txt`, `.github/workflows/release-desktop.yml` | Need native ARM64 CI/host on current package |
| 12 | AE-007 | 2026-09-24T11:51:10Z | Completed | Compare released and newly built artifact versions, updater metadata | Older-to-newer install and relaunch | Both old downloaded release and new local package are 1.4.78; new version not staged/published. Static metadata passes but cannot create a genuine older-to-newer updater journey without staged newer release/update feed. | Blocked | `evidence/api-rev-001/external-target-feasibility.txt`, `x64-artifact-checks.log` | Need authorized staged newer version/feed and isolated old install |

## Re-entry and reconciliation
- Last event: AE-001/002/003/004/008 Pass; AE-005/006/007 Blocked by external targets.
- Cases not started: None running; AE-005–007 terminal Blocked.
- Reconciled into report: Yes — `api-e2e-execution-coverage-report.md`, ledger reconciliation and changed-boundary matrix.
- Terminal case summary: AE-001/002/003/004/008 Pass; AE-005/006/007 Blocked; none running or unstarted.
