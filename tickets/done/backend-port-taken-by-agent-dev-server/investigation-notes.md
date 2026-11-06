# Investigation Notes

## Investigation Meta

- Package identifier: `backend-port-taken-by-agent-dev-server`
- Request / ticket: Project Task `autobyteus-restart-reliability-3` (Project `project_0b3edda8-91b4-4c0c-8a11-afed3bea2a05`), "Fix: backend port 29695 taken by agent-started dev servers that inherit AutoByteus's PORT env var"
- Workspace root: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-taken-by-agent-dev-server`
- Repository mode: `Git`
- Task worktree / branch: the workspace root above / `task/backend-port-taken-by-agent-dev-server`
- Resolved base remote / branch / revision: `origin/personal` (remote HEAD branch) at `666b881b5` ("chore(release): bump workspace release version to 1.5.12-beta.4"), after `git fetch origin` on 2026-11-06
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created with `git worktree add -b task/backend-port-taken-by-agent-dev-server <root> origin/personal`; the untracked bug report and its `evidence/` were copied from the shared checkout's `tickets/in-progress/backend-port-taken-by-agent-dev-server/` into this worktree's ticket folder (the shared-checkout copy is left untouched).
- Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; 2026-11-06): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; repository `AGENTS.md`
- Investigation status: Complete for requirements; architecture findings appended below.

## Initial Request And Clarifications

- Original request: the Task description (above). The desktop app 1.5.12-beta.2 opens to "Application Error: Backend port 29695 is already in use"; Restart Server cannot recover. Fix the root cause (PORT/SERVER_PORT leaking into agent runtimes and tool shells), with regression coverage for the leak and the conflict/recovery path. Candidate fixes 2–4 of bug report §7 are optional investigation input; S1/S2 only if cheap.
- Clarifications received: None needed.
- User-supplied facts and constraints: bug report + evidence (`bug-report.md`, `evidence/app.log`, `evidence/server-last-session.log`, `evidence/port-holder-snapshot.txt`). Do not kill/disrupt the user's dev server, reset data, auto-terminate unrelated processes, or patch the installed app. No release.
- Initial ambiguity: which layer should stop the leak (launcher, server, or every child spawn site); whether candidate 2 (hold the port across restart) would help; whether candidate 3 (actionable conflict screen) is needed.

## Product And Domain Understanding

- Product area: desktop (Electron) embedded backend lifecycle; agent runtimes and agent tool shells.
- Affected actors or systems: the desktop user; the embedded backend; every process the backend's agents start (Claude Agent SDK, Codex app server, ACP runtimes, AGY, Grok, native terminal tools, application workers) and their descendants.
- Existing purpose: the embedded backend listens on fixed port 29695 (`PRODUCTION_EMBEDDED_SERVER_PORT`); the renderer, phone pairing and stored node URLs reference it.
- Terminology: "port holder" = the process whose listening socket blocks the backend's bind; "leak" = an AutoByteus-internal variable reaching agent-started programs.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-06 | Doc | `bug-report.md`, `evidence/*` | Starting evidence | Holder PID 81559 = `nuxt dev` (PPID chain to launchd), env `PORT=29695`, `SERVER_PORT=29695`, AutoByteus markers; socket `IPv6 *:29695`; vite-hmr upgrade 101 | Verify each link |
| 2026-11-06 | Code | `autobyteus-web/electron/server/serverRuntimeEnv.ts:115-141` | Who sets PORT | `buildServerProcessEnv` sets `PORT` and `SERVER_PORT` to the backend port; the doc comment says it is "the only place that decides which caller variables reach the server" | E1 |
| 2026-11-06 | Code | `autobyteus-web/electron/server/macOSServerManager.ts:50-54` (Linux/Windows managers same) | How the backend gets its port | Spawned with `--port <port> --data-dir <dir>`; no `--host` | E2 |
| 2026-11-06 | Code | `autobyteus-server-ts/src/app.ts:17-55` | How the server reads its port | `parseArgs(process.argv)` only: `--port` (default 8000), `--host` (default `0.0.0.0`) | E2 |
| 2026-11-06 | Command | `grep -rn -w -E "PORT\|SERVER_PORT"` over `autobyteus-server-ts/src`, `autobyteus-ts/src`, `autobyteus-web/electron`, application SDKs, `applications`, `autobyteus-message-gateway` (non-test) | Any consumer of PORT/SERVER_PORT | Only the two writes in `serverRuntimeEnv.ts`; no reader. History: `bdbbb7e49` (2026-03-31) removed the last reader (`process.env.SERVER_PORT ?? process.env.PORT ?? '29695'`) | E3 |
| 2026-11-06 | Code | `autobyteus-server-ts/docker/entrypoint.sh:9`, `docker/docker-compose.yml:14`, `docker/starter/server-process.mjs:21-24`, `scripts/android-run-server-termux.sh:8,186` | Other server launchers | Docker uses `AUTOBYTEUS_SERVER_PORT` and `--port`; Termux script's `PORT` is a non-exported shell variable passed as `--port`. Electron is the only launcher that exports `PORT`/`SERVER_PORT` | E4 |
| 2026-11-06 | Code | `autobyteus-web/scripts/verify-packaged-server-startup.mjs:128-146` | Build verification mirror | Mirrors the production env, including `PORT`/`SERVER_PORT` | E5 |
| 2026-11-06 | Command | grep for `...process.env` / `env: process.env` in server and core | Which children inherit the backend env | Claude SDK (`claude-sdk-client.ts:356`, `claude-sdk-spawn-environment.ts:64`), Codex (`codex-app-server-client.ts:51`), runtime installers (`runtime-command-runner.ts:49`, `runtime-process-operation.ts:50`), Grok (`grok-build-launch-profile.ts:91`), application workers (`application-worker-supervisor.ts:63`), watcher (`watcher-runtime-client.ts:101`), native shells (`autobyteus-integration-shell-environment.ts:15`), terminal tools (`autobyteus-ts/src/tools/terminal/{pty-session,isolated-pty-session,isolated-pty-bridge-source,direct-shell-session,wsl-tmux-session}.ts`) | E6 |
| 2026-11-06 | Web/Command | `npm install get-port-please@3` (3.2.0) in `/tmp/abp-probe/pkg`; `dist/index.mjs:254-292` | Dependency behavior | `_port = Number(options.port ?? process.env.PORT)`; `portsToCheck = [options.port, ...portRange]`; host from `options.host ?? process.env.HOST`; `_tryPort` listens with that host (undefined → Node default wildcard `::`) | E7 |
| 2026-11-06 | Web/Command | `npm pack @nuxt/vite-builder@4.4.2`; `dist/index.mjs:993-1000, 1468-1474` | Nuxt HMR port choice | `serverDefaults.hmr.port = await getPort({ verbose: false, portRange: [24678, 24698] })` — no `port` option, so `process.env.PORT` is tried first | E7 |
| 2026-11-06 | Runtime | `evidence/server-last-session.log:81-85` | Backend bind address | `Server listening on 0.0.0.0:29695` (IPv4 wildcard) | E8 |
| 2026-11-06 | Code | `autobyteus-web/electron/server/backendPortAvailability.ts:9-30` | Preflight check | Exclusive test binds on `127.0.0.1` then `0.0.0.0`; 5 s wait (10 s Linux); then `PortConflictError` with `inspectPortOwner` diagnostic | E9 |
| 2026-11-06 | Code | `autobyteus-web/electron/server/serverStatusManager.ts:76-147` | Restart and health | `restartServer` = stop + start (same port, same preflight). `checkServerHealth` returns `{status:'starting'}` whenever `!manager.isRunning()`, also in ERROR | E10 |
| 2026-11-06 | Code | `autobyteus-web/stores/serverStore.ts:209-219, 371-379`; `components/server/ServerLoading.vue:22-24, 62-64, 166-178` | S1/S2 | Store interval polls `checkServerHealth` every 2 s until RUNNING (never stops in ERROR); store maps `'starting'` to "Server is starting up..."; the error screen shows that text under "Health check:" | E10 |
| 2026-11-06 | Doc | `tickets/done/backend-port-conflict-20261024/requirements-doc.md:89-92` | Prior decisions | DEC-002: holder identity is advisory, never termination authority; DEC-003: keep fixed port policy | Scope |
| 2026-11-06 | Doc | `tickets/done/busy-quit-shutdown-orphan/follow-ups.md` FU-002/FU-003 | Related open follow-ups | FU-003: native background processes outlive run Terminate (product decision pending) | Not this ticket |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Desktop app launches the embedded backend | Electron composes the backend env (`PORT`/`SERVER_PORT` = 29695 + caller env) and spawns `app.js --port 29695` | Backend listens on `0.0.0.0:29695`; its env carries `PORT=29695`, `SERVER_PORT=29695` | E1, E2, E8 | High (Read) |
| BEH-002 | User | User runs an agent (any runtime) that starts a program from its shell/tool, e.g. `npm run dev` | The backend's env is inherited by the runtime and every descendant | Programs that honour `PORT` (Nuxt/Vite HMR via get-port-please, Nitro, Express templates, `serve`) or `SERVER_PORT` (e.g. Spring Boot relaxed binding) try 29695 | E6, E7, snapshot | High (Read + Reproduced dependency) |
| BEH-003 | System | Agent-started program asks for port 29695 | macOS: a default-host (`::`) listen succeeds even while the backend holds `0.0.0.0:29695` (measured P2). Otherwise it succeeds whenever the backend is down | The program can hold `[::]:29695` | P1, P2 | Measured on macOS 26.6.2 / Node 26.12; Linux not measured |
| BEH-004 | System | Backend start / Restart Server while a foreign process holds `[::]:29695` | Preflight `127.0.0.1` bind succeeds, `0.0.0.0` bind fails `EADDRINUSE` (P2-B); after 5 s `PortConflictError`; ERROR screen with owner PID/executable | Restart repeats the same failing preflight until the holder exits; app never kills it (prior DEC-002) | E9, P2, app.log | High |
| BEH-005 | System | Holder exits, user presses Restart Server | Preflight passes; backend starts | Recovery works (existing test with a `127.0.0.1` holder) | E9, `BackendPortAvailability.spec.ts:5-14` | High for `127.0.0.1` holder; `[::]` holder shape not covered by a test |
| BEH-006 | User | ERROR state, technical details / Check Server Health | Health result `'starting'` → "Health check: Server is starting up..." | Misleading text; main logs "Checking server health" every 2 s forever | E10, app.log | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` `buildServerProcessEnv` | Single owner of the backend child env | The leak originates here | Remove the two injected variables at the owner; every descendant is fixed at once |
| `autobyteus-server-ts/src/app.ts` `parseArgs` | Reads port from argv only | Removing `PORT`/`SERVER_PORT` cannot change the backend's port | None |
| Child spawn sites (E6) | Inherit `process.env` | Would each need stripping if the launcher kept injecting | Not needed once the source stops injecting |
| `autobyteus-web/scripts/verify-packaged-server-startup.mjs` | Build-time mirror of the production launch env | Must stay a faithful mirror | Remove the same two variables |
| `backendPortAvailability.ts`, `portOwnerInspector.ts` | Preflight + advisory identity | Recovery path to cover with the incident's holder shape | Test-only addition |
| `serverStatusManager.ts` `checkServerHealth`; `stores/serverStore.ts` polling | S1/S2 | Cheap local fixes | Report ERROR as not running; stop/skip polling in ERROR |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files/records: none persisted. The backend child env is composed in memory per launch.
- Readers: none read `PORT`/`SERVER_PORT` (E3).
- Evidence paths: E1–E5.

### Structural Surfaces

- Electron server launch env composition (one function), its unit tests, one build verification script; Electron status manager health method; renderer server store polling.
- Existing structure supports the change without new modules.

### Potential Structural Impacts To Investigate

- API or external-contract change: Removing `PORT`/`SERVER_PORT` from the backend's env. No in-repo reader; agents that relied on `PORT` to learn the backend port would have read the wrong contract (the documented one is `AUTOBYTEUS_SERVER_HOST`, unchanged). Confirmed absent in repo.
- Persistence schema or invariant change: Absent.
- Security or privacy boundary change: Absent (fewer variables passed).
- Concurrency or lifecycle change: Renderer polling stop in ERROR; no main-process lifecycle change.
- Deployment/migration/ownership change: Absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| P1: `PORT=39695 node /tmp/abp-probe/scripts/probe.mjs <get-port-please> {free,held,unset}` (script calls `getPort({ portRange: [24678, 24698] })`, Nuxt's exact call) | Nuxt HMR port choice with/without `PORT` | `free` → 39695; `held` (IPv4 `0.0.0.0` holder) → **39695**; `PORT` unset → 24678 | Reproduced | With `PORT` absent the dev server uses its own range; with `PORT` set it picks the backend's port even while the backend (IPv4 wildcard) holds it | probe output in this file; script copy below |
| P2: `node /tmp/abp-probe/scripts/bindorder.mjs 39711` | Bind interaction on macOS | A: backend `0.0.0.0` OK, then default-host (`::`) listen **OK** (concurrent). B: `::` first, then `127.0.0.1` exclusive OK, `0.0.0.0` exclusive **EADDRINUSE** | Measured (macOS 26.6.2, Node v26.12.0) | (1) Candidate 2 "keep the port during restart" does not close the hole on macOS: the dev server can take `[::]:29695` while the backend runs. (2) The preflight correctly detects an `[::]` holder via the `0.0.0.0` probe. (3) The regression test for the conflict path should use an `[::]` holder, the incident's shape | this file |
| P3: `node /tmp/abp-probe/scripts/dualstack.mjs 39712` | Would a dual-stack backend bind be exclusive? | Backend on `::` → later default-host and `0.0.0.0` listens both **EADDRINUSE** | Measured (macOS) | Input for follow-up FU-001 (bind-address hardening); not required for the root cause | this file |

- Temporary diagnostics: None in the repository. Probes live only in `/tmp/abp-probe/` (scratch, not committed).
- Reproduction for implementation to start from: the unit expectation "`buildServerProcessEnv` output contains no `PORT`/`SERVER_PORT`" fails on the base revision (the existing `serverRuntimeEnv.spec.ts:51` "matches the established production composition exactly" and `platformServerEnvironment.spec.ts:136-137,167` assert their presence today). Probe P1 shows the dependency effect. Probe scripts (for validation reuse):

```js
// /tmp/abp-probe/scripts/probe.mjs <path-to-get-port-please/dist/index.mjs> <free|held|unset>
import net from 'node:net';
const { getPort } = await import(process.argv[2]);
const target = Number(process.env.PORT_UNDER_TEST); const scenario = process.argv[3];
let holder; if (scenario === 'held') { holder = net.createServer(); await new Promise(r => holder.listen(target, '0.0.0.0', r)); }
if (scenario === 'unset') delete process.env.PORT;
console.log(JSON.stringify({ scenario, chosen: await getPort({ portRange: [24678, 24698] }) })); holder?.close();
```

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User (via Task) | App unusable; wants the root cause fixed | Live incident twice (2026-10-24, 2026-11-06) | REQ-001 is Must | None |
| User (via Task) | No kill/reset/binary patch; no release | Explicit constraint | Preserved behavior; validation on isolated resources | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| get-port-please | 3.2.0 (the user's Nuxt 4.4.2 project) | Tries `process.env.PORT` first; host from `process.env.HOST` | E7, P1 | Other versions behave the same per source; not exhaustively checked |
| @nuxt/vite-builder | 4.4.2 | HMR port via `getPort({portRange:[24678,24698]})` | E7 | — |
| `PORT` convention | De facto (Heroku-style; Nitro, Express templates, `serve`, Next) | Programs bind `PORT` when set | Common knowledge + E7 | — |
| `SERVER_PORT` | Spring Boot relaxed binding maps `SERVER_PORT` to `server.port` | A Spring Boot app run by an agent would bind 29695 | Read (Spring Boot docs convention) | Not probed |
| BSD/macOS sockets | macOS 26.6.2 | IPv6 wildcard bind coexists with an IPv4 wildcard bind on the same port | P2 | Linux default `bindv6only=0` makes `[::]` conflict with `0.0.0.0` (not measured here) |

## Persisted Data And State Facts

- Affected stored or external subject: None. No data, settings or stored node URLs change.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`

## Product Design Findings

- N/A — no Product Design request.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `bug-report.md` | Reporter (Project Task Manager intake) | Incident report, root-cause chain | Whole ticket | All | Final input | Evidence, not behavior-defining |
| `evidence/app.log`, `evidence/server-last-session.log`, `evidence/port-holder-snapshot.txt` | Reporter | Captured incident evidence | Whole ticket | All | Final input | Evidence |
| `follow-ups.md` | Solution Designer | Items not taken on | FU-* | — | Active | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| U-001 | Unknown | Exact moment the dev server bound 29695 | Explains timing only | P2 shows it could have happened while the backend ran (22:09 local, backend PID 55993 up since 2026-11-05 08:43Z); either way the fix is the same | Accepted as inferred |
| R-001 | Risk | Programs already started by an older build still carry `PORT=29695` until they exit | One-time transitional exposure after upgrade | Existing conflict screen names the PID; FU-002 records the actionable-screen candidate | Accepted |
| R-002 | Risk | A user/agent may deliberately pick 29695 for an unrelated program | Not caused by AutoByteus; rare non-standard port | FU-001 (bind exclusivity) | Accepted |
| R-003 | Risk | Some agent workflow relied on `PORT` to discover the backend port | Removing it would break that workflow | No in-repo reader (E3); the supported contract is `AUTOBYTEUS_SERVER_HOST`, unchanged | Low |

## Architecture Investigation Findings

- A1 (Read): `buildServerProcessEnv` is the sole composer of the embedded backend's environment for all three platform managers (`baseServerManager.ts:319` passes `publicServerUrl`, port etc.; platform managers call `this.buildServerEnv`). Removing two keys there removes them from every descendant: all spawn sites (E6) derive from the backend's `process.env`.
- A2 (Read): Under `inherit-caller` (production), a caller-supplied `PORT` would still pass through. On macOS/Windows packaged launches (Finder/Dock/Start menu, auto-update relaunch) the caller env is the session environment, which has no `PORT`. That is the user's own variable, not AutoByteus's port, so it is outside the root cause (DEC-002).
- A3 (Read): `verify-packaged-server-startup.mjs` is a build-time mirror that should match production composition; it passes `--port` too, so dropping the two variables there is safe.
- A4 (Read): S1: `ServerStatusManager.checkServerHealth` returns `'starting'` for any `!isRunning()`; it already knows `currentStatus`. S2: two renderer pollers exist — `serverStore.handleElectronServerInitialization` (2 s, stops only on RUNNING; the one in app.log) and `ServerLoading.vue` (stops when not `starting`). Only the store poller loops in ERROR.
- A5 (Read): After the store poller stops in ERROR, `healthCheckStatus` would keep its last STARTING-era value ("Server is starting up...") on the error screen unless a fresh ERROR-aware value replaces it. S1 and S2 must therefore be fixed together so the error screen never shows "starting up".
- A6 (Read): Existing tests that pin the old composition: `serverRuntimeEnv.spec.ts:51-73` (exact production composition), `platformServerEnvironment.spec.ts:136-137, 167`.

## Requirement Implications

- The root cause is a single injection point (E1) with no consumer (E3): removing it fixes all runtimes and tools without touching each spawn site.
- Candidate 2 is measured ineffective on macOS (P2) and is not taken.
- Candidate 3 grants kill authority over processes the app does not manage (reverses prior DEC-002) and after the root fix addresses only transitional/foreign holders: follow-up.
- Candidate 4 (fixed port) is not needed for the root cause: not taken, not raised.
- S1/S2 are cheap, local and coupled (A5): taken.

## Notes For Architecture Design

- Scenarios to realize: SCN-001..SCN-004 (requirements doc).
- Constraints: backend port and bind address unchanged; `AUTOBYTEUS_SERVER_HOST`, `AUTOBYTEUS_DATA_DIR`, `AUTOBYTEUS_DESKTOP_EMBEDDED_NODE` unchanged; conflict diagnostic and no-kill policy unchanged.
- Verify in validation: Linux behavior is unaffected (the fix is platform-independent); an executable check that an agent-started command in a desktop-composed backend sees no `PORT`.
