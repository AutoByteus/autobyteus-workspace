# Investigation Notes

## Investigation Meta

- Package identifier: `agent-isolated-app-recording`
- Request / ticket: Make it very easy for agents (running inside AutoByteus) to build or launch an isolated AutoByteus desktop instance, connect to and control it, take screenshots, and record end-to-end tutorial videos; plus a root-level document.
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording`
- Repository mode: `Git` (primary: `autobyteus-workspace`; secondary affected repository: `autobyteus-mcps` at `/Users/normy/autobyteus_org/autobyteus_mcps`, no task worktree created yet — needed only once design confirms changes there)
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording` / `codex/agent-isolated-app-recording`
- Resolved base remote / branch / revision: `origin` / `personal` / `e6c16d80148ba3a9674c0bd847eb1df0e6ca5bbb` (fetched 2026-09-28)
- Finalization target remote / branch: `origin` / `personal`; `autobyteus-mcps` finalization target `origin/main` (current checkout branch `main`) — to confirm at design
- Bootstrap result: Worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-010`
- Investigation status: Requirements-phase and architecture investigation complete (AF-001..AF-012; probes P-1..P-9); design at SR-009, artifact repair SR-010.

## Initial Request And Clarifications

- Original request: Can an agent inside the running main AutoByteus app build/start a separate test AutoByteus Electron app (different backend port, different profile), import a different agent package, control it like a website via an MCP, take screenshots and eventually produce a tutorial video, so the user no longer records tutorials manually?
- Clarifications received:
  1. A root-level document is strongly required ("extremely important, not just in code, as instructions in the future").
  2. The browser MCP lives in `autobyteus_mcps` and provides the browser tools; the user is completely open to changing that MCP (e.g., visible cursor, more actions) if it makes the result better.
  3. OS screen-recording permission is not a concern — the user will grant it.
  4. Demo data will be created by the recording agent itself.
  5. Goal: "make it very easy for agents" to record end-to-end videos, build and connect, control, take screenshots.
- User-supplied facts and constraints: Agents run inside the main AutoByteus app; main app must keep running.
- Initial ambiguity: whether a separate "video/tutorial profile" is needed; which tooling surface agents should use; model/provider access for the isolated instance (open — see DEC-002).

## Product And Domain Understanding

- Product area: AutoByteus desktop (Electron + embedded Node server), agent skills/tools, `autobyteus-mcps` browser-automation.
- Affected actors or systems: agents running in AutoByteus (primary), human developers, the user's production AutoByteus data.
- Existing purpose: The `e2e` launch profile exists for packaged Electron E2E testing (`pnpm test:e2e:electron`).
- Relevant terminology: *isolated instance* = an AutoByteus desktop process launched with the `e2e` launch profile (own backend port + own data root); *CDP* = Chrome DevTools Protocol remote-debugging endpoint.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-28 | Code | `autobyteus-web/electron/main.ts`, `electron/launch-profile/electronLaunchProfile.ts`, `electronLaunchProfilePaths.ts`, `e2eDataRootSafety.ts` | Can a second instance run with a different port/profile? | Two profiles only: `production`, `e2e`. `e2e` requires `AUTOBYTEUS_ELECTRON_SERVER_PORT` (≠29695, 1024–65535) and an existing `AUTOBYTEUS_ELECTRON_DATA_ROOT` not overlapping protected production paths; sets userData/sessionData/crashDumps/downloads/logs under the root; updater disabled. Any other profile value is rejected. | — |
| 2026-09-28 | Code | `grep requestSingleInstanceLock autobyteus-web/electron` | Would a second instance be blocked? | No single-instance lock. | — |
| 2026-09-28 | Code | `electron/browser/browser-bridge-server.ts:63` | Port collisions besides backend | Browser bridge listens on ephemeral port 0. | — |
| 2026-09-28 | Code | `autobyteus-web/scripts/run-electron-e2e.mjs`, `scripts/electron-e2e/*` | Existing launcher | Test harness: builds by default, selects free port, creates temp root, `--adapter direct|playwright`, `--hold-ms`, cleans up process tree and temp root on exit; no pass-through of extra app args; preserves the caller environment and overlays only the three isolation variables. | Not suitable as a long-lived agent-controlled lifecycle. |
| 2026-09-28 | Doc | Root `README.md` §"Packaged Electron API/E2E testing" (lines 328–374); `autobyteus-web/docs/electron_packaging.md` §"Packaged E2E Launch Profile" | Existing documentation | Root README has a test-oriented section (incl. `env -u ELECTRON_RUN_AS_NODE` hint); no agent-oriented guide for launching/connecting/controlling/recording; no mention of remote debugging, screenshots, recording, package import. | Root doc required (user). |
| 2026-09-28 | Code | `autobyteus-web/electron/server/macOSServerManager.ts:38-45`, `serverRuntimeEnv.ts` | Server child env | Server child env = `{...process.env, ELECTRON_RUN_AS_NODE:'1', PORT, SERVER_PORT, DATABASE_URL, DB_TYPE, AUTOBYTEUS_DATA_DIR, AUTOBYTEUS_SERVER_HOST, ...runtimeOverrides}`. All other inherited variables pass through. | Isolation leak (see probe). |
| 2026-09-28 | Code | `autobyteus-server-ts/src/config/app-config.ts:470-475` | Config precedence | `get()` = `process.env[key] ?? .env-file value ?? default` → inherited env wins over the isolated instance's own `.env`. | — |
| 2026-09-28 | Code | `autobyteus-ts/src/tools/terminal/pty-session.ts:62`, `direct-shell-session.ts:117` | What agent shells inherit | Agent terminals spawn with `{...process.env}` of the main server, i.e. `ELECTRON_RUN_AS_NODE=1` and all production `AUTOBYTEUS_*`/`DATABASE_URL`/`DB_NAME` variables. | — |
| 2026-09-28 | Code | `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | How agents get new capabilities | Skills discovered from app-data skills dir, additional skill dirs (`AUTOBYTEUS_SKILLS_PATHS`) and agent packages; a skill is a folder with `SKILL.md`. | Delivery surface for agent guidance. |
| 2026-09-28 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | Importing agent packages | GraphQL mutations `importAgentPackage`, `removeAgentPackage`, `reloadAgentPackage`, `checkAgentPackageUpdates`. | Package import into instance possible via its own backend URL. |
| 2026-09-28 | Code | `autobyteus_mcps/README.md`, `browser-automation/README.md`, `SKILL.md`, `src/browser_automation/runtime/config.py`, `session.py:128`, `application.py`, `mcp/tools/*`, `script.py` | Browser tool capabilities | Relocatable skill + CLI + thin MCP adapter over one `BrowserApplication`. Commands: health-check, list-tabs, attach-tab, open-tab, close-tab, navigate, read-page, screenshot, dom-snapshot, run-script. No click/type/hover/scroll/wait/record primitives; interaction only via `run-script`. Endpoint chosen by `CHROME_REMOTE_DEBUGGING_PORT` (default 9222) per process; attach via Playwright `connect_over_cdp`; if nothing is listening it launches its own Chrome. Validated for Chrome only. | Candidate for improvement (user open to it). |
| 2026-09-28 | Code | `autobyteus_mcps/browser-mcp/` | User referred to "browser-mcp project" | Folder has no git-tracked files (`git ls-files browser-mcp` empty) — leftover venv/caches; the maintained browser MCP is `browser-automation/scripts/browser-mcp`. | Treat `browser-automation` as the browser MCP. |
| 2026-09-28 | Code | `autobyteus_mcps/computer-use-mcp/README.md` | OS-level control | X11-only (Linux) desktop control; no macOS equivalent. | Not the primary path. |
| 2026-09-28 | Code | `autobyteus_mcps/video-audio-mcp`, `tts-mcp` | Post-production | FFmpeg-based editing MCP; TTS MCP. | Reuse for narration/editing, no change needed. |
| 2026-09-28 | Code | `autobyteus-web/electron/application/electronApplication.ts:67`, `stores/appUpdateStore.ts` | Update popup seen in probe | In `e2e` the updater is `null`, but the renderer update store still initializes/checks, receives an error and shows an "Update failed" toast. | Tutorial noise; must not appear in isolated instance. |
| 2026-09-28 | Command | `which ffmpeg ffprobe uv node pnpm`; `/Applications/AutoByteus.app` version | Host tooling | ffmpeg/ffprobe (Homebrew), uv, node 22, pnpm present; installed AutoByteus 1.4.91-beta.4; launch profile exists since v1.4.53. | — |
| 2026-09-28 | User | Conversation | Clarifications | See "Initial Request And Clarifications". | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Environment variables `AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e` + port + data root | Developer/test harness launches a packaged app; app runs with own port and data root. | Coexists with production instance; updater off; safety checks on data root and port. | launch-profile code; probe P-2 | High |
| BEH-002 | Operational | Launch from an agent shell inside AutoByteus | Inherited `ELECTRON_RUN_AS_NODE=1` makes the binary run as Node → exit 9 "bad option". | Launch fails unless the caller knows to clear the variable. | probe P-1 | High |
| BEH-003 | Operational | Launch from an agent shell inside AutoByteus | Inherited production `AUTOBYTEUS_*` settings flow to the isolated server and win over its `.env`. | Isolated server used production memory dir, production package/skill roots, `DB_NAME`, featured catalog, etc. `DATABASE_URL`, data dir, server host and browser-bridge URL were correctly overridden. | probe P-3 | High |
| BEH-004 | User | Isolated instance startup | Renderer shows "APP UPDATE — Update failed" toast. | Visible in every recording until dismissed. | probe P-2 screenshot | High |
| BEH-005 | Operational | Agent wants to control another desktop instance | No documented path. Manual discovery: launch with `--remote-debugging-port`, then `CHROME_REMOTE_DEBUGGING_PORT=<port>` browser CLI works. | Works (P-4) but undocumented; agents can only click via hand-written `run-script`; no cursor/recording. | probe P-4..P-6 | High |
| BEH-006 | Operational | Agent wants a video | No current supported behavior. | Probe showed CDP screencast → ffmpeg MP4 works. | probe P-6 | High for mechanism |
| BEH-007 | Operational | `run-script` with `async (arg) => {...}` | Script normalizer does not recognize async arrow; wraps it, returns `null`, action never runs. | Silent no-op. | probe P-5, `script.py` | High |
| BEH-008 | Operational | Agent wants to test its own source changes | `pnpm build:electron:<platform>` then `test:e2e:electron --skip-build --executable ...` (test harness only). | No agent-oriented lifecycle. | package.json, README | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/electron/launch-profile/*` | Profile resolution + path safety | Reuse as the isolation contract; no new "video" profile needed | Whether the app should itself strip inherited production server settings in `e2e` |
| `autobyteus-web/electron/server/*ServerManager.ts`, `serverRuntimeEnv.ts` | Server child env | Isolation must hold regardless of caller env | Where to sanitize (launcher, app, or both) |
| `autobyteus-server-ts/src/config/app-config.ts` | env-over-file precedence | Same | — |
| `autobyteus-web/scripts/electron-e2e/*` | Test harness preparation/ownership/cleanup | Possible reuse for lifecycle | Reuse vs. new lifecycle tool |
| `autobyteus-web/stores/appUpdateStore.ts` | Renderer update UX | No update error UI in isolated instance | — |
| `autobyteus_mcps/browser-automation` | Browser control CLI/MCP | Add actions, presentation cursor, recording, endpoint selection, async fix | Endpoint selection per call vs per server; recording lifecycle across CLI processes |
| Electron CLI switch `--remote-debugging-port` | Chromium switch honored by Electron 42 | Control channel | Should the app bind it only on loopback / only in isolated mode |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: new root document; skill `SKILL.md`; recordings/screenshots written to the agent workspace.
- Readers/writers: agents; humans.
- Evidence paths: see Source Log.

### Structural Surfaces

- Electron launch profile and server child environment (security/isolation boundary).
- Browser-automation public CLI/MCP contract (new commands/tools; schema-v1 JSON output).
- Skill discovery (existing; no change expected).

### Potential Structural Impacts To Investigate

- API or external-contract change: Yes — browser-automation CLI/MCP gains commands.
- Persistence schema or invariant change: No.
- Security or privacy boundary change: Yes — isolation of production data from an isolated instance; opening a local debugging port.
- Concurrency or lifecycle change: Yes — long-lived instance lifecycle and recording spanning multiple agent calls.
- Deployment / ownership boundary: Cross-repo (workspace + mcps).
- Confirmed absent/present/unknown: as above.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| P-1: installed app binary with e2e env + `--remote-debugging-port=39222` from agent shell | Launch from inside AutoByteus | Exit 9, "bad option: --remote-debugging-port" (because `ELECTRON_RUN_AS_NODE=1` inherited) | Launcher must clear it (REQ-003) | shell output |
| P-2: same with `env -u ELECTRON_RUN_AS_NODE`, port 39695, root `/tmp/ab-isolated-probe/data` | Launch installed app, no build | Backend ready in ≈8 s; CDP `/json/version` = Chrome 148 / Electron 42.4.1; one page target (renderer `index.html#/agents`); data root populated; main app on 29695 unaffected | Installed app is a valid base; no build required for tutorials | `evidence/probe-01-isolated-app-update-popup.png` |
| P-3: `ps eww <server pid>`; `lsof` | Isolation from caller env | DB file = isolated root ✓; but `AUTOBYTEUS_MEMORY_DIR=/Users/normy/.autobyteus/server-data/memory`, `DB_NAME=<production db>`, production `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`/`SKILLS_PATHS`/`DEFINITION_SOURCE_PATHS`, featured catalog, compaction settings inherited; UI listed 48 agents from the user's package roots | Isolation leak; must be fixed (REQ-002) | shell output |
| P-4: `CHROME_REMOTE_DEBUGGING_PORT=39222 browser health-check / list-tabs / attach-tab / screenshot / dom-snapshot` | Control via existing browser CLI | All succeeded against Electron; dom-snapshot returned element ids + selectors | Existing tool is a viable base | `evidence/probe-01…png` |
| P-5: `run-script` with injected fake cursor, animated move, click ring, click "Agent Teams" | Visible cursor + action | With `async (arg)=>` → silently null (BEH-007). With `async function(arg)` → navigation happened, cursor & ring visible in screenshot; click ring was left on screen afterwards | Cursor overlay feasible; needs first-class support and cleanup | `evidence/probe-02-fake-cursor-click.png` |
| P-6: Playwright `connect_over_cdp` + CDP `Page.startScreencast`, 3 animated clicks, frames → ffmpeg concat → H.264 MP4 | Record the instance window | 191 frames, 4.27 s, 2400×1536 (Retina) MP4, cursor mid-motion visible; no OS permission needed | Window recording feasible without screen permission | `evidence/probe-03-screencast-video-frame.png`, `evidence/screencast_probe.py` |
| P-8: `(sleep 1; printf 'IMPORT\\n'; sleep 1) \| script -q /dev/null node -e '<readline question>'` | Can a non-interactive agent satisfy the importer's TTY challenge? | `{stdinTTY:true, stderrTTY:true, answer:"IMPORT"}` — `script` allocates a PTY; piped answer arrives after the prompt | Importer usable by agents without code change | shell output |
| P-9: `grep secrets:import tickets/` | Prior agent practice | Agents repeatedly ran `pnpm secrets:import -- --source ~/.autobyteus/server-data/.env --database-url file:<disposable db>` for live E2E; piped attempt failed with `IMPORT_CONFIRMATION_REQUIRED`, direct PTY run succeeded | Established practice; document it | `tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence-sr018/api-rev-034/environment/secrets-import-*.log` |
| P-7: `kill <pid>`; `lsof` on 39695/39222/29695 | Stop | Both isolated ports released; no leftover processes; main app still serving 29695 | Clean stop feasible | shell output |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User | Stop recording tutorial videos manually; agents should do it | Explicit | Core goal | — |
| User | Root-level documentation is essential | Explicit | REQ-010 | — |
| User | Open to changing the browser MCP (cursor, actions) | Explicit | REQ-005..007 | — |
| User | Will grant OS permissions; agent creates demo data | Explicit | Not in scope to automate | — |
| User | "Very easy for agents" | Explicit | One-command lifecycle, JSON outputs, a skill | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Electron / Chromium CDP | Electron 42.4.1, Chrome 148 | `--remote-debugging-port` honored; page targets exposed | P-2 | Other Electron versions not tested |
| Playwright `connect_over_cdp` | browser-automation lock | Works against Electron | P-4, P-6 | Some browser-context operations (e.g., `open-tab`) may not be meaningful for Electron |
| ffmpeg | Homebrew | Encodes frames to MP4 | P-6 | Availability on Linux hosts must be checked/documented |
| macOS / Linux | — | Desktop GUI required; Linux may use a virtual display | computer-use-mcp README | Headless Linux not probed |

## Persisted Data And State Facts

- Affected stored subject: the user's production AutoByteus data (`~/.autobyteus`, Application Support) — must not be read or written by an isolated instance; isolated data roots.
- Location: production `~/.autobyteus/server-data/{db,memory,…}`; isolated `<root>/server-data/…`.
- Current readers and writers: isolated server currently receives production memory dir via inherited env (P-3).
- Required semantics: production data untouched by isolated instances.
- Acceptable loss: isolated roots are disposable (subject to keep/discard choice).
- Remaining evidence gap: whether any other inherited variable causes a production write (full list to be enumerated in design).

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Other fields: N/A — not applicable (no UI change to design; the only UI outcome is suppression of the update error toast in isolated mode).

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probe-01-isolated-app-update-popup.png` | Solution Designer | Evidence of isolated launch, CDP screenshot, update toast | P-2/P-4 | REQ-001, REQ-004, REQ-008 | Final | Evidence only |
| `evidence/probe-02-fake-cursor-click.png` | Solution Designer | Evidence of cursor overlay + click via run-script | P-5 | REQ-005, REQ-006 | Final | Evidence only |
| `evidence/probe-03-screencast-video-frame.png` | Solution Designer | Frame from recorded MP4 | P-6 | REQ-007 | Final | Evidence only |
| `evidence/screencast_probe.py` | Solution Designer | Disposable feasibility script (kept as reference for recording mechanism) | P-6 | REQ-007 | Reference | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | How the isolated instance obtains LLM provider access (fresh root has no provider keys/settings) | Tutorials that run agents need a working model | DEC-002 (user) | Open |
| U-002 | Unknown | Full list of inherited variables that must not reach an isolated server | Data safety | Design | Open |
| R-001 | Risk | Debugging port exposes full control of the instance to local processes | Security | Loopback-only binding; only isolated instances; documented | Open |
| R-002 | Risk | Native OS surfaces (file pickers, menus, notifications) are not visible in window-content recording or controllable via CDP | Some tutorial scenes | Documented limitation; optional full-screen recording | Open |
| R-003 | Risk | Linux headless hosts need a display server | Linux support | Document; design | Open |
| R-004 | Risk | Cross-repo change (mcps) needs its own branch/finalization | Delivery | Design/delivery | Open |

## Architecture Investigation Findings

| ID | Source / Command | Observation | Design Implication |
| --- | --- | --- | --- |
| AF-001 | `autobyteus-web/scripts/electron-e2e/electronE2ELaunchPreparation.mjs` | `prepareElectronE2ELaunch` owns executable discovery (current-worktree `electron-dist` or explicit path), free-port selection (≠29695), safe data-root creation (`mkdtemp` under tmp, 0700) via compiled `e2eDataRootSafety`, env overlay; requires compiled `dist/electron/launch-profile` (i.e., a built worktree); builds by default. | Reusable pieces: port selection, safe-root validation, env builder; but it depends on compiled worktree files and assumes in-process ownership. |
| AF-002 | `directElectronProcessAdapter.mjs`, `ownedElectronProcessTree.mjs`, `electronE2ESession.mjs` | Direct spawn is `detached` on POSIX (process-group leader); ownership = POSIX process group `-pid` (SIGTERM → SIGKILL, confirm absence via `kill(-pgid,0)`); readiness polls `/rest/health`; cleanup deletes owned root and observes port release. All in-process for one runner lifetime. | A detached lifecycle can reuse the same process-group ownership rule across CLI invocations by persisting pgid in an instance record. |
| AF-003 | root `package.json` | Root scripts include background lifecycle precedent (`android:server:start:bg/stop/status`). `playwright-core` is a devDependency of `autobyteus-web` only. | Root pnpm entry is idiomatic; recorder can use `autobyteus-web`'s `playwright-core` or raw CDP over WebSocket. |
| AF-004 | `electron/server/*ServerManager.ts`, `serverRuntimeEnv.ts`; `app-config.ts` `get()` and `loadEnvironmentInternal()` (`dotenv.config` populates `process.env`) | The main server copies its whole production `.env` into `process.env`; agent terminals inherit it; an isolated Electron passes `{...process.env}` to its server child; `get()` prefers `process.env`. Server-read keys include `AUTOBYTEUS_MEMORY_DIR`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`, `AUTOBYTEUS_SKILLS_PATHS`, `AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS`, `AUTOBYTEUS_TEMP_WORKSPACE_DIR`, `AUTOBYTEUS_LOG_DIR`, `AUTOBYTEUS_LLM_SERVER_HOSTS`, `LMSTUDIO_HOSTS`, `OLLAMA_HOSTS`, `DEFAULT_SEARCH_PROVIDER`, `APP_ENV`, `LOG_LEVEL`, `CODEX_APP_SERVER_*`, … | Isolation must be enforced where the isolated server environment is composed (Electron `e2e` profile), not only in one launcher: compose the isolated server env from a system-baseline allowlist plus Electron-owned runtime values. |
| AF-005 | Electron main env reads | Electron main reads `AUTOBYTEUS_ELECTRON_*`, `AUTOBYTEUS_BROWSER_BRIDGE_*` (sets for server), `HOME`, `PATH`, `SHELL`, voice-input vars, `CODEX_HOME`, provider-key names for status. | Electron main itself does not read production data paths from env; only the server child is exposed. |
| AF-006 | `autobyteus-server-ts/docs/modules/secret_management.md`, `src/secret-management/*` | Provider credentials live in an encrypted vault in each application DB with a sibling root-key file (inseparable pair; backup/restore/move as a pair). `pnpm secrets:import` is operator-only (TTY), never agent/API/MCP/startup fallback; no secret transfer. Contract explicitly does not claim child-environment sanitization for terminals/Claude/Codex. | ARCH-F-001: automated key copy from production (DEC-002 as approved) conflicts → Requirement Gap. Template-root copy (pair copy of a user-prepared non-production root) stays within the pair backup/restore semantics. Sanitizing only the isolated server child env does not change the terminal/runtime environment behavior the contract describes. |
| AF-007 | `electron/application/electronApplication.ts:67`, `electron/updater/appUpdater.ts` (IPC `app-update:*`), `electron/preload.ts:77-82`, `stores/appUpdateStore.ts:97-127`, `shared/appUpdateTypes.ts` | In `e2e`, `AppUpdater` is not constructed so `app-update:*` IPC handlers are never registered; renderer store calls `getAppUpdateState()`, the invoke rejects, store adds "initializeFailed" error toast. `AppUpdateStatus` has no disabled state. | Root cause is a missing "updates disabled for this launch" contract between main and renderer. |
| AF-008 | `browser_automation/runtime/session.py`, `chrome_launcher.py:262-292`, `config.py` | Every operation: `ensure_available()` probes the endpoint; if absent it spawns and owns Chrome; then `connect_over_cdp`, operate, disconnect. Endpoint from `CHROME_REMOTE_DEBUGGING_PORT` (host fixed 127.0.0.1). | Attach-only = a config flag that makes `ensure_available()` fail with `BROWSER_UNAVAILABLE` instead of spawning. |
| AF-009 | `browser_automation/script.py` | Prefix list lacks `async (`/`async arg`. | Local defect fix. |
| AF-011 | `browser_automation/policy.py:81-201` (`ArtifactPolicy`), `runtime/chrome_launcher.py:106-108` (runtime dir `<tmp>/browser-automation-runtime-<uid>`), `application.py:322-360` (`run_script`), `cli.py` subcommands, `autobyteus_mcps/docs/mcp-to-cli-mapping.md` rule 2 (`navigate_to`↔`navigate`), `pyproject.toml` (setuptools, packages.find) | Workspace-relative artifact outputs with explicit overwrite and temp-sibling commit; per-user runtime dir; run_script = normalize → session → resolve page → evaluate → strict JSON; setuptools needs package-data for `.js` | Recording outputs reuse ArtifactPolicy (resolves ARCH-DR-002); recording state under runtime dir; helper install inside run_script session; package data entry |
| AF-012 | `ls tickets/done`, docs grep | No AutoByteus CLI for agent-package import exists | Package import via UI after REQ-012 withdrawal |
| AF-010 | `api/graphql/types/agent-packages.ts` | `importAgentPackage(input: {sourceKind, source})`, returns packages. | Import command = GraphQL call to the instance backend URL. |


## Requirement Implications

- A new "video" launch profile is unnecessary: the `e2e` profile's isolation is what recording needs; the gaps are (a) environment leakage when launched from inside AutoByteus, (b) the update toast, (c) no agent-oriented lifecycle, (d) no first-class actions/cursor/recording in the browser tool, (e) no agent-oriented documentation.
- The installed app suffices for tutorials; a source build path is needed for agents validating their own changes.
- The existing browser-automation tool already attaches to Electron, so improving it (rather than adding a second control tool) keeps agents on one familiar toolset.

## Notes For Architecture Design

- Verify every production-owned server variable and decide sanitization location(s) (launcher and/or app `e2e` profile).
- Recording must survive across separate agent tool calls (CLI processes are short-lived) — needs a recording owner process or equivalent.
- Endpoint selection for the browser tool must allow switching between the user's Chrome and one or more isolated instances.
- Decide where the lifecycle tool lives (workspace repo vs mcps) and how its skill is exposed to AutoByteus agents.
- Fix the `async (arg) =>` normalization in browser-automation `script.py`.
