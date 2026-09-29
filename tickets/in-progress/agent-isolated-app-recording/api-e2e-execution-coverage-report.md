# API/E2E Execution Coverage Report — agent-isolated-app-recording

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/requirements-doc.md`
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec (required on every route): `…/design-spec.md` (SR-012)
- Supplemental Task Artifacts: `…/evidence/` (non-normative)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-005 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A — not applicable
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger (when used): `…/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 source-review Pass (reviewed Large/High route)
- Prior Round Reviewed: N/A (first round)
- Latest Authoritative Round: 1

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording`; evidence root `…/api-e2e-evidence/`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `…/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Deviations: L-10 used a native occluding window instead of CDP minimize (Electron has no `Browser.setWindowBounds`); minimized-window recording was waived by the user ("we don't have to do that just to test it"). L-16 ran inside an isolated host instance (not the user's production app) to avoid writing an agent definition into production data.
- Existing coverage decisions revised during execution: new probe R-07 initially asserted *every* instance listener is loopback; evidence showed the embedded backend keeps its pre-existing `*` binding (same as production `*:29695`), so the assertion was narrowed to the control endpoint (QR-002 scope). Refusal cases were given explicit free control ports (gate/port ordering is correct product behavior).
- Reroute required before or during execution: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `…/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`
- Long-running case checkpoints recorded when needed: `Yes` (L-11 Started → Completed; L-15 Started → Completed)
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: L-18 Completed
- Cases still running, interrupted, or not started: none
- Interruption note: the user interrupted twice for status; no case lost state (L-11 kept running in the background and completed).

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| R-01 | Pass | Completed | `api-e2e-evidence/repo/R-01-node-tests.log` | 55/55 |
| R-02 | Pass | Completed | `repo/R-02-electron-vitest.log` | 103/103 |
| R-03 | Pass | Completed | `repo/R-03-nuxt-vitest.log` | 49/49 (incl. packaged marker) |
| R-04 | Pass | Completed | `repo/R-04-mcps-unit.log` | 138 passed |
| R-05 | Pass | Completed | `repo/R-05-mcps-integration.log` | 24/24 real Chrome (2 new) |
| R-06 | Pass | Completed | `repo/R-06-launch-profile/`, `repo/R-06-negative-control-installed/` | updated probe 5/5; negative control fails as intended |
| R-07 | Pass | Completed | `repo/R-07-isolated-app-lifecycle/` | new probe 6/6 |
| L-01 | Pass | Completed | `live/L-01/` | OBS-1 recorded |
| L-02 | Pass | Completed | `live/L-01/` | — |
| L-03 | Pass | Completed | `live/L-03/` | — |
| L-04 | Pass | Completed | `live/L-04/` | — |
| L-05 | Pass | Completed | `live/L-05/` | — |
| L-06 | Pass | Completed | `live/L-06/` | — |
| L-07 | Pass | Completed | `live/L-07-L-12/` | — |
| L-08 | Pass | Completed | `live/L-08/` | — |
| L-09 | Pass | Completed | `live/L-09/` | — |
| L-10 | Pass | Completed | `live/L-10/` | minimized state waived |
| L-11 | Pass | Completed | `live/L-11/` | — |
| L-12 | Pass | Completed | `live/L-07-L-12/` | — |
| L-13 | Pass | Completed | `live/L-13/` | — |
| L-14 | Pass | Completed | `live/L-14/` | — |
| L-15 | Pass | Completed | `live/L-15/` | — |
| L-16 | Pass | Completed | `live/L-16/` | OBS-2 recorded |
| L-17 | Pass | Completed | ledger row | — |
| L-18 | Pass | Completed | `live/L-18-main-app-after.txt` | — |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` (`Not Affected`; only ephemeral registry/recording files, all cleaned)
- Durable coverage added or retained only for compatibility-only behavior: `No` — the stale probe assertions that encoded the superseded "full caller env reaches the e2e server" and "no updater IPC in e2e" contracts were updated to the approved contracts.
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| L-01 / LC-001 | REQ-001, REQ-003, AC-001, QR-001, QR-002 | CLI → detached Electron → server; CDP port | real CLI from an unscrubbed agent shell (`ELECTRON_RUN_AS_NODE=1` + production vars) | Live + Durable | Pass | ready 3.1–3.6 s; JSON fields; control 9333 on 127.0.0.1 only; main app has no CDP port |
| L-02 / L-03 / R-06 / LC-001 | REQ-002, AC-002, QR-003, trigger (a) | server child env; open files; package/skill roots | lifecycle, manual documented launch, E2E harness | Live + Durable | Pass | server env = baseline + Electron-owned only; 0 production files open; 2 built-in agents; negative control on the pre-change app fails |
| L-04 | trigger (d) | server features in isolated mode | GraphQL, terminal WS/PTY, runtime detection, agent run | Live | Pass | 5/5 runtimes equal production; PTY with git/codex/claude/node/uv; model-backed agent run (L-16) |
| L-05 / R-06 | REQ-009, AC-008 | `DisabledAppUpdater` IPC; renderer | CDP on packaged renderer; harness | Live + Durable | Pass | `disabled` before/after 9 s and after 3m47s idle; no toast; Updates panel "Disabled" |
| L-06 / LC-002..005 | REQ-004, AC-003, AC-004 alt | registry, process groups, ports | real CLI | Live + Durable | Pass | two instances beside main; stop frees group/ports/root; dead-process stop `wasRunning:false`; conflicts/ids |
| L-07 / DUR-MCP-AO | REQ-005, AC-004, QR-007 | MCP stdio adapter, attach-only | Python MCP client | Live + Durable | Pass | 11 tools (9 + 2); attach/list/screenshot; dead port → `BROWSER_UNAVAILABLE`, no browser |
| L-08 | REQ-006, REQ-007, REQ-013, AC-005, AC-006, AC-012 | helper auto-install; async arrows | CLI run-script on AutoByteus renderer | Live (+ existing real-Chrome durable) | Pass | all actions by text/selector; structured errors; reinstall after reload; non-users untouched |
| L-09 | REQ-008, AC-007 | recorder worker, ffmpeg | CLI across 6 calls | Live | Pass | 31.5 s MP4; cursor, ripple, paced typing, captions; error codes |
| L-10 | MP-003, trigger (c) | occluded window screencast | native occluder + recording | Live (temporary) | Pass | counter advances in frames while fully covered |
| L-11 | QR-006 | worker/ffmpeg memory | 5-min recording 2400×1536 | Live (temporary) | Pass | 302.9 s, 7573 frames; RSS flat |
| L-12 / DUR-MCP-REC | reviewer item 6 | MCP concurrency; cross-process stop | Python MCP clients | Live + Durable | Pass | 15 concurrent calls, 0 errors; stop from second MCP process |
| L-13 | REQ-015, AC-014 | importer → isolated vault; restart | `script` + importer; lifecycle restart | Live | Pass | non-TTY refused; CONFIGURED 10; restart; providers Configured; production key untouched; `target_closed` |
| L-14 / LC-006 | SCN-001-E1, AC-001 alt (SR-011/012) | capability gate | real CLI | Live + Durable | Pass | installed app refused before port check; restart refused with instance alive; AppImage/low contract not executed |
| L-15 | REQ-014, AC-013 | `--build` | real CLI + full macOS build | Live | Pass | 307 s; rebuilt bundle started; stdout one JSON value |
| L-16 | REQ-011, AC-010 (+ AC-014 model use) | skills → agent → lifecycle + browser CLI | fresh AutoByteus agent run | Live | Pass | start → screenshot → 7.3 s clip → stop by the agent alone |
| L-17 | REQ-010, AC-009 | docs | review vs CLI help/source | Doc review | Pass | codes/flags/links consistent |
| L-18 | REQ-004 (main app never affected) | process safety | checkpoints | Live | Pass | main app pids/start time/health unchanged |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-05a | `BROWSER_AUTOMATION_REAL_TESTS=1 uv run --frozen --extra test pytest tests/integration/test_mcp_transports_real.py -k "concurrent_calls or attach_only"` | mcps `browser-automation` | new durable MCP tests alone | Pass (2/2) | `repo/R-05a-new-mcp-tests.log` |
| R-06-neg | `node tests/e2e/electron-launch-profile-probe.mjs --skip-build --executable /Applications/AutoByteus.app/Contents/MacOS/AutoByteus` | `autobyteus-web` | negative control: updated assertion detects the pre-change leak | Fails as intended (`OPENAI_API_KEY` inherited) | `repo/R-06-negative-control-installed/` |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 96% | +16 | Every in-scope AC (AC-001..010, 012..014) and QR-001/002/003/005/006/007 proven on the real surface | Linux (user decision); production-app update UX only via parity/unit tests |
| Changed-boundary execution directness | 85% | 96% | +11 | Real CLI → packaged Electron → server; real CDP/MCP; real importer; real model | Build-failure branch unit-only |
| Cross-boundary integration realism and mock gap | 82% | 95% | +13 | No mocks on the live path; nested agent-shell launch; MCP from separate processes | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 93% | +8 | Unscrubbed production-variable shell; real key source; real macOS window manager | OBS-2: pnpm-launched instances resolve a login PATH without nvm (outside approved ACs) |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | +10 | Dead-process stop, restart, `target_closed`, gate refusals, port conflicts, ffmpeg missing, non-TTY importer, occlusion, 5-min run | Minimized-window recording not exercised (waived by user) |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Packaged renderer DOM + screenshots + video frames; disabled update UI; helper on real UI | zh-CN rendering not inspected |
| Durable regression coverage quality and relevance | 88% | 94% | +6 | Updated packaged probe (with negative control), new lifecycle probe, 2 new MCP real-process tests | Probes are opt-in (need a packaged build / real Chrome), not default CI |

- Overall post-repository confidence: 83%
- Overall final confidence: 94.9% (simple average of the seven categories: 96, 96, 95, 93, 95, 95, 94)
- Calculation method: simple average
- Confidence change produced by broader validation: +12 points; it closed every live-only boundary (process env, process groups, CDP/Electron screencast, MCP adapter, importer, model use, agent workflow)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` — marginally (94.9%). The remaining gaps cannot be closed by further in-scope validation: Linux and the minimized window were excluded by the user, OBS-2 lies outside the approved acceptance criteria, and the durable probes are opt-in by design of the repositories' executable-probe pattern.
- Confidence-limiting residual risks: OBS-2; Linux unvalidated; opt-in durable probes.

## Broader Validation Decision And Execution

- Decision and selected execution mode: `Required` — Lifecycle + CLI + packaged desktop app + MCP stdio + worker
- Material deviation: occlusion via a native covering window (Electron lacks CDP window control); minimized case waived by the user
- Confidence gap addressed: real process/env/port/screencast/importer/agent boundaries
- Startup order: repository suites → probes → single instance (9333) → second instance (9334 clone) → long run in background → importer/restart → agent run → `--build`
- Environment choices: this agent shell unscrubbed (carries `ELECTRON_RUN_AS_NODE=1`, production `AUTOBYTEUS_*`, `DB_NAME`, `DATABASE_URL`); macOS 26.5.2 arm64; Node 22.23.1; ffmpeg 8.0.1; Electron Chrome/148
- Seed data / identities: provider keys imported with the unchanged importer from `~/.autobyteus/server-data/.env` (established team practice) into the isolated DB only; demo agent "Tutorial Recorder" created in the isolated host instance; all deleted with the data roots

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| Start from agent shell | JSON; ready; loopback control | 3.6 s; 9333 on 127.0.0.1 | `live/L-01/start.json`, `listeners.txt` | Pass |
| Isolation | no production env/files/agents | 15 baseline/Electron vars; 0/92 production opens; 2 built-in agents | `live/L-01/server-env.txt`, `open-files.txt` | Pass |
| Updates disabled | no toast; "Disabled" | `disabled`; 0 toasts; panel neutral | `live/L-05/` | Pass |
| Helper on real UI | actions + errors + reinstall | all pass | `live/L-08/` | Pass |
| Recording (CLI, MCP, occluded, 5 min) | MP4s with overlays; bounded memory | 4 MP4s verified by ffprobe + frames; RSS flat | `live/L-09..L-12/` | Pass |
| Keys + restart | configured; model usable; production vault untouched | CONFIGURED 10; Anthropic answers; key file unchanged | `live/L-13/`, `live/L-16/` | Pass |
| Gate | refusals launch nothing | installed refused; restart refused while running | `live/L-14/` | Pass |
| `--build` | builds and starts | 307 s, rebuilt, started | `live/L-15/` | Pass |
| Fresh agent with skills | start → screenshot → record → stop | completed; 7.3 s clip | `live/L-16/` | Pass |

## Desktop Application Validation

- Validation approach executed: packaged worktree build launched through the product's own lifecycle command, the updated packaged E2E probe, and the new lifecycle probe
- Browser-tested web-equivalent behavior: helper and recording also on real Chrome (mcps integration)
- Shell-specific or lifecycle behavior and evidence: e2e profile, server env policy, updater IPC, CDP port, occlusion switches, process groups (L-01..L-16)
- Effect on any already-running desktop application: `None` — main app pid 59472/60384 unchanged (start 05:37), health 200 at every checkpoint
- Behavior not directly proven: Linux; minimized window

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 (25F84), arm64
- Runtime and relevant framework versions: Node 22.23.1, pnpm 10, Python 3.13 (uv frozen), Electron (Chrome/148.0.7778.265), app 1.4.91-beta.4 worktree build (enterprise flavour), installed production app 1.4.91-beta.5
- Browser / engine: Google Chrome (mcps integration), Electron renderer
- Viewport: window 1200×800 @2x (2400×1536 frames); locale de system, app English

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: production `~/.autobyteus` protected (0 opens; production vault key atime/mtime unchanged)
- Result: registry/recording ephemeral files cleaned; no production writes observed
- Version-specific runtime branch observed: `No`
- Residual untested persisted-data risk: none

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| workspace `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` (E2E-PKG-001/002/003/004) | Updated | REQ-002/AC-002 (harness path), REQ-003, REQ-009/AC-008 | Pass 5/5; negative control fails on the pre-change app | backend env: allowlisted present, 11 production-like/provider sentinels absent, own `DATABASE_URL`; `ELECTRON_RUN_AS_NODE` removed from the prepared env; updater answers `disabled`, actions refused; raw launches drop `ELECTRON_RUN_AS_NODE` like a documented manual launch |
| workspace `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` (LC-001..006) | Added | REQ-001/002/003/004, AC-001/002/003, QR-001/002/003, SCN-001-E1/E2 | Pass 6/6 | real CLI against a packaged build from an agent-like caller env; probe-owned registry via `TMPDIR` |
| workspace `autobyteus-web/package.json` script `test:e2e:isolated-app` | Updated | runner | — | one line |
| mcps `browser-automation/tests/integration/test_mcp_transports_real.py::test_stdio_mcp_recording_survives_concurrent_calls_and_stops_from_another_process` | Added | REQ-008, design guidance (concurrent MCP calls), reviewer item 6 | Pass | real Chrome, ffmpeg |
| mcps `…::test_stdio_mcp_attach_only_reports_unavailable_and_never_launches_a_browser` | Added | REQ-005, AC-004 alt | Pass | no profile dir created; port stays closed |

## Tests Removed As Stale Or Obsolete

None removed. Two stale assertion blocks were updated in place (see investigation "Stale Or Obsolete Coverage Decisions").

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` (updated)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` (added)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/autobyteus-web/package.json` (script added)
  - `/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording/browser-automation/tests/integration/test_mcp_transports_real.py` (2 tests added)
- Paths removed: none
- Added or updated paths attached for proportional test-code review: `Yes`
- Changes are uncommitted working-tree changes in both worktrees (no commit was requested).

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `…/api-e2e-evidence/repo/` | suite logs, probe evidence JSON | Retained | — |
| `…/api-e2e-evidence/live/` | JSON outputs, env/lsof dumps, screenshots, MP4s (≈14 MB total), frame sheets, RSS series, agent transcript | Retained | secret values never logged |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/scripts/ledger.py` | ledger checkpointing | ledger rows | kept (evidence tooling) |
| `api-e2e-evidence/scripts/terminal-probe.mjs` | exercise terminal WS/PTY (L-04) | `live/L-04/terminal.txt` | kept; no process left |
| `api-e2e-evidence/scripts/cdp-call.mjs`, `cdp-window.mjs` | CDP `Page.reload` (L-08); window domain probe (not supported by Electron) | L-08 reload evidence | kept |
| `api-e2e-evidence/scripts/mcp_probe.py` | MCP stdio against Electron (L-07/L-12) | `live/L-07-L-12/report.json` | kept |
| `api-e2e-evidence/scripts/occluder.swift` (+ compiled `/tmp/ab-occluder`) | cover the window (MP-003) | `live/L-10/` | binary deleted |
| `api-e2e-evidence/scripts/long_recording.sh` | QR-006 5-min run + RSS | `live/L-11/rss.csv` | kept |
| APFS clone `/tmp/abclone/AutoByteus.app` | marker removal without touching the shared build | L-14 | deleted |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| "Covered window" | native opaque AppKit window over the instance frame | no other permission-free way to occlude a specific window | equivalent to user windows for macOS occlusion; minimized state not covered |
| Old app builds in R-07 | fake `.app`/`.AppImage` sentinel bundles | durable and cheap; real installed app refused live in L-14 | none material |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | R-01..R-07, L-01..L-18 | All in-scope requirements and acceptance criteria proven |
| Not Tested | Linux (QR-004), minimized-window recording | User decisions 2026-09-29 (Linux) and in-session waiver (minimized) |
| Out Of Scope | OBS-1, OBS-2 (see Evidence / Notes) | Observations outside the approved acceptance criteria; non-blocking |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Instances iso-9333-c818, iso-9334-c01d, iso-9335-32d8 (agent-owned), iso-9333-0006, probe instances | this run | `isolated-app stop` / probe teardown | groups gone, ports free, roots removed, registry empty |
| Manual launch (L-03) | this run | SIGTERM own group; root removed | done |
| APFS clone, `/tmp/abiso-*`, `/tmp/abman-*`, occluder binary | this run | deleted | done |
| Recorder workers / state | this run | stopped via `stop-recording` | none left |
| Worktree build | shared | rebuilt by L-15 (same source), bundle intact with marker | usable |
| Main AutoByteus app | user (not owned) | never signalled | unchanged |

## Preliminary Classification

N/A — Pass. Observations are non-blocking recommendations:

- **OBS-1 (pre-existing, outside QR-002):** the isolated embedded backend binds its port on all interfaces (`*:<serverPort>`), exactly like the production server (`*:29695`). The control (CDP) endpoint is loopback-only as required. Separate-ticket candidate if isolated backends should be loopback-only.
- **OBS-2 (new, environment fidelity, outside approved ACs):** `pnpm isolated-app …` runs as a pnpm script, which injects `npm_config_prefix` (and other `npm_*`/`INIT_CWD`/`node_modules/.bin` PATH entries) into the launch environment. Electron main's unchanged login-shell PATH resolution (`electron/utils/shellEnv.ts`) sources `~/.bashrc`, where nvm refuses to initialize ("nvm is not compatible with the npm_config_prefix environment variable"). Instances started through the lifecycle therefore lack the nvm `bin` on PATH. In L-16 an agent inside such an instance got `pnpm: not found` for the documented command and had to fall back to the corepack `pnpm.cjs`. It still succeeded. Agents in the production app (the primary scenario) are unaffected. Suggested bounded fix: the lifecycle launch overlay drops npm-script variables (`npm_config_*`, `npm_lifecycle_*`, `npm_package_*`, `PNPM_SCRIPT_SRC_DIR`, …) before spawning the app. Owner decision: Solution Designer/Code Reviewer.

## Recommended Recipient

`/code_reviewer` (proportional test-code review of the durable test changes).

## Evidence / Notes

- OBS-2 reproduction: `npm_config_prefix=/Users/normy/.local /bin/bash -lc 'source ~/.bashrc; printf %s "$PATH"'` → 0 nvm entries, with the nvm error; without the variable → nvm entries present. Instance leader env contains `npm_config_prefix`; isolated server PATH lacks `~/.nvm/versions/node/v22.21.1/bin` that the production server PATH has.
- Code-review non-blocking notes CR-C-04/07/08 unchanged by this round.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 94.9%
- Default `95%` confidence target met: `No` (marginal; residual gaps are user-waived or outside approved scope)
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` — executed
- Critical acceptance criteria lacking direct proof: None
- Required next recipient: `/code_reviewer` for proportional test-code review
- Notes: Linux validation remains the user's post-delivery step (QR-004).
