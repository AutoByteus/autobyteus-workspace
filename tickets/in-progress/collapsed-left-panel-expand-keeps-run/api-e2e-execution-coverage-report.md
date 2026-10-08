# API/E2E Execution Coverage Report — collapsed-left-panel-expand-keeps-run

All relative paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/`. Evidence: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-evidence/` (abbreviated `EV/`; on disk, not committed).

## Execution Round Meta

- Requirements Doc: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/solution-revision-record.md`
- Design Spec: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/design-spec.md` (SR-004)
- Supplemental Task Artifacts: Product `ui-ux-spec.md` + VIS-001..008 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/`); `handoff-architecture-design-complete.md`; `product-design-request.md`; `approval-request.md`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/code-review-report.md` (failure-origin review of FAIL-001, CR-001 `Local Fix`)
- Code Review Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/code-review-revision-record.md` (CRR-001)
- Delivery Revision Record: `N/A`
- Coverage Investigation: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2
- Trigger: implementation IR-002 (`d0bf3db82`), the Local Fix for CR-001 / FAIL-001
- Prior Round Reviewed: round 1 (API-REV-001, Fail, FAIL-001)
- Latest Authoritative Round: 2

## Routing Classification

- Task size: `Medium`; Architectural risk: `Low` (CRR-001 confirmed the classification)
- Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation completed before durable coverage changes or final execution: `Yes` (round 1; round 2 delta recorded there)
- Round 2 plan:
  - recheck FAIL-001 first (PMU-018 G, DSK-001 New chat)
  - add step H for the code reviewer's FO-SCN-002 (`/agents`, `/projects` after a run)
  - rerun the unit suite, full PMU and DSK-001 on a rebuilt worktree app
- Reroute required: `No`

## Prior Failure Resolution

| Failure | Round-1 Evidence | Round-2 Result | Evidence |
| --- | --- | --- | --- |
| FAIL-001: Workspaces on New chat after a Team run scrolled to and focused the stale Team row | PMU-018 G (`EV/pmu-018-r6/`), DSK-001 run-4 | Resolved. Focus is on `app-left-panel-run-history`, `scrollTop` stays 0 (the docked tree had the stale row at 773), and route, draft and selection are kept. | Browser: `EV/r2-pmu-018/`, `EV/r2-pmu-full/`. Desktop: `EV/isolated-desktop/r2-run-6/` (stale row hidden, `focused: false`, `scrollTop` 0). |

## Test-Case Ledger Reconciliation

- Ledger initialized before execution and updated after every case: `Yes`; reconciled: `Yes`

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| UNIT-FULL | Pass | Round 2 | `EV/web-unit-full-run-r2.log` | 589 files / 4021 tests pass (3 skipped) |
| PMU-017 | Pass | Round 2 full | `EV/r2-pmu-full/` | |
| PMU-018 (A–H) | Pass | Round 2 | `EV/r2-pmu-018/`, `EV/r2-pmu-full/` | G and H prove FAIL-001 / FO-SCN-002 |
| PMU-FULL | Pass | Round 2 | `EV/r2-pmu-full/evidence.json` | PMU-001..PMU-018 |
| NAV-PROBE | Pass | Round 1 r3 | `EV/projects-navigation-r3/` | Not affected by IR-002 (strip order only) |
| CDR-LIVE | Pass | Round 1 r2 | `EV/chat-draft-rows-r2/` | Not rerun. IR-002 only gates the reveal; D02/D11 assert highlight, route, panel and rows, which IR-002 does not change. PMU covers the reveal paths. |
| DSK-001 | Pass | Round 2 r2-run-6 | `EV/isolated-desktop/r2-run-6/` | Agent, Team, Org hosts + New chat after a Team run |

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`; compatibility/legacy behavior observed: `No`; persisted data: `N/A` (`Not Affected`); compatibility-only coverage: `No`
- IR-002 adds a required `runShown` input to `useRevealSelectedTreeRow` (a bounded D-4 signature change, recorded in IR-002). There is no fallback or dual path.

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-FULL | AC-006/007/010/011, REQ-003/004/006/009, D-1..D-7 (+ IR-002 run-shown gate) | Highlight, strip, panel, tree state, reveal composable, predicates | Vitest/jsdom | Durable | Pass | `EV/web-unit-full-run-r2.log` |
| PMU-017 hosts | AC-001, AC-003, AC-008, AC-011, AC-012 | Task card → Workspaces → exact worker row selected, visible, focused; route/selection/center/Projects tab kept | Browser, real backend + scripted AGY | Durable | Pass | `EV/r2-pmu-full/` |
| PMU-017 drawer / short / New chat | AC-005, AC-009, AC-010, REQ-010 | Drawer + Escape focus return; divider hidden at 500 px tall; fresh New chat selects nothing | Browser | Durable | Pass | same |
| PMU-018 A | AC-002, D-5 | Nested non-coordinator task-Team member reopened after a fresh tree mount | Browser | Durable | Pass | same |
| PMU-018 B | REQ-005 | New chat first send while collapsed → new run revealed | Browser | Durable | Pass | same |
| PMU-018 C | AC-004 | Far-down Org worker (large scroll) | Browser | Durable | Pass | same |
| PMU-018 D | AC-004 alternate, QR-002 | Slow app start: user scroll first → no jump; no input → revealed on arrival | Browser | Durable | Pass | same |
| PMU-018 E | AC-011, DEC-005 | Org launch page (Team still selected), empty `/workspace`: not lit; `/agents`: Agents lit | Browser | Durable | Pass | same |
| PMU-018 F | AC-006, REQ-007 | Collapsed page icon docks + navigates | Browser | Durable | Pass | same |
| PMU-018 G | REQ-006, REQ-009, AC-009 | In-app New chat after a Team run: focus on the Workspaces section, no scroll | Browser | Durable | Pass | `EV/r2-pmu-018/` |
| PMU-018 H | REQ-006, REQ-009 (FO-SCN-002) | `/agents` after an Agent run, `/projects` after a Team run: same | Browser | Durable | Pass | same |
| PMU-001..016 | Preserved Projects/left-panel journeys (REQ-007) | Regression | Browser | Durable | Pass | `EV/r2-pmu-full/` |
| NAV-PROBE | AC-010, REQ-001 | Strip page-icon order; Workspaces after the page icons | Browser, renderer-only | Durable | Pass (round 1) | `EV/projects-navigation-r3/` |
| CDR-LIVE | REQ-008 (D02), R-002 (D11) | On-run Chat row not lit; Workspaces reopen keeps `/chat?id=` | Browser + real Codex | Durable | Pass (round 1) | `EV/chat-draft-rows-r2/` |
| DSK-001 | AC-001, AC-002 (task Team coordinator), AC-003, AC-011, AC-012, REQ-006/009 | Packaged renderer, real window | Isolated desktop instance | Temporary, Desktop | Pass | `EV/isolated-desktop/r2-run-6/` |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 95% | +15 | Every AC-001..AC-012 and REQ-006/REQ-009 directly proven in the browser; core journeys also in the packaged app | Right Team-tab member open has no product trigger (requirement wording) |
| Changed-boundary execution directness | 85% | 95% | +10 | Real stores, routes, backend roots and geometry for every host kind and the no-run pages | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | +15 | Built backend, real Task roots (scripted AGY), real Codex for draft rows, packaged app | Scripted model (no renderer effect) |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Rebuilt worktree app after IR-002; isolated instance with owned data | Most cases on the Nuxt dev path |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 95% | +20 | Far-down scroll, slow start with/without takeover, nested member after remount, stale selections on 3 no-run pages | > 3 s history loads not exercised (spec allows it) |
| User-surface, browser, and desktop-shell confidence | 70% | 95% | +25 | Packaged app: Agent, Team, Org hosts and New chat after a Team run on a real 1512×913 window | Drawer/short window/zh-CN browser- and unit-proven only |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | PMU-017 tightened; PMU-018 A–H; NAV-PROBE, CDR-LIVE updated; D04 baseline fixed | — |

- Overall post-repository confidence: 79%
- Overall final confidence: 95% (simple average)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Residual risks:
  - a history load slower than the 3 s reveal window selects and expands but does not scroll (spec permits)
  - the pre-existing stale Team/Agent highlight on no-run pages remains, but is now inert for the reveal; out of scope

## Broader Validation Decision And Execution

- Decision: `Required`; executed as Browser (PMU, NAV-PROBE, CDR-LIVE) and Project Desktop Validation (isolated instance).
- Desktop round 2:
  - Rebuild: `pnpm -C autobyteus-web build:electron:mac`, EXIT=0. A machine restart interrupted the first attempt; its log is kept as `build-electron-mac-r2-interrupted.log`.
  - Start: `node autobyteus-web/scripts/isolated-app/cli.mjs start --from-worktree --data-root /tmp/clp-dsk-root-CVKc`, with the env reduced to HOME/USER/TMPDIR/LANG and `PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`, so the real `agy` is not reachable.
  - Scripted CLI: `ANTIGRAVITY_CLI_COMMAND` (the repository's scripted CLI) and `AGY_FAKE_CASE=linked_skills` added to the instance's own `server-data/.env`, then `restart iso-63466-7dc1`.
  - Window: OS-resized to 1512×913 with `osascript` on that instance's PID. The default 1200×768 shows the right panel as a strip (existing responsive policy), and Electron exposes no CDP `Browser` window domain.
  - Driver: `EV/isolated-desktop/dsk-001.mjs` over the control port (attach only).

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Agent host: collapse → Task card worker → Workspaces | Lit; docks; route/selection/center/tab kept; worker row visible + focused | As expected (`scrollTop` 0, already visible) | `r2-run-6/dsk-001-agent-*.png`, `evidence.json` | Pass |
| Team host (task Team coordinator) | Same | As expected (`scrollTop` 241) | `dsk-001-team-*.png` | Pass |
| Org host | Same | As expected (`scrollTop` 352, end of list) | `dsk-001-org-*.png` | Pass |
| New chat after the Team run: collapse, type, Workspaces | Chat lit, Workspaces not; panel shows; draft/route/selection kept; focus on the Workspaces section; stale row not scrolled to or focused | As expected (stale row hidden, `focused: false`, `scrollTop` 0) | `dsk-001-new-chat-workspaces.png` | Pass |

## Desktop Application Validation

- Shell-specific behavior: none changed. The packaged build confirms the production renderer bundle: icon and label, `redock-panel` activation, highlight, reveal, focus and the IR-002 gate.
- Effect on running desktop apps: none. The foreign instance record `iso-63369-6c20` was untouched; the user's app/data were not used.
- Not proven in the packaged app: the drawer, the short window and zh-CN (browser- and unit-proven).

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); headless Google Chrome (playwright-core); packaged AutoByteus 1.4.99-beta.2 (Electron), window 1512×913.
- PMU viewports: 1440×620, 1440×900, 760×900, 1440×500; en-US.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- `Not Affected`. The instance restart only applied its own `.env`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-017 | Updated (round 1) | AC-001/003/008/009 | Pass |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-018 A–G (round 1), H + G `scrollTop` check (round 2) | Added | AC-002/004/006/011, REQ-005/006/009, QR-002 | Pass |
| `autobyteus-web/tests/e2e/projects-primary-navigation-probe.mjs` | Updated (round 1) | AC-010/REQ-001 | Pass |
| `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` D11 | Updated (round 1) | Collapse control identity | Pass |
| `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` D04 | Baseline fix (round 1, commit `db0ed1c3c`) | Base `9faa6bc75` Archive-all before "+" | Pass |

- Removed paths: none. Test-code review: `Not Required — direct low-risk route`.
- Docs follow-up for delivery: `TESTING.md` lists PMU-001..PMU-016; add PMU-017 and PMU-018 (A–H).

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `EV/web-unit-full-run.log`, `EV/web-unit-full-run-r2.log` | Unit runs | Retained | |
| `EV/pmu-*` (round 1), `EV/r2-pmu-018/`, `EV/r2-pmu-full/` | PMU runs | Retained | `EV/pmu-018-r6/` = FAIL-001 reproduction |
| `EV/projects-navigation-r1..r3/`, `EV/chat-draft-rows-r1/`, `-r2/` | Round-1 probes | Retained | |
| `EV/isolated-desktop/` | Driver, build logs, start/restart/stop receipts, instance logs, runs | Retained | `run-1..4` round 1; `r2-run-1..6` round 2 (1–5 = driver/window corrections) |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `EV/isolated-desktop/dsk-001.mjs` | Packaged-app journey | r2-run-6 Pass | Instance stopped, ports released, data root removed |
| `osascript` window resize of my instance (PID-scoped) | A docked right panel needs a wide window | 1512×913 | Window closed with the instance |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Confidence Limitation |
| --- | --- | --- | --- |
| Agent model (AGY) | Repository scripted CLI (`linked_skills`) | Deterministic real tool calls, no provider spend | None at the renderer boundary |
| Slow backend | Playwright route holding GraphQL responses (PMU-018 D) | Deterministic late rows | Emulated latency |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | UNIT-FULL, PMU-001..PMU-018, NAV-PROBE, CDR-LIVE, DSK-001 | |
| Not Tested | Right-panel Team-tab member open | No such trigger in this product (the Team tab is messages-only); the nested member is covered via the tree |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| PMU stacks (round 2) | Probe-owned | Probe finally blocks | Terminated, browser closed, data roots removed |
| Instance `iso-63466-7dc1` | Mine | `isolated-app stop` | Stopped; control/server ports released |
| `/private/tmp/clp-dsk-root-CVKc` | Mine (`--data-root`) | `rm -rf` | Removed |
| Leftover processes | — | `pgrep` | None |
| Foreign record `iso-63369-6c20` | Not mine | None | Untouched |

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default 95% target met: `Yes`; no applicable category below 90%
- Broader validation decision: `Required` — executed (browser + packaged desktop)
- Critical acceptance criteria lacking direct proof: none
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct route, Medium/Low, no test-code review)
- Notes:
  - Non-blocking requirement-wording note for the Solution Designer: REQ-005 and AC-002 mention a member opened from the right Team tab, which is messages-only in this product.
  - Explicit user verification in the desktop app remains with delivery.
