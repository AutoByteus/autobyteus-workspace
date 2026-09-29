# Implementation Handoff — agent-isolated-app-recording

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review applied (Large/High); ARCH-REV-005 Pass on SR-012. IR-001 routed Design Impact IMP-DI-001 to `/solution_designer`; it is resolved by SR-011/SR-012 and implemented in IR-002. This round's `get_handoff_rules` result: implementation complete, Large/High → **`/code_reviewer`**.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/requirements-doc.md` (SR-009 basis, SR-010 repair, SR-011/SR-012 IMP-DI-001 resolution; user decisions 2026-09-29 on Linux)
- Investigation notes: `…/tickets/in-progress/agent-isolated-app-recording/investigation-notes.md`
- Solution revision record: `…/tickets/in-progress/agent-isolated-app-recording/solution-revision-record.md` (SR-001..SR-012 + evidence-only clarifications: skill-first validation channel; helper hit-testing/`OBSCURED`; macOS-only validation and Linux sandbox as a user decision)
- Design spec: `…/tickets/in-progress/agent-isolated-app-recording/design-spec.md`
- Supplemental task artifacts: `…/evidence/` (probe images, `screencast_probe.py`; non-normative)
- Design review report: `…/tickets/in-progress/agent-isolated-app-recording/design-review-report.md` (ARCH-REV-005 Pass)
- Architecture review revision record: `…/tickets/in-progress/agent-isolated-app-recording/architecture-review-revision-record.md`
- Triggering rework report: IMP-DI-001 (IR-001, this file's history) → SR-011/SR-012 → ARCH-REV-005 (ARCH-DR-005 resolved)

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording`)

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002 on top of the IR-001 baseline)
- Implementation revision record: `…/tickets/in-progress/agent-isolated-app-recording/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: SR-009..SR-012 (+ evidence-only clarifications)
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004, ARCH-REV-005
- Related code-review / API-E2E / delivery revision IDs: N/A
- Triggering finding IDs: IMP-DI-001, ARCH-DR-005

Repositories and branches:

| Repo | Worktree | Branch | Base | Commits |
| --- | --- | --- | --- | --- |
| workspace | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording` | `codex/agent-isolated-app-recording` | `e6c16d80148b` (`origin/personal` has since advanced 3 commits: 1.4.91-beta.5 release; base is an ancestor, no rebase done) | `6aa97db7f` env policy + disabled updates · `6c05a961e` electron-launch extraction · `73fdd20fd` lifecycle CLI · `0d7ebe672`, `6f8183138` docs + skill · `6de47c215` ticket artifacts (IR-001) · `b28eef80b` isolated-launch marker + gate (IR-002) |
| autobyteus-mcps | `/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording` (new worktree; the main checkout has unrelated untracked user files) | `codex/agent-isolated-app-recording` | `origin/main` `f11098c` | `8d3198d` attach-only + async arrows · `3f83b8a` presentation helper · `038d1b5` recording · `99cc81e` docs · `9b7448c` hit-testing/`OBSCURED` |

Ticket artifacts are committed as of IR-001 (`6de47c215`). The designer's SR-011/SR-012 updates and this IR-002 handoff are committed together with this round's handoff commit. The build left untracked `autobyteus-application-*/dist/` outputs; they are not committed.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification reference: design-spec §Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: two repos, ~40 source files, security/privacy boundary (server env), cross-invocation process ownership in two tools, public MCP surface +2 tools, shared IPC contract change — exactly as designed.
- Selected route: `Code Review`.
- Lightweight implementation self-review for direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (IMP-DI-001 resolved in IR-002; the Linux sandbox residual is not a trigger per the user decision, and Linux was not reproduced here).

### IMP-DI-001 — Resolved (IR-002, design option B)

- Resolution: every build ships `isolated-launch.json` (`{"isolatedLaunchContract": 1}`) to `<resources>/`. `start`/`restart` gate on it before any port, data-root or spawn work (`APP_ISOLATION_UNSUPPORTED`, exit 3). Packed AppImages are refused without execution (`APPIMAGE_EXTRACTION_REQUIRED`, exit 2, with extraction steps). The E2E harness is unchanged. Validated: installed 1.4.91-beta.5 is refused from an unscrubbed agent shell with nothing launched; the worktree build starts isolated.

Original finding (IR-001, kept for history):

- Protects: REQ-002 ("never … however it is launched"), QR-003, AC-001/AC-002 (default = installed app); design escalation trigger (a).
- Evidence: the server-env policy and `DisabledAppUpdater` live **inside the desktop app** (as designed). `pnpm isolated-app start` defaults to the installed app. The installed app here is 1.4.91-beta.4; 1.4.91-beta.5 is already on `origin/personal`, and neither contains this change. From this agent shell (which carries production `AUTOBYTEUS_MEMORY_DIR`, `DB_NAME`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, `AUTOBYTEUS_SKILLS_PATHS`, `APP_ENV`, …; probe P-3), the lifecycle overlay passes the caller env to the desktop process, so an **old** app's server still inherits production settings and shows the update toast. That toast is visible in a frame from a recording of the installed app. With the **worktree build**, isolation holds: from the same unscrubbed agent shell the isolated server env contained only Electron-owned values, it had 0 open files under `~/.autobyteus`, showed 2 built-in agents, no toasts, and Settings → Updates showed "Disabled".
- The design's guide note "installed app ≥1.4.53" is therefore insufficient for isolation. Currently implemented mitigation: documentation only (guide "App version" note, skill note, troubleshooting row). I did not launch the old installed app with the production env during validation; all installed-app checks used a scrubbed environment.
- Options for the designer:
  - **A. Accept as transitional (docs only, current state).** No code change. The risk window lasts until the user's installed app is updated, and indefinitely for stale installs.
  - **B. Fail closed with a capability marker (recommended).** The packaged app ships a small marker, for example an electron-builder `extraMetadata` field or a resource file such as `isolation-capabilities.json`. `start` reads it from the resolved app (`.app/Contents/Resources` or the Linux `resources/` dir) and refuses apps without it: new code `APP_ISOLATION_UNSUPPORTED` (exit 3), with a message to use `--from-worktree`/`--build` or update. This takes about a day, needs no version numbers, and makes REQ-002 hold on every lifecycle path. The E2E harness and manual launches are unaffected, because older apps can't be fixed from outside.
  - **C. Launcher-side scrub.** The lifecycle also applies the baseline allowlist to the desktop launch env. This duplicates the security list in JS, changes Electron-main inputs (for example provider-key status display) for isolated instances, and still leaves the update toast on old apps.
- Blocking scope: only the default/installed-app launch path. Everything else is complete and was self-validated. With option A, no further implementation is needed; with B or C, a small follow-up round is needed before code review.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | `pnpm isolated-app start/list/stop/restart`, JSON, registry, fixed control port 9333; harness preserved | root `package.json` → `autobyteus-web/scripts/isolated-app/cli.mjs` → `instanceLifecycle.mjs` (+ `instanceRegistry.mjs`, `instanceProcess.mjs`, `isolatedAppErrors.mjs`) → `scripts/electron-launch/*` | Done. `restart` keeps id/ports/root/`ownsDataRoot`/`keepDataRoot`; dead-process `stop` branch; identity guard = leader pid carries `--autobyteus-isolated-instance=<id>` (or leaderless live group) |
| BEH-002 | Launch works from agent shell | `electron-launch/launchEnvironment.mjs` deletes `ELECTRON_RUN_AS_NODE` (also applies to the E2E harness) | Live-verified from an agent shell with `ELECTRON_RUN_AS_NODE=1` |
| BEH-003 | Isolated server never inherits production settings; importer unchanged + `restart` | `electron/server/serverRuntimeEnv.ts` `buildServerProcessEnv` (`inherit-caller`/`isolated-baseline`, case-insensitive allowlist + `LC_*`), `embeddedServerLaunchConfig.environmentPolicy`, `BaseServerManager.buildServerEnv`, 3 managers; `ElectronApplication` maps profile→policy | Done. Builds without the isolated-launch marker are refused by the lifecycle gate (IR-002: `appExecutable.mjs` `readIsolatedLaunchContract`, called from `instanceLifecycle.start/restart`; marker `build/isolated-launch/isolated-launch.json` via `build/scripts/isolatedLaunchMarker.ts` in `build.ts` `extraResources`). Production composition verified identical (key order and values) by test |
| BEH-004 | No update checks/UI in isolated instances | `electron/updater/appUpdateController.ts` (interface + IPC channel constants), `disabledAppUpdater.ts`, `appUpdater.ts implements`, `shared/appUpdateTypes.ts` `'disabled'`, `stores/appUpdateStore.ts`, `AboutSettingsManager.vue`, en/zh-CN messages | Rendered and verified on the worktree build |
| BEH-005 | Attach-only config; helper in `run_script`, auto-installed on use | mcps `runtime/config.py` (`attach_only`), `runtime/chrome_launcher.py` (attach-only branch under the gate), `application.run_script` → `presentation/helper.py` `ensure_installed` (same session, before the script) → `presentation/demo_helper.js` | Done. Includes the hit-test clarification (`OBSCURED`, events dispatched to the topmost element) |
| BEH-006 | Visible cursor/captions; exactly two recording tools, background worker | `presentation/demo_helper.js`; `application.start_recording/stop_recording` → `recording/service.py` → `python -m browser_automation.recording.worker` (`sys.executable`, `start_new_session`) → `recording/worker.py` (connect-only CDP screencast, constant-rate frame pump, ffmpeg via `recording/ffmpeg.py`), `recording/state.py` (file layout); MCP `mcp/tools/{start,stop}_recording.py`; CLI `start-recording`/`stop-recording` | Done. Tool inventory = previous 9 + 2 |
| BEH-007 | Async arrows execute | `script.py` `_ASYNC_ARROW` | Done |
| BEH-008 | One path from worktree to running instance | `start --from-worktree` / `--build` (`pnpm build:electron:mac|linux`, stdout→stderr) | Done; `--build` path unit-tested, worktree start live-verified (build done separately) |
| BEH-009 | Root guide + per-tool skills | `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md`, README links, `electron_packaging.md`, `autobyteus-web/README.md`, `secret_management.md`; mcps `SKILL.md`, `README.md`, repo `README.md`, `docs/mcp-to-cli-mapping.md` | Done; skill-first (CLI launcher) per clarification |

## Key Files Or Areas

- Workspace (IR-002): `autobyteus-web/build/isolated-launch/isolated-launch.json`, `build/scripts/isolatedLaunchMarker.ts`, `build/scripts/build.ts` (`extraResources`), `scripts/electron-launch/appExecutable.mjs` (gate + AppImage detection), `scripts/isolated-app/instanceLifecycle.mjs` (gate order), `tests/integration/isolated-launch-marker.integration.test.ts`.
- Workspace (IR-001): `autobyteus-web/electron/server/serverRuntimeEnv.ts`, `baseServerManager.ts`, `{macOS,linux,windows}ServerManager.ts`, `embeddedServerLaunchConfig.ts`, `electron/application/electronApplication.ts`, `electron/updater/{appUpdateController,disabledAppUpdater,appUpdater}.ts`, `stores/appUpdateStore.ts`, `components/settings/AboutSettingsManager.vue`, `scripts/electron-launch/{launchEnvironment,launchPorts,appExecutable,processGroupControl,windowsProcessTree}.mjs`, `scripts/electron-e2e/*` (imports only), `scripts/isolated-app/*`.
- mcps (`browser-automation/src/browser_automation/`): `runtime/{config,chrome_launcher,session}.py`, `script.py`, `presentation/{helper.py,demo_helper.js}`, `recording/{service,worker,ffmpeg,state}.py`, `application.py`, `cli.py`, `contracts.py`, `errors.py`, `mcp/tools/{start_recording,stop_recording,__init__}.py`, `pyproject.toml` (package data `*.js`).

## Important Assumptions

- Additions beyond the design's file list, each small and owner-local: `scripts/isolated-app/isolatedAppErrors.mjs` (coded errors and exit categories; avoids a registry↔lifecycle import cycle); `recording/state.py` (one owner of the recording file layout shared by service and worker); `runtime.default_runtime_directory()` (made the existing private gate-dir helper public, reused by recording); `BrowserRuntime.config()`.
- The worker receives its parameters as argv, and its argv (the status-file path) is the identity marker. The state file keeps the design fields.
- Error codes added within the designed categories: lifecycle `APP_EXITED_BEFORE_READY`, `SERVER_PORT_IN_USE`, `DATA_ROOT_INVALID`, `INSTANCE_ID_REQUIRED`, `APP_LAUNCH_FAILED`, `UNSUPPORTED_PLATFORM`. mcps exit statuses: `RECORDING_ALREADY_ACTIVE` 5, `RECORDING_NOT_ACTIVE` 4, `RECORDING_DEPENDENCY_MISSING` 3, `RECORDING_FAILED` 5.
- `start` writes the instance record right after spawn, before readiness, so a killed CLI never orphans an unrecorded instance. Readiness failure removes the record.
- A new `start_recording` on a tab whose previous recording already ended (but was never stopped) replaces that stale state; its MP4 was already committed.
- Helper `type` defaults to fill semantics (`clear: true`).
- Accepted consequence of REQ-002: the `electron-e2e-runtime-isolation` ticket's AC-014 ("no allowlist; provider/API-key env preserved into the e2e server") is superseded. `platformServerEnvironment.spec.ts` now asserts both policies. The server reads provider keys from the vault, not from env (verified by grep), so provisioning is unaffected.

## Known Risks

- Linux is not validated in this ticket (user decision 2026-09-29: macOS-only; the user validates Linux after delivery). That covers the marker inside the AppImage, the extracted-layout launch and the Chromium sandbox on distros restricting unprivileged user namespaces. The lifecycle never adds `--no-sandbox`; the guide's Linux section lists the OS-level remedies as the user's choice.
- Builds released before this change can still be launched by hand with the `e2e` variables; that is outside product control and documented.
- While a page `alert`/`confirm` is open, **any** new Playwright connection (every browser-automation command) blocks until it is answered. This is pre-existing behavior; the worker's no-op listener restores it instead of silently dismissing (MP-005). It is documented in the skill and guide.
- Occluded-window recording (MP-003) was not validated. The switches are passed and asserted in args; the covering scenario is left for API/E2E.
- Flaky unrelated Electron vitest specs (`browser/__tests__/browser-shell-controller.spec.ts` collection, one `'installed'` assertion). Different failures across full runs; one full run passed 36/36; the specs pass alone. Not in the touched areas.
- `demo_helper.js` is 474 effective lines (new file, >220-line delta). It must stay one evaluable function expression, because the page receives it as a single `evaluate` without a bundler. Splitting would need a build step, so it stays below 500 as one cohesive helper.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement
- Reviewed root-cause classification: Missing Invariant + Duplicated Policy
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes` (single `buildServerProcessEnv`; controller strategy; shared `electron-launch/`)
- If challenged, routed as `Design Impact`: `Yes` — IMP-DI-001 in IR-001, resolved by SR-011/SR-012 and implemented in IR-002
- Evidence / notes: see IMP-DI-001.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed: `Yes`. `buildServerRuntimeEnv` and inline manager env literals removed; `electronE2EEnvironment.mjs`, `ownedElectronProcessTree.mjs`, `windowsOwnedProcessTree.mjs` moved (not copied) to `electron-launch/`; private port/executable helpers removed from `electronE2ELaunchPreparation.mjs`; `appUpdater?.` branches replaced; README `env -u` advice removed; error code renamed `ELECTRON_E2E_TREE_UNCONFIRMED` → `ELECTRON_PROCESS_TREE_UNCONFIRMED` with all users updated.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest: `baseServerManager.ts` 456, `demo_helper.js` 474, `application.py` 418; see risk note)

## Persisted Data Transition Check

- Approved decision: `Not Affected`
- Implementation follows it: `Yes`. New ephemeral files only: `<tmp>/autobyteus-isolated-app/` and `<runtime dir>/recordings/`. Stale entries are handled by identity checks.
- Deviation: `None`

## Environment Or Dependency Notes

- No new npm or Python dependencies; `uv.lock` unchanged. ffmpeg is a system binary (Homebrew here).
- The worktree needed `pnpm install` and `nuxi prepare` for vitest. The mcps test env comes from `uv sync --extra test`.
- A macOS worktree build now exists at `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` (reusable by API/E2E via `start --from-worktree`).

## Local Implementation Checks Run

IR-002 (this round):

- Node tests (`scripts/{isolated-app,electron-launch,electron-e2e}/__tests__`): 55/55. New cases cover the gate (valid, newer, missing, malformed, non-integer, lower contract), AppImage detection by magic and by suffix (proved not executed by a sentinel), an extracted layout with and without the marker, `start` refusing before any port, root or spawn work, `restart` refusing without stopping the instance, and `--from-worktree` with a marker.
- Marker packaging test (`tests/integration/isolated-launch-marker.integration.test.ts`): 4/4 against the rebuilt macOS bundle. It failed on the pre-marker build, as intended.
- Electron server/updater vitest 103/103; `tsc -p build/tsconfig.json` OK.
- Live from this agent shell **without scrubbing**: installed 1.4.91-beta.5 → `APP_ISOLATION_UNSUPPORTED` exit 3, no process launched, no data root created. Worktree build (`--from-worktree`, rebuilt with the marker) → started; its server env had only Electron-owned `AUTOBYTEUS_*`/`DB_*` values, 0 open files under `~/.autobyteus`, and the control port listened on `127.0.0.1` only. `restart` kept `ownsDataRoot`; `stop` removed the root and freed the ports.
- The rebuild's final zip step failed (7za exit 255) when a session pause interrupted it. The `.app` and DMG were produced; the zip is only a release artifact.

IR-001 (baseline):

- Workspace electron vitest: `electron/server` + `electron/updater` 103/103. Full suite 36/36 files on a clean run, with 2 other runs showing different unrelated flaky failures.
- Workspace Nuxt vitest: `appUpdateStore.spec.ts`, `AboutSettingsManager.spec.ts` pass.
- Node tests: `scripts/{isolated-app,electron-launch,electron-e2e}/__tests__` 46/46.
- `pnpm transpile-electron`, `guard:localization-boundary`, `audit:localization-literals`: pass.
- mcps: unit 138/138; `BROWSER_AUTOMATION_REAL_TESTS=1` full integration suite 22/22. That includes new headless-Chrome suites for the helper (5 tests: install-on-use only, reload, all actions, structured errors, transient overlays, modal hit-testing) and recording (4 tests: background across CLI calls with ffprobe, target_closed, start errors, MP-005 dialog). There is also a negative control: removing the no-op listener makes the MP-005 test fail with "No dialog is showing".
- Live, installed app 1.4.91-beta.4 with scrubbed env, via the skill CLI launcher (attach-only):
  - lifecycle start 4.4 s; control port `127.0.0.1` only; restart keeps root and flags, new tab id; stop removes the root and frees ports; dead-process stop gives `wasRunning:false`;
  - helper click + caption visible in the recorded frame; recording 2400×1536 H.264;
  - MP-005 on Electron (`confirm` stayed open for 2.5 s during recording, then was answered);
  - `isolated-app stop` during a recording finalizes it as `target_closed`;
  - attach-only with nothing listening gives `BROWSER_UNAVAILABLE` exit 3 and no Chrome launched.
- Live, **worktree build**, started from this agent shell **without scrubbing** (production vars present): isolated server env contained only Electron-owned values, 0 production files open, 2 built-in agents, no update toasts, Settings → Updates "Disabled".

These are implementation-scoped checks, not API/E2E sign-off.

## Frontend Rendered-Result Check

IR-002 changes no rendered UI (lifecycle gate, build resources, docs). The IR-001 check below stands and was reconfirmed on the rebuilt worktree bundle, which started isolated.

- Affected surfaces: update notice/toasts (must not appear) and Settings → Updates panel in isolated instances.
- References: REQ-009/AC-008; design DS-004.
- Reviewed: `AboutSettingsManager.vue`, `AppUpdateNotice.vue`, `appUpdateStore`; existing panel styling reused (no new styles).
- Rendered surface: packaged worktree build launched isolated, inspected over CDP (screenshots + DOM).
- States inspected: Agents page after >15 s (no toast); Settings → Updates in `disabled` (status "Disabled", neutral message, check button and beta toggle absent). The production `idle`/`available` states are covered by the existing component tests (unchanged).
- Issues found/corrected: none.
- Limitations: zh-CN rendering not inspected (strings added in both locales); the panel subtitle "Version details and desktop app update controls." still shows in the disabled state (unchanged product copy).

## Downstream Coverage Hints / Suggested Scenarios

- IR-002 gate: installed app without the marker → `APP_ISOLATION_UNSUPPORTED` (exit 3, nothing launched); `--from-worktree`/`--build` → starts; `restart` after deleting the marker from the bundle → refused, instance still running. Linux AppImage and extracted layouts are the user's own post-delivery validation.
- AC-010 skill-first: a fresh agent with only the two skills, using `pnpm --dir <repo> isolated-app start --from-worktree` and `env CHROME_REMOTE_DEBUGGING_PORT=9333 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash <browser skill>/scripts/browser …`.
- AC-002 via the E2E harness and a manual env launch with production vars present (worktree build).
- QR-006: 5-minute recording at 2400×1536 (memory is bounded to one frame by construction; verify RSS).
- MP-003: record while the isolated window is fully covered.
- Concurrent MCP calls (not CLI) during a screencast; `stop_recording` from a different MCP process than the one that started it.
- AC-014: `script -q /dev/null pnpm secrets:import … --database-url <databaseUrl>` then `restart`.
- AC-004 via the MCP adapter configured with the two env vars; tool list = 9 + `start_recording`/`stop_recording`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All ACs require independent API/E2E execution, especially AC-001..AC-010, AC-012..AC-014, and QR-001/002/003/006, on macOS (and Linux where available). Pending IMP-DI-001.
