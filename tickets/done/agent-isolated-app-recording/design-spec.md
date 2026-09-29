# Design Spec — Agent-Driven Isolated AutoByteus Instances

## Solution And Approval Basis

- Current solution revision ID: `SR-012` (SR-009 design + SR-010 guidance + SR-011 capability gate + SR-012 AppImage branch/text alignment)
- Approved requirements baseline / revision and user-approval reference: `requirements-doc.md` at SR-009 — SR-003 baseline (user approval 2026-09-28), REQ-015/AC-014/DEC-002 per user direction (SR-006), and user approvals 2026-09-29: presentation helper built into the browser MCP and dead-process `stop` ("that's fine … from responsibility boundary, I think it belongs to where they are"); recording moved to the browser MCP without breaking existing behavior ("yes. move record to browser mcp … it should not break how it works"); package import dropped ("drop import package … belongs to functionality of the application").
- Behavior-defining supplements and their approval references: None (evidence images are non-normative).
- Design status: `Ready` (revised after ARCH-REV-001; supersedes the SR-007 design)
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/investigation-notes.md`
- Prior review: `design-review-report.md` ARCH-REV-001 (Fail, Design Impact: ARCH-DR-001..003) on SR-007. Resolution map in §Review Findings Resolution.

## Current-State Read

- **Isolation contract** (`autobyteus-web/electron/launch-profile/*`): `production` vs `e2e`; `e2e` = own backend port, own data root with safety checks, updater off (BEH-001).
- **Server child environment** is composed inline in three platform managers as `{...process.env, ELECTRON_RUN_AS_NODE, PORT, SERVER_PORT, ...buildServerRuntimeEnv(...)}` (`macOSServerManager.ts:38-45`, `linuxServerManager.ts`, `windowsServerManager.ts:53-59`). `AppConfig.get()` prefers `process.env` over the server's own `.env` (AF-004). The main server loads its production `.env` into `process.env`; agent terminals inherit it; an isolated instance started from an agent shell therefore inherits production paths/settings (P-3, BEH-003). Missing invariant: the `e2e` profile does not own its server environment.
- **Updater**: in `e2e` no `AppUpdater` exists, so `app-update:*` IPC handlers are absent; the renderer store's `getAppUpdateState()` rejects and shows an error toast (AF-007, BEH-004).
- **Launch tooling**: `autobyteus-web/scripts/electron-e2e/*` is a test harness owning one launch per runner lifetime (AF-001/002); it preserves `ELECTRON_RUN_AS_NODE`, breaking GUI launch from agent shells (P-1, BEH-002). No long-lived agent lifecycle exists.
- **Browser MCP** (`autobyteus-mcps/browser-automation`): one `BrowserApplication` behind CLI and MCP; every operation = ensure endpoint → connect over CDP → one operation → disconnect (AF-008); spawns its own Chrome when nothing listens; `run-script` ignores `async (arg) =>` (AF-009); artifacts via `ArtifactPolicy` (workspace-relative, `BROWSER_AUTOMATION_WORKSPACE`, overwrite explicit); per-user runtime dir `<tmp>/browser-automation-runtime-<uid>` (establishment gates) (AF-011).
- **Credentials**: encrypted vault per application DB; agents already run the unchanged `pnpm secrets:import` (P-9; DEC-002).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`
- Size rationale: Two repositories. Workspace: Electron main (server env policy, updater contract), renderer (update store/About), extracted shared launch mechanics, new lifecycle CLI (registry, detached process ownership, readiness), docs + skill. mcps: browser-automation attach-only, script normalizer, built-in presentation helper, and a new recording capability (two MCP tools + CLI commands, detached recorder worker, ffmpeg), docs/skill/tests. ~30 files.
- Architectural risk: `High`
- Risk rationale: security/privacy boundary (isolated server environment; QR-003); new operational contracts (lifecycle CLI JSON, instance registry, loopback control port — QR-002); cross-invocation process ownership in two tools (app process groups; recorder workers) with PID-reuse guards; shared IPC contract change (`AppUpdateStatus` + `disabled`); public MCP surface change (+2 tools) in a separately released repository; cross-repo delivery.
- Escalation triggers (return `Design Impact`): (a) any isolated-instance access to production data locations after the policy; (b) control port not loopback-only; (c) screencast not delivering frames on Linux or while the window is occluded despite the Chromium switches; (d) a server feature failing in isolated mode because a needed system variable is outside the allowlist; (e) Playwright CDP sessions over `connect_over_cdp` unable to run `Page.startScreencast` against Electron targets; (f) the helper's auto-install observably changing results of scripts that do not use it.

## Architecture Investigation Evidence

| Source / Probe | Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| P-1..P-3 | investigation-notes Runtime table | `ELECTRON_RUN_AS_NODE` breaks launch; production settings leak into isolated server | D-1 env policy; D-3 launch overlay drops `ELECTRON_RUN_AS_NODE` | — |
| AF-004 | `serverRuntimeEnv.ts`, managers, `app-config.ts:470-475,233-243` | env-over-file precedence; triplicated composition | D-1 single `buildServerProcessEnv` | — |
| AF-005 | Electron main env reads | No production data paths read by main | Policy scoped to server child | — |
| AF-007 | `electronApplication.ts:67`, `appUpdater.ts`, `preload.ts:77-82`, `appUpdateStore.ts:97-127`, `shared/appUpdateTypes.ts` | Missing handlers → rejected invoke → toast | D-2 `DisabledAppUpdater` + `disabled` | — |
| AF-001/002 | `scripts/electron-e2e/*` | Reusable env overlay, port selection, executable discovery, POSIX process-group control | D-3 extract to `scripts/electron-launch/` | — |
| P-2, P-4 | Probe | Installed app works; CDP main page target; browser-automation attaches | D-4 lifecycle; D-6 attach-only | Loopback binding asserted in validation |
| P-5 | Probe | In-page cursor/click via `run_script` works (with `async function`) | D-7 helper in MCP `run_script` | — |
| P-6 | Probe (Playwright `connect_over_cdp` + `new_cdp_session` + `Page.startScreencast`, Python) | MP4 produced from Electron window | D-8 recorder worker uses the same Playwright CDP path in Python | Linux; occlusion (MP-003) |
| AF-006, P-8, P-9 | secret_management.md; probes | Unchanged importer usable by agents | D-9 docs only; lifecycle reports `databaseUrl`; `restart` | — |
| AF-008/009/011 | `chrome_launcher.py:262-292`, `config.py`, `script.py`, `policy.py:81-201`, `application.py:322-360`, `cli.py`, `docs/mcp-to-cli-mapping.md` | Launch-on-absence; async gap; artifact policy; runtime dir; name mapping (`navigate_to`↔`navigate`) | D-6/D-7/D-8 | — |
| ARCH-REV-001 | `design-review-report.md` | DR-001..003; MP-001..003 | §Review Findings Resolution | — |

## Intended Change

1. **Isolated server environment policy (Electron):** `e2e` server child receives a system-baseline allowlist of the caller environment plus Electron-owned runtime values; `production` unchanged.
2. **Updates-disabled contract (Electron + renderer):** isolated launches register a disabled update controller answering `status:'disabled'`; renderer shows no update prompts/errors.
3. **Shared launch mechanics (scripts):** extract env overlay (now dropping `ELECTRON_RUN_AS_NODE`), port selection, executable resolution and POSIX process-group control into `autobyteus-web/scripts/electron-launch/`; the E2E harness and the lifecycle CLI consume it.
4. **Lifecycle CLI `pnpm isolated-app`** — instance lifecycle only: `start | list | stop | restart`, JSON on stdout, instance registry under the OS temp dir, fixed default control port 9333.
5. **Browser-automation (mcps):** (a) `BROWSER_AUTOMATION_ATTACH_ONLY`; (b) async-arrow normalization; (c) built-in presentation helper auto-installed by `run_script` when a script uses `__abDemo`; (d) recording: MCP `start_recording`/`stop_recording` + CLI `start-recording`/`stop-recording`, backed by a detached recorder worker. Existing tools keep connect–operate–disconnect.
6. **Docs & skills:** root guide `docs/isolated-app-instances.md`; README/packaging/secret-management updates; new `skills/autobyteus-isolated-app/SKILL.md` (lifecycle only, links to the browser skill); browser-automation `SKILL.md`/README document helper + recording.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Approved Trigger | Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-004, REQ-014; AC-001, AC-003, AC-013 | `pnpm isolated-app start/list/stop/restart` | AF-001/002, P-2, P-7 | New lifecycle; `e2e` contract preserved | DS-001, DS-002 |
| BEH-002 | Operational | REQ-003; AC-001 | Start from agent shell | P-1 | Launch overlay drops `ELECTRON_RUN_AS_NODE` | DS-001 |
| BEH-003 | Operational | REQ-002, REQ-015; AC-002, AC-014 | Any `e2e` launch; agent runs importer | P-3, AF-004, AF-006 | Server env policy; unchanged importer; `restart` | DS-003, DS-002 |
| BEH-004 | User | REQ-009; AC-008 | Isolated renderer start | AF-007 | Disabled update controller | DS-004 |
| BEH-005 | Operational | REQ-005, REQ-006, REQ-013; AC-004, AC-005, AC-012 | Browser MCP on fixed port; `run_script` with `__abDemo` | AF-008/009, P-4/P-5 | Attach-only; async fix; helper auto-install | DS-005 |
| BEH-006 | Operational | REQ-007, REQ-008; AC-006, AC-007 | `run_script` helper overlays; `start_recording`/`stop_recording` | P-5, P-6 | Helper overlays; recorder worker | DS-005, DS-006 |
| BEH-007 | Operational | REQ-013; AC-012 | `run-script` async arrow | AF-009 | Normalizer fix | DS-005 |
| BEH-008 | Operational | REQ-014; AC-013 | `start --build` / `--from-worktree` | AF-001 | Worktree build + discovery | DS-001 |
| BEH-009 | Operational | REQ-010, REQ-011; AC-009, AC-010 | Guide / skills | README | Root guide; per-tool skills | — (docs) |

REQ-012/AC-011 withdrawn (SR-009): package import happens through the instance UI.

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/probe-02-fake-cursor-click.png` | Overlay feasibility | REQ-007 | Basis for helper overlay approach | Evidence only |
| `evidence/probe-03-screencast-video-frame.png`, `evidence/screencast_probe.py` | Recording feasibility (Python Playwright CDP) | REQ-008 | Same mechanism used by the recorder worker | Evidence only |
| `design-review-report.md`, `architecture-review-revision-record.md` | ARCH-REV-001 | DR-001..003 | Resolved below | Reviewer-owned |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (feature + isolation bug fix)
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant` (e2e profile does not own server env; no updates-disabled contract) and `Duplicated Policy Or Coordination` (server env composition triplicated)
- Refactor needed now: `Yes`
- Evidence: P-3, AF-004, AF-007; manager env literals; launch mechanics private to `electronE2ELaunchPreparation.mjs`.
- Design response: single `buildServerProcessEnv(policy, …)`; `AppUpdateController` strategy; shared `scripts/electron-launch/`. Capability placement by responsibility: instance lifecycle → `isolated-app`; everything performed on a page (observe, act, capture — including the helper and recording) → browser-automation.
- Intentional deferrals: Windows lifecycle (DEC-004); the server env policy still applies to `e2e` on Windows.

## Terminology

- **Isolated instance**: AutoByteus desktop process launched with the `e2e` profile.
- **Control port**: loopback CDP port from `--remote-debugging-port` (default 9333).
- **Instance record**: lifecycle JSON file enabling later invocations to own an instance.
- **Presentation helper**: `window.__abDemo`, shipped inside browser-automation and installed by `run_script` on use.
- **Recorder worker**: detached browser-automation process that captures one tab to MP4.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- In scope: `buildServerRuntimeEnv` → `buildServerProcessEnv` (inline manager literals removed); harness copies of env overlay/ports/executable discovery/process-group control moved (not duplicated) to `electron-launch/`; README `env -u ELECTRON_RUN_AS_NODE` advice removed; `appUpdater?.` null-branching replaced by the controller interface.

## Persisted Data / State Transition Decision

- Stored subjects: production AutoByteus data (untouched); isolated data roots (disposable); lifecycle instance records (`<tmp>/autobyteus-isolated-app/`) and recorder state files (`<browser-automation runtime dir>/recordings/`) — ephemeral.
- Change: no existing store changes shape; `AppUpdateState.status` + `disabled` is in-memory IPC only.
- Decision: `Not Affected`.
- Rationale: No existing reader/writer changes; new ephemeral files are owned by their tools and invalid after reboot by construction (identity checks handle stale files).

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-001/002/008 | `pnpm isolated-app start` | Ready-instance JSON; record written | `InstanceLifecycle` | Entry |
| DS-002 | Primary | BEH-001/003 | `stop` / `restart` / `list` | Group gone, ports free, root disposition / restarted | `InstanceLifecycle` | Cross-invocation ownership |
| DS-003 | Primary | BEH-003 | Electron `e2e` bootstrap | Server child with policy env | `buildServerProcessEnv` via `ElectronApplication` | Isolation |
| DS-004 | Primary | BEH-004 | Renderer update plugin | Store `disabled`, nothing shown | `AppUpdateController` ↔ `appUpdateStore` | Clean UI |
| DS-005 | Primary | BEH-005/006/007 | MCP/CLI `run_script` | Script result (helper installed first when used) | `BrowserApplication.run_script` | Human-like actions |
| DS-006 | Primary | BEH-006 | MCP/CLI `start_recording` → … → `stop_recording` | MP4 artifact + result | `RecordingService` (browser-automation) + recorder worker | Video |
| DS-007 | Bounded Local | BEH-006 | Recorder frame loop | ffmpeg stdin | Recorder worker | Constant rate, bounded memory |

## Primary Execution Spine(s)

- DS-001: `Agent shell → pnpm isolated-app start → InstanceLifecycle.start → AppExecutable resolve (+ optional build) → LaunchPorts (control port must be free; free backend port) → DataRoot (auto temp or caller) → LaunchEnvironment overlay → detached Electron (e2e, --remote-debugging-port, occlusion switches) → Readiness (process alive, /rest/health, /json/list main page) → InstanceRegistry.write → JSON`
- DS-002: `Agent shell → pnpm isolated-app stop <id> → InstanceRegistry.read → ProcessIdentityGuard → (alive) ProcessGroupControl.closeAndConfirm | (gone) skip signals → DataRoot disposal (DEC-003) → port observation → InstanceRegistry.remove → JSON {wasRunning,…}`; restart = stop keeping root → start with recorded settings.
- DS-003: `main.ts → resolveElectronLaunchProfile(e2e) → ElectronApplication → ServerManagerFactory(launchConfig.environmentPolicy='isolated-baseline') → PlatformServerManager.launchServerProcess → buildServerProcessEnv → server child`
- DS-004: `ElectronApplication(updaterEnabled=false) → DisabledAppUpdater.initialize → preload getAppUpdateState → appUpdateStore.applyRemoteState('disabled') → AppUpdateNotice hidden / About neutral line`
- DS-005: `Agent → MCP run_script(tab, "__abDemo.click({text:'Create Agent'})") → BrowserApplication.run_script → normalize → session (ensure endpoint; attach-only honored) → resolve page → PresentationHelper.ensureInstalledIfUsed(page, script) → page.evaluate → strict-JSON result → disconnect`
- DS-006: `Agent → MCP start_recording(tab_id, output_file, fps?, overwrite?) → BrowserApplication.start_recording → ArtifactPolicy.resolve_output → RecordingService.start (ffmpeg check, no active recording for (endpoint, tab)) → spawn detached recorder worker (python -m browser_automation.recording.worker …) → worker: connect_over_cdp → resolve target → new_cdp_session → Page.startScreencast → ready file → start returns {recording_id, output, started_at}` … `stop_recording(tab_id) → RecordingService.stop → identity check → SIGTERM → worker finalizes (stop screencast, close ffmpeg stdin, await exit, commit temp→output, write status) → artifact metadata + duration/frames/end_reason`

## Spine Narratives (Mandatory)

| Spine | Narrative | Main Subjects | Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Start resolves the app (installed default on macOS, `--app`, or worktree build optionally built first), requires the control port free, picks a backend port and data root, spawns the app detached as its own process group with the isolated launch environment plus `--remote-debugging-port=<port> --disable-backgrounding-occluded-windows --disable-renderer-backgrounding`, waits for readiness, writes the record, prints JSON. Any failure tears down what it created. | Instance, executable, data root, control port | `InstanceLifecycle` | executable resolution, port planning, env overlay, readiness, registry, logs |
| DS-002 | Later invocations load the record, verify identity before any signal, close and confirm the group (or skip when the user already quit the app), dispose the owned root unless kept (caller roots never deleted), observe ports, remove the record. Restart keeps the root and relaunches with the same settings (used after key import). | Record, process group | `InstanceLifecycle` | identity guard, process-group control |
| DS-003 | In `e2e`, the server env = allowlisted caller variables + Electron-owned values; the isolated root's `.env` becomes authoritative for AutoByteus settings. `production` inherits the caller env exactly as today. | Server env | `buildServerProcessEnv` | allowlist constant |
| DS-004 | Electron always registers update IPC through one controller; the disabled controller answers `disabled` and rejects actions explicitly; the store stays quiet. | Update state | `AppUpdateController` | visibility rule |
| DS-005 | `run_script` keeps connect–operate–disconnect. If the raw script text references `__abDemo` and the page lacks the current helper version, one idempotent install evaluation runs first in the same session; then the script runs as today. Scripts that do not mention `__abDemo` run exactly as before. | Page action | `BrowserApplication` | presentation helper |
| DS-006 | Recording is the only long-lived browser-automation activity, and it lives in its own worker process, so the MCP/CLI calls stay short and every other tool is unchanged. The worker holds its own CDP connection, writes constant-rate frames to ffmpeg, finalizes on SIGTERM or target loss, and records status; `stop_recording` reports the committed artifact. | Recording | `RecordingService` + worker | ffmpeg invocation, recording state files, identity guard |

## Spine Actors / Main-Line Nodes

Workspace: `isolated-app` CLI; `InstanceLifecycle`; `InstanceRegistry`; Electron app (e2e); platform managers + `buildServerProcessEnv`; `AppUpdateController`. mcps: `BrowserApplication`; `ChromeLauncher`; `PresentationHelper`; `RecordingService`; recorder worker.

## Ownership Map

- `cli.mjs` (workspace) — thin: args → lifecycle; one JSON value; exit codes.
- `InstanceLifecycle` — start/stop/restart/list sequencing, rollback, root disposition.
- `InstanceRegistry` — record paths, atomic write/read/remove, id generation, default-id resolution (only when exactly one record).
- `instanceProcess` — detached spawn, log redirection, `ProcessIdentityGuard`, readiness loop.
- `buildServerProcessEnv` — server child env for both policies.
- `AppUpdateController` impls — update IPC.
- `BrowserApplication` (mcps) — unchanged owner of every tool; gains `start_recording`/`stop_recording` entry methods delegating to `RecordingService`, and calls `PresentationHelper` inside `run_script`.
- `ChromeLauncher` — attach-vs-launch decision (honors attach-only).
- `PresentationHelper` (`presentation/helper.py` + `demo_helper.js`) — helper source, version, "used by script?" rule, idempotent install.
- `RecordingService` (`recording/service.py`) — recording state (per endpoint + tab), ffmpeg resolution, worker spawn/stop/identity, status reading, artifact finalization reporting.
- Recorder worker (`recording/worker.py`) — CDP screencast session, frame loop, ffmpeg process, status file.

## Thin Entry Facades / Public Wrappers

| Facade | Owner Behind It | Why | Must Not Own |
| --- | --- | --- | --- |
| root `package.json` `isolated-app` | `cli.mjs` | Stable command | Logic |
| `cli.mjs` | `InstanceLifecycle` | Parse/print | Process control, registry I/O |
| MCP tools `start_recording`, `stop_recording` (`mcp/tools/*.py`) | `BrowserApplication` → `RecordingService` | MCP surface | Worker management |
| CLI `start-recording`, `stop-recording` (`cli.py`) | same | CLI surface (argument-isomorphic) | Same |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `buildServerRuntimeEnv` + inline env literals (3 managers) | Triplicated policy | `buildServerProcessEnv` | In This Change |
| `scripts/electron-e2e/electronE2EEnvironment.mjs` | Shared | `electron-launch/launchEnvironment.mjs` | In This Change |
| `scripts/electron-e2e/ownedElectronProcessTree.mjs`, `windowsOwnedProcessTree.mjs` | Shared | `electron-launch/processGroupControl.mjs`, `windowsProcessTree.mjs` | In This Change |
| Private port/executable helpers in `electronE2ELaunchPreparation.mjs` | Shared | `electron-launch/launchPorts.mjs`, `appExecutable.mjs` | In This Change |
| README `env -u ELECTRON_RUN_AS_NODE` advice | Overlay handles it | — | In This Change |
| `this.appUpdater?.…` branches | Controller interface | `AppUpdateController` | In This Change |
| SR-007 design elements: lifecycle `helper`, `import-package`, `record` subcommands, `isolated-app/cdp/`, `isolated-app/recording/`, `isolated-app/presentation/` | Moved/withdrawn (SR-009) | browser-automation helper + recording; UI import | Never implemented (design-only removal) |

## Return Or Event Spine(s)

- Recorder completion: `worker (SIGTERM | target closed | CDP disconnect) → Page.stopScreencast (if possible) → ffmpeg stdin close → ffmpeg exit → commit temp→output via ArtifactPolicy rules → status.json {state: completed|failed, end_reason: stopped|target_closed|error, output, duration_seconds, frames, error?} → RecordingService.stop reads it → result`.

## Bounded Local / Internal Spines

- **DS-007 frame loop** (worker): `screencastFrame → ack → latest = jpeg bytes` ∥ `every 1/fps s: if latest: write to ffmpeg stdin (await drain; drop tick while draining)`. Constant timing through idle periods; memory bounded to one frame.
- **Readiness loop** (lifecycle start): 250 ms polls up to 120 s: process alive → `/rest/health` 200 → `/json/list` has a `page` whose URL contains `/renderer/index.html`.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves | Responsibility | Risk If Misplaced |
| --- | --- | --- | --- | --- |
| Launch environment overlay | DS-001 + harness | lifecycle, harness | caller env − `ELECTRON_RUN_AS_NODE` + 3 profile vars | Divergent envs |
| Port planning / executable resolution / process-group control | DS-001/002 + harness | lifecycle, harness | shared mechanics | Duplication |
| Baseline env allowlist | DS-003 | `buildServerProcessEnv` | one security list | Leaks |
| Helper source + version | DS-005 | `BrowserApplication.run_script` | install rule | Unwanted page mutation |
| ffmpeg resolution | DS-006 | `RecordingService` | `BROWSER_AUTOMATION_FFMPEG_BIN` or `ffmpeg` on PATH | Late failures |
| Recording state files | DS-006 | `RecordingService` | `<runtime dir>/recordings/<port>-<tab_id>.json` (0600), status files | Orphans |

## Ownership Boundaries

- The launch profile decides isolation; `ElectronApplication` maps it to `environmentPolicy`; managers never decide policy.
- The lifecycle CLI owns only instances; it knows nothing about pages, helpers or recordings. Stopping an instance ends its target; any recording on it finalizes itself (`end_reason: target_closed`).
- browser-automation owns everything done on a page; it knows nothing about AutoByteus instances beyond its configured port.
- The importer remains the only credential path; the lifecycle only reports `databaseUrl` and offers `restart`.

## Boundary Encapsulation Map

| Boundary | Internal Mechanisms | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `InstanceLifecycle` | registry, identity guard, process-group control, readiness | `cli.mjs` | CLI signalling processes or editing records | Add lifecycle method |
| `BrowserApplication` | runtime session, helper, recording service, artifact policy | MCP tools, CLI | Tools calling `RecordingService`/worker directly | Add application method |
| `RecordingService` | worker spawn, state/status files, identity guard | `BrowserApplication` | Anything signalling worker PIDs directly | Extend service |
| `buildServerProcessEnv` | allowlist | managers | Spreading `process.env` in managers | Extend input |
| `AppUpdateController` | IPC registration | `ElectronApplication` | Renderer profile sniffing | Extend state |

## Dependency Rules

- `scripts/isolated-app/*` → `scripts/electron-launch/*` only (plus Node built-ins); never `scripts/electron-e2e/*`.
- `scripts/electron-e2e/*` → may import `scripts/electron-launch/*`; never `scripts/isolated-app/*`.
- Lifecycle has no CDP client: readiness uses plain `fetch` of `/json/list`.
- Electron: `ElectronApplication` → `ServerManagerFactory` → managers → `buildServerProcessEnv`; renderer never reads the launch profile.
- browser-automation: MCP tools/CLI → `BrowserApplication` → (`BrowserRuntime`, `PresentationHelper`, `RecordingService`, `ArtifactPolicy`); `RecordingService` → worker via process spawn only; worker → Playwright CDP + ffmpeg. Existing tool code paths do not depend on `RecordingService`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity | Notes |
| --- | --- | --- | --- | --- |
| `pnpm isolated-app start [--app <path>] [--from-worktree] [--build] [--control-port <n>=9333] [--server-port <n>] [--data-root <path>] [--keep]` | Instance | Create + ready | new `instanceId` (`iso-<controlPort>-<4 hex>`) | `--app` vs `--from-worktree`/`--build` exclusive; Linux: no installed default → `APP_NOT_FOUND` unless `--app`/`--from-worktree`; relative `--data-root`/`--app` resolve against `INIT_CWD` (else rejected) |
| `pnpm isolated-app list` | Instances | Records + liveness | — | `running:false` for dead-process records |
| `pnpm isolated-app stop [<id>] [--keep]` | Instance | Tear down | `instanceId`; default only if exactly one record | Dead-process branch: no signals, disposal per DEC-003, record removed, `wasRunning:false`; unknown id → `INSTANCE_NOT_FOUND` |
| `pnpm isolated-app restart [<id>]` | Instance | Stop keeping root, start same settings | `instanceId` | Returns start result |
| Lifecycle output | — | `{schemaVersion:1, ok, command, result \| error:{code,message}}` | — | Exit 0 ok / 2 usage (incl. `APPIMAGE_EXTRACTION_REQUIRED`) / 3 environment (`CONTROL_PORT_IN_USE`, `APP_NOT_FOUND`, `APP_ISOLATION_UNSUPPORTED`, build failure) / 4 `INSTANCE_NOT_FOUND` / 5 operation failure (`READINESS_TIMEOUT`, `STOP_UNCONFIRMED`) |
| Start result | — | `{instanceId, pid, executablePath, backendUrl, graphqlUrl, controlEndpoint, controlPort, serverPort, dataRoot, ownsDataRoot, keepDataRoot, databaseUrl, logPath}` | — | `databaseUrl = "file:" + realpath(dataRoot) + "/server-data/db/production.db"` |
| `buildServerProcessEnv({policy, callerEnv, loginShellPath, port, appDataDir, publicServerUrl, runtimeOverrides})` | Server env | Compose | `policy: 'inherit-caller' \| 'isolated-baseline'` | Replaces `buildServerRuntimeEnv` |
| `AppUpdateController { initialize(): void; startAutoCheck(): void }` + `AppUpdateStatus 'disabled'` | Update | IPC + state | — | Store: `shouldShow=false`, no toast, actions no-op |
| MCP `start_recording(tab_id: str, output_file: str, fps: int = 25, overwrite: bool = False)` / CLI `start-recording --tab-id --output-file [--fps] [--overwrite]` | Recording of one tab | Start worker | `tab_id` (browser target id) on the configured endpoint | Result `{tab_id, output_file (resolved), fps, started_at}`; errors `RECORDING_ALREADY_ACTIVE`, `RECORDING_DEPENDENCY_MISSING` (ffmpeg, exit 3), `TAB_NOT_FOUND`, `ARTIFACT_EXISTS`, `ARTIFACT_PATH_REJECTED`, `BROWSER_UNAVAILABLE` |
| MCP `stop_recording(tab_id: str)` / CLI `stop-recording --tab-id` | Recording | Finalize/report | `tab_id` | Result `{tab_id, artifact:{path, media_type:'video/mp4', bytes_written}, duration_seconds, frames, end_reason}`; errors `RECORDING_NOT_ACTIVE` (exit 4), `RECORDING_FAILED` (exit 5, with preserved partial path when available) |
| `run_script` (unchanged signature) | Page script | + helper auto-install when raw script contains `__abDemo` | `tab_id` | Result contract unchanged |
| `window.__abDemo` | Page actions | helper API | Target `{text}` \| `{selector}` (+ `nth`) — bare strings rejected | `{ok,…}` / `{ok:false,error:{code:NOT_FOUND\|AMBIGUOUS\|OBSCURED\|TIMEOUT\|NOT_EDITABLE\|INVALID_TARGET,message}}` |
| `BROWSER_AUTOMATION_ATTACH_ONLY` (`1/true/yes`) | Config | Never launch Chrome | — | `BROWSER_UNAVAILABLE`, exit 3, message names endpoint + attach-only |

## Interface Boundary Check

| Interface | Singular | Identity Explicit | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| lifecycle subcommands | Yes | Yes | Low | error lists ids when >1 |
| recording tools | Yes | Yes (`tab_id` on configured endpoint) | Low | state keyed by (port, tab_id) |
| helper target | Yes | Yes | Low | bare strings rejected |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Drift | Action |
| --- | --- | --- | --- | --- |
| Lifecycle CLI | `isolated-app` | Yes | Low | — |
| Recording tools | `start_recording` / `stop_recording` (`start-recording` / `stop-recording`) | Yes | Low | mapping doc rule 2 |
| Helper global | `__abDemo` | Yes | Low | — |
| Env policy | `inherit-caller` / `isolated-baseline` | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Isolation | `e2e` launch profile | Reuse + Extend | Contract exists |
| Process-group lifecycle | `electron-e2e` controllers | Extend (move to shared) | Proven |
| Credentials | `pnpm secrets:import` | Reuse unchanged | Established practice |
| Package import | Instance UI | Reuse | REQ-012 withdrawn |
| Page control | browser-automation | Extend | Owner of page actions |
| Output paths | browser-automation `ArtifactPolicy` | Reuse | Resolves DR-002 by the existing workspace rule |
| Runtime state dir | browser-automation runtime dir | Reuse | Per-user, already used for gates |
| Recording | none | Create New in browser-automation | Page capture belongs there |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spines | Decision |
| --- | --- | --- | --- |
| `autobyteus-web/electron/server` | env policy | DS-003 | Extend |
| `autobyteus-web/electron/updater`, `application` | update controller | DS-004 | Extend |
| `autobyteus-web/{stores,components/settings,shared,localization}` | disabled UX | DS-004 | Extend |
| `autobyteus-web/scripts/electron-launch` | shared launch mechanics | DS-001/002 | Create (extracted) |
| `autobyteus-web/scripts/isolated-app` | instance lifecycle | DS-001/002 | Create |
| `autobyteus-web/scripts/electron-e2e` | harness | — | Modify imports |
| `browser-automation/src/browser_automation/{runtime,script.py}` | attach-only, async | DS-005 | Extend |
| `browser-automation/src/browser_automation/presentation` | helper | DS-005 | Create |
| `browser-automation/src/browser_automation/recording` | recording | DS-006/007 | Create |
| docs + skills | guidance | — | Create/Modify |

## Final File Responsibility Mapping

Workspace repo (`/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording`):

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | Modify | `buildServerProcessEnv` + `ISOLATED_SERVER_BASELINE_ENV_NAMES` |
| `autobyteus-web/electron/server/embeddedServerLaunchConfig.ts` | Modify | `environmentPolicy` |
| `autobyteus-web/electron/server/{macOS,linux,windows}ServerManager.ts` | Modify | use `buildServerProcessEnv` |
| `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | Modify | both policies; production parity snapshot |
| `autobyteus-web/electron/application/electronApplication.ts` | Modify | profile → policy; `AppUpdateController` |
| `autobyteus-web/electron/updater/appUpdateController.ts` | Add | interface |
| `autobyteus-web/electron/updater/disabledAppUpdater.ts` | Add | disabled IPC |
| `autobyteus-web/electron/updater/appUpdater.ts` | Modify | implements interface |
| `autobyteus-web/shared/appUpdateTypes.ts` | Modify | `'disabled'` |
| `autobyteus-web/stores/appUpdateStore.ts` | Modify | quiet `disabled` |
| `autobyteus-web/components/settings/AboutSettingsManager.vue` | Modify | neutral line; hide controls |
| `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts` | Modify | message key |
| `autobyteus-web/scripts/electron-launch/launchEnvironment.mjs` | Add (moved) | overlay (drops `ELECTRON_RUN_AS_NODE`) |
| `autobyteus-web/scripts/electron-launch/launchPorts.mjs` | Add (moved) | port selection/assertion |
| `autobyteus-web/scripts/electron-launch/appExecutable.mjs` | Add (moved+extended) | worktree discovery; `.app`/installed resolution; `readIsolatedLaunchContract` (SR-011) |
| `autobyteus-web/build/isolated-launch/isolated-launch.json` | Add (SR-011) | `{"isolatedLaunchContract": 1}` capability marker |
| `autobyteus-web/build/scripts/build.ts` | Modify (SR-011) | `extraResources` entry shipping the marker |
| `autobyteus-web/scripts/electron-launch/processGroupControl.mjs` | Add (moved+extended) | close/confirm controller; `createPosixProcessGroupController(pgid)` |
| `autobyteus-web/scripts/electron-launch/windowsProcessTree.mjs` | Move | unchanged |
| `autobyteus-web/scripts/electron-launch/__tests__/*` | Add/Move | moved harness tests + new |
| `autobyteus-web/scripts/electron-e2e/*` | Modify | import shared modules |
| `autobyteus-web/scripts/isolated-app/cli.mjs` | Add | facade |
| `autobyteus-web/scripts/isolated-app/instanceLifecycle.mjs` | Add | lifecycle |
| `autobyteus-web/scripts/isolated-app/instanceRegistry.mjs` | Add | registry |
| `autobyteus-web/scripts/isolated-app/instanceProcess.mjs` | Add | spawn, identity guard, readiness |
| `autobyteus-web/scripts/isolated-app/__tests__/*` | Add | registry, args, lifecycle branches (dead-process stop), readiness |
| root `package.json` | Modify | `"isolated-app": "node autobyteus-web/scripts/isolated-app/cli.mjs"` |
| `docs/isolated-app-instances.md` | Add | root guide |
| `README.md` | Modify | link guide; remove `env -u` advice |
| `autobyteus-web/docs/electron_packaging.md` | Modify | env policy; updates disabled; control port |
| `autobyteus-server-ts/docs/modules/secret_management.md` | Modify | agents may run the importer explicitly; still never an automatic fallback |
| `skills/autobyteus-isolated-app/SKILL.md` | Add | lifecycle skill; links browser-automation skill |

mcps repo (`/Users/normy/autobyteus_org/autobyteus_mcps/browser-automation`):

| File | Change | Concern |
| --- | --- | --- |
| `src/browser_automation/runtime/config.py` | Modify | `attach_only` |
| `src/browser_automation/runtime/chrome_launcher.py` | Modify | attach-only branch |
| `src/browser_automation/script.py` | Modify | async arrows |
| `src/browser_automation/presentation/__init__.py`, `helper.py` | Add | helper source load (package resource), version, `script_uses_helper`, `ensure_installed(page)` |
| `src/browser_automation/presentation/demo_helper.js` | Add | `window.__abDemo` |
| `src/browser_automation/recording/__init__.py`, `service.py` | Add | `RecordingService` |
| `src/browser_automation/recording/worker.py` | Add | recorder worker (`python -m browser_automation.recording.worker`) |
| `src/browser_automation/recording/ffmpeg.py` | Add | ffmpeg resolution + argument construction |
| `src/browser_automation/application.py` | Modify | helper call in `run_script`; `start_recording`/`stop_recording` |
| `src/browser_automation/contracts.py`, `errors.py` | Modify | result types; recording error codes |
| `src/browser_automation/mcp/tools/start_recording.py`, `stop_recording.py`, `mcp/tools/__init__.py` | Add/Modify | tool registration |
| `src/browser_automation/cli.py` | Modify | `start-recording`, `stop-recording` |
| `pyproject.toml` | Modify | package data `presentation/*.js` |
| `tests/…` | Add | normalizer, attach-only, helper install rule (+ page evaluate order), recording service (state, identity, errors), worker frame loop, CLI/MCP mapping |
| `README.md`, `SKILL.md`, repo `README.md` table | Modify | attach-only, helper API, recording |

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Must Not Become |
| --- | --- | --- | --- |
| Launch overlay, ports, executable, process-group | `electron-launch/*` | shared launch | Server env policy; instance registry |
| Identity guard (pid + command marker) | lifecycle `instanceProcess.mjs`; mcps `recording/service.py` | each tool | Cross-repo shared code (separate runtimes; same rule documented) |

## Shared Structure / Data Model Tightness Check

| Structure | Tight | Notes |
| --- | --- | --- |
| Instance record `{schemaVersion, id, pid, executablePath, args, controlPort, serverPort, dataRoot, ownsDataRoot, keepDataRoot, logPath, startedAt}` | Yes | `pid` = process-group id; URLs derived |
| Recording state `{schema_version, endpoint_port, tab_id, worker_pid, worker_marker, output_file, temp_file, status_file, fps, started_at}` | Yes | one file per (port, tab) |
| Recording status `{state, end_reason, output_file, duration_seconds, frames, error}` | Yes | written atomically by worker |

## Applied Patterns

Registry (lifecycle records; recording state), Worker loop (recorder), Strategy (`AppUpdateController`).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner | Responsibility | Must Not Contain |
| --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/electron-launch/` | Folder | shared launch | mechanics | registries, harness assertions |
| `autobyteus-web/scripts/isolated-app/` | Folder | lifecycle | instance lifecycle | page control, recording |
| `skills/autobyteus-isolated-app/` | Folder | skill | lifecycle instructions | code |
| `docs/isolated-app-instances.md` | File | guide | end-to-end guide | — |
| `browser_automation/presentation/` | Folder | helper | helper + install rule | recording |
| `browser_automation/recording/` | Folder | recording | service, worker, ffmpeg | page actions |

## Folder Boundary Check

| Path | Depth | Clear | Risk | Justification |
| --- | --- | --- | --- | --- |
| `scripts/electron-launch` | Off-spine | Yes | Low | pure mechanics |
| `scripts/isolated-app` | Main-line | Yes | Low | four files, flat is clearer |
| `browser_automation/recording` | Mixed justified | Yes | Low | service + its worker process |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Action | `run_script(tab, "__abDemo.click({text:'Create Agent'})")` → `{"ok":true,"action":"click","target":{"text":"Create Agent"}}` | A `click` MCP tool | DEC-006 |
| Helper API | `__abDemo.type({selector:'#agent-name'},'My Agent',{delayMs:60})`, `press('Enter')`, `press('k',{meta:true})`, `hover({text:'Skills'})`, `scroll({selector:'main'},{y:600})`, `select({selector:'#runtime'},{label:'Codex'})`, `waitFor({text:'Saved'},{timeoutMs:10000})`, `caption('Create your first agent',{position:'bottom'})`, `hideCaption()`, `highlight({text:'Run'})`, `setPresentation(false)`, `status()` | `__abDemo.click('Create Agent')` | Explicit identity |
| Helper install rule | raw script contains `__abDemo` → evaluate helper IIFE (installs if `window.__abDemo?.version !== V`) → evaluate script, same session | Installing on every `run_script`/navigation | Untouched pages for non-users |
| Text targeting | candidates = rendered, enabled elements whose trimmed text/`aria-label`/`value` equals the text; prefer interactive roles; **actionable = hit-testable**: after scrolling into view, `document.elementFromPoint(center)` returns the element or a descendant — elements covered by an in-page popup/modal or its backdrop are excluded (like a human, only the topmost control counts); 0 actionable with ≥1 covered → `OBSCURED` (report the covering element's tag/text); 0 → `NOT_FOUND`; >1 actionable without `nth` → `AMBIGUOUS` with candidates. `selector` targets apply the same hit-test before acting | fuzzy first match; clicking controls hidden behind a modal | Deterministic; correct behavior with app/site popups |
| Typing | focus → per char: native value setter + `input` (paced) → `change` | `.value =` only | Vue v-model |
| Recording | `start_recording(tab, "tutorial.mp4")` → … → `stop_recording(tab)` → `{"artifact":{"path":"/…/workspace/tutorial.mp4",…},"duration_seconds":42.1,"frames":1052,"end_reason":"stopped"}` | Recording in lifecycle | Boundary |
| ffmpeg | `-y -f image2pipe -framerate <fps> -c:v mjpeg -i - -vf "scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset veryfast -pix_fmt yuv420p -movflags +faststart <temp>.mp4`; W×H = first frame rounded to even | — | — |
| Agent end-to-end | `pnpm --dir <repo> isolated-app start` → MCP (`CHROME_REMOTE_DEBUGGING_PORT=9333`, `BROWSER_AUTOMATION_ATTACH_ONLY=1`) `list_tabs`/`attach_tab` → `start_recording` → `run_script` helper actions/captions → `stop_recording` → `pnpm --dir <repo> isolated-app stop` | — | — |
| Keys | `script -q /dev/null pnpm --dir <repo> secrets:import -- --source <keys file> --database-url <databaseUrl>` (Linux: `script -qc "<cmd>" /dev/null`), answer `IMPORT`; then `pnpm --dir <repo> isolated-app restart` | Lifecycle importing keys | Contract |
| Server env | isolated: `{…pick(callerEnv, BASELINE), PATH: loginShellPath ?? callerEnv.PATH, ELECTRON_RUN_AS_NODE:'1', PORT, SERVER_PORT, DATABASE_URL, DB_TYPE:'sqlite', AUTOBYTEUS_DATA_DIR, AUTOBYTEUS_SERVER_HOST, …runtimeOverrides}` | `{...process.env}` in e2e | Isolation |

Baseline allowlist (`ISOLATED_SERVER_BASELINE_ENV_NAMES`): `HOME, USER, LOGNAME, SHELL, PATH, LANG, LANGUAGE, TZ, TMPDIR, TEMP, TMP, TERM, COLORTERM, SSH_AUTH_SOCK, HTTP_PROXY, HTTPS_PROXY, NO_PROXY, http_proxy, https_proxy, no_proxy, ALL_PROXY, all_proxy, NODE_EXTRA_CA_CERTS, SSL_CERT_FILE, SSL_CERT_DIR, XDG_RUNTIME_DIR, XDG_CONFIG_HOME, XDG_CACHE_HOME, XDG_DATA_HOME, DISPLAY, WAYLAND_DISPLAY, DBUS_SESSION_BUS_ADDRESS, CODEX_HOME, SystemRoot, SYSTEMROOT, windir, ComSpec, PATHEXT, USERPROFILE, APPDATA, LOCALAPPDATA, ProgramData, ProgramFiles` + every `LC_*`.

## Implementation Design Impact Resolution (IMP-DI-001, SR-011)

- Finding: the isolation (server env policy, disabled updater) lives in the desktop app; `start` defaults to the installed app, and installed/released builds that predate this change (1.4.91-beta.4 installed; beta.5 on origin/personal) still leak production settings and show the update toast when launched from an agent shell. Protects REQ-002, QR-003, AC-001/AC-002; escalation trigger (a).
- Decision: **fail closed on an isolated-launch capability marker** (option B). Rejected: A (docs-only leaves the default path violating a Must requirement), C (duplicates the allowlist in the launcher, changes Electron-main inputs, still shows the toast on old apps).
- Marker (owner: desktop build): committed file `autobyteus-web/build/isolated-launch/isolated-launch.json` = `{"isolatedLaunchContract": 1}`, shipped via electron-builder `extraResources` to `<resources>/isolated-launch.json` (macOS `<App>.app/Contents/Resources/`, Linux `<unpacked>/resources/`). The integer states the contract the build honors (`e2e` server env policy + updates-disabled state); bump only when that contract changes incompatibly. No version-number rules.
- Gate (owner: lifecycle start, via shared `electron-launch/appExecutable.mjs` → `readIsolatedLaunchContract(executablePath)` resolving the resources dir from the executable): before any port/data-root work or spawn, missing/unreadable/invalid marker or contract `< 1` → `APP_ISOLATION_UNSUPPORTED` (exit 3) naming the app path and pointing to `--from-worktree`/`--build` or updating the installed app. `restart` re-checks. The packaged E2E harness is unchanged (it launches current-worktree builds).
- **Linux AppImage branch (ARCH-DR-005, SR-012):** Linux releases ship only as a packed `AppImage`, whose resources live inside the image, so the marker cannot be read beside the executable. Decision (option b): before the marker lookup, `resolveAppExecutable` detects a packed AppImage — the AppImage type-2 magic (`0x41 0x49 0x02` at byte offset 8 of the ELF file) or a `.AppImage` suffix — and fails with `APPIMAGE_EXTRACTION_REQUIRED` (exit 2, usage) without executing the file. The message gives the exact recovery: run `<file>.AppImage --appimage-extract` in a chosen directory, then `start --app <that dir>/squashfs-root/<AutoByteus executable>` (e.g. `squashfs-root/autobyteus`), or use `--from-worktree`/`--build`. The extracted executable is an explicitly given executable (REQ-001) with `resources/isolated-launch.json` beside it, so the normal gate applies (build config must place the marker in the AppImage's `resources/`, same `extraResources` entry). `APP_ISOLATION_UNSUPPORTED` advice ("update the app") therefore always applies to a lookup that can actually succeed. Rejected option (a) (read the marker via the AppImage runtime's extract/mount): it executes the app's runtime merely to probe, and cannot be validated on the macOS validation host. Tests: packed-AppImage detection by magic and by suffix (no execution), extracted layout passes/fails on marker presence; guide + troubleshooting entry for `APPIMAGE_EXTRACTION_REQUIRED`.
- Scope note for REQ-002: an app binary cannot be isolated retroactively; REQ-002's "however it is launched" is enforced by the app for builds that carry the contract, and the lifecycle refuses builds that do not. Manual launches of old binaries are outside what the product can control — documented in the guide.
- Docs: guide/skill prerequisites become "an AutoByteus build with isolated-launch support (the first release after this change, or `--from-worktree`/`--build`)"; troubleshooting entry for `APP_ISOLATION_UNSUPPORTED`; remove the "installed app ≥1.4.53" isolation claim.
- Tests: marker present in packaged output (build config test); gate unit tests (missing, malformed, lower contract, valid); executable validation: installed beta.4 → `APP_ISOLATION_UNSUPPORTED`, worktree build → starts.

## Review Findings Resolution (ARCH-REV-001)

| Finding | Resolution | Where |
| --- | --- | --- |
| ARCH-DR-001 helper loading channel | Requirement re-approved (SR-009): helper is a built-in browser-MCP capability auto-installed by `run_script` on use; no lifecycle loading; no skill copy | REQ-006/AC-005; DS-005; mcps `presentation/` |
| ARCH-DR-002 output path | Recording moved to browser-automation → existing `ArtifactPolicy` (workspace-relative to `BROWSER_AUTOMATION_WORKSPACE`/caller workspace; overwrite explicit). Lifecycle relative `--data-root`/`--app` resolve against `INIT_CWD` | Interface table |
| ARCH-DR-003 dead-process stop | Defined branch; AC-003 alternate re-approved | Interface table; DS-002 |
| MP-003 occlusion | `start` passes `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`; validation covers occluded window; trigger (c) | DS-001 |
| Recorder identity | worker pid + command marker verified before signalling | `recording/service.py` |
| Node WebSocket→CDP | Removed (no Node CDP client; worker uses Python Playwright CDP as probed in P-6) | — |
| Linux default app | `APP_NOT_FOUND` unless `--app`/`--from-worktree` | Interface table |
| `databaseUrl` format | `file:` + realpath absolute | Interface table |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Keep `buildServerRuntimeEnv` alongside | Rejected | `buildServerProcessEnv` |
| Denylist env filtering | Rejected | Allowlist |
| Harness keeps private copies | Rejected | `electron-launch/` |
| Renderer detects isolation by URL | Rejected | `disabled` status |
| Make existing MCP tools long-lived/stateful | Rejected (user: must not break how it works) | Separate recorder worker |
| Lifecycle helper/recording/import | Rejected (SR-009) | browser-automation; UI import |
| Lifecycle auto-imports keys / templates | Rejected (DEC-002) | Unchanged importer |

## Change / Refactor Sequence

Workspace:
1. `buildServerProcessEnv` + `environmentPolicy` + managers + tests (production parity snapshot; isolated excludes `AUTOBYTEUS_MEMORY_DIR` etc.).
2. Update controller, `disabled` status, store/About/localization + tests.
3. Move shared mechanics to `electron-launch/`; harness imports; harness tests green.
4. Lifecycle CLI (registry, process, lifecycle, root script) + tests.
5. Docs: root guide, README, packaging, secret-management; skill.

mcps (branch from refreshed `origin/main`):
6. Attach-only + async normalization + tests.
7. Presentation helper + install rule in `run_script` + tests.
8. Recording service/worker/ffmpeg + MCP tools + CLI commands + tests.
9. README/SKILL/repo table.

Validation: build macOS app from the worktree and run AC-001..AC-010, AC-012..AC-014 end-to-end (installed app and worktree build), including occluded-window recording and loopback check.

## Key Tradeoffs

- Allowlist vs denylist (safer; risk of a missing system var → trigger d).
- Recorder as a separate worker inside browser-automation: capture stays with page ownership; existing tools unchanged; costs one background process role and an ffmpeg dependency in browser-automation.
- Helper auto-install keyed on script text: zero loading steps and survives reloads; pages whose scripts never use it are untouched.
- Window-content capture (CDP): clean, permission-free; native dialogs and in-app browser views (separate webContents) not captured → documented; ffmpeg full-screen recipe (DEC-005).

## Risks

- R-001 control port = full local control → loopback only; isolated instances only; documented.
- R-002 native dialogs / in-app browser views not recorded → documented.
- R-003 Linux display requirement → documented.
- R-004 cross-repo delivery → separate mcps branch/PR.
- R-005 PID reuse → identity guards in both tools.
- R-006 script-dispatched events limits → programmatic values; documented.
- R-007 missing allowlisted variable → trigger (d).
- R-008 occlusion → Chromium switches; validation.

## Guidance For Implementation

- `production` env must be identical to today's composition (snapshot test).
- Lifecycle creates/deletes only its registry dir, auto roots (`<tmp>/autobyteus-isolated-*`), and never caller roots.
- Detached spawn: `pid` = process-group id; output to `<registry>/<id>.log`; `unref()`.
- `CONTROL_PORT_IN_USE` before spawn, naming the owning instance id when known.
- Readiness failure: close group, remove owned root and record, include last 40 log lines.
- Helper: idempotent install guarded by version; overlays under `#__ab-demo-root` (`pointer-events:none`, max z-index); click indicators auto-remove; `status()` → `{installed, version, presentation}`.
- `run_script`: helper install and script evaluation in the same session; install failure → `SCRIPT_FAILED` with detail `presentation_helper_install_failed`.
- Recording worker: spawned with `start_new_session=True`, stdout/stderr to a log in the recordings dir; writes a ready marker before `start_recording` returns (timeout 20 s → `RECORDING_FAILED`); output written to an `ArtifactPolicy` temporary sibling and committed on success; partial output kept and reported on failure.
- Recorder worker constraints (ARCH-REV-002 residuals): spawn with the MCP/CLI's own interpreter (`sys.executable -m browser_automation.recording.worker`); connect directly with `connect_over_cdp` to the configured endpoint and **never** go through `ChromeLauncher` (never launches a browser); use the page only to open one CDP session for `Page.startScreencast`; register a no-op `dialog` listener on the page so Playwright never auto-dismisses `alert`/`confirm` raised during recording (MP-005, validate); validate concurrent MCP calls while a screencast is active.
- A recording whose agent run was cancelled keeps running until `stop_recording` or until its tab/app closes (MP-004) — documented in the browser SKILL.md.
- `restart` preserves `ownsDataRoot`/`keepDataRoot` from the record; it yields a new main-window tab id — the skill instructs agents to re-run `list_tabs`/`attach_tab` after restart.
- Linux (user decision 2026-09-29): validation in this ticket is macOS-only; the user validates Linux after delivery. Chromium sandbox failures on distros restricting unprivileged user namespaces are not a Design Impact: the lifecycle never adds `--no-sandbox`; the guide's Linux section documents the OS-level remedies (enable unprivileged user namespaces via sysctl/AppArmor policy, or set the bundled `chrome-sandbox` helper to root-owned mode 4755) and states that the user decides.
- Occlusion switches apply only to isolated instances started by the lifecycle; recording the user's own Chrome while covered may freeze frames — documented limitation (MP-003).
- `stop_recording` waits up to 60 s for status; identity check before SIGTERM; stale state (worker gone, no status) → `RECORDING_FAILED` with cleanup.
- Attach-only error message names the endpoint; exit category 3.
- Validation channel (Solution Designer recommendation, 2026-09-29; API/E2E owns final test design): drive browser-side checks through the self-bootstrapping CLI launcher `browser-automation/scripts/browser` (`uv run --frozen`; same `BrowserApplication` core as the MCP; caller directory = artifact workspace) with `CHROME_REMOTE_DEBUGGING_PORT=<control port>` and `BROWSER_AUTOMATION_ATTACH_ONLY=1`. AC-010 is performed skill-first: a fresh AutoByteus agent configured with the two skills only (no MCP configured) performs start → screenshot → record → stop using bash (`pnpm --dir <repo> isolated-app …` and `CHROME_REMOTE_DEBUGGING_PORT=<port> BROWSER_AUTOMATION_ATTACH_ONLY=1 bash <browser skill>/scripts/browser …`). Use the MCP adapter (`scripts/browser-mcp`) only where the MCP surface itself is under test: AC-004 attach-only via MCP configuration and the tool-list check (existing tools + `start_recording`/`stop_recording`). The user's direction (2026-09-29): skills + CLI are the primary agent path; the MCP may be deprecated later — keep tools minimal and let skills document usage (no extra CLI flags or convenience commands). Any new Python dependency must be reflected in `uv.lock` (the launcher runs `--frozen`); the current design adds none (ffmpeg is a system binary).
- Docs use exact implemented names; guide covers: overview & guarantees; prerequisites (an AutoByteus build carrying the isolated-launch contract — the first release after this change, or a worktree build via `--from-worktree`/`--build`; Linux AppImage releases must be extracted first — Node 22, `pnpm install`, `uv`, ffmpeg); start (installed/worktree/build); MCP config (`CHROME_REMOTE_DEBUGGING_PORT=9333`, `BROWSER_AUTOMATION_ATTACH_ONLY=1`); helper via `run_script`; screenshots; recording tools; package import via UI; keys via importer + restart; stop/keep/cleanup; troubleshooting; limitations; post-production with `tts-mcp`/`video-audio-mcp` (DEC-001); ffmpeg full-screen recipe (DEC-005); links to packaging/E2E docs and the browser-automation skill.
