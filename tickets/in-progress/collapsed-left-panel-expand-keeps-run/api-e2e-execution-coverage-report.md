# API/E2E Execution Coverage Report — collapsed-left-panel-expand-keeps-run

All relative paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collapsed-left-panel-expand-keeps-run/`. Evidence: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-evidence/` (abbreviated `EV/`).

## Execution Round Meta

- Requirements Doc: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/solution-revision-record.md`
- Design Spec: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/design-spec.md` (SR-004)
- Supplemental Task Artifacts: Product `ui-ux-spec.md` + VIS-001..008 (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/`); `handoff-architecture-design-complete.md`; `product-design-request.md`; `approval-request.md`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: `N/A`
- Coverage Investigation: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `tickets/in-progress/collapsed-left-panel-expand-keeps-run/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: implementation handoff IR-001, commit `1639cba95`
- Prior Round Reviewed: none
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (not reached: this round is `Fail`)
- Proportional test-code review decision: `Not Required — direct low-risk route` (the Fail goes to failure-origin review)

## Investigation And Execution Basis

- Coverage investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`, with three evidence-driven revisions recorded in the investigation:
  - The right Team tab has no member list in this product (messages only), so SCN-A1 became "nested non-coordinator member selected in the docked tree → collapse → Workspaces".
  - An open Org worker's row is already rendered when Workspaces docks the panel, so "rows arrive late" (SCN-A4) is exercised at app start with a slow backend.
  - The projects-navigation probe was found to read the strip's page-icon order and was updated.
- Reroute required during execution: `Yes` — validation failure (FAIL-001), routed for failure-origin review.

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`; every completed case recorded immediately: `Yes`; reconciled: `Yes`
- Last durably recorded event: see ledger (DSK-001 / PMU-018 r6)

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| UNIT-FULL | Pass | Completed | `EV/web-unit-full-run.log` | 589 files / 4016 tests pass |
| PMU-017 | Pass | Completed (full run) | `EV/pmu-full-r1/` | tightened assertions |
| PMU-018 | Fail | Completed r6 | `EV/pmu-018-r6/` | Steps A–F pass (also in `EV/pmu-full-r1/`, before step G existed); step G = FAIL-001 |
| PMU-FULL | Pass | Completed | `EV/pmu-full-r1/evidence.json` | PMU-001..PMU-018 (A–F) pass |
| NAV-PROBE | Pass | Completed r3 | `EV/projects-navigation-r3/` | stale selector fixed |
| CDR-LIVE | Pass | Completed r2 | `EV/chat-draft-rows-r2/` | D04 baseline fix; D11 expectation fixed |
| DSK-001 | Fail | Completed run-4 | `EV/isolated-desktop/run-4/` | Agent + Team host journeys pass; New chat step = FAIL-001 |

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility: `No`
- Compatibility-only or legacy-retention behavior observed: `No` (path-only Chat rule replaced; inline parsers removed; D11 dead fallback removed — confirmed in the diff)
- Persisted-data transition: `N/A` (`Not Affected`)
- Durable coverage retained only for compatibility: `No`

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-FULL | AC-006/007/010/011, REQ-003/004/009, D-1..D-7 | Highlight, strip, panel, tree state, reveal composable, predicates | Vitest/jsdom | Durable | Pass | `EV/web-unit-full-run.log` |
| PMU-017 Agent/Team/Org hosts | AC-001, AC-003, AC-008, AC-011, AC-012, REQ-001..005 | Task card → Workspaces → reveal | Browser, real backend + scripted AGY | Durable, Browser | Pass | `EV/pmu-full-r1/` (`pmu-017-*.png`) |
| PMU-017 drawer 760×900 | AC-005, REQ-009 | Drawer + Escape focus return | Browser | Durable | Pass | same |
| PMU-017 short 1440×500 | AC-010, REQ-010 | Divider hidden, Settings visible | Browser | Durable | Pass | same |
| PMU-017 New chat (fresh load) | AC-009, REQ-006 | Draft/route/selection kept; nothing selected | Browser | Durable | Pass | same |
| PMU-018 A nested member | AC-002, D-5 | Fresh tree mount reopens the nested task-Team member (`…/editor`) | Browser | Durable | Pass | `EV/pmu-full-r1/` |
| PMU-018 B first send | REQ-005 | New chat first send while collapsed → Workspaces reveals the new run | Browser | Durable | Pass | same |
| PMU-018 C far Org | AC-004 | 24+ Agent rows above; reveal scrolls 921–1445 px, row visible, focused | Browser | Durable | Pass | same |
| PMU-018 D slow start | AC-004 alternate, QR-002 | User wheel before rows arrive → no jump (scrollTop 0, row hidden, not focused); no input → row revealed on arrival | Browser (GraphQL held 3000/800 ms) | Durable | Pass | same |
| PMU-018 E highlight | AC-011, DEC-005 | Org launch page with a Team still selected: neither lit; empty `/workspace`: not lit; `/agents`: Agents lit | Browser | Durable | Pass | same |
| PMU-018 F page icon | AC-006, REQ-007 | Collapsed Projects icon docks + navigates | Browser | Durable | Pass | same |
| PMU-018 G in-app New chat | REQ-009, REQ-006, AC-009 | Workspaces on New chat after viewing a Team run | Browser | Durable | **Fail** | `EV/pmu-018-r6/` |
| PMU-001..016 | Preserved Projects/left-panel journeys (REQ-007) | Regression | Browser | Durable | Pass | `EV/pmu-full-r1/` |
| NAV-PROBE B-001..B-005 | AC-010, REQ-001 | Strip page-icon order; Workspaces after the page icons | Browser, renderer-only | Durable | Pass | `EV/projects-navigation-r3/` |
| CDR-LIVE D00–D14 | REQ-008 (D02), R-002 (D11) | On-run Chat row not lit; Workspaces reopen keeps `/chat?id=` | Browser + real Codex | Durable | Pass | `EV/chat-draft-rows-r2/` |
| DSK-001 agent/team | AC-001, AC-002 (coordinator), AC-011, AC-012 | Packaged renderer | Isolated desktop instance | Temporary, Desktop | Pass | `EV/isolated-desktop/run-4/` |
| DSK-001 New chat | REQ-009, AC-009 | Packaged renderer | Isolated desktop instance | Temporary, Desktop | **Fail** (FAIL-001) | `EV/isolated-desktop/run-4/evidence.json` |

## Failure FAIL-001 — Workspaces moves focus onto a run row on New chat (no run open)

- Requirement: REQ-009 "Activating Workspaces so that the panel docks moves focus onto the revealed row (**to the Workspaces section when no run is open**)". Related: REQ-006 "When no run is open (e.g. New chat …), Workspaces **just shows the panel**", AC-009.
- Real-use steps (both surfaces):
  1. Open a Team run (docked tree).
  2. Click the docked **Chat** row (New chat, `/chat`).
  3. Collapse the panel and type a draft.
  4. Click the strip **Workspaces**.
- Expected: panel docks; focus on `[data-test="app-left-panel-run-history"]`; no run row revealed.
- Observed (browser, PMU-018 step G, `EV/pmu-018-r6/evidence.json` → `details.newChatInApp`):
  - before: Chat lit, Workspaces not lit (correct); selection store still `team_run` with focused member `/manager` (pre-existing)
  - docked on New chat, before collapsing: the tree already marks `workspace-team-member-<teamRunId>-/manager` selected (pre-existing stale highlight)
  - after Workspaces: `document.activeElement` = that Team member row; tree scrolled 773 → 844; route `/chat`, draft text and selection unchanged
- Observed (packaged desktop, DSK-001 run-4, `EV/isolated-desktop/run-4/evidence.json` → `failure`): same — `row.focused: true` on `workspace-team-transient-execution-row` of the Team-hosted worker, `selectedRows: 1`, on `#/chat`.
- Not affected: route, draft, selection store (no run newly selected), Chat/Workspaces highlight.
- Analysis (evidence for failure-origin review, not a final ruling):
  - `WorkspaceAgentRunsTreePanel.sectionState.selectedRunId` is route-aware on `/chat` (none on New chat), but `isTeamRunSelected` reads only the selection store. A Team run viewed earlier therefore stays highlighted on New chat. That code is unchanged by this diff (pre-existing).
  - `useRevealSelectedTreeRow` (new, D-4) treats any `[aria-current="true"], [aria-selected="true"]` row as the open run: it scrolls it into view and, because focus is on the Workspaces section, focuses it. The design assumed "selected row = open run"; a stale Team selection breaks that assumption when no run is shown.
  - Wider reach of the same cause: any no-run page reached in-app after a Team run (e.g. `/agents`, `/projects`) should behave the same; not separately executed.
  - Candidate fix directions for the owner: gate the reveal/focus on a run actually being shown (the D-2 "run shown" signal), and/or make the tree's Team selection route-aware on `/chat` like `selectedRunId`. Choosing between them is the owner's decision.
- Preliminary classification: `Local Fix` (bounded renderer correction inside the existing owners, protecting REQ-009/REQ-006). Recommended owner: `implementation_engineer`, subject to failure-origin review.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 75% | −5 | AC-001..AC-012 each have direct browser proof; REQ-009 (Should) fails in the in-app New-chat case | FAIL-001 |
| Changed-boundary execution directness | 85% | 95% | +10 | Real stores, routes, backend roots, real geometry for every host kind | — |
| Cross-boundary integration realism and mock gap | 80% | 95% | +15 | Real built backend, real Task roots via scripted AGY, real Codex runtime for draft rows | Scripted CLI instead of a model (no effect on the renderer boundary) |
| Environment, configuration, identity, and fixture fidelity | 80% | 90% | +10 | Nuxt dev + packaged desktop instance of this worktree's build | Dev-server path for most cases |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 90% | +15 | Far-down scroll, slow start with/without user takeover, nested member after remount, drawer, short window | Slow window > 3 s not exercised (spec permits) |
| User-surface, browser, and desktop-shell confidence | 70% | 85% | +15 | Packaged app: Agent + Team journeys pass | New chat step fails (FAIL-001); Org host and drawer not run in the packaged app |
| Durable regression coverage quality and relevance | 85% | 95% | +10 | PMU-017 tightened, PMU-018 added (incl. a reproducing step for FAIL-001), NAV-PROBE and CDR-LIVE updated | — |

- Overall post-repository confidence: 79%
- Overall final confidence: 89% (simple average)
- Every critical acceptance criterion directly proven: `Yes` for the Must ACs; REQ-009 (Should) fails in one supported scenario
- Any final applicable category below `90%`: `Yes` — requirement/AC proof (75%), user-surface/desktop (85%)
- Default 95% target met: `No`

## Broader Validation Decision And Execution

- Decision: `Required`; modes: Browser (PMU, projects-navigation, chat-draft-rows-live) + Project Desktop Validation (isolated instance).
- Startup and readiness:
  - The probes own their stacks (`evidence.stack`, warm-up).
  - Desktop:
    - `pnpm -C autobyteus-web build:electron:mac` (EXIT=0)
    - `node autobyteus-web/scripts/isolated-app/cli.mjs start --from-worktree --data-root /tmp/clp-dsk-root-osxQ`, run with the env reduced to HOME/USER/TMPDIR/LANG and `PATH=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`, so the real `agy` is not reachable
    - add `ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` and `AGY_FAKE_CASE=linked_skills` to the instance's own `server-data/.env`
    - `restart iso-58732-348d`; GraphQL ready
- Seed data: probe/driver GraphQL mutations; Task roots by scripted Manager `delegate_task`; no provider credentials; no user data.

| Scenario / Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Desktop Agent host: collapse → Task card worker → Workspaces | Lit; docks; route/selection unchanged; worker row visible+focused | As expected | `EV/isolated-desktop/run-4/dsk-001-agent-*.png`, `evidence.json` | Pass |
| Desktop Team host (task Team coordinator) | Same | As expected (route `#/workspace`, focused member kept) | `dsk-001-team-*.png` | Pass |
| Desktop New chat after Team, Workspaces | Panel shows; focus on the Workspaces section | Focus on the stale Team row | `evidence.json` `failure` | Fail |

## Desktop Application Validation

- Approach: an isolated instance of this worktree's packaged build, driven over its CDP control port (Playwright `connectOverCDP`, attach only). The same mechanism as the browser-automation attach-only path.
- Web-equivalent behavior: everything in this change; the browser probes are the main evidence.
- Shell-specific behavior: none changed. The packaged run confirms the production renderer bundle: the `ph:tree-view` icon renders, the label is "Workspaces", `redock-panel` activation, highlight, reveal and focus.
- Effect on running desktop apps: none. A foreign instance `iso-63369-6c20` (agpl-slice-2) was left untouched; the user's app/data were not used.
- Not proven in the packaged app: the Org host, the drawer, the short window and zh-CN. They are covered by the browser probe and unit tests.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64); headless Google Chrome via playwright-core; Electron packaged AutoByteus 1.4.99-beta.2 (window 1512×917 after reload).
- Viewports: 1440×620, 1440×900, 760×900, 1440×500 (PMU); 800×738, 390×844 (CDR); en-US (zh-CN in CDR D14 and unit tests).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- `Not Affected`; no persisted data read/written differently. Instance restart was used only to apply its own `.env`.

## Durable Coverage Changed In The Codebase

- Durable coverage added/updated this round: `Yes`

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-017 | Updated | AC-001/003/008/009: exact worker row, only selected row, selection/route unchanged; New chat nothing selected | Pass |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` PMU-018 (+ helpers `selectionState`, `treeSummary`, `slowGraphql`, …) | Added | AC-002/004/006/011, REQ-005/006/009, QR-002 | A–F Pass; G Fail (FAIL-001) |
| `autobyteus-web/tests/e2e/projects-primary-navigation-probe.mjs` | Updated | AC-010/REQ-001: page-icon selector excludes Workspaces; Workspaces directly follows the page icons | Pass |
| `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` D11 | Updated | The collapse control is identified by its new `data-test` (same order) | Pass |
| `autobyteus-web/tests/e2e/chat-draft-rows-live-probe.mjs` D04 | Updated (baseline fix, own commit `db0ed1c3c`) | Base `9faa6bc75` put Archive-all before "+"; select "+" by name | Pass |

- Removed paths: none.
- Docs follow-up for delivery: `TESTING.md` lists PMU-001..PMU-016; add PMU-017/PMU-018.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `EV/web-unit-full-run.log` | Unit run | Retained | |
| `EV/pmu-017-018-r1/`, `EV/pmu-018-r2..r6/` | Probe iterations | Retained | r2–r4 = probe corrections; r6 = FAIL-001 |
| `EV/pmu-full-r1/` | Full PMU regression | Retained | |
| `EV/projects-navigation-r1..r3/` | NAV-PROBE | Retained | r1 stale selector; r2 cold-cache reload |
| `EV/chat-draft-rows-r1/`, `-r2/` | CDR-LIVE | Retained | |
| `EV/isolated-desktop/` | DSK-001 driver, build log, start/restart/stop receipts, instance log, run-1..run-4 | Retained (evidence) | runs 1–3 failed on driver locators/state, not the product |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `EV/isolated-desktop/dsk-001.mjs` | Packaged-app journey | run-4: Agent/Team Pass, New chat Fail | Instance stopped; owned data root removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Agent model (AGY) | Repository scripted CLI `agy-failure-cli.mjs` (`linked_skills`) | Deterministic real tool calls, no provider spend | None at the renderer boundary |
| Slow backend | Playwright route holding GraphQL responses | Deterministic late rows | Emulated latency |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | UNIT-FULL, PMU-001..PMU-017, PMU-018 A–F, NAV-PROBE, CDR-LIVE, DSK-001 agent/team | |
| Fail | PMU-018 G, DSK-001 New chat | FAIL-001 (REQ-009) |
| Not Tested | Right-panel Team-tab member open | No such trigger in this product (Team tab is messages-only); nested member covered via the tree path |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| PMU / NAV / CDR stacks | Probe-owned | Probes' finally blocks | Processes terminated, data roots removed, ports free (receipts in each evidence file) |
| Isolated instance `iso-58732-348d` | Mine | `isolated-app stop` | Stopped; control/server ports released |
| `/private/tmp/clp-dsk-root-osxQ` | Mine (`--data-root`) | `rm -rf` | Removed |
| Leftover processes | — | `pgrep` for probe/fake CLI | None |
| Foreign instance `iso-63369-6c20` | Not mine | None | Untouched |

## Latest Authoritative Result

- Result: `Fail`
- Final validation confidence: 89%
- Default 95% target met: `No`
- Final applicable categories below 90%: requirement/AC proof (75%), user-surface/desktop (85%)
- Broader validation decision: `Required` — executed (browser + packaged desktop)
- Critical acceptance criteria lacking direct proof: none among the Must ACs; REQ-009 (Should) fails (FAIL-001)
- Preliminary classification and recommended owner: `Local Fix` → `implementation_engineer`, pending failure-origin review by `code_reviewer`
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes:
  - On re-entry, rerun at least PMU-018 (step G must pass), PMU-017, the unit suite, and the DSK-001 New chat step.
  - Observation for the Solution Designer (non-blocking): REQ-005/AC-002 name "a member opened from the right Team tab", but the right Team tab is messages-only in the current product.
