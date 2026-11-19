# Ubuntu AppImage Sandbox Startup — Investigation Notes

## Investigation Meta

- Package identifier: ubuntu-appimage-sandbox-startup
- Workspace root: /home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation
- Repository mode: Git; isolated branch `codex/ubuntu-appimage-sandbox-investigation`
- Resolved base: `origin/personal` at `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38` (refreshed 2026-09-24)
- Finalization target: `personal` through downstream delivery after review, implementation, validation and user verification; no merge or release authorized by design completion
- Bootstrap result: Worktree clean and created successfully
- Bootstrap blocker: None
- Current solution revision: SR-005; approved behavior baseline SR-001, approval SR-002; ARCH-REV-001 findings F-001/F-002 addressed in design/evidence revision
- Investigation status: Complete for requirements and architecture design on the current package/base; implementation validation remains downstream

## Initial Request

User reports AutoByteus_personal_linux-x64-1.4.78.AppImage needs `--no-sandobx` on current Ubuntu, but not Ubuntu 20/22, and asks why. The flag is written `--no-sandobx` in the message; this may be a typo for `--no-sandbox` and must not be assumed.

## Initial Runtime Evidence

- `/etc/os-release`: Ubuntu 26.04 LTS.
- `uname -a`: Linux 7.0.0-31-generic x86_64.
- AppImage exists at `/home/ryan-ai/Downloads/AutoByteus_personal_linux-x64-1.4.78.AppImage`, executable mode 755, size 456557882 bytes.
- `sysctl kernel.unprivileged_userns_clone user.max_user_namespaces`: 1 and 123849 respectively.
- `sysctl kernel.apparmor_restrict_unprivileged_userns kernel.apparmor_restrict_unprivileged_unconfined`: both 1; AppArmor loaded. These settings alone do not yet prove the AppImage failure cause.

## Initial Investigation Checklist (Historical)

- Reproduce normal launch and capture stderr/exit behavior.
- Compare correctly and incorrectly spelled switch without risking indefinite application processes.
- Inspect AppImage embedded `chrome-sandbox` and launch wrapper.
- Inspect repository Electron packaging and known release evidence.
- Consult authoritative Ubuntu/Electron/AppArmor documentation and correlate with local runtime evidence.

## Current Supplemental Artifact Inventory

| Artifact | Owner | Purpose / scope | Status | Approval applicability |
| --- | --- | --- | --- | --- |
| `evidence/` | Solution Designer | Raw logs and probes from the Ubuntu 26.04 host and v1.4.78 AppImage; supports current-state findings, not packaged fix validation | Complete for recorded local probes; downstream packaged/older-host validation pending | Evidence only; not behavior-defining; no separate user approval |
| `design-review-report.md` and `architecture-review-revision-record.md` | Architecture Reviewer | ARCH-REV-001 independent review and F-001/F-002 findings | Round 1 Blocked; immutable reviewer-owned history | Technical review only; not behavior approval |
| `architecture-design-handoff.md` | Solution Designer | Previous SR-004 result/routing context | Superseded for routing by SR-005 handoff; retained as history | No behavior-defining content |
| `architecture-design-handoff-sr005.md` | Solution Designer | Current complete SR-005 result and renewed-review routing context | Ready for rule-based handoff | No behavior-defining content |
| `analysis-result.md` and `requirements-review-result.md` | Solution Designer | Earlier diagnosis and approval-hold results | Historical, superseded by approved requirements/design | No separate behavior approval |

## Current Supported Product Scenarios

The canonical IDs below match the approved `requirements-doc.md`. The manual-flag and misspelled-flag invocations were **diagnostic probes**, not SCN-002/SCN-003; their evidence is retained below without reusing scenario IDs.

| ID / behavior | Classification | Supported trigger and outcome / evidence state |
| --- | --- | --- |
| SCN-001 / BEH-001 | Supported Normal Scenario | User opens the published AppImage without flags on default restricted Ubuntu 24.04+/26.04; it must start with a diagnosed, necessary GUI-only fallback. Locally reproduced on Ubuntu 26.04; Ubuntu 24.04 remains downstream packaged validation. |
| SCN-002 / BEH-002 | Supported Normal Scenario | User opens AppImage directly or through desktop integration on a namespace-sandbox-capable host; it must remain sandboxed. Older Ubuntu no-flag startup is user-reported, not locally reproduced; current embedded desktop default bypass is source-verified. |
| SCN-003 / BEH-003 | Supported Explicit Edge Scenario | Existing tooling or embedded-server manager invokes Electron in Node/CLI mode with arguments; the GUI fallback must not inject Chromium flags. Source and local Node-mode probe support this path. |
| SCN-004 / BEH-004 | Supported Operational Scenario | Release/updater builds, publishes and relaunches x64/ARM64 AppImages and metadata; existing workflow/code establish the contract, packaged change validation is pending. |

## Diagnostic-Only Probe Classification (No Canonical Scenario IDs)

| Probe | Classification | Observation |
| --- | --- | --- |
| Correct explicit `--no-sandbox` | Diagnostic-only supported invocation | v1.4.78 application and embedded server start on this Ubuntu 26.04 host; Chromium process isolation is disabled. |
| Misspelled `--no-sandobx` | Technically possible but unsupported typo | Fails like no flag; it is not a product scenario or accepted switch. |

## Artifact And Host Facts

- Host: Ubuntu 26.04 LTS, kernel 7.0.0-31-generic, x86_64.
- AppImage: `/home/ryan-ai/Downloads/AutoByteus_personal_linux-x64-1.4.78.AppImage`, SHA-256 `b2b674536d2362ff0fdf4fd91bd9ad2df10e41f4e7e620a6e9fff7de5cbefa5c`.
- Package: Electron 42.4.1; repository `autobyteus-web/build/scripts/build.ts:299-302` targets only AppImage for Linux; `pnpm-lock.yaml` resolves electron-builder 25.1.8.
- Generated `AppRun` in the active AppImage FUSE mount forwards arguments unchanged to the `autobyteus` executable; no automatic sandbox fallback is present.
- Current mounted AppImage is `ro,nosuid,nodev`. Its root-owned `chrome-sandbox` is mode 755, not 4755. The setuid helper cannot operate from this mount.
- `kernel.unprivileged_userns_clone=1` and `user.max_user_namespaces=123849`, but both `kernel.apparmor_restrict_unprivileged_userns=1` and `kernel.apparmor_restrict_unprivileged_unconfined=1`. AppArmor is loaded; AutoByteus is labelled `unconfined`, not an application-specific profile.
- `autobyteus-web/electron/shell/workspace-shell-window.ts:43-48` and `electron/browser/browser-view-factory.ts:15-38` explicitly request `sandbox: true` for windows/views.

## Reproduction And Diagnostic Evidence

| Probe | Observation | Evidence file |
| --- | --- | --- |
| AppImage with no flag, isolated E2E data root, `ELECTRON_RUN_AS_NODE` unset | Chromium FATAL: SUID sandbox helper not configured; needs `chrome-sandbox` root-owned mode 4755. Exit 133. | `evidence/appimage-normal.log` |
| Same with misspelled `--no-sandobx` | Same FATAL and exit 133. | `evidence/appimage-typo.log` |
| Same with correct `--no-sandbox` | Application logged startup; embedded server reached running state; probe was stopped after 8 seconds by `timeout` (exit 124). | `evidence/appimage-no-sandbox.log` |
| `unshare --user --map-root-user true` | Cannot write `uid_map`: Operation not permitted. | `evidence/os-sandbox-probe.txt` |
| Kernel audit during no-flag launch | `autobyteus` transitions to `unprivileged_userns`; AppArmor denies `capname="sys_admin"`; process traps. | `evidence/kernel-audit-reproduction.log` |

The automation shell inherited `ELECTRON_RUN_AS_NODE=1`, so an initial probe exited without initializing Chromium. Conclusive runs used `env -u ELECTRON_RUN_AS_NODE` and an isolated AutoByteus E2E launch profile/data root; the user's production process was not stopped or modified. The no-sandbox launch later logged some GPU/NVIDIA warnings, but these occur after the sandbox gate and do not explain the initial abort.

## Causal Finding

The AppImage cannot use Chromium's setuid sandbox helper because its transient FUSE mount is `nosuid` and `chrome-sandbox` has mode 755. Chromium's alternate namespace sandbox also cannot complete because this host's AppArmor policy denies needed capabilities inside the unprivileged user namespace. With neither route usable, Chromium aborts *before* the AutoByteus application starts. `--no-sandbox` bypasses both routes and enables startup, at the cost of disabling Chromium's process sandbox. The FATAL line mentions the setuid fallback, but the AppArmor denial is the reason the namespace route does not succeed.

This is a packaging/host-security-policy interaction, not a Nuxt frontend or embedded-server startup failure.

## Authoritative External Sources

- [Ubuntu 24.04 release notes — unprivileged user namespace restrictions](https://github.com/ubuntu/ubuntu-release-notes/blob/main/docs/24.04/index.md#unprivileged-user-namespace-restrictions): default AppArmor restriction starting in 24.04; unconfined applications can create a namespace yet are denied subsequent capabilities; Ubuntu recommends an application-specific profile and discourages `--no-sandbox`.
- [Ubuntu security feature matrix](https://documentation.ubuntu.com/security/security-features/security-features-overview/): 22.04 lacks this restriction; 24.04 and 26.04 include it. This supports the user's version comparison but is not an older-machine reproduction.
- [Electron process-sandbox documentation](https://www.electronjs.org/docs/latest/tutorial/sandbox): `--no-sandbox` disables Chromium sandboxing for all processes and is recommended for testing only.
- [AppImage Electron sandbox troubleshooting](https://docs.appimage.org/user-guide/troubleshooting/electron-sandboxing.html): Electron AppImages depend on unprivileged namespace availability. Its simple `kernel.unprivileged_userns_clone` test is insufficient for this Ubuntu host because AppArmor further restricts capability use.
- [electron-builder v26 Linux documentation](https://www.electron.build/v26/docs/linux/): an installable DEB target supports a custom AppArmor profile; a potential design avenue, not an approved AutoByteus solution.

## Non-Authoritative Product Implications And Remaining Decisions

- A secure normal-launch path may require an installed package with a stable executable path and scoped AppArmor `userns` profile. This would require packaging, updater, and release-process investigation and user approval.
- For the portable AppImage, clearer failure detection/guidance is possible. An automatic `--no-sandbox` fallback would materially weaken process isolation and should not be silently adopted. Disabling the AppArmor restriction globally is a host-wide security downgrade, not a product fix.
- The user has requested diagnosis, not implementation. Open decisions: whether to proceed to a fix; whether the AppImage itself must work securely on Ubuntu 24.04+/26.04 or another package format is acceptable; which Linux/Ubuntu versions to support.

## 2026-09-24 User Preference And Feasibility Follow-Up

The user rejected requiring manual `--no-sandbox` and said they would accept no sandbox by default if no perfect solution exists. This expresses willingness to trade Chromium isolation for usability, but does not distinguish unconditional disablement from a conditional fallback. The proposed requirements baseline therefore chooses the narrower, lower-risk fallback and asks for explicit approval.

Current packaging and release facts: `autobyteus-web/build/scripts/build.ts` targets AppImage only for Linux; `.github/workflows/release-desktop.yml` verifies/uploads x64 and arm64 AppImages plus `latest-linux*.yml`; `autobyteus-web/electron/updater/appUpdater.ts` uses `electron-updater`. A packaging-level launch decision is necessary because the current no-flag process aborts before application startup. The automation shell's `ELECTRON_RUN_AS_NODE=1` experience also demonstrates that blindly injecting a Chromium flag into all invocations would break Node mode.

Upstream [electron-builder AppImage documentation](https://www.electron.build/docs/appimage/) describes a smart AppRun fallback that adds `--no-sandbox` only when user namespaces are unavailable, but this is in the v27 line. The [releases list](https://github.com/electron-userland/electron-builder/releases) showed v27 as alpha while v26.16.1 was latest stable on 2026-09-24; blindly upgrading AutoByteus from 25.1.8 to v27 is not a proven production path. The [v27 breaking-change guide](https://www.electron.build/docs/migration/v27-breaking-changes/) records package/configuration changes. This upstream behavior supports the feasibility of conditional fallback but does not determine the implementation architecture. An installed DEB with a profile remains a possible longer-term alternative, not part of the proposed immediate scope.

Additional operational-scenario evidence: `autobyteus-web/electron/server/linuxServerManager.ts` launches the packaged Electron executable with `ELECTRON_RUN_AS_NODE=1` to run the embedded server, and `autobyteus-web/scripts/verify-packaged-server-startup.mjs` exercises that path. Therefore SCN-003 is a supported operational mode, not only a synthetic probe. A GUI-launch fallback must not contaminate that child invocation.

## 2026-09-24 Explicit Approval

The user approved the conditional fallback in the current conversation: “i agree for systems user have to use --no sandbox, we provide the default no sandbox, for system like earlier ubuntu they dont even requrie, then user can start normally”. This confirms fallback on hosts that otherwise require `--no-sandbox`, and normal sandboxed startup on capable older Ubuntu. SR-002 captures the approval; the exact approved requirements baseline is SR-001. No new product behavior was introduced by the approval.

## 2026-09-24 Architecture Evidence: Existing Desktop Entry Divergence

The mounted v1.4.78 AppImage contains `autobyteus.desktop` with `Exec=AppRun --no-sandbox %U`. In the installed electron-builder 25.1.8 source at `node_modules/.pnpm/app-builder-lib@25.1.8*/node_modules/app-builder-lib/out/targets/AppImageTarget.js:22`, absent or empty `executableArgs` defaults to `--no-sandbox` for the desktop entry. The generated `AppRun` script itself only forwards arguments to `autobyteus`, so direct invocation without flags fails on Ubuntu 26.04 while an integrated `.desktop` invocation may start unsandboxed. This is a source-verified distinction; the earlier conclusion that older Ubuntu normal launch was necessarily sandboxed was not evidenced. The approved desired behavior remains conditional sandbox retention for both entrypaths, so this is an evidence-only correction (SR-003), not a new requirement.

Architecture consequence: a launcher change alone is insufficient with the current builder. The generated desktop entry's implicit unconditional flag must be neutralized as part of the AppImage-specific packaging design, without swallowing an explicit user-supplied `--no-sandbox` flag. `AppImageTarget.js` rejects a direct `desktop.Exec` override in `LinuxTargetHelper.js`; `executableArgs: []` still falls back to `--no-sandbox` because of the builder's `||` expression.

## Architecture Investigation Findings (Post-Approval)

- Repository base reconfirmed on 2026-09-24: `git fetch origin personal`; task HEAD and `origin/personal` both `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`. Worktree isolation remains intact.
- `autobyteus-web/build/scripts/build.ts:222-223` already registers one `afterPack` hook; `autobyteus-web/build/scripts/afterPack.ts` currently does Mac-only native-resource mode normalization and returns on non-Darwin. This is an existing packaging ownership boundary that can be extended only if Mac and Linux responsibilities remain separated.
- Installed electron-builder 25.1.8 source under `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-workspace/node_modules/.pnpm/app-builder-lib@25.1.8_dmg-builder@25.1.8_electron-builder-squirrel-windows@25.1.8/node_modules/app-builder-lib/out/`: `platformPackager.js:99-116,245-250` calls `afterPack` before target `build()` and checks the packaged application resources after the hook. `configuration.d.ts:231` exposes `AfterPackContext = PackContext`, with `targets`, `appOutDir`, `electronPlatformName`, and `packager`. This permits an AppImage-only, per-architecture transformation of the unpacked Linux app before squashfs packaging.
- Same dependency's `targets/AppImageTarget.js:20-23` generates embedded desktop `Exec=AppRun --no-sandbox %U` unless `executableArgs` is nonempty. An empty array still falls back because `join('') || '--no-sandbox'`; `targets/LinuxTargetHelper.js:80-88` rejects direct `desktop.Exec` override. These are verified builder-version constraints. The active v1.4.78 AppImage confirms the generated desktop entry and confirms generated `AppRun` itself only forwards arguments. A nonempty internal desktop marker that the app-owned launcher strips is a feasible bounded way to prevent the builder's unconditional desktop argument while preserving explicit user args.
- The same `afterPack` context can rename the current Linux ELF to a sibling real-executable path and put a thin shell entrypoint at its original `executableName`. The existing AppImage `AppRun` resolves `$APPDIR/autobyteus`, so the wrapper becomes the common direct and desktop launch boundary. This mechanism must be packaged and smoke-tested; it is not yet an implemented or runtime-verified fact.
- `autobyteus-web/electron/server/linuxServerManager.ts:38-64` starts the embedded server with `ELECTRON_RUN_AS_NODE=1` using `process.execPath`. With a shell wrapper that `exec`s the real ELF, `process.execPath` inside the GUI remains the real ELF path; the server child remains a real Electron binary in Node mode. The wrapper must also short-circuit if directly invoked with `ELECTRON_RUN_AS_NODE=1`, because release CI calls the unpacked `autobyteus` path in that mode.
- `.github/workflows/release-desktop.yml:379-542` builds Linux x64 on Ubuntu 22.04 and ARM64 on Ubuntu 24.04, verifies AppImage and updater metadata, then runs packaged server startup by calling the unpacked executable in Node mode. These are existing validation owners and must be extended, not replaced. `autobyteus-web/electron/updater/appUpdater.ts` uses `electron-updater`; updater metadata is generated by the AppImage target. The outer AppImage path/environment remains unchanged by the proposed inner executable wrapper, but real update smoke testing remains required.
- Current `autobyteus-web/electron/main.ts:26-45` configures application logging before creating `ElectronApplication`. It can record a warning when `process.argv` contains `--no-sandbox`, without owning the launch decision or adding a new cross-boundary state contract.
- The supported Ubuntu matrix has `/usr/bin/unshare` via util-linux in ordinary desktop installations; [Ubuntu's Jammy package file list](https://packages.ubuntu.com/jammy/amd64/util-linux/filelist) and [Noble-updates package file list](https://packages.ubuntu.com/noble-updates/amd64/util-linux/filelist) include it. This must still be confirmed in packaged validation on Ubuntu 20/22 and 24/26. A launcher can use a stable system `unshare` path with AppImage `LD_LIBRARY_PATH` cleared for the probe. ARCH-REV-001 correctly found that a missing or unrelated failed probe cannot be treated as proof of Chromium sandbox failure on a capable host; that earlier proposed fallback is superseded by SR-005 below.
- No persisted application data reader/writer or schema changes are implicated. Only package assembly, launch dispatch, startup diagnostics, tests, and release verification are in scope.

## Architecture Conclusion And Classification

The SR-004 completed design used a single AppImage-owned pre-Electron launcher selected through the existing `afterPack` boundary, plus an AppImage-specific desktop marker to override electron-builder 25.1.8's unconditional `.desktop` flag. Both normal entrypaths use that launcher and Node mode bypasses it. ARCH-REV-001 blocked the generic failed-probe fallback; SR-005 revises that decision below. Current source evidence supports the packaging seams and release contracts; the built artifact must still prove them in implementation and executable validation. The structural implementation scope remains Medium; architectural risk remains High because it changes Chromium process isolation and the release entrypoint. No persisted data transition, API contract or new distribution format is involved.

## 2026-09-24 Architecture Review Recovery — ARCH-REV-001 F-001/F-002

The reviewer-owned `design-review-report.md` and `architecture-review-revision-record.md` record Round 1 **Blocked / Unclear**, not a Pass. F-001 identified an unproven premise: a failed/missing `unshare` probe can occur on a sandbox-capable host, so it cannot alone authorize `--no-sandbox` under approved REQ-002/AC-002–003. F-002 identified stale SCN-002/003 labels and an obsolete `In progress` supplement inventory. The current supported-scenario table and current inventory above correct F-002 without changing intended behavior or approval.

The local host classifier evidence is now captured in `evidence/probe-classifier-current-host.txt`: fixed `/usr/bin/unshare`, `LC_ALL=C`, and AppImage library-path override absent produce exit 1 and `unshare: write failed /proc/self/uid_map: Operation not permitted`; the host's AppArmor restriction is 1, userns creation knob is 1, max namespaces is positive, and the caller is `unconfined`. The actual released AppImage no-flag launch separately produced exit 133 and the Chromium `FATAL:sandbox/linux/suid/client/setuid_sandbox_host.cc` text before AutoByteus bootstrap (`evidence/appimage-normal.log`), while `--no-sandbox` started the app/server. This proves the local restricted-host causal correlation but **does not** prove that all negative/absent `unshare` results imply Chromium failure. Ubuntu package inventories confirm the probe executable is normally available in tested-era Ubuntu packages, but availability is not used as a security inference.

The revised design treats a positive namespace probe as a fast path to normal Electron exec. On **any negative, missing, timed-out, or ambiguous probe**, the launcher first runs the actual packaged Electron ELF without `--no-sandbox`, streams stderr while retaining only a bounded exact-match marker, and observes its exit. Only exit 133 within the initial 30 seconds with the exact observed Chromium pre-start sandbox FATAL permits one retry with `--no-sandbox`; a normally running application, clean exit, unrelated crash, late exit, or unrecognized error receives no fallback. This removes F-001's premise from the security decision: a sandbox-capable host with a bad/missing external probe still runs sandboxed, though the launcher remains a signal-forwarding parent in that exceptional path. Exact classifier, signal handling, cleanup and packaged tests are specified in `design-spec.md`. The exact fatal signature is version-specific; if a supported blocked host fails with a different fatal, that is a design-impact finding, not permission to broaden to generic failed-probe fallback.

No requirements or behavior-defining supplement changed. The SR-001 baseline remains approved by SR-002; SR-005 is a design/evidence correction. No implementation or packaged validation has yet occurred.
