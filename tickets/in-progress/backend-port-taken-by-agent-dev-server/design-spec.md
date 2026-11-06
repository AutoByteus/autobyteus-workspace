# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline: `requirements-doc.md` at SR-001, approved by Solution Designer within the direction (user informed in the Solution Designer conversation, 2026-11-06)
- Behavior-defining supplements: None
- User approval of the design: `Not required` (the direction does not ask for design approval)
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-taken-by-agent-dev-server/tickets/in-progress/backend-port-taken-by-agent-dev-server/investigation-notes.md`
- Authorities read (2026-11-06): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root; no closer `DESIGN*.md` exists), `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `TESTING.md` (test layers, path choice). `design-examples.md`: not used.
- Project design-principle conflicts or discrepancies: None. Root `DESIGN.md` rule 9 C4 (`node dist/app.js --host --port --data-dir`) is unaffected: the server keeps reading its port from `--port`.

## Current-State Read

The desktop main process owns the embedded backend's launch. All three platform managers (`macOSServerManager.ts:37`, `linuxServerManager.ts:35`, `windowsServerManager.ts:33`) call `BaseServerManager.buildServerEnv` (`baseServerManager.ts:312-322`), which delegates to `buildServerProcessEnv` (`serverRuntimeEnv.ts:115-141`), the single composer of the backend env. It adds `PORT` and `SERVER_PORT` = backend port (`:131-132`) although the server reads its port only from `--port` (`autobyteus-server-ts/src/app.ts:17-55`) and no code reads either variable (investigation E3). Every agent runtime and tool shell inherits the backend's `process.env` (E6), so programs agents start see `PORT=29695` (BEH-002). Nuxt's HMR port picker binds it (P1); on macOS that bind succeeds even while the backend holds `0.0.0.0:29695` (P2), and the holder then blocks every later start/Restart (BEH-004).

Status/health: `ServerStatusManager.checkServerHealth` (`serverStatusManager.ts:106-116`) answers `'starting'` whenever the managed child is not running, also in ERROR. The renderer store's fallback poller (`stores/serverStore.ts:209-219`) calls it every 2 s until RUNNING, so in ERROR it never stops; the store renders `'starting'` as "Server is starting up..." (`:376-378`), which the error screen shows (`ServerLoading.vue:62-64`).

No coupling or fragmentation problem: the existing owners are right; each defect is local to its owner.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale: four production files in one package (`autobyteus-web`): `serverRuntimeEnv.ts` + its one caller line in `baseServerManager.ts`, `serverStatusManager.ts`, `stores/serverStore.ts`; one build script (`scripts/verify-packaged-server-startup.mjs`); one doc paragraph; tests. No new files in production code, no new module, no server or core change.
- Architectural risk: `Low`
- Risk rationale: removes two unread variables from a child env (E3) and tightens two local status behaviors. No API, persistence, security, concurrency, deployment or ownership-boundary change; backend port/address and every other launch variable unchanged (QR-001). Only contract-like effect: a hypothetical out-of-repo consumer of `PORT` inside agent shells (ASM-001/R-003), not a supported contract; `AUTOBYTEUS_SERVER_HOST` remains.
- Escalation trigger: if implementation or validation finds any reader of `PORT`/`SERVER_PORT` (in repo, bundled server package, or a runtime/tool AutoByteus ships), or the backend fails to start without them, stop and return `Design Impact`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code read | `autobyteus-web/electron/server/serverRuntimeEnv.ts:115-141` | Sole composer; sets `PORT`, `SERVER_PORT` | D1: remove at the source | None |
| Code read | `baseServerManager.ts:312-322`; platform managers `:33-37` | All platforms use it; `port` input only feeds those two keys | D1, D2 (drop `port` input) | None |
| Code read | `autobyteus-server-ts/src/app.ts:17-55` | Port from `--port` only | D1 safe | None |
| grep + history (E3) | non-test sources; commit `bdbbb7e49` | No reader since 2026-03-31 | D1 safe | Out-of-repo consumers (R-003) |
| Code read (E4) | docker, starter, Termux script | Only Electron exports `PORT` | No server-side scrub needed (D4) | None |
| Probe P1 | investigation notes | `PORT` unset → Nuxt HMR picks 24678 | Fix is sufficient for the incident class | Other tools follow the same convention |
| Probe P2 | investigation notes | `[::]` holder: `127.0.0.1` probe passes, `0.0.0.0` probe `EADDRINUSE` | Existing preflight detects the incident shape; regression test uses an `[::]` holder (D5) | Linux/Windows not measured |
| Code read | `serverStatusManager.ts:106-116`; `serverStore.ts:209-219, 309-314, 371-379`; `ServerLoading.vue:22-24, 62-64, 166-178` | S1/S2 mechanics; stale STARTING-era health text survives into ERROR (A5) | D3 | None |
| Code read | `scripts/verify-packaged-server-startup.mjs:128-146` | Mirrors production env incl. `PORT`/`SERVER_PORT` | D1 applies there too | None |
| Doc read | `autobyteus-web/docs/electron_packaging.md:1125-1127` | Lists `PORT`/`SERVER_PORT` among Electron-owned values | Doc update in this change | None |

## Intended Change

Stop the desktop launcher from injecting the backend's port as `PORT`/`SERVER_PORT`; make the health answer truthful in ERROR; stop the renderer's fallback health poller outside STARTING/RESTARTING; add regression tests for the leak and the incident-shaped conflict/recovery path.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas: Electron embedded-server env composition; Electron server status health answer; renderer server store polling/health text; packaged-server startup verification script; Electron packaging doc paragraph; tests in `autobyteus-web/electron/server/__tests__/` and `autobyteus-web/stores/__tests__/`.
- Derived consumers: `BuildServerProcessEnvInput` loses `port` → its one caller (`baseServerManager.ts:318`) and test helper `input()` in `serverRuntimeEnv.spec.ts` updated; `ServerHealthResult` type unchanged (existing `'error'` status reused).
- Deliberately left alone: agent runtime / terminal-tool env builders (they are correct once the source is clean); the server (`app.ts` argument parsing, bind address); preflight/conflict diagnostic and no-kill policy; fixed port; `ServerLoading.vue` own poller (already stops outside `starting`); caller-inherited env under `inherit-caller` (DEC-002).
- Follow-ups: FU-001 (dual-stack bind exclusivity), FU-002 (actionable conflict screen for AutoByteus-started holders).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC | Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001, REQ-002, REQ-005; AC-001, AC-004, AC-008 | App launch / Restart / post-update | Env carries `PORT`/`SERVER_PORT` (E1) | Not injected; everything else unchanged | DS-001 |
| BEH-002 | User | REQ-001; AC-002, AC-003 | Agent command | Inherits `PORT=29695` (E6) | No AutoByteus `PORT`/`SERVER_PORT` | DS-001 (consequence) |
| BEH-004/005 | System | REQ-003; AC-005 | Start/Restart with `[::]` holder | Detected (P2); recovery covered only for `127.0.0.1` holder | Preserved; regression with `[::]` holder | DS-002 |
| BEH-006 | User | REQ-004; AC-006, AC-007 | ERROR screen / Check Server Health | "starting up"; 2 s polling forever (E10) | "not running"; no polling in ERROR; resumes on Restart | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `bug-report.md`, `evidence/*` | Incident | All | Evidence for the root cause | Final, evidence only |
| `follow-ups.md` | Not-taken candidates | FU-001, FU-002 | Boundary of this change | Active |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `No` (in the owners touched)
- Structural triggers: none fire. Considered: *Repeated coordination* (stripping `PORT` at ~15 child spawn sites would create it — avoided by fixing the single source); *Legacy cleanup* (the two variables are legacy of a reader removed in `bdbbb7e49` — removed outright, no fallback); *Behavior by absence* (health "starting" derived from `!isRunning()` — replaced by an explicit rule on `currentStatus`); *Duplicated policy* (two renderer pollers pre-exist; this change only narrows the store poller's own condition and does not add a third — consolidation not required for the ticket).
- Root cause classification: `Local Implementation Defect` (an obsolete pair of values left in the correct owner, plus two local status conditions).
- Refactor needed now: `No`
- Evidence: E1–E3, A1, A4, A5.
- Design response: delete the two keys and the now-unused `port` input; explicit ERROR rule in health; explicit polling condition.
- Refactor rationale: owners and boundaries are right.
- Intentional deferrals and residual risk: FU-001, FU-002; R-001 (transitional holders from older builds).

## Terminology

- Port holder: a process with a listening socket that makes the backend preflight fail. No project glossary entry is needed (no new domain word).

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths: `PORT`/`SERVER_PORT` keys in `buildServerProcessEnv` and in the packaged startup verification script; the `port` field of `BuildServerProcessEnvInput`.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` — no stored data, settings or node URLs change; the env is composed in memory per launch.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Desktop launch / Restart Server | Program started by an agent reads its env | `BaseServerManager` (launch) / `buildServerProcessEnv` (env content) | Where the leak enters and how it propagates |
| DS-002 | Primary End-to-End | BEH-004, BEH-005 | Start / Restart Server | ERROR with diagnostic, or RUNNING | `BaseServerManager.startServer` → `waitForBackendPort` | Recovery path under test |
| DS-003 | Return-Event | BEH-006 | Status change to ERROR / health request | Error screen text | `ServerStatusManager` (health answer), `serverStore` (poll + text) | S1/S2 |

## Primary Execution Spine(s)

- DS-001: `App launch / Restart Server -> ServerStatusManager -> BaseServerManager.startServer -> platform manager startServerProcess -> BaseServerManager.buildServerEnv -> buildServerProcessEnv -> spawn app.js --port -> backend process.env -> agent runtime / terminal tool spawn -> agent-started program (reads PORT)`
- DS-002: `Start / Restart -> BaseServerManager.startAttempt -> waitForPortToBeFree -> waitForBackendPort (127.0.0.1 + 0.0.0.0 exclusive probes) -> PortConflictError + inspectPortOwner -> ServerStatusManager ERROR(diagnostic) -> renderer error screen`; after the holder exits: same path → spawn → `ready` → RUNNING.
- DS-003: `ServerStatusManager.emitStatusChange(ERROR) -> IPC status -> serverStore.updateServerStatus -> ServerLoading error screen`; `serverStore poller / Check Server Health -> IPC checkServerHealth -> ServerStatusManager.checkServerHealth -> result -> serverStore.healthCheckStatus`.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The launcher composes the backend env once; every descendant inherits it. Removing the two keys at composition removes them from every agent program, present or future runtime | launch, env composition, backend, agent program | `buildServerProcessEnv` | Login-shell PATH, runtime overrides (unchanged) |
| DS-002 | Unchanged path; gains a regression test with the incident's `[::]` holder shape and a recovery assertion | preflight, diagnostic, restart | `BaseServerManager` | `inspectPortOwner` (unchanged) |
| DS-003 | ERROR becomes an explicit state for health: main answers "not running", store drops stale STARTING-era text and polls only while STARTING/RESTARTING | status, health answer, poller | `ServerStatusManager` / `serverStore` | None |

## Spine Actors / Main-Line Nodes

`buildServerProcessEnv`, `BaseServerManager`, `waitForBackendPort`, `ServerStatusManager`, `serverStore`.

## Ownership Map

- `buildServerProcessEnv`: owns which variables reach the backend (contract: the backend env content).
- `BaseServerManager`: owns launch lifecycle and the inputs it passes to the composer.
- `waitForBackendPort`: owns the availability preflight and conflict error.
- `ServerStatusManager`: owns the main-process status and the health answer.
- `serverStore`: owns renderer-side status mirror, health text and the fallback poller.

## Thin Entry Facades / Public Wrappers

N/A — none involved.

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `PORT: port.toString()`, `SERVER_PORT: port.toString()` in `buildServerProcessEnv` | Dead: no reader since `bdbbb7e49` (E3); server uses `--port`; their only effect is the leak | Nothing (port travels as `--port`) | Root-cause fix |
| `port` field of `BuildServerProcessEnvInput` and `port: this.serverPort` at `baseServerManager.ts:318` | Dead after the row above (only feeds those keys) | — | Principle 7 |
| `PORT`, `SERVER_PORT` in `scripts/verify-packaged-server-startup.mjs:138-139` | Mirror of production; same reason | — | REQ-005 |
| Test assertions expecting `PORT`/`SERVER_PORT` (`serverRuntimeEnv.spec.ts:51-73`, `platformServerEnvironment.spec.ts:136-137, 167`) | Pin removed behavior | Assertions that they are absent | DESIGN.md rule 11 |

## Return Or Event Spine(s)

DS-003 above.

## Bounded Local / Internal Spines

- Parent owner `serverStore`: `setInterval(2 s) -> status RUNNING? clear : status STARTING|RESTARTING? checkServerHealth : skip`. It matters because the current tick calls health in every non-RUNNING state, including ERROR.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `inspectPortOwner` | DS-002 | `waitForBackendPort` | Advisory holder identity | Diagnostic | Unchanged |

## Ownership Boundaries

The backend env is decided only in `buildServerProcessEnv`. Runtime/tool env builders in the server and `autobyteus-ts` stay unaware of desktop launch details; they must not gain port-stripping logic (that would duplicate policy and hide the source).

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | If Too Thin |
| --- | --- | --- | --- | --- |
| `buildServerProcessEnv` | Baseline picking, Electron-owned values | `BaseServerManager.buildServerEnv` | Platform managers or child-spawn sites adding/removing launch variables themselves | Extend the composer |
| `ServerStatusManager.checkServerHealth` | Health HTTP probe, running check | IPC handler | Renderer inferring "starting" from the absence of a result | Return an explicit status |

## Dependency Rules

- Server and `autobyteus-ts` code must not depend on, or compensate for, desktop launch env details.
- Renderer derives health text only from the main-process health result and its own status; it does not recompute main's reasons.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `buildServerProcessEnv(input)` | Backend env | Compose env | `BuildServerProcessEnvInput` without `port` | `publicServerUrl` still carries host:port for `AUTOBYTEUS_SERVER_HOST` |
| `checkServerHealth(): ServerHealthResult` | Backend health | Truthful health per status | none | ERROR → `{ status: 'error', message: 'Server is not running' }` (existing union member) |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `buildServerProcessEnv` | Yes | Yes | Low | Remove unused `port` |
| `checkServerHealth` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Backend env composer | `buildServerProcessEnv` | Yes | Yes | Low | None |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Env content | `serverRuntimeEnv.ts` | Reuse | Sole owner |
| Health answer | `ServerStatusManager` | Extend | Already knows `currentStatus` |
| Poll control | `serverStore` | Extend | Owns the poller |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `autobyteus-web/electron/server` | Env composition, preflight, status | DS-001..003 | Reuse |
| `autobyteus-web/stores` | Renderer status/health | DS-003 | Reuse |

## Draft File Responsibility Mapping / Reusable Owned Structures / Tightness

No new files or shared structures. `BuildServerProcessEnvInput` is tightened (unused `port` removed). `ServerHealthResult` unchanged.

## Final File Responsibility Mapping

| File | Owner | Change |
| --- | --- | --- |
| `autobyteus-web/electron/server/serverRuntimeEnv.ts` | Env composer | Remove `PORT`/`SERVER_PORT` keys and the `port` input; add one comment line saying the port travels only as `--port` because generic `PORT`/`SERVER_PORT` would be inherited by every agent-started program |
| `autobyteus-web/electron/server/baseServerManager.ts` | Launch | Stop passing `port` |
| `autobyteus-web/electron/server/serverStatusManager.ts` | Health answer | When not running: `currentStatus === ERROR` → `{ status: 'error', message: 'Server is not running' }`; otherwise `'starting'` as today. The in-flight branch at `:122-124` keeps returning `'starting'` unless `currentStatus` is ERROR (same rule) |
| `autobyteus-web/stores/serverStore.ts` | Renderer status | (a) poller tick: clear on RUNNING (as now); call health only when status is STARTING or RESTARTING; (b) `updateServerStatus`: when the new status is ERROR, clear `healthCheckStatus` (the STARTING-era value describes a previous state) |
| `autobyteus-web/scripts/verify-packaged-server-startup.mjs` | Build check | Drop `PORT`/`SERVER_PORT` |
| `autobyteus-web/docs/electron_packaging.md` | Doc | Remove `PORT`/`SERVER_PORT` from the Electron-owned values list; one sentence why |
| Tests (see Guidance) | — | — |

## Applied Patterns

None.

## Target Subsystem / Folder / File Mapping

Existing files only (table above). No folder changes.

## Folder Boundary Check

N/A — no placement change.

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Where to stop the leak | `buildServerProcessEnv` returns `{ ...inherited, PATH, ELECTRON_RUN_AS_NODE, DATABASE_URL, DB_TYPE, AUTOBYTEUS_DATA_DIR, AUTOBYTEUS_SERVER_HOST, ...runtimeOverrides, AUTOBYTEUS_DESKTOP_EMBEDDED_NODE }` | `delete env.PORT` in `claude-sdk-spawn-environment.ts`, `codex-app-server-client.ts`, `pty-session.ts`, … | One source vs. ~15 sinks that every new runtime must remember |
| Health in ERROR | `if (!running) return currentStatus === ERROR ? { status: 'error', message: 'Server is not running' } : { status: 'starting', … }` | Renderer string-matching main's message | Explicit rule at the owner (Principle 13) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep `PORT`/`SERVER_PORT` but strip them in each child env | Bug report option 1a | Rejected | Remove at source |
| Rename to `AUTOBYTEUS_SERVER_PORT` env | Bug report option 1b | Rejected (N/A): nothing reads a port variable; `--port` already carries it | — |
| Server deletes `PORT` from `process.env` at startup | Defense in depth | Rejected: no launcher other than Electron exports it (E4); would silently alter a user's own env | — |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Update tests to the target (they fail on base): composition without `PORT`/`SERVER_PORT` in both policies; platform launch assertions.
2. Remove the keys and the `port` input; update the caller.
3. Health ERROR rule + store poller condition + ERROR clears stale health text; tests.
4. Add the `[::]` holder conflict/recovery test.
5. Script and doc update.

## Key Tradeoffs

- Not stripping a caller's own `PORT` (DEC-002): keeps `inherit-caller` honest; a user who exports `PORT` gets it in agent shells as in their terminal.
- Not hardening the bind (FU-001): out of root cause; changes network exposure semantics.

## Risks

- R-003 (out-of-repo consumer of `PORT` in agent shells): low; supported contract is `AUTOBYTEUS_SERVER_HOST`.
- R-001 (holders started by older builds): transitional; conflict screen still names the PID.
- IPv6 unavailable on a CI host: the `[::]` test must skip with a stated reason, not fail.

## Guidance For Implementation

- Reproduction to start from: `pnpm -C autobyteus-web test:electron -- --run electron/server/__tests__/serverRuntimeEnv.spec.ts electron/server/__tests__/platformServerEnvironment.spec.ts` after changing their expectations to "no `PORT`/`SERVER_PORT`" — they fail on base and pass after the fix. Dependency probe P1 (script in investigation notes) for AC-003.
- Tests to add/change (Electron main-process + web unit layers, TESTING.md):
  - `serverRuntimeEnv.spec.ts`: production exact composition without the two keys; an explicit test, both policies, asserting `PORT` and `SERVER_PORT` are absent, with a one-line reason (AC-001). The caller env fixture must not contain `PORT` for that assertion to mean anything.
  - `platformServerEnvironment.spec.ts`: replace `toBe('31041')` for `PORT`/`SERVER_PORT` with absence; keep `args` containing the port (AC-004).
  - `BackendPortAvailability.spec.ts`: new case — holder `net.createServer().listen({ port: 0 })` (default host, `[::]` dual-stack, the incident's shape) or `listen(port, '::')`; assert `waitForBackendPort` rejects with `PortConflictError`, holder still listening; after close, `assertBackendPortAvailable` resolves (AC-005). Skip with a reason when IPv6 is unavailable.
  - `ServerStatusManager.spec.ts`: after a manager `error` event, `checkServerHealth()` returns `status: 'error'` and no `'starting'` (AC-006).
  - Store test (`stores/__tests__/`): fake timers; after an ERROR status update, advancing time makes no `checkServerHealth` IPC calls; `healthCheckStatus` cleared on ERROR; after a RESTARTING update, polling resumes; RUNNING stops it (AC-007).
- Executable validation intent (API/E2E): AC-002/AC-003 against a real backend launched with the composed env (e.g. isolated desktop instance of the worktree build, or the backend started with `buildServerProcessEnv` output): a native terminal tool command prints `PORT`/`SERVER_PORT` unset, and the P1 get-port-please call in that shell picks 24678+. AC-005 with a real `[::]` holder against the isolated instance's port, then Restart Server after closing it. All holders and instances test-owned; never touch the user's installed app or port 29695 (QR-002).
- Keep the health message text in the existing English style of `serverStore` health strings (they are not localized today).
