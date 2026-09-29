# API/E2E Coverage Investigation — agent-isolated-app-recording

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/requirements-doc.md` (Approved; SR-009 basis, SR-010 repair, SR-011/SR-012 scope note)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md` (SR-001..SR-012)
- Design Spec (required on every route): `…/design-spec.md` (SR-012)
- Supplemental Task Artifacts: `…/evidence/` (probe images, `screencast_probe.py`; non-normative)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-005 Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-001 Pass, 9.3/10)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A — not applicable
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 source-review Pass (Large/High reviewed route) → API/E2E
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (durable test code will change)

## Current Requirement And Design Basis

Must prove on macOS (Linux excluded by user decision 2026-09-29; QR-004): REQ-001..REQ-011, REQ-013..REQ-015 (REQ-012/AC-011 withdrawn), AC-001..AC-010, AC-012..AC-014, QR-001/002/003/005/006/007, the IR-002 capability gate (SCN-001-E1), dead-process stop (SCN-001-E2), MP-003 (occlusion), MP-004/MP-005 (recording edge cases), design escalation triggers (a)–(f), and the reviewer's open executable items 1–10. Production behavior must be preserved (production env composition, updater, E2E harness, existing browser-automation tools/JSON/exit codes).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 lifecycle CLI start/list/stop/restart, registry, fixed control port | Added | REQ-001/004, DS-001/002 | Real CLI process journeys against the packaged worktree build |
| BEH-002 launch from an agent shell (`ELECTRON_RUN_AS_NODE` dropped) | Changed | REQ-003, P-1 | Launch from this unscrubbed agent shell (it carries `ELECTRON_RUN_AS_NODE=1`) |
| BEH-003 isolated server env policy (`isolated-baseline`); IR-002 gate | Changed | REQ-002, QR-003, SR-011/012 | `ps eww` + `lsof` on server child for lifecycle, harness and manual launches; allowlist completeness via real server features |
| BEH-004 disabled update controller | Changed | REQ-009, DS-004 | Renderer IPC state + idle toast observation; stale harness assertion must be updated |
| BEH-005 attach-only; helper auto-install | Added | REQ-005/006, DS-005 | MCP stdio + CLI against the Electron instance and real Chrome |
| BEH-006 overlays; `start_recording`/`stop_recording` worker | Added | REQ-007/008, DS-006/007 | ffprobe + frame inspection; long run RSS; occlusion; concurrency; cross-process stop |
| BEH-007 async arrows | Changed | REQ-013 | CLI run-script on a live tab |
| BEH-008 worktree build → isolated instance | Added | REQ-014 | `start --from-worktree` and `start --build` |
| BEH-009 guide + skills | Added | REQ-010/011 | Doc review; skill-first fresh AutoByteus agent run |
| Production composition, harness, existing MCP tools | Preserved | QR-005/007, BEH preserved columns | Existing suites + tool-list check + main-app checkpoints |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `buildServerProcessEnv` policy | vitest serverRuntimeEnv/platformServerEnvironment (pure) | Real server child env; server features needing a dropped variable (trigger d) | Lifecycle + `ps eww`/`lsof`; live server feature use |
| API / transport / contract | Yes | lifecycle JSON/exit codes; MCP tools; CLI | node tests (injected deps); mcps unit + real-Chrome | Real CLI process, real ports, MCP stdio against Electron | CLI / MCP stdio live |
| Frontend component / state | Yes | `appUpdateStore` `disabled`, About panel | Nuxt vitest | Real IPC from `DisabledAppUpdater` | Renderer IPC probe over CDP |
| Browser integration / user journey | Yes | helper overlays, recording on real pages | mcps real-Chrome integration | Electron renderer target | CLI/MCP against isolated instance |
| Authentication / session / permissions | Yes (provider keys) | importer into isolated DB | none in ticket | Real import + restart + model use | Live AC-014 |
| Desktop renderer / web-equivalent UI | Yes | update UX, helper on AutoByteus UI | Nuxt vitest | Packaged renderer | CDP on packaged build |
| Desktop shell / Electron-specific | Yes | e2e profile, updater IPC, CDP port, occlusion switches | vitest (mocked Electron) | Real Electron main | Packaged app (only surface that proves it) |
| Process / lifecycle | Yes | detached groups, registry, restart, dead-process stop, recorder worker | node tests with fakes; mcps real-Chrome recording | Real process groups, port release, main app safety | Lifecycle live |
| Persisted-data transition | No | `Not Affected` (ephemeral registry/recording files) | — | — | — |
| Worker / queue / distributed | Yes | recorder worker cross-invocation | mcps real-Chrome (CLI) | MCP concurrency, cross-MCP-process stop, 5-min memory | MCP stdio + long run |
| External integration | Yes | ffmpeg, Playwright CDP vs Electron, importer | real-Chrome only | Electron screencast, occlusion | Live |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording` (branch `codex/agent-isolated-app-recording`, HEAD `ca3a336bc`); mcps `/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording` (HEAD `9b7448c`)
- Project type and runtime stack: pnpm monorepo (Nuxt 3 + Electron desktop, Node 22 server); Python 3.13 `uv` project for browser-automation (Playwright, FastMCP)
- Conflicting, missing, or unclear project instructions: No repo-level AGENTS.md; `autobyteus-web/AGENTS.md` gives test commands. Packaged probe `test:e2e:electron:isolation` is stale against this change (see inventory).
- Required environment variables or secrets available: `Yes` — no secret needed except AC-014's user key source; prior established practice (ticket `agent-team-hierarchical-handoffs` API-REV-026/028 evidence) used `/Users/normy/.autobyteus/server-data/.env` as the key source with the unchanged importer. Values are never logged.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-web/AGENTS.md` | Web test guide | `pnpm test:nuxt <file> --run`; `pnpm test:electron`; never `git add .` |
| `autobyteus-web/package.json` | scripts | `test:e2e:electron:isolation` = `node tests/e2e/electron-launch-profile-probe.mjs` (`--skip-build --executable`) |
| root `package.json` | scripts | `pnpm isolated-app …`; `pnpm secrets:import -- --source --database-url` |
| `docs/isolated-app-instances.md`, `skills/autobyteus-isolated-app/SKILL.md` | product guide / skill | exact commands for start/list/stop/restart, attach-only env, importer via `script` |
| mcps `browser-automation/README.md`, `SKILL.md`, `tests/integration/*` | tool docs / tests | `uv run --frozen --extra test pytest`; real suites need `BROWSER_AUTOMATION_REAL_TESTS=1` |
| implementation-handoff §Environment | setup | `pnpm install` + `nuxi prepare` done; `uv sync --extra test`; worktree build at `autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Isolated instance(s) (worktree build) | workspace root | `pnpm isolated-app start --from-worktree [--control-port 9333/9334]` | control 9333/9334 loopback; auto root in `$TMPDIR` | CLI readiness (health + `/json/list`) | `pnpm isolated-app stop <id>` |
| Browser-automation CLI | task evidence dir | `env CHROME_REMOTE_DEBUGGING_PORT=<p> BROWSER_AUTOMATION_ATTACH_ONLY=1 bash <mcps>/browser-automation/scripts/browser …` | uv frozen env | JSON `ok` | stateless |
| Browser MCP (stdio) | evidence dir | `scripts/browser-mcp` via Python MCP client | same env vars | `list_tools` | client exit |
| Real Chrome (mcps integration) | mcps | pytest fixtures | temp profiles | fixture | fixture teardown |
| Main AutoByteus app (production, pid 59472, port 29695) | — | not owned — **never signalled** | — | `/rest/health` checkpoint | none (not owned) |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Isolated data roots | lifecycle auto roots | never overlaps `~/.autobyteus` (profile guard) | removed by `stop` |
| Provider keys | unchanged `pnpm secrets:import` from user key source | target only the isolated `databaseUrl`; production DB/vault not opened | root removed at stop |
| Production-like caller env | this agent shell (real production vars) + controlled sentinels in probes | never point sentinels at real production paths in durable probes | temp dirs removed |
| Marker-less app | APFS clone `cp -cR` of the worktree `.app` with marker deleted; installed 1.4.91-beta.5 | never modify the shared build or `/Applications` | clone deleted |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design §Persisted Data / State Transition Decision; handoff §Persisted Data Transition Check
- Representative existing-data setup and required behavior: production `~/.autobyteus` must stay untouched (QR-003) — covered as isolation, not migration
- Evidence planned: no-open-files and env inspection; production DB not opened by importer
- Migration-specific scenarios: N/A
- Upstream ambiguity: None

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/scripts/isolated-app/__tests__/*.node-test.mjs` | lifecycle branches, registry, CLI, readiness with injected deps | REQ-001/004, SCN-001-E1/E2 | Still Valid | reviewer 55/55 | Re-run |
| `autobyteus-web/scripts/electron-launch/__tests__/*.node-test.mjs` | overlay drops `ELECTRON_RUN_AS_NODE`, ports, gate/AppImage, process groups | REQ-003, SR-011/012 | Still Valid | — | Re-run |
| `autobyteus-web/scripts/electron-e2e/__tests__/*.node-test.mjs` | harness session/adapters | preserved harness | Still Valid | — | Re-run |
| `autobyteus-web/electron/server/__tests__/{serverRuntimeEnv,platformServerEnvironment,BaseServerManager}.spec.ts` | both policies; production parity | REQ-002, QR-003 | Still Valid | — | Re-run |
| `autobyteus-web/electron/updater/__tests__/{appUpdater,disabledAppUpdater}.spec.ts` | controller contract | REQ-009 | Still Valid | — | Re-run |
| `autobyteus-web/stores/__tests__/appUpdateStore.spec.ts`, `components/settings/__tests__/AboutSettingsManager.spec.ts` | `disabled` quiet, About neutral | REQ-009/AC-008 | Still Valid | — | Re-run |
| `autobyteus-web/tests/integration/isolated-launch-marker.integration.test.ts` | marker committed + packaged | SR-011 | Still Valid | — | Re-run |
| `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` E2E-PKG-001/002/003 **backend-env assertion** `Backend child did not preserve caller sentinel` for `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `SERPER_API_KEY`, `AUTOBYTEUS_E2E_CALLER_SENTINEL` | Old contract: e2e server inherits the full caller env (superseded AC-014 of `electron-e2e-runtime-isolation`) | REQ-002, QR-003, handoff "Accepted consequence of REQ-002" | Needs Update | design D-1 allowlist; handoff §Important Assumptions last bullet | Assert allowlisted (`CODEX_HOME`, `HOME`) present and non-allowlisted sentinels + production-like `AUTOBYTEUS_*`/`DB_NAME` absent |
| same probe E2E-PKG-002 **updater assertion** `Updater IPC handler is registered in E2E mode` must be false (before and after 9 s) | Old contract: no updater in e2e | REQ-009, DS-004 | Needs Update | design D-2 `DisabledAppUpdater` | Assert handler answers `status:'disabled'` before/after delay; check/download return `disabled`; install/set-channel refused; still no update check in log |
| same probe: main-process sentinel preservation, paths, traffic, invalid profiles, parallel, allocation race | e2e profile contract | preserved BEH-001 | Still Valid | launch overlay still passes caller env to Electron main | Keep |
| mcps `tests/unit/*` | attach-only, script, presentation, recording service, CLI/MCP mapping | REQ-005..008/013 | Still Valid | reviewer pass | Re-run |
| mcps `tests/integration/test_presentation_real_chrome.py` | helper install-on-use, actions, errors, overlays, OBSCURED | AC-005/006 | Still Valid | — | Re-run (real Chrome) |
| mcps `tests/integration/test_recording_real_chrome.py` | background recording across CLI calls, target_closed, errors, MP-005 | AC-007, MP-005 | Still Valid | — | Re-run |
| mcps `tests/integration/test_mcp_transports_real.py` | stdio/HTTP MCP inventory = 9 + 2 | QR-007 | Still Valid | — | Re-run; extend |
| mcps other integration suites (`cli`, `runtime`, `launcher_black_box`, `skill_contract`) | pre-existing behavior | QR-005 | Still Valid | — | Re-run |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| `electron-launch-profile-probe.mjs` `inspectReadyProcessTree` | backend child preserves caller provider keys and arbitrary caller sentinel | REQ-002 isolated-baseline policy intentionally drops them | requirements REQ-002; design D-1/DS-003; handoff "Accepted consequence" | Same function, inverted to allowlist-present / non-allowlist-absent assertions | — |
| `electron-launch-profile-probe.mjs` `exerciseRendererJourney` updater block | update IPC handler absent in e2e | DS-004 registers `DisabledAppUpdater` | REQ-009, design D-2 | Same block asserting the `disabled` contract | — |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / AC / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| DUR-LC | Real `pnpm isolated-app` CLI against a packaged build from a caller env carrying `ELECTRON_RUN_AS_NODE=1` and production-like variables: start JSON, loopback-only control port, server env isolation, zero opens under the protected root, list, concurrent second instance, `CONTROL_PORT_IN_USE`, stop (group gone, ports free, root removed), restart (same id/ports/root, new tab id, flags kept), dead-process stop, `INSTANCE_NOT_FOUND`, gate refusal on a marker-less bundle clone (start refused with nothing launched; restart refused with the instance still running) | AC-001/002/003/004-alt, REQ-003, QR-002/003, SCN-001-E1/E2 | `autobyteus-web/tests/e2e/isolated-app-lifecycle-probe.mjs` + script `test:e2e:isolated-app` | No repository test crosses the real CLI → Electron → server process boundary; node tests use injected fakes |
| DUR-MCP-REC | Recording through the MCP stdio adapter with concurrent tool calls during the screencast and `stop_recording` from a second MCP process | REQ-008, design guidance (concurrent MCP calls), reviewer item 6 | mcps `tests/integration/test_mcp_transports_real.py` | Existing recording tests use the CLI only |
| DUR-MCP-AO | Attach-only through the MCP stdio adapter: nothing listening → tool error `BROWSER_UNAVAILABLE`, no browser launched | REQ-005, AC-004 alt | mcps `tests/integration/test_mcp_transports_real.py` | Attach-only has unit coverage only |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / AC / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| E2E-PKG-001/002/003 | `autobyteus-web/tests/e2e/electron-launch-profile-probe.mjs` backend env | allowlist present / non-allowlist + production-like vars absent; add production-like `AUTOBYTEUS_*`, `DB_NAME`, `DATABASE_URL` sentinels pointing at the controlled production root | AC-002 (harness path) | Controlled HOME keeps real production untouched |
| E2E-PKG-002 | same, updater | `disabled` contract | AC-008, REQ-009 | — |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| R-01 | `node --test scripts/isolated-app/__tests__/*.node-test.mjs scripts/electron-launch/__tests__/*.node-test.mjs scripts/electron-e2e/__tests__/*.node-test.mjs` | `autobyteus-web` | lifecycle/gate/launch units | Planned | `api-e2e-evidence/repo/` |
| R-02 | `pnpm exec vitest run --config ./electron/vitest.config.ts electron/server electron/updater` | `autobyteus-web` | env policy, updater | Planned | same |
| R-03 | `pnpm test:nuxt --run stores/__tests__/appUpdateStore.spec.ts components/settings/__tests__/AboutSettingsManager.spec.ts tests/integration/isolated-launch-marker.integration.test.ts` | `autobyteus-web` | renderer disabled state; marker | Planned | same |
| R-04 | `uv run --frozen --extra test pytest tests/unit` | mcps `browser-automation` | mcps units | Planned | same |
| R-05 | `BROWSER_AUTOMATION_REAL_TESTS=1 uv run --frozen --extra test pytest tests/integration` | mcps | real Chrome helper/recording/MCP (+ new DUR-MCP-*) | Planned | same |
| R-06 | `node tests/e2e/electron-launch-profile-probe.mjs --skip-build --executable <worktree build>` | `autobyteus-web` | harness path AC-002/AC-008 (updated) | Planned | same |
| R-07 | `node tests/e2e/isolated-app-lifecycle-probe.mjs` (new) | `autobyteus-web` | DUR-LC | Planned | same |

## Test-Case Ledger Plan

- Ledger required: `Yes` — ~20 independent live cases, several long-running (5-min recording, `--build`, fresh-agent run); credible context-compression risk.
- Canonical ledger path: `…/api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Case granularity: one scenario/journey per case

| Case ID | Case / Journey | Requirement / AC IDs | Boundary / Execution Surface | Planned Command Or Entry Point | Planned Order | Evidence Expected |
| --- | --- | --- | --- | --- | --- | --- |
| R-01..R-07 | repository suites (above) | all | repo | above | 1 | test output |
| L-01 | Start from unscrubbed agent shell; JSON; readiness time; window; loopback-only | AC-001, REQ-003, QR-001, QR-002 | CLI → Electron | `pnpm isolated-app start --from-worktree` | 2 | JSON, `lsof`, timing |
| L-02 | Lifecycle-path isolation: server env, open files, UI shows no production agents | AC-002, QR-003, trigger (a) | server child | `ps eww`, `lsof -g`, GraphQL | 3 | env/open-file dumps |
| L-03 | Manual env launch with production vars (documented variables) | AC-002 | raw executable | `env -u ELECTRON_RUN_AS_NODE AUTOBYTEUS_ELECTRON_LAUNCH_PROFILE=e2e …` | 4 | same |
| L-04 | Allowlist completeness: real server features in isolated mode (GraphQL, agent/skill listing, terminal PTY, file explorer, runtimes, agent run) | trigger (d) | server | GraphQL/WS + UI | 5 | responses, server log scan |
| L-05 | Updates disabled: idle ≥2 min, no toast; About "Disabled" | AC-008, REQ-009 | renderer IPC | CDP | 6 | DOM/IPC, screenshots |
| L-06 | Two instances + main app; stop one; dead-process stop; unknown id; control port busy; bad data root; missing app | AC-003, AC-001 alt, AC-004 alt | lifecycle | CLI | 7 | JSON, `ps`, `lsof` |
| L-07 | MCP adapter attach-only: tool list 9+2; list/attach/screenshot; nothing listening → error, no Chrome | AC-004, QR-007 | MCP stdio | Python MCP client | 8 | tool outputs |
| L-08 | Helper on the AutoByteus renderer: first use, actions by selector/text, reload, non-user untouched, async arrow; overlay screenshots | AC-005, AC-006, AC-012 | CLI run-script on Electron | browser launcher | 9 | results, screenshots |
| L-09 | Recording on the instance: ≥3 calls, ffprobe, frames with cursor/caption; errors; `isolated-app stop` mid-recording → `target_closed`; ffmpeg missing | AC-007 | CLI | launcher | 10 | MP4, frames |
| L-10 | Occluded/minimized instance window recording | MP-003, trigger (c) | worker + Electron | CDP minimize + recording | 11 | frame diffs |
| L-11 | 5-minute recording at 2400×1536 with RSS sampling | QR-006 | worker | launcher + `ps` | 12 | RSS series, ffprobe |
| L-12 | MCP: concurrent calls during screencast on Electron; stop from a different MCP process | reviewer item 6 | MCP stdio | Python MCP clients | 13 | outputs, MP4 |
| L-13 | Importer via `script`, then `restart`; provider configured; model usable; production DB not opened | AC-014, REQ-015 | importer + lifecycle | `script -q /dev/null pnpm secrets:import …` | 14 | summary logs, UI |
| L-14 | IR-002 gate: installed app refused (nothing launched); `restart` after marker removal refused, instance still running; AppImage refusal without execution | SCN-001-E1, AC-001 alt | lifecycle | CLI | 15 | JSON, `ps` |
| L-15 | `start --build` end to end | AC-013, REQ-014 | build + lifecycle | CLI | 16 | build log, JSON |
| L-16 | Skill-first fresh AutoByteus agent: start → screenshot → record → stop | AC-010, REQ-011 | AutoByteus agent run in an isolated host instance | agent run | 17 | agent transcript, MP4 |
| L-17 | Guide/skill command and code consistency | AC-009 | docs | review | 18 | notes |
| L-18 | Main app unaffected checkpoints (before/during/after) | REQ-004, preserved | process | `ps`, health | throughout | checkpoints |

## Post-Repository Confidence Scorecard

Repository results: R-01 55/55, R-02 103/103, R-03 49/49, R-04 138 passed, R-05 24/24 real Chrome (2 new), R-06 updated packaged probe 5/5 (negative control on the pre-change app fails as intended), R-07 new lifecycle probe 6/6.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | AC-001/002/003/008/012 plus the gate proven by the probes; helper/recording on real Chrome | AC-004 (MCP vs Electron), AC-005/006/007 on Electron, AC-009/010/013/014, QR-006, MP-003 | Live cases L-01..L-17 |
| Changed-boundary execution directness | 85% | Probes drive the real CLI and packaged app | MCP adapter vs Electron, importer, `--build`, agent path | L-07, L-12..L-16 |
| Cross-boundary integration realism and mock gap | 82% | Real processes in probes | Real production-variable shell, model use, nested agent shell | L-01..L-04, L-16 |
| Environment, configuration, identity, and fixture fidelity | 85% | Controlled sentinels | The real agent shell and real key source | L-01, L-13 |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | Dead-process stop, refusals, conflicts, restart | `target_closed` via lifecycle, occlusion, 5-min memory, importer errors | L-09..L-13 |
| User-surface, browser, and desktop-shell confidence | 75% | Harness renderer journey | Update UI rendering, helper overlays in video on Electron | L-05, L-08, L-09 |
| Durable regression coverage quality and relevance | 88% | Updated + new probes, new MCP tests | Opt-in probes | — |

- Overall post-repository confidence: 83% (simple average)
- Every critical acceptance criterion directly proven: `No` (at this point)
- Any applicable category below `90%`: `Yes` — all seven → broader validation required
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: live-only boundaries listed above

Final scores after broader validation are in the execution report: 94.9%, no category below 90%, and every critical AC directly proven.

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: `Lifecycle` + `CLI` + `Project Desktop Validation` (packaged worktree build) + MCP stdio + `Worker`
- Specific confidence gap: repository tests use fakes for processes, Electron and the server child; the changed boundaries (process env of a real server child, real process groups/ports, Electron screencast, MCP adapter, importer) are only provable live.
- Why the selected mode can materially improve confidence: it executes the exact agent path (agent shell → CLI → packaged Electron → server; browser-automation CDP → Electron renderer).
- Expected confidence after: ≥95% if all live cases pass.
- Browser-specific decision and rationale: a plain-browser Nuxt dev path cannot prove Electron-main behavior (e2e profile, updater IPC, CDP port, occlusion switches, server child env). The shell itself is the changed surface, so the packaged app is required. It runs as a separate isolated instance and does not disrupt the user's app — the safety property under test.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (packaged, macOS arm64, ad-hoc signed worktree build)
- Relevant README or development instructions: `autobyteus-web/README.md#packaged-electron-e2e-launches`, `docs/electron_packaging.md`, root guide
- Web-equivalent behavior: helper actions/overlays (also covered on real Chrome), About panel rendering (vitest)
- Shell-specific or lifecycle behavior: e2e profile, server env, updater IPC, remote debugging port, occlusion, process groups
- Chosen validation approach: packaged worktree build launched through the product's own lifecycle command (the feature under test) plus the existing packaged probe
- Effect on any already-running desktop application: `None` — the main app (pid 59472, port 29695) is never signalled; checkpoints confirm it
- Behavior not directly proven: Linux (user decision)

## Live Environment And Fixture Plan

- Startup order: repository suites → probes → live CLI cases (single instance on 9333, second on 9334) → long runs → build → fresh-agent run
- Environment choices: this agent shell unscrubbed (carries `ELECTRON_RUN_AS_NODE=1` and production `AUTOBYTEUS_*`/`DB_NAME`/`DATABASE_URL`); ffmpeg 8.0.1; macOS 26.5.2
- Health / readiness: lifecycle readiness; `/rest/health`; `/json/list`
- Seed data: none beyond importer keys and UI-created demo agent (AC-010)
- Evidence: `…/api-e2e-evidence/` (JSON outputs, env/lsof dumps, screenshots, MP4 samples/frames, RSS series)
- Owned processes/state to clean: instances started here (by id), clones, temp roots, recordings state

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| L-04, L-10, L-11, L-13, L-15, L-16 | shell/Python probes under `api-e2e-evidence/scripts/` | allowlist completeness, occlusion, long run, importer, build, agent run | Host-/credential-/time-dependent (5-min run, full build, model access, window manager); not suitable for CI-style repository tests |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Linux (AppImage marker, extracted layout, sandbox, display) | User decision 2026-09-29 (QR-004) | Linux-only defects | User validates after delivery |
| Production instance update UX live | Would require controlling the user's production app | Low: production path is byte-identical (parity tests), unchanged `AppUpdater` | Covered by existing unit/component tests |
| Minimized-window recording | Electron has no CDP `Browser.setWindowBounds`; user waived it in-session ("we don't have to do that just to test it") | Low: occluded-window case (MP-003) proven; guide documents the minimized limitation for non-isolated Chrome | None |

## Ambiguities Or Reroute Triggers

No reroute. Two non-blocking observations recorded during execution (details in the execution report):

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| OBS-1: isolated backend port binds `*` like production (control port is loopback as required) | Out of approved scope (pre-existing server binding) — separate-ticket candidate | `live/L-01/listeners.txt` | Solution Designer (optional follow-up) |
| OBS-2: `pnpm isolated-app` leaks `npm_config_prefix` into the app launch env → Electron login-shell PATH loses nvm → `pnpm` not on PATH for agents inside a lifecycle-started instance | Out of approved ACs; candidate bounded `Local Fix` in the launch overlay if the owner wants PATH fidelity | `live/L-16/agent-transcript.txt`, reproduction in the execution report | Code Reviewer / Solution Designer decision |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes` (executed)
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added DUR-LC `isolated-app-lifecycle-probe.mjs`, DUR-MCP-REC, DUR-MCP-AO; updated `electron-launch-profile-probe.mjs`)
- Post-repository confidence: 83% → final 94.9% (execution report)
- Broader validation decision: `Required` — executed, all cases Pass
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: evidence under `…/api-e2e-evidence/`
