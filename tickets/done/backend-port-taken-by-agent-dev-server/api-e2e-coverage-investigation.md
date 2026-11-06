# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (Ready, SR-001)
- Supplemental Task Artifacts: `bug-report.md`, `evidence/app.log`, `evidence/server-last-session.log`, `evidence/port-holder-snapshot.txt`, `follow-ups.md`
- Design Review Report: `N/A — not applicable` (architecture review not selected; `task_size=Small`, `architectural_risk=Low`)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route; no Code Reviewer on this route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md` (created this round)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1 (initial)
- Trigger: Implementation Engineer handoff, IR-001, direct route (message from `implementation_engineer_464d10d3bb2d4c5d97649039fcc423eb`, 2026-11-06)
- Prior Investigation Reviewed: `N/A` — first round
- Latest Authoritative Investigation: this document

## Current Requirement And Design Basis

The desktop launcher's `buildServerProcessEnv` (`autobyteus-web/electron/server/serverRuntimeEnv.ts`) stopped injecting `PORT`/`SERVER_PORT` (the backend's own port) into the embedded backend's child environment, which every agent runtime and native-terminal-tool child process inherits (REQ-001, BEH-001/BEH-002). The backend keeps listening on the same port/address via `--port` only (REQ-002). Preflight conflict detection/no-kill policy for a foreign holder is unchanged production code; only regression coverage for the incident's `[::]` dual-stack holder shape was added (REQ-003, BEH-004/005). `ServerStatusManager.checkServerHealth` now answers truthfully in `ERROR` (`'Server is not running'`, not the STARTING-era text), and `serverStore`'s fallback poller now calls health only in `STARTING`/`RESTARTING` and clears stale `healthCheckStatus` on `ERROR` (REQ-004, BEH-006). The packaged-startup verification script and the packaging doc mirror the removal (REQ-005, AC-008).

Implementation (`c8ec06b51`, docs-only `26b6ca34d` on top, no further code changes) matches the design spec's Final File Responsibility Mapping exactly: `serverRuntimeEnv.ts`, `baseServerManager.ts` (one caller), `serverStatusManager.ts`, `stores/serverStore.ts`, `scripts/verify-packaged-server-startup.mjs`, `docs/electron_packaging.md`, plus the five test files. No design impact or escalation trigger was raised.

Per `implementation-handoff.md` § "API / E2E / Executable Coverage Investigation And Execution Still Required": AC-002, AC-003, and the real-process variant of AC-005 are explicitly left to this role; AC-001, AC-004, AC-006, AC-007, AC-008, and the unit-level AC-005 are already covered by the implementation's Checks Run (IMP-01..IMP-07).

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (desktop launch composes the env), SCN-002 (an agent/native-terminal-tool child inherits the composed env and a program it starts reads `PORT`), SCN-003 (recover from a port conflict), SCN-004 (error screen / health text).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger: the requirements doc's UC-002 names both "any runtime" and "the native terminal tools" as the real trigger for SCN-002. `autobyteus-web/components/workspace/tools/Terminal.vue`/`TerminalPanel.vue` is the product's native terminal tool; its backend counterpart, `autobyteus-ts/src/tools/terminal/pty-session.ts`, spawns the shell with `environment ?? process.env` — i.e. it inherits the exact process env of whichever Node process owns the PTY session (the backend process for the desktop's embedded server), which is the literal mechanism BEH-002 describes. This is the real sink the fix protects; no separate repository coverage exists for it today (it is correctly out of scope per the design's Ownership Boundaries — the sink is "correct once the source is clean" and must not gain port-stripping logic of its own).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): none recorded in the requirements doc.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 (env composition) | Changed | design-spec.md DS-001; implementation diff `serverRuntimeEnv.ts`/`baseServerManager.ts` | Durable unit coverage added (`serverRuntimeEnv.spec.ts`, `platformServerEnvironment.spec.ts`); AC-002's real-process half still needed |
| BEH-002 (agent/tool-shell inheritance) | Changed (consequence of BEH-001; no sink-side code change) | design-spec.md DS-001 "consequence" | No durable sink-side test exists or is wanted (Ownership Boundaries); needs a real-process/executable probe, not a unit test (AC-002/AC-003) |
| BEH-004/BEH-005 (conflict detection / recovery) | Preserved, with new regression coverage for the incident's `[::]` shape | design-spec.md DS-002; `BackendPortAvailability.spec.ts` new case | Real-socket unit test now exists (IMP-01); the full `BaseServerManager`-orchestrated Start/Restart flow (IPC → renderer ERROR display → recovery) has no test at any level for any holder shape, before or after this ticket — a pre-existing gap, not introduced here |
| BEH-006 (health text / poller condition) | Changed | design-spec.md DS-003; `serverStatusManager.ts`/`serverStore.ts` diff | Durable unit coverage added (`ServerStatusManager.spec.ts`, new `stores/__tests__/serverStore.spec.ts`); rendered check is optional per requirements doc UI section (text-only) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | Yes (store only, no component template change) | `serverStore` poller condition / health text | `serverStore.spec.ts` (new, fake timers) | None material: text-only change, requirements doc marks rendered check optional | None required |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No (no template/visual change) | — | — | — | — |
| Desktop shell / Electron-specific integration | Yes | Embedded-server env composition (`buildServerProcessEnv`), health answer (`ServerStatusManager`) | Unit tests with real sockets/mocked manager | Whether a real OS child process spawned with the composed env actually lacks `PORT`/`SERVER_PORT`, and whether a real dependent package (get-port-please) actually picks its own range under that real env (AC-002/AC-003) | Project Desktop Validation / executable probe against a real backend process |
| Process / lifecycle | Yes | Port-conflict detection/recovery (unchanged code) | `BackendPortAvailability.spec.ts` real-socket test (IMP-01) | The full `BaseServerManager` Start/Restart orchestration with a real `[::]` holder, in the real product (pre-existing gap, not introduced by this ticket) | Project Desktop Validation (isolated instance) |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (get-port-please is an external dependency the fix is validated against) | Whether a real external package reacts to the absent `PORT` as expected | Investigation probe P1 (scratch, not committed) reproduced this on 2026-11-06 | Not yet reproduced against the actual implementation's composed env in this round | Executable probe reusing P1's shape |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/backend-port-taken-by-agent-dev-server`
- Project type and runtime stack: pnpm monorepo; `autobyteus-web` (Nuxt + Electron main), `autobyteus-server-ts` (Fastify/Prisma backend), Node v26.12.0
- Project testing guideline path(s): `TESTING.md` (repository root; no closer `TESTING*.md` between root and the changed paths)
- Conflicting, missing, or unclear project instructions: None
- Changed build-input paths vs. the Fresh-Start Build list: `git diff --name-only 666b881b5...26b6ca34d` touches only `autobyteus-web/electron/**`, `autobyteus-web/stores/**`, `autobyteus-web/scripts/verify-packaged-server-startup.mjs`, `autobyteus-web/docs/**`, and ticket docs/evidence — none match the guideline's Fresh-Start Build trigger list (no manifest/lockfile/tsconfig/workflow/contract-package change). Fresh-Start Build Proof: Not Required.
- Required environment variables or secrets available: `N/A` — no real provider keys needed for this round (desktop-shell env/process checks only)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § "Choosing the path" | Desktop-shell behavior needs Electron main-process tests + an isolated desktop instance | Already-run Electron main-process suite (IMP-01/02) plus an isolated-instance / direct-process check close the remaining gap |
| `TESTING.md` § "Isolated desktop instance" / `docs/isolated-app-instances.md` | How to launch a disposable, test-owned desktop app instance | `pnpm --silent isolated-app start --build` / `--from-worktree`; own data root, own port, system-baseline env; `stop <instanceId>` cleans up |
| `TESTING.md` "One heavy run at a time" / "Serialize builds and dev servers" | Safety rule for this worktree | Do not run the isolated-app build concurrently with another build/E2E/probe in this worktree |
| `TESTING.md` § "Rerun by impact" | Reuse rule | No code changed since `c8ec06b51` (docs-only `26b6ca34d` on top) — IMP-01..IMP-07 are reusable as `Reused` cases |
| `investigation-notes.md` Runtime/Probe table (P1) | Reusable probe shape for AC-003 | `getPort({portRange:[24678,24698]})` against the real `get-port-please@3.2.0` already present in the workspace (`node_modules/.pnpm/get-port-please@3.2.0`) |
| `design-spec.md` § "Guidance For Implementation" | States the two acceptable executable-validation shapes for AC-002/003 | "launch a backend with the composed env (e.g. isolated desktop instance of this worktree build, or the backend started directly with `buildServerProcessEnv`'s output)" |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Real backend process (`autobyteus-server-ts/dist/app.js`), launched with the real `buildServerProcessEnv` output | worktree root | `node autobyteus-server-ts/dist/app.js --port <test port> --data-dir <test-owned dir>` with env from an actual `buildServerProcessEnv(...)` call (`inherit-caller` policy, production-shaped inputs) | Test-owned port (never 29695), test-owned data dir under `/tmp` | `GET /rest/health` returns 200 | `SIGTERM` the child; remove the temp data dir |
| Real `get-port-please@3.2.0` package already in the workspace | n/a | `import('…/node_modules/.pnpm/get-port-please@3.2.0/node_modules/get-port-please/dist/index.mjs')` | Read-only import, no install needed | Resolves a number | n/a (no state) |
| Isolated desktop instance (AC-005 real-process variant) | worktree root | `pnpm --silent isolated-app start --build` (builds `autobyteus-web/electron-dist` once, then launches) | Own data root + own ports (`--server-port` fixed to a free test port for the hold/release sequence); never port 29695 or the user's app | `start` waits for `/rest/health` + main window on the control port | `pnpm --silent isolated-app stop <instanceId>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Backend data dir for the direct-process probe | A fresh `mktemp -d` under the OS temp dir | Never the user's `~/.autobyteus` or the backend's production data root | Removed after the probe |
| Isolated instance data root | `isolated-app start` auto-creates one unless `--data-root` is given | Never overlaps production paths (enforced by the tool) | Auto-removed on `stop` (no `--keep`) |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: `design-spec.md` § "Persisted Data / State Transition Decision"; `implementation-handoff.md` § "Persisted Data Transition Check"
- Representative existing-data setup and required behavior: N/A — no stored data, settings, or node URLs change
- Evidence planned: N/A
- Migration-specific scenarios: N/A
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/electron/server/__tests__/serverRuntimeEnv.spec.ts` | `buildServerProcessEnv` composes the backend env without `PORT`/`SERVER_PORT`, both policies | AC-001, REQ-001 | Still Valid (already updated by implementation this round) | `IMP-01` log; diff review (this round) | Reuse as `Reused` evidence (IMP-01) |
| `autobyteus-web/electron/server/__tests__/platformServerEnvironment.spec.ts` | Platform-manager spawn env lacks `PORT`/`SERVER_PORT`; `args` still carries `--port` | AC-004, REQ-002 | Still Valid | `IMP-01` log; diff review | Reuse (IMP-01) |
| `autobyteus-web/electron/server/__tests__/BackendPortAvailability.spec.ts` | Real-socket `[::]` dual-stack holder → `PortConflictError`, no kill, recovers after close | AC-005 (unit level), REQ-003 | Still Valid | `IMP-01` log; diff review | Reuse (IMP-01); real-process variant still needed (this round's AE-02) |
| `autobyteus-web/electron/server/__tests__/ServerStatusManager.spec.ts` | After an `error` event, `checkServerHealth()` answers `{status:'error', message:'Server is not running'}` | AC-006, REQ-004 | Still Valid | `IMP-01` log; diff review | Reuse (IMP-01) |
| `autobyteus-web/stores/__tests__/serverStore.spec.ts` (new) | Fallback poller only calls health in STARTING/RESTARTING; `healthCheckStatus` cleared on ERROR | AC-007, REQ-004 | Still Valid | `IMP-03` log; diff review | Reuse (IMP-03) |

No existing durable test asserts the removed `PORT`/`SERVER_PORT` presence any more (both spec files were updated in place per the design's Removal / Decommission Plan); none is stale/orphaned.

## Planned Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| AE-R-01 | AC-001 | Desktop shell (env composition) | Reused | `IMP-01` (`serverRuntimeEnv.spec.ts` within the targeted run) | Ran on `c8ec06b51`; no code changed since (`26b6ca34d` is docs-only) |
| AE-R-02 | AC-004 | Desktop shell (platform manager spawn env) | Reused | `IMP-01` (`platformServerEnvironment.spec.ts`) | Same |
| AE-R-03 | AC-005 (unit level) | Process lifecycle (preflight) | Reused | `IMP-01` (`BackendPortAvailability.spec.ts`) | Same |
| AE-R-04 | AC-006 | Desktop shell (health answer) | Reused | `IMP-01` (`ServerStatusManager.spec.ts`) | Same |
| AE-R-05 | AC-007 | Frontend store | Reused | `IMP-03` (`stores/serverStore.spec.ts`) | Same |
| AE-R-06 | AC-008 | Build-check script | Reused | `IMP-06` (`verify-packaged-server-startup.mjs` run against a real built backend) | Same |
| AE-R-07 | — (regression net) | Electron main-process suite / web typecheck / guards | Reused | `IMP-02`, `IMP-04`, `IMP-05` | Same |
| AE-01 | AC-002, AC-003 | Desktop shell → agent/tool-shell inheritance (real process) | Temporary Probe | Start the real backend with the real `buildServerProcessEnv` output (production-shaped `inherit-caller` inputs, test-owned port/data dir); confirm health; spawn a child with that exact env printing `PORT`/`SERVER_PORT` (expect both unset); in the same env, call the real `get-port-please@3.2.0` `getPort({portRange:[24678,24698]})` (expect 24678-24698, not the backend's test port) | Why not durable: a real-process, real-dependency, real-OS-env-inheritance proof is expensive/slow and environment-shaped (exact `get-port-please` version/behavior); the durable regression coverage for the composition itself already exists (AE-R-01/02). This is the explicit "Executable probe (P1 shape)" / "Executable check against a real backend process" the requirements doc calls for |
| AE-02 | AC-005 (real-process variant) | Process lifecycle, Electron main-process orchestration | Temporary Probe (Project Desktop Validation) | Start an isolated desktop instance on a fixed test-owned port; stop it (keep data root); hold that port with a real `[::]` listener; start the instance again on the same port/data root (exercises the same `BaseServerManager.startServer()` orchestration a Start/Restart Server click does); expect readiness failure with the conflict surfaced and the holder still listening; close the holder; start again; expect success | Why not durable: a full packaged-Electron-app lifecycle check is costly to run in CI and the project has no existing orchestration-level test at any layer for this path (pre-existing gap); a repository-resident test already covers the detection function itself (AE-R-03) |
| AE-03 | BEH-001/002/004/005 regression confidence, desktop-shell lifecycle | Desktop shell, full real-app process | Temporary Probe (Project Desktop Validation) | Added mid-round after AE-02's structural finding. On the already-built worktree app: start a clean (no-conflict) isolated instance on a test-owned port/data root; confirm health; `isolated-app restart`; confirm health again; stop | Why not durable: an already-built, one-off full-app lifecycle smoke check; the real regression coverage for the underlying behavior is the durable unit tests (AE-R-01..05); this closes the residual "does the real packaged app still start/restart cleanly post-fix" confidence gap cheaply, since the build was already needed for AE-02 |

- Test progress log needed: `Yes` (AE-02 is a long-running case: build + multiple start/stop cycles)

## Durable Coverage To Add

None. The required durable regression coverage (AE-R-01..05) was already added by the Implementation Engineer and matches the design's Removal / Decommission Plan; AE-01/AE-02 are real-process probes the project's own test philosophy keeps out of the repository (the project already tests the equivalent preflight function with real sockets, not a full orchestrated process, per `BackendPortAvailability.spec.ts`'s existing pattern).

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan (When Applicable)

- Desktop framework / shell: Electron (main process owns embedded-server launch/lifecycle; renderer is Nuxt)
- Testing guideline, README, or development instructions used: `TESTING.md` § "Choosing the path", § "Isolated desktop instance"; `docs/isolated-app-instances.md`
- Web-equivalent behavior: None changed (no renderer template/visual change; the store's poller/text change has durable unit coverage with fake timers, and the requirements doc marks the rendered check optional for a text-only change)
- Shell-specific or lifecycle behavior: env composition (BEH-001/002) and port-conflict Start/Restart orchestration (BEH-004/005) are both main-process/lifecycle behavior
- Chosen validation approach and why it fits the project: a direct real-process check for AE-01 (lighter, proves the real sink mechanism without a full app build) and an isolated instance for AE-02 (the only way to exercise the real `BaseServerManager` orchestration end to end, per the testing guideline's own mapping of desktop-shell lifecycle behavior to "Electron main-process tests + an isolated desktop instance")
- Server/frontend setup when browser validation is used: N/A — no browser/renderer assertions planned (BEH-006's rendered check is optional and already unit-proven; AE-02 asserts on the isolated-app CLI's own JSON result and log, not the rendered error screen)
- How the run avoids disturbing an already-running desktop application: both cases use test-owned ports/data roots; AE-01 never starts Electron at all; AE-02 uses `pnpm isolated-app`, which never touches the user's installed app, port 29695, or `~/.autobyteus` (QR-002)

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Startup order and commands: AE-01 — real backend process first (health-checked), then the env-inheritance/get-port-please checks against it, then teardown. AE-02 — `isolated-app start --build` once (builds `electron-dist`), `stop` (keep data root), hold the port, `start` again on the same port/data root, assert failure, release the holder, `start` again, assert success, then `stop` (no `--keep`).
- Environment choices that materially affect the run: AE-01 uses `inherit-caller` policy with a production-shaped caller env snapshot (matches the normal installed-app launch, where the leak was reported); AE-02 fixes `--server-port` to a free test-owned port so the hold/release sequence targets a known port.
- Health / readiness checks: AE-01 polls `GET /rest/health`; AE-02 uses the CLI's own readiness wait and JSON result / `APP_EXITED_BEFORE_READY`/`READINESS_TIMEOUT` codes.
- Seed data / fixtures: none beyond a fresh temp data dir (AE-01) / the instance's auto-created data root (AE-02).
- Test identities, authentication, permissions, or session state: none needed.
- Requirement-linked journeys or scenarios: SCN-002 (AE-01), SCN-003 (AE-02).
- DOM, screenshot, log, API, process, or other evidence to capture: AE-01 — the backend's health response, the child's printed env, the get-port-please result, all logged. AE-02 — the CLI's JSON results and the instance log file for both the conflict attempt and the recovery attempt.
- Owned processes and temporary state to clean up: AE-01's backend child process and temp data dir; AE-02's isolated instance and its holder socket.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-006/AC-007 rendered check (error screen's "technical details" text and polling behavior, visually) | Requirements doc's UI section marks this optional for a text-only change; already proven at the unit level (IMP-01, IMP-03) with the exact message string and timer behavior asserted | Low — no visual/layout change, only a string value already asserted verbatim | No | None — optional per approved requirements doc |
| AC-005 real-process variant: the full `BaseServerManager` Start/Restart orchestration (conflict -> `ServerStatusManager` ERROR -> no-kill -> recovery) in a real desktop-app process, for any holder shape | Structural, discovered executing AE-02: only the `production` launch profile reaches this orchestration, and it is hard-wired to port 29695 and the real user data dir (`electronLaunchProfile.ts`); the only test-owned profile (`e2e`, used by every `isolated-app` mechanism) takes a different fast-fail preflight (`e2eLaunchPreflight.ts`) for a port conflict, by design, and never reaches `BaseServerManager`. QR-002/`TESTING.md` Rule 2 forbid using the `production` profile to reach it. See `evidence/AE-02-ac005-real-process-attempt.log` | Low — unchanged production code; the actual detection/no-kill/recovery function (`assertBackendPortAvailable`/`waitForBackendPort`) both profiles' preflights call is real-socket tested with the incident's `[::]` shape and a post-close recovery assertion (IMP-01) | No | `follow-ups.md` FU-006 (this round) — a testing-infrastructure change to let `e2e` reach the real orchestration safely |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: Both planned temporary probes are test-owned and use real processes/dependencies (no mocks) to close the specific confidence gap the implementation handoff left open (AC-002/AC-003, AC-005's real-process variant). Everything else is reused from the implementation round per `TESTING.md`'s rerun-by-impact rule.
