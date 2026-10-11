# API/E2E Execution Coverage Report — delegated-copy-task-locator

Paths are relative to `tickets/in-progress/delegated-copy-task-locator/` unless they start with a package name.
Evidence is under `api-e2e-evidence/`.

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec: `design-spec.md` (SR-004)
- Supplemental Task Artifacts: Product `ui-ux-spec.md`, `VIS-001..014` (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-copy-task-locator/`)
- Design Review Report: `design-review-report.md` (ARCH-REV-002)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Large`; architectural risk: `High`
- Input route: `Reviewed`; successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Investigation completed before durable coverage changes or final execution: `Yes`. Exception: the one-line
  `onOpenTeamRun` additions to five fixture pages (C-002) were made just before the investigation file was
  written; they are recorded there.
- Plan followed: `Yes`, with these revisions found during execution:
  - C-002 was larger than missing `onOpenTeamRun`. Fixture pages that render task rows now issue
    `GetTaskWorkerTasks` and open `/ws/projects` against a dead backend port, so probes that fail on browser
    errors failed. Fixed with a shared fixture helper (see Durable Coverage).
  - The base comparison (TESTING.md Rule 9) found four fixture probes that already fail on `359d2c0ef`. One
    had a small test-side cause and is fixed; three are reported (see Residual And Reported Items).
  - User direction mid-round: rewrite `TESTING.md` as the global testing strategy with an update policy.
- Reroute required: `No`.

## Test-Case Ledger Reconciliation

- Ledger initialized before execution: `Yes`; every completed run recorded: `Yes`; reconciled: `Yes`.

| Case ID | Final Result | Last Event | Evidence | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| REPO | Pass | 1 | `repo/summary.txt` | — |
| PMU-020..PMU-025 | Pass | 5 | `pmu-full/evidence.json` | Earlier tries failed on harness assumptions only (events 2–4) |
| PMU-001..PMU-019 | Pass | 5 | `pmu-full/evidence.json` | Includes PMU-018 / PMU-019 (BEH-008) |
| FX nested-team-hierarchy | Pass | 8 | `fixture-probes-3/nested-team-hierarchy/` | Branch-caused failure fixed by the helper |
| FX team-group-icon | Pass | 7 | `fixture-probes-2/team-group-icon/` | Branch-caused failure fixed by the helper |
| FX task-agent-peer-sidebar | Pass | 8 | `fixture-probes-3/task-agent-peer-sidebar/` | Helper + baseline fix (`GetRunFileChanges`) |
| FX composer-mention-discoverability, standalone-agent-error-stop | Pass | 6 | `fixture-probes/` | — |
| FX nested-team-aggregate-status | Fail (base) | 7 | `fixture-probes-2/`, `fixture-probes-base/` | Same NTAS-BR-002 failure on base; branch errors removed; reported |
| FX background-agent-renderer-contention | Fail (base) | 8 | `fixture-probes-2/`, `fixture-probes-base/`, `diag-bgc/` | Same BG-BROWSER-004 failure on base; reported |
| FX team-activity-presentation | Fail (base) | 8 | `fixture-probes-3/`, `fixture-probes-base/` | Same harness failure on base; not affected by this branch; reported |
| TCT BR-001..006, 008, 009, 012, 013 | Pass | 8 | `task-closure-tree/evidence.json` | — |
| DESK | Pass | 9 | `desktop/desktop-result.json` | — |

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`. No legacy retention observed. Persisted data:
  `Not Affected` followed (the locate choice persists through `projectsPanelStore.choose`; PMU-021 reload check).
- Durable coverage for compatibility-only behavior: `No`.

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / REQ / AC | Changed Boundary | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PMU-020 | BEH-001; REQ-001, 002, 008, 010; AC-001, 002, 003, 016; QR-001 | Server read → GraphQL → store → rows (Agent and Team hosts) | Browser + live GraphQL, built backend, real tools | Durable | Pass | One batched `GetTaskWorkerTasks` covering all 5 listed workers; no Task-list reads; 11/16 px, 400, `rgb(128,128,128)`, gap 2 px, text aligned (0 px); Team row 400 + ellipsis; elbow / chevron / name centre at 14 px; rows 46 / 28 px; hover `rgb(67,56,202)` underline 2 px; members, sub-work and `@` collaborator one line; GraphQL answers null for sub-work and collaborator |
| PMU-021 | BEH-002, BEH-009; REQ-003..007; AC-004..007, 009, 013, 014 | Tree → shell → panel → board → card | Browser | Durable | Pass | Docked on Files → Projects tab, picker switched from manual Project B to A; card focused, wash `#eef2ff` + inset `#6366f1` (`task-live`), gone after 2.4 s; center / selection / tree unchanged; Temp tasks; Enter opens; back from open Task; only latest of two highlighted; search kept / cleared; Tab ring indigo-500, Enter / Space locate without opening the row; choice remembered after reload; agent row click opens the copy, summary `#4338ca`; Team copy row click opens the coordinator (and toggles), nothing located |
| PMU-022 | REQ-004, REQ-006; AC-008 | Shell reveal variants | Browser | Durable | Pass | Hidden panel reopened docked; 900×800 drawer, reduced motion: `animation: none`, full wash at 0.4 s and 2.0 s, gone after 2.4 s, card centred (offset 0); New chat start surface: tools opened, route `/chat` kept |
| PMU-023 | REQ-012; AC-020 | Route change + late shell mount | Browser | Durable | Pass | Agents page at 1440 (docked) and 900 (drawer): Agent run opened (`/chat?id=<run>`, run row current), tree still expanded, Temp Task located; Projects page: selected Team run opened without collapsing, Task located on Project B in the compact board |
| PMU-024 | BEH-005, BEH-006; REQ-007, 008, 009, 011; AC-010, 012, 015, 018 | Feed liveness, current-Task rule, close race | Browser + feed | Durable | Pass | Rename live; feed cut → rename unseen for 3 s → reconnect re-read; DONE then `delegate_task` with the run ID → row returns with the follow-up, earlier Task in Done with the same worker; cancelled with the run stream delayed in order → summary clicked while shown → "Cancelled (1)" pressed, card in Cancelled lane; pill ring `rgb(203,213,225)`; held frames released → row leaves; Task delete and Project delete remove the summaries; no reload |
| PMU-025 | REQ-010; AC-017 | Strings | Browser zh-CN | Durable | Pass | `在项目中显示任务：<title>` title / name; row name ends `, 任务：<title>`; locate works |
| PMU-001..019 | Preserved surfaces; BEH-008 (PMU-018 / 019) | Projects pages, right-panel tab, Cancelled, collapsed-strip reveal | Browser | Durable (existing) | Pass | `pmu-full/evidence.json` |
| TCT | BEH-006 | Closed rows leave (two-line rows), return live | Browser | Durable (existing) | Pass | `task-closure-tree/evidence.json` |
| FX | QR-003, C-002 | Tree fixtures | Browser fixtures | Durable (updated) | Pass where not failing on base | `fixture-probes*/` |
| DESK | REQ-001, 004, 005, 006, 011 | Packaged renderer | Isolated desktop instance | Temporary | Pass | 46 px row, summary text / title / colour; from a hidden right panel the summary reopened it docked on Projects, chose the Task's Project, card highlighted; no page errors; `.ring-slate-300{…rgb(203 213 225…)}` in the packaged CSS |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Change | Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 95% | +20 | Every AC proven in a real browser on the built backend except AC-011 | AC-011 (Show all for a Done Temp Task past ten) only in the component test: reachable only in the close race with ten more Done Temp tasks; same board step as the Cancelled path proven live |
| Changed-boundary execution directness | 75% | 95% | +20 | Real GraphQL, feed, tools, shell, panel, boards, cards; packaged app | — |
| Cross-boundary integration realism and mock gap | 70% | 95% | +25 | No mocks in PMU cases; two network conditions emulated in the browser only | Emulated socket loss and stream delay instead of a real network fault |
| Environment, configuration, identity, and fixture fidelity | 80% | 95% | +15 | Copies from real `delegate_task` / `send_message_to` via the scripted AGY actor; own data roots | Scripted actor, not a model (not needed for this change) |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | +15 | Reconnect re-read, close race, Project / Task delete, follow-up, reduced motion, reload persistence, closed-row leave | Backend-restart reconnect not separately driven for summaries (same `connected` path as the socket loss) |
| User-surface, browser, and desktop-shell confidence | 60% | 95% | +35 | Browser journeys at 1440 / 900, en / zh-CN; packaged desktop smoke | No shell code changed; desktop smoke covers the docked path only |
| Durable regression coverage quality and relevance | 80% | 95% | +15 | PMU-020..025 in the existing Projects probe; fixture helper; existing suites green | RSK-001 rerun after the aggregate-status rebase |

- Overall post-repository confidence: 74%
- Overall final confidence: 95% (simple average)
- Every critical acceptance criterion directly proven: `Yes` (AC-011 is a non-critical edge with component proof)
- Any final applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Confidence-limiting residual risks: RSK-001 (below).

## Broader Validation Decision And Execution

- Decision: `Required`; modes: Browser (durable, probe-owned real stack), then isolated desktop instance.
- Startup: `pnpm -C autobyteus-server-ts prebuild && build` (`server-build.log`); the PMU probe owns backend
  (`dist/app.js`, scripted AGY), Nuxt dev, Chrome, data root; desktop: `pnpm --silent isolated-app start --build`,
  instance `iso-63441-b1f0`, scripted AGY set in the instance's own `server-data/.env`, then `restart`.
- Data: public GraphQL (definitions, Projects, Tasks, runs) and real tool calls through the Manager's input.

## Desktop Application Validation

- Executed as planned: packaged app of this worktree, driven over its control port by
  `desktop/desktop-drive.mjs` (temporary). Web-equivalent behavior proven; no shell-specific code changed.
- Effect on running applications: none. The user's app (pid 593) and other worktrees' isolated instances were
  not touched.

## Platform / Runtime Targets

- macOS (darwin 25.5.0, arm64); Node from the workspace; Chrome (headless) via playwright-core 1.58.2;
  Electron packaged app 1.5.1-beta.1 from this worktree. Viewports 1440×900, 1440×1000, 900×800, 1512×917
  (desktop); locales en-US, zh-CN; reduced motion emulated in PMU-022.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- `Not Affected`. The Projects tab choice written by a locate survives reload (PMU-021). No migration, no
  version branch.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` | Added | PMU-020..PMU-025 (all REQs / ACs above) | Pass |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | Updated | Registers PMU-020..025; `newPage` takes `locale` | Pass 25 / 25 |
| `autobyteus-web/tests/e2e/fixtures/task-worker-boundaries.mjs` | Added | Fixture boundaries for task-row pages (C-002) | Used by 5 probes |
| `nested-team-hierarchy-probe.mjs`, `nested-team-aggregate-status-probe.mjs`, `background-agent-renderer-contention-probe.mjs`, `team-group-icon-probe.mjs`, `task-agent-peer-sidebar-probe.mjs` | Updated | Call the helper | See ledger |
| `task-agent-peer-sidebar-probe.mjs` | Updated (baseline fix) | Fixture answers `GetRunFileChanges` | Pass |
| 5 fixture pages (`tests/e2e/fixtures/*.page.vue`) | Updated | `onOpenTeamRun` in the section actions (C-002) | — |
| `TESTING.md` + 7 doc links; headers of `agy-native-tool-arguments-transport.e2e.test.ts`, `project-mutation-node-locality.e2e.test.ts` | Updated (user-directed) | Global testing strategy and update policy; suite commands kept in their files | Links and commands verified |

- Paths attached for proportional test-code review: `Yes`.
- Suggested commits (not committed by API/E2E): (1) PMU-020..025 + helper + C-002 fixture updates;
  (2) baseline fix `task-agent-peer-sidebar` `GetRunFileChanges`; (3) `docs(testing): make TESTING.md the global
  testing strategy` with the link and header moves.

## Other Execution Artifacts

| Artifact Path | Purpose | Retained Or Temporary |
| --- | --- | --- |
| `api-e2e-evidence/pmu-full/` | Authoritative PMU run, screenshots `pmu-020..025-*` | Retained |
| `api-e2e-evidence/pmu-new-try1..4/` | Harness iterations (failures recorded in the ledger) | Retained (logs pruned) |
| `api-e2e-evidence/fixture-probes*/` | Branch, base and fixed runs | Retained |
| `api-e2e-evidence/task-closure-tree/` | Closed-row regression | Retained |
| `api-e2e-evidence/desktop/` | Desktop smoke, `D1`, `D2` screenshots, start / restart / stop receipts | Retained |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| `desktop/desktop-drive.mjs` | Drive the packaged app over CDP | Pass | Instance stopped, data root removed, ports released |
| Base worktree `dctl-api-e2e-base` at `359d2c0ef` | Rule 9 base comparison | Done | `git worktree remove` |
| Temporary logging in the helper and the background probe (`diag-*`) | Identify unmatched operations / the tree DOM | Done | Reverted (diff checked) |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model provider | Scripted AGY CLI (`agy-failure-cli.mjs`) | Real tool calls without inference | Not paid-model behavior (not in scope) |
| Network loss of `/ws/projects` | Playwright `routeWebSocket` closes and refuses the page's socket | Prove the reconnect re-read | Browser-side emulation |
| Network delay of the run stream | Playwright `routeWebSocket` holds frames in order from the closure frame | Click a summary after its Task closed (DEC-006) | Browser-side emulation |
| Backend in fixture probes | Fixture routes (existing) + new helper | Fixture pages have no backend | Renderer-only proof |

## Result Summary

| Result | Case IDs | Summary |
| --- | --- | --- |
| Pass | REPO, PMU-001..PMU-025, TCT, DESK, FX hierarchy / group-icon / peer-sidebar / composer-mention / standalone-error-stop | All in-scope behavior proven |
| Fail (pre-existing on base, not this branch) | FX nested-team-aggregate-status, background-agent-renderer-contention, team-activity-presentation | Reported with causes below |

## Residual And Reported Items

- **RSK-001.** `codex/delegated-team-aggregate-status` is not on the remote and `origin/personal` has not
  moved (`359d2c0ef`), so the rebase cannot happen yet. After it: re-run the row specs,
  `test:e2e:project-manager-ux --cases PMU-018,PMU-019,PMU-020,PMU-021,PMU-023`, and the
  `nested-team-aggregate-status` probe.
- **Base failures, not caused by this branch (Rule 9 causes):**
  - `nested-team-aggregate-status` NTAS-BR-002 asserts the deep row is gone right after collapsing, while the
    row is still in its 200 ms leave transition. Its probe belongs to the in-flight aggregate-status work;
    owner: that branch.
  - `background-agent-renderer-contention` BG-BROWSER-004 expects an Agent member disclosure and its task row
    at depth 1; the current tree lists the task row beside the member (depth 0) with no disclosure. Whether
    that tree shape is intended is a product question for the owner of the nested-team hierarchy work.
  - `team-activity-presentation` never renders its fixture page within 90 s (Vue prop warnings from
    `WorkspaceAgentOrgHistoryCollection`, two dependency re-optimizations). The fixture page needs its owner.
- AC-011 component-only (see scorecard).

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| PMU / closure probe stacks (backend, Nuxt, Chrome, data roots) | Probe-owned | Probe `finally` | Terminated, data roots removed (evidence `cleanup`) |
| Fixture probe stacks | Probe-owned | Probe `finally` | Removed |
| Isolated instance `iso-63441-b1f0` | Mine | `isolated-app stop` | Data root removed, ports released; no listener left |
| Base worktree | Mine | `git worktree remove --force` | Removed |
| `autobyteus-web/electron-dist/` | Build output (untracked) | Kept | Not staged |

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default 95% target met: `Yes`; any category below 90%: `No`
- Broader validation decision: `Required` — executed (browser durable + desktop smoke)
- Critical acceptance criteria lacking direct proof: none
- Next recipient: from `get_handoff_rules` (proportional test-code review)
- Notes: classification `Large` / `High` unchanged.
