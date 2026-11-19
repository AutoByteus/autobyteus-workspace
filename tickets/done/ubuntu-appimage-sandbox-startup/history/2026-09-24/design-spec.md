# Ubuntu AppImage Conditional Sandbox Fallback — Design Spec

## Solution And Approval Basis

- **Package ID:** `ubuntu-appimage-sandbox-startup`.
- **Current solution revision:** SR-005 (post-ARCH-REV-001 design revision; see cumulative `solution-revision-record.md`).
- **Approved requirements baseline:** SR-001 in `requirements-doc.md`, explicitly approved in the user's 2026-09-24 message recorded by SR-002: “i agree for systems user have to use --no sandbox, we provide the default no sandbox, for system like earlier ubuntu they dont even requrie, then user can start normally”. SR-003 corrected current-state evidence only; approved target unchanged.
- **Behavior-defining supplements:** N/A.
- **Design status:** Revised and ready for renewed independent architecture review after ARCH-REV-001 Blocked/F-001–F-002; no implementation has been performed. The reviewer-owned `design-review-report.md` and `architecture-review-revision-record.md` remain the Round 1 history, not a Pass.
- **Canonical investigation evidence:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation/tickets/in-progress/ubuntu-appimage-sandbox-startup/investigation-notes.md`.
- **Workspace/base/finalization:** Isolated branch `codex/ubuntu-appimage-sandbox-investigation` at refreshed `origin/personal` revision `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38`. The eventual integration target is `personal` through downstream delivery; no merge or release authorized by this design alone.

## Current-State Read

The published v1.4.78 AppImage launches from a FUSE mount. Its generated `AppRun` forwards CLI args directly to the inner `autobyteus` ELF. On this Ubuntu 26.04 host, a no-flag direct launch fails before Electron application bootstrap because AppArmor denies the namespace sandbox and the AppImage cannot use the setuid helper. A manual `--no-sandbox` launches successfully. Separately, electron-builder 25.1.8 generates an embedded `.desktop` entry with `--no-sandbox` unconditionally, so desktop-integrated launch already takes the security downgrade even on hosts where it is unnecessary. These two entrypaths currently have inconsistent behavior. The existing Linux packaging owner is `build/scripts/build.ts`; `afterPack.ts` is a Mac-only hook today. The embedded server uses the real Electron executable in Node mode via `process.execPath`; the release workflow tests that path. The updater uses the outer AppImage/metadata lifecycle. See investigation notes for exact runtime logs and source line references.

## Intended Change And Production-Path Map

Only the Linux **AppImage** package changes. A single package-owned entrypoint decides at each GUI launch whether Chromium's namespace sandbox can be used. A successful namespace probe fast-paths a normal sandboxed launch; a failed, missing, or ambiguous probe **does not itself authorize `--no-sandbox`**. Instead, the launcher makes one actual sandboxed Electron launch attempt, and retries once with `--no-sandbox` only after that attempt exits with the recognized pre-start Chromium sandbox fatal. Any successful or unrelated-failure attempt is never downgraded. The current builder-generated desktop default is neutralized, so direct and integrated launches use the same decision. Explicit user `--no-sandbox` remains honored. Node-mode/embedded-server paths bypass the GUI decision. No Ubuntu sysctl/AppArmor changes, new installer format, browser security-preference changes, or data migration are included.

| Behavior | Approved REQ / AC | Trigger | Existing evidence | Target production path / spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001–003; AC-001, AC-003, AC-004 | Open AppImage on restricted Ubuntu without flags | Exit 133; AppArmor `sys_admin` denial; current direct `AppRun` does not adapt | Outer AppImage → `AppRun` → package launcher → negative probe → sandboxed Electron attempt produces recognized pre-start fatal → one retry with `--no-sandbox` → app/server startup; DS-001 |
| BEH-002 | REQ-002; AC-002 | Open AppImage on capable Ubuntu/Linux without flags, direct or desktop | Direct path can use sandbox; embedded desktop entry currently passes `--no-sandbox` | Both entrypaths → package launcher → positive probe fast-path or negative/unknown probe followed by successful actual sandboxed attempt → sandboxed renderer; DS-002 |
| BEH-003 | REQ-004; AC-005 | Explicit CLI args or Node-mode server invocation | `LinuxServerManager` and release CI use `ELECTRON_RUN_AS_NODE=1` | Package launcher → Node-mode/explicit-flag short circuit → real Electron with args preserved; DS-003 |
| BEH-004 | REQ-005; AC-006 | Build, publish, update/restart Linux AppImage | `build.ts`, release workflow, updater metadata | afterPack transform → AppImage target → metadata/release validation → updater replaces outer AppImage; DS-004 |

## Task Size And Architectural Risk

- **task_size: Medium.** The production delta spans existing packaging configuration/hook, one AppImage-specific launcher source and installer helper, a small startup diagnostic, focused tests including one-shot retry/signal behavior, release verification, and packaging documentation. It stays inside existing desktop packaging/launch/updater boundaries; there is no domain/API/persistence redesign.
- **architectural_risk: High.** The change deliberately varies Chromium process-sandbox security by host and changes the distributable executable entrypoint for both x64 and ARM64. A mistaken sandbox-fatal classifier, broken supervised-attempt lifecycle, default desktop argument, or wrapper behavior could silently disable sandboxing, fail startup, break embedded-server Node mode, or break update/release assets. This is a material security and deployment boundary even though the code footprint is medium.
- **Escalation trigger:** If packaged validation cannot prove a reliable conditional decision on supported Ubuntu versions, the required desktop/direct convergence, Node-mode preservation, or updater continuity, stop and return a design impact/requirement question rather than ship unconditional `--no-sandbox` or relax REQ-002.
- **Payload-versus-structure check:** The investigation logs and Markdown artifacts are evidence payload, not implementation breadth. Structural surfaces in scope are the package entrypoint, build hook/config, runtime diagnostic and release verification. No API, database, or shared product-state contract changes.

## Architecture Investigation Evidence

| Source | Exact path/reference | Observation | Decision supported | Remaining uncertainty |
| --- | --- | --- | --- | --- |
| Runtime probes/audit | `investigation-notes.md`, `evidence/appimage-*.log`, `evidence/kernel-audit-reproduction.log`, `evidence/probe-classifier-current-host.txt` | Restricted host needs fallback; no-flag actual Electron attempt exits 133 with a specific pre-start Chromium FATAL; bare unshare failure alone is not sufficient evidence | One actual sandboxed attempt confirms necessity on a negative/unknown probe | Packaged implementation and bounded stderr/exit classifier not yet built |
| Actual AppImage | Mounted `AppRun`, `autobyteus.desktop`, mount/stat | `AppRun` forwards; `.desktop` unconditionally passes flag; FUSE `nosuid` | One common entrypoint and desktop default removal | Third-party external desktop shortcuts may retain old user-created flags |
| Installed builder 25.1.8 | `node_modules/.pnpm/app-builder-lib@25.1.8*/.../targets/AppImageTarget.js:20-23`; `LinuxTargetHelper.js:80-88` | Empty `executableArgs` still means `--no-sandbox`; direct `desktop.Exec` override rejected | Nonempty private desktop marker, stripped by owned launcher | Must verify final generated entry in packaged artifact |
| Hook order/types | Same builder `platformPackager.js:99-116,245-250`, `configuration.d.ts:231` | `afterPack` runs before AppImage target; context includes target list/appOutDir | Transform unpacked Linux executable once before squashfs | Must validate framework sanity check and artifact contents |
| Existing hook/build | `autobyteus-web/build/scripts/afterPack.ts`, `build.ts:217-223,299-302` | Hook currently Mac-only; Linux target AppImage | Thin platform dispatcher; AppImage-specific transform | No material unknown |
| Server/updater/release | `electron/server/linuxServerManager.ts:38-64`, `electron/updater/appUpdater.ts`, `.github/workflows/release-desktop.yml:379-542` | Node mode uses real `process.execPath`; CI selects unpacked executable; updater needs artifact metadata | Bypass GUI decision for Node; preserve outer AppImage and metadata | Real packaged update smoke test required |
| Upstream pattern | [electron-builder v27 AppImage docs](https://www.electron.build/docs/appimage/), [releases](https://github.com/electron-userland/electron-builder/releases) | Upstream describes conditional fallback, but v27 was alpha on investigation date | Mechanism is plausible; do not make a major/alpha builder upgrade the fix | Local behavior still must be proven |

## Task Design Health And Root Cause

- **Change posture:** Bug fix plus approved security/usability behavior change.
- **Current design issue:** Yes. The builder's desktop default and CLI entrypath disagree, and the package lacks a single owner for host-dependent sandbox selection.
- **Root cause classification:** Missing launch invariant at the package boundary plus legacy/compatibility pressure from electron-builder 25.1.8's unconditional desktop default; Ubuntu's policy change exposes the gap.
- **Refactor needed now:** Yes, narrowly. Convert `afterPack.ts` from a Mac-specific implementation into a thin platform/target dispatcher, extracting existing Mac normalization unchanged into a Mac-owned file. This avoids mixing Mac signing/resource concerns with Linux sandbox launch policy.
- **Design response:** Own the conditional decision in the AppImage's pre-Electron launcher, not Electron main, renderer preferences, `LinuxServerManager`, or host configuration. Add startup logging as observation only.
- **Intentional deferral:** A `.deb` plus scoped AppArmor profile may offer a fully sandboxed Ubuntu path, but it is out of the approved scope. Unknown non-Ubuntu host/probe behavior remains a validation risk, not permission for unconditional sandbox disablement.

## Terminology And Decisions

- **Inner real executable:** the existing Electron ELF, renamed within the unpacked AppImage so `process.execPath` remains an executable ELF after launcher `exec`.
- **Package launcher:** an AppImage-specific thin shell entrypoint at the original executable name, invoked by both `AppRun` and direct unpacked execution.
- **Desktop marker:** a private, nonempty argument supplied only to work around builder 25.1.8's default `.desktop` `--no-sandbox`; the launcher strips it before invoking Electron.
- **Namespace probe:** a cheap pre-Electron child attempt equivalent to `unshare -Ur true`, with the AppImage library-path override removed. Success is only a fast-path hint; failure, absence, timeout or unusual output is **not** proof that Electron needs `--no-sandbox`.
- **Sandboxed confirmation attempt:** a first launch of the actual packaged Electron ELF **without** `--no-sandbox`, with stderr streamed to the caller and only a bounded exact fatal-match marker retained. Only a recognized Chromium sandbox abort in the initial 30 seconds permits one retry. A normally running application remains sandboxed; unrelated failure is propagated unchanged.

## Legacy Removal, Compatibility And State

- **Legacy removal policy:** No compatibility-only dual launch paths. Remove the implicit builder-generated desktop `--no-sandbox` behavior from the final artifact by overriding its default with the private marker; direct and desktop startup must converge on the one package launcher. Do not retain a separate unconditional desktop bypass.
- **Removal/decommission mapping:** Existing Mac logic is moved (not duplicated) out of `afterPack.ts`; the Mac early-return-only behavior is replaced by explicit target dispatch. The generated `AppRun` is retained as the AppImage runtime's thin wrapper, not duplicated or patched. The embedded server path remains the real ELF; no compatibility shim is added there.
- **Backward-compatibility rejection:** Do not keep an old direct/desktop split, an unconditional `--no-sandbox` for old `.desktop` output, or a shadow browser/runtime policy inside Electron main. Existing user-created external shortcuts that explicitly pass `--no-sandbox` are caller choices; they are not rewritten by this package.
- **Persisted data/state transition:** **Not Affected.** No user-data, schema, URL, API, or application-state reader/writer changes. The outer AppImage/updater metadata are regenerated release artifacts, not persisted user data; preserve updater functionality through validation rather than migration.

## Data-Flow Spine Inventory And Narratives

| Spine | Scope | Behavior | Start → end | Governing owner | Why it matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001 | User opens AppImage → outer runtime → `AppRun` → package launcher → negative probe → actual sandboxed Electron abort with recognized startup FATAL → one `--no-sandbox` retry → app/server/GUI | AppImage package launcher | Gets affected user into app without a manual flag, based on actual launch failure |
| DS-002 | Primary end-to-end | BEH-002 | User opens AppImage or integrated desktop item → `AppRun` → package launcher → positive probe and direct exec **or** negative/unknown probe and successful actual sandboxed attempt → sandboxed GUI | AppImage package launcher | Preserves isolation even if the external probe is absent or fails spuriously |
| DS-003 | Primary end-to-end | BEH-003 | CLI/embedded-server caller → real executable or launcher Node-mode bypass → real Electron Node runtime → server result | Existing server manager; launcher only passes through | Prevents startup fix from breaking server lifecycle |
| DS-004 | Primary operational | BEH-004 | Release build → `afterPack` transform → AppImage target → metadata/CI → release/update → next package launch | Existing build/release pipeline | Ensures new entrypoint survives artifact and updater lifecycle |
| DS-005 | Return/event | BEH-001 | Fallback decision → stderr and Electron startup warning → app log/operator diagnosis | Launcher decision; Electron logger observation | Makes security downgrade visible without blocking startup |

The package launcher governs argv selection and at most one sandboxed confirmation attempt before fallback. It remains a bounded package boundary: no GUI, package update, server orchestration, persistent state, or AppArmor mutation belongs there. The existing Electron application remains owner of startup, BrowserWindow creation and the embedded server after either direct `exec` or a confirmed fallback `exec`; when an ambiguous probe is followed by a successful sandboxed attempt, the launcher only waits/forwards signals until that real Electron process exits. The build hook governs file transformation, not runtime policy. The updater continues to operate on the outer AppImage and metadata, not the renamed inner ELF.

## Ownership, Boundaries, Dependencies And Interfaces

| Boundary / owner | Owns | Must use / must not bypass |
| --- | --- | --- |
| `build.ts` AppImage configuration | Desktop marker and AppImage target | Must not inject unconditional no-sandbox; marker must be nonempty under builder 25.1.8 |
| `afterPack.ts` dispatcher | Call correct platform-specific transformation for `context.electronPlatformName`/`targets` | No inline Mac normalization or Linux probe policy |
| Linux AppImage packaging helper | Validate expected ELF/path; rename real binary; install executable launcher; fail build on unexpected layout | Must not alter Mac/Windows or future non-AppImage Linux targets |
| AppImage package launcher | Strip only private first-arg marker; bypass GUI probe for Node mode; preserve caller args; fast-path a positive namespace probe, otherwise supervise one actual sandboxed attempt; retry with one `--no-sandbox` only for recognized pre-start fatal; forward signals and exit status on non-retry path | No app/domain logic, no host policy changes, no `eval`/unquoted argv, no fallback merely because probe is missing/failed |
| Electron main logger | Observe actual sandbox-disable flag after logger config | Must not decide or mutate launch flags; no false claim of full sandbox if flag absent |
| Existing `LinuxServerManager` | Embedded server lifecycle using `process.execPath` ELF | Must not be changed to point at shell wrapper or absorb fallback policy |
| Existing release workflow | Artifact/updater validation | Extend to inspect final launcher/desktop state and run packaged-mode smoke tests; do not weaken existing checks |

The launcher interface is **argv + environment → real ELF invocation**, normally by `exec` and, only after negative/unknown probe, by one supervised sandboxed attempt followed by either status propagation or one fallback `exec`. Internal desktop marker is transport-only and removed before Electron. `ELECTRON_RUN_AS_NODE=1` is a supported operational bypass. An explicit caller `--no-sandbox` remains authoritative and is not removed or duplicated. A failed namespace probe never authorizes fallback by itself; only the actual Electron sandbox fatal does. The launcher does not change system settings. No new app API or shared type is required; interface identity is the current package process and its arguments.

## Target Launch Decision (Shape Guidance)

Pseudocode for the launcher behavior; implementation must use safe POSIX/Bash quoting, exact argv preservation, a private bounded fatal-match marker rather than a growing log file, and signal forwarding while supervising the first real-ELF attempt:

```text
real = sibling inner Electron ELF
if first arg == private desktop marker: remove it
if ELECTRON_RUN_AS_NODE == "1": exec real with original remaining args
if argv already contains exact --no-sandbox: exec real unchanged
probe = fixed-path system unshare -Ur true in a subprocess without AppImage LD_LIBRARY_PATH
if probe succeeds: exec real unchanged
run the actual real ELF once *without* --no-sandbox, preserving its normal environment/argv
stream its stderr to the caller while recording only an exact Chromium fatal match;
wait and forward termination signals
if it keeps running: remain only as a signal-forwarding/waiting parent; never inject a flag
if it exits normally or with an unrelated failure: return its exact exit status; never inject a flag
if it exits within 30 seconds with status 133 AND the exact observed Chromium pre-start
  sandbox FATAL signature: warn to stderr, then exec real --no-sandbox with original args
```

Use fixed trusted `/usr/bin/unshare` or `/bin/unshare` rather than a caller-controlled PATH lookup; `LC_ALL=C` applies only to that probe. A missing probe, any nonzero result, or a utility failure **must enter the actual sandboxed attempt**, never the no-sandbox branch. The fallback classifier is limited to the locally observed v1.4.78/Electron 42 startup failure: exit 133 (SIGTRAP) within 30 seconds together with Chromium's `FATAL:sandbox/linux/suid/client/setuid_sandbox_host.cc` line and its “Rather than run without sandboxing I'm aborting now” text. Match the actual Chromium diagnostic, not arbitrary substring `sandbox`; add other signatures only after evidence and design review. This first attempt is the normal packaged executable, so a capable host with a missing or spuriously failing `unshare` still runs sandboxed. Do not kill an otherwise healthy app at the classifier time limit; the limit only prevents a late exit from being retried. A private FIFO and bounded-chunk stderr drainer can stream live output while retaining only a bounded rolling match buffer and one-bit result; do not spool unbounded application logs or accumulate unbounded lines. The wrapper must clean up its private marker/FIFO on every path, avoid recursive retries, forward signals to a still-running child, avoid indefinite drainer waits, and propagate the child's exit status. The probe and confirmation attempt must not write host security settings. A positive probe remains an optimization, not proof of renderer isolation; packaged validation must inspect the actual Electron/Chromium result. `autobyteus-web/electron/main.ts` logs a warning if actual GUI `process.argv` contains `--no-sandbox`, regardless of whether it was automatic or user-explicit.

| Probe outcome | Actual sandboxed ELF attempt | Launch decision | Approved behavior protected |
| --- | --- | --- | --- |
| Success | Skipped; normal ELF `exec` | No injected flag | BEH-002/AC-002; final renderer state still must be tested |
| Failed, absent, timed out, or ambiguous | Starts and remains running, or exits cleanly | No injected flag; wrapper waits/forwards if still running | BEH-002/AC-002 even when `unshare` is a false negative |
| Failed, absent, timed out, or ambiguous | Exit 133 within 30 seconds **and** exact observed Chromium sandbox FATAL | Warn, then exactly one `exec` with `--no-sandbox` | BEH-001/AC-001–003, based on real package failure |
| Failed, absent, timed out, or ambiguous | Other or late failure | Preserve actual exit status/error, no fallback | REQ-002; unknown is not treated as permission to downgrade |
| Any | Explicit `--no-sandbox` or `ELECTRON_RUN_AS_NODE=1` | Honor caller flag or bypass GUI decision for Node mode | BEH-003/AC-005 |

## Capability Areas And File Responsibilities

| Area/path | Decision | Responsibility |
| --- | --- | --- |
| `autobyteus-web/build/scripts/build.ts` | Extend | Configure an AppImage-only nonempty private desktop marker to prevent builder 25.1.8's implicit unconditional `--no-sandbox`; retain target/artifact names. |
| `autobyteus-web/build/scripts/afterPack.ts` | Refactor | Thin dispatch by target/platform only. |
| `autobyteus-web/build/scripts/macNativeResourceModes.ts` (new) | Extract | Existing Mac node-pty mode normalization, unchanged in behavior. |
| `autobyteus-web/build/scripts/linuxAppImageLauncher.ts` (new) | Create | AppImage-only afterPack validation, real-ELF rename, launcher materialization and executable mode; fail closed on layout mismatch. |
| `autobyteus-web/build/appimage/launcher.sh` (new) | Create | Runtime argv/namespace-probe fast path, one actual sandboxed confirmation attempt on negative/unknown probe, strict startup-fatal retry decision and child lifecycle; no business logic. |
| `autobyteus-web/electron/main.ts` | Extend | Log sandbox-disable warning after existing logger setup; no launch-policy decision. |
| Focused launcher/build-hook tests (new, under existing test conventions) | Create | Stub real binary/probe for positive, negative, missing and unrelated-failure probe; prove capable-host sandboxed success despite negative/missing probe, recognized fatal retry once, unrelated crash unchanged, Node/explicit-arg/marker behavior, live stderr, exit status and signal forwarding; assert generated desktop and hook transformation. |
| `.github/workflows/release-desktop.yml` | Extend | Validate x64/arm64 wrapper/real ELF/embedded desktop entry and existing Node-mode server/updater metadata; add packaged smoke evidence where runner supports it. |
| `autobyteus-web/docs/electron_packaging.md` | Delivery sync | Document conditional sandbox fallback and security tradeoff after validated implementation. |

This is a compact build/launch concern under existing desktop packaging ownership; no new top-level subsystem or generic launcher framework is warranted. No reusable schema or cross-file data model is needed. The private marker constant/string should have one authoritative definition or an exact build-time assertion between config and wrapper; avoid parallel strings that can drift. The thin wrapper and packaging helper are deliberately separate because one runs on end-user hosts and the other only during build. No interface-boundary split or identity selector beyond package target/argv is applicable.

## Change / Refactor Sequence

1. Extract Mac mode-normalization logic unchanged and turn `afterPack.ts` into a target-aware dispatcher; retain Mac verification.
2. Add the AppImage-only launcher source and packaging helper. The hook must assert the expected ELF exists, relocate it to a sibling path, install the wrapper at the original executable path with executable permissions, and fail the build on unexpected layout or duplicate application. It must not transform non-AppImage packages.
3. Configure the AppImage-specific private desktop marker in `build.ts`. Verify the emitted `.desktop` entry no longer contains builder's default `--no-sandbox`; the wrapper strips marker before Electron. Do not alter generated `AppRun` directly.
4. Add the warning after Electron logger initialization; retain existing `sandbox:true`, `contextIsolation:true`, `nodeIntegration:false` window settings.
5. Add focused tests for argument preservation, explicit flag, Node bypass, probe outcomes, actual-ELF first-attempt behavior, strict fatal signature and timing, no retry on unrelated exit, signal/status forwarding, marker removal and package-hook idempotence/failure. Run existing Electron/build tests.
6. Build x64 AppImage and validate on this Ubuntu 26.04 host with isolated data root: no-flag direct and desktop-equivalent launch, observed first-attempt sandbox FATAL followed by exactly one fallback, app/server startup, diagnostic, and unchanged host sysctl/AppArmor. Validate unpacked Node-mode server startup and updater metadata. Run/build ARM64 artifact in its native CI job.
7. Validate sandbox-preserving launch on Ubuntu 20/22 or an equivalent real host with namespace sandbox permitted, for both direct and desktop entrypaths; inspect actual renderer isolation, not only absence of a flag. Exercise update/relaunch from an older AppImage to the new package. Do not claim AC-002/AC-006 on source-only tests.
8. Delivery Engineer synchronizes packaging docs and handles user verification/finalization under its own gates. No release/tag is implied by design completion.

## Key Tradeoffs, Risks And Recovery

- **Chosen local hook/wrapper over v27 upgrade:** Upstream v27 describes a similar behavior but was alpha at investigation time and has broad breaking changes. A local hook is bounded to the current 25.1.8 packaging owner and can be verified with the current release pipeline. Revisit upstream adoption later, not as an untested dependency upgrade in this fix.
- **Private marker versus builder patch/repack:** Builder 25.1.8 offers no empty/default-free AppImage desktop `Exec` through its normal config. A nonempty private marker that the owned launcher strips is explicit and testable; patching installed dependency source or repacking the produced squashfs would be harder to maintain. If builder behavior changes, build-time artifact verification must fail rather than silently revert to unconditional `--no-sandbox`.
- **Probe approximation and F-001 resolution:** `unshare -Ur true` is a fast-path hint only. A missing/failed/ambiguous probe cannot directly disable the sandbox; one actual sandboxed Electron attempt distinguishes a capable host (keeps running sandboxed) from the observed pre-start Chromium fatal (one retry). Positive-result validation and renderer-security verification remain mandatory. A new/unrecognized Chromium failure does not trigger no-sandbox and may need a later design correction, but it cannot silently downgrade a capable host.
- **Retry side-effect boundary:** The exact observed Chromium FATAL occurs before `main.ts` bootstrap in the local logs, so its retry does not repeat AutoByteus server/user-data startup. Do not generalize the retry to a later renderer crash or a signature appearing after application bootstrap; if packaged tests show side effects before the matched failure, return a design impact rather than automatically relaunching.
- **Supervised-attempt lifecycle:** When the probe is negative on a sandbox-capable host, the wrapper stays as a thin parent until the real ELF exits; it must forward signals, preserve output and exit status, keep the AppImage mount alive, and clean private capture data. On the observed restricted-host fatal it `exec`s the single fallback launch, so no long-lived double process remains. Packaged tests must verify these operational effects.
- **Security downgrade:** On affected hosts, `--no-sandbox` disables Chromium process isolation for all processes, including the embedded browser surface. This is explicitly approved only as a conditional compatibility fallback; do not claim equal security or hide the warning.
- **Node/update blast radius:** Renaming the inner ELF could break `process.execPath` assumptions or the updater if the wrapper is wrong. The design keeps `exec` to the real ELF and requires existing packaged-server and updater smoke checks. Any actual failure is a design impact, not a reason to bypass validation.
- **External/custom desktop shortcuts:** User-created launchers with explicit flags are outside package control. The newly emitted embedded desktop entry and ordinary outer AppImage invocation are in scope.

## Implementation Guidance And Review Boundary

Implementation Engineer owns code and local checks; API/E2E Engineer owns executable coverage; Delivery Engineer owns integrated artifact verification, docs sync, explicit user verification, finalization and release. Architecture Reviewer should specifically test that the revised negative/missing-probe path never injects a flag absent the actual recognized Chromium startup fatal; that its child supervision, marker/wrapper mechanism and direct/desktop paths are coherent; and that `process.execPath`/updater behavior is preserved. A proposal to disable the sandbox for every Linux user, introduce a new installer, or relax Ubuntu policy is **not** an implementation correction; it is a requirement change requiring renewed user approval.
